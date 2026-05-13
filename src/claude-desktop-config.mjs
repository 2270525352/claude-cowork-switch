import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CONFIG_ID = "7ca42a57-9f05-4f8a-9b7d-8d3fa412cc51";
const CONFIG_NAME = "Claude 中转切换器";
const DEFAULT_MODEL = process.env.DEFAULT_ANTHROPIC_MODEL || "claude-sonnet-4";

function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

export function claude3pDir() {
  if (process.env.CLAUDE_3P_CONFIG_DIR) return process.env.CLAUDE_3P_CONFIG_DIR;
  if (process.platform === "darwin") {
    return path.join(homeDir(), "Library", "Application Support", "Claude-3p");
  }
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || path.join(homeDir(), "AppData", "Local");
    return path.join(local, "Claude-3p");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(homeDir(), ".config");
  return path.join(configHome, "Claude-3p");
}

export function claudePrimaryDir() {
  if (process.env.CLAUDE_PRIMARY_CONFIG_DIR) return process.env.CLAUDE_PRIMARY_CONFIG_DIR;
  if (process.platform === "darwin") {
    return path.join(homeDir(), "Library", "Application Support", "Claude");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(homeDir(), "AppData", "Roaming");
    return path.join(appData, "Claude");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(homeDir(), ".config");
  return path.join(configHome, "Claude");
}

function configLibraryDir() {
  return path.join(claude3pDir(), "configLibrary");
}

function metaPath() {
  return path.join(configLibraryDir(), "_meta.json");
}

function configPath(id = CONFIG_ID) {
  return path.join(configLibraryDir(), `${id}.json`);
}

function deploymentConfigPath() {
  return path.join(claude3pDir(), "claude_desktop_config.json");
}

function primaryDeploymentConfigPath() {
  return path.join(claudePrimaryDir(), "claude_desktop_config.json");
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function backupExistingConfig() {
  const files = [metaPath(), configPath(), deploymentConfigPath(), primaryDeploymentConfigPath()];
  const existing = [];
  for (const file of files) {
    if (await exists(file)) existing.push(file);
  }
  if (!existing.length) return null;

  const backupDir = path.join(claude3pDir(), "backups", `claude-cowork-switch-${timestamp()}`);
  await fs.mkdir(backupDir, { recursive: true });
  for (const file of existing) {
    await fs.copyFile(file, path.join(backupDir, path.basename(file)));
  }
  return backupDir;
}

function gatewayBaseUrl(origin) {
  return process.env.CLAUDE_GATEWAY_PUBLIC_URL || origin || "http://127.0.0.1:8787";
}

function modelName(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") return modelName(value.name || value.id || value.model);
  return null;
}

function normalizeModels(models, fallbackModel) {
  const seen = new Set();
  const output = [];

  for (const value of [fallbackModel, ...(Array.isArray(models) ? models : [])]) {
    const name = modelName(value);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    output.push(name);
  }

  if (!output.length) output.push(DEFAULT_MODEL);
  return output;
}

function configForGateway({ baseUrl, apiKey, model, models }) {
  const inferenceModels = normalizeModels(models, model);
  return {
    disableDeploymentModeChooser: true,
    inferenceProvider: "gateway",
    inferenceGatewayBaseUrl: baseUrl,
    inferenceGatewayApiKey: apiKey,
    inferenceGatewayAuthScheme: "x-api-key",
    inferenceModels,
    unstableDisableModelVerification: true
  };
}

function normalizeMeta(meta) {
  const next = meta && typeof meta === "object" ? meta : {};
  const entries = Array.isArray(next.entries) ? next.entries.filter((entry) => entry?.id && entry?.name) : [];
  const withoutOurs = entries.filter((entry) => entry.id !== CONFIG_ID);
  return {
    ...next,
    appliedId: CONFIG_ID,
    entries: [
      ...withoutOurs,
      {
        id: CONFIG_ID,
        name: CONFIG_NAME,
        provider: "gateway",
        note: process.env.CLAUDE_GATEWAY_PUBLIC_URL || "http://127.0.0.1:8787"
      }
    ]
  };
}

export async function claudeDesktopConfigStatus(origin) {
  const meta = await readJson(metaPath(), null);
  const config = await readJson(configPath(), null);
  const deployment = await readJson(deploymentConfigPath(), {});
  const baseUrl = gatewayBaseUrl(origin);

  return {
    supported: true,
    platform: process.platform,
    configDir: claude3pDir(),
    metaPath: metaPath(),
    configPath: configPath(),
    deploymentConfigPath: deploymentConfigPath(),
    primaryDeploymentConfigPath: primaryDeploymentConfigPath(),
    applied: meta?.appliedId === CONFIG_ID,
    deploymentMode: deployment?.deploymentMode,
    primaryDeploymentMode: (await readJson(primaryDeploymentConfigPath(), {}))?.deploymentMode,
    gatewayBaseUrl: config?.inferenceGatewayBaseUrl || null,
    targetGatewayBaseUrl: baseUrl,
    authScheme: config?.inferenceGatewayAuthScheme || null,
    model: Array.isArray(config?.inferenceModels) ? modelName(config.inferenceModels[0]) : null,
    models: Array.isArray(config?.inferenceModels) ? config.inferenceModels.map(modelName).filter(Boolean) : []
  };
}

export async function applyClaudeDesktopConfig({ origin, apiKey, model, models }) {
  if (!apiKey) throw new Error("Gateway API key is missing.");

  const baseUrl = gatewayBaseUrl(origin);
  const backupDir = await backupExistingConfig();

  const meta = normalizeMeta(await readJson(metaPath(), null));
  meta.entries = meta.entries.map((entry) => entry.id === CONFIG_ID ? { ...entry, note: baseUrl } : entry);

  const deployment = await readJson(deploymentConfigPath(), {});
  const primaryDeployment = await readJson(primaryDeploymentConfigPath(), {});
  await writeJson(metaPath(), meta);
  await writeJson(configPath(), configForGateway({ baseUrl, apiKey, model, models }));
  await writeJson(deploymentConfigPath(), { ...deployment, deploymentMode: "3p" });
  await writeJson(primaryDeploymentConfigPath(), { ...primaryDeployment, deploymentMode: "3p" });

  return {
    ok: true,
    backupDir,
    status: await claudeDesktopConfigStatus(origin)
  };
}

export async function restartClaudeDesktop() {
  if (process.platform === "darwin") {
    await execFileAsync("osascript", ["-e", 'tell application id "com.anthropic.claudefordesktop" to quit']).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await execFileAsync("pkill", ["-x", "Claude"]).catch(() => null);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    await execFileAsync("open", ["-a", "Claude"]);
    return { ok: true, restarted: true, method: "open -a Claude" };
  }

  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/IM", "Claude.exe", "/F"]).catch(() => null);
    return {
      ok: true,
      restarted: false,
      method: "taskkill",
      message: "已尝试关闭 Claude，请从开始菜单重新打开 Claude Desktop。"
    };
  }

  await execFileAsync("pkill", ["-f", "Claude"]).catch(() => null);
  return {
    ok: true,
    restarted: false,
    method: "pkill",
    message: "已尝试关闭 Claude，请重新打开 Claude Desktop。"
  };
}
