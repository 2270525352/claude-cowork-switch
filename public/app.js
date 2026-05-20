/* ============================================================
   i18n
   ============================================================ */
const I18N = {
  zh: {
    "app.title": "Claude 中转切换器",
    "app.subtitle": "读取 cc-switch 配置，切换 Claude Desktop Gateway 上游",
    "btn.refresh": "刷新",
    "btn.configure": "配置 Claude",
    "btn.restart": "重启 Claude",
    "btn.setup": "一键启用",
    "btn.setupRunning": "执行中…",
    "btn.dismiss": "忽略",
    "btn.addProvider": "添加渠道",
    "btn.delete": "删除",
    "provider.title": "添加渠道",
    "provider.name": "名称",
    "provider.kind": "协议",
    "provider.baseUrl": "Base URL",
    "provider.apiKey": "API Key",
    "provider.apiKeyKeep": "留空保留原 key",
    "provider.models": "模型列表",
    "provider.modelsHint": "每行一个，第一项作为默认",
    "provider.deleteConfirm": (name) => `删除自定义渠道「${name}」吗？此操作不可撤销。`,
    "provider.deleteBtn": "删除",
    "autoConfig.firstTime": "已自动写入 Claude 3P 配置，请点击「重启 Claude」让其生效。",
    "autoConfig.keyMismatch": "检测到 3P 配置的 key 与 Gateway 不一致，已自动修复，请重启 Claude。",
    "autoConfig.deploymentMode": "检测到 Claude 不在 3P 模式，已自动切换，请重启 Claude。",
    "chk.gateway": "Gateway",
    "chk.config": "3P 配置",
    "chk.claude": "Claude 进程",
    "chk.active": "活跃通道",
    "chk.hint": "点击「一键启用」会写入 3P 配置并重启 Claude",
    "chk.detail.running": (port) => `端口 ${port}`,
    "chk.detail.notWritten": "未写入",
    "chk.detail.applied": "已写入",
    "chk.detail.keyMismatch": "key 不匹配 — 需重新配置",
    "chk.detail.notRunning": "未运行",
    "chk.detail.up": "运行中",
    "chk.detail.noActive": "无",
    "setup.title": "一键启用 Claude Gateway",
    "setup.running": "正在配置…",
    "setup.done": "全部就绪，请在 Claude Desktop 里发消息",
    "setup.fail": (msg) => `失败：${msg}`,
    "setup.step.active": "选择活跃通道",
    "setup.step.config": "写入 3P 配置",
    "setup.step.restart": "重启 Claude",
    "setup.step.claude": "等待 Claude 启动",
    "setup.step.upstream": "探测上游可用性",
    "btn.show": "显示",
    "btn.hide": "隐藏",
    "btn.copy": "复制",
    "btn.copied": "已复制",
    "label.gateway": "Gateway",
    "label.bridge": "Bridge Key",
    "label.active": "活跃通道",
    "label.claude": "Claude Desktop",
    "label.configDir": "3P 配置目录",
    "label.modelSource": "模型来源",
    "label.healthProbe": "切换前探测可用性",
    "modelSrc.auto": "自动",
    "modelSrc.official": "官方模型",
    "modelSrc.provider": "渠道自带",
    "section.providers": "通道",
    "section.unsupported": "停用通道",
    "section.log": "请求日志",
    "section.locations": "配置来源",
    "th.name": "名称",
    "th.app": "应用",
    "th.model": "模型",
    "th.url": "地址",
    "th.state": "状态",
    "th.action": "操作",
    "table.empty": "未在 cc-switch 中发现通道",
    "log.empty": "尚无请求",
    "log.foot": "最近 60 条 · 每 2 秒刷新",
    "modal.confirm": "确认",
    "modal.ok": "确定",
    "modal.cancel": "取消",
    "state.active": "使用中",
    "state.ready": "就绪",
    "state.current": "cc-current",
    "state.noAuth": "缺密钥",
    "state.disabled": "停用",
    "action.use": "使用",
    "action.inUse": "使用中",
    "warn.proxyOnly": "仅 Gateway 中转",
    "warn.proxyOnly.tip": "此地址为 HTTP 公网 IP，无法直接填给 Claude Desktop",
    "alias.expand": (n) => `+${n} 个别名`,
    "alias.collapse": "收起别名",
    "alias.row": (label, name, noAuth) => `${label} · ${name}${noAuth ? "（缺密钥）" : ""}`,
    "status.scanning": "扫描中…",
    "status.ready": "就绪",
    "status.readyActive": (name) => `就绪 — 已选 ${name}`,
    "status.readyEmpty": "就绪 — 未选择通道",
    "status.switching": (name) => `切换到 ${name}…`,
    "status.writing": "写入 Claude 3P 配置…",
    "status.restarting": "重启 Claude Desktop…",
    "status.writtenConfig": "3P 配置已写入",
    "status.restartSent": "重启指令已发送",
    "status.clipboard": "已复制到剪贴板",
    "status.clipboardFail": "剪贴板不可用",
    "status.settingsOk": "设置已更新",
    "claude.linked": (url) => `已链接 ${url}`,
    "claude.linkedBackup": (dir) => `已链接（备份于 ${dir}）`,
    "claude.notApplied": "未配置",
    "claude.linkedRestart": "已链接 — 请重启 Claude",
    "summary": (ready, total) => `${ready} 可用 / 共 ${total}`,
    "summaryError": (msg) => `加载失败：${msg}`,
    "errorPrefix": (msg) => `错误：${msg}`,
    "confirm.noAuth.title": "缺少 API 密钥",
    "confirm.noAuth.body": (name) => `${name} 在 cc-switch 中未配置 API Key。Gateway 将以无认证方式转发，可能导致 401。继续？`,
    "confirm.noAuth.btn": "继续切换",
    "confirm.probe.title": "探测失败",
    "confirm.probe.body": (name, detail) => `${name} 未响应（${detail}）。跳过探测并强制切换？`,
    "confirm.probe.btn": "强制切换",
    "active.empty": "--"
  },
  en: {
    "app.title": "Claude Cowork Switch",
    "app.subtitle": "Read cc-switch providers and route the local Claude Desktop Gateway.",
    "btn.refresh": "Refresh",
    "btn.configure": "Configure Claude",
    "btn.restart": "Restart Claude",
    "btn.setup": "Enable Now",
    "btn.setupRunning": "Working…",
    "btn.dismiss": "Dismiss",
    "btn.addProvider": "Add Provider",
    "btn.delete": "Delete",
    "provider.title": "Add Provider",
    "provider.name": "Name",
    "provider.kind": "Protocol",
    "provider.baseUrl": "Base URL",
    "provider.apiKey": "API Key",
    "provider.apiKeyKeep": "Leave blank to keep existing",
    "provider.models": "Models",
    "provider.modelsHint": "One per line, first item is the default",
    "provider.deleteConfirm": (name) => `Delete custom provider "${name}"? This cannot be undone.`,
    "provider.deleteBtn": "Delete",
    "autoConfig.firstTime": "3P config written automatically. Click Restart Claude to apply.",
    "autoConfig.keyMismatch": "3P config key was out of sync with the gateway. Fixed; please restart Claude.",
    "autoConfig.deploymentMode": "Claude was not in 3P mode; switched. Please restart Claude.",
    "chk.gateway": "Gateway",
    "chk.config": "3P Config",
    "chk.claude": "Claude Process",
    "chk.active": "Active Provider",
    "chk.hint": "Enable Now writes the 3P config and restarts Claude in one click.",
    "chk.detail.running": (port) => `port ${port}`,
    "chk.detail.notWritten": "not written",
    "chk.detail.applied": "applied",
    "chk.detail.keyMismatch": "key mismatch — re-configure",
    "chk.detail.notRunning": "not running",
    "chk.detail.up": "running",
    "chk.detail.noActive": "none",
    "setup.title": "Enable Claude Gateway",
    "setup.running": "Setting up…",
    "setup.done": "All systems ready — send a message in Claude Desktop.",
    "setup.fail": (msg) => `Failed: ${msg}`,
    "setup.step.active": "Select active provider",
    "setup.step.config": "Write 3P config",
    "setup.step.restart": "Restart Claude",
    "setup.step.claude": "Wait for Claude process",
    "setup.step.upstream": "Probe upstream",
    "btn.show": "Show",
    "btn.hide": "Hide",
    "btn.copy": "Copy",
    "btn.copied": "Copied",
    "label.gateway": "Gateway",
    "label.bridge": "Bridge Key",
    "label.active": "Active",
    "label.claude": "Claude Desktop",
    "label.configDir": "3P Config Dir",
    "label.modelSource": "Model Source",
    "label.healthProbe": "Probe upstream before switching",
    "modelSrc.auto": "Auto",
    "modelSrc.official": "Official models",
    "modelSrc.provider": "Provider list",
    "section.providers": "Providers",
    "section.unsupported": "Disabled providers",
    "section.log": "Request log",
    "section.locations": "Config sources",
    "th.name": "Name",
    "th.app": "App",
    "th.model": "Model",
    "th.url": "URL",
    "th.state": "State",
    "th.action": "Action",
    "table.empty": "No providers found in cc-switch.",
    "log.empty": "No requests yet",
    "log.foot": "Last 60 entries · refresh every 2s",
    "modal.confirm": "Confirm",
    "modal.ok": "OK",
    "modal.cancel": "Cancel",
    "state.active": "Active",
    "state.ready": "Ready",
    "state.current": "cc-current",
    "state.noAuth": "No key",
    "state.disabled": "Disabled",
    "action.use": "Use",
    "action.inUse": "In use",
    "warn.proxyOnly": "Gateway only",
    "warn.proxyOnly.tip": "This is an HTTP public-IP endpoint and cannot be used by Claude Desktop directly.",
    "alias.expand": (n) => `+${n} alias${n > 1 ? "es" : ""}`,
    "alias.collapse": "Hide aliases",
    "alias.row": (label, name, noAuth) => `${label} · ${name}${noAuth ? " (no key)" : ""}`,
    "status.scanning": "Scanning…",
    "status.ready": "Ready",
    "status.readyActive": (name) => `Ready — using ${name}`,
    "status.readyEmpty": "Ready — no provider selected",
    "status.switching": (name) => `Switching to ${name}…`,
    "status.writing": "Writing Claude 3P config…",
    "status.restarting": "Restarting Claude Desktop…",
    "status.writtenConfig": "3P config written",
    "status.restartSent": "Restart command sent",
    "status.clipboard": "Copied to clipboard",
    "status.clipboardFail": "Clipboard unavailable",
    "status.settingsOk": "Settings updated",
    "claude.linked": (url) => `Linked to ${url}`,
    "claude.linkedBackup": (dir) => `Linked (backup at ${dir})`,
    "claude.notApplied": "Not configured",
    "claude.linkedRestart": "Linked — restart Claude",
    "summary": (ready, total) => `${ready} ready / ${total} total`,
    "summaryError": (msg) => `Load failed: ${msg}`,
    "errorPrefix": (msg) => `Error: ${msg}`,
    "confirm.noAuth.title": "Missing API key",
    "confirm.noAuth.body": (name) => `${name} has no API key in cc-switch. The gateway will forward without auth, which usually returns 401. Continue?`,
    "confirm.noAuth.btn": "Switch anyway",
    "confirm.probe.title": "Probe failed",
    "confirm.probe.body": (name, detail) => `${name} did not respond (${detail}). Skip the probe and switch anyway?`,
    "confirm.probe.btn": "Force switch",
    "active.empty": "--"
  }
};

