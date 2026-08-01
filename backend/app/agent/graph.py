from __future__ import annotations

from typing import Any, AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.prebuilt import create_react_agent

from ..mcp.manager import get_mcp_tools
from ..schemas import ChatRequest
from ..skills import store as skill_store
from ..sse import sse_event
from ..tools.builtin import ALL_BUILTIN_TOOLS
from .llm import make_llm

BASE_SYSTEM_PROMPT = (
    "你是「办公智能体」，一个运行在用户本机上的通用办公助手。"
    "你可以调用工具来读写文件、浏览目录、抓取网页、运行 Python 代码或脚本、执行系统命令、联网搜索等，"
    "把本机当作可操作的服务器。需要运行 Python 代码或 .py 文件时，用 run_python 工具（而不是 exec_command）。\n"
    "工作方式（ReAct）：先思考需要做什么，再决定是否调用工具；"
    "拿到工具结果后继续推理，直到能给出最终答案。\n"
    "在调用工具前，用一句话中文说明你打算做什么、为什么（这会作为思考过程展示给用户）。"
    "最终回答使用简体中文，采用清晰的 Markdown 排版。"
)


def _coerce_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, dict):
                parts.append(c.get("text", "") or c.get("content", ""))
            else:
                parts.append(str(c))
        return "".join(parts)
    return str(content)


def _build_system_prompt(req: ChatRequest) -> str:
    prompt = BASE_SYSTEM_PROMPT
    if req.skills:
        lines = []
        for s in req.skills:
            meta = skill_store.get_meta(s.id) or skill_store.find_detail(s.id)
            if meta:
                lines.append(f"- {meta.name}：{meta.description}")
            elif s.name:
                lines.append(f"- {s.name}")
        if lines:
            prompt += (
                "\n\n用户为本次对话选定了以下候选技能，请根据用户的问题判断使用其中哪个"
                "（可以是一个，也可以组合，或都不用）。选定后先调用 `load_skill(\"技能名\")` "
                "读取其完整指令，再严格按指令执行：\n" + "\n".join(lines)
            )
    return prompt


def _select_builtin_tools(req: ChatRequest) -> list:
    tools = []
    for t in ALL_BUILTIN_TOOLS:
        if t.name == "web_search" and not req.web_search:
            continue
        tools.append(t)
    return tools


def _to_lc_messages(req: ChatRequest) -> list:
    msgs: list = [SystemMessage(content=_build_system_prompt(req))]
    for m in req.messages:
        if m.role == "user":
            msgs.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            msgs.append(AIMessage(content=m.content))
        elif m.role == "system":
            msgs.append(SystemMessage(content=m.content))
    return msgs


async def stream_agent(req: ChatRequest) -> AsyncGenerator[str, None]:
    yield sse_event("start")

    if req.skills:
        yield sse_event("skill", names=[s.name for s in req.skills])

    try:
        builtin = _select_builtin_tools(req)
        mcp_tools = await get_mcp_tools()
        tools = builtin + mcp_tools
        llm = make_llm(model=req.model)
        agent = create_react_agent(llm, tools)
        messages = _to_lc_messages(req)
    except Exception as e:  # noqa: BLE001
        yield sse_event("error", message=f"初始化失败：{e}")
        yield sse_event("done")
        return

    try:
        async for event in agent.astream_events(
            {"messages": messages}, version="v2"
        ):
            kind = event.get("event")

            if kind == "on_chat_model_stream":
                chunk = event["data"].get("chunk")
                text = _coerce_text(getattr(chunk, "content", "")) if chunk else ""
                if text:
                    yield sse_event("token", content=text)

            elif kind == "on_tool_start":
                yield sse_event(
                    "tool_start",
                    id=event.get("run_id"),
                    tool=event.get("name", "tool"),
                    args=event["data"].get("input", {}),
                )

            elif kind == "on_tool_end":
                output = event["data"].get("output")
                if isinstance(output, ToolMessage):
                    result = _coerce_text(output.content)
                else:
                    result = _coerce_text(output)
                yield sse_event(
                    "tool_end",
                    id=event.get("run_id"),
                    tool=event.get("name", "tool"),
                    result=result[:4000],
                )
    except Exception as e:  # noqa: BLE001
        yield sse_event("error", message=f"运行出错：{e}")

    yield sse_event("done")
