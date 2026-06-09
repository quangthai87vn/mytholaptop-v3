/**
 * Provider Runtime Config API
 * GET  /api/ai/providers/[id]/runtime-config  - Get runtime config
 * PUT  /api/ai/providers/[id]/runtime-config  - Update runtime config
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRuntimeConfig,
  saveRuntimeConfig,
  getProviderById,
} from "@/lib/content/db/provider-service";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";
import type { AIRuntimeConfigInput } from "@/lib/content/types";

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

    const provider = await getProviderById(providerId);
    if (!provider) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }

    const config = await getRuntimeConfig(providerId);
    return NextResponse.json({ data: config });
  } catch (err) {
    console.error("[Runtime Config GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy runtime config" }, { status: 500 });
  }
}

export async function PUT(
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

    const body = await req.json() as AIRuntimeConfigInput;
    if (!body.selected_model?.trim()) {
      return NextResponse.json({ error: "Model là bắt buộc" }, { status: 400 });
    }

    const provider = await getProviderById(providerId);
    if (!provider) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }

    const saved = await saveRuntimeConfig({
      ...body,
      provider_id: providerId,
    });

    return NextResponse.json({ data: saved });
  } catch (err) {
    console.error("[Runtime Config PUT]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi lưu runtime config" },
      { status: 500 }
    );
  }
}
