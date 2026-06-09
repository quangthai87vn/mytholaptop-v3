// ============================================================
// Task Approval Types — P6.3 Approval Workflow
// ============================================================

export type ApprovalAction =
  | "submit_review"
  | "approve"
  | "reject"
  | "request_revision"
  | "publish";

export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  submit_review: "Gửi duyệt",
  approve: "Duyệt",
  reject: "Từ chối",
  request_revision: "Yêu cầu chỉnh sửa",
  publish: "Xuất bản",
};

export const APPROVAL_ACTION_COLORS: Record<ApprovalAction, string> = {
  submit_review: "bg-orange-100 text-orange-700 border-orange-200",
  approve: "bg-green-100 text-green-700 border-green-200",
  reject: "bg-red-100 text-red-700 border-red-200",
  request_revision: "bg-yellow-100 text-yellow-700 border-yellow-200",
  publish: "bg-blue-100 text-blue-700 border-blue-200",
};

export interface TaskApproval {
  id: string;
  task_id: string;
  reviewer_id?: string;
  reviewer_name?: string;
  action: ApprovalAction;
  comment?: string;
  from_stage?: string;
  to_stage?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Role permissions for approval workflow ────────────────────

export type ApprovalRole = "viewer" | "editor" | "intern" | "leader" | "admin" | "super_admin";

export interface ApprovalPermissions {
  canSubmitReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  canRequestRevision: boolean;
  canPublish: boolean;
  canViewHistory: boolean;
}

/**
 * Phase 3 Role Permission Matrix:
 * - Intern: create/update own tasks, submit_review, view history
 * - Leader: submit_review, approve/reject/request_revision, publish
 * - Admin: full access (approve/reject, publish)
 * - Super Admin: full access
 */
export function getApprovalPermissions(role: ApprovalRole): ApprovalPermissions {
  switch (role) {
    case "intern":
      return {
        canSubmitReview: true,   // Intern gửi bài để duyệt
        canApprove: false,
        canReject: false,
        canRequestRevision: false,
        canPublish: false,       // Intern không được xuất bản
        canViewHistory: true,
      };
    case "leader":
      return {
        canSubmitReview: true,
        canApprove: true,        // Leader có quyền duyệt
        canReject: true,
        canRequestRevision: true,
        canPublish: true,         // Leader có quyền xuất bản
        canViewHistory: true,
      };
    case "editor":
      return {
        canSubmitReview: true,
        canApprove: false,
        canReject: false,
        canRequestRevision: false,
        canPublish: false,
        canViewHistory: true,
      };
    case "admin":
      return {
        canSubmitReview: true,
        canApprove: true,
        canReject: true,
        canRequestRevision: true,
        canPublish: true,
        canViewHistory: true,
      };
    case "super_admin":
      return {
        canSubmitReview: true,
        canApprove: true,
        canReject: true,
        canRequestRevision: true,
        canPublish: true,
        canViewHistory: true,
      };
    case "viewer":
    default:
      return {
        canSubmitReview: false,
        canApprove: false,
        canReject: false,
        canRequestRevision: false,
        canPublish: false,
        canViewHistory: false,
      };
  }
}

// ─── Workflow stage helpers ────────────────────────────────────

export type WorkflowStageNew =
  | "idea"
  | "writing"
  | "internal_review"
  | "revision"
  | "approved"
  | "shooting"
  | "editing"
  | "scheduled"
  | "published";

/**
 * Xác định stage tiếp theo khi thực hiện action.
 */
export function getNextStage(
  currentStage: WorkflowStageNew,
  action: ApprovalAction
): WorkflowStageNew | null {
  switch (action) {
    case "submit_review":
      return currentStage === "writing" ? "internal_review" : null;
    case "approve":
      return currentStage === "internal_review" ? "approved" : null;
    case "reject":
      return currentStage === "internal_review" ? "revision" : null;
    case "request_revision":
      return currentStage === "internal_review" ? "revision" : null;
    case "publish":
      return currentStage === "scheduled" ? "published" : null;
    default:
      return null;
  }
}

/**
 * Kiểm tra action có hợp lệ với stage hiện tại không.
 */
export function canPerformAction(
  currentStage: WorkflowStageNew,
  action: ApprovalAction,
  role: ApprovalRole
): boolean {
  const perms = getApprovalPermissions(role);

  switch (action) {
    case "submit_review":
      return perms.canSubmitReview && currentStage === "writing";
    case "approve":
      return perms.canApprove && currentStage === "internal_review";
    case "reject":
      return perms.canReject && currentStage === "internal_review";
    case "request_revision":
      return perms.canRequestRevision && currentStage === "internal_review";
    case "publish":
      return perms.canPublish && (currentStage === "scheduled" || currentStage === "approved");
    default:
      return false;
  }
}
