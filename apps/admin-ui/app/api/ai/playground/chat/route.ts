/**
 * AI Playground Chat API
 * POST /api/ai/playground/chat
 * Body: { provider, model_name, temperature, max_tokens, system_prompt, user_message }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIProvider } from "@/lib/content/ai/providers";
import type { AIProviderType } from "@/lib/content/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider,
      model_name,
      temperature = 0.7,
      max_tokens = 2048,
      system_prompt,
      user_message,
    } = body;

    // Ensure numeric types for Ollama
    const temperatureNum = parseFloat(String(temperature || 0.7));
    const maxTokensNum = parseInt(String(max_tokens || 2048), 10);

    if (!provider || !user_message) {
      return NextResponse.json({ error: "provider và user_message là bắt buộc" }, { status: 400 });
    }

    const defaultUrls: Record<AIProviderType, string> = {
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

    const baseUrl = defaultUrls[provider as AIProviderType] || defaultUrls["ollama"];
    const model = model_name || "deepseek-r1:7b";

    const messages: Array<{ role: string; content: string }> = [];
    if (system_prompt) {
      messages.push({ role: "system", content: system_prompt });
    }
    messages.push({ role: "user", content: user_message });

    const providerInstance = createAIProvider(provider as AIProviderType, {
      base_url: baseUrl,
      api_key: undefined,
      model_name: model,
      temperature: temperatureNum,
      max_tokens: maxTokensNum,
    });

    const start = Date.now();
    const response = await providerInstance.chat({
      model,
      messages,
      temperature: temperatureNum,
      max_tokens: maxTokensNum,
    });
    const duration_ms = Date.now() - start;

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model || model,
      tokens_used: response.tokens_used,
      duration_ms,
    });
  } catch (err) {
    console.error("[AI Playground Chat]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message, duration_ms: 0 },
      { status: 500 }
    );
  }
}
