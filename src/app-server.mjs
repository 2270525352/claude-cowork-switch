import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  configLocations,
  groupProviders,
  loadProviders,
  readCcSwitchActiveIds,
  readCcSwitchSettingsMtime,
  sanitizeAlias,
  sanitizeProvider
} from "./config-sources.mjs";
import {
  addCustomProvider,
  deleteCustomProvider,
  listCustomProviders,
  updateCustomProvider
} from "./custom-providers.mjs";
import { dataDir, getState, recordAutoConfigured, recordCcSwitchMtime, setActiveProviderId, updateSettings } from "./state.mjs";
import { handleMessageRequest, readBody, sendAnthropicError, sendJson, sendModelList } from "./protocol.mjs";
import { getLogEntries, recordLogEntry } from "./logs.mjs";
import {
  applyClaudeDesktopConfig,
  claudeDesktopConfigStatus,
  claudeDesktopInstalled,
  claudeDesktopProcessState,
  restartClaudeDesktop
} from "./claude-desktop-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

async function sendFile(res, filePath) {
  try {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(PUBLIC_DIR)) {
      sendJson(res, 403, { error: "forbidden" });
      return;
    }
    const data = await fs.readFile(resolved);
    res.writeHead(200, { "content-type": contentType(resolved) });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "not found" });
  }
}

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const CLAUDE_CREDS_PATH = path.join(HOME, ".claude", ".credentials.json");
let oauthCache = { token: null, mtime: 0, checkedAt: 0 };

async function readClaudeOauthToken() {
  const now = Date.now();
  if (now - oauthCache.checkedAt < 4000) return oauthCache.token;
  oauthCache.checkedAt = now;
  try {
    const stat = await fs.stat(CLAUDE_CREDS_PATH);
    if (stat.mtimeMs === oauthCache.mtime) return oauthCache.token;
    const raw = await fs.readFile(CLAUDE_CREDS_PATH, "utf8");
    const data = JSON.parse(raw);
    oauthCache.token = data?.claudeAiOauth?.accessToken || null;
    oauthCache.mtime = stat.mtimeMs;
  } catch {
    oauthCache.token = null;
    oauthCache.mtime = 0;
  }
  return oauthCache.token;
}

function extractBearerHeader(req) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey) return apiKey;
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function authed(req, bridgeApiKey) {
  const sent = extractBearerHeader(req);
  if (!bridgeApiKey && !sent) return true;
  if (sent && sent === bridgeApiKey) return true;
  const oauth = await readClaudeOauthToken();
  if (oauth && sent === oauth) return true;
  return false;
}

function providerIdFor(appType, sourceProviderId) {
  return `cc-switch-db:${appType}:${sourceProviderId}`;
}

function probeUrl(provider) {
  if (!provider?.baseUrl) return null;
  const base = provider.baseUrl.endsWith("/") ? provider.baseUrl : `${provider.baseUrl}/`;
  return provider.kind === "openai"
    ? new URL("models", base).toString()
    : new URL("v1/models", base).toString();
}

