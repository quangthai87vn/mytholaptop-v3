/**
 * AI Provider Connection Tester — v2
 *
 * Protocol detection rules:
 * 1. If base_url ends with /v1 → OpenAI-compatible (/chat/completions, /models)
 * 2. If base_url ends with /api → Ollama native (/api/chat, /api/tags)
 * 3. If base_url is just host:port (no path) → Ollama native (/api/chat, /api/tags)
 * 4. Ollama type → native by default unless base_url has /v1
 * 5. Gemini → its own API
 *
 * Docker-aware: if baseUrl has 127.0.0.1 and connection fails,
 * suggest host.docker.internal
 */

export interface ConnectionTestResult {
  success: boolean;
  duration_ms: number;
  /** Human-readable message shown in UI */
  message: string;
  model?: string;
  provider?: string;
  available_models?: string[];
  debug?: {
    final_url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
    response_status: number;
    response_body_preview: string;
  };
}

// ─── Protocol detection ──────────────────────────────────────────────────────

export type Protocol = "openai_compatible" | "ollama_native" | "gemini";

/**
 * Detect protocol from base_url and provider type.
 * Priority: base_url path > provider type > defaults
 */
function detectProtocol(baseUrl: string, providerType: string): Protocol {
  const path = baseUrl.replace(/^https?:\/\/[^/]+/, "");

  // Explicit /v1 path → OpenAI-compatible
  if (path.includes("/v1")) return "openai_compatible";
  // Explicit /api path (and not /api/v1) → Ollama native
  if (path.match(/^\/api($|\/)/) && !path.includes("/v1")) return "ollama_native";
  // /chat/completions in path → OpenAI-compatible
  if (path.includes("/chat/completions")) return "openai_compatible";

  // Provider-type overrides
  switch (providerType) {
    case "gemini":
      return "gemini";
    case "ollama":
      // Default: Ollama native (no /v1 in base_url)
      return "ollama_native";
    case "openai":
    case "deepseek":
    case "openrouter":
    case "groq":
    case "lmstudio":
    case "openai-compatible":
      return "openai_compatible";
    default:
      // Unknown provider type → OpenAI-compatible as fallback
      return "openai_compatible";
  }
}

/** Build final URL from base + path (no double slashes) */
function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

const PROBE_MESSAGE = "OK";
const DEFAULT_TIMEOUT_MS = 120000; // 2 min for local models

async function httpRequest(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<{ res: Response; text: string }> {
  const { timeout = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(timer);
  }
}

function log(label: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") return;
  // Sanitize before logging
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "Authorization" || k === "api_key") {
      sanitized[k] = "Bearer [REDACTED]";
    } else if (k === "body") {
      const body = typeof v === "string" ? JSON.parse(v) : v;
      if (body?.api_key) body.api_key = "[REDACTED]";
      sanitized[k] = body;
    } else {
      sanitized[k] = v;
    }
  }
  console.log(`[ConnectionTester] ${label}`, JSON.stringify(sanitized, null, 2));
}

// ─── Response parsers ────────────────────────────────────────────────────────

interface ParsedResponse {
  content: string;
  model: string;
  usage?: number;
  raw: Record<string, unknown>;
}

/**
 * Parse OpenAI-compatible response.
 * Handles: choices[0].message.content, choices[0].text, choices[0].delta.content
 */
function parseOpenAIResponse(rawText: string): ParsedResponse {
  const data = JSON.parse(rawText) as Record<string, unknown>;

  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const first = choices?.[0];

  // Try multiple content paths
  const message = first?.message as Record<string, unknown> | undefined;
  const content =
    (message?.content as string) ||
    (first?.text as string) ||           // Some routers use .text
    ((first?.delta as Record<string, unknown>)?.content as string) || // streaming delta
    "";

  const usage = (data.usage as Record<string, unknown>)?.total_tokens as number | undefined;
  const model = (data.model as string) || "unknown";

  return { content, model, usage, raw: data };
}

/**
 * Parse Ollama native response.
 * Handles: message.content, response (legacy)
 */
function parseOllamaResponse(rawText: string): ParsedResponse {
  const data = JSON.parse(rawText) as Record<string, unknown>;

  const content =
    (data.message as Record<string, unknown>)?.content as string ||
    (data.response as string) ||
    "";

  const usage = ((data.prompt_eval_count as number) || 0) + ((data.eval_count as number) || 0);
  const model = (data.model as string) || "unknown";

  return { content, model, usage, raw: data };
}

