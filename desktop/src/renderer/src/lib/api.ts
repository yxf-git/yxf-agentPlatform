import type { Conversation } from "@/types"

// ===== 对话 =====
export interface ChatMessagePayload {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ActiveSkillPayload {
  id: string
  name: string
}

export interface ChatStreamRequest {
  messages: ChatMessagePayload[]
  skills: ActiveSkillPayload[]
  web_search: boolean
  model?: string
}

export type AgentEvent =
  | { type: "start" }
  | { type: "skill"; names: string[] }
  | { type: "token"; content: string }
  | { type: "tool_start"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "tool_end"; id: string; tool: string; result: string }
  | { type: "error"; message: string }
  | { type: "done" }

// ===== 技能 =====
export interface ApiSkill {
  id: string
  name: string
  description: string
  icon: string
  category: string
  author: string
  usageCount: number
  tools: string[]
}

export interface ApiSkillDetail extends ApiSkill {
  instructions: string
  files: string[]
}

export interface SkillCreatePayload {
  name: string
  description?: string
  icon?: string
  category?: string
  author?: string
  tools?: string[]
  instructions?: string
}

// ===== 工具 =====
export interface ApiTool {
  id: string
  name: string
  description: string
  icon: string
  status: "connected" | "disconnected" | "error"
  kind: "builtin" | "mcp"
}

// ===== MCP =====
export interface McpServerConfig {
  transport: "stdio" | "streamable_http" | "sse"
  command?: string
  args: string[]
  env: Record<string, string>
  url?: string
  enabled: boolean
}

export interface McpConfig {
  servers: Record<string, McpServerConfig>
}

// ===== 设置 =====
export type ApiProviderKind = "openai_compatible" | "anthropic"

export interface AppSettings {
  deepseekApiKey: string
  moonshotApiKey: string
  openaiApiKey: string
  openaiBaseUrl: string
  anthropicApiKey: string
  anthropicBaseUrl: string
  apiProvider: ApiProviderKind
  tavilyApiKey: string
  modelName: string
  temperature: number
  enableExec: boolean
  execTimeout: number
  workspaceDir: string
  skillsDir: string
  /** 主进程解析后的实际路径（只读展示） */
  resolvedSkillsDir?: string
  resolvedWorkspaceDir?: string
  installDir?: string
}

// ===== 主进程桥接（preload 暴露的 window.api）=====
export interface DesktopApi {
  chat: {
    start(id: string, req: ChatStreamRequest): Promise<void>
    abort(id: string): Promise<void>
    onEvent(id: string, cb: (ev: AgentEvent) => void): () => void
  }
  skills: {
    list(): Promise<ApiSkill[]>
    get(id: string): Promise<ApiSkillDetail | null>
    create(payload: SkillCreatePayload): Promise<ApiSkillDetail>
    update(id: string, payload: SkillCreatePayload): Promise<ApiSkillDetail>
    delete(id: string): Promise<{ ok: boolean }>
    generate(intent: string): Promise<ApiSkillDetail>
    import(name: string, buffer: ArrayBuffer): Promise<ApiSkillDetail>
    dir(): Promise<string>
    openDir(): Promise<{ ok: boolean; error?: string }>
  }
  tools: {
    list(): Promise<ApiTool[]>
  }
  mcp: {
    getConfig(): Promise<McpConfig>
    setConfig(cfg: McpConfig): Promise<McpConfig>
    upsertServer(name: string, cfg: McpServerConfig): Promise<McpConfig>
    deleteServer(name: string): Promise<McpConfig>
    status(): Promise<{ ok: boolean; data: Record<string, string> }>
  }
  settings: {
    get(): Promise<AppSettings>
    save(patch: Partial<AppSettings>): Promise<AppSettings>
    pickDir(defaultPath?: string): Promise<string | null>
    openPath(target: string): Promise<{ ok: boolean; error?: string }>
  }
  conversations: {
    load(): Promise<Conversation[]>
    save(list: Conversation[]): Promise<{ ok: boolean }>
  }
}

declare global {
  interface Window {
    api: DesktopApi
  }
}

const api = (): DesktopApi => window.api

// Vue 的响应式对象是 Proxy，直接经 Electron IPC 结构化克隆会抛
// "An object could not be cloned"，这里统一转成纯对象再传给主进程。
function plain<T>(v: T): T {
  return v == null ? v : (JSON.parse(JSON.stringify(v)) as T)
}

// ===== 对话流式 =====
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return String(Date.now()) + Math.random().toString(36).slice(2)
}

export async function streamChat(
  req: ChatStreamRequest,
  onEvent: (ev: AgentEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const id = uuid()
  const off = api().chat.onEvent(id, onEvent)
  const onAbort = (): void => {
    void api().chat.abort(id)
  }
  if (signal) {
    if (signal.aborted) {
      off()
      return
    }
    signal.addEventListener("abort", onAbort)
  }
  try {
    await api().chat.start(id, plain(req))
  } finally {
    off()
    if (signal) signal.removeEventListener("abort", onAbort)
  }
}

// ===== 技能 =====
export function fetchSkills(): Promise<ApiSkill[]> {
  return api().skills.list()
}

export function generateSkill(intent: string): Promise<ApiSkillDetail> {
  return api().skills.generate(intent)
}

export async function importSkill(file: File): Promise<ApiSkillDetail> {
  const buffer = await file.arrayBuffer()
  return api().skills.import(file.name, buffer)
}

export async function deleteSkill(id: string): Promise<void> {
  await api().skills.delete(id)
}

// ===== 工具 =====
export function fetchTools(): Promise<ApiTool[]> {
  return api().tools.list()
}

// ===== MCP =====
export function fetchMcpConfig(): Promise<McpConfig> {
  return api().mcp.getConfig()
}

export function upsertMcpServer(
  name: string,
  cfg: McpServerConfig
): Promise<McpConfig> {
  return api().mcp.upsertServer(name, plain(cfg))
}

export function deleteMcpServer(name: string): Promise<McpConfig> {
  return api().mcp.deleteServer(name)
}

export function fetchMcpStatus(): Promise<{
  ok: boolean
  data: Record<string, string>
}> {
  return api().mcp.status()
}

// ===== 设置 =====
export function fetchSettings(): Promise<AppSettings> {
  return api().settings.get()
}

export function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return api().settings.save(plain(patch))
}

export function pickDirectory(defaultPath?: string): Promise<string | null> {
  return api().settings.pickDir(defaultPath)
}

export function openPath(target: string): Promise<{ ok: boolean; error?: string }> {
  return api().settings.openPath(target)
}

export function fetchSkillsDir(): Promise<string> {
  return api().skills.dir()
}

export function openSkillsDir(): Promise<{ ok: boolean; error?: string }> {
  return api().skills.openDir()
}

// ===== 会话持久化 =====
export function loadConversations(): Promise<Conversation[]> {
  return api().conversations.load()
}

export function saveConversations(list: Conversation[]): Promise<{ ok: boolean }> {
  return api().conversations.save(plain(list))
}
