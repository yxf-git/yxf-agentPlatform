import { app, dialog, shell } from "electron"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "fs"
import { dirname, isAbsolute, join, normalize, relative, resolve as pathResolve } from "path"

export type ApiProviderKind = "openai_compatible" | "anthropic"

export interface AppSettings {
  deepseekApiKey: string
  moonshotApiKey: string
  /** 通用 OpenAI 兼容（各厂家封装） */
  openaiApiKey: string
  openaiBaseUrl: string
  /** Claude / Anthropic Messages 兼容 */
  anthropicApiKey: string
  anthropicBaseUrl: string
  /** 当前使用的协议通道：openai_compatible | anthropic */
  apiProvider: ApiProviderKind
  tavilyApiKey: string
  modelName: string
  temperature: number
  enableExec: boolean
  execTimeout: number
  /** 智能体可读写的工作区；空则用安装目录/workspace */
  workspaceDir: string
  /** 技能目录；空则用安装目录/skills */
  skillsDir: string
}

const DEFAULT_SETTINGS: AppSettings = {
  deepseekApiKey: "",
  moonshotApiKey: "",
  openaiApiKey: "",
  openaiBaseUrl: "",
  anthropicApiKey: "",
  anthropicBaseUrl: "",
  apiProvider: "openai_compatible",
  tavilyApiKey: "",
  modelName: "deepseek-chat",
  temperature: 0.3,
  enableExec: true,
  execTimeout: 60,
  workspaceDir: "",
  skillsDir: "",
}

let cache: AppSettings | null = null

/** 应用安装根目录：打包后为 exe 所在目录；开发时为 desktop 项目根目录 */
export function installDir(): string {
  if (app.isPackaged) {
    return dirname(app.getPath("exe"))
  }
  // electron-vite 开发时 cwd 一般为 desktop/
  return process.cwd()
}

function dataDir(): string {
  return app.getPath("userData")
}

export function settingsFile(): string {
  return join(dataDir(), "settings.json")
}

export function mcpConfigFile(): string {
  return join(dataDir(), "mcp.json")
}

export function conversationsFile(): string {
  return join(dataDir(), "conversations.json")
}

export function defaultSkillsDir(): string {
  return join(installDir(), "skills")
}

export function defaultWorkspaceDir(): string {
  return join(installDir(), "workspace")
}

export function skillsDir(): string {
  const custom = getSettings().skillsDir?.trim()
  return custom || defaultSkillsDir()
}

export function workspaceDir(): string {
  const custom = getSettings().workspaceDir?.trim()
  return custom || defaultWorkspaceDir()
}

export function getSettings(): AppSettings {
  if (cache) return cache
  try {
    if (existsSync(settingsFile())) {
      const raw = JSON.parse(readFileSync(settingsFile(), "utf-8"))
      cache = { ...DEFAULT_SETTINGS, ...raw }
      return cache!
    }
  } catch {
    // fall through
  }
  cache = { ...DEFAULT_SETTINGS }
  return cache
}

/** 对外展示用：补上实际解析后的路径 */
export function getSettingsView(): AppSettings & {
  resolvedSkillsDir: string
  resolvedWorkspaceDir: string
  installDir: string
} {
  const s = getSettings()
  return {
    ...s,
    resolvedSkillsDir: skillsDir(),
    resolvedWorkspaceDir: workspaceDir(),
    installDir: installDir(),
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  cache = next
  writeFileSync(settingsFile(), JSON.stringify(next, null, 2), "utf-8")
  ensureDirs()
  return next
}

/** 旧版技能在 userData/skills，迁移到安装目录/skills（仅当新目录为空时） */
function migrateLegacySkills(): void {
  const legacy = join(dataDir(), "skills")
  const target = skillsDir()
  if (!existsSync(legacy) || legacy === target) return
  try {
    const legacyItems = readdirSync(legacy).filter((n) => {
      try {
        return statSync(join(legacy, n)).isDirectory()
      } catch {
        return false
      }
    })
    if (!legacyItems.length) return
    if (!existsSync(target)) mkdirSync(target, { recursive: true })
    const targetItems = existsSync(target) ? readdirSync(target) : []
    if (targetItems.length) return
    for (const name of legacyItems) {
      cpSync(join(legacy, name), join(target, name), { recursive: true })
    }
  } catch {
    // 迁移失败不影响启动
  }
}

function ensureWorkspaceReadme(): void {
  const ws = workspaceDir()
  const readme = join(ws, "README.txt")
  if (existsSync(readme)) return
  try {
    writeFileSync(
      readme,
      [
        "小飞侠 · 工作区（文档与任务产出）",
        "",
        "存放原则：",
        `- 文档、报告、脚本产出 → 本目录（${ws}）`,
        `- 技能包 → 技能目录（${skillsDir()}），结构为 skills/<技能id>/SKILL.md`,
        "",
        "小飞侠默认只能在工作区与技能目录内操作，不会写入其它磁盘路径。",
        "",
      ].join("\n"),
      "utf-8"
    )
  } catch {
    // ignore
  }
}

export function ensureDirs(): void {
  for (const d of [dataDir(), skillsDir(), workspaceDir()]) {
    try {
      if (!existsSync(d)) mkdirSync(d, { recursive: true })
    } catch {
      // 安装目录无写权限时可能失败，调用方工具会返回错误
    }
  }
  migrateLegacySkills()
  ensureWorkspaceReadme()
}

function tryReal(p: string): string {
  try {
    return existsSync(p) ? realpathSync(p) : pathResolve(p)
  } catch {
    return pathResolve(p)
  }
}

/** 判断 target 是否位于 root 目录之下（含 root 本身） */
export function isPathInside(root: string, target: string): boolean {
  const r = tryReal(root)
  const t = tryReal(target)
  const rel = relative(r, t)
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))
}