async function probeProvider(provider) {
  const url = probeUrl(provider);
  if (!url) return { ok: false, detail: "no base URL" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  const headers = {};
  if (provider.kind === "anthropic" && provider.secret?.anthropicKey) {
    headers["x-api-key"] = provider.secret.anthropicKey;
    headers["anthropic-version"] = "2023-06-01";
  }
  if (provider.kind === "openai" && provider.secret?.openAiKey) {
    headers.authorization = `Bearer ${provider.secret.openAiKey}`;
  }

  const started = Date.now();
  try {
    const response = await fetch(url, { method: "GET", headers, signal: controller.signal });
    const latencyMs = Date.now() - started;
    const ok = response.status < 500 && response.status !== 404;
    return {
      ok,
      status: response.status,
      latencyMs,
      detail: ok ? "responsive" : `status ${response.status}`
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      detail: error.name === "AbortError" ? "timeout after 3s" : error.message
    };
  } finally {
    clearTimeout(timer);
  }
}

async function providerSnapshot() {
  let state = await getState();
  const providers = await loadProviders();
  const [settingsMtime, ccActive] = await Promise.all([
    readCcSwitchSettingsMtime(),
    readCcSwitchActiveIds()
  ]);

  const findById = (id) => providers.find((provider) => provider.id === id && provider.compatible);

  const currentActive = findById(state.activeProviderId);
  const currentAppType = currentActive?.appType || "claude";
  const ccDesiredId = ccActive[currentAppType] || ccActive.claude || ccActive.codex || null;
  const ccDesiredFull = ccDesiredId ? providerIdFor(currentAppType, ccDesiredId) : null;
  const ccProvider = ccDesiredFull ? findById(ccDesiredFull) : null;

  if (settingsMtime && settingsMtime > (state.ccSwitchMtime || 0)) {
    if (ccProvider && ccProvider.id !== state.activeProviderId) {
      state = await setActiveProviderId(ccProvider.id, { ccSwitchMtime: settingsMtime, pinnedAt: 0 });
    } else {
      state = await recordCcSwitchMtime(settingsMtime);
    }
  }

  let active = findById(state.activeProviderId);
  if (!active) {
    active = ccProvider
      || providers.find((provider) => provider.compatible && provider.isCcSwitchCurrent)
      || providers.find((provider) => provider.compatible)
      || null;
    if (active && state.activeProviderId !== active.id) {
      state = await setActiveProviderId(active.id, { ccSwitchMtime: settingsMtime, pinnedAt: 0 });
    }
  }

  return { state, providers, active, settingsMtime, ccDesired: ccDesiredFull };
}

async function sendProviders(res) {
  const snapshot = await providerSnapshot();
  const activeId = snapshot.active?.id || null;
  const groups = groupProviders(snapshot.providers, {
    activeId,
    pinnedId: snapshot.state.activeProviderId
  });

  const rendered = groups.map((group) => {
    const sanitized = sanitizeProvider(group.primary);
    const aliases = group.aliases.map(sanitizeAlias);
    const groupActive = activeId
      ? group.members.some((member) => member.id === activeId)
      : false;
    return {
      ...sanitized,
      aliases,
      aliasCount: aliases.length,
      active: groupActive
    };
  });

  sendJson(res, 200, {
    activeProviderId: activeId,
    bridgeApiKey: snapshot.state.bridgeApiKey,
    locations: configLocations(),
    dataDir: dataDir(),
    settings: {
      modelSource: snapshot.state.modelSource,
      healthProbeEnabled: snapshot.state.healthProbeEnabled
    },
    providers: rendered
  });
}

async function setActive(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: `Invalid JSON: ${error.message}` });
    return;
  }

  const providers = await loadProviders();
  const provider = providers.find((item) => item.id === body.id);
  if (!provider) {
    sendJson(res, 404, { error: "Provider not found" });
    return;
  }
  if (!provider.compatible) {
    sendJson(res, 400, { error: "Provider is not compatible with this bridge" });
    return;
  }

  if (!provider.authPresent && !body.confirmAuthMissing) {
    sendJson(res, 409, {
      error: "NO COIN: provider has no API key configured.",
      needsConfirmation: "auth-missing",
      provider: { id: provider.id, name: provider.name }
    });
    return;
  }

  const state = await getState();
  if (state.healthProbeEnabled && !body.skipHealthProbe) {
    const probe = await probeProvider(provider);
    if (!probe.ok) {
      sendJson(res, 502, {
        error: `Health probe failed (${probe.status || "no response"}): ${probe.detail || "upstream unreachable"}`,
        needsConfirmation: "health-probe",
        provider: { id: provider.id, name: provider.name },
        probe
      });
      return;
    }
  }

  const settingsMtime = await readCcSwitchSettingsMtime();
  await setActiveProviderId(provider.id, { ccSwitchMtime: settingsMtime, pinnedAt: Date.now() });
  await sendProviders(res);
}

async function handleClaudeMessages(req, res) {
  const started = Date.now();
  const snapshot = await providerSnapshot();
  if (!(await authed(req, snapshot.state.bridgeApiKey))) {
    const sentKey = extractBearerHeader(req);
    const expectedTail = (snapshot.state.bridgeApiKey || "").slice(-6);
    recordLogEntry({
      method: req.method,
      path: "/v1/messages",
      status: 401,
      latencyMs: Date.now() - started,
      error: `auth fail: sent=…${sentKey ? sentKey.slice(-6) : "(none)"} expected=…${expectedTail}`
    });
    sendAnthropicError(res, 401, "Invalid Gateway API key", "authentication_error");
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    recordLogEntry({
      method: req.method,
      path: "/v1/messages",
      providerId: snapshot.active?.id,
      providerName: snapshot.active?.name,
      kind: snapshot.active?.kind,
      status: 400,
      latencyMs: Date.now() - started,
      error: `invalid json: ${error.message}`
    });
    sendAnthropicError(res, 400, `Invalid JSON body: ${error.message}`, "invalid_request_error");
    return;
  }

  res.on("finish", () => {
    recordLogEntry({
      method: req.method,
      path: "/v1/messages",
      providerId: snapshot.active?.id,
      providerName: snapshot.active?.name,
      kind: snapshot.active?.kind,
      model: body?.model || snapshot.active?.model,
      stream: Boolean(body?.stream),
      status: res.statusCode,
      latencyMs: Date.now() - started
    });
  });

  try {
    await handleMessageRequest(req, res, body, snapshot.active);
  } catch (error) {
    sendAnthropicError(res, 500, error.stack || error.message);
  }
}

