/**
 * Checklist item detail API.
 * PUT /api/tasks/[id]/checklist/[itemId] — update item (title, completion, order)
 * DELETE /api/tasks/[id]/checklist/[itemId] — delete item
 * Auth: requireAdminAuth + requireCsrf
 * Permission: tasks.update
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  updateChecklistItem,
  deleteChecklistItem,
  getTaskChecklist,
  getTaskChecklistProgress,
  logTaskActivity,
} from "@/lib/workspace/db";
import type { AdminUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export const dynamic = "force-dynamic";

const UpdateChecklistSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  is_completed: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

// PUT /api/tasks/[id]/checklist/[itemId]
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  const { id: taskId, itemId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const rawUser = (req as NextRequest & { _authUser?: AdminUser })._authUser;
  const userId = rawUser?.id ?? "system";

  const body = await req.json();
  const parsed = UpdateChecklistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await updateChecklistItem(itemId, userId, parsed.data);

  // Log activity
  if (parsed.data.is_completed !== undefined) {
    await logTaskActivity(
      taskId,
      userId,
      parsed.data.is_completed ? "checklist_completed" : "checklist_uncompleted",
      { metadata: { itemId, title: updated.title } }
    );
  } else if (parsed.data.title !== undefined) {
    await logTaskActivity(taskId, userId, "updated", {
      field: "checklist_item",
      oldValue: undefined,
      newValue: updated.title,
    });
  }

  const [items, progress] = await Promise.all([
    getTaskChecklist(taskId),
    getTaskChecklistProgress(taskId),
  ]);

  return NextResponse.json({ data: items, progress, total: items.length });
}

// DELETE /api/tasks/[id]/checklist/[itemId]
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  const { id: taskId, itemId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const rawUser = (req as NextRequest & { _authUser?: AdminUser })._authUser;
  const userId = rawUser?.id ?? "system";

  await deleteChecklistItem(itemId);

  await logTaskActivity(taskId, userId, "checklist_deleted", {
    metadata: { itemId },
  });

  const [items, progress] = await Promise.all([
    getTaskChecklist(taskId),
    getTaskChecklistProgress(taskId),
  ]);

  return NextResponse.json({ data: items, progress, total: items.length });
}
