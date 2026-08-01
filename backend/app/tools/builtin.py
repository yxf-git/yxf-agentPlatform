from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import httpx
from langchain_core.tools import tool

from ..config import WORKSPACE_DIR, settings

MAX_OUTPUT = 8000


def _truncate(text: str, limit: int = MAX_OUTPUT) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n...[已截断，共 {len(text)} 字符]"


def _resolve(path: str) -> Path:
    """把相对路径限定在工作区内，绝对路径原样使用。"""
    p = Path(path)
    if not p.is_absolute():
        p = WORKSPACE_DIR / p
    return p


@tool
def read_file(path: str) -> str:
    """读取文本文件内容。path 可为相对工作区的路径或绝对路径。"""
    p = _resolve(path)
    if not p.exists():
        return f"错误：文件不存在 {p}"
    if not p.is_file():
        return f"错误：不是文件 {p}"
    try:
        return _truncate(p.read_text(encoding="utf-8", errors="replace"))
    except Exception as e:  # noqa: BLE001
        return f"读取失败：{e}"


@tool
def write_file(path: str, content: str) -> str:
    """把内容写入文本文件（覆盖）。path 为相对工作区路径或绝对路径，会自动创建父目录。"""
    p = _resolve(path)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
        return f"已写入 {p}（{len(content)} 字符）"
    except Exception as e:  # noqa: BLE001
        return f"写入失败：{e}"


@tool
def list_dir(path: str = ".") -> str:
    """列出目录下的文件和子目录。path 为相对工作区路径或绝对路径。"""
    p = _resolve(path)
    if not p.exists():
        return f"错误：目录不存在 {p}"
    if not p.is_dir():
        return f"错误：不是目录 {p}"
    items = []
    for child in sorted(p.iterdir()):
        mark = "/" if child.is_dir() else ""
        size = "" if child.is_dir() else f"  ({child.stat().st_size} B)"
        items.append(f"{child.name}{mark}{size}")
    return "\n".join(items) if items else "（空目录）"


@tool
def http_fetch(url: str, method: str = "GET", body: str = "") -> str:
    """抓取网页或调用 HTTP 接口（相当于 curl）。返回状态码与响应正文（文本，超长会截断）。"""
    try:
        with httpx.Client(follow_redirects=True, timeout=30) as client:
            resp = client.request(
                method.upper(),
                url,
                content=body.encode("utf-8") if body else None,
                headers={"User-Agent": "office-agent/1.0"},
            )
        text = resp.text
        return f"HTTP {resp.status_code}\n\n{_truncate(text)}"
    except Exception as e:  # noqa: BLE001
        return f"请求失败：{e}"


@tool
def exec_command(command: str) -> str:
    """在本机执行 shell 命令并返回标准输出/错误。用于运行脚本、系统操作等。"""
    if not settings.enable_exec:
        return "错误：命令执行功能已被管理员禁用（ENABLE_EXEC=false）。"
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=settings.exec_timeout,
            cwd=str(WORKSPACE_DIR),
        )
        out = result.stdout or ""
        err = result.stderr or ""
        parts = [f"退出码: {result.returncode}"]
        if out:
            parts.append("stdout:\n" + out)
        if err:
            parts.append("stderr:\n" + err)
        return _truncate("\n".join(parts))
    except subprocess.TimeoutExpired:
        return f"错误：命令超时（>{settings.exec_timeout}s）"
    except Exception as e:  # noqa: BLE001
        return f"执行失败：{e}"


