import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { skillsDir, workspaceDir } from "./config"
import { makeLlm } from "./llm"
import { selectBuiltinTools } from "./tools"
import { getMcpTools } from "./mcp"
import { findDetail, getMeta } from "./skills"
import type { AgentEvent, ChatStreamRequest } from "./domain"

function baseSystemPrompt(): string {
  const ws = workspaceDir()
  const sk = skillsDir()
  return (
    "你是「小飞侠」，一个运行在用户本机上的通用办公助手。" +
    "你可以调用工具来读写文件、浏览目录、抓取网页、运行 Python 代码或脚本、执行系统命令、联网搜索等。\n\n" +
    "【存放原则 — 必须遵守】\n" +
    `1. 文档、报告、表格、脚本等任务产出 → 写入工作区「${ws}」。相对路径默认相对工作区（如 weekly-report.md）。\n` +
    `2. 技能（SKILL.md 及附属脚本/资料）→ 只能写入技能目录「${sk}」。` +
    "创建/生成技能时优先用 save_skill 工具；若用 write_file，路径必须以 skills/<技能id>/ 开头。\n" +
    "3. 禁止把技能文件写进工作区，也禁止把普通文档写到技能目录；禁止访问上述两目录之外的路径。\n" +
    "4. 命令执行（exec_command / run_python）的工作目录固定为工作区。\n\n" +
    "需要运行 Python 代码或 .py 文件时，用 run_python 工具（而不是 exec_command）。\n" +
    "工作方式（ReAct）：先思考需要做什么，再决定是否调用工具；" +
    "拿到工具结果后继续推理，直到能给出最终答案。\n" +
    "在调用工具前，用一句话中文说明你打算做什么、为什么（这会作为思考过程展示给用户）。" +
    "最终回答使用简体中文，采用清晰的 Markdown 排版。" +
    "生成文件后，在回答里告知用户最终保存路径。"
  )
}

function coerceText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        if (c && typeof c === "object") {
          const obj = c as Record<string, unknown>
          return (obj.text as string) || (obj.content as string) || ""
        }
        return String(c)
      })
      .join("")
  }
  return content == null ? "" : String(content)
}

function buildSystemPrompt(req: ChatStreamRequest): string {
  let prompt = baseSystemPrompt()
  if (req.skills && req.skills.length) {
    const lines: string[] = []
    for (const s of req.skills) {
      const meta = getMeta(s.id) || findDetail(s.id)
      if (meta) lines.push(`- ${meta.name}：${meta.description}`)
      else if (s.name) lines.push(`- ${s.name}`)
    }
    if (lines.length) {
      prompt +=
        "\n\n用户为本次对话选定了以下候选技能，请根据用户的问题判断使用其中哪个" +
        '（可以是一个，也可以组合，或都不用）。选定后先调用 `load_skill("技能名")` ' +
        "读取其完整指令，再严格按指令执行：\n" +
        lines.join("\n")
    }
  }
  return prompt
}

function toLcMessages(req: ChatStreamRequest) {
  const msgs: any[] = [new SystemMessage(buildSystemPrompt(req))]
  for (const m of req.messages) {
    if (m.role === "user") msgs.push(new HumanMessage(m.content))
    else if (m.role === "assistant") msgs.push(new AIMessage(m.content))
    else if (m.role === "system") msgs.push(new SystemMessage(m.content))
  }
  return msgs
}

export async function streamAgent(
  req: ChatStreamRequest,
  emit: (ev: AgentEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  emit({ type: "start" })

  if (req.skills && req.skills.length) {
    emit({ type: "skill", names: req.skills.map((s) => s.name) })
  }

  let agent: ReturnType<typeof createReactAgent>
  let messages: any[]
  try {
    const builtin = selectBuiltinTools(req.web_search)
    const mcpTools = await getMcpTools()
    const tools = [...builtin, ...mcpTools]
    const llm = makeLlm(req.model)
    agent = createReactAgent({ llm, tools })
    messages = toLcMessages(req)
  } catch (e) {
    emit({ type: "error", message: `初始化失败：${String(e)}` })
    emit({ type: "done" })
    return
  }

  try {
    const stream = agent.streamEvents(
      { messages },
      { version: "v2", signal, recursionLimit: 50 }
    )
    for await (const event of stream) {
      const kind = event.event

      if (kind === "on_chat_model_stream") {
        const chunk = event.data?.chunk
        const text = chunk ? coerceText((chunk as any).content) : ""
        if (text) emit({ type: "token", content: text })
      } else if (kind === "on_tool_start") {
        emit({
          type: "tool_start",
          id: event.run_id,
          tool: event.name || "tool",
          args: (event.data?.input as Record<string, unknown>) || {},
        })
      } else if (kind === "on_tool_end") {
        const output = event.data?.output
        const result =
          output instanceof ToolMessage
            ? coerceText(output.content)
            : coerceText(output)
        emit({
          type: "tool_end",
          id: event.run_id,
          tool: event.name || "tool",
          result: result.slice(0, 4000),
        })
      }
    }
  } catch (e) {
    if (signal?.aborted) {
      emit({ type: "done" })
      return
    }
    emit({ type: "error", message: `运行出错：${String(e)}` })
  }

  emit({ type: "done" })
}