async function autoEnsureClaudeConfig(origin) {
  const installed = await claudeDesktopInstalled();
  if (!installed.installed) {
    return { autoConfigured: false, reason: "claude-not-installed" };
  }

  const snapshot = await providerSnapshot();
  if (!snapshot.active) {
    return { autoConfigured: false, reason: "no-active-provider" };
  }

  const status = await claudeDesktopConfigStatus(origin);
  const configKey = status.rawConfig?.inferenceGatewayApiKey || null;
  const ourKey = snapshot.state.bridgeApiKey;
  const needsApply = !status.applied || configKey !== ourKey || status.deploymentMode !== "3p";
  if (!needsApply) {
    return { autoConfigured: false, reason: "already-configured" };
  }

  try {
    await applyClaudeDesktopConfig({
      origin,
      apiKey: ourKey,
      model: snapshot.active.model,
      models: snapshot.active.models
    });
    const reason = !status.applied ? "first-time" : configKey !== ourKey ? "key-mismatch" : "deployment-mode";
    await recordAutoConfigured(reason);
    return { autoConfigured: true, reason };
  } catch (error) {
    return { autoConfigured: false, reason: `apply-failed: ${error.message}` };
  }
}

async function collectSetupStatus(origin) {
  const snapshot = await providerSnapshot();
  const [configStatus, processState] = await Promise.all([
    claudeDesktopConfigStatus(origin),
    claudeDesktopProcessState()
  ]);

  const bridgeKey = snapshot.state.bridgeApiKey;
  const configKey = configStatus.rawConfig?.inferenceGatewayApiKey || null;
  const keyMatches = Boolean(bridgeKey && configKey && bridgeKey === configKey);

  return {
    gateway: {
      ok: true,
      url: origin,
      bridgeKeyTail: bridgeKey ? bridgeKey.slice(-6) : null
    },
    autoConfig: {
      installedAt: snapshot.state.lastAutoConfiguredAt || 0,
      reason: snapshot.state.lastAutoConfigReason || null
    },
    config: {
      ok: configStatus.applied && keyMatches,
      applied: configStatus.applied,
      keyMatches,
      deploymentMode: configStatus.deploymentMode,
      primaryDeploymentMode: configStatus.primaryDeploymentMode,
      gatewayBaseUrl: configStatus.gatewayBaseUrl,
      targetGatewayBaseUrl: configStatus.targetGatewayBaseUrl,
      authScheme: configStatus.authScheme,
      models: configStatus.models,
      configDir: configStatus.configDir,
      configKeyTail: configKey ? configKey.slice(-6) : null
    },
    claude: processState,
    active: snapshot.active ? {
      id: snapshot.active.id,
      name: snapshot.active.name,
      kind: snapshot.active.kind,
      baseUrl: snapshot.active.baseUrl
    } : null
  };
}

async function waitForClaudeProcess(maxMs = 6000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const state = await claudeDesktopProcessState();
    if (state.running) return state;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return { running: false, error: "timeout" };
}

async function runOneClickSetup(origin) {
  const steps = [];
  const push = (name, ok, detail) => steps.push({ name, ok, detail });

  const snapshot = await providerSnapshot();
  if (!snapshot.active) {
    push("active", false, "no active provider configured");
    return { ok: false, steps };
  }
  push("active", true, `${snapshot.active.name} (${snapshot.active.kind})`);

  try {
    const apply = await applyClaudeDesktopConfig({
      origin,
      apiKey: snapshot.state.bridgeApiKey,
      model: snapshot.active.model,
      models: snapshot.active.models
    });
    push("config", apply.ok, apply.backupDir ? `backup: ${apply.backupDir}` : "applied");
  } catch (error) {
    push("config", false, error.message);
    return { ok: false, steps, status: await collectSetupStatus(origin) };
  }

  try {
    await restartClaudeDesktop();
    push("restart", true, "restart command sent");
  } catch (error) {
    push("restart", false, error.message);
  }

  const procState = await waitForClaudeProcess();
  push("claude", procState.running, procState.running ? "process up" : (procState.error || "no process"));

  const probe = await probeProvider(snapshot.active);
  push("upstream", probe.ok, `${probe.status || ""} ${probe.detail || ""}`.trim());

  const status = await collectSetupStatus(origin);
  const ok = steps.every((s) => s.ok);
  return { ok, steps, status };
}

