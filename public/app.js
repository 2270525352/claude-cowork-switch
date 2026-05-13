const rowsEl = document.querySelector("#providerRows");
const locationsEl = document.querySelector("#locations");
const summaryEl = document.querySelector("#providerSummary");
const activeEl = document.querySelector("#activeProvider");
const gatewayUrlEl = document.querySelector("#gatewayUrl");
const bridgeKeyEl = document.querySelector("#bridgeKey");
const refreshButton = document.querySelector("#refreshButton");
const configureClaudeButton = document.querySelector("#configureClaudeButton");
const restartClaudeButton = document.querySelector("#restartClaudeButton");
const claudeConfigStatusEl = document.querySelector("#claudeConfigStatus");
const claudeConfigPathEl = document.querySelector("#claudeConfigPath");
const emptyTemplate = document.querySelector("#emptyTemplate");

function text(value) {
  return value || "未设置";
}

function modelText(provider) {
  const models = Array.isArray(provider.models) ? provider.models.filter(Boolean) : [];
  if (models.length > 1) return `${models[0]} 等 ${models.length} 个`;
  return text(provider.model || models[0]);
}

function badge(label, className = "") {
  const span = document.createElement("span");
  span.className = `badge ${className}`.trim();
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

function statusBadge(provider) {
  if (!provider.compatible) return badge("不支持", "danger");
  if (!provider.authPresent) return badge("未检测到密钥", "warn");
  if (provider.active) return badge("当前使用", "current");
  if (provider.isCcSwitchCurrent) return badge("cc-switch 当前", "current");
  return badge("可用");
}

function renderRows(providers) {
  rowsEl.replaceChildren();
  if (!providers.length) {
    rowsEl.append(emptyTemplate.content.cloneNode(true));
    return;
  }

  for (const provider of providers) {
    const row = document.createElement("tr");
    if (provider.active) row.classList.add("active-row");

    const nameCell = document.createElement("td");
    const nameWrap = document.createElement("div");
    nameWrap.className = "provider-name";
    const name = document.createElement("strong");
    name.textContent = provider.name;
    const source = document.createElement("span");
    source.className = "source";
    source.textContent = provider.source;
    nameWrap.append(name, source);
    nameCell.append(nameWrap);

    const appCell = document.createElement("td");
    appCell.textContent = provider.appType || "unknown";

    const kindCell = document.createElement("td");
    kindCell.append(badge(provider.kind));

    const modelCell = document.createElement("td");
    modelCell.textContent = modelText(provider);

    const baseCell = document.createElement("td");
    const baseCode = document.createElement("code");
    baseCode.textContent = text(provider.baseUrl);
    baseCell.append(baseCode);

    const statusCell = document.createElement("td");
    statusCell.append(statusBadge(provider));

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = provider.active ? "使用中" : "使用";
    button.disabled = provider.active || !provider.compatible;
    if (!provider.active && provider.compatible) button.className = "primary";
    button.addEventListener("click", () => useProvider(provider.id));
    actionCell.append(button);

    row.append(nameCell, appCell, kindCell, modelCell, baseCell, statusCell, actionCell);
    rowsEl.append(row);
  }
}

async function loadProviders() {
  refreshButton.disabled = true;
  configureClaudeButton.disabled = true;
  restartClaudeButton.disabled = true;
  try {
    const response = await fetch("/api/providers");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "加载渠道失败");

    gatewayUrlEl.textContent = window.location.origin;
    bridgeKeyEl.textContent = data.bridgeApiKey;
    renderLocations(data.locations);
    renderRows(data.providers);

    const active = data.providers.find((provider) => provider.active);
    activeEl.textContent = active ? `${active.name} (${active.kind})` : "没有可用渠道";
    const compatibleCount = data.providers.filter((provider) => provider.compatible).length;
    summaryEl.textContent = `检测到 ${data.providers.length} 个渠道，${compatibleCount} 个可用`;
    await loadClaudeDesktopStatus();
  } catch (error) {
    summaryEl.textContent = `加载失败：${error.message}`;
  } finally {
    refreshButton.disabled = false;
    configureClaudeButton.disabled = false;
    restartClaudeButton.disabled = false;
  }
}

async function loadClaudeDesktopStatus() {
  const response = await fetch("/api/claude-desktop/status");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "读取 Claude Desktop 配置失败");

  claudeConfigPathEl.textContent = data.configDir;
  if (data.applied && (data.deploymentMode === "3p" || data.primaryDeploymentMode === "3p")) {
    claudeConfigStatusEl.textContent = `已配置到 ${data.gatewayBaseUrl || data.targetGatewayBaseUrl}`;
    return data;
  }

  claudeConfigStatusEl.textContent = "未配置，点击一键配置后重启 Claude";
  return data;
}

async function configureClaudeDesktop() {
  configureClaudeButton.disabled = true;
  claudeConfigStatusEl.textContent = "正在写入 Claude Desktop 配置...";
  try {
    const response = await fetch("/api/claude-desktop/apply", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "配置失败");
    claudeConfigStatusEl.textContent = data.backupDir
      ? `已配置，已备份到 ${data.backupDir}`
      : "已配置，请重启 Claude";
    await loadClaudeDesktopStatus();
  } catch (error) {
    claudeConfigStatusEl.textContent = `配置失败：${error.message}`;
  } finally {
    configureClaudeButton.disabled = false;
  }
}

async function restartClaudeDesktop() {
  restartClaudeButton.disabled = true;
  claudeConfigStatusEl.textContent = "正在重启 Claude Desktop...";
  try {
    const response = await fetch("/api/claude-desktop/restart", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "重启失败");
    claudeConfigStatusEl.textContent = data.message || "已重启 Claude Desktop";
  } catch (error) {
    claudeConfigStatusEl.textContent = `重启失败：${error.message}`;
  } finally {
    restartClaudeButton.disabled = false;
  }
}

async function useProvider(id) {
  const response = await fetch("/api/active", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await response.json();
  if (!response.ok) {
    summaryEl.textContent = data.error || "切换失败";
    return;
  }
  renderRows(data.providers);
  const active = data.providers.find((provider) => provider.active);
  activeEl.textContent = active ? `${active.name} (${active.kind})` : "没有可用渠道";
}

refreshButton.addEventListener("click", loadProviders);
configureClaudeButton.addEventListener("click", configureClaudeDesktop);
restartClaudeButton.addEventListener("click", restartClaudeDesktop);
loadProviders();
