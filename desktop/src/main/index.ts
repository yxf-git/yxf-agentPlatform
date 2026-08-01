import { join } from "path"
import { app, BrowserWindow, shell } from "electron"
import { ensureDirs } from "./config"
import { registerIpc } from "./ipc"

const isDev = !app.isPackaged

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: "小飞侠",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on("ready-to-show", () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: "deny" }
  })

  const devServerUrl = process.env["ELECTRON_RENDERER_URL"]
  if (isDev && devServerUrl) {
    void win.loadURL(devServerUrl)
    win.webContents.openDevTools({ mode: "detach" })
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(() => {
  ensureDirs()
  registerIpc()
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
