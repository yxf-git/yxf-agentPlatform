import { existsSync, readFileSync, writeFileSync } from "fs"
import { ipcMain } from "electron"
import type { WebContents } from "electron"
import { streamAgent } from "./agent"
import {
  conversationsFile,
  getSettings,
  getSettingsView,
  openPathInExplorer,
  pickDirectory,
  saveSettings,
  skillsDir,
} from "./config"
import { BUILTIN_TOOL_META } from "./tools"
import * as skills from "./skills"
import * as mcp from "./mcp"
import { getMcpTools, probeStatus } from "./mcp"
import type {
  AgentEvent,
  ChatStreamRequest,
  McpConfig,
  McpServerConfig,
  SkillCreate,
  ToolInfo,
} from "./domain"

const abortControllers = new Map<string, AbortController>()

async function listTools(): Promise<ToolInfo[]> {
  const s = getSettings()
  const result: ToolInfo[] = []

  for (const meta of BUILTIN_TOOL_META) {
    let status: ToolInfo["status"] = "connected"
    if (meta.id === "exec_command" && !s.enableExec) status = "disconnected"
    if (meta.id === "run_python" && !s.enableExec) status = "disconnected"
    if (meta.id === "web_search" && !s.tavilyApiKey) status = "disconnected"
    result.push({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      status,
      kind: "builtin",
    })
  }

  try {
    const mcpTools = await getMcpTools()
    for (const t of mcpTools as any[]) {
      result.push({
        id: `mcp:${t.name}`,
        name: t.name,
        description: (t.description || "MCP 工具").slice(0, 80),
        icon: "Plug",
        status: "connected",
        kind: "mcp",
      })
    }
  } catch {
    // ignore mcp load errors
  }

  try {
    const statuses = await probeStatus()
    for (const [name, st] of Object.entries(statuses)) {
      if (st === "error") {
        result.push({
          id: `mcp-server:${name}`,
          name,
          description: "MCP Server 连接失败",
          icon: "Plug",
          status: "error",
          kind: "mcp",
        })
      }
    }
  } catch {
    // ignore probe errors
  }

  return result
}

function loadConversations(): unknown[] {
  if (!existsSync(conversationsFile())) return []
  try {
    const raw = JSON.parse(readFileSync(conversationsFile(), "utf-8"))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveConversations(list: unknown[]): void {
  writeFileSync(conversationsFile(), JSON.stringify(list ?? [], null, 2), "utf-8")
}

export function registerIpc(): void {
  // ===== Chat（流式）=====
  ipcMain.handle(
    "chat:start",
    async (event, payload: { id: string; req: ChatStreamRequest }) => {
      const { id, req } = payload
      const sender: WebContents = event.sender
      const channel = `chat:event:${id}`
      const controller = new AbortController()
      abortControllers.set(id, controller)

      const emit = (ev: AgentEvent): void => {
        if (!sender.isDestroyed()) sender.send(channel, ev)
      }

      try {
        await streamAgent(req, emit, controller.signal)
      } finally {
        abortControllers.delete(id)
      }
    }
  )

  ipcMain.handle("chat:abort", async (_e, id: string) => {
    abortControllers.get(id)?.abort()
    abortControllers.delete(id)
  })

  // ===== 技能 =====
  ipcMain.handle("skills:list", async () => skills.listSkills())
  ipcMain.handle("skills:get", async (_e, id: string) => skills.getDetail(id))
  ipcMain.handle("skills:create", async (_e, payload: SkillCreate) => skills.saveSkill(payload))
  ipcMain.handle("skills:update", async (_e, p: { id: string; payload: SkillCreate }) =>
    skills.saveSkill(p.payload, p.id)
  )
  ipcMain.handle("skills:delete", async (_e, id: string) => ({
    ok: skills.deleteSkill(id),
  }))
  ipcMain.handle("skills:generate", async (_e, intent: string) => skills.generateSkill(intent))
  ipcMain.handle(
    "skills:import",
    async (_e, p: { name: string; buffer: ArrayBuffer | Uint8Array }) => {
      const buf = Buffer.from(p.buffer as ArrayBuffer)
      return skills.importPackage(p.name, buf)
    }
  )
  ipcMain.handle("skills:dir", async () => skillsDir())
  ipcMain.handle("skills:openDir", async () => openPathInExplorer(skillsDir()))

  // ===== 工具 =====
  ipcMain.handle("tools:list", async () => listTools())

  // ===== MCP =====
  ipcMain.handle("mcp:getConfig", async () => mcp.loadConfig())
  ipcMain.handle("mcp:setConfig", async (_e, cfg: McpConfig) => mcp.saveConfig(cfg))
  ipcMain.handle("mcp:upsertServer", async (_e, p: { name: string; cfg: McpServerConfig }) =>
    mcp.upsertServer(p.name, p.cfg)
  )
  ipcMain.handle("mcp:deleteServer", async (_e, name: string) => mcp.deleteServer(name))
  ipcMain.handle("mcp:status", async () => ({ ok: true, data: await mcp.probeStatus() }))

  // ===== 设置 =====
  ipcMain.handle("settings:get", async () => getSettingsView())
  ipcMain.handle("settings:save", async (_e, patch) => {
    saveSettings(patch)
    return getSettingsView()
  })
  ipcMain.handle("settings:pickDir", async (_e, defaultPath?: string) => pickDirectory(defaultPath))
  ipcMain.handle("settings:openPath", async (_e, target: string) => openPathInExplorer(target))

  // ===== 会话持久化 =====
  ipcMain.handle("conversations:load", async () => loadConversations())
  ipcMain.handle("conversations:save", async (_e, list: unknown[]) => {
    saveConversations(list)
    return { ok: true }
  })
}
