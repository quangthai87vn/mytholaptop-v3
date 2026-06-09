/**
 * DELETE /api/tasks/[id]/assets/[assetId]
 * Xóa một asset của task.
 * Auth: requireAdminAuth() + requireCsrf() + rate limit
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { deleteTaskAsset, getTaskAssetById } from "@/lib/workspace/db";

interface RouteParams {
  params: Promise<{ id: string; assetId: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: taskId, assetId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    // Kiểm tra asset tồn tại và thuộc đúng task
    const asset = await getTaskAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: "Asset không tồn tại" }, { status: 404 });
    }
    if (asset.task_id !== taskId) {
      return NextResponse.json(
        { error: "Asset không thuộc về task này" },
        { status: 403 }
      );
    }

    const sessionUser = (req as NextRequest & { _authUser?: { id: string; name: string } })._authUser;

    const deleted = await deleteTaskAsset(
      assetId,
      sessionUser?.id,
      sessionUser?.name
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Không thể xóa asset" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { success: true, id: assetId } });
  } catch (error) {
    console.error("[API] DELETE /api/tasks/[id]/assets/[assetId] error:", error);
    return NextResponse.json(
      { error: "Không thể xóa asset" },
      { status: 500 }
    );
  }
}
