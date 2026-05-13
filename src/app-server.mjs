import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configLocations, loadProviders, sanitizeProvider } from "./config-sources.mjs";
import { dataDir, getState, setActiveProviderId } from "./state.mjs";
import { handleMessageRequest, readBody, sendAnthropicError, sendJson, sendModelList } from "./protocol.mjs";
import {
  applyClaudeDesktopConfig,
  claudeDesktopConfigStatus,
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

function authed(req, bridgeApiKey) {
  if (!bridgeApiKey) return true;
  const apiKey = req.headers["x-api-key"];
  const auth = req.headers.authorization || "";
  return apiKey === bridgeApiKey || auth === `Bearer ${bridgeApiKey}`;
}

async function providerSnapshot() {
  const state = await getState();
  const providers = await loadProviders();
  let active = providers.find((provider) => provider.id === state.activeProviderId && provider.compatible);

  if (!active) {
    active = providers.find((provider) => provider.compatible && provider.isCcSwitchCurrent)
      || providers.find((provider) => provider.compatible)
      || null;
    if (active && state.activeProviderId !== active.id) {
      await setActiveProviderId(active.id);
    }
  }

  return { state: await getState(), providers, active };
}

async function sendProviders(res) {
  const snapshot = await providerSnapshot();
  sendJson(res, 200, {
    activeProviderId: snapshot.active?.id || null,
    bridgeApiKey: snapshot.state.bridgeApiKey,
    locations: configLocations(),
    dataDir: dataDir(),
    providers: snapshot.providers.map((provider) => ({
      ...sanitizeProvider(provider),
      active: snapshot.active?.id === provider.id
    }))
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

  await setActiveProviderId(provider.id);
  await sendProviders(res);
}

async function handleClaudeMessages(req, res) {
  const snapshot = await providerSnapshot();
  if (!authed(req, snapshot.state.bridgeApiKey)) {
    sendAnthropicError(res, 401, "Invalid Gateway API key", "authentication_error");
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    sendAnthropicError(res, 400, `Invalid JSON body: ${error.message}`, "invalid_request_error");
    return;
  }

  try {
    await handleMessageRequest(req, res, body, snapshot.active);
  } catch (error) {
    sendAnthropicError(res, 500, error.stack || error.message);
  }
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

    if (req.method === "GET" && ["/app.js", "/styles.css"].includes(url.pathname)) {
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
  return {
    ...appServer,
    snapshot,
    url: `http://${appServer.host}:${appServer.port}`
  };
}
