import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HOME = process.env.HOME || os.homedir();
const CCSWITCH_HOME = process.env.CCSWITCH_HOME || path.join(HOME, ".cc-switch");
const CCSWITCH_DB_PATH = process.env.CCSWITCH_DB_PATH || path.join(CCSWITCH_HOME, "cc-switch.db");
const CCSWITCH_SETTINGS_PATH = process.env.CCSWITCH_SETTINGS_PATH || path.join(CCSWITCH_HOME, "settings.json");
const CLAUDE_PROFILES_DIR = process.env.CLAUDE_PROFILES_DIR || path.join(HOME, ".claude", "profiles");
const CCSWITCH_KEYS_PATH = process.env.CCSWITCH_KEYS_PATH || path.join(CCSWITCH_HOME, "keys.json");
const DEFAULT_ANTHROPIC_MODEL = process.env.DEFAULT_ANTHROPIC_MODEL || "claude-sonnet-4";
const DEFAULT_OFFICIAL_CLAUDE_MODELS = [
  "claude-sonnet-4-6[1m]",
  "claude-opus-4-7[1m]",
  "claude-opus-4-6[1m]",
  "claude-haiku-4-5-20251001"
];
let sqlJsPromise = null;

function parseJson(value, fallback = null) {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function parseTomlString(config, key) {
  return parseTomlStrings(config, key)[0] || null;
}

function parseTomlStrings(config, key) {
  if (!config || typeof config !== "string") return [];
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...config.matchAll(new RegExp(`(?:^|\\n)\\s*${escapedKey}\\s*=\\s*"([^"]+)"`, "g"))]
    .map((match) => match[1])
    .filter(Boolean);
}

function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") return null;
  return value.replace(/\/+$/, "");
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || null;
}

function appendModel(output, value) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) appendModel(output, item);
    return;
  }

  if (typeof value === "object") {
    appendModel(output, value.name || value.id || value.model);
    return;
  }

  if (typeof value !== "string") return;

  const parsed = parseJson(value, null);
  if (Array.isArray(parsed)) {
    appendModel(output, parsed);
    return;
  }

  for (const item of value.split(",")) {
    const model = item.trim();
    if (model) output.push(model);
  }
}

function uniqueModels(values, fallback = null) {
  const seen = new Set();
  const output = [];
  appendModel(output, values);
  if (!output.length && fallback) appendModel(output, fallback);

  return output.filter((model) => {
    if (seen.has(model)) return false;
    seen.add(model);
    return true;
  });
}

function expandAnthropicFamilyModel(model) {
  if (!model || typeof model !== "string") return [];

  const suffixMatch = model.match(/(\[[^\]]+\])$/);
  const suffix = suffixMatch?.[1] || "";
  const core = suffix ? model.slice(0, -suffix.length) : model;
  if (/\d{8}/.test(core)) return [];

  const match = core.match(/^(.*?)(sonnet|opus|haiku)(.*)$/i);
  if (!match) return [];

  const [, prefix, currentFamily, rest] = match;
  const shortAlias = /^(sonnet|opus|haiku)$/i.test(core);
  const claude4Style = /(?:^|[-_])4(?:[-_]|$)/.test(rest);
  if (!shortAlias && !claude4Style) return [];

  const families = [currentFamily.toLowerCase(), "sonnet", "opus", "haiku"];
  return uniqueModels(families.map((family) => `${prefix}${family}${rest}${suffix}`));
}

function stripModelSuffix(model) {
  return typeof model === "string" ? model.replace(/\[[^\]]+\]$/g, "") : "";
}

function isClaudeLikeModel(model) {
  const value = stripModelSuffix(model).toLowerCase();
  return /^claude-/.test(value) || /^(sonnet|opus|haiku)(?:[-_.\d]|$)/.test(value);
}

function officialClaudeModels() {
  return uniqueModels(process.env.CLAUDE_GATEWAY_OFFICIAL_MODELS || DEFAULT_OFFICIAL_CLAUDE_MODELS);
}

function shouldUseOfficialClaudeModels(configured) {
  const source = (process.env.CLAUDE_GATEWAY_MODEL_SOURCE || "auto").toLowerCase();
  if (source === "provider" || source === "cc-switch") return false;
  if (source === "official") return true;
  return configured.some(isClaudeLikeModel);
}

