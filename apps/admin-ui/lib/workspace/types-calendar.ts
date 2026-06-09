// ============================================================
// Calendar Types — P6.4 Advanced Content Calendar
// ============================================================

import type { MediaPlatform } from "./types";

// ─── Event Types ────────────────────────────────────────────────

export type CalendarEventType =
  | "production_deadline"  // due_date — task cần hoàn thành
  | "publish_schedule"     // publish_date — ngày đăng bài
  | "campaign_deadline";   // campaign end_date

export type PublishStatus =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "overdue";

/**
 * Unified calendar event — shared shape for both task events and campaign events.
 * Task-specific fields are optional on campaign events, and vice versa.
 */
export interface CalendarEvent {
  id: string;
  eventType: CalendarEventType;
  // Task fields
  taskId?: string;
  title?: string;
  taskType?: string;
  dueDate?: string;
  publishDate?: string;
  /** @deprecated use status instead — WorkflowStage was removed from pm_tasks */
  workflowStage?: string;
  /** Task status (TaskStatus) */
  status?: string;
  publishStatus: PublishStatus;
  platform?: MediaPlatform;
  assigneeIds: string[];
  assigneeNames: string[];
  projectId?: string;
  projectName?: string;
  campaignId?: string;
  campaignName?: string;
  tags: string[];
  taskUrl?: string;
  // P10: Platform link fields
  websiteUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  // Campaign-specific aliases (for backwards compat)
  deadline?: string;
  channels?: string[];
}

// ─── Stats ─────────────────────────────────────────────────────

export interface CalendarStats {
  thisWeek: number;          // tasks due/publish this week
  approvedNotPublished: number;  // approved but no publish_date or future publish
  overdue: number;           // past due_date, not approved/published
  scheduledThisMonth: number;  // publish_date in current month
}

// ─── Filter ─────────────────────────────────────────────────────

export interface CalendarFilters {
  platforms?: string[];
  assignees?: string[];
  /** @deprecated workflow stages removed — use status filtering instead */
  workflowStages?: string[];
  taskTypes?: string[];
  projectIds?: string[];
  campaignIds?: string[];
  showProductionDeadline?: boolean;
  showPublishSchedule?: boolean;
  showCampaignDeadline?: boolean;
  /** Date range filter (ISO strings) */
  dateFrom?: string;
  dateTo?: string;
  /** Quick filters */
  overdue?: boolean;
  pendingApproval?: boolean;
  completed?: boolean;
}

// ─── View Mode ──────────────────────────────────────────────────

export type CalendarViewMode = "month" | "week" | "agenda" | "grid";

export type GridGroupBy = "date" | "task_type" | "platform" | "assignee" | "status";

// ─── Stage → Color mapping ──────────────────────────────────────

export const STAGE_STATUS_COLORS: Record<PublishStatus, { color: string; bg: string; label: string }> = {
  draft: {
    color: "text-slate-600",
    bg: "bg-slate-100 border-slate-200",
    label: "Bản nháp",
  },
  review: {
    color: "text-orange-700",
    bg: "bg-orange-100 border-orange-200",
    label: "Đang review",
  },
  approved: {
    color: "text-blue-700",
    bg: "bg-blue-100 border-blue-200",
    label: "Đã duyệt",
  },
  scheduled: {
    color: "text-purple-700",
    bg: "bg-purple-100 border-purple-200",
    label: "Đã lên lịch",
  },
  published: {
    color: "text-green-700",
    bg: "bg-green-100 border-green-200",
    label: "Đã đăng",
  },
  overdue: {
    color: "text-red-700",
    bg: "bg-red-100 border-red-200",
    label: "Quá hạn",
  },
};

export const PLATFORM_COLORS: Record<MediaPlatform, { color: string; bg: string }> = {
  facebook: { color: "text-blue-600", bg: "bg-blue-100" },
  website: { color: "text-green-600", bg: "bg-green-100" },
  tiktok: { color: "text-pink-600", bg: "bg-pink-100" },
  zalo: { color: "text-blue-500", bg: "bg-blue-50" },
  youtube: { color: "text-red-600", bg: "bg-red-100" },
  instagram: { color: "text-purple-600", bg: "bg-purple-100" },
};

export const EVENT_TYPE_COLORS: Record<CalendarEventType, { color: string; bg: string; label: string }> = {
  production_deadline: { color: "text-orange-600", bg: "bg-orange-50 border-orange-200", label: "Deadline" },
  publish_schedule: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Đăng bài" },
  campaign_deadline: { color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Campaign deadline" },
};

// ─── Compute publish status from task ───────────────────────────
// taskStatus param: TaskStatus value, workflowStage kept for backward compat

export function computePublishStatus(
  taskStatus?: string,
  publishDate?: string,
  dueDate?: string,
  /** @deprecated workflowStage removed — use taskStatus instead */
  _workflowStage?: string
): "draft" | "review" | "approved" | "scheduled" | "published" | "overdue" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const status = taskStatus ?? _workflowStage ?? "idea";

  // Published check
  if (status === "completed" && publishDate) {
    return "published";
  }

  // Overdue: past due_date but not completed/cancelled
  if (dueDate) {
    const due = new Date(dueDate);
    if (due < today && !["review", "completed", "cancelled"].includes(status)) {
      return "overdue";
    }
  }

  // Scheduled: has future publish_date
  if (publishDate) {
    const pub = new Date(publishDate);
    if (pub > today) return "scheduled";
  }

  // Status-based mapping
  switch (status) {
    case "completed":
      return "published";
    case "review":
      return "review";
    case "working":
    case "assigned":
    case "idea":
    default:
      return "draft";
  }
}
