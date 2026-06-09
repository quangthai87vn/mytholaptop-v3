/**
 * AI Settings API
 * GET  /api/ai/settings - Get decrypted settings
 * PUT  /api/ai/settings - Save settings (encrypts api_key before storing)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/content/db/settings";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";
import type { AISettingsInput } from "@/lib/content/types";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const settings = await getSettings();
    return NextResponse.json({ data: settings });
  } catch (err) {
    console.error("[AI Settings GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy cấu hình AI" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const body = await req.json() as AISettingsInput;

    if (!body.provider_id || !body.model_name) {
      return NextResponse.json(
        { error: "provider_id và model_name là bắt buộc" },
        { status: 400 }
      );
    }

    if (body.temperature < 0 || body.temperature > 2) {
      return NextResponse.json(
        { error: "temperature phải từ 0 đến 2" },
        { status: 400 }
      );
    }

    const saved = await saveSettings({
      provider_id: body.provider_id,
      base_url: body.base_url,
      model_name: body.model_name,
      api_key: body.api_key,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      brand_voice: body.brand_voice,
      prompt_rules: body.prompt_rules,
      safety_rules: body.safety_rules,
      is_active: body.is_active,
    });

    return NextResponse.json({ data: saved });
  } catch (err) {
    console.error("[AI Settings PUT]", err);
    return NextResponse.json({ error: "Lỗi khi lưu cấu hình AI" }, { status: 500 });
  }
}
