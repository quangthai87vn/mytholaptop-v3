/**
 * GET /api/tasks/[id]/activity
 * Get per-task activity timeline.
 * Auth: requireAdminAuth
 * Permission: tasks.read
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { getTaskActivityEntries } from "@/lib/workspace/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

// GET /api/tasks/[id]/activity?page=1&pageSize=20
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id: taskId } = await params;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));

  const result = await getTaskActivityEntries(taskId, page, pageSize);

  return NextResponse.json(result);
}