const LANG_STORAGE_KEY = "ccs-lang";

function detectLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === "zh" || saved === "en") return saved;
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("zh") ? "zh" : "en";
}

let lang = detectLang();

function t(key, ...args) {
  const dict = I18N[lang] || I18N.zh;
  const value = dict[key];
  if (typeof value === "function") return value(...args);
  if (typeof value === "string") return value;
  return key;
}

function applyStaticI18n() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.title = t("app.title");
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  }
  for (const btn of document.querySelectorAll(".lang-btn")) {
    btn.classList.toggle("is-active", btn.dataset.lang === lang);
  }
}

/* ============================================================
   DOM refs
   ============================================================ */
const rowsEl = document.querySelector("#providerRows");
const locationsEl = document.querySelector("#locations");
const summaryEl = document.querySelector("#providerSummary");
const activeEl = document.querySelector("#activeProvider");
const gatewayUrlEl = document.querySelector("#gatewayUrl");
const bridgeKeyEl = document.querySelector("#bridgeKey");
const bridgeKeyRevealBtn = document.querySelector("#bridgeKeyReveal");
const bridgeKeyCopyBtn = document.querySelector("#bridgeKeyCopy");
const refreshButton = document.querySelector("#refreshButton");
const configureClaudeButton = document.querySelector("#configureClaudeButton");
const restartClaudeButton = document.querySelector("#restartClaudeButton");
const claudeConfigStatusEl = document.querySelector("#claudeConfigStatus");
const claudeConfigPathEl = document.querySelector("#claudeConfigPath");
const emptyTemplate = document.querySelector("#emptyTemplate");
const unsupportedFold = document.querySelector("#unsupportedFold");
const unsupportedList = document.querySelector("#unsupportedList");
const unsupportedCount = document.querySelector("#unsupportedCount");
const logStrip = document.querySelector("#logStrip");
const modelSourceSelect = document.querySelector("#modelSourceSelect");
const healthProbeToggle = document.querySelector("#healthProbeToggle");

