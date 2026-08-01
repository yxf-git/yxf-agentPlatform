export interface Attachment {
  name: string
  size: string
  type: string
}

// ReAct 流程中的单步：思考 或 工具调用
export type ReActStep =
  | { kind: "reasoning"; id: string; content: string }
  | {
      kind: "tool"
      id: string
      tool: string
      args: Record<string, unknown>
      result?: string
      status: "running" | "done"
    }

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  steps?: ReActStep[]
  skills?: string[]
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
  messages: Message[]
}
