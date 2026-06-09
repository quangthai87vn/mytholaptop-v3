/**
 * AI Brand Voices Activate API
 * POST /api/ai/brand-voices/activate
 * Body: { preset: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { setActiveBrandVoice } from "@/lib/content/db/brand-voices";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const body = await req.json();
    const { preset } = body;

    if (!preset) {
      return NextResponse.json({ error: "preset là bắt buộc" }, { status: 400 });
    }

    const voice = await setActiveBrandVoice(preset);
    if (!voice) {
      return NextResponse.json({ error: "Không tìm thấy preset" }, { status: 404 });
    }

    return NextResponse.json({ data: voice });
  } catch (err) {
    console.error("[AI Brand Voices Activate]", err);
    return NextResponse.json({ error: "Lỗi khi kích hoạt brand voice" }, { status: 500 });
  }
}
