import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask, createWorkflow, getMasterDataItems, query } from "@/lib/workspace/db";
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
    // Also convert comma-separated strings to arrays for link fields
    // Normalize "todo" (legacy) to "idea" (standard)
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(body)) {
      if (typeof val === "string" && val.trim() === "") {
        cleaned[key] = undefined;
      } else if (key === "reference_links" || key === "output_links") {
        // Accept comma-separated string or array
        if (typeof val === "string") {
          cleaned[key] = val.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else {
          cleaned[key] = val;
        }
      } else if (key === "status" && (val === "todo" || val === "backlog")) {
        cleaned[key] = "idea";
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

    // ── DB-level validation: verify category codes exist in pm_master_data ──
    const [taskStatuses, taskTypes, channels, contentGoals, contentStatuses] = await Promise.all([
      getMasterDataItems("task_status"),
      getMasterDataItems("task_type"),
      getMasterDataItems("channel"),
      getMasterDataItems("content_goal"),
      getMasterDataItems("content_status"),
    ]);

    const activeStatusCodes = new Set(taskStatuses.filter((s) => s.is_active).map((s) => s.code));
    const activeTypeCodes = new Set(taskTypes.filter((t) => t.is_active).map((t) => t.code));
    const activeChannelCodes = new Set(channels.filter((c) => c.is_active).map((c) => c.code));
    const activeGoalCodes = new Set(contentGoals.filter((g) => g.is_active).map((g) => g.code));
    const activeContentStatusCodes = new Set(contentStatuses.filter((c) => c.is_active).map((c) => c.code));

    // Normalize legacy statuses
    let resolvedStatus = d.status;
    if (resolvedStatus === "todo" || resolvedStatus === "backlog") resolvedStatus = "idea";
    if (resolvedStatus && !activeStatusCodes.has(resolvedStatus)) {
      return NextResponse.json(
        { error: `Status "${resolvedStatus}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_STATUS" },
        { status: 400 }
      );
    }
    if (d.task_type && d.task_type !== "" && !activeTypeCodes.has(d.task_type)) {
      return NextResponse.json(
        { error: `Task type "${d.task_type}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_TASK_TYPE" },
        { status: 400 }
      );
    }
    if (d.platform && d.platform !== "" && !activeChannelCodes.has(d.platform)) {
      return NextResponse.json(
        { error: `Platform "${d.platform}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_PLATFORM" },
        { status: 400 }
      );
    }
    if (d.content_goal && d.content_goal !== "" && !activeGoalCodes.has(d.content_goal)) {
      return NextResponse.json(
        { error: `Content goal "${d.content_goal}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_CONTENT_GOAL" },
        { status: 400 }
      );
    }
    if (d.content_status && d.content_status !== "" && !activeContentStatusCodes.has(d.content_status)) {
      return NextResponse.json(
        { error: `Content status "${d.content_status}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_CONTENT_STATUS" },
        { status: 400 }
      );
    }

    // Resolve default status: if not provided, use first active task_status from master_data
    if (!resolvedStatus) {
      const firstActive = taskStatuses
        .filter((s) => s.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)[0];
      resolvedStatus = firstActive?.code ?? "idea";
    }

    const task = await createTask({
      title: d.title,
      description: d.description,
      project_id: d.project_id || undefined,
      campaign_id: d.campaign_id || undefined,
      parent_task_id: d.parent_task_id || undefined,
      status: resolvedStatus as TaskStatus,
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
      // P10: Platform link fields
      website_url: d.website_url || undefined,
      youtube_url: d.youtube_url || undefined,
      tiktok_url: d.tiktok_url || undefined,
      facebook_url: d.facebook_url || undefined,
    }, perm.actorName);

    // ── Auto-create workflow if task_type.creates_workflow = true ──
    if (task.task_type && d.task_type) {
      const taskTypeItem = taskTypes.find((t) => t.code === d.task_type);
      if (taskTypeItem?.metadata && typeof taskTypeItem.metadata === "object") {
        const cfg = taskTypeItem.metadata as Record<string, unknown>;
        if (cfg.creates_workflow === true) {
          const workflowType = typeof cfg.workflow_type === "string" ? cfg.workflow_type : d.task_type;
          const workflow = await createWorkflow({
            taskId: task.id,
            workflowType,
            title: task.content_title || task.title,
            description: task.description,
            contentTitle: task.content_title,
            contentHook: task.content_hook,
            contentGoal: typeof task.content_goal === "string" ? task.content_goal : undefined,
            relatedProduct: task.related_product,
            contentBody: task.content_body ?? undefined,
            callToAction: task.call_to_action,
            referenceLinks: task.reference_links ?? undefined,
            platform: typeof task.platform === "string" ? task.platform : undefined,
            platformIds: (d.metadata?.platform_ids as string[] | undefined) ?? undefined,
            projectId: task.project_id,
            campaignId: task.campaign_id,
            assigneeIds: task.assignee_ids,
            taskStatus: task.status,
          });
          // Back-link workflow to task in DB
          await query(
            `UPDATE pm_tasks SET workflow_id = $1 WHERE id = $2`,
            [workflow.id, task.id]
          );
          task.workflow_id = workflow.id;
        }
      }
    }

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