export type ResolveMode =
  | "workspace"
  | "skills"
  | "workspace_or_skills"
  | "workspace_or_skills_read"

/**
 * 存放原则路由：
 * - 以 `skills/` 开头的相对路径 → 技能目录
 * - 其它相对路径 → 工作区（文档/产出）
 * - 绝对路径必须落在工作区或技能目录内
 */
function routeCandidate(input: string): { candidate: string; root: "workspace" | "skills" } {
  const ws = workspaceDir()
  const sk = skillsDir()
  const raw = (input || ".").trim() || "."
  const normalized = raw.replace(/\\/g, "/")

  if (/^skills\//i.test(normalized)) {
    const rest = normalized.replace(/^skills\//i, "")
    return { candidate: pathResolve(sk, rest || "."), root: "skills" }
  }

  if (isAbsolute(raw)) {
    const abs = normalize(raw)
    if (isPathInside(sk, abs)) return { candidate: abs, root: "skills" }
    return { candidate: abs, root: "workspace" }
  }

  return { candidate: pathResolve(ws, raw), root: "workspace" }
}

/**
 * 将用户/模型传入的路径解析为绝对路径，并做沙箱校验。
 * - workspace：仅工作区（命令 cwd、默认文档产出）
 * - skills：仅技能目录
 * - workspace_or_skills / workspace_or_skills_read：工作区或技能目录（读写/只读）
 */
export function resolveSandboxedPath(
  input: string,
  mode: ResolveMode = "workspace"
): { ok: true; path: string; root: "workspace" | "skills" } | { ok: false; error: string } {
  const ws = workspaceDir()
  const sk = skillsDir()
  const { candidate, root } = routeCandidate(input)

  if (mode === "workspace") {
    if (!isPathInside(ws, candidate)) {
      return {
        ok: false,
        error:
          `路径超出工作区限制：${candidate}\n` +
          `文档/产出请写入工作区：${ws}\n` +
          `技能请使用 skills/<技能id>/... 或 save_skill 工具（技能目录：${sk}）`,
      }
    }
    return { ok: true, path: candidate, root: "workspace" }
  }

  if (mode === "skills") {
    if (!isPathInside(sk, candidate)) {
      return {
        ok: false,
        error: `路径超出技能目录限制：${candidate}\n允许范围：${sk}`,
      }
    }
    return { ok: true, path: candidate, root: "skills" }
  }

  // workspace_or_skills / workspace_or_skills_read
  if (isPathInside(ws, candidate) || isPathInside(sk, candidate)) {
    return {
      ok: true,
      path: candidate,
      root: isPathInside(sk, candidate) ? "skills" : "workspace",
    }
  }
  return {
    ok: false,
    error:
      `路径超出允许范围：${candidate}\n` +
      `文档 → 工作区 ${ws}\n` +
      `技能 → 技能目录 ${sk}（相对路径请用 skills/...）`,
  }
}

export async function pickDirectory(defaultPath?: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    defaultPath: defaultPath || installDir(),
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
}

export async function openPathInExplorer(target: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!existsSync(target)) mkdirSync(target, { recursive: true })
    const err = await shell.openPath(target)
    return err ? { ok: false, error: err } : { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