const setupButton = document.querySelector("#setupButton");
const setupHint = document.querySelector("#setupHint");
const autoBanner = document.querySelector("#autoBanner");
const autoBannerText = document.querySelector("#autoBannerText");
const autoBannerRestart = document.querySelector("#autoBannerRestart");
const autoBannerDismiss = document.querySelector("#autoBannerDismiss");
const chips = {
  gateway: document.querySelector('.chip[data-chk="gateway"]'),
  config: document.querySelector('.chip[data-chk="config"]'),
  claude: document.querySelector('.chip[data-chk="claude"]'),
  active: document.querySelector('.chip[data-chk="active"]')
};

const addProviderButton = document.querySelector("#addProviderButton");
const providerModal = document.querySelector("#providerModal");
const providerForm = document.querySelector("#providerForm");
const providerCancel = document.querySelector("#providerCancel");
const providerFormError = document.querySelector("#providerFormError");
const providerModalTitle = document.querySelector("#providerModalTitle");
const apiKeyHint = document.querySelector("#apiKeyHint");

const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
const modalConfirm = document.querySelector("#modalConfirm");
const modalCancel = document.querySelector("#modalCancel");

const state = {
  bridgeKey: "",
  bridgeKeyRevealed: false,
  lastLogId: 0,
  pendingConfirm: null,
  providers: [],
  claudeStatus: null
};

