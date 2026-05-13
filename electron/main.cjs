const { app, BrowserWindow, Menu, Tray, clipboard, dialog, nativeImage, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);
const GATEWAY_URL = `http://${HOST}:${PORT}`;

let mainWindow = null;
let tray = null;
let gatewayServer = null;
let isQuitting = false;

function trayIcon() {
  return nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAX0lEQVR4nGNkYGBg+M+ABzAyMv7H4eHh/6GhoRgYGBhGJgbG/0QyMxMDA8N/DAwMf2BgYPgPxKYAqRkYGP4jIyP/Dw8P/4GBgf8QGxv7HxkZGQYGBgYGBkYGAABM9hMdu+1f3wAAAABJRU5ErkJggg=="
  );
}

async function healthOk() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const response = await fetch(`${GATEWAY_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function startGateway() {
  process.env.HOST = HOST;
  process.env.PORT = String(PORT);
  process.env.CCS_DATA_DIR ||= app.getPath("userData");

  if (await healthOk()) return;

  const moduleUrl = pathToFileURL(path.join(__dirname, "..", "src", "app-server.mjs")).href;
  const { startAppServer } = await import(moduleUrl);
  try {
    const started = await startAppServer({ host: HOST, port: PORT });
    gatewayServer = started.server;
  } catch (error) {
    if (error && error.code === "EADDRINUSE" && await healthOk()) return;
    throw error;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    title: "Claude 中转切换器",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadURL(GATEWAY_URL);
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function showWindow() {
  if (!mainWindow) createWindow();
  mainWindow.show();
  mainWindow.focus();
}

async function copyGatewayKey() {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/providers`);
    const data = await response.json();
    clipboard.writeText(data.bridgeApiKey || "");
  } catch (error) {
    dialog.showErrorBox("复制失败", error.message);
  }
}

async function applyClaudeDesktopConfig() {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/claude-desktop/apply`, { method: "POST" });
    if (!response.ok) throw new Error(await response.text());
    dialog.showMessageBox({
      type: "info",
      message: "已配置 Claude Desktop",
      detail: "请重启 Claude Desktop 后使用。"
    });
  } catch (error) {
    dialog.showErrorBox("配置失败", error.message);
  }
}

async function restartClaudeDesktop() {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/claude-desktop/restart`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "重启失败");
  } catch (error) {
    dialog.showErrorBox("重启失败", error.message);
  }
}

function updateTrayMenu() {
  const loginOpen = app.getLoginItemSettings().openAtLogin;
  const menu = Menu.buildFromTemplate([
    { label: "显示控制面板", click: showWindow },
    { label: "刷新", click: () => mainWindow?.reload() },
    { type: "separator" },
    { label: "一键配置 Claude Desktop", click: applyClaudeDesktopConfig },
    { label: "重启 Claude Desktop", click: restartClaudeDesktop },
    { type: "separator" },
    { label: "复制 Gateway 地址", click: () => clipboard.writeText(GATEWAY_URL) },
    { label: "复制 Gateway 密钥", click: copyGatewayKey },
    { label: "打开本地 Gateway", click: () => shell.openExternal(GATEWAY_URL) },
    { type: "separator" },
    {
      label: "开机启动",
      type: "checkbox",
      checked: loginOpen,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
        updateTrayMenu();
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("Claude 中转切换器");
  if (process.platform === "darwin") tray.setTitle("CCS");
  tray.on("click", showWindow);
  updateTrayMenu();
}

app.whenReady().then(async () => {
  try {
    await startGateway();
  } catch (error) {
    dialog.showErrorBox(
      "Gateway 启动失败",
      `无法启动本地 Gateway。\n\n${error.stack || error.message}`
    );
  }
  createTray();
  createWindow();
});

app.on("activate", showWindow);

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

app.on("before-quit", () => {
  isQuitting = true;
  if (gatewayServer) gatewayServer.close();
});
