import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./state.mjs";

const FILE_NAME = "custom-providers.json";

function filePath() {
  return path.join(dataDir(), FILE_NAME);
}

function customId() {
  return `custom:${randomBytes(8).toString("hex")}`;
}

function normalizeBaseUrl(url) {
  if (typeof url !== "string") return "";
  return url.trim().replace(/\/+$/, "");
}

function normalizeModels(models, model) {
  const list = [];
  const seen = new Set();
  const push = (value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    list.push(trimmed);
  };
  if (Array.isArray(models)) for (const m of models) push(m);
  push(model);
  return list;
}

async function readAll() {
  try {
    const content = await fs.readFile(filePath(), "utf8");
    const data = JSON.parse(content);
    return Array.isArray(data?.providers) ? data.providers : [];
  } catch {
    return [];
  }
}

async function writeAll(providers) {
  const target = filePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify({ providers }, null, 2)}\n`);
}

export async function listCustomProviders() {
  return readAll();
}

function validateProviderInput(input) {
  if (!input || typeof input !== "object") throw new Error("invalid body");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const kind = input.kind;
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (!name) throw new Error("name is required");
  if (!["anthropic", "openai"].includes(kind)) throw new Error(`unsupported kind: ${kind}`);
  if (!baseUrl) throw new Error("baseUrl is required");
  try {
    const parsed = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("baseUrl must be http(s)");
  } catch (error) {
    throw new Error(`invalid baseUrl: ${error.message}`);
  }
  const models = normalizeModels(input.models, input.model);
  return {
    name,
    kind,
    appType: input.appType || (kind === "openai" ? "codex" : "claude"),
    baseUrl,
    apiKey: typeof input.apiKey === "string" ? input.apiKey : "",
    model: models[0] || null,
    models,
    notes: typeof input.notes === "string" ? input.notes.slice(0, 200) : ""
  };
}

export async function addCustomProvider(input) {
  const data = validateProviderInput(input);
  const providers = await readAll();
  const record = { id: customId(), createdAt: Date.now(), ...data };
  providers.push(record);
  await writeAll(providers);
  return record;
}

export async function updateCustomProvider(id, patch) {
  const providers = await readAll();
  const index = providers.findIndex((p) => p.id === id);
  if (index === -1) throw new Error("provider not found");
  const merged = validateProviderInput({ ...providers[index], ...patch });
  const next = { ...providers[index], ...merged, updatedAt: Date.now() };
  if (patch && Object.prototype.hasOwnProperty.call(patch, "apiKey") && !patch.apiKey) {
    next.apiKey = providers[index].apiKey;
  }
  providers[index] = next;
  await writeAll(providers);
  return next;
}

export async function deleteCustomProvider(id) {
  const providers = await readAll();
  const next = providers.filter((p) => p.id !== id);
  if (next.length === providers.length) return false;
  await writeAll(next);
  return true;
}

export function toProviderShape(record) {
  return {
    id: record.id,
    source: "custom",
    sourceProviderId: record.id.replace(/^custom:/, ""),
    appType: record.appType || (record.kind === "openai" ? "codex" : "claude"),
    name: record.name,
    kind: record.kind,
    baseUrl: record.baseUrl,
    model: record.model || (record.models && record.models[0]) || null,
    models: record.models || [],
    authPresent: Boolean(record.apiKey),
    compatible: true,
    isCcSwitchCurrent: false,
    notes: record.notes || "",
    secret: record.kind === "openai"
      ? { openAiKey: record.apiKey }
      : { anthropicKey: record.apiKey }
  };
}
