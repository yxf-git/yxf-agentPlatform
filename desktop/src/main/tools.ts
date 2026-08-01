import { spawnSync } from "child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { getSettings, resolveSandboxedPath, skillsDir, workspaceDir } from "./config"
import { saveSkill, skillBundleByRef } from "./skills"

const MAX_OUTPUT = 8000

function truncate(text: string, limit = MAX_OUTPUT): string {
  if (text.length <= limit) return text
  return text.slice(0, limit) + `\n...[已截断，共 ${text.length} 字符]`
}

const readFileTool = tool(
  async ({ path }) => {
    const resolved = resolveSandboxedPath(path, "workspace_or_skills_read")
    if (!resolved.ok) return resolved.error
    const p = resolved.path
    if (!existsSync(p)) return `错误：文件不存在 ${p}`
    if (!statSync(p).isFile()) return `错误：不是文件 ${p}`
    try {
      return truncate(readFileSync(p, "utf-8"))
    } catch (e) {
      return `读取失败：${String(e)}`
    }
  },
  {
    name: "read_file",
    description:
      "读取文本文件。path 相对工作区，或工作区/技能目录内的绝对路径。不可读工作区与技能目录之外的文件。",
    schema: z.object({ path: z.string().describe("文件路径（相对工作区或允许范围内的绝对路径）") }),
  }
)

const writeFileTool = tool(
  async ({ path, content }) => {
    const resolved = resolveSandboxedPath(path, "workspace_or_skills")
    if (!resolved.ok) return resolved.error
    const p = resolved.path
    try {
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, content, "utf-8")
      const tip =
        resolved.root === "skills"
          ? "（已写入技能目录）"
          : "（已写入工作区/文档产出）"
      return `已写入 ${p}（${content.length} 字符）${tip}`
    } catch (e) {
      return `写入失败：${String(e)}`
    }
  },
  {
    name: "write_file",
    description:
      "写入文本文件。文档/报告等产出用相对工作区路径（如 report.md）；" +
      "技能文件用 skills/<技能id>/SKILL.md。禁止写到这两处之外。",
    schema: z.object({
      path: z.string().describe("文件路径：文档用工作区相对路径；技能用 skills/<id>/..."),
      content: z.string().describe("要写入的文本内容"),
    }),
  }
)

const listDirTool = tool(
  async ({ path }) => {
    const resolved = resolveSandboxedPath(path || ".", "workspace_or_skills_read")
    if (!resolved.ok) return resolved.error
    const p = resolved.path
    if (!existsSync(p)) return `错误：目录不存在 ${p}`
    if (!statSync(p).isDirectory()) return `错误：不是目录 ${p}`
    const items: string[] = []
    for (const name of readdirSync(p).sort()) {
      const child = join(p, name)
      const st = statSync(child)
      const mark = st.isDirectory() ? "/" : ""
      const size = st.isDirectory() ? "" : `  (${st.size} B)`
      items.push(`${name}${mark}${size}`)
    }
    return items.length ? items.join("\n") : "（空目录）"
  },
  {
    name: "list_dir",
    description: "列出目录内容。仅允许工作区或技能目录内。",
    schema: z.object({ path: z.string().default(".").describe("目录路径") }),
  }
)

const httpFetchTool = tool(
  async ({ url, method, body }) => {
    try {
      const resp = await fetch(url, {
        method: (method || "GET").toUpperCase(),
        body: body ? body : undefined,
        headers: { "User-Agent": "xiaofeixia/1.0" },
        redirect: "follow",
      })
      const text = await resp.text()
      return `HTTP ${resp.status}\n\n${truncate(text)}`
    } catch (e) {
      return `请求失败：${String(e)}`
    }
  },
  {
    name: "http_fetch",
    description: "抓取网页或调用 HTTP 接口（相当于 curl）。返回状态码与响应正文（文本，超长会截断）。",
    schema: z.object({
      url: z.string().describe("目标 URL"),
      method: z.string().default("GET").describe("HTTP 方法"),
      body: z.string().default("").describe("请求体，可选"),
    }),
  }
)

