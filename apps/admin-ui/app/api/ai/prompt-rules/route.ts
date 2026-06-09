/**
 * AI Prompt Rules API
 * GET  /api/ai/prompt-rules
 * POST /api/ai/prompt-rules    - Upsert a rule
 * DELETE /api/ai/prompt-rules?id= - Delete by id
 * PATCH /api/ai/prompt-rules?id=&active= - Toggle active
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getPromptRules,
  upsertPromptRule,
  deletePromptRule,
  togglePromptRule,
} from "@/lib/content/db/prompt-rules";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const rules = await getPromptRules();
    return NextResponse.json({ data: rules });
  } catch (err) {
    console.error("[AI Prompt Rules GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy prompt rules" }, { status: 500 });
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
    const { scope, platform, rule_key, rule_text, priority, is_active } = body;

    if (!scope || !rule_key || !rule_text) {
      return NextResponse.json({ error: "scope, rule_key và rule_text là bắt buộc" }, { status: 400 });
    }

    const rule = await upsertPromptRule({ scope, platform, rule_key, rule_text, priority, is_active });
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err) {
    console.error("[AI Prompt Rules POST]", err);
    return NextResponse.json({ error: "Lỗi khi lưu prompt rule" }, { status: 500 });
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
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 });

    const deleted = await deletePromptRule(parseInt(id, 10));
    if (!deleted) return NextResponse.json({ error: "Không tìm thấy rule" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AI Prompt Rules DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xóa prompt rule" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const body = await req.json();
    const { id, is_active } = body;
    if (!id || is_active === undefined) {
      return NextResponse.json({ error: "id và is_active là bắt buộc" }, { status: 400 });
    }

    const rule = await togglePromptRule(parseInt(id, 10), is_active);
    if (!rule) return NextResponse.json({ error: "Không tìm thấy rule" }, { status: 404 });
    return NextResponse.json({ data: rule });
  } catch (err) {
    console.error("[AI Prompt Rules PATCH]", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật prompt rule" }, { status: 500 });
  }
}
