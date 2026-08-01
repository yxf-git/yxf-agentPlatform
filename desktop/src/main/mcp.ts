import { existsSync, readFileSync, writeFileSync } from "fs"
import { MultiServerMCPClient } from "@langchain/mcp-adapters"
import { mcpConfigFile } from "./config"
import type { McpConfig, McpServerConfig } from "./domain"

export function loadConfig(): McpConfig {
  if (!existsSync(mcpConfigFile())) return { servers: {} }
  try {
    const raw = JSON.parse(readFileSync(mcpConfigFile(), "utf-8"))
    return { servers: raw.servers || {} }
  } catch {
    return { servers: {} }
  }
}

export function saveConfig(cfg: McpConfig): McpConfig {
  const normalized: McpConfig = { servers: cfg.servers || {} }
  writeFileSync(mcpConfigFile(), JSON.stringify(normalized, null, 2), "utf-8")
  return normalized
}

function toConnection(srv: McpServerConfig): Record<string, unknown> | null {
  if (srv.transport === "stdio") {
    if (!srv.command) return null
    return {
      transport: "stdio",
      command: srv.command,
      args: srv.args || [],
      env: srv.env && Object.keys(srv.env).length ? srv.env : undefined,
    }
  }
  if (!srv.url) return null
  // 存储用 streamable_http，适配器用 http
  const transport = srv.transport === "sse" ? "sse" : "http"
  return { transport, url: srv.url }
}

function toMcpServers(cfg: McpConfig): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {}
  for (const [name, srv] of Object.entries(cfg.servers)) {
    if (!srv.enabled) continue
    const conn = toConnection(srv)
    if (conn) result[name] = conn
  }
  return result
}

export async function getMcpTools(): Promise<any[]> {
  const cfg = loadConfig()
  const mcpServers = toMcpServers(cfg)
  if (Object.keys(mcpServers).length === 0) return []
  try {
    const client = new MultiServerMCPClient({
      throwOnLoadError: false,
      prefixToolNameWithServerName: false,
      additionalToolNamePrefix: "",
      mcpServers: mcpServers as any,
    })
    return await client.getTools()
  } catch {
    return []
  }
}

export async function probeStatus(): Promise<Record<string, string>> {
  const cfg = loadConfig()
  const status: Record<string, string> = {}
  for (const [name, srv] of Object.entries(cfg.servers)) {
    if (!srv.enabled) {
      status[name] = "disconnected"
      continue
    }
    const conn = toConnection(srv)
    if (!conn) {
      status[name] = "error"
      continue
    }
    try {
      const client = new MultiServerMCPClient({
        throwOnLoadError: true,
        mcpServers: { [name]: conn } as any,
      })
      await client.getTools()
      await client.close()
      status[name] = "connected"
    } catch {
      status[name] = "error"
    }
  }
  return status
}

export function upsertServer(name: string, srv: McpServerConfig): McpConfig {
  const cfg = loadConfig()
  cfg.servers[name] = srv
  return saveConfig(cfg)
}

export function deleteServer(name: string): McpConfig {
  const cfg = loadConfig()
  delete cfg.servers[name]
  return saveConfig(cfg)
}
