/**
 * Checklist API for a task.
 * GET /api/tasks/[id]/checklist — list items
 * POST /api/tasks/[id]/checklist — add item
 * Auth: requireAdminAuth + requireCsrf (POST)
 * Permission: tasks.read (GET), tasks.update (POST)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  getTaskChecklist,
  getTaskChecklistProgress,
  createChecklistItem,
  logTaskActivity,
} from "@/lib/workspace/db";
import type { AdminUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

const CreateChecklistSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(500),
  sort_order: z.number().int().min(0).optional(),
});

// GET /api/tasks/[id]/checklist
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id: taskId } = await params;

  const [items, progress] = await Promise.all([
    getTaskChecklist(taskId),
    getTaskChecklistProgress(taskId),
  ]);

  return NextResponse.json({ data: items, progress, total: items.length });
}

// POST /api/tasks/[id]/checklist
export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const rawUser = (req as NextRequest & { _authUser?: AdminUser })._authUser;
  const userId = rawUser?.id ?? "system";

  const body = await req.json();
  const parsed = CreateChecklistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const item = await createChecklistItem(taskId, userId, parsed.data);

  await logTaskActivity(taskId, userId, "checklist_added", {
    metadata: { itemId: item.id, title: item.title },
  });

  const [items, progress] = await Promise.all([
    getTaskChecklist(taskId),
    getTaskChecklistProgress(taskId),
  ]);

  return NextResponse.json(
    { data: items, progress, total: items.length },
    { status: 201 }
  );
}