@tool
def run_python(code: str = "", file: str = "") -> str:
    """运行 Python 代码或 Python 文件，返回标准输出/错误。
    - 传 code：直接执行这段 Python 代码
    - 传 file：运行指定的 .py 文件（相对工作区路径或绝对路径）
    需要运行代码、跑 Python 脚本、做数据处理/计算时优先使用本工具。"""
    if not settings.enable_exec:
        return "错误：代码执行功能已被管理员禁用（ENABLE_EXEC=false）。"

    temp_path: Path | None = None
    try:
        if file:
            target = _resolve(file)
            if not target.exists():
                return f"错误：文件不存在 {target}"
        elif code:
            temp_path = WORKSPACE_DIR / f".run_{int(time.time() * 1000)}.py"
            temp_path.write_text(code, encoding="utf-8")
            target = temp_path
        else:
            return "错误：请提供 code 或 file 之一。"

        result = subprocess.run(
            [sys.executable, str(target)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=settings.exec_timeout,
            cwd=str(WORKSPACE_DIR),
        )
        out = result.stdout or ""
        err = result.stderr or ""
        parts = [f"退出码: {result.returncode}"]
        if out:
            parts.append("stdout:\n" + out)
        if err:
            parts.append("stderr:\n" + err)
        return _truncate("\n".join(parts))
    except subprocess.TimeoutExpired:
        return f"错误：执行超时（>{settings.exec_timeout}s）"
    except Exception as e:  # noqa: BLE001
        return f"执行失败：{e}"
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:  # noqa: BLE001
                pass


@tool
def load_skill(name: str) -> str:
    """加载指定技能的完整指令。传入技能名（或 id），返回其 SKILL.md 正文，
    并列出该技能自带的参考文档/脚本/模板文件的绝对路径，供后续用 read_file 读取或 exec_command 执行。
    当用户为本次对话选定了技能时，先用本工具读取要用的那个技能的完整指令，再按其流程执行。"""
    from ..skills import store

    bundle = store.skill_bundle_by_ref(name)
    if not bundle:
        return f"未找到技能：{name}"
    detail, abs_files = bundle
    parts = [f"# 技能：{detail.name}\n", detail.instructions.strip()]
    if detail.tools:
        parts.append("\n建议使用的工具：" + ", ".join(detail.tools))
    if abs_files:
        parts.append(
            "\n该技能附带以下文件（用 read_file 读取、或用 exec_command 执行脚本，均使用下列绝对路径）：\n"
            + "\n".join(f"- {p}" for p in abs_files)
        )
    return _truncate("\n".join(parts))


@tool
def web_search(query: str) -> str:
    """联网搜索最新信息，返回若干条结果（标题+摘要+链接）。"""
    key = settings.tavily_api_key
    if not key:
        return "联网搜索未配置（缺少 TAVILY_API_KEY），无法执行搜索。"
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": key,
                    "query": query,
                    "max_results": 5,
                    "include_answer": True,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        lines: list[str] = []
        if data.get("answer"):
            lines.append("摘要：" + data["answer"])
        for i, r in enumerate(data.get("results", []), 1):
            lines.append(f"{i}. {r.get('title', '')}\n   {r.get('url', '')}\n   {r.get('content', '')[:200]}")
        return _truncate("\n".join(lines)) if lines else "未找到相关结果。"
    except Exception as e:  # noqa: BLE001
        return f"搜索失败：{e}"


ALL_BUILTIN_TOOLS = [
    read_file,
    write_file,
    list_dir,
    http_fetch,
    run_python,
    exec_command,
    web_search,
    load_skill,
]

BUILTIN_TOOLS_BY_NAME = {t.name: t for t in ALL_BUILTIN_TOOLS}


BUILTIN_TOOL_META = [
    {"id": "read_file", "name": "读取文件", "description": "读取本机文本文件内容", "icon": "FileText"},
    {"id": "write_file", "name": "写入文件", "description": "把内容写入本机文本文件", "icon": "FloppyDisk"},
    {"id": "list_dir", "name": "浏览目录", "description": "列出目录下的文件与子目录", "icon": "FolderOpen"},
    {"id": "http_fetch", "name": "网页抓取", "description": "抓取网页 / 调用 HTTP 接口（curl）", "icon": "Globe"},
    {"id": "run_python", "name": "运行 Python", "description": "执行 Python 代码或运行 .py 文件", "icon": "FileCode"},
    {"id": "exec_command", "name": "执行命令", "description": "在本机执行 shell 命令", "icon": "Terminal"},
    {"id": "web_search", "name": "联网搜索", "description": "搜索互联网获取最新信息", "icon": "MagnifyingGlass"},
    {"id": "load_skill", "name": "加载技能", "description": "读取选定技能的完整指令与附带文件", "icon": "Sparkles"},
]