function runProcess(cmd: string, args: string[], useShell: boolean): string {
  const s = getSettings()
  const cwd = workspaceDir()
  const result = spawnSync(cmd, args, {
    shell: useShell,
    cwd,
    encoding: "utf-8",
    timeout: s.execTimeout * 1000,
    maxBuffer: 1024 * 1024 * 10,
  })
  if (result.error) {
    const err = result.error as NodeJS.ErrnoException
    if (err.code === "ETIMEDOUT") return `错误：命令超时（>${s.execTimeout}s）`
    if (err.code === "ENOENT") return `执行失败：找不到可执行程序 ${cmd}`
    return `执行失败：${err.message}`
  }
  const out = result.stdout || ""
  const errOut = result.stderr || ""
  const parts = [`退出码: ${result.status ?? "null"}`, `工作目录: ${cwd}`]
  if (out) parts.push("stdout:\n" + out)
  if (errOut) parts.push("stderr:\n" + errOut)
  return truncate(parts.join("\n"))
}

const execCommandTool = tool(
  async ({ command }) => {
    if (!getSettings().enableExec) {
      return "错误：命令执行功能已被禁用（可在设置中开启）。"
    }
    return runProcess(command, [], true)
  },
  {
    name: "exec_command",
    description:
      "在工作区目录下执行 shell 命令并返回标准输出/错误。cwd 固定为工作区，勿尝试访问工作区外路径。",
    schema: z.object({ command: z.string().describe("要执行的 shell 命令") }),
  }
)

function findPython(): string | null {
  for (const candidate of ["python", "py", "python3"]) {
    try {
      const r = spawnSync(candidate, ["--version"], { encoding: "utf-8" })
      if (!r.error && (r.status === 0 || (r.stdout + r.stderr).toLowerCase().includes("python"))) {
        return candidate
      }
    } catch {
      // try next
    }
  }
  return null
}

const runPythonTool = tool(
  async ({ code, file }) => {
    if (!getSettings().enableExec) {
      return "错误：代码执行功能已被禁用（可在设置中开启）。"
    }
    const python = findPython()
    if (!python) {
      return "错误：本机未检测到 Python 解释器，请先安装 Python 后重试（或改用 exec_command）。"
    }
    let tempPath: string | null = null
    let target: string
    try {
      if (file) {
        const resolved = resolveSandboxedPath(file, "workspace_or_skills_read")
        if (!resolved.ok) return resolved.error
        target = resolved.path
        if (!existsSync(target)) return `错误：文件不存在 ${target}`
      } else if (code) {
        tempPath = join(workspaceDir(), `.run_${Date.now()}.py`)
        mkdirSync(dirname(tempPath), { recursive: true })
        writeFileSync(tempPath, code, "utf-8")
        target = tempPath
      } else {
        return "错误：请提供 code 或 file 之一。"
      }
      return runProcess(python, [target], false)
    } finally {
      if (tempPath && existsSync(tempPath)) {
        try {
          unlinkSync(tempPath)
        } catch {
          // ignore
        }
      }
    }
  },
  {
    name: "run_python",
    description:
      "运行 Python 代码或 .py 文件。file 须在工作区或技能目录内；临时代码写入工作区后执行。",
    schema: z.object({
      code: z.string().default("").describe("要执行的 Python 代码"),
      file: z.string().default("").describe("要运行的 .py 文件路径"),
    }),
  }
)

const webSearchTool = tool(
  async ({ query }) => {
    const key = getSettings().tavilyApiKey
    if (!key) return "联网搜索未配置（缺少 Tavily API Key），无法执行搜索。"
    try {
      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: key,
          query,
          max_results: 5,
          include_answer: true,
        }),
      })
      if (!resp.ok) return `搜索失败：HTTP ${resp.status}`
      const data: any = await resp.json()
      const lines: string[] = []
      if (data.answer) lines.push("摘要：" + data.answer)
      ;(data.results || []).forEach((r: any, i: number) => {
        lines.push(
          `${i + 1}. ${r.title || ""}\n   ${r.url || ""}\n   ${String(r.content || "").slice(0, 200)}`
        )
      })
      return lines.length ? truncate(lines.join("\n")) : "未找到相关结果。"
    } catch (e) {
      return `搜索失败：${String(e)}`
    }
  },
  {
    name: "web_search",
    description: "联网搜索最新信息，返回若干条结果（标题+摘要+链接）。",
    schema: z.object({ query: z.string().describe("搜索关键词") }),
  }
)

