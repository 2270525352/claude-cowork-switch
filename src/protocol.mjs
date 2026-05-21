import { randomUUID } from "node:crypto";

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, authorization, x-api-key, anthropic-version, anthropic-beta",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS"
  });
  res.end(JSON.stringify(data));
}

export function sendAnthropicError(res, status, message, type = "api_error") {
  sendJson(res, status, {
    type: "error",
    error: { type, message }
  });
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function normalizeContent(content) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (Array.isArray(content)) return content;
  return [];
}

function systemToText(system) {
  if (!system) return "";
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system
      .filter((block) => block?.type === "text")
      .map((block) => block.text || "")
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

function blockToOpenAiContent(block) {
  if (block.type === "text") return { type: "text", text: block.text || "" };
  if (block.type === "image" && block.source?.type === "base64") {
    const mediaType = block.source.media_type || "image/png";
    return {
      type: "image_url",
      image_url: { url: `data:${mediaType};base64,${block.source.data || ""}` }
    };
  }
  return null;
}

function toolResultToText(block) {
  const content = block.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return part.text || "";
      return JSON.stringify(part);
    })
    .filter(Boolean)
    .join("\n");
}

function asOpenAiMessageContent(parts) {
  if (parts.length === 0) return "";
  if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
  return parts;
}

function convertMessages(body) {
  const messages = [];
  const system = systemToText(body.system);
  if (system) messages.push({ role: "system", content: system });

  for (const message of body.messages || []) {
    const blocks = normalizeContent(message.content);

    if (message.role === "assistant") {
      const text = [];
      const toolCalls = [];
      for (const block of blocks) {
        if (block.type === "text" && block.text) text.push(block.text);
        if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id || randomUUID(),
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input || {})
            }
          });
        }
      }
      messages.push({
        role: "assistant",
        content: text.join("\n\n") || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {})
      });
      continue;
    }

    const pendingUserParts = [];
    const flushUser = () => {
      if (!pendingUserParts.length) return;
      messages.push({
        role: "user",
        content: asOpenAiMessageContent(pendingUserParts.splice(0))
      });
    };

    for (const block of blocks) {
      if (block.type === "tool_result") {
        flushUser();
        messages.push({
          role: "tool",
          tool_call_id: block.tool_use_id,
          content: toolResultToText(block)
        });
        continue;
      }
      const converted = blockToOpenAiContent(block);
      if (converted) pendingUserParts.push(converted);
    }

    flushUser();
  }

  return messages;
}

function convertTools(tools = []) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.input_schema || { type: "object", properties: {} }
    }
  }));
}

function convertToolChoice(toolChoice) {
  if (!toolChoice) return undefined;
  if (toolChoice.type === "auto") return "auto";
  if (toolChoice.type === "any") return "required";
  if (toolChoice.type === "none") return "none";
  if (toolChoice.type === "tool") {
    return { type: "function", function: { name: toolChoice.name } };
  }
  return undefined;
}

function modelName(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") return modelName(value.name || value.id || value.model);
  return null;
}

function stripModelSuffix(model) {
  return typeof model === "string" ? model.replace(/\[[^\]]+\]$/g, "") : "";
}

function modelVariants(value) {
  const name = modelName(value);
  if (!name) return [];

  const variants = [name];
  const base = stripModelSuffix(name);
  if (base && base !== name) variants.push(base);
  if (value && typeof value === "object" && value.supports1m) variants.push(`${base || name}[1m]`);
  return variants;
}

function providerModelNames(provider) {
  const seen = new Set();
  const models = [];

  for (const value of [provider?.model, ...(Array.isArray(provider?.models) ? provider.models : [])]) {
    for (const name of modelVariants(value)) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      models.push(name);
    }
  }

  return models;
}

function resolveRequestModel(body, provider) {
  const requested = modelName(body?.model);
  const models = providerModelNames(provider);
  if (requested && (!models.length || models.includes(requested))) return requested;
  if (requested) {
    const requestedBase = stripModelSuffix(requested);
    if (models.some((model) => stripModelSuffix(model) === requestedBase)) return requested;
  }
  return provider?.model || models[0] || requested || provider?.name || "claude-cowork-switch";
}

function isClaudeLikeModel(model) {
  const value = stripModelSuffix(model).toLowerCase();
  return /^claude-/.test(value) || /^(sonnet|opus|haiku)(?:[-_.\d]|$)/.test(value);
}

function shouldUseClaudeCodeCompat(provider) {
  const mode = (process.env.CLAUDE_CODE_COMPAT || "auto").toLowerCase();
  if (["1", "true", "on", "yes"].includes(mode)) return true;
  if (["0", "false", "off", "no"].includes(mode)) return false;
  return provider?.source === "cc-switch.db"
    && provider?.appType === "claude"
    && providerModelNames(provider).some(isClaudeLikeModel);
}

