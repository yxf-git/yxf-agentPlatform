export interface SkillMeta {
  id: string
  name: string
  description: string
  icon: string
  category: string
  author: string
  usageCount: number
  tools: string[]
}

export interface SkillDetail extends SkillMeta {
  instructions: string
  files: string[]
}

export interface SkillCreate {
  name: string
  description?: string
  icon?: string
  category?: string
  author?: string
  tools?: string[]
  instructions?: string
}

export interface ToolInfo {
  id: string
  name: string
  description: string
  icon: string
  status: "connected" | "disconnected" | "error"
  kind: "builtin" | "mcp"
}

export type McpTransport = "stdio" | "streamable_http" | "sse"

export interface McpServerConfig {
  transport: McpTransport
  command?: string
  args: string[]
  env: Record<string, string>
  url?: string
  enabled: boolean
}

export interface McpConfig {
  servers: Record<string, McpServerConfig>
}

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