function requestOrigin(req, fallbackUrl) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `${proto}://${host}` : fallbackUrl;
}

export function createAppServer(options = {}) {
  const host = options.host || process.env.HOST || "127.0.0.1";
  const port = Number(options.port || process.env.PORT || 8787);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      await sendFile(res, path.join(PUBLIC_DIR, "index.html"));
      return;
    }

    if (req.method === "GET" && ["/app.js", "/styles.css", "/logo.svg"].includes(url.pathname)) {
      await sendFile(res, path.join(PUBLIC_DIR, url.pathname.slice(1)));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/providers") {
      await sendProviders(res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/active") {
      await setActive(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/providers/custom") {
      const raw = await listCustomProviders();
      sendJson(res, 200, {
        providers: raw.map(({ apiKey, ...rest }) => ({ ...rest, hasApiKey: Boolean(apiKey) }))
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/providers/custom") {
      try {
        const body = await readBody(req);
        const record = await addCustomProvider(body);
        const { apiKey, ...safe } = record;
        sendJson(res, 200, { provider: { ...safe, hasApiKey: Boolean(apiKey) } });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === "PATCH" && url.pathname === "/api/providers/custom") {
      const id = url.searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "id query param required" });
        return;
      }
      try {
        const body = await readBody(req);
        const record = await updateCustomProvider(id, body);
        const { apiKey, ...safe } = record;
        sendJson(res, 200, { provider: { ...safe, hasApiKey: Boolean(apiKey) } });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/providers/custom") {
      const id = url.searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "id query param required" });
        return;
      }
      try {
        const removed = await deleteCustomProvider(id);
        sendJson(res, removed ? 200 : 404, { ok: removed });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/settings") {
      try {
        const body = await readBody(req);
        await updateSettings(body || {});
        await sendProviders(res);
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/logs") {
      const snapshot = await providerSnapshot();
      const since = Number(url.searchParams.get("since") || 0);
      sendJson(res, 200, {
        entries: getLogEntries(since),
        activeProviderId: snapshot.active?.id || null
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/claude-desktop/status") {
      try {
        sendJson(res, 200, await claudeDesktopConfigStatus(requestOrigin(req, `http://${host}:${port}`)));
      } catch (error) {
        sendJson(res, 500, { error: error.stack || error.message });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/claude-desktop/apply") {
      try {
        const snapshot = await providerSnapshot();
        const result = await applyClaudeDesktopConfig({
          origin: requestOrigin(req, `http://${host}:${port}`),
          apiKey: snapshot.state.bridgeApiKey,
          model: snapshot.active?.model,
          models: snapshot.active?.models
        });
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: error.stack || error.message });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/claude-desktop/restart") {
      try {
        sendJson(res, 200, await restartClaudeDesktop());
      } catch (error) {
        sendJson(res, 500, { error: error.stack || error.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/setup/status") {
      try {
        sendJson(res, 200, await collectSetupStatus(requestOrigin(req, `http://${host}:${port}`)));
      } catch (error) {
        sendJson(res, 500, { error: error.stack || error.message });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/setup") {
      try {
        const result = await runOneClickSetup(requestOrigin(req, `http://${host}:${port}`));
        sendJson(res, result.ok ? 200 : 500, result);
      } catch (error) {
        sendJson(res, 500, { error: error.stack || error.message });
      }
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      const snapshot = await providerSnapshot();
      sendJson(res, 200, {
        ok: Boolean(snapshot.active),
        active: snapshot.active ? sanitizeProvider(snapshot.active) : null,
        providers: snapshot.providers.length
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/models") {
      const snapshot = await providerSnapshot();
      sendModelList(res, snapshot.active);
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/messages") {
      await handleClaudeMessages(req, res);
      return;
    }

    sendJson(res, 404, { error: `No route for ${req.method} ${url.pathname}` });
  });

  return { server, host, port };
}

export async function startAppServer(options = {}) {
  const appServer = createAppServer(options);
  await new Promise((resolve, reject) => {
    appServer.server.once("error", reject);
    appServer.server.listen(appServer.port, appServer.host, resolve);
  });

  const snapshot = await providerSnapshot();
  const origin = `http://${appServer.host}:${appServer.port}`;
  const autoResult = await autoEnsureClaudeConfig(origin).catch((error) => ({
    autoConfigured: false,
    reason: `auto-config-error: ${error.message}`
  }));

  return {
    ...appServer,
    snapshot,
    auto: autoResult,
    url: origin
  };
}