function mergeCommaHeaders(...values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    if (!value || typeof value !== "string") continue;
    for (const item of value.split(",")) {
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      output.push(trimmed);
    }
  }
  return output.join(",");
}

function withClaudeCodeSystem(system) {
  const marker = "You are Claude Code, Anthropic's official CLI for Claude.";
  if (!system) return marker;
  if (typeof system === "string") {
    return system.includes(marker) ? system : `${marker}\n\n${system}`;
  }
  if (Array.isArray(system)) {
    const text = systemToText(system);
    return text.includes(marker) ? text : `${marker}\n\n${text}`;
  }
  return marker;
}

function sanitizeCacheControl(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeCacheControl(item));

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "cache_control" && item && typeof item === "object") {
      output[key] = { type: item.type || "ephemeral" };
      continue;
    }
    output[key] = sanitizeCacheControl(item);
  }
  return output;
}

function convertOpenAiRequest(body, provider, stream) {
  const tools = convertTools(body.tools || []);
  const toolChoice = convertToolChoice(body.tool_choice);
  return {
    model: resolveRequestModel(body, provider),
    messages: convertMessages(body),
    max_tokens: body.max_tokens,
    temperature: body.temperature,
    top_p: body.top_p,
    stop: body.stop_sequences,
    stream,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
    ...(tools.length ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {})
  };
}

function parseJsonSafe(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return { _raw: value };
  }
}

function mapFinishReason(reason, hasTools) {
  if (hasTools) return "tool_use";
  if (reason === "length") return "max_tokens";
  if (reason === "stop") return "end_turn";
  if (reason === "tool_calls") return "tool_use";
  return "end_turn";
}

function convertOpenAiResponse(upstream, provider, selectedModel) {
  const choice = upstream.choices?.[0] || {};
  const message = choice.message || {};
  const content = [];

  if (message.content) {
    content.push({ type: "text", text: message.content });
  }

  for (const call of message.tool_calls || []) {
    content.push({
      type: "tool_use",
      id: call.id || randomUUID(),
      name: call.function?.name || "unknown_tool",
      input: parseJsonSafe(call.function?.arguments || "{}")
    });
  }

  return {
    id: upstream.id || `msg_${randomUUID()}`,
    type: "message",
    role: "assistant",
    model: upstream.model || selectedModel || provider.model || provider.name,
    content,
    stop_reason: mapFinishReason(choice.finish_reason, Boolean(message.tool_calls?.length)),
    stop_sequence: null,
    usage: {
      input_tokens: upstream.usage?.prompt_tokens || 0,
      output_tokens: upstream.usage?.completion_tokens || 0
    }
  };
}

function chatCompletionsUrl(provider) {
  const base = provider.baseUrl.endsWith("/") ? provider.baseUrl : `${provider.baseUrl}/`;
  if (base.endsWith("/chat/completions/")) return provider.baseUrl;
  return new URL("chat/completions", base).toString();
}

function openAiHeaders(provider) {
  return {
    "content-type": "application/json",
    ...(provider.secret?.openAiKey ? { authorization: `Bearer ${provider.secret.openAiKey}` } : {}),
    ...(provider.secret?.extraHeaders || {})
  };
}

async function handleOpenAiNonStream(res, body, provider) {
  const selectedModel = resolveRequestModel(body, provider);
  const upstreamResponse = await fetch(chatCompletionsUrl(provider), {
    method: "POST",
    headers: openAiHeaders(provider),
    body: JSON.stringify({ ...convertOpenAiRequest(body, provider, false), model: selectedModel })
  });

  const text = await upstreamResponse.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!upstreamResponse.ok) {
    sendAnthropicError(res, upstreamResponse.status, data.error?.message || text || "Upstream request failed");
    return;
  }

  sendJson(res, 200, convertOpenAiResponse(data, provider, selectedModel));
}

function sseHeaders(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "access-control-allow-origin": "*"
  });
}

function writeEvent(res, event) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function extractSseEvents(buffer) {
  const events = [];
  let boundary;
  while ((boundary = buffer.indexOf("\n\n")) !== -1) {
    const raw = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary + 2);
    const dataLines = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());
    if (dataLines.length) events.push(dataLines.join("\n"));
  }
  return { events, buffer };
}

