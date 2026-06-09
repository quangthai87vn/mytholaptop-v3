import { NextRequest, NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask, archiveTask, restoreTask, duplicateTask, getMasterDataItems, createWorkflow, getWorkflowByTaskId, updateWorkflow, query } from "@/lib/workspace/db";
import { writeWorkspaceAuditLog } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { updateTaskSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { hasPermission, type Permission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { notifyTaskAssigned } from "@/lib/workspace/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<{ allowed: true; actorName: string; userId: string; role: string } | { allowed: false; response: NextResponse }> {
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
  return { allowed: true, actorName: user.full_name || user.email || "System", userId: user.id, role: user.role };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authReq = _req as NextRequest & { _authUser?: unknown };
    if (!authReq._authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("[API] GET /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(request, "tasks.update");
  if (!perm.allowed) return perm.response;

  try {
    const { id } = await params;
    const body = await request.json();

    // Dev-only debug logging for date fields
    if (process.env.NODE_ENV === "development") {
      console.debug("[API PUT /api/tasks] date fields in payload:", {
        taskId: id,
        start_date: body.start_date,
        due_date: body.due_date,
      });
    }

    // Strip empty-string UUID fields to avoid validation error
    // Also convert comma-separated strings to arrays for link fields
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

    // Track original body keys before Zod fills defaults
    const originalBodyKeys = new Set(Object.keys(body));

    const result = updateTaskSchema.safeParse(cleaned);
    if (!result.success) {
      return buildValidationResponse(result.error.issues);
    }

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

    const d = result.data;

    // Fetch old task for comparison (before any modifications)
    const oldTask = await getTaskById(id);
    if (!oldTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAdminRole = perm.role === "admin" || perm.role === "super_admin";
    const isCompletedTask = oldTask.status === "completed";

    if (isCompletedTask && !isAdminRole) {
      return NextResponse.json(
        { error: "Công việc đã hoàn thành. Chỉ Admin mới được phép chỉnh sửa.", code: "COMPLETED_TASK_ADMIN_ONLY" },
        { status: 403 }
      );
    }

    // Normalize legacy statuses
    if (d.status === "todo" || d.status === "backlog") {
      (d as Record<string, unknown>).status = "idea";
    }

    if (d.status && !activeStatusCodes.has(d.status)) {
      return NextResponse.json(
        { error: `Status "${d.status}" không tồn tại hoặc không active trong pm_master_data`, code: "INVALID_STATUS" },
        { status: 400 }
      );
    }
    if (d.task_type && d.task_type !== "" && !activeTypeCodes.has(d.task_type)) {
      // Allow inactive type ONLY if it already exists on this task (prevents new invalid types)
      const isExistingType = oldTask?.task_type === d.task_type;
      if (!isExistingType) {
        return NextResponse.json(
          { error: `Loại công việc "${d.task_type}" không tồn tại hoặc không active trong hệ thống. Vui lòng chọn loại khác hoặc để trống.`, code: "INVALID_TASK_TYPE" },
          { status: 400 }
        );
      }
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

    // ── Decide what goes to updateTask based on original payload ──
    // Zod fills .default([]) for absent fields, so we must detect if assignee_ids
    // was actually in the original request body to avoid wiping assignees on partial updates.
    const bodyHasAssigneeIds = originalBodyKeys.has("assignee_ids");

    const updateData: Record<string, unknown> = { ...result.data };
    if (!bodyHasAssigneeIds) {
      // Don't pass assignee_ids at all — let updateTask preserve old value
      delete updateData.assignee_ids;
    }

    const task = await updateTask(id, updateData, perm.actorName, perm.userId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // ── Workflow sync ───────────────────────────────────────────
    // Task status is the source of truth. Sync linked workflow status.
    if (task.workflow_id) {
      const newStatus = d.status ?? oldTask?.status;
      if (newStatus && newStatus !== oldTask?.status) {
        await updateWorkflow(task.workflow_id, { status: newStatus });
      }
      // If task_type changed, update workflow_type if needed
      if (d.task_type && d.task_type !== oldTask?.task_type) {
        const newTypeItem = taskTypes.find((t) => t.code === d.task_type);
        if (newTypeItem?.metadata && typeof newTypeItem.metadata === "object") {
          const cfg = newTypeItem.metadata as Record<string, unknown>;
          if (cfg.creates_workflow === true && cfg.workflow_type) {
            await updateWorkflow(task.workflow_id, {
              workflowType: cfg.workflow_type as string,
            });
          }
        }
      }
      // Sync platform_ids when metadata.platform_ids changes
      const newPlatformIds = (d.metadata as Record<string, unknown> | undefined)?.platform_ids as string[] | undefined;
      const oldPlatformIds = (oldTask?.metadata as Record<string, unknown> | undefined)?.platform_ids as string[] | undefined;
      if (
        newPlatformIds !== undefined &&
        JSON.stringify(newPlatformIds) !== JSON.stringify(oldPlatformIds)
      ) {
        await updateWorkflow(task.workflow_id, {
          platformIds: newPlatformIds.length > 0 ? newPlatformIds : undefined,
        });
      }
    } else if (d.task_type && d.task_type !== oldTask?.task_type) {
      // task_type changed from non-workflow to workflow type: auto-create workflow
      const newTypeItem = taskTypes.find((t) => t.code === d.task_type);
      if (newTypeItem?.metadata && typeof newTypeItem.metadata === "object") {
        const cfg = newTypeItem.metadata as Record<string, unknown>;
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
          await query(
            `UPDATE pm_tasks SET workflow_id = $1 WHERE id = $2`,
            [workflow.id, task.id]
          );
          task.workflow_id = workflow.id;
        }
      }
    }

    // Dev-only debug logging for saved values
    if (process.env.NODE_ENV === "development") {
      console.debug("[API PUT /api/tasks] saved task dates:", {
        taskId: id,
        start_date: (task as unknown as Record<string, unknown>).start_date,
        due_date: (task as unknown as Record<string, unknown>).due_date,
      });
    }

    // V3: Notify new assignees when assignees are added (not removed)
    const newAssigneeIds: string[] = (result.data.assignee_ids as string[] | undefined) ?? [];
    const oldAssigneeIds: string[] = (oldTask?.assignee_ids as string[] | null) ?? [];
    const addedAssignees = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));
    if (addedAssignees.length > 0) {
      notifyTaskAssigned({
        taskId: id,
        taskTitle: task.title,
        assigneeIds: addedAssignees,
        assignedBy: perm.userId,
      }).catch((e) => console.error("[Notifications] task_assigned error:", e));
    }

    const changes = Object.entries(result.data).map(([field, newVal]) => ({
      field,
      old: oldTask ? (oldTask as unknown as Record<string, unknown>)[field] : undefined,
      new: newVal,
    }));
    await writeWorkspaceAuditLog({
      actorId: perm.userId,
      actorName: perm.actorName,
      action: "updated",
      entityType: "task",
      entityId: id,
      entityName: task.title,
      changes,
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error("[API] PUT /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(req, "tasks.delete");
  if (!perm.allowed) return perm.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === "archive") {
      await archiveTask(id, perm.actorName, perm.userId);
      await writeWorkspaceAuditLog({
        actorId: perm.userId,
        actorName: perm.actorName,
        action: "archived",
        entityType: "task",
        entityId: id,
        entityName: undefined,
      });
      return NextResponse.json({ data: { success: true, archived: true } });
    }

    if (action === "restore") {
      const restored = await restoreTask(id, perm.actorName);
      await writeWorkspaceAuditLog({
        actorId: perm.userId,
        actorName: perm.actorName,
        action: "restored",
        entityType: "task",
        entityId: id,
        entityName: undefined,
      });
      return NextResponse.json({ data: { success: true, restored } });
    }

    const hardDelete = req.nextUrl.searchParams.get("hard") === "true";
    await deleteTask(id, hardDelete, perm.actorName);
    await writeWorkspaceAuditLog({
      actorId: perm.userId,
      actorName: perm.actorName,
      action: hardDelete ? "deleted" : "archived",
      entityType: "task",
      entityId: id,
      entityName: undefined,
    });
    return NextResponse.json({ data: { success: true, archived: false } });
  } catch (error) {
    console.error("[API] DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 400 });
  }
}
