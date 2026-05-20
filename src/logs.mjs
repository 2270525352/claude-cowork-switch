const MAX_ENTRIES = 200;
const buffer = [];
let counter = 0;

export function recordLogEntry(entry) {
  const ts = Date.now();
  const next = {
    id: ++counter,
    ts,
    method: entry.method || "POST",
    path: entry.path || "/v1/messages",
    model: entry.model || null,
    providerId: entry.providerId || null,
    providerName: entry.providerName || null,
    kind: entry.kind || null,
    status: entry.status ?? null,
    latencyMs: entry.latencyMs ?? null,
    bytesIn: entry.bytesIn ?? null,
    bytesOut: entry.bytesOut ?? null,
    stream: Boolean(entry.stream),
    error: entry.error || null
  };
  buffer.push(next);
  while (buffer.length > MAX_ENTRIES) buffer.shift();
  return next;
}

export function getLogEntries(sinceId = 0) {
  if (!sinceId) return buffer.slice();
  return buffer.filter((entry) => entry.id > sinceId);
}

export function clearLogEntries() {
  buffer.length = 0;
}
