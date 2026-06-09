import { NextRequest, NextResponse } from "next/server";
import { duplicateTask, getTaskById, createWorkflow, getMasterDataItems, query, writeWorkspaceAuditLog } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { hasPermission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requirePermission(req: NextRequest) {
  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return { allowed: false, response: NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 }) };
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return { allowed: false, response: NextResponse.json({ error: "Phiên đăng nhập hết hạn." }, { status: 401 }) };
  }
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, "tasks.create")) {
    return { allowed: false, response: NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 }) };
  }
  return {
    allowed: true as const,
    actorName: user.full_name || user.email || "System",
    userId: user.id,
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(req);
  if (!perm.allowed) return perm.response;

  try {
    const { id } = await params;

    const sourceTask = await getTaskById(id);
    if (!sourceTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const newTask = await duplicateTask(sourceTask, perm.actorName);

    // If source task has workflow, create new linked workflow for copy
    if (sourceTask.task_type) {
      const taskTypes = await getMasterDataItems("task_type");
      const taskTypeItem = taskTypes.find((t) => t.code === sourceTask.task_type);
      if (taskTypeItem?.metadata && typeof taskTypeItem.metadata === "object") {
        const cfg = taskTypeItem.metadata as Record<string, unknown>;
        if (cfg.creates_workflow === true) {
          const workflowType = typeof cfg.workflow_type === "string" ? cfg.workflow_type : sourceTask.task_type;
          const workflow = await createWorkflow({
            taskId: newTask.id,
            workflowType,
            title: newTask.content_title || newTask.title,
            description: newTask.description,
            contentTitle: newTask.content_title,
            contentHook: newTask.content_hook,
            contentGoal: typeof newTask.content_goal === "string" ? newTask.content_goal : undefined,
            relatedProduct: newTask.related_product,
            contentBody: newTask.content_body ?? undefined,
            callToAction: newTask.call_to_action,
            referenceLinks: newTask.reference_links ?? undefined,
            platform: typeof newTask.platform === "string" ? newTask.platform : undefined,
            platformIds: (newTask.metadata as Record<string, unknown> | undefined)?.platform_ids as string[] | undefined,
            projectId: newTask.project_id,
            campaignId: newTask.campaign_id,
            assigneeIds: newTask.assignee_ids,
            taskStatus: newTask.status,
          });
          await query(`UPDATE pm_tasks SET workflow_id = $1 WHERE id = $2`, [workflow.id, newTask.id]);
          newTask.workflow_id = workflow.id;
        }
      }
    }

    await writeWorkspaceAuditLog({
      actorId: perm.userId,
      actorName: perm.actorName,
      action: "duplicated",
      entityType: "task",
      entityId: newTask.id,
      entityName: newTask.title,
    });

    return NextResponse.json({ data: newTask }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/tasks/[id]/duplicate error:", error);
    return NextResponse.json({ error: "Failed to duplicate task" }, { status: 400 });
  }
}
