/**
 * Notification Service — P6.5
 * Wraps createNotification with typed helpers for each notification type.
 * Handles deduplication automatically.
 */

import {
  createNotification,
  getAdmins,
} from "@/lib/workspace/db";

function buildDedup(type: string, entityId?: string, sub?: string): string {
  if (entityId && sub) return `${type}:${entityId}:${sub}`;
  if (entityId) return `${type}:${entityId}`;
  return `${type}:${sub ?? ""}`;
}

// ─── Task Notifications ──────────────────────────────────────────

/**
 * Notify assignees when a task is assigned to them.
 */
export async function notifyTaskAssigned(params: {
  taskId: string;
  taskTitle: string;
  assigneeIds: string[];
  assignedBy?: string;
}) {
  await Promise.all(
    params.assigneeIds.map((userId) =>
      createNotification({
        userId,
        type: "task_assigned",
        title: `Bạn được giao việc mới`,
        message: `"${params.taskTitle}" đã được giao cho bạn.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("task_assigned", params.taskId, userId),
      })
    )
  );
}

/**
 * Notify assignee when their task is approved.
 */
export async function notifyTaskApproved(params: {
  taskId: string;
  taskTitle: string;
  assigneeIds: string[];
  approvedBy: string;
  approvedByName: string;
}) {
  await Promise.all(
    params.assigneeIds.map((userId) =>
      createNotification({
        userId,
        type: "task_approved",
        title: `Nội dung đã được duyệt`,
        message: `"${params.taskTitle}" đã được duyệt bởi ${params.approvedByName}.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("task_approved", params.taskId),
      })
    )
  );
}

/**
 * Notify assignee when their task is rejected / needs revision.
 */
export async function notifyTaskRejected(params: {
  taskId: string;
  taskTitle: string;
  assigneeIds: string[];
  rejectedBy: string;
  rejectedByName: string;
  comment?: string;
}) {
  await Promise.all(
    params.assigneeIds.map((userId) =>
      createNotification({
        userId,
        type: "task_rejected",
        title: `Yêu cầu chỉnh sửa`,
        message: params.comment
          ? `"${params.taskTitle}" cần chỉnh sửa: ${params.comment.slice(0, 100)}`
          : `"${params.taskTitle}" cần được chỉnh sửa theo yêu cầu của ${params.rejectedByName}.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("task_rejected", params.taskId),
      })
    )
  );
}

/**
 * Notify admin when a task is submitted for review.
 */
export async function notifyTaskSubmitReview(params: {
  taskId: string;
  taskTitle: string;
  submittedBy: string;
  submittedByName: string;
}) {
  const admins = await getAdmins();
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        userName: admin.name,
        type: "task_submit_review",
        title: `Cần duyệt nội dung`,
        message: `"${params.taskTitle}" đã được gửi duyệt bởi ${params.submittedByName}.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("task_submit_review", params.taskId),
      })
    )
  );
}

/**
 * Notify assignee when task is overdue.
 * Call this from a cron/scheduled job.
 */
export async function notifyTaskOverdue(params: {
  taskId: string;
  taskTitle: string;
  assigneeIds: string[];
  daysOverdue: number;
}) {
  await Promise.all(
    params.assigneeIds.map((userId) =>
      createNotification({
        userId,
        type: "task_overdue",
        title: `Công việc quá hạn`,
        message: `"${params.taskTitle}" đã quá hạn ${params.daysOverdue} ngày. Vui lòng xử lý ngay.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("task_overdue", params.taskId),
      })
    )
  );
}

/**
 * Notify assignee when task is due soon (within N days).
 */
export async function notifyTaskDueSoon(params: {
  taskId: string;
  taskTitle: string;
  assigneeIds: string[];
  daysUntilDue: number;
}) {
  await Promise.all(
    params.assigneeIds.map((userId) =>
      createNotification({
        userId,
        type: "task_due_soon",
        title: `Công việc sắp đến hạn`,
        message: `"${params.taskTitle}" sẽ đến hạn trong ${params.daysUntilDue} ngày.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("task_due_soon", params.taskId),
      })
    )
  );
}

/**
 * Notify assignee when content is scheduled for publish.
 */
export async function notifyPublishScheduled(params: {
  taskId: string;
  taskTitle: string;
  assigneeIds: string[];
  publishDate: string;
}) {
  const dateStr = new Date(params.publishDate).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await Promise.all(
    params.assigneeIds.map((userId) =>
      createNotification({
        userId,
        type: "publish_scheduled",
        title: `Đã lên lịch đăng bài`,
        message: `"${params.taskTitle}" được lên lịch đăng vào ngày ${dateStr}.`,
        entityType: "task",
        entityId: params.taskId,
        dedupKey: buildDedup("publish_scheduled", params.taskId),
      })
    )
  );
}

// ─── Comment Notifications — P6.7 ─────────────────────────────────

/**
 * Notify participants when a new comment is added to a task.
 * Skips notification for the comment author.
 */
export async function notifyTaskComment(params: {
  taskId: string;
  taskTitle: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentPreview: string; // first 80 chars of content
  recipientIds: string[]; // assignees + author (excludes comment author)
}) {
  await Promise.all(
    params.recipientIds
      .filter((id) => id !== params.commentAuthorId)
      .map((userId) =>
        createNotification({
          userId,
          type: "task_comment",
          title: `Bình luận mới trên "${params.taskTitle.slice(0, 50)}"`,
          message: `${params.commentAuthorName}: ${params.commentPreview.slice(0, 80)}`,
          entityType: "task",
          entityId: params.taskId,
          dedupKey: buildDedup("task_comment", params.taskId, params.commentAuthorId),
        })
      )
  );
}

/**
 * Notify specific users when they are @mentioned in a comment.
 */
export async function notifyTaskCommentMention(params: {
  taskId: string;
  taskTitle: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentPreview: string;
  mentionedUserIds: string[];
}) {
  await Promise.all(
    params.mentionedUserIds
      .filter((id) => id !== params.commentAuthorId)
      .map((userId) =>
        createNotification({
          userId,
          type: "task_comment_mention",
          title: `${params.commentAuthorName} nhắc đến bạn`,
          message: `"${params.taskTitle.slice(0, 40)}": ${params.commentPreview.slice(0, 80)}`,
          entityType: "task",
          entityId: params.taskId,
          dedupKey: buildDedup("task_comment_mention", params.taskId, params.commentAuthorId),
        })
      )
  );
}