/**
 * Parse Gemini response.
 */
function parseGeminiResponse(rawText: string): ParsedResponse {
  const data = JSON.parse(rawText) as Record<string, unknown>;

  // Gemini response: { candidates: [{ content: { parts: [{ text: "..." }], role: "model" }] } }
  const candidate = (data.candidates as Array<Record<string, unknown>>)?.[0];
  const content = candidate?.content as Record<string, unknown> | undefined;
  const parts = content?.parts as Array<Record<string, unknown>> | undefined;
  const text = parts?.[0]?.text as string || "";

  const usage = (data.usageMetadata as Record<string, unknown>)?.totalTokenCount as number | undefined;
  const model = (data.modelVersion as string) || (data.model as string) || "unknown";

  return { content: text, model, usage, raw: data };
}

/**
 * Parse error body from any provider.
 * Returns: { message, type, code }
 */
function parseErrorBody(rawText: string): { message: string; type?: string; code?: string } {
  try {
    const data = JSON.parse(rawText) as Record<string, unknown>;

    // OpenAI / OpenAI-compatible format
    if (data.error && typeof data.error === "object") {
      const e = data.error as Record<string, unknown>;
      return {
        message: (e.message as string) || "Unknown error",
        type: e.type as string | undefined,
        code: e.code as string | undefined,
      };
    }
    // Simple message field
    if (typeof data.message === "string") {
      return { message: data.message, type: data.type as string | undefined };
    }
    // Ollama error format: { "error": "..." }
    if (typeof data.error === "string") {
      return { message: data.error };
    }
  } catch {
    // Not JSON
  }
  return { message: rawText.slice(0, 300) };
}

// ─── Protocol-specific testers ───────────────────────────────────────────────

async function testOpenAICompatible(
  baseUrl: string,
  apiKey: string | undefined,
  modelName: string,
  providerType: string
): Promise<{ parsed: ParsedResponse; debug: ConnectionTestResult["debug"] }> {
  const url = buildUrl(baseUrl, "/chat/completions");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const body = {
    model: modelName,
    messages: [{ role: "user", content: PROBE_MESSAGE }],
    temperature: 0,
    max_tokens: 10,
    stream: false,
  };

  log(`${providerType} → OpenAI-compatible`, {
    url,
    method: "POST",
    headers,
    body,
  });

  const { res, text } = await httpRequest(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS,
  });

  log(`${providerType} ← response`, {
    status: res.status,
    body_preview: text.slice(0, 500),
  });

  const debug: ConnectionTestResult["debug"] = {
    final_url: url,
    method: "POST",
    headers,
    body,
    response_status: res.status,
    response_body_preview: text.slice(0, 500),
  };

  // Non-OK: build detailed error
  if (!res.ok) {
    const err = parseErrorBody(text);
    let msg = `${providerType} returned HTTP ${res.status}`;
    if (err.message) msg += `: ${err.message}`;
    if (err.type) msg += ` (${err.type})`;
    if (err.code) msg += ` [${err.code}]`;

    // Status-specific hints
    if (res.status === 401) {
      msg += "\n→ Kiểm tra API key hoặc xóa API key nếu provider không yêu cầu.";
    } else if (res.status === 404) {
      msg += "\n→ Endpoint /chat/completions không tìm thấy. Kiểm tra base_url có đúng không.";
    } else if (res.status === 400) {
      msg += "\n→ Model không hợp lệ. Kiểm tra tên model trong 9Router/Gateway.";
    } else if (res.status === 429) {
      msg += "\n→ Rate limit. Thử lại sau vài giây.";
    }
    throw new Error(msg);
  }

  // Parse success response
  const parsed = parseOpenAIResponse(text);
  return { parsed, debug };
}

