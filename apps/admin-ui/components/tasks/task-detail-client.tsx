"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  FileText,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  CheckSquare,
  Activity,
  Layers,
  Globe,
  Archive,
  Trash2,
  ExternalLink,
  Target,
  ShoppingCart,
  BookOpen,
  Star,
  HelpCircle,
  Heart,
  Video,
  Image,
  Edit3,
  Save,
} from "lucide-react";
import {
  STATUS_CONFIG,
  TASK_TYPE_LABELS,
  PLATFORM_LABELS,
  CONTENT_GOAL_LABELS,
  CONTENT_STATUS_LABELS,
  type Task,
  type TaskType,
  type ContentGoal,
  type ContentStatus,
} from "@/lib/workspace/types";
import { TaskAssetsSection } from "./task-assets-section";
import { ApprovalSection } from "./approval-section";
import { CommentSection } from "./comment-section";
import { TaskAssistantSection } from "./task-assistant-section";
import { ChecklistSection } from "./checklist-section";
import { TaskActivitySection } from "./task-activity-section";
import { TaskContentSection } from "./task-content-section";

interface StatusOption { code: string; name: string; color: string; }

interface TaskDetailClientProps {
  task: Task;
  userId?: string;
  userRole?: string;
  statusOptions?: StatusOption[];
}

