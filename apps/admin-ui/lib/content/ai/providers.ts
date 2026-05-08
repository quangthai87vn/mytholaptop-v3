/**
 * AI Provider implementations
 * Supports: OpenAI, Google Gemini, Ollama, LM Studio
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
        temperature: request.temperature ?? this.config.temperature,
        num_predict: request.max_tokens ?? this.config.max_tokens,
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

// ── Factory ───────────────────────────────────────────────────────────────────
export function createAIProvider(
  type: AIProviderType,
  config: AIProviderConfig
): AIProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(config);
    case "gemini":
      return new GeminiProvider(config);
    case "ollama":
      return new OllamaProvider(config);
    case "lmstudio":
      return new LMStudioProvider(config);
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}
