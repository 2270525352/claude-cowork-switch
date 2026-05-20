import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function defaultUserDataDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "claude-cowork-switch");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "claude-cowork-switch");
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "claude-cowork-switch");
}

const DATA_DIR = process.env.CCS_DATA_DIR || defaultUserDataDir();
const STATE_PATH = path.join(DATA_DIR, "state.json");

const DEFAULTS = {
  activeProviderId: null,
  bridgeApiKey: null,
  ccSwitchMtime: 0,
  modelSource: null,
  healthProbeEnabled: true,
  pinnedAt: 0,
  lastAutoConfiguredAt: 0,
  lastAutoConfigReason: null
};

const VALID_MODEL_SOURCES = new Set(["auto", "official", "provider", null]);

async function readJson(filePath, fallback) {
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

function randomKey() {
  return `ccs_${randomBytes(18).toString("hex")}`;
}

let cached = null;

async function persist(state) {
  cached = state;
  await writeJson(STATE_PATH, state);
  return state;
}

export async function getState() {
  if (cached) return cached;
  const existing = await readJson(STATE_PATH, {});
  const state = { ...DEFAULTS, ...existing };
  if (!state.bridgeApiKey) state.bridgeApiKey = process.env.BRIDGE_API_KEY || randomKey();
  await persist(state);
  return state;
}

export async function setActiveProviderId(activeProviderId, { ccSwitchMtime, pinnedAt } = {}) {
  const state = await getState();
  const next = {
    ...state,
    activeProviderId,
    ccSwitchMtime: ccSwitchMtime ?? state.ccSwitchMtime,
    pinnedAt: pinnedAt ?? Date.now()
  };
  return persist(next);
}

export async function updateSettings(patch) {
  const state = await getState();
  const next = { ...state };
  if ("modelSource" in patch) {
    const value = patch.modelSource || null;
    if (!VALID_MODEL_SOURCES.has(value)) {
      throw new Error(`Invalid modelSource: ${patch.modelSource}`);
    }
    next.modelSource = value;
  }
  if ("healthProbeEnabled" in patch) {
    next.healthProbeEnabled = Boolean(patch.healthProbeEnabled);
  }
  return persist(next);
}

export async function recordAutoConfigured(reason) {
  const state = await getState();
  return persist({ ...state, lastAutoConfiguredAt: Date.now(), lastAutoConfigReason: reason });
}

export async function recordCcSwitchMtime(mtime) {
  const state = await getState();
  if (state.ccSwitchMtime === mtime) return state;
  return persist({ ...state, ccSwitchMtime: mtime });
}

export function dataDir() {
  return DATA_DIR;
}

export function getCachedState() {
  return cached;
}