function preferConfiguredOfficialDefault(official, configured) {
  const firstConfigured = configured.find(isClaudeLikeModel);
  if (!firstConfigured) return official;

  const firstBase = stripModelSuffix(firstConfigured);
  const matching = official.find((model) => stripModelSuffix(model) === firstBase);
  if (!matching) return official;

  return uniqueModels([matching, ...official]);
}

function providerId(source, appType, id) {
  return `${source}:${appType || "unknown"}:${id}`;
}

function inferAnthropicModels(config) {
  const env = config.env || {};
  const configured = uniqueModels([
    process.env.CLAUDE_GATEWAY_MODELS,
    env.ANTHROPIC_MODELS,
    env.ANTHROPIC_MODEL,
    env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    config.model,
    config.models,
    config.inferenceModels
  ]);

  if (shouldUseOfficialClaudeModels(configured)) {
    return preferConfiguredOfficialDefault(officialClaudeModels(), configured);
  }

  const expanded = process.env.CLAUDE_GATEWAY_EXPAND_MODEL_FAMILIES === "0"
    ? []
    : configured.flatMap((model) => expandAnthropicFamilyModel(model));

  return uniqueModels([...configured, ...expanded], DEFAULT_ANTHROPIC_MODEL);
}

function inferAnthropicModel(config) {
  return inferAnthropicModels(config)[0] || DEFAULT_ANTHROPIC_MODEL;
}

function inferOpenAiModels(config) {
  const env = config.env || {};
  return uniqueModels([
    process.env.OPENAI_GATEWAY_MODELS,
    env.OPENAI_MODELS,
    env.OPENAI_MODEL,
    config.model,
    config.models,
    parseTomlStrings(config.config, "model")
  ], "gpt-4o-mini");
}

function inferOpenAiModel(config) {
  return inferOpenAiModels(config)[0] || "gpt-4o-mini";
}

function inferOpenAiBaseUrl(config) {
  const env = config.env || {};
  return normalizeBaseUrl(firstString(
    env.OPENAI_BASE_URL,
    env.OPENAI_API_BASE_URL,
    config.baseUrl,
    config.base_url,
    parseTomlString(config.config, "base_url")
  ));
}

function maskUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return url;
  }
}

function normalizeDbProvider(row, config, settings, endpointMap) {
  const env = config.env || {};
  const auth = config.auth || {};
  const endpoint = endpointMap.get(row.id);
  const ccSwitchCurrentId = row.app_type === "claude"
    ? settings?.currentProviderClaude
    : settings?.currentProviderCodex;
  const isCcSwitchCurrent = Boolean(row.is_current) || ccSwitchCurrentId === row.id;

  const anthropicBaseUrl = normalizeBaseUrl(firstString(
    env.ANTHROPIC_BASE_URL,
    config.anthropicBaseUrl,
    config.anthropic_base_url,
    row.app_type === "claude" ? endpoint : null
  ));
  const anthropicKey = firstString(env.ANTHROPIC_AUTH_TOKEN, env.ANTHROPIC_API_KEY, config.apiKey, config.api_key);

  if (row.app_type === "claude" && (anthropicBaseUrl || anthropicKey)) {
    return {
      id: providerId("cc-switch-db", row.app_type, row.id),
      source: "cc-switch.db",
      sourceProviderId: row.id,
      appType: row.app_type,
      name: row.name || row.id,
      kind: "anthropic",
      baseUrl: anthropicBaseUrl || "https://api.anthropic.com",
      model: inferAnthropicModel(config),
      models: inferAnthropicModels(config),
      authPresent: Boolean(anthropicKey),
      compatible: true,
      isCcSwitchCurrent,
      notes: row.notes || "",
      secret: { anthropicKey }
    };
  }

  const openAiKey = firstString(auth.OPENAI_API_KEY, env.OPENAI_API_KEY, config.openaiApiKey, config.openai_api_key);
  const openAiBaseUrl = inferOpenAiBaseUrl(config) || normalizeBaseUrl(row.app_type === "codex" ? endpoint : null);

  if (openAiBaseUrl || openAiKey) {
    return {
      id: providerId("cc-switch-db", row.app_type, row.id),
      source: "cc-switch.db",
      sourceProviderId: row.id,
      appType: row.app_type,
      name: row.name || row.id,
      kind: "openai",
      baseUrl: openAiBaseUrl || "https://api.openai.com/v1",
      model: inferOpenAiModel(config),
      models: inferOpenAiModels(config),
      authPresent: Boolean(openAiKey),
      compatible: true,
      isCcSwitchCurrent,
      notes: row.notes || "",
      secret: {
        openAiKey,
        extraHeaders: config.headers || {}
      }
    };
  }

  return {
    id: providerId("cc-switch-db", row.app_type, row.id),
    source: "cc-switch.db",
    sourceProviderId: row.id,
    appType: row.app_type,
    name: row.name || row.id,
    kind: "unsupported",
    baseUrl: null,
    model: null,
    models: [],
    authPresent: false,
    compatible: false,
    isCcSwitchCurrent,
    notes: "No Anthropic or OpenAI-compatible endpoint was detected.",
    secret: {}
  };
}

