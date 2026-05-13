import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.CCS_DATA_DIR || path.join(PROJECT_ROOT, "data");
const STATE_PATH = path.join(DATA_DIR, "state.json");

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

export async function getState() {
  const existing = await readJson(STATE_PATH, null);
  if (existing?.bridgeApiKey) return existing;

  const state = {
    activeProviderId: existing?.activeProviderId || null,
    bridgeApiKey: process.env.BRIDGE_API_KEY || randomKey()
  };
  await writeJson(STATE_PATH, state);
  return state;
}

export async function setActiveProviderId(activeProviderId) {
  const state = await getState();
  const next = { ...state, activeProviderId };
  await writeJson(STATE_PATH, next);
  return next;
}

export function dataDir() {
  return DATA_DIR;
}
