export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000"

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

export async function streamChat(
  req: ChatStreamRequest,
  onEvent: (ev: AgentEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  })
  if (!resp.ok || !resp.body) {
    throw new Error(`后端请求失败：HTTP ${resp.status}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const jsonStr = trimmed.slice(5).trim()
        if (!jsonStr) continue
        try {
          onEvent(JSON.parse(jsonStr) as AgentEvent)
        } catch {
          // 忽略无法解析的片段
        }
      }
    }
  }
}

// ===== 技能（SKILL.md 规范）=====
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

export async function fetchSkills(): Promise<ApiSkill[]> {
  const r = await fetch(`${API_BASE}/api/skills`)
  if (!r.ok) throw new Error("加载技能失败")
  return r.json()
}

export async function generateSkill(intent: string): Promise<ApiSkillDetail> {
  const r = await fetch(`${API_BASE}/api/skills/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent }),
  })
  if (!r.ok) throw new Error("生成技能失败")
  return r.json()
}

export async function importSkill(file: File): Promise<ApiSkillDetail> {
  const form = new FormData()
  form.append("file", file)
  const r = await fetch(`${API_BASE}/api/skills/import`, {
    method: "POST",
    body: form,
  })
  if (!r.ok) throw new Error("导入技能失败")
  return r.json()
}

export async function deleteSkill(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/skills/${id}`, { method: "DELETE" })
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

export async function fetchTools(): Promise<ApiTool[]> {
  const r = await fetch(`${API_BASE}/api/tools`)
  if (!r.ok) throw new Error("加载工具失败")
  return r.json()
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

export async function fetchMcpConfig(): Promise<McpConfig> {
  const r = await fetch(`${API_BASE}/api/mcp/config`)
  if (!r.ok) throw new Error("加载 MCP 配置失败")
  return r.json()
}

export async function upsertMcpServer(
  name: string,
  cfg: McpServerConfig
): Promise<McpConfig> {
  const r = await fetch(
    `${API_BASE}/api/mcp/servers/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    }
  )
  if (!r.ok) throw new Error("保存 MCP Server 失败")
  return r.json()
}

export async function deleteMcpServer(name: string): Promise<McpConfig> {
  const r = await fetch(
    `${API_BASE}/api/mcp/servers/${encodeURIComponent(name)}`,
    { method: "DELETE" }
  )
  if (!r.ok) throw new Error("删除 MCP Server 失败")
  return r.json()
}
