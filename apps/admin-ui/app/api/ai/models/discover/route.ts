/**
 * AI Models Discovery API
 * POST /api/ai/models/discover
 * Discovers available models from a provider endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import type { AIProviderType } from "@/lib/content/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider_type, base_url, api_key } = body;

    if (!provider_type) {
      return NextResponse.json({ error: "provider_type là bắt buộc" }, { status: 400 });
    }

    const models: Array<{ id: string; name: string; context_window?: number }> = [];

    const base = base_url || getDefaultUrl(provider_type as AIProviderType);

    // OpenAI / LM Studio — list models via /models endpoint
    if (provider_type === "openai" || provider_type === "lmstudio") {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (api_key) headers["Authorization"] = `Bearer ${api_key}`;

        const res = await fetch(`${base.replace(/\/$/, "")}/models`, {
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data = await res.json() as { data?: Array<{ id: string; created?: number; context_window?: number }> };
          models.push(
            ...(data.data || []).map((m) => ({
              id: m.id,
              name: m.id,
              context_window: m.context_window,
            }))
          );
        }
      } catch { /* ignore */ }
    }

    // Ollama — list models via /api/tags
    if (provider_type === "ollama") {
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}/api/tags`, {
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json() as { models?: Array<{ name: string; model?: string }> };
          models.push(
            ...(data.models || []).map((m) => ({
              id: m.name || m.model || "",
              name: m.name || m.model || "",
            }))
          );
        }
      } catch { /* ignore */ }
    }

    // Gemini — hardcoded list since no list endpoint
    if (provider_type === "gemini") {
      const geminiModels = [
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context_window: 1_000_000 },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", context_window: 1_000_000 },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context_window: 2_000_000 },
        { id: "gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro", context_window: 1_000_000 },
        { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp", context_window: 1_000_000 },
      ];
      models.push(...geminiModels);
    }

    // OpenAI — add known models if list is empty
    if (provider_type === "openai" && models.length === 0) {
      const openaiModels = [
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
      ];
      models.push(...openaiModels);
    }

    return NextResponse.json({ data: models });
  } catch (err) {
    console.error("[AI Models Discover POST]", err);
    return NextResponse.json({ error: "Lỗi khi khám phá models" }, { status: 500 });
  }
}

function getDefaultUrl(provider: AIProviderType): string {
  const defaults: Record<AIProviderType, string> = {
    openai: "https://api.openai.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta/models",
    deepseek: "https://api.deepseek.com/v1",
    huggingface: "https://api-inference.huggingface.co/models",
    ollama: "http://localhost:11434",
    lmstudio: "http://localhost:1234/v1",
    "openai-compatible": "http://localhost:8000/v1",
    openrouter: "https://openrouter.ai/api/v1",
    groq: "https://api.groq.com/openai/v1",
  };
  return defaults[provider];
}
