/**
 * POST /api/tasks/[id]/assets
 * Upload/add asset cho một task.
 * Auth: requireAdminAuth() + requireCsrf() + rate limit
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { createTaskAsset, getTaskById, writeAssetAuditLog } from "@/lib/workspace/db";
import { createTaskAssetSchema, buildValidationResponse } from "@/lib/workspace/validation";
import type { AssetType } from "@/lib/workspace/types-asset";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    // Kiểm tra task tồn tại
    const task = await getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task không tồn tại" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createTaskAssetSchema.safeParse(body);

    if (!parsed.success) {
      return buildValidationResponse(parsed.error.issues);
    }

    const data = parsed.data;

    // Lấy user info cho audit log
    const sessionUser = (req as NextRequest & { _authUser?: { id: string; name: string } })._authUser;

    const asset = await createTaskAsset(
      taskId,
      {
        asset_type: data.asset_type as AssetType,
        title: data.title,
        description: data.description,
        file_name: data.file_name,
        file_url: data.file_url || undefined,
        mime_type: data.mime_type,
        file_size: data.file_size,
        storage_provider: data.storage_provider as "local" | "medusa" | "s3" | "google_drive" | "canva",
        original_url: data.original_url || undefined,
        uploaded_by: sessionUser?.id,
        uploaded_by_name: sessionUser?.name,
        metadata: data.metadata,
      },
      sessionUser?.id,
      sessionUser?.name
    );

    // Audit log
    await writeAssetAuditLog({
      actorId: sessionUser?.id,
      actorName: sessionUser?.name,
      action: "upload",
      entityType: "task_asset",
      entityId: asset.id,
      assetType: data.asset_type as AssetType,
      fileName: data.file_name,
      fileUrl: data.file_url,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/tasks/[id]/assets error:", error);
    return NextResponse.json(
      { error: "Không thể tạo asset" },
      { status: 500 }
    );
  }
}
