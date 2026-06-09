import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  getTaskCommentsWithRoles,
  createTaskComment,
  getCommentById,
  resolveMentions,
  logCommentActivity,
} from "@/lib/workspace/db";
import { notifyTaskComment, notifyTaskCommentMention } from "@/lib/workspace/notifications";
import { sanitizeContent } from "@/lib/workspace/types-comment";
import type { CommentWithRole } from "@/lib/workspace/db";

export const dynamic = "force-dynamic";

const COMMENT_RATE_LIMIT = {
  maxAttempts: 30,
  windowMs: 60 * 1000,
  lockDurationMs: 60 * 1000,
};

const CreateCommentSchema = z.object({
  content: z.string().min(1, "Nội dung bình luận không được để trống").max(10000),
  parentCommentId: z.string().uuid("ID bình luận cha không hợp lệ").optional().nullable(),
  mentions: z.array(z.string().uuid()).optional().default([]),
});

// GET /api/tasks/[id]/comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const comments = await getTaskCommentsWithRoles(id);
    const tree = buildCommentTree(comments);

    return NextResponse.json({ data: tree });
  } catch (error) {
    console.error("[API] GET /api/tasks/[id]/comments error:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách bình luận" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const sessionUser = (req as NextRequest & {
    _authUser?: { id: string; name: string; role: string };
  })._authUser;

  const userRole = sessionUser?.role ?? "viewer";

  if (userRole === "viewer") {
    return NextResponse.json(
      { error: "Không có quyền bình luận" },
      { status: 403 }
    );
  }

  // CSRF check
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  // Rate limit
  const rateLimit = await checkWorkspaceRateLimit(req, COMMENT_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimit.response;

  const { id: taskId } = await params;

  let body: z.infer<typeof CreateCommentSchema>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return NextResponse.json(
      { error: issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 422 }
    );
  }

  const { content, parentCommentId, mentions: explicitMentions } = parsed.data;

  // Sanitize
  const cleanContent = sanitizeContent(content);
  if (!cleanContent) {
    return NextResponse.json(
      { error: "Nội dung bình luận không được để trống sau khi kiểm tra" },
      { status: 422 }
    );
  }

  try {
    // Resolve mentions from content (if not provided explicitly)
    let resolvedMentionIds: string[];
    if (explicitMentions.length > 0) {
      resolvedMentionIds = explicitMentions;
    } else {
      resolvedMentionIds = await resolveMentions(cleanContent);
    }

    // Filter: remove self-mention
    const filteredMentions = resolvedMentionIds.filter((uid) => uid !== sessionUser!.id);

    // If reply, verify parent exists
    if (parentCommentId) {
      const parent = await getCommentById(parentCommentId);
      if (!parent || parent.task_id !== taskId) {
        return NextResponse.json(
          { error: "Bình luận cha không tồn tại hoặc không thuộc task này" },
          { status: 404 }
        );
      }
    }

    const comment = await createTaskComment({
      task_id: taskId,
      parent_comment_id: parentCommentId ?? undefined,
      author_id: sessionUser!.id,
      author_name: sessionUser!.name ?? "Unknown",
      content: cleanContent,
      is_ai_generated: false,
      mentions: filteredMentions,
    });

    // Activity log
    await logCommentActivity({
      taskId,
      commentId: comment.id,
      actorId: sessionUser!.id,
      actorName: sessionUser!.name ?? "Unknown",
      action: "comment_created",
      contentPreview: cleanContent,
    });

    // Notifications
    const { getTaskById } = await import("@/lib/workspace/db");
    const task = await getTaskById(taskId);

    if (task) {
      const assigneeRecipients = (task.assignee_ids ?? [])
        .filter((uid: string) => uid !== sessionUser!.id);

      if (assigneeRecipients.length > 0) {
        notifyTaskComment({
          taskId,
          taskTitle: task.title,
          commentAuthorId: sessionUser!.id,
          commentAuthorName: sessionUser!.name ?? "Unknown",
          commentPreview: cleanContent,
          recipientIds: assigneeRecipients,
        }).catch(console.error);
      }

      if (filteredMentions.length > 0) {
        notifyTaskCommentMention({
          taskId,
          taskTitle: task.title,
          commentAuthorId: sessionUser!.id,
          commentAuthorName: sessionUser!.name ?? "Unknown",
          commentPreview: cleanContent,
          mentionedUserIds: filteredMentions,
        }).catch(console.error);
      }
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/tasks/[id]/comments error:", error);
    return NextResponse.json(
      { error: "Không thể tạo bình luận" },
      { status: 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildCommentTree(
  comments: CommentWithRole[]
): (CommentWithRole & { replies: CommentWithRole[] })[] {
  const map = new Map<string, CommentWithRole & { replies: CommentWithRole[] }>();
  const roots: (CommentWithRole & { replies: CommentWithRole[] })[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
