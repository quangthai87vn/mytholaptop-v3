/**
 * AI Provider implementations
 * Supports: OpenAI, Google Gemini, DeepSeek, HuggingFace,
 *           Ollama, LM Studio, OpenAI-Compatible Server
 */

import type { AIProviderType } from "../types";

export interface AICompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  tokens_used?: number;
  raw?: unknown;
}

export interface AIProviderConfig {
  base_url: string;
  api_key?: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
}

export interface AIProvider {
  readonly type: AIProviderType;
  chat(request: AICompletionRequest): Promise<AICompletionResponse>;
  isHealthy(): Promise<boolean>;
}

function buildHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── OpenAI Provider ───────────────────────────────────────────────────────────
export class OpenAIProvider implements AIProvider {
  readonly type: AIProviderType = "openai";

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.max_tokens ?? this.config.max_tokens,
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildHeaders(this.config.api_key),
      body: JSON.stringify(body),
      timeout: 60000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/models`;
      const res = await fetchWithTimeout(url, {
        headers: buildHeaders(this.config.api_key),
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── Gemini Provider ───────────────────────────────────────────────────────────
export class GeminiProvider implements AIProvider {
  readonly type: AIProviderType = "gemini";

  constructor(private config: AIProviderConfig) {}

  private getApiKey(): string {
    return this.config.api_key || "";
  }

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.config.model_name || "gemini-1.5-flash";
    const apiKey = this.getApiKey();
    const url = `${this.config.base_url.replace(/\/$/, "")}/${model}:generateContent?key=${apiKey}`;

    const contents = request.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? this.config.temperature,
        maxOutputTokens: request.max_tokens ?? this.config.max_tokens,
      },
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeout: 60000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: { totalTokenCount?: number };
      model?: string;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      content: text,
      model: model,
      tokens_used: data.usageMetadata?.totalTokenCount,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const model = this.config.model_name || "gemini-1.5-flash";
      const apiKey = this.getApiKey();
      const url = `${this.config.base_url.replace(/\/$/, "")}/${model}:generateContent?key=${apiKey}`;
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
        timeout: 10000,
      });
      return res.ok || res.status === 400;
    } catch {
      return false;
    }
  }
}

// ── Ollama Provider ───────────────────────────────────────────────────────────
export class OllamaProvider implements AIProvider {
  readonly type: AIProviderType = "ollama";

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.config.model_name || "llama3.2";
    const url = `${this.config.base_url.replace(/\/$/, "")}/api/chat`;

    const messages = request.messages.map((m) => ({
      role: m.role === "system" ? "system" : m.role,
      content: m.content,
    }));

    const body = {
      model,
      messages,
      stream: false,
      options: {
        temperature: Number(request.temperature ?? this.config.temperature),
        num_predict: Number(request.max_tokens ?? this.config.max_tokens),
      },
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeout: 120000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      message?: { content?: string };
      total_duration?: number;
      loaded_duration?: number;
      prompt_eval_count?: number;
      eval_count?: number;
      model?: string;
    };

    return {
      content: data.message?.content || "",
      model: model,
      tokens_used: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/api/tags`;
      const res = await fetchWithTimeout(url, {
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── LM Studio Provider (OpenAI-compatible) ────────────────────────────────────
export class LMStudioProvider implements AIProvider {
  readonly type: AIProviderType = "lmstudio";

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const model = request.model || this.config.model_name || "local-model";

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildHeaders(this.config.api_key),
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature,
        max_tokens: request.max_tokens ?? this.config.max_tokens,
      }),
      timeout: 120000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LM Studio API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/models`;
      const res = await fetchWithTimeout(url, {
        headers: buildHeaders(this.config.api_key),
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── DeepSeek Provider (OpenAI-compatible) ──────────────────────────────────────
export class DeepSeekProvider implements AIProvider {
  readonly type: AIProviderType = "deepseek";

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: request.model || this.config.model_name || "deepseek-chat",
      messages: request.messages,
      temperature: Number(request.temperature ?? this.config.temperature),
      max_tokens: Number(request.max_tokens ?? this.config.max_tokens),
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildHeaders(this.config.api_key),
      body: JSON.stringify(body),
      timeout: 60000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/models`;
      const res = await fetchWithTimeout(url, {
        headers: buildHeaders(this.config.api_key),
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── HuggingFace Inference Provider ─────────────────────────────────────────────
export class HuggingFaceProvider implements AIProvider {
  readonly type: AIProviderType = "huggingface";

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.config.model_name || "mistralai/Mistral-7B-Instruct-v0.2";
    const url = `${this.config.base_url.replace(/\/$/, "")}/${model}`;

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.api_key || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: request.messages[request.messages.length - 1]?.content || "",
        parameters: {
          temperature: Number(request.temperature ?? this.config.temperature),
          max_new_tokens: Number(request.max_tokens ?? this.config.max_tokens),
          return_full_text: false,
        },
      }),
      timeout: 120000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HuggingFace API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as unknown;
    const text = Array.isArray(data) ? (data[0]?.generated_text || "") : String(data);

    return {
      content: text,
      model: model,
      tokens_used: undefined,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/mistralai/Mistral-7B-Instruct-v0.2`;
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.api_key || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "Hello",
          parameters: { max_new_tokens: 10 },
        }),
        timeout: 30000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── OpenAI-Compatible Provider (vLLM, TGI, LocalAI, etc.) ─────────────────────
export class OpenAICompatibleProvider implements AIProvider {
  readonly type: AIProviderType = "openai-compatible";

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: request.model || this.config.model_name || "local-model",
      messages: request.messages,
      temperature: Number(request.temperature ?? this.config.temperature),
      max_tokens: Number(request.max_tokens ?? this.config.max_tokens),
      stream: false, // Always non-streaming; streaming parsing not implemented in backend pipeline
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.api_key ? { Authorization: `Bearer ${this.config.api_key}` } : {}),
      },
      body: JSON.stringify(body),
      timeout: 120000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/models`;
      const res = await fetchWithTimeout(url, {
        headers: {
          ...(this.config.api_key ? { Authorization: `Bearer ${this.config.api_key}` } : {}),
        },
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── OpenRouter Provider ────────────────────────────────────────────────────────
// OpenRouter uses OpenAI-compatible API with custom headers for site tracking
export class OpenRouterProvider implements AIProvider {
  readonly type = "openrouter" as AIProviderType;

  constructor(private config: AIProviderConfig) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.api_key) {
      headers["Authorization"] = `Bearer ${this.config.api_key}`;
    }
    // OpenRouter-specific headers
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL ?? "https://mytholaptop.vn";
    headers["X-Title"] = "My Tho Laptop AI Center";
    return headers;
  }

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: request.model || this.config.model_name || "openrouter/anthropic/claude-3.5-sonnet",
      messages: request.messages,
      temperature: Number(request.temperature ?? this.config.temperature),
      max_tokens: Number(request.max_tokens ?? this.config.max_tokens),
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      timeout: 90000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/models`;
      const res = await fetchWithTimeout(url, {
        headers: this.buildHeaders(),
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── Groq Provider ────────────────────────────────────────────────────────────
// Groq uses OpenAI-compatible API with GPU inference
export class GroqProvider implements AIProvider {
  readonly type = "groq" as AIProviderType;

  constructor(private config: AIProviderConfig) {}

  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.base_url.replace(/\/$/, "")}/chat/completions`;
    const body = {
      model: request.model || this.config.model_name || "llama-3.3-70b-versatile",
      messages: request.messages,
      temperature: Number(request.temperature ?? this.config.temperature),
      max_tokens: Number(request.max_tokens ?? this.config.max_tokens),
    };

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildHeaders(this.config.api_key),
      body: JSON.stringify(body),
      timeout: 60000,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      content: data.choices[0]?.message?.content || "",
      model: data.model,
      tokens_used: data.usage?.total_tokens,
      raw: data,
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = `${this.config.base_url.replace(/\/$/, "")}/models`;
      const res = await fetchWithTimeout(url, {
        headers: buildHeaders(this.config.api_key),
        timeout: 10000,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────
export function createAIProvider(
  type: AIProviderType | string,
  config: AIProviderConfig
): AIProvider {
  const providerType = type as AIProviderType;
  switch (providerType) {
    case "openai":
      return new OpenAIProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    case "deepseek":
      return new DeepSeekProvider(config);
    case "huggingface":
      return new HuggingFaceProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    case "lmstudio":
      return new LMStudioProvider(config);
    case "openai-compatible":
      return new OpenAICompatibleProvider(config);
    case "openrouter":
      return new OpenRouterProvider(config);
    case "groq":
      return new GroqProvider(config);
    default:
      // Fallback to OpenAI-compatible for unknown types (custom providers)
      return new OpenAICompatibleProvider({ ...config, base_url: config.base_url || "http://localhost:8000/v1" });
  }
}
