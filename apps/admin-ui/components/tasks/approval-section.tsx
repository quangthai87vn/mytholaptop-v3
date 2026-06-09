"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Send,
  ShieldCheck,
  History,
  User,
} from "lucide-react";
import {
  type TaskApproval,
  type ApprovalAction,
  APPROVAL_ACTION_LABELS,
  APPROVAL_ACTION_COLORS,
  getApprovalPermissions,
} from "@/lib/workspace/types-approval";
import { WORKFLOW_STAGE_LABELS } from "@/lib/workspace/types";
import { adminFetch } from "@/lib/api/admin-fetch";

interface ApprovalSectionProps {
  taskId: string;
  currentStage?: string;
  userRole?: string;
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

export function ApprovalSection({
  taskId,
  currentStage,
  currentContentStatus,
  userRole = "viewer",
}: ApprovalSectionProps & { currentContentStatus?: string }) {
  const router = useRouter();
  const [history, setHistory] = useState<TaskApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Phase 3: Ưu tiên dùng content_status, fallback về stage cũ
  const stage = currentContentStatus ?? currentStage ?? "draft";
  const role = userRole as "viewer" | "editor" | "intern" | "leader" | "admin" | "super_admin";
  const perms = getApprovalPermissions(role);

  useEffect(() => {
    fetchHistory();
    fetchUserInfo();
  }, [taskId]);

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await adminFetch(`/api/tasks/${taskId}/approvals`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data || []);
      }
    } catch {
      toast.error("Không thể tải lịch sử duyệt");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserInfo() {
    try {
      const res = await adminFetch("/api/admin/me");
      if (res.ok) {
        const data = await res.json();
        setUserInfo(data.data || null);
      }
    } catch {
      // viewer không có quyền
    }
  }

  async function performAction(action: ApprovalAction, comment?: string) {
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Thao tác thất bại");
      }

      toast.success(`Đã ${APPROVAL_ACTION_LABELS[action].toLowerCase()}`);
      setRejectReason("");
      setRevisionNote("");
      setShowRejectDialog(false);
      setShowRevisionDialog(false);
      await fetchHistory();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setActionLoading(false);
    }
  }

  function getActionIcon(action: ApprovalAction) {
    switch (action) {
      case "approve":
        return <CheckCircle2 className="size-4 text-green-600" />;
      case "reject":
        return <XCircle className="size-4 text-red-600" />;
      case "request_revision":
        return <AlertTriangle className="size-4 text-yellow-600" />;
      case "publish":
        return <Globe className="size-4 text-blue-600" />;
      case "submit_review":
        return <Send className="size-4 text-orange-600" />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="size-5 text-slate-600" />
        <span className="font-medium text-slate-700">Lịch sử duyệt</span>
        {history.length > 0 && (
          <span className="text-sm text-slate-400">({history.length})</span>
        )}
      </div>

      {/* Action Buttons */}
      {stage === "writing" && perms.canSubmitReview && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Send className="size-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800 mb-1">
                Sẵn sàng gửi duyệt?
              </p>
              <p className="text-xs text-orange-600 mb-3">
                Nội dung đã hoàn tất và sẵn sàng để review.
              </p>
              <Button
                size="sm"
                onClick={() => performAction("submit_review")}
                disabled={actionLoading}
                className="bg-orange-600 hover:bg-orange-700 gap-1.5"
              >
                <Send className="size-3.5" />
                Gửi duyệt
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === "internal_review" && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <ShieldCheck className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-800">
                Đang trong giai đoạn Review nội bộ
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Chờ duyệt hoặc yêu cầu chỉnh sửa.
              </p>
            </div>
          </div>

          {perms.canApprove ? (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => performAction("approve")}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 gap-1.5"
              >
                <CheckCircle2 className="size-3.5" />
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRevisionDialog(true)}
                disabled={actionLoading}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 gap-1.5"
              >
                <AlertTriangle className="size-3.5" />
                Yêu cầu chỉnh sửa
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                disabled={actionLoading}
                className="gap-1.5"
              >
                <XCircle className="size-3.5" />
                Từ chối
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Chỉ admin/leader mới có quyền duyệt/từ chối content.
            </p>
          )}
        </div>
      )}

      {stage === "approved" && perms.canPublish && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Globe className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 mb-1">
                Nội dung đã được duyệt
              </p>
              <p className="text-xs text-blue-600 mb-3">
                Sẵn sàng xuất bản lên kênh.
              </p>
              <Button
                size="sm"
                onClick={() => performAction("publish")}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 gap-1.5"
              >
                <Globe className="size-3.5" />
                Xuất bản
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === "revision" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Đang chờ chỉnh sửa theo yêu cầu
              </p>
              <p className="text-xs text-yellow-600 mt-0.5">
                Vui lòng đọc comment từ admin/leader và cập nhật nội dung.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {loading ? (
        <div className="text-center py-6 text-slate-400 text-sm">Đang tải...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
          <History className="size-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Chưa có lịch sử duyệt</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getActionIcon(item.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${APPROVAL_ACTION_COLORS[item.action]}`}
                    >
                      {APPROVAL_ACTION_LABELS[item.action]}
                    </span>
                    {item.from_stage && item.to_stage && (
                      <span className="text-xs text-slate-500">
                        {WORKFLOW_STAGE_LABELS[item.from_stage as keyof typeof WORKFLOW_STAGE_LABELS] ?? item.from_stage}
                        {" → "}
                        {WORKFLOW_STAGE_LABELS[item.to_stage as keyof typeof WORKFLOW_STAGE_LABELS] ?? item.to_stage}
                      </span>
                    )}
                  </div>
                  {item.comment && (
                    <p className="text-sm text-slate-600 mt-1.5 italic">
                      &ldquo;{item.comment}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                    {item.reviewer_name && (
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {item.reviewer_name}
                      </span>
                    )}
                    <span>{new Date(item.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Từ chối nội dung
            </DialogTitle>
            <DialogDescription>
              Bắt buộc nhập lý do từ chối. Nội dung sẽ quay về stage Chỉnh sửa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Lý do từ chối</Label>
              <textarea
                id="reject-reason"
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="Mô tả chi tiết lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast.error("Bắt buộc nhập lý do từ chối");
                  return;
                }
                performAction("reject", rejectReason);
              }}
              disabled={actionLoading || !rejectReason.trim()}
            >
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Revision Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="size-5" />
              Yêu cầu chỉnh sửa
            </DialogTitle>
            <DialogDescription>
              Nhập nội dung cần chỉnh sửa. Nội dung sẽ quay về stage Chỉnh sửa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-2">
              <Label htmlFor="revision-note">Nội dung cần chỉnh sửa</Label>
              <textarea
                id="revision-note"
                className="w-full min-h-[100px] px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-200"
                placeholder="Mô tả nội dung cần chỉnh sửa..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (!revisionNote.trim()) {
                  toast.error("Bắt buộc nhập nội dung cần chỉnh sửa");
                  return;
                }
                performAction("request_revision", revisionNote);
              }}
              disabled={actionLoading || !revisionNote.trim()}
              className="bg-yellow-600 hover:bg-yellow-700 gap-1.5"
            >
              <AlertTriangle className="size-3.5" />
              Yêu cầu chỉnh sửa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