const loadSkillTool = tool(
  async ({ name }) => {
    const bundle = skillBundleByRef(name)
    if (!bundle) return `未找到技能：${name}`
    const { detail, absFiles } = bundle
    const parts = [`# 技能：${detail.name}\n`, detail.instructions.trim()]
    if (detail.tools.length) parts.push("\n建议使用的工具：" + detail.tools.join(", "))
    if (absFiles.length) {
      parts.push(
        "\n该技能附带以下文件（可用 read_file 读取，路径前缀 skills/<id>/...）：\n" +
          absFiles.map((p) => `- ${p}`).join("\n")
      )
    }
    parts.push(`\n技能目录：${skillsDir()}`)
    return truncate(parts.join("\n"))
  },
  {
    name: "load_skill",
    description:
      "加载指定技能的完整指令。传入技能名（或 id），返回 SKILL.md 正文及附带文件路径。选定技能后先调用本工具再执行。",
    schema: z.object({ name: z.string().describe("技能名或 id") }),
  }
)

const saveSkillTool = tool(
  async ({ name, description, instructions, category, tools }) => {
    try {
      const detail = saveSkill({
        name,
        description: description || "",
        instructions: instructions || "",
        category: category || "办公",
        tools: tools
          ? tools
              .split(/[,，\s]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        author: "小飞侠",
      })
      return (
        `技能已保存到技能目录（不是工作区）：\n` +
        `- id: ${detail.id}\n` +
        `- 名称: ${detail.name}\n` +
        `- 路径: ${join(skillsDir(), detail.id, "SKILL.md")}\n` +
        `请勿把技能写到工作区；文档产出才写入工作区。`
      )
    } catch (e) {
      return `保存技能失败：${String(e)}`
    }
  },
  {
    name: "save_skill",
    description:
      "把新技能按规范写入技能目录（安装目录/skills/<id>/SKILL.md）。" +
      "用户要求「生成/创建技能」时必须用本工具，不要把技能文件写到工作区。",
    schema: z.object({
      name: z.string().describe("技能名称"),
      description: z.string().default("").describe("一句话描述做什么、何时用"),
      instructions: z.string().describe("完整指令（Markdown）"),
      category: z.string().default("办公").describe("分类"),
      tools: z.string().default("").describe("建议工具名，逗号分隔，可选"),
    }),
  }
)

export const ALL_BUILTIN_TOOLS = [
  readFileTool,
  writeFileTool,
  listDirTool,
  httpFetchTool,
  runPythonTool,
  execCommandTool,
  webSearchTool,
  loadSkillTool,
  saveSkillTool,
]

export const BUILTIN_TOOL_META = [
  { id: "read_file", name: "读取文件", description: "读取工作区/技能目录内文本文件", icon: "FileText" },
  { id: "write_file", name: "写入文件", description: "文档写工作区；技能文件写 skills/...", icon: "FloppyDisk" },
  { id: "list_dir", name: "浏览目录", description: "列出工作区/技能目录", icon: "FolderOpen" },
  { id: "http_fetch", name: "网页抓取", description: "抓取网页 / 调用 HTTP 接口（curl）", icon: "Globe" },
  { id: "run_python", name: "运行 Python", description: "执行 Python 代码或运行 .py 文件", icon: "FileCode" },
  { id: "exec_command", name: "执行命令", description: "在工作区目录下执行 shell 命令", icon: "Terminal" },
  { id: "web_search", name: "联网搜索", description: "搜索互联网获取最新信息", icon: "MagnifyingGlass" },
  { id: "load_skill", name: "加载技能", description: "读取选定技能的完整指令与附带文件", icon: "Sparkles" },
  { id: "save_skill", name: "保存技能", description: "把新技能写入技能目录", icon: "Sparkles" },
]

export function selectBuiltinTools(webSearch: boolean) {
  return ALL_BUILTIN_TOOLS.filter((t) => !(t.name === "web_search" && !webSearch))
}
