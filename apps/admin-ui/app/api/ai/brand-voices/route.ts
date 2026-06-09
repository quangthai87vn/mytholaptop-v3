/**
 * AI Brand Voices API
 * GET  /api/ai/brand-voices - List all
 * GET  /api/ai/brand-voices?active=true - Get active
 * POST /api/ai/brand-voices - Upsert
 * DELETE /api/ai/brand-voices?preset= - Delete by preset
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllBrandVoices,
  getActiveBrandVoice,
  upsertBrandVoice,
  deleteBrandVoice,
} from "@/lib/content/db/brand-voices";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = req.nextUrl;
    if (searchParams.get("active") === "true") {
      const voice = await getActiveBrandVoice();
      return NextResponse.json({ data: voice });
    }
    const voices = await getAllBrandVoices();
    return NextResponse.json({ data: voices });
  } catch (err) {
    console.error("[AI Brand Voices GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy brand voices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const body = await req.json();
    const {
      preset, name, description,
      target_audience, tone_instruction, keywords_to_use, keywords_to_avoid,
      tone_professional_casual, tone_luxury_affordable, tone_technical_simple,
      content_template, emoji_usage, cta_style, example_output, is_active,
    } = body;

    if (!preset || !name) {
      return NextResponse.json({ error: "preset và name là bắt buộc" }, { status: 400 });
    }

    const voice = await upsertBrandVoice({
      preset, name, description,
      target_audience, tone_instruction, keywords_to_use, keywords_to_avoid,
      tone_professional_casual, tone_luxury_affordable, tone_technical_simple,
      content_template, emoji_usage, cta_style, example_output, is_active,
    });

    return NextResponse.json({ data: voice }, { status: 201 });
  } catch (err) {
    console.error("[AI Brand Voices POST]", err);
    return NextResponse.json({ error: "Lỗi khi lưu brand voice" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const { searchParams } = req.nextUrl;
    const preset = searchParams.get("preset");
    if (!preset) {
      return NextResponse.json({ error: "preset là bắt buộc" }, { status: 400 });
    }
    await deleteBrandVoice(preset);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[AI Brand Voices DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xoá brand voice" }, { status: 500 });
  }
}