async function handleOpenAiStream(res, body, provider) {
  const selectedModel = resolveRequestModel(body, provider);
  const upstreamResponse = await fetch(chatCompletionsUrl(provider), {
    method: "POST",
    headers: openAiHeaders(provider),
    body: JSON.stringify({ ...convertOpenAiRequest(body, provider, true), model: selectedModel })
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    const text = await upstreamResponse.text();
    sendAnthropicError(res, upstreamResponse.status, text || "Upstream stream failed");
    return;
  }

  sseHeaders(res);
  writeEvent(res, {
    type: "message_start",
    message: {
      id: `msg_${randomUUID()}`,
      type: "message",
      role: "assistant",
      model: selectedModel || provider.model || provider.name,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    }
  });

  const decoder = new TextDecoder();
  let buffer = "";
  let textBlockIndex = null;
  let nextIndex = 0;
  let finishReason = "stop";
  let usage = { input_tokens: 0, output_tokens: 0 };
  const toolBlocks = new Map();

  const startTextBlock = () => {
    if (textBlockIndex !== null) return textBlockIndex;
    textBlockIndex = nextIndex++;
    writeEvent(res, {
      type: "content_block_start",
      index: textBlockIndex,
      content_block: { type: "text", text: "" }
    });
    return textBlockIndex;
  };

  const ensureToolBlock = (toolIndex, delta) => {
    let state = toolBlocks.get(toolIndex);
    if (!state) {
      state = {
        index: nextIndex++,
        id: delta.id || `toolu_${randomUUID()}`,
        name: delta.function?.name || "unknown_tool",
        pendingArgs: "",
        open: false
      };
      toolBlocks.set(toolIndex, state);
    }
    if (delta.id) state.id = delta.id;
    if (delta.function?.name) state.name = delta.function.name;
    if (!state.open && state.name) {
      state.open = true;
      writeEvent(res, {
        type: "content_block_start",
        index: state.index,
        content_block: { type: "tool_use", id: state.id, name: state.name, input: {} }
      });
      if (state.pendingArgs) {
        writeEvent(res, {
          type: "content_block_delta",
          index: state.index,
          delta: { type: "input_json_delta", partial_json: state.pendingArgs }
        });
        state.pendingArgs = "";
      }
    }
    return state;
  };

  for await (const chunk of upstreamResponse.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const extracted = extractSseEvents(buffer);
    buffer = extracted.buffer;

    for (const payload of extracted.events) {
      if (payload === "[DONE]") continue;
      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }

      if (data.usage) {
        usage = {
          input_tokens: data.usage.prompt_tokens || 0,
          output_tokens: data.usage.completion_tokens || 0
        };
      }

      const choice = data.choices?.[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta || {};
      if (delta.content) {
        const index = startTextBlock();
        writeEvent(res, {
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: delta.content }
        });
      }

      for (const toolDelta of delta.tool_calls || []) {
        const state = ensureToolBlock(toolDelta.index || 0, toolDelta);
        const args = toolDelta.function?.arguments || "";
        if (!args) continue;
        if (!state.open) {
          state.pendingArgs += args;
          continue;
        }
        writeEvent(res, {
          type: "content_block_delta",
          index: state.index,
          delta: { type: "input_json_delta", partial_json: args }
        });
      }
    }
  }

  if (textBlockIndex !== null) {
    writeEvent(res, { type: "content_block_stop", index: textBlockIndex });
  }
  for (const state of toolBlocks.values()) {
    if (state.open) writeEvent(res, { type: "content_block_stop", index: state.index });
  }

  writeEvent(res, {
    type: "message_delta",
    delta: {
      stop_reason: mapFinishReason(finishReason, toolBlocks.size > 0),
      stop_sequence: null
    },
    usage
  });
  writeEvent(res, { type: "message_stop" });
  res.end();
}

function anthropicMessagesUrl(provider) {
  const base = new URL(provider.baseUrl);
  const pathname = base.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/v1/messages")) return base.toString();
  base.pathname = pathname.endsWith("/v1") ? `${pathname}/messages` : `${pathname}/v1/messages`;
  return base.toString();
}

function anthropicHeaders(req, provider, codeCompat = false) {
  const key = provider.secret?.anthropicKey || "";
  const beta = codeCompat
    ? mergeCommaHeaders(req.headers["anthropic-beta"], "claude-code-20250219", "oauth-2025-04-20")
    : req.headers["anthropic-beta"];

  return {
    "content-type": "application/json",
    "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
    ...(beta ? { "anthropic-beta": beta } : {}),
    ...(codeCompat ? { "user-agent": "claude-cli/2.1.138 (external, cli)", "x-app": "cli" } : {}),
    ...(key ? { "x-api-key": key, authorization: `Bearer ${key}` } : {})
  };
}