/* ============================================================
   render helpers
   ============================================================ */
function fmtBridgeKey() {
  if (!state.bridgeKey) return "------------";
  if (state.bridgeKeyRevealed) return state.bridgeKey;
  return "•".repeat(Math.min(state.bridgeKey.length, 24));
}

function renderBridgeKey() {
  bridgeKeyEl.textContent = fmtBridgeKey();
  bridgeKeyRevealBtn.textContent = state.bridgeKeyRevealed ? t("btn.hide") : t("btn.show");
}

function plate(label, variant) {
  const span = document.createElement("span");
  span.className = `state-plate state-${variant}`;
  span.textContent = label;
  return span;
}

function renderLocations(locations) {
  locationsEl.replaceChildren();
  for (const [label, value] of Object.entries(locations || {})) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    const code = document.createElement("code");
    code.textContent = value;
    dd.append(code);
    locationsEl.append(dt, dd);
  }
}

function modelLabel(provider) {
  const models = Array.isArray(provider.models) ? provider.models.filter(Boolean) : [];
  if (models.length > 1) return `${models[0]} +${models.length - 1}`;
  return provider.model || models[0] || "--";
}

function statePlatesFor(provider) {
  const plates = [];
  if (provider.isCcSwitchCurrent) plates.push(plate(t("state.current"), "current"));
  if (provider.active) plates.push(plate(t("state.active"), "active"));
  else if (provider.compatible && provider.authPresent) plates.push(plate(t("state.ready"), "ready"));
  if (!provider.compatible) plates.push(plate(t("state.disabled"), "danger"));
  else if (!provider.authPresent) plates.push(plate(t("state.noAuth"), "warn"));
  return plates;
}

