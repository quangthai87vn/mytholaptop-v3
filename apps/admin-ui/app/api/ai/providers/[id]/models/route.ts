/**
 * AI Provider Models API
 * GET  /api/ai/providers/[id]/models   - List models for a provider
 * POST /api/ai/providers/[id]/models   - Add a model
 * DELETE /api/ai/providers/[id]/models?id=  - Delete a model
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getModelsByProvider,
  createModel,
  deleteModel,
} from "@/lib/content/db/provider-service";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const providerId = parseInt(id, 10);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
    }
    const models = await getModelsByProvider(providerId);
    return NextResponse.json({ data: models });
  } catch (err) {
    console.error("[AI Provider Models GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy models" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const { id } = await params;
    const providerId = parseInt(id, 10);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
    }
    const body = await req.json();
    const { model_name, display_name, context_length, is_default } = body;
    if (!model_name?.trim()) {
      return NextResponse.json({ error: "model_name là bắt buộc" }, { status: 400 });
    }
    const model = await createModel(providerId, { model_name: model_name.trim(), display_name, context_length, is_default });
    return NextResponse.json({ data: model }, { status: 201 });
  } catch (err) {
    console.error("[AI Provider Models POST]", err);
    return NextResponse.json({ error: "Lỗi khi tạo model" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const { searchParams } = req.nextUrl;
    const modelId = searchParams.get("id");
    if (!modelId) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 });
    }
    const deleted = await deleteModel(parseInt(modelId, 10));
    if (!deleted) {
      return NextResponse.json({ error: "Model không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AI Provider Models DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xóa model" }, { status: 500 });
  }
}