async function handleAnthropicProxy(req, res, body, provider) {
  const selectedModel = resolveRequestModel(body, provider);
  const codeCompat = shouldUseClaudeCodeCompat(provider);
  const upstreamModel = codeCompat ? stripModelSuffix(selectedModel) : selectedModel;
  let upstreamBody = {
    ...body,
    ...(upstreamModel ? { model: upstreamModel } : {}),
    ...(codeCompat ? { stream: false, system: withClaudeCodeSystem(body.system) } : {})
  };
  upstreamBody = sanitizeCacheControl(upstreamBody);

  const upstreamResponse = await fetch(anthropicMessagesUrl(provider), {
    method: "POST",
    headers: anthropicHeaders(req, provider, codeCompat),
    body: JSON.stringify(upstreamBody)
  });

  if (body.stream && codeCompat && upstreamResponse.ok) {
    await sendAnthropicResponseAsStream(res, upstreamResponse, upstreamModel || selectedModel);
    return;
  }

  res.writeHead(upstreamResponse.status, {
    "content-type": upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8",
    "cache-control": upstreamResponse.headers.get("cache-control") || "no-cache",
    "access-control-allow-origin": "*"
  });

  if (upstreamResponse.body) {
    for await (const chunk of upstreamResponse.body) res.write(chunk);
  }
  res.end();
}

async function sendAnthropicResponseAsStream(res, upstreamResponse, selectedModel) {
  const data = await upstreamResponse.json();
  sseHeaders(res);

  writeEvent(res, {
    type: "message_start",
    message: {
      id: data.id || `msg_${randomUUID()}`,
      type: "message",
      role: "assistant",
      model: data.model || selectedModel,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: 0
      }
    }
  });

  for (const [index, block] of (data.content || []).entries()) {
    if (block.type === "text") {
      writeEvent(res, {
        type: "content_block_start",
        index,
        content_block: { type: "text", text: "" }
      });
      if (block.text) {
        writeEvent(res, {
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: block.text }
        });
      }
      writeEvent(res, { type: "content_block_stop", index });
      continue;
    }

    if (block.type === "tool_use" || block.type === "server_tool_use") {
      writeEvent(res, {
        type: "content_block_start",
        index,
        content_block: { type: block.type, id: block.id, name: block.name, input: {} }
      });
      writeEvent(res, {
        type: "content_block_delta",
        index,
        delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input || {}) }
      });
      writeEvent(res, { type: "content_block_stop", index });
      continue;
    }

    if (block.type === "thinking") {
      writeEvent(res, {
        type: "content_block_start",
        index,
        content_block: { type: "thinking", thinking: "" }
      });
      if (block.thinking) {
        writeEvent(res, {
          type: "content_block_delta",
          index,
          delta: { type: "thinking_delta", thinking: block.thinking }
        });
      }
      if (block.signature) {
        writeEvent(res, {
          type: "content_block_delta",
          index,
          delta: { type: "signature_delta", signature: block.signature }
        });
      }
      writeEvent(res, { type: "content_block_stop", index });
      continue;
    }

    // Fallback for result-style and any other server-side block types:
    // web_search_tool_result, web_fetch_tool_use/_result, code_execution_tool_use/_result,
    // mcp_tool_use/_result, redacted_thinking, container_upload, etc.
    // The block isn't generated incrementally upstream — we have the whole thing,
    // so emit it as the content_block_start initial state and close immediately.
    writeEvent(res, {
      type: "content_block_start",
      index,
      content_block: block
    });
    writeEvent(res, { type: "content_block_stop", index });
  }

  writeEvent(res, {
    type: "message_delta",
    delta: {
      stop_reason: data.stop_reason || "end_turn",
      stop_sequence: data.stop_sequence || null
    },
    usage: {
      output_tokens: data.usage?.output_tokens || 0
    }
  });
  writeEvent(res, { type: "message_stop" });
  res.end();
}

export async function handleMessageRequest(req, res, body, provider) {
  if (!provider?.compatible) {
    sendAnthropicError(res, 400, "No compatible active provider is selected.", "invalid_request_error");
    return;
  }

  if (provider.kind === "anthropic") {
    await handleAnthropicProxy(req, res, body, provider);
    return;
  }

  if (provider.kind === "openai") {
    if (body.stream) await handleOpenAiStream(res, body, provider);
    else await handleOpenAiNonStream(res, body, provider);
    return;
  }

  sendAnthropicError(res, 400, `Unsupported provider kind: ${provider.kind}`, "invalid_request_error");
}

export function sendModelList(res, provider) {
  const models = providerModelNames(provider);
  if (!models.length) models.push(provider?.name || "claude-cowork-switch");

  sendJson(res, 200, {
    data: models.map((model, index) => ({
        id: model,
        type: "model",
        display_name: index === 0
          ? `${provider?.name || "Active Provider"} (${provider?.kind || "unknown"})`
          : model,
        created_at: "2026-05-13T00:00:00Z"
      })),
    has_more: false
  });
}

export { sendJson };
