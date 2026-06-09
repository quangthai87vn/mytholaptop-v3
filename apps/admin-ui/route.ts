import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/workspace/db";
import { writeWorkspaceAuditLog } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { createTaskSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import type {
  Task,
  TaskStatus,
  TaskType,
  MediaPlatform,
} from "@/lib/workspace/types";
import { hasPermission, type Permission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { notifyTaskAssigned } from "@/lib/workspace/notifications";

async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<{ allowed: true; actorName: string; userId: string } | { allowed: false; response: NextResponse }> {
  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return { allowed: false, response: NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 }) };
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return { allowed: false, response: NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 }) };
  }
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, permission)) {
    return { allowed: false, response: NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này.", code: "FORBIDDEN" }, { status: 403 }) };
  }
  return { allowed: true, actorName: user.full_name || user.email || "System", userId: user.id };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const tasks = await getTasks({
      project_id: searchParams.get("project_id") ?? undefined,
      campaign_id: searchParams.get("campaign_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      assignee_id: searchParams.get("assignee_id") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("[API] GET /api/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(request, "tasks.create");
  if (!perm.allowed) return perm.response;

  try {
    const body = await request.json();

    // Debug logging for task creation troubleshooting
    console.log("[API] POST /api/tasks raw body:", JSON.stringify(body, null, 2));

    // Strip empty-string UUID fields to avoid validation error
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(body)) {
      if (typeof val === "string" && val.trim() === "") {
        cleaned[key] = undefined;
      } else {
        cleaned[key] = val;
      }
    }

    const result = createTaskSchema.safeParse(cleaned);
    if (!result.success) {
      console.log("[API] POST /api/tasks validation errors:", JSON.stringify(result.error.issues, null, 2));
      return buildValidationResponse(result.error.issues);
    }
    const d = result.data;
    console.log("[API] POST /api/tasks validated data:", JSON.stringify(d, null, 2));

    const task = await createTask({
      title: d.title,
      description: d.description,
      project_id: d.project_id || undefined,
      campaign_id: d.campaign_id || undefined,
      parent_task_id: d.parent_task_id || undefined,
      status: d.status as TaskStatus,
      task_type: (d.task_type || undefined) as TaskType | undefined,
      platform: (d.platform || undefined) as MediaPlatform | undefined,
      published_at: d.published_at || undefined,
      published_url: d.published_url || undefined,
      assignee_ids: d.assignee_ids,
      reporter_id: d.reporter_id || undefined,
      start_date: d.start_date || undefined,
      due_date: d.due_date || undefined,
      estimated_hours: d.estimated_hours,
      actual_hours: d.actual_hours,
      attachments: d.attachments,
      dependencies: d.dependencies,
      progress: d.progress,
      metadata: d.metadata,
      // P9: Content detail fields
      content_title: d.content_title,
      content_hook: d.content_hook,
      content_goal: d.content_goal as Task["content_goal"],
      related_product: d.related_product,
      content_body: d.content_body,
      call_to_action: d.call_to_action,
      reference_links: d.reference_links,
      output_links: d.output_links,
      // Phase 3: Content workflow + employee submission
      content_status: (d.content_status || undefined) as Task["content_status"],
      completion_note: d.completion_note,
    }, perm.actorName);

    // V3: Notify assignees when task is created with assignees
    if (d.assignee_ids && d.assignee_ids.length > 0) {
      notifyTaskAssigned({
        taskId: task.id,
        taskTitle: task.title,
        assigneeIds: d.assignee_ids,
        assignedBy: perm.userId,
      }).catch((e) => console.error("[Notifications] task_assigned error:", e));
    }

    await writeWorkspaceAuditLog({
      actorId: perm.userId,
      actorName: perm.actorName,
      action: "created",
      entityType: "task",
      entityId: task.id,
      entityName: task.title,
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/tasks error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
