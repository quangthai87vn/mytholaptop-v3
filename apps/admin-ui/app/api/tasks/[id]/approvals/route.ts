/**
 * GET /api/tasks/[id]/approvals
 * Lấy lịch sử approval của một task.
 * POST /api/tasks/[id]/approvals
 * Thực hiện action: submit_review / approve / reject / request_revision / publish
 *
 * Auth:
 * - GET: viewer+ (tất cả đã đăng nhập)
 * - POST: editor+ cho submit_review, admin+ cho approve/reject/publish, super_admin cho publish
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  getApprovalHistory,
  performApprovalAction,
} from "@/lib/workspace/db";
import {
  performApprovalSchema,
  buildValidationResponse,
} from "@/lib/workspace/validation";
import type { ApprovalAction } from "@/lib/workspace/types-approval";
import { getApprovalPermissions } from "@/lib/workspace/types-approval";
import {
  notifyTaskSubmitReview,
  notifyTaskApproved,
  notifyTaskRejected,
} from "@/lib/workspace/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET — lấy approval history
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const history = await getApprovalHistory(taskId);
    return NextResponse.json({ data: history, total: history.length });
  } catch (error) {
    console.error("[API] GET /api/tasks/[id]/approvals error:", error);
    return NextResponse.json(
      { error: "Không thể lấy lịch sử approval" },
      { status: 500 }
    );
  }
}

// POST — thực hiện approval action
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const body = await req.json();
    const parsed = performApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return buildValidationResponse(parsed.error.issues);
    }

    const data = parsed.data;
    const action = data.action as ApprovalAction;

    // Lấy user info từ session
    const sessionUser = (req as NextRequest & {
      _authUser?: { id: string; name: string; role: string };
    })._authUser;

    const userRole = (sessionUser?.role as "viewer" | "editor" | "admin" | "super_admin") ?? "viewer";
    const perms = getApprovalPermissions(userRole);

    // Role-based permission checks
    if (action === "submit_review") {
      if (!perms.canSubmitReview) {
        return NextResponse.json(
          { error: "Bạn không có quyền gửi duyệt" },
          { status: 403 }
        );
      }
    }

    if (["approve", "reject", "request_revision"].includes(action)) {
      if (!perms.canApprove) {
        return NextResponse.json(
          { error: "Chỉ admin mới có quyền duyệt/từ chối content" },
          { status: 403 }
        );
      }
    }

    if (action === "publish") {
      if (!perms.canPublish) {
        return NextResponse.json(
          { error: "Chỉ super_admin mới có quyền xuất bản" },
          { status: 403 }
        );
      }
    }

    // Validate comment required cho reject/request_revision
    if (["reject", "request_revision"].includes(action)) {
      if (!data.comment?.trim()) {
        return NextResponse.json(
          { error: "Bắt buộc nhập lý do khi từ chối hoặc yêu cầu chỉnh sửa" },
          { status: 400 }
        );
      }
    }

    const result = await performApprovalAction({
      taskId,
      action,
      reviewerId: sessionUser?.id,
      reviewerName: sessionUser?.name,
      comment: data.comment?.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Không thể thực hiện action" },
        { status: 400 }
      );
    }

    // Send notifications after successful approval action
    const task = result.task as unknown as Record<string, unknown>;
    const taskTitle = String(task.title ?? "Task không tên");
    const assigneeIds = (task.assignee_ids as string[] | null) ?? [];

    if (action === "submit_review") {
      notifyTaskSubmitReview({
        taskId,
        taskTitle,
        submittedBy: sessionUser?.id ?? "",
        submittedByName: sessionUser?.name ?? "Unknown",
      }).catch((e) => console.error("[Notifications] submit_review error:", e));
    }

    if (action === "approve") {
      notifyTaskApproved({
        taskId,
        taskTitle,
        assigneeIds,
        approvedBy: sessionUser?.id ?? "",
        approvedByName: sessionUser?.name ?? "Admin",
      }).catch((e) => console.error("[Notifications] approve error:", e));
    }

    if (action === "reject" || action === "request_revision") {
      notifyTaskRejected({
        taskId,
        taskTitle,
        assigneeIds,
        rejectedBy: sessionUser?.id ?? "",
        rejectedByName: sessionUser?.name ?? "Admin",
        comment: data.comment,
      }).catch((e) => console.error("[Notifications] reject error:", e));
    }

    return NextResponse.json({ data: result.task });
  } catch (error) {
    console.error("[API] POST /api/tasks/[id]/approvals error:", error);
    return NextResponse.json(
      { error: "Không thể thực hiện approval action" },
      { status: 500 }
    );
  }
}
