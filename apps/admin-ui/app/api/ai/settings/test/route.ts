/**
 * AI Settings Test Connection API
 * POST /api/ai/settings/test
 * Body: { provider: "openai"|"gemini"|"ollama"|"lmstudio", base_url, api_key, model_name }
 */

import { NextRequest, NextResponse } from "next/server";
import { testConnection } from "@/lib/content/ai/connection-tester";
import type { AIProviderType } from "@/lib/content/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, base_url, api_key, model_name } = body;

    if (!provider) {
      return NextResponse.json({ error: "provider là bắt buộc" }, { status: 400 });
    }

    const validProviders: AIProviderType[] = ["openai", "gemini", "ollama", "lmstudio"];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: "provider không hợp lệ" }, { status: 400 });
    }

    const result = await testConnection(provider, {
      base_url,
      api_key,
      model_name,
      temperature: 0.7,
      max_tokens: 100,
    });

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("[AI Settings Test]", err);
    return NextResponse.json({ error: "Lỗi khi test kết nối" }, { status: 500 });
  }
}
