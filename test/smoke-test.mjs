import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = 8791;
const KEY = "test-gateway-key";
const BASE = `http://127.0.0.1:${PORT}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sqlQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function createFixtureDb(homeDir) {
  const ccSwitchHome = path.join(homeDir, ".cc-switch");
  await fs.mkdir(ccSwitchHome, { recursive: true });
  const dbPath = path.join(ccSwitchHome, "cc-switch.db");
  const anthropicConfig = {
    env: {
      ANTHROPIC_AUTH_TOKEN: "anthropic-test-token",
      ANTHROPIC_BASE_URL: "http://127.0.0.1:9101",
      ANTHROPIC_MODEL: "fixture-sonnet",
      ANTHROPIC_DEFAULT_SONNET_MODEL: "fixture-sonnet",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "fixture-opus",
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "fixture-haiku"
    }
  };
  const openAiConfig = {
    auth: { OPENAI_API_KEY: "openai-test-token" },
    env: { OPENAI_MODEL: "fixture-openai-default" },
    config: [
      'model_provider = "custom"',
      'model = "fixture-openai"',
      "",
      "[model_providers.custom]",
      'base_url = "http://127.0.0.1:9102/v1"'
    ].join("\n")
  };
  const officialClaudeConfig = {
    env: {
      ANTHROPIC_AUTH_TOKEN: "anthropic-test-token",
      ANTHROPIC_BASE_URL: "http://127.0.0.1:9101",
      ANTHROPIC_MODEL: "claude-sonnet-4-6[1m]"
    }
  };

  const sql = `
    create table providers (
      id text not null,
      app_type text not null,
      name text not null,
      settings_config text not null,
      website_url text,
      category text,
      created_at integer,
      sort_index integer,
      notes text,
      icon text,
      icon_color text,
      meta text not null default '{}',
      is_current boolean not null default 0,
      in_failover_queue boolean not null default 0,
      cost_multiplier text not null default '1.0',
      limit_daily_usd text,
      limit_monthly_usd text,
      provider_type text,
      primary key (id, app_type)
    );
    create table provider_endpoints (
      id integer primary key,
      provider_id text not null,
      app_type text not null,
      url text not null,
      added_at integer
    );
    insert into providers (id, app_type, name, settings_config, is_current)
      values ('anthropic-id', 'claude', 'Fixture Claude', ${sqlQuote(JSON.stringify(anthropicConfig))}, 1);
    insert into providers (id, app_type, name, settings_config, is_current)
      values ('official-claude-id', 'claude', 'Official Claude Route', ${sqlQuote(JSON.stringify(officialClaudeConfig))}, 0);
    insert into providers (id, app_type, name, settings_config, is_current)
      values ('openai-id', 'codex', 'Fixture OpenAI', ${sqlQuote(JSON.stringify(openAiConfig))}, 0);
  `;

  if (!(await createFixtureDbWithSqlJs(dbPath, sql))) {
    await execFileAsync("sqlite3", [dbPath, sql]);
  }
  await fs.writeFile(
    path.join(ccSwitchHome, "settings.json"),
    `${JSON.stringify({ currentProviderClaude: "anthropic-id", currentProviderCodex: "openai-id" }, null, 2)}\n`
  );
  return { ccSwitchHome, dbPath };
}

async function createFixtureDbWithSqlJs(dbPath, sql) {
  try {
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    try {
      db.run(sql);
      await fs.writeFile(dbPath, Buffer.from(db.export()));
    } finally {
      db.close();
    }
    return true;
  } catch {
    return false;
  }
}

function startMockAnthropic(expectedModel) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/messages") {
      res.writeHead(404).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assert(body.model === expectedModel.value, `Anthropic proxy sent ${body.model}, expected ${expectedModel.value}`);
    if (expectedModel.claudeCodeCompat) {
      assert(req.headers["x-app"] === "cli", "Claude Code compatibility mode did not set x-app header");
      assert(String(req.headers["user-agent"] || "").includes("claude-cli/"), "Claude Code compatibility mode did not set claude-cli user agent");
      assert(String(req.headers["anthropic-beta"] || "").includes("claude-code-20250219"), "Claude Code compatibility mode did not set Claude Code beta");
      assert(JSON.stringify(body.system || "").includes("Claude Code"), "Claude Code compatibility mode did not add system marker");
      assert(typeof body.system === "string", "Claude Code compatibility mode did not collapse system blocks");
      assert(body.stream === false, "Claude Code compatibility mode did not disable upstream streaming");
      assert(!JSON.stringify(body).includes('"scope"'), "Claude Code compatibility mode did not strip cache_control scope");
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "msg_fixture",
      type: "message",
      role: "assistant",
      model: body.model,
      content: [{ type: "text", text: "anthropic fixture" }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 2 }
    }));
  });
  return new Promise((resolve) => server.listen(9101, "127.0.0.1", () => resolve(server)));
}

function startMockOpenAi(expectedModel) {
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assert(body.model === expectedModel.value, `OpenAI converter sent ${body.model}, expected ${expectedModel.value}`);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "chat_fixture",
      object: "chat.completion",
      model: body.model,
      choices: [{
        index: 0,
        finish_reason: "stop",
        message: { role: "assistant", content: "openai fixture" }
      }],
      usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
    }));
  });
  return new Promise((resolve) => server.listen(9102, "127.0.0.1", () => resolve(server)));
}

function startApp(env) {
  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function waitFor(url, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function postMessages(text, model = "ignored-by-provider", stream = false, extraBody = {}) {
  const res = await fetch(`${BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 64,
      stream,
      messages: [{ role: "user", content: text }],
      ...extraBody
    })
  });
  const data = stream ? await res.text() : await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "ccs-test-"));