function renderProviderRow(provider) {
  const row = document.createElement("tr");
  if (provider.active) row.classList.add("row-active");
  if (provider.source === "custom") row.classList.add("row-source-custom");

  const nameCell = document.createElement("td");
  const nameWrap = document.createElement("div");
  nameWrap.className = "cell-name";
  const nameLine = document.createElement("div");
  nameLine.style.display = "flex";
  nameLine.style.alignItems = "center";
  nameLine.style.gap = "4px";
  const name = document.createElement("strong");
  name.textContent = provider.name;
  nameLine.append(name);
  if (provider.source === "custom") {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "cell-delete";
    del.textContent = "✕";
    del.title = t("btn.delete");
    del.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteProvider(provider);
    });
    nameLine.append(del);
  }
  const source = document.createElement("span");
  source.className = "cell-source";
  source.textContent = provider.source;
  nameWrap.append(nameLine, source);

  if (provider.aliasCount > 0) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "cell-alias-toggle";
    toggle.textContent = t("alias.expand", provider.aliasCount);
    const list = document.createElement("ul");
    list.className = "cell-alias-list";
    list.hidden = true;
    for (const a of provider.aliases) {
      const li = document.createElement("li");
      li.textContent = t("alias.row", a.appTypeLabel, a.name, !a.authPresent);
      list.append(li);
    }
    toggle.addEventListener("click", () => {
      list.hidden = !list.hidden;
      toggle.textContent = list.hidden
        ? t("alias.expand", provider.aliasCount)
        : t("alias.collapse");
    });
    nameWrap.append(toggle, list);
  }
  nameCell.append(nameWrap);

  const appCell = document.createElement("td");
  const chip = document.createElement("span");
  chip.className = `cell-app-chip app-${(provider.appType || "unknown").toLowerCase()}`;
  chip.textContent = provider.appTypeLabel || (provider.appType || "?").toUpperCase();
  appCell.append(chip);

  const modelCell = document.createElement("td");
  modelCell.textContent = modelLabel(provider);

  const urlCell = document.createElement("td");
  const urlText = document.createElement("code");
  urlText.className = "cell-url-text";
  urlText.textContent = provider.baseUrl || "--";
  urlCell.append(urlText);
  if (provider.directProxyOnly) {
    const warn = document.createElement("div");
    warn.className = "proxy-warn";
    warn.textContent = t("warn.proxyOnly");
    warn.title = t("warn.proxyOnly.tip");
    urlCell.append(warn);
  }

  const stateCell = document.createElement("td");
  const wrap = document.createElement("div");
  wrap.className = "cell-state";
  for (const p of statePlatesFor(provider)) wrap.append(p);
  stateCell.append(wrap);

  const actionCell = document.createElement("td");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "use-btn" + (provider.active ? " is-active" : "");
  btn.textContent = provider.active ? t("action.inUse") : t("action.use");
  btn.disabled = provider.active || !provider.compatible;
  btn.addEventListener("click", () => switchProvider(provider));
  actionCell.append(btn);

  row.append(nameCell, appCell, modelCell, urlCell, stateCell, actionCell);
  return row;
}

function renderFoldedRow(provider) {
  const item = document.createElement("div");
  item.className = "fold-row";
  const title = document.createElement("strong");
  title.textContent = `${provider.appTypeLabel || "?"} · ${provider.name}`;
  const detail = document.createElement("div");
  detail.textContent = provider.notes || "";
  item.append(title, detail);
  return item;
}

function renderProviders(providers) {
  state.providers = providers;
  const compatible = providers.filter((p) => p.compatible);
  const incompatible = providers.filter((p) => !p.compatible);

  rowsEl.replaceChildren();
  if (!compatible.length) {
    const frag = emptyTemplate.content.cloneNode(true);
    const emptyCell = frag.querySelector(".empty");
    if (emptyCell) emptyCell.textContent = t("table.empty");
    rowsEl.append(frag);
  } else {
    for (const provider of compatible) rowsEl.append(renderProviderRow(provider));
  }

  unsupportedList.replaceChildren();
  for (const provider of incompatible) unsupportedList.append(renderFoldedRow(provider));
  unsupportedCount.textContent = `(${incompatible.length})`;
  unsupportedFold.style.display = incompatible.length ? "" : "none";

  const active = compatible.find((p) => p.active);
  activeEl.textContent = active ? `${active.name} (${active.kind || "?"})` : t("active.empty");
  summaryEl.textContent = t("summary", compatible.length, providers.length);
}

function renderClaudeStatus() {
  const data = state.claudeStatus;
  if (!data) {
    claudeConfigStatusEl.textContent = t("active.empty");
    claudeConfigPathEl.textContent = "--";
    return;
  }
  claudeConfigPathEl.textContent = data.configDir || "--";
  if (data.applied && (data.deploymentMode === "3p" || data.primaryDeploymentMode === "3p")) {
    claudeConfigStatusEl.textContent = t("claude.linked", data.gatewayBaseUrl || data.targetGatewayBaseUrl);
  } else {
    claudeConfigStatusEl.textContent = t("claude.notApplied");
  }
}

/* ============================================================
   network actions
   ============================================================ */
function setSummary(msg) { summaryEl.textContent = msg; }

