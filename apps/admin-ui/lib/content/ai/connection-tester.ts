/**
 * AI Provider Connection Tester
 */

import { createAIProvider } from "./providers";
import type { AIProviderType, AISettingsInput } from "../types";

export interface ConnectionTestResult {
  success: boolean;
  duration_ms: number;
  message: string;
  model?: string;
  provider?: AIProviderType;
}

const PROBE_MESSAGE = "Xin chao. Chi tra loi 'OK' neu ban nhan duoc tin nhan nay.";

export async function testConnection(
  providerType: AIProviderType,
  config: {
    base_url?: string;
    api_key?: string;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  const defaultUrls: Record<AIProviderType, string> = {
    openai: "https://api.openai.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta/models",
    ollama: "http://localhost:11434",
    lmstudio: "http://localhost:1234/v1",
  };

  const defaultModels: Record<AIProviderType, string> = {
    openai: "gpt-4o-mini",
    gemini: "gemini-1.5-flash",
    ollama: "llama3.2",
    lmstudio: "local-model",
  };

  const baseUrl = config.base_url || defaultUrls[providerType];
  const modelName = config.model_name || defaultModels[providerType];

  try {
    const provider = createAIProvider(providerType, {
      base_url: baseUrl,
      api_key: config.api_key,
      model_name: modelName,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.max_tokens ?? 100,
    });

    const response = await provider.chat({
      model: modelName,
      messages: [
        { role: "user", content: PROBE_MESSAGE },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });

    const durationMs = Date.now() - startTime;

    if (!response.content || response.content.trim() === "") {
      return {
        success: false,
        duration_ms: durationMs,
        message: "Provider tra ve phan hoi rong. Kiem tra cau hinh.",
        provider: providerType,
      };
    }

    return {
      success: true,
      duration_ms: durationMs,
      message: `Ket noi thanh cong! Model: ${response.model || modelName}`,
      model: response.model || modelName,
      provider: providerType,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    let hint = "";
    if (errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED")) {
      if (providerType === "ollama") {
        hint = " Dam may Ollama dang chay? Thu chay: ollama serve";
      } else if (providerType === "lmstudio") {
        hint = " LM Studio dang chay voi API enabled? Kiem tra port 1234.";
      } else if (providerType === "gemini" && !config.api_key) {
        hint = " Gemini can API key. Lay key tai: https://aistudio.google.com/app/apikey";
      }
    }

    return {
      success: false,
      duration_ms: durationMs,
      message: `Loi: ${errorMessage}${hint}`,
      provider: providerType,
    };
  }
}
