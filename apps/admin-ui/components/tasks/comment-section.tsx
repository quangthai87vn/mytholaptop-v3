"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  CornerDownRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { TaskComment } from "@/lib/workspace/types";

interface CommentSectionProps {
  taskId: string;
  userId?: string;
  userRole?: string;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

function roleBadge(role: string) {
  const map: Record<string, { label: string; cls: string }> = {
    super_admin: { label: "Admin", cls: "bg-red-100 text-red-700" },
    admin: { label: "Quản trị", cls: "bg-orange-100 text-orange-700" },
    editor: { label: "Editor", cls: "bg-blue-100 text-blue-700" },
    viewer: { label: "Viewer", cls: "bg-slate-100 text-slate-600" },
  };
  const info = map[role] ?? { label: role, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase", info.cls)}>
      {info.label}
    </span>
  );
}

function renderContent(content: string) {
  // Escape HTML, then render @mentions as styled spans
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
  const withMentions = escaped.replace(
    /@([a-zA-Z0-9_.-]+)/g,
    '<span class="text-violet-600 font-medium bg-violet-50 rounded px-0.5">@$1</span>'
  );
  return { __html: withMentions };
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className={cn(
        "size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        colors[idx]
      )}
    >
      {initials}
    </div>
  );
}

interface CommentItemProps {
  comment: TaskComment & { replies?: (TaskComment & { replies?: unknown[] })[] };
  taskId: string;
  userId?: string;
  userRole?: string;
  onReply: (parentId: string) => void;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  replyTarget?: string | null;
  editTarget?: string | null;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditSubmit: (commentId: string) => void;
  onEditCancel: () => void;
  submitting?: boolean;
}