async function sqliteJson(dbPath, sql) {
  const sqlJsRows = await sqliteJsonWithSqlJs(dbPath, sql);
  if (sqlJsRows) return sqlJsRows;

  const { stdout } = await execFileAsync("sqlite3", ["-json", dbPath, sql], {
    maxBuffer: 10 * 1024 * 1024
  });
  return parseJson(stdout.trim(), []);
}

async function sqliteJsonWithSqlJs(dbPath, sql) {
  try {
    if (!sqlJsPromise) {
      sqlJsPromise = import("sql.js").then((module) => module.default());
    }
    const SQL = await sqlJsPromise;
    const db = new SQL.Database(await fs.readFile(dbPath));
    try {
      const result = db.exec(sql);
      if (!result.length) return [];
      const table = result[0];
      return table.values.map((row) => {
        const record = {};
        table.columns.forEach((column, index) => {
          record[column] = row[index];
        });
        return record;
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function loadDbProviders() {
  if (!existsSync(CCSWITCH_DB_PATH)) return [];

  let rows = [];
  try {
    rows = await sqliteJson(
      CCSWITCH_DB_PATH,
      "select id, app_type, name, settings_config, notes, is_current from providers order by app_type, sort_index, name;"
    );
  } catch {
    return [];
  }

  let endpointRows = [];
  try {
    endpointRows = await sqliteJson(CCSWITCH_DB_PATH, "select provider_id, app_type, url from provider_endpoints;");
  } catch {
    endpointRows = [];
  }

  const endpointMap = new Map();
  for (const endpoint of endpointRows) {
    if (!endpointMap.has(endpoint.provider_id) && endpoint.url) {
      endpointMap.set(endpoint.provider_id, endpoint.url);
    }
  }

  const settings = await readJson(CCSWITCH_SETTINGS_PATH, {});
  return rows.map((row) => normalizeDbProvider(row, parseJson(row.settings_config, {}), settings, endpointMap));
}

async function loadClaudeProfileProviders() {
  if (!existsSync(CLAUDE_PROFILES_DIR)) return [];
  const entries = await fs.readdir(CLAUDE_PROFILES_DIR, { withFileTypes: true });
  const providers = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const filePath = path.join(CLAUDE_PROFILES_DIR, entry.name);
    const config = await readJson(filePath, null);
    if (!config) continue;

    const env = config.env || config;
    const baseUrl = normalizeBaseUrl(firstString(env.ANTHROPIC_BASE_URL, config.baseUrl, config.base_url));
    const key = firstString(env.ANTHROPIC_AUTH_TOKEN, env.ANTHROPIC_API_KEY, config.apiKey, config.api_key);
    if (!baseUrl && !key) continue;

    providers.push({
      id: providerId("claude-profile", "claude", entry.name.replace(/\.json$/, "")),
      source: "~/.claude/profiles",
      sourceProviderId: entry.name,
      appType: "claude",
      name: config.name || entry.name.replace(/\.json$/, ""),
      kind: "anthropic",
      baseUrl: baseUrl || "https://api.anthropic.com",
      model: inferAnthropicModel(config),
      models: inferAnthropicModels(config),
      authPresent: Boolean(key),
      compatible: true,
      isCcSwitchCurrent: false,
      notes: "",
      secret: { anthropicKey: key }
    });
  }

  return providers;
}

function collectJsonProviders(value, sourceId, providers, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  const env = value.env || value;
  const name = firstString(value.name, value.label, value.title, sourceId);
  const anthropicBaseUrl = normalizeBaseUrl(firstString(env.ANTHROPIC_BASE_URL, value.anthropicBaseUrl, value.baseUrl, value.base_url));
  const anthropicKey = firstString(env.ANTHROPIC_AUTH_TOKEN, env.ANTHROPIC_API_KEY, value.apiKey, value.api_key);
  const openAiBaseUrl = normalizeBaseUrl(firstString(env.OPENAI_BASE_URL, env.OPENAI_API_BASE_URL, value.openaiBaseUrl, value.baseUrl, value.base_url));
  const openAiKey = firstString(env.OPENAI_API_KEY, value.openaiApiKey, value.openai_api_key);

  if (anthropicBaseUrl || anthropicKey) {
    providers.push({
      id: providerId("cc-switch-json", "claude", `${sourceId}-${providers.length}`),
      source: "cc-switch json",
      sourceProviderId: sourceId,
      appType: "claude",
      name,
      kind: "anthropic",
      baseUrl: anthropicBaseUrl || "https://api.anthropic.com",
      model: inferAnthropicModel(value),
      models: inferAnthropicModels(value),
      authPresent: Boolean(anthropicKey),
      compatible: true,
      isCcSwitchCurrent: false,
      notes: "",
      secret: { anthropicKey }
    });
  } else if (openAiBaseUrl || openAiKey) {
    providers.push({
      id: providerId("cc-switch-json", "openai", `${sourceId}-${providers.length}`),
      source: "cc-switch json",
      sourceProviderId: sourceId,
      appType: "openai",
      name,
      kind: "openai",
      baseUrl: openAiBaseUrl || "https://api.openai.com/v1",
      model: inferOpenAiModel(value),
      models: inferOpenAiModels(value),
      authPresent: Boolean(openAiKey),
      compatible: true,
      isCcSwitchCurrent: false,
      notes: "",
      secret: { openAiKey, extraHeaders: value.headers || {} }
    });
  }

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    collectJsonProviders(child, sourceId, providers, seen);
  }
}

async function loadKeysJsonProviders() {
  const root = await readJson(CCSWITCH_KEYS_PATH, null);
  if (!root) return [];
  const providers = [];
  collectJsonProviders(root, path.basename(CCSWITCH_KEYS_PATH), providers);
  return providers;
}

function dedupeProviders(providers) {
  const seen = new Set();
  const output = [];
  for (const provider of providers) {
    const key = `${provider.kind}:${provider.baseUrl}:${provider.model}:${provider.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(provider);
  }
  return output;
}

export async function loadProviders() {
  const groups = await Promise.all([
    loadDbProviders(),
    loadClaudeProfileProviders(),
    loadKeysJsonProviders()
  ]);
  return dedupeProviders(groups.flat());
}

export function sanitizeProvider(provider) {
  return {
    id: provider.id,
    source: provider.source,
    sourceProviderId: provider.sourceProviderId,
    appType: provider.appType,
    name: provider.name,
    kind: provider.kind,
    baseUrl: maskUrl(provider.baseUrl),
    model: provider.model,
    models: provider.models || (provider.model ? [provider.model] : []),
    authPresent: provider.authPresent,
    compatible: provider.compatible,
    isCcSwitchCurrent: provider.isCcSwitchCurrent,
    notes: provider.notes || ""
  };
}

export function configLocations() {
  return {
    ccSwitchHome: CCSWITCH_HOME,
    ccSwitchDb: CCSWITCH_DB_PATH,
    ccSwitchSettings: CCSWITCH_SETTINGS_PATH,
    claudeProfiles: CLAUDE_PROFILES_DIR,
    ccSwitchKeys: CCSWITCH_KEYS_PATH
  };
}