async function loadProviders() {
  refreshButton.disabled = true;
  setSummary(t("status.scanning"));
  try {
    const response = await fetch("/api/providers");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "load failed");

    state.bridgeKey = data.bridgeApiKey || "";
    renderBridgeKey();
    gatewayUrlEl.textContent = window.location.origin;
    renderLocations(data.locations);
    renderProviders(data.providers);
    modelSourceSelect.value = data.settings?.modelSource || "";
    healthProbeToggle.checked = Boolean(data.settings?.healthProbeEnabled);
    await loadClaudeDesktopStatus();
  } catch (error) {
    setSummary(t("summaryError", error.message));
  } finally {
    refreshButton.disabled = false;
  }
}

async function loadClaudeDesktopStatus() {
  try {
    const response = await fetch("/api/claude-desktop/status");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "status failed");
    state.claudeStatus = data;
    renderClaudeStatus();
  } catch (error) {
    claudeConfigStatusEl.textContent = t("errorPrefix", error.message);
  }
}

async function configureClaudeDesktop() {
  configureClaudeButton.disabled = true;
  claudeConfigStatusEl.textContent = t("status.writing");
  try {
    const response = await fetch("/api/claude-desktop/apply", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "apply failed");
    claudeConfigStatusEl.textContent = data.backupDir
      ? t("claude.linkedBackup", data.backupDir)
      : t("claude.linkedRestart");
    await loadClaudeDesktopStatus();
  } catch (error) {
    claudeConfigStatusEl.textContent = t("errorPrefix", error.message);
  } finally {
    configureClaudeButton.disabled = false;
  }
}

async function restartClaudeDesktop() {
  restartClaudeButton.disabled = true;
  const prev = claudeConfigStatusEl.textContent;
  claudeConfigStatusEl.textContent = t("status.restarting");
  try {
    const response = await fetch("/api/claude-desktop/restart", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "restart failed");
    claudeConfigStatusEl.textContent = data.message || t("status.restartSent");
  } catch (error) {
    claudeConfigStatusEl.textContent = t("errorPrefix", error.message);
    if (prev) setTimeout(() => { /* keep error visible */ }, 0);
  } finally {
    restartClaudeButton.disabled = false;
  }
}

async function switchProvider(provider, options = {}) {
  setSummary(t("status.switching", provider.name));
  try {
    const response = await fetch("/api/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: provider.id, ...options })
    });
    const data = await response.json();
    if (response.status === 409 && data.needsConfirmation === "auth-missing") {
      askConfirm({
        title: t("confirm.noAuth.title"),
        body: t("confirm.noAuth.body", provider.name),
        confirmLabel: t("confirm.noAuth.btn"),
        onConfirm: () => switchProvider(provider, { ...options, confirmAuthMissing: true })
      });
      return;
    }
    if (response.status === 502 && data.needsConfirmation === "health-probe") {
      askConfirm({
        title: t("confirm.probe.title"),
        body: t("confirm.probe.body", provider.name, data.probe?.detail || "no detail"),
        confirmLabel: t("confirm.probe.btn"),
        onConfirm: () => switchProvider(provider, { ...options, confirmAuthMissing: true, skipHealthProbe: true })
      });
      return;
    }
    if (!response.ok) throw new Error(data.error || "switch failed");

    renderProviders(data.providers);
  } catch (error) {
    setSummary(t("errorPrefix", error.message));
  }
}

/* ============================================================
   modal
   ============================================================ */
function askConfirm({ title, body, confirmLabel, onConfirm }) {
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modalConfirm.textContent = confirmLabel || t("modal.ok");
  modalCancel.textContent = t("modal.cancel");
  modal.hidden = false;
  state.pendingConfirm = onConfirm;
}

function closeModal() {
  modal.hidden = true;
  state.pendingConfirm = null;
}

