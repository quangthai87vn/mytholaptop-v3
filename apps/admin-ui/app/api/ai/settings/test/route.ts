/**
 * AI Settings Test Connection API
 * POST /api/ai/settings/test
 * Body: { provider: string, provider_id?: number, base_url?, api_key?, model_name? }
 * Hỗ trợ: openai, gemini, deepseek, huggingface, ollama, lmstudio, openai-compatible, openrouter, groq
 */

import { NextRequest, NextResponse } from "next/server";
import { testConnection } from "@/lib/content/ai/connection-tester";
import { getProviderById, updateConnectionStatus } from "@/lib/content/db/provider-service";
import type { AIProviderType } from "@/lib/content/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, provider_id, base_url, api_key, model_name } = body;

    if (!provider && !provider_id) {
      return NextResponse.json({ error: "provider hoặc provider_id là bắt buộc" }, { status: 400 });
    }

    let resolvedProvider = provider;
    let resolvedBaseUrl = base_url;
    let resolvedApiKey = api_key;
    let resolvedModelName = model_name;

    // Nếu có provider_id, load từ DB
    if (provider_id) {
      const dbProvider = await getProviderById(provider_id);
      if (!dbProvider) {
        return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
      }
      // Dùng slug từ DB (ví dụ: 9router, openai, ollama)
      // fallback sang type nếu slug rỗng
      resolvedProvider = dbProvider.slug || dbProvider.type || provider || "openai-compatible";
      resolvedBaseUrl = base_url ?? dbProvider.base_url;
      resolvedModelName = model_name ?? (dbProvider as any).selected_model ?? dbProvider.model_name;

      // Decrypt API key nếu không truyền lên
      if (!api_key) {
        const { getDecryptedApiKey } = await import("@/lib/content/db/provider-service");
        resolvedApiKey = await getDecryptedApiKey(provider_id);
      }
    }

    // Debug log
    if (process.env.NODE_ENV === "development") {
      console.log("[AI Settings Test] resolved config:", {
        provider: resolvedProvider,
        base_url: resolvedBaseUrl,
        api_key: resolvedApiKey ? "[REDACTED]" : "empty",
        model_name: resolvedModelName,
      });
    }

    const result = await testConnection(resolvedProvider as AIProviderType, {
      base_url: resolvedBaseUrl,
      api_key: resolvedApiKey,
      model_name: resolvedModelName,
      temperature: 0.7,
      max_tokens: 50,
    });

    // Update connection status in DB
    if (provider_id) {
      await updateConnectionStatus(
        provider_id,
        result.success ? "connected" : "error",
        result.success ? undefined : result.message
      );
    }

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("[AI Settings Test]", err);
    return NextResponse.json({ error: "Lỗi khi test kết nối" }, { status: 500 });
  }
}