function CommentItem({
  comment,
  taskId,
  userId,
  userRole,
  onReply,
  onSubmitReply,
  onEdit,
  onDelete,
  replyTarget,
  editTarget,
  editValue,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  submitting,
}: CommentItemProps) {
  const isAuthor = comment.author_id === userId;
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  // Author can edit/delete their own comments; admins can manage all comments
  const canAuthor = isAdmin || isAuthor;
  const isEditing = editTarget === comment.id;
  const isReplying = replyTarget === comment.id;

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Avatar name={comment.author_name} />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">
              {comment.author_name}
            </span>
            {roleBadge(comment.author_role ?? "comment")}
            <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-[10px] text-slate-400 italic">(đã sửa)</span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-1.5 space-y-2">
              <Textarea
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                className="min-h-[80px] text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onEditSubmit(comment.id)}
                  className="h-7 text-xs gap-1"
                >
                  <Send className="size-3" /> Lưu
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEditCancel}
                  className="h-7 text-xs"
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="mt-1 text-sm text-slate-700 whitespace-pre-wrap"
              dangerouslySetInnerHTML={renderContent(comment.content)}
            />
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CornerDownRight className="size-3" />
                Trả lời
              </button>
              {canAuthor && (
                <>
                  <button
                    onClick={() => onEdit(comment.id, comment.content)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Edit2 className="size-3" />
                    Sửa
                  </button>
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-3" />
                    Xóa
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <ReplyForm
              onSubmit={(text) => onSubmitReply(comment.id, text)}
              onCancel={() => onReply(comment.id)}
              submitting={submitting}
            />
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-10 border-l-2 border-slate-100 pl-4 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply as TaskComment & { replies?: unknown[] }}
              taskId={taskId}
              userId={userId}
              userRole={userRole}
              onReply={onReply}
              onSubmitReply={onSubmitReply}
              onEdit={onEdit}
              onDelete={onDelete}
              replyTarget={replyTarget}
              editTarget={editTarget}
              editValue={editValue}
              onEditChange={onEditChange}
              onEditSubmit={onEditSubmit}
              onEditCancel={onEditCancel}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReplyFormProps {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  submitting?: boolean;
}

function ReplyForm({
  onSubmit,
  onCancel,
  submitting,
}: ReplyFormProps) {
  const [replyText, setReplyText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSubmit(replyText.trim());
    setReplyText("");
  };

  return (
    <div className="mt-2 ml-10 space-y-2">
      <form onSubmit={handleSubmit}>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Viết trả lời… (Dùng @tên để nhắc đến người khác)"
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
          rows={3}
          disabled={submitting}
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <Button
            type="submit"
            size="sm"
            disabled={!replyText.trim() || submitting}
            className="h-7 text-xs gap-1"
          >
            <Send className="size-3" />
            Gửi trả lời
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { setReplyText(""); onCancel(); }}
            className="h-7 text-xs"
          >
            Hủy
          </Button>
        </div>
      </form>
    </div>
  );
}

export function CommentSection({ taskId, userId, userRole }: CommentSectionProps) {
  const [comments, setComments] = useState<(TaskComment & { replies?: unknown[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canComment = userRole && ["editor", "admin", "super_admin", "intern"].includes(userRole);
  const canAuthor = userRole === "admin" || userRole === "super_admin";

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json();
      if (data.data) setComments(data.data);
    } catch {
      setError("Không thể tải bình luận");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          parentCommentId: replyTarget,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Không thể gửi bình luận");
        return;
      }
      setNewComment("");
      setReplyTarget(null);
      await fetchComments();
    } catch {
      setError("Lỗi khi gửi bình luận");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(commentId: string, content: string) {
    setEditTarget(commentId);
    setEditValue(content);
  }

  async function handleSubmitReply(parentId: string, text: string) {
    setSubmitting(true);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          parentCommentId: parentId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Không thể gửi trả lời");
        return;
      }
      setReplyTarget(null);
      await fetchComments();
    } catch {
      setError("Lỗi khi gửi trả lời");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(commentId: string) {
    if (!editValue.trim()) return;
    setSubmitting(true);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editValue.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Không thể sửa bình luận");
        return;
      }
      setEditTarget(null);
      setEditValue("");
      await fetchComments();
    } catch {
      setError("Lỗi khi sửa bình luận");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    setPendingDeleteCommentId(commentId);
  }

  const executeDeleteComment = async () => {
    const commentId = pendingDeleteCommentId;
    if (!commentId) return;
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Không thể xóa bình luận");
        return;
      }
      await fetchComments();
    } catch {
      setError("Lỗi khi xóa bình luận");
    } finally {
      setPendingDeleteCommentId(null);
    }
  };

  const totalComments = countComments(comments);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-cyan-600" />
          <h3 className="font-semibold text-sm text-slate-900">
            Thảo luận
          </h3>
          {totalComments > 0 && (
            <span className="px-1.5 py-0.5 bg-slate-100 rounded-full text-[10px] font-semibold text-slate-600">
              {totalComments}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Comment list */}
      <div className="space-y-4">
        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có bình luận nào</p>
            {canComment && (
              <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
            )}
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment as TaskComment & { replies?: unknown[] }}
              taskId={taskId}
              userId={userId}
              userRole={userRole}
              onReply={(id) => setReplyTarget(replyTarget === id ? null : id)}
              onSubmitReply={handleSubmitReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              replyTarget={replyTarget}
              editTarget={editTarget}
              editValue={editValue}
              onEditChange={setEditValue}
              onEditSubmit={handleEditSubmit}
              onEditCancel={() => setEditTarget(null)}
              submitting={submitting}
            />
          ))
        )}
      </div>

      {/* Comment form */}
      {canComment ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={
              replyTarget
                ? "Viết trả lời…"
                : "Viết bình luận… (Dùng @tên để nhắc đến người khác)"
            }
            className="min-h-[80px] text-sm resize-none"
            rows={3}
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Nhấn Enter để gửi (Shift+Enter để xuống dòng)
            </span>
            <div className="flex gap-2">
              {replyTarget && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyTarget(null)}
                  className="h-7 text-xs"
                >
                  Hủy trả lời
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!newComment.trim() || submitting}
                className="h-7 text-xs gap-1"
              >
                <Send className="size-3" />
                Gửi
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
          Bạn không có quyền bình luận (viewer)
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteCommentId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteCommentId(null); }}
        title="Xóa bình luận?"
        description="Bình luận này sẽ bị xóa vĩnh viễn."
        confirmLabel="Xóa"
        variant="destructive"
        onConfirm={executeDeleteComment}
      />
    </div>
  );
}

function countComments(comments: (TaskComment & { replies?: unknown[] })[]): number {
  return comments.reduce((acc, c) => {
    return acc + 1 + (c.replies?.length ?? 0);
  }, 0);
}