modalCancel.addEventListener("click", closeModal);
modalConfirm.addEventListener("click", () => {
  const fn = state.pendingConfirm;
  closeModal();
  if (fn) fn();
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

/* ============================================================
   bridge key actions
   ============================================================ */
bridgeKeyRevealBtn.addEventListener("click", () => {
  state.bridgeKeyRevealed = !state.bridgeKeyRevealed;
  renderBridgeKey();
});

bridgeKeyCopyBtn.addEventListener("click", async () => {
  if (!state.bridgeKey) return;
  try {
    await navigator.clipboard.writeText(state.bridgeKey);
    const original = bridgeKeyCopyBtn.textContent;
    bridgeKeyCopyBtn.textContent = t("btn.copied");
    setTimeout(() => { bridgeKeyCopyBtn.textContent = original; }, 1200);
  } catch {
    setSummary(t("status.clipboardFail"));
  }
});

/* ============================================================
   settings
   ============================================================ */
async function pushSettings(patch) {
  try {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "settings failed");
    setSummary(t("status.settingsOk"));
    renderProviders(data.providers);
  } catch (error) {
    setSummary(t("errorPrefix", error.message));
  }
}

modelSourceSelect.addEventListener("change", () => {
  pushSettings({ modelSource: modelSourceSelect.value || null });
});

healthProbeToggle.addEventListener("change", () => {
  pushSettings({ healthProbeEnabled: healthProbeToggle.checked });
});

/* ============================================================
   logs
   ============================================================ */
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-GB", { hour12: false });
}

function statusClass(status) {
  if (!status) return "warn";
  if (status >= 500) return "err";
  if (status >= 400) return "warn";
  return "ok";
}

function renderLogEntry(entry) {
  const row = document.createElement("div");
  row.className = "log-entry";

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = fmtTime(entry.ts);

  const status = document.createElement("span");
  status.className = `log-status ${statusClass(entry.status)}`;
  status.textContent = entry.status || "ERR";

  const model = document.createElement("span");
  model.className = "log-model";
  model.title = entry.error || entry.model || "";
  model.textContent = entry.model || entry.providerName || entry.error || "--";

  const latency = document.createElement("span");
  latency.className = "log-latency";
  latency.textContent = entry.latencyMs != null ? `${entry.latencyMs}ms` : "--";

  row.append(time, status, model, latency);
  return row;
}

async function pollLogs() {
  try {
    const response = await fetch(`/api/logs?since=${state.lastLogId}`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.entries?.length) {
      const emptyHint = logStrip.querySelector(".log-empty");
      if (emptyHint) emptyHint.remove();
      for (const entry of data.entries) {
        logStrip.prepend(renderLogEntry(entry));
        if (entry.id > state.lastLogId) state.lastLogId = entry.id;
      }
      while (logStrip.children.length > 60) logStrip.lastElementChild.remove();
    }
  } catch {
    /* silent */
  }
}

/* ============================================================
   language switcher
   ============================================================ */
function setLang(next) {
  if (next === lang || !(next in I18N)) return;
  lang = next;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyStaticI18n();
  renderBridgeKey();
  renderClaudeStatus();
  renderProviders(state.providers);
}

for (const btn of document.querySelectorAll(".lang-btn")) {
  btn.addEventListener("click", () => setLang(btn.dataset.lang));
}

/* ============================================================
   boot
   ============================================================ */
/* ============================================================
   setup status chips
   ============================================================ */
function setChip(name, status, detail) {
  const chip = chips[name];
  if (!chip) return;
  chip.dataset.state = status;
  const detailEl = chip.querySelector("[data-chk-detail]");
  if (detailEl) detailEl.textContent = detail || "";
}

const AUTO_BANNER_DISMISS_KEY = "ccs-auto-banner-dismissed-at";

function renderAutoBanner(data) {
  const auto = data?.autoConfig;
  const ts = auto?.installedAt || 0;
  if (!ts) { autoBanner.hidden = true; return; }
  const dismissed = Number(localStorage.getItem(AUTO_BANNER_DISMISS_KEY) || 0);
  if (dismissed >= ts) { autoBanner.hidden = true; return; }
  const ageMs = Date.now() - ts;
  if (ageMs > 1000 * 60 * 60) { autoBanner.hidden = true; return; }

  const key = auto.reason === "key-mismatch" ? "autoConfig.keyMismatch"
    : auto.reason === "deployment-mode" ? "autoConfig.deploymentMode"
    : "autoConfig.firstTime";
  autoBannerText.textContent = t(key);
  autoBanner.hidden = false;
}

function renderSetupStatus(data) {
  if (!data) return;
  renderAutoBanner(data);
  const gw = data.gateway;
  setChip("gateway", "ok", gw?.url || "");

  const cfg = data.config;
  if (!cfg?.applied) setChip("config", "warn", t("chk.detail.notWritten"));
  else if (!cfg.keyMatches) setChip("config", "err", t("chk.detail.keyMismatch"));
  else setChip("config", "ok", t("chk.detail.applied"));

  setChip("claude", data.claude?.running ? "ok" : "err",
    data.claude?.running ? t("chk.detail.up") : t("chk.detail.notRunning"));

  if (data.active) setChip("active", "ok", `${data.active.name} (${data.active.kind})`);
  else setChip("active", "warn", t("chk.detail.noActive"));
}

