import { contextBridge, ipcRenderer } from "electron"

const api = {
  chat: {
    start: (id: string, req: unknown): Promise<void> =>
      ipcRenderer.invoke("chat:start", { id, req }),
    abort: (id: string): Promise<void> => ipcRenderer.invoke("chat:abort", id),
    onEvent: (id: string, cb: (ev: unknown) => void): (() => void) => {
      const channel = `chat:event:${id}`
      const listener = (_e: unknown, ev: unknown): void => cb(ev)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
  },
  skills: {
    list: () => ipcRenderer.invoke("skills:list"),
    get: (id: string) => ipcRenderer.invoke("skills:get", id),
    create: (payload: unknown) => ipcRenderer.invoke("skills:create", payload),
    update: (id: string, payload: unknown) =>
      ipcRenderer.invoke("skills:update", { id, payload }),
    delete: (id: string) => ipcRenderer.invoke("skills:delete", id),
    generate: (intent: string) => ipcRenderer.invoke("skills:generate", intent),
    import: (name: string, buffer: ArrayBuffer) =>
      ipcRenderer.invoke("skills:import", { name, buffer }),
    dir: () => ipcRenderer.invoke("skills:dir"),
    openDir: () => ipcRenderer.invoke("skills:openDir"),
  },
  tools: {
    list: () => ipcRenderer.invoke("tools:list"),
  },
  mcp: {
    getConfig: () => ipcRenderer.invoke("mcp:getConfig"),
    setConfig: (cfg: unknown) => ipcRenderer.invoke("mcp:setConfig", cfg),
    upsertServer: (name: string, cfg: unknown) =>
      ipcRenderer.invoke("mcp:upsertServer", { name, cfg }),
    deleteServer: (name: string) => ipcRenderer.invoke("mcp:deleteServer", name),
    status: () => ipcRenderer.invoke("mcp:status"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    save: (patch: unknown) => ipcRenderer.invoke("settings:save", patch),
    pickDir: (defaultPath?: string) => ipcRenderer.invoke("settings:pickDir", defaultPath),
    openPath: (target: string) => ipcRenderer.invoke("settings:openPath", target),
  },
  conversations: {
    load: () => ipcRenderer.invoke("conversations:load"),
    save: (list: unknown) => ipcRenderer.invoke("conversations:save", list),
  },
}

contextBridge.exposeInMainWorld("api", api)

export type Api = typeof api
