// ============================================================
// Notification Types — P6.5 Notification System
// ============================================================

export type NotificationType =
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "task_approved"
  | "task_rejected"
  | "task_submit_review"
  | "publish_scheduled"
  | "campaign_deadline"
  | "task_comment"     // P6.7
  | "task_comment_mention"  // P6.7
  | "system";

export type NotificationEntityType = "task" | "project" | "campaign" | "media_workflow" | "comment" | "system";

export interface Notification {
  id: string;
  userId: string;
  userName?: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  isRead: boolean;
  dedupKey?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationFilters {
  types?: NotificationType[];
  entityTypes?: NotificationEntityType[];
  isRead?: boolean;
  since?: string; // ISO date string
}

export interface NotificationCount {
  total: number;
  unread: number;
}

// ─── Notification helpers ────────────────────────────────────────

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  task_assigned: "Được giao việc",
  task_due_soon: "Sắp đến hạn",
  task_overdue: "Quá hạn",
  task_approved: "Đã duyệt",
  task_rejected: "Bị từ chối",
  task_submit_review: "Gửi duyệt",
  publish_scheduled: "Lên lịch đăng",
  campaign_deadline: "Deadline chiến dịch",
  task_comment: "Bình luận mới",          // P6.7
  task_comment_mention: "Được nhắc đến",  // P6.7
  system: "Hệ thống",
};

export const NOTIFICATION_COLORS: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  task_assigned: { icon: "UserCheck", color: "text-blue-600", bg: "bg-blue-50" },
  task_due_soon: { icon: "Clock", color: "text-orange-600", bg: "bg-orange-50" },
  task_overdue: { icon: "AlertTriangle", color: "text-red-600", bg: "bg-red-50" },
  task_approved: { icon: "CheckCircle2", color: "text-green-600", bg: "bg-green-50" },
  task_rejected: { icon: "XCircle", color: "text-red-600", bg: "bg-red-50" },
  task_submit_review: { icon: "Send", color: "text-orange-600", bg: "bg-orange-50" },
  publish_scheduled: { icon: "Calendar", color: "text-purple-600", bg: "bg-purple-50" },
  campaign_deadline: { icon: "Clapperboard", color: "text-pink-600", bg: "bg-pink-50" },
  task_comment: { icon: "MessageSquare", color: "text-cyan-600", bg: "bg-cyan-50" },          // P6.7
  task_comment_mention: { icon: "AtSign", color: "text-violet-600", bg: "bg-violet-50" },  // P6.7
  system: { icon: "Bell", color: "text-slate-600", bg: "bg-slate-50" },
};

// ─── Notification builder helpers ────────────────────────────────

export interface BuildNotificationParams {
  userId: string;
  userName?: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  dedupKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Build a dedup key for a notification.
 * Format: "type:entity_id[:sub]"
 */
export function buildDedupKey(type: NotificationType, entityId?: string, sub?: string): string {
  if (entityId && sub) return `${type}:${entityId}:${sub}`;
  if (entityId) return `${type}:${entityId}`;
  return `${type}:${sub ?? ""}`;
}
