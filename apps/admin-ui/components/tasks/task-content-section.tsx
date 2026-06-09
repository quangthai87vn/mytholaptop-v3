"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Save,
  Loader2,
  Eye,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminFetch } from "@/lib/api/admin-fetch";

interface TaskContentData {
  id: string;
  task_id: string;
  content_type: string | null;
  content_title: string | null;
  content_body: string | null;
  content_status: string;
  rich_text: string | null;
  script: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskContentSectionProps {
  taskId: string;
  taskTitle: string;
  userRole?: string;
}

const CONTENT_STATUS_OPTIONS = [
  { value: "draft", label: "Bản nháp" },
  { value: "writing", label: "Đang viết" },
  { value: "internal_review", label: "Chờ duyệt nội bộ" },
  { value: "revision", label: "Cần chỉnh sửa" },
  { value: "approved", label: "Đã duyệt" },
  { value: "published", label: "Đã đăng" },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:          { label: "Bản nháp",          cls: "bg-slate-100 text-slate-700" },
  writing:        { label: "Đang viết",          cls: "bg-blue-100 text-blue-700" },
  internal_review:{ label: "Chờ duyệt nội bộ", cls: "bg-yellow-100 text-yellow-700" },
  revision:        { label: "Cần chỉnh sửa",      cls: "bg-orange-100 text-orange-700" },
  approved:        { label: "Đã duyệt",           cls: "bg-green-100 text-green-700" },
  published:      { label: "Đã đăng",             cls: "bg-emerald-100 text-emerald-700" },
};

export function TaskContentSection({ taskId, taskTitle, userRole }: TaskContentSectionProps) {
  const [content, setContent] = useState<TaskContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formStatus, setFormStatus] = useState("draft");

  const canEdit = userRole && ["super_admin", "admin", "editor", "intern"].includes(userRole);

  useEffect(() => {
    loadContent();
  }, [taskId]);

  async function loadContent() {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/content`);
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setContent(data.data);
          setFormTitle(data.data.content_title || "");
          setFormBody(data.data.content_body || "");
          setFormStatus(data.data.content_status || "draft");
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_title: formTitle,
          content_body: formBody,
          content_status: formStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Lưu thất bại");
        return;
      }
      toast.success("Đã lưu nội dung");
      setContent(data.data);
      setIsEditing(false);
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusCfg = STATUS_BADGE[content?.content_status || "draft"] ?? STATUS_BADGE.draft;
  const isEmpty = !content?.content_title && !content?.content_body;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-700">Chi tiết nội dung</span>
          {content && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          )}
        </div>
        {canEdit && !isEmpty && !isEditing && (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1.5">
            <FileText className="size-3" /> Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
          <FileText className="size-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Chưa có nội dung cho task này.</p>
          {canEdit && (
            <Button
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => setIsEditing(true)}
            >
              <FileText className="size-3.5" /> Tạo nội dung
            </Button>
          )}
        </div>
      )}

      {/* Read view */}
      {!isEditing && content && (
        <div className="space-y-3">
          {content.content_title && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tiêu đề</p>
              <p className="text-sm font-semibold text-slate-900">{content.content_title}</p>
            </div>
          )}
          {content.content_body && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nội dung</p>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono text-xs">
                {content.content_body}
              </div>
            </div>
          )}
          {content.notes && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Ghi chú</p>
              <p className="text-sm text-slate-600 bg-yellow-50 rounded-lg p-3 text-xs italic">
                {content.notes}
              </p>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
            <span>
              Cập nhật: {content.updated_at
                ? new Date(content.updated_at).toLocaleDateString("vi-VN", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                  })
                : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {isEditing && (
        <Dialog open={isEditing} onOpenChange={(open) => { if (!open) setIsEditing(false); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                Nội dung — {taskTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="ct-title">Tiêu đề nội dung</Label>
                <input
                  id="ct-title"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="VD: Bài viết Summer Sale 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-body">Nội dung</Label>
                <Textarea
                  id="ct-body"
                  placeholder="Nhập nội dung bài viết, kịch bản video..."
                  rows={8}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-status">Trạng thái nội dung</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger id="ct-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Huỷ
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="size-4 animate-spin mr-1" /> Đang lưu...</>
                ) : (
                  <><Save className="size-4 mr-1" /> Lưu nội dung</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