const { ccSwitchHome } = await createFixtureDb(tempHome);
const expectedAnthropicModel = { value: "fixture-opus" };
const expectedOpenAiModel = { value: "fixture-openai" };
const anthropic = await startMockAnthropic(expectedAnthropicModel);
const openai = await startMockOpenAi(expectedOpenAiModel);
const app = startApp({
  HOME: tempHome,
  CCSWITCH_HOME: ccSwitchHome,
  CCS_DATA_DIR: path.join(tempHome, "state"),
  CLAUDE_3P_CONFIG_DIR: path.join(tempHome, "Claude-3p"),
  CLAUDE_PRIMARY_CONFIG_DIR: path.join(tempHome, "Claude"),
  PORT: String(PORT),
  BRIDGE_API_KEY: KEY
});

try {
  await waitFor(`${BASE}/health`);

  const providersRes = await fetch(`${BASE}/api/providers`);
  const providersData = await providersRes.json();
  assert(providersData.providers.length === 3, "Expected three providers from cc-switch fixture");
  assert(providersData.providers.every((provider) => !provider.secret), "API leaked provider secret data");
  assert(providersData.providers.some((provider) => provider.active && provider.name === "Fixture Claude"), "cc-switch current provider was not selected");
  const activeProvider = providersData.providers.find((provider) => provider.active);
  assert(activeProvider.models.includes("fixture-opus"), "Active provider did not expose cc-switch model list");
  const officialProvider = providersData.providers.find((provider) => provider.name === "Official Claude Route");
  assert(officialProvider.models.includes("claude-opus-4-7[1m]"), "Claude-like provider did not sync official Claude model list");
  assert(officialProvider.models.includes("claude-opus-4-6[1m]"), "Claude-like provider did not include official Opus 4.6 model");
  assert(!officialProvider.models.includes("claude-haiku-4-6[1m]"), "Claude-like provider kept guessed non-official model");

  const modelsRes = await fetch(`${BASE}/v1/models`);
  const modelsData = await modelsRes.json();
  assert(modelsData.data.some((model) => model.id === "fixture-opus"), "/v1/models did not include alternate Anthropic model");

  const applyRes = await fetch(`${BASE}/api/claude-desktop/apply`, { method: "POST" });
  const applyData = await applyRes.json();
  assert(applyRes.ok, "Claude Desktop one-click config endpoint failed");
  assert(applyData.status.applied === true, "Claude Desktop config was not marked applied");
  assert(applyData.status.deploymentMode === "3p", "Claude Desktop deployment mode was not set");
  assert(applyData.status.primaryDeploymentMode === "3p", "Primary Claude deployment mode was not set");

  const metaPath = path.join(tempHome, "Claude-3p", "configLibrary", "_meta.json");
  const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
  const config = JSON.parse(await fs.readFile(path.join(tempHome, "Claude-3p", "configLibrary", `${meta.appliedId}.json`), "utf8"));
  assert(config.inferenceProvider === "gateway", "Claude Desktop config did not set Gateway provider");
  assert(config.inferenceGatewayApiKey === KEY, "Claude Desktop config did not write Gateway key");
  assert(config.inferenceGatewayAuthScheme === "x-api-key", "Claude Desktop config did not set x-api-key auth");
  assert(config.inferenceModels.includes("fixture-opus"), "Claude Desktop config did not write multiple Gateway models");
  const primaryConfig = JSON.parse(await fs.readFile(path.join(tempHome, "Claude", "claude_desktop_config.json"), "utf8"));
  assert(primaryConfig.deploymentMode === "3p", "Primary Claude config did not set deploymentMode");

  const anthropicMessage = await postMessages("hello", "fixture-opus");
  assert(anthropicMessage.content[0].text === "anthropic fixture", "Anthropic proxy response failed");

  expectedAnthropicModel.value = "claude-sonnet-4-6";
  expectedAnthropicModel.claudeCodeCompat = true;
  const officialSwitchRes = await fetch(`${BASE}/api/active`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: officialProvider.id })
  });
  assert(officialSwitchRes.ok, "Switching to Claude-like provider failed");
  const streamedAnthropicMessage = await postMessages("hello", "claude-sonnet-4-6[1m]", true);
  assert(streamedAnthropicMessage.includes("anthropic fixture"), "Claude Code compatibility streaming bridge failed");
  const scopedCacheControlMessage = await postMessages("hello", "claude-sonnet-4-6[1m]", true, {
    system: [
      { type: "text", text: "fixture system" },
      {
        type: "text",
        text: "cached fixture system",
        cache_control: { type: "ephemeral", ephemeral: { scope: "fixture" } }
      }
    ],
    messages: [{
      role: "user",
      content: [{
        type: "text",
        text: "hello",
        cache_control: { type: "ephemeral", ephemeral: { scope: "fixture" } }
      }]
    }]
  });
  assert(scopedCacheControlMessage.includes("anthropic fixture"), "Claude Code compatibility cache_control sanitizer failed");
  expectedAnthropicModel.claudeCodeCompat = false;

  const openAiProvider = providersData.providers.find((provider) => provider.name === "Fixture OpenAI");
  const switchRes = await fetch(`${BASE}/api/active`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: openAiProvider.id })
  });
  assert(switchRes.ok, "Switching active provider failed");

  const openAiMessage = await postMessages("hello", "fixture-openai");
  assert(openAiMessage.content[0].text === "openai fixture", "OpenAI bridge response failed");

  console.log("Smoke tests passed");
} finally {
  app.kill();
  anthropic.close();
  openai.close();
  await fs.rm(tempHome, { recursive: true, force: true });
}