export function TaskDetailClient({ task, userId, userRole, statusOptions = [] }: TaskDetailClientProps) {
  const router = useRouter();
  // Graceful fallback when status not in hardcoded STATUS_CONFIG
  const hardcodedStatusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];
  const statusConfig = hardcodedStatusConfig ?? {
    label: task.status,
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  };

  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Staff can update output_links + status
  const canEditOutput = userRole && ["super_admin", "admin", "editor", "intern"].includes(userRole);
  const [outputLinks, setOutputLinks] = useState<string>(
    (task.output_links ?? []).join(", ")
  );
  const [isSavingOutput, setIsSavingOutput] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(task.status);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  const handleSaveOutputLinks = async () => {
    setIsSavingOutput(true);
    try {
      const links = outputLinks.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output_links: links }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã lưu link xuất bản");
      router.refresh();
    } catch {
      toast.error("Không thể lưu link");
    } finally {
      setIsSavingOutput(false);
    }
  };

  const handleSaveStatus = async () => {
    if (newStatus === task.status) { setEditingStatus(false); return; }
    setIsSavingStatus(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || "Không thể cập nhật trạng thái";
        toast.error(msg);
        setNewStatus(task.status);
        return;
      }
      toast.success("Đã cập nhật trạng thái");
      setEditingStatus(false);
      router.refresh();
    } catch {
      toast.error("Không thể cập nhật trạng thái");
      setNewStatus(task.status);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã lưu trữ công việc");
      router.push("/tasks");
      router.refresh();
    } catch {
      toast.error("Không thể lưu trữ công việc");
    } finally {
      setIsArchiving(false);
      setShowArchiveDialog(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}?hard=true`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Đã xóa công việc");
      router.push("/tasks");
    } catch {
      toast.error("Không thể xóa công việc");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách công việc
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Task type + Workflow stage + Platform badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {task.task_type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                  <Layers className="size-3" />
                  {TASK_TYPE_LABELS[task.task_type as TaskType] ?? task.task_type}
                </span>
              )}
              {task.platform && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                  <Globe className="size-3" />
                  {PLATFORM_LABELS[task.platform] ?? task.platform}
                </span>
              )}
              {task.content_goal && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium border border-orange-200">
                  <Target className="size-3" />
                  {CONTENT_GOAL_LABELS[task.content_goal as ContentGoal] ?? task.content_goal}
                </span>
              )}
              {task.content_status && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium border border-violet-200">
                  <BookOpen className="size-3" />
                  {CONTENT_STATUS_LABELS[task.content_status as ContentStatus] ?? task.content_status}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
            {(userRole === "super_admin" || userRole === "admin" || userRole === "editor") && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => setShowArchiveDialog(true)}
                >
                  <Archive className="size-3.5" />
                  Lưu trữ
                </Button>
                {userRole === "super_admin" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Xóa
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          {task.due_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4 text-slate-400" />
              <span>
                Hạn: {new Date(task.due_date).toLocaleDateString("vi-VN")}
              </span>
            </div>
          )}
          {task.assignee_ids && task.assignee_ids.length > 0 && (
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-slate-400" />
              <span>Người phụ trách: {task.assignee_ids.length} người</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-8 mb-4">
          <TabsTrigger value="details" className="gap-2">
            <FileText className="size-4" />
            Chi tiết
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2 text-xs">
            Checklist
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2 text-xs">
            Nội dung
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            Tài liệu & Assets
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-2">
            <ShieldCheck className="size-4" />
            Phê duyệt
          </TabsTrigger>
          <TabsTrigger value="assistant" className="gap-2">
            <Sparkles className="size-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2">
            <MessageSquare className="size-4" />
            Thảo luận
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            Hoạt động
          </TabsTrigger>
        </TabsList>

        {/* Tab: Chi tiết */}
        <TabsContent value="details" className="space-y-4">
          {/* Content detail section */}
          {(task.content_title || task.content_hook || task.content_goal ||
            task.related_product || task.content_body ||
            task.call_to_action || task.reference_links?.length ||
            task.output_links?.length) && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FileText className="size-4 text-blue-500" />
                Chi tiết nội dung
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {task.content_title && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Tiêu đề nội dung</p>
                    <p className="text-slate-900 font-medium">{task.content_title}</p>
                  </div>
                )}
                {task.content_hook && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Câu mở đầu (Hook)</p>
                    <p className="text-slate-700 italic">{task.content_hook}</p>
                  </div>
                )}
                {task.content_goal && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Mục tiêu</p>
                    <p className="text-slate-900 flex items-center gap-1.5">
                      <Target className="size-3.5 text-orange-500" />
                      {CONTENT_GOAL_LABELS[task.content_goal as ContentGoal] ?? task.content_goal}
                    </p>
                  </div>
                )}
                {task.related_product && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Sản phẩm liên quan</p>
                    <p className="text-slate-900 flex items-center gap-1.5">
                      <ShoppingCart className="size-3.5 text-green-500" />
                      {task.related_product}
                    </p>
                  </div>
                )}
                {task.call_to_action && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Call to Action</p>
                    <p className="text-slate-900 font-medium">{task.call_to_action}</p>
                  </div>
                )}
                {task.reference_links && task.reference_links.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Link tham khảo</p>
                    <div className="flex flex-col gap-1">
                      {task.reference_links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="size-3" />
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {task.output_links && task.output_links.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Link đã xuất bản</p>
                    <div className="flex flex-col gap-1 mb-2">
                      {task.output_links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
                        >
                          <Globe className="size-3" />
                          {link}
                        </a>
                      ))}
                    </div>
                    {/* Staff can update output links */}
                    {canEditOutput && (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            placeholder="Cập nhật link đã xuất bản (phân cách bằng dấu phẩy)"
                            value={outputLinks}
                            onChange={(e) => setOutputLinks(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveOutputLinks}
                          disabled={isSavingOutput}
                          className="h-8 gap-1 text-xs"
                        >
                          <Save className="size-3" />
                          {isSavingOutput ? "Đang lưu..." : "Lưu"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {task.content_body && (
                <div className="mt-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">
                    {task.task_type === "video" || task.task_type === "livestream"
                      ? "Kịch bản video"
                      : task.task_type === "image"
                      ? "Yêu cầu thiết kế"
                      : "Nội dung bài viết"}
                  </p>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono text-xs max-h-64 overflow-y-auto">
                    {task.content_body}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            {task.description ? (
              <div className="prose prose-sm max-w-none">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Mô tả</h3>
                <div className="text-slate-600 whitespace-pre-wrap">
                  {task.description}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <FileText className="size-10 mx-auto mb-2 opacity-30" />
                <p>Không có mô tả</p>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Thông tin khác</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Staff can update status inline */}
              {canEditOutput ? (
                <div className="col-span-2">
                  <p className="text-slate-500">Trạng thái</p>
                  <div className="flex items-center gap-2 mt-1">
                    {editingStatus ? (
                      <>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger className="h-8 w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.code} value={opt.code}>
                                <span className="flex items-center gap-2">
                                  <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                                  {opt.name}
                                </span>
                              </SelectItem>
                            ))}
                            {statusOptions.length === 0 && (
                              <>
                                <SelectItem value="idea">Ý tưởng</SelectItem>
                                <SelectItem value="assigned">Đã giao</SelectItem>
                                <SelectItem value="working">Đang thực hiện</SelectItem>
                                <SelectItem value="review">Chờ duyệt</SelectItem>
                                <SelectItem value="rework">Cần sửa</SelectItem>
                                <SelectItem value="completed">Hoàn thành</SelectItem>
                                <SelectItem value="cancelled">Hủy</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={handleSaveStatus} disabled={isSavingStatus} className="h-8 gap-1">
                          <Save className="size-3" /> Lưu
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingStatus(false); setNewStatus(task.status); }} className="h-8">Hủy</Button>
                      </>
                    ) : (
                      <>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <button
                          onClick={() => setEditingStatus(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Edit3 className="size-3" /> Đổi trạng thái
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-500">Trạng thái</p>
                  <p className="text-slate-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </p>
                </div>
              )}
              <div>
                <p className="text-slate-500">Ngày tạo</p>
                <p className="text-slate-900">
                  {new Date(task.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Cập nhật lần cuối</p>
                <p className="text-slate-900">
                  {new Date(task.updated_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
              {task.start_date && (
                <div>
                  <p className="text-slate-500">Ngày bắt đầu</p>
                  <p className="text-slate-900">
                    {new Date(task.start_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              )}
              {task.due_date && (
                <div>
                  <p className="text-slate-500">Ngày hết hạn</p>
                  <p className="text-slate-900">
                    {new Date(task.due_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              )}
              {task.task_type && (
                <div>
                  <p className="text-slate-500">Loại công việc</p>
                  <p className="text-slate-900">{TASK_TYPE_LABELS[task.task_type as TaskType] ?? task.task_type}</p>
                </div>
              )}
              {task.platform && (
                <div>
                  <p className="text-slate-500">Nền tảng</p>
                  <p className="text-slate-900">{PLATFORM_LABELS[task.platform] ?? task.platform}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* P9: Tab: Checklist */}
        <TabsContent value="checklist">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ChecklistSection
              taskId={task.id}
              canManage={
                userRole === "super_admin" ||
                userRole === "admin" ||
                userRole === "editor" ||
                (userRole === "intern" && task.assignee_ids?.includes(userId ?? ""))
              }
            />
          </div>
        </TabsContent>

        {/* V3: Tab: Content */}
        <TabsContent value="content">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <TaskContentSection
              taskId={task.id}
              taskTitle={task.title}
              userRole={userRole}
            />
          </div>
        </TabsContent>

        {/* Tab: Assets */}
        <TabsContent value="assets">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <TaskAssetsSection taskId={task.id} />
          </div>
        </TabsContent>

        {/* Tab: Approval */}
        <TabsContent value="approval">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <ApprovalSection
              taskId={task.id}
              currentStage={task.workflow_stage}
              currentContentStatus={task.content_status}
              userRole={userRole}
            />
          </div>
        </TabsContent>

        {/* Tab: AI Assistant */}
        <TabsContent value="assistant">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <TaskAssistantSection task={task} userId={userId} userRole={userRole} />
          </div>
        </TabsContent>

        {/* Tab: Comments */}
        <TabsContent value="comments">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <CommentSection
              taskId={task.id}
              userId={userId}
              userRole={userRole}
            />
          </div>
        </TabsContent>

        {/* Tab: Hoạt động */}
        <TabsContent value="activity">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <TaskActivitySection taskId={task.id} />
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        title="Lưu trữ công việc"
        description={`Bạn có chắc muốn lưu trữ "${task.title}"? Công việc sẽ bị ẩn khỏi danh sách nhưng vẫn được giữ lại trong hệ thống.`}
        warning="Hành động này có thể hoàn tác."
        confirmLabel="Lưu trữ"
        variant="warning"
        loading={isArchiving}
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa vĩnh viễn công việc"
        description={`Bạn có chắc muốn xóa vĩnh viễn "${task.title}"? Hành động này KHÔNG thể hoàn tác.`}
        warning="Tất cả dữ liệu liên quan đến công việc này sẽ bị mất."
        confirmLabel="Xóa vĩnh viễn"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
