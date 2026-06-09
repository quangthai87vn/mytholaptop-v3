import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  getCommentById,
  updateTaskComment,
  deleteTaskComment,
  logCommentActivity,
} from "@/lib/workspace/db";
import { sanitizeContent } from "@/lib/workspace/types-comment";

export const dynamic = "force-dynamic";

const COMMENT_RATE_LIMIT = {
  maxAttempts: 30,
  windowMs: 60 * 1000,
  lockDurationMs: 60 * 1000,
};

const UpdateCommentSchema = z.object({
  content: z.string().min(1, "Nội dung bình luận không được để trống").max(10000),
});

// PUT /api/tasks/[id]/comments/[commentId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const sessionUser = (req as NextRequest & {
    _authUser?: { id: string; name: string; role: string };
  })._authUser;

  const userId = sessionUser?.id ?? "";
  const userRole = sessionUser?.role ?? "viewer";

  // CSRF check
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  // Rate limit
  const rateLimit = await checkWorkspaceRateLimit(req, COMMENT_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimit.response;

  const { id: taskId, commentId } = await params;

  const comment = await getCommentById(commentId);
  if (!comment || comment.task_id !== taskId) {
    return NextResponse.json(
      { error: "Bình luận không tồn tại" },
      { status: 404 }
    );
  }

  const isAdmin = userRole === "admin" || userRole === "super_admin";
  if (comment.author_id !== userId && !isAdmin) {
    return NextResponse.json(
      { error: "Không có quyền sửa bình luận này" },
      { status: 403 }
    );
  }

  let body: z.infer<typeof UpdateCommentSchema>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
  }

  const parsed = UpdateCommentSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return NextResponse.json(
      { error: issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 422 }
    );
  }

  const cleanContent = sanitizeContent(parsed.data.content);
  if (!cleanContent) {
    return NextResponse.json(
      { error: "Nội dung bình luận không được để trống sau khi kiểm tra" },
      { status: 422 }
    );
  }

  try {
    const updated = await updateTaskComment(commentId, cleanContent);
    if (!updated) {
      return NextResponse.json(
        { error: "Không thể cập nhật bình luận" },
        { status: 500 }
      );
    }

    // Activity log
    await logCommentActivity({
      taskId,
      commentId,
      actorId: sessionUser!.id,
      actorName: sessionUser!.name ?? "Unknown",
      action: "comment_updated",
      contentPreview: cleanContent,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[API] PUT comment error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi cập nhật bình luận" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]/comments/[commentId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const sessionUser = (req as NextRequest & {
    _authUser?: { id: string; name: string; role: string };
  })._authUser;

  const userId = sessionUser?.id ?? "";
  const userRole = sessionUser?.role ?? "viewer";

  // CSRF check
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  // Rate limit
  const rateLimit = await checkWorkspaceRateLimit(req, COMMENT_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimit.response;

  const { id: taskId, commentId } = await params;

  const comment = await getCommentById(commentId);
  if (!comment || comment.task_id !== taskId) {
    return NextResponse.json(
      { error: "Bình luận không tồn tại" },
      { status: 404 }
    );
  }

  const isAdmin = userRole === "admin" || userRole === "super_admin";
  if (comment.author_id !== userId && !isAdmin) {
    return NextResponse.json(
      { error: "Không có quyền xóa bình luận này" },
      { status: 403 }
    );
  }

  try {
    const deleted = await deleteTaskComment(commentId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Không thể xóa bình luận" },
        { status: 500 }
      );
    }

    // Activity log
    await logCommentActivity({
      taskId,
      commentId,
      actorId: sessionUser!.id,
      actorName: sessionUser!.name ?? "Unknown",
      action: "comment_deleted",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE comment error:", error);
    return NextResponse.json(
      { error: "Lỗi server khi xóa bình luận" },
      { status: 500 }
    );
  }
}
