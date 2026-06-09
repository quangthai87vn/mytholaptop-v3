/**
 * AI Provider by ID API
 * GET  /api/ai/providers/[id]    - Get provider + runtime config
 * PUT  /api/ai/providers/[id]   - Update provider + runtime config
 * DELETE /api/ai/providers/[id]  - Hard delete provider + cleanup related records
 * POST /api/ai/providers/[id]    - Action: activate / deactivate / set-default
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  getProviderById,
  updateProvider,
  deleteProvider,
  activateProvider,
  deactivateProvider,
  setDefaultProvider,
  getRuntimeConfig,
  saveRuntimeConfig,
  getModelsByProvider,
  createModel,
  getDecryptedApiKey,
  checkProviderDelete,
  isProviderInUse,
} from "@/lib/content/db/provider-service";
import type { AIProviderInput, AIRuntimeConfigInput } from "@/lib/content/types";

// Disable caching — always query fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── GET ─────────────────────────────────────────────────────────────────────

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

    const [provider, runtimeConfig, models] = await Promise.all([
      getProviderById(providerId),
      getRuntimeConfig(providerId),
      getModelsByProvider(providerId),
    ]);

    if (!provider) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }

    // Decode API key (masked for security)
    const apiKeyDecrypted = await getDecryptedApiKey(providerId);
    const maskedKey = apiKeyDecrypted
      ? `sk-****${apiKeyDecrypted.slice(-8)}`
      : "";

    // Check if in use
    const inUse = await isProviderInUse(providerId);

    return NextResponse.json({
      data: {
        provider: {
          ...provider,
          api_key_masked: maskedKey,
          // Never expose encrypted key
          api_key_encrypted: undefined,
          api_key_iv: undefined,
        },
        runtimeConfig,
        models,
        isInUse: inUse,
      },
    });
  } catch (err) {
    console.error("[AI Provider GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy provider" }, { status: 500 });
  }
}

// ── PUT ─────────────────────────────────────────────────────────────────────

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

    const body = await req.json();
    const { provider: providerInput, runtimeConfig: runtimeInput } = body;

    // Check provider exists
    const existing = await getProviderById(providerId);
    if (!existing) {
      return NextResponse.json({ error: "Provider không tìm thành công" }, { status: 404 });
    }

    // Update provider base (partial update)
    let updatedProvider = null;
    if (providerInput) {
      updatedProvider = await updateProvider(providerId, providerInput);
      if (!updatedProvider) {
        return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
      }
    }

    // Update runtime config
    let updatedRuntime = null;
    if (runtimeInput) {
      updatedRuntime = await saveRuntimeConfig({
        ...runtimeInput,
        provider_id: providerId,
      });
    }

    // Get masked key for response
    const apiKeyDecrypted = await getDecryptedApiKey(providerId);
    const maskedKey = apiKeyDecrypted
      ? `sk-****${apiKeyDecrypted.slice(-8)}`
      : "";

    return NextResponse.json({
      data: {
        provider: {
          ...(updatedProvider || existing),
          api_key_masked: maskedKey,
          api_key_encrypted: undefined,
          api_key_iv: undefined,
        },
        runtimeConfig: updatedRuntime,
      },
    });
  } catch (err) {
    console.error("[AI Provider PUT]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi cập nhật provider" },
      { status: 500 }
    );
  }
}

// ── DELETE (Hard) ────────────────────────────────────────────────────────────

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
    const { id } = await params;
    const providerId = parseInt(id, 10);
    if (isNaN(providerId)) {
      return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
    }

    // Get provider info before deletion for response
    const existing = await getProviderById(providerId);
    if (!existing) {
      // Provider already deleted — return 200 gracefully
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // Check usage status for frontend warnings
    const check = await checkProviderDelete(providerId);

    // Block deletion if system provider
    if (!check.canDelete) {
      return NextResponse.json(
        {
          error: check.reason,
          isSystem: check.isSystem,
          canDelete: false,
        },
        { status: 409 }
      );
    }

    // Perform hard delete (routing rules are cleared by deleteProvider, models/configs deleted)
    const result = await deleteProvider(providerId);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 404 });
    }

    // Count how many routing rules were affected
    const { rows: affectedRules } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ai_task_routes
       WHERE primary_provider_id IS NULL AND task_type IS NOT NULL`
    );

    return NextResponse.json({
      success: true,
      deletedProvider: { id: providerId, name: existing.name },
      isSystem: check.isSystem,
      isDefault: check.isDefault,
      isInUse: check.isInUse,
      affectedRules: parseInt(affectedRules[0]?.count ?? "0", 10),
      message: "Đã xóa vĩnh viễn provider và các routing liên quan.",
    });
  } catch (err) {
    console.error("[AI Provider DELETE]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi xóa provider" },
      { status: 500 }
    );
  }
}

// ── POST (Actions) ────────────────────────────────────────────────────────────

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
    const { action } = body;

    // Check provider exists
    const existing = await getProviderById(providerId);
    if (!existing) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }

    let result: { id: number; name: string; status: string; is_default: boolean } | null = null;

    switch (action) {
      case "activate":
        result = await activateProvider(providerId);
        break;

      case "deactivate":
        result = await deactivateProvider(providerId);
        break;

      case "set-default":
        result = await setDefaultProvider(providerId);
        break;

      default:
        return NextResponse.json({ error: `Action không hợp lệ: ${action}` }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "Không thể thực hiện action" }, { status: 404 });
    }

    return NextResponse.json({
      data: result,
      message:
        action === "activate"
          ? `Đã bật provider "${existing.name}"`
          : action === "deactivate"
          ? `Đã tắt provider "${existing.name}"`
          : `Đã đặt "${existing.name}" làm provider mặc định`,
    });
  } catch (err) {
    console.error("[AI Provider POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi thực hiện action" },
      { status: 500 }
    );
  }
}