async function pollSetupStatus() {
  try {
    const response = await fetch("/api/setup/status");
    if (!response.ok) return;
    const data = await response.json();
    renderSetupStatus(data);
  } catch {
    /* silent */
  }
}

async function runSetup() {
  setupButton.disabled = true;
  const originalLabel = setupButton.textContent;
  setupButton.textContent = t("btn.setupRunning");
  setupHint.textContent = t("setup.running");
  for (const name of ["config", "claude", "active"]) setChip(name, "busy", "");
  try {
    const response = await fetch("/api/setup", { method: "POST" });
    const data = await response.json();
    if (data.status) renderSetupStatus(data.status);
    if (data.ok) {
      setupHint.textContent = t("setup.done");
    } else {
      const failed = (data.steps || []).find((s) => !s.ok);
      const msg = failed ? `${t(`setup.step.${failed.name}`) || failed.name}: ${failed.detail}` : "unknown";
      setupHint.textContent = t("setup.fail", msg);
    }
  } catch (error) {
    setupHint.textContent = t("setup.fail", error.message);
  } finally {
    setupButton.disabled = false;
    setupButton.textContent = originalLabel;
  }
}

setupButton.addEventListener("click", runSetup);

/* ============================================================
   custom provider modal
   ============================================================ */
let providerEditingId = null;

function openProviderModal(existing) {
  providerEditingId = existing?.id || null;
  providerForm.reset();
  providerModalTitle.textContent = existing ? `${t("provider.title")} — ${existing.name}` : t("provider.title");
  apiKeyHint.textContent = existing ? t("provider.apiKeyKeep") : "";
  providerFormError.hidden = true;
  if (existing) {
    providerForm.name.value = existing.name || "";
    providerForm.kind.value = existing.kind || "anthropic";
    providerForm.baseUrl.value = existing.baseUrl || "";
    providerForm.models.value = (existing.models || []).join("\n");
  }
  providerModal.hidden = false;
  setTimeout(() => providerForm.name.focus(), 0);
}

function closeProviderModal() {
  providerModal.hidden = true;
  providerEditingId = null;
  providerForm.reset();
}

providerCancel.addEventListener("click", closeProviderModal);
providerModal.addEventListener("click", (event) => {
  if (event.target === providerModal) closeProviderModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !providerModal.hidden) closeProviderModal();
});

addProviderButton.addEventListener("click", () => openProviderModal());

providerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  providerFormError.hidden = true;

  const formData = new FormData(providerForm);
  const models = String(formData.get("models") || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const payload = {
    name: formData.get("name"),
    kind: formData.get("kind"),
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
    models
  };

  const url = providerEditingId
    ? `/api/providers/custom?id=${encodeURIComponent(providerEditingId)}`
    : "/api/providers/custom";
  const method = providerEditingId ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "request failed");
    closeProviderModal();
    await loadProviders();
  } catch (error) {
    providerFormError.textContent = error.message;
    providerFormError.hidden = false;
  }
});

async function deleteProvider(provider) {
  askConfirm({
    title: t("provider.deleteBtn"),
    body: t("provider.deleteConfirm", provider.name),
    confirmLabel: t("provider.deleteBtn"),
    onConfirm: async () => {
      try {
        const response = await fetch(
          `/api/providers/custom?id=${encodeURIComponent(provider.id)}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "delete failed");
        }
        await loadProviders();
      } catch (error) {
        setSummary(t("errorPrefix", error.message));
      }
    }
  });
}

autoBannerRestart.addEventListener("click", () => {
  autoBanner.hidden = true;
  restartClaudeDesktop();
});

autoBannerDismiss.addEventListener("click", () => {
  localStorage.setItem(AUTO_BANNER_DISMISS_KEY, String(Date.now()));
  autoBanner.hidden = true;
});

refreshButton.addEventListener("click", loadProviders);
configureClaudeButton.addEventListener("click", configureClaudeDesktop);
restartClaudeButton.addEventListener("click", restartClaudeDesktop);

applyStaticI18n();
loadProviders();
pollSetupStatus();
setInterval(pollLogs, 2200);
setInterval(pollSetupStatus, 5000);