async function testOllamaNative(
  baseUrl: string,
  modelName: string,
  providerType: string
): Promise<{ parsed: ParsedResponse; debug: ConnectionTestResult["debug"] }> {
  // Use /api/chat endpoint
  const url = buildUrl(baseUrl, "/api/chat");
  const body = {
    model: modelName,
    messages: [{ role: "user", content: PROBE_MESSAGE }],
    stream: false,
    options: {
      temperature: 0,
      num_predict: 10,
    },
  };

  log(`${providerType} → Ollama native`, { url, method: "POST", headers: { "Content-Type": "application/json" }, body });

  const { res, text } = await httpRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: DEFAULT_TIMEOUT_MS,
  });

  log(`${providerType} ← response`, { status: res.status, body_preview: text.slice(0, 500) });

  const debug: ConnectionTestResult["debug"] = {
    final_url: url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    response_status: res.status,
    response_body_preview: text.slice(0, 500),
  };

  if (!res.ok) {
    const err = parseErrorBody(text);
    let msg = `Ollama returned HTTP ${res.status}`;
    if (err.message) msg += `: ${err.message}`;
    throw new Error(msg);
  }

  const parsed = parseOllamaResponse(text);
  return { parsed, debug };
}

async function testGemini(
  baseUrl: string,
  apiKey: string | undefined,
  modelName: string,
  providerType: string
): Promise<{ parsed: ParsedResponse; debug: ConnectionTestResult["debug"] }> {
  const key = apiKey || process.env.GEMINI_API_KEY || "";
  const url = `${baseUrl.replace(/\/$/, "")}/${modelName}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: PROBE_MESSAGE }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 10 },
  };

  log(`${providerType} → Gemini`, { url: url.replace(key, "[KEY]"), method: "POST", headers: { "Content-Type": "application/json" }, body });

  const { res, text } = await httpRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 90000,
  });

  log(`${providerType} ← response`, { status: res.status, body_preview: text.slice(0, 500) });

  const debug: ConnectionTestResult["debug"] = {
    final_url: url.replace(key, "[REDACTED_KEY]"),
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    response_status: res.status,
    response_body_preview: text.slice(0, 500),
  };

  if (!res.ok) {
    const err = parseErrorBody(text);
    let msg = `Gemini returned HTTP ${res.status}`;
    if (err.message) msg += `: ${err.message}`;
    if (!apiKey && !process.env.GEMINI_API_KEY) {
      msg += "\n→ Gemini cần API key. Lấy key tại: https://aistudio.google.com/app/apikey";
    }
    throw new Error(msg);
  }

  const parsed = parseGeminiResponse(text);
  return { parsed, debug };
}

// ─── Model discovery ────────────────────────────────────────────────────────

async function discoverOpenAICompatibleModels(
  baseUrl: string,
  apiKey: string | undefined
): Promise<string[] | null> {
  const url = buildUrl(baseUrl, "/models");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  log("Discover models", { url, method: "GET", headers });

  try {
    const { res, text } = await httpRequest(url, {
      method: "GET",
      headers,
      timeout: 15000,
    });
    if (!res.ok) return null;

    const data = JSON.parse(text) as Record<string, unknown>;
    const models: string[] = [];

    // OpenAI format: { data: [{ id: "..." }] }
    if (Array.isArray(data.data)) {
      for (const m of data.data) {
        if ((m as Record<string, unknown>).id) {
          models.push((m as Record<string, unknown>).id as string);
        }
      }
    }
    // Alternative: { models: [{ id: "..." }] }
    if (Array.isArray(data.models)) {
      for (const m of data.models) {
        if ((m as Record<string, unknown>).id) {
          models.push((m as Record<string, unknown>).id as string);
        }
      }
    }

    if (models.length > 0) {
      log("Discovered models", { count: models.length, models: models.slice(0, 10) });
    }
    return models.length > 0 ? models : null;
  } catch {
    return null;
  }
}

async function discoverOllamaModels(baseUrl: string): Promise<string[] | null> {
  const url = buildUrl(baseUrl, "/api/tags");

  log("Discover Ollama models", { url });

  try {
    const { res, text } = await httpRequest(url, {
      method: "GET",
      timeout: 10000,
    });
    if (!res.ok) return null;

    const data = JSON.parse(text) as Record<string, unknown>;
    const models: string[] = [];

    if (Array.isArray(data.models)) {
      for (const m of data.models) {
        if ((m as Record<string, unknown>).name) {
          models.push((m as Record<string, unknown>).name as string);
        }
      }
    }

    return models.length > 0 ? models : null;
  } catch {
    return null;
  }
}

// ─── Connection hints ────────────────────────────────────────────────────────

function buildConnectionHint(errorMsg: string, baseUrl: string, protocol: Protocol): string {
  const isLocalhost = baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost");
  const isDockerNetwork = errorMsg.includes("fetch failed") ||
    errorMsg.includes("ECONNREFUSED") ||
    errorMsg.includes("ENOTFOUND") ||
    errorMsg.includes("getaddrinfo");

  if (isLocalhost && isDockerNetwork) {
    // Suggest Docker host gateway
    let hint = "\n→ Backend có thể chạy trong Docker.";
    if (baseUrl.includes("127.0.0.1")) {
      hint += "\n  Thử đổi 127.0.0.1 → host.docker.internal trong base_url.";
    }
    hint += "\n  Ví dụ: http://host.docker.internal:11434";
    return hint;
  }

  if (protocol === "ollama_native" && isLocalhost) {
    return "\n→ Kiểm tra Ollama đang chạy: ollama serve";
  }

  return "";
}

// ─── Main exported function ─────────────────────────────────────────────────

export async function testConnection(
  providerType: string,
  config: {
    base_url?: string;
    api_key?: string;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  const baseUrl = (config.base_url || "").trim();
  const modelName = (config.model_name || "unknown").trim();
  const apiKey = config.api_key || undefined;

  // Detect protocol
  const protocol = detectProtocol(baseUrl, providerType);

  log("testConnection start", {
    providerType,
    baseUrl,
    modelName,
    apiKey: apiKey ? "[PROVIDED]" : "empty",
    protocol,
  });

  // ── Step 1: Model discovery (before testing) ─────────────────────────────
  let availableModels: string[] | undefined;

  if (protocol === "openai_compatible") {
    const models = await discoverOpenAICompatibleModels(baseUrl, apiKey);
    if (models && models.length > 0) {
      availableModels = models;
      log("Model discovery result", { found: models.length, models: models.slice(0, 10) });

      // If model not in list, warn but continue (some gateways allow any model name)
      if (!models.includes(modelName) && modelName !== "unknown") {
        log("Model not in discovered list", { requested: modelName, available: models });
      }
    }
  } else if (protocol === "ollama_native") {
    const models = await discoverOllamaModels(baseUrl);
    if (models && models.length > 0) {
      availableModels = models;
      log("Ollama model discovery", { found: models.length, models });

      if (!models.includes(modelName) && modelName !== "unknown") {
        const suggestion = models.find((m) => m.startsWith(modelName.split(":")[0]));
        const hint = suggestion
          ? `\n→ Gợi ý: thử model '${suggestion}' hoặc chạy 'ollama list' để xem danh sách.`
          : `\n→ Gợi ý: chạy 'ollama list' để xem model nào đang có.`;
        log("Model not found in Ollama", { requested: modelName, available: models, hint });
      }
    }
  }

  // ── Step 2: Test connection ───────────────────────────────────────────────
  let parsed: ParsedResponse;
  let debug: ConnectionTestResult["debug"];

  try {
    if (protocol === "ollama_native") {
      const result = await testOllamaNative(baseUrl, modelName, providerType);
      parsed = result.parsed;
      debug = result.debug;
    } else if (protocol === "gemini") {
      const result = await testGemini(baseUrl, apiKey, modelName, providerType);
      parsed = result.parsed;
      debug = result.debug;
    } else {
      const result = await testOpenAICompatible(baseUrl, apiKey, modelName, providerType);
      parsed = result.parsed;
      debug = result.debug;
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    const hint = buildConnectionHint(errorMsg, baseUrl, protocol);

    log("testConnection FAILED", { error: errorMsg, duration_ms: durationMs });

    return {
      success: false,
      duration_ms: durationMs,
      message: errorMsg + hint,
      provider: providerType,
      available_models: availableModels,
    };
  }

  // ── Step 3: Validate response ─────────────────────────────────────────────
  const durationMs = Date.now() - startTime;

  // For "OK" probe: content should contain "ok" (case-insensitive) or be empty
  // Some models reply differently — we accept any non-empty content as success
  const contentOk = parsed.content.trim() !== "";

  log("testConnection SUCCESS", {
    providerType,
    model: parsed.model,
    content: parsed.content.slice(0, 50),
    tokens: parsed.usage,
    duration_ms: durationMs,
  });

  const tokensInfo = parsed.usage !== undefined ? ` | Tokens: ${parsed.usage}` : "";
  return {
    success: true,
    duration_ms: durationMs,
    message: `Kết nối thành công! Model: ${parsed.model}${tokensInfo}`,
    model: parsed.model,
    provider: providerType,
    available_models: availableModels,
    debug,
  };
}
