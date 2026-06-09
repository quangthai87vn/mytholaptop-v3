"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Campaign, Task, CampaignStatus, Project } from "@/lib/workspace/types";
import { TASK_TYPE_LABELS, STATUS_CONFIG } from "@/lib/workspace/types";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  ExternalLink,
  Clapperboard,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-fetch";

interface CampaignStatusOption { code: string; name: string; color: string; }
interface CampaignTypeOption { code: string; name: string; }

interface CampaignDetailClientProps {
  campaign: Campaign;
  initialTasks: Task[];
  mediaTasks?: Task[];
  projects?: Project[];
  statusOptions?: CampaignStatusOption[];
  typeOptions?: CampaignTypeOption[];
}

/**
 * @deprecated STATUS_COLOR and STATUS_LABEL are fallback only.
 * Use getCampaignStatusStyle() with statusOptions from pm_master_data.
 */
const STATUS_COLOR: Record<string, string> = {
  planning: "bg-slate-100 text-slate-600",
  active: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-50 text-red-500",
};

const STATUS_LABEL: Record<string, string> = {
  planning: "Lên kế hoạch",
  active: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  archived: "Lưu trữ",
  cancelled: "Đã hủy",
};

function getCampaignStatusStyle(code: string, options: CampaignStatusOption[]) {
  const opt = options.find((o) => o.code === code);
  if (opt?.color) {
    const bg = `${opt.color}15`;
    return { label: opt.name, bgClass: "", inlineStyle: { backgroundColor: bg, color: opt.color } as React.CSSProperties };
  }
  return {
    label: STATUS_LABEL[code] ?? code,
    bgClass: STATUS_COLOR[code] ?? "bg-slate-100 text-slate-600",
    inlineStyle: undefined,
  };
}

export function CampaignDetailClient({
  campaign,
  initialTasks,
  mediaTasks = [],
  projects = [],
  statusOptions = [],
  typeOptions = [],
}: CampaignDetailClientProps) {
  const router = useRouter();
  const [tasks] = useState<Task[]>(initialTasks);
  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Stats ──────────────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "completed").length;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed" && t.status !== "cancelled"
  ).length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Media task stats (from mediaTasks prop — filtered by media task types)
  const totalMediaTasks = mediaTasks.length;

  // Effective status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
  if (endDate) endDate.setHours(0, 0, 0, 0);
  const isOverdue = !!(endDate && endDate < today && campaign.status === "active");
  const daysOverdue = isOverdue ? Math.floor((today.getTime() - endDate!.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // ── Handlers ──────────────────────────────────────────────────
  const handleUpdate = async (data: Partial<Campaign>) => {
    setDeleting(true); // reuse state var
    try {
      const res = await adminFetch(`/api/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Đã cập nhật chiến dịch");
      router.refresh();
      setEditOpen(false);
    } catch {
      toast.error("Không thể cập nhật chiến dịch");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/campaigns/${campaign.id}?hard=true`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Đã xóa chiến dịch");
      router.push("/campaigns");
    } catch {
      toast.error("Không thể xóa chiến dịch");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách chiến dịch
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-[#E60012]" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                {(() => {
                  const style = getCampaignStatusStyle(campaign.status, statusOptions);
                  return style.inlineStyle ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={style.inlineStyle}>
                      {style.label}
                    </span>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bgClass}`}>
                      {style.label}
                    </span>
                  );
                })()}
                {isOverdue && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600 flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    Quá hạn {daysOverdue} ngày
                  </span>
                )}
                {campaign.campaign_type && (
                  <Badge variant="outline">{campaign.campaign_type}</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-sm text-slate-500 mt-2">{campaign.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Sửa
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
                Xóa
              </Button>
            </div>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {campaign.start_date && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="size-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Bắt đầu</div>
                  <div className="font-medium">
                    {new Date(campaign.start_date).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
            )}
            {campaign.end_date && (
              <div className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-500" : "text-slate-600"}`}>
                <Clock className="size-4 text-slate-400" />
                <div>
                  <div className={`text-xs ${isOverdue ? "text-red-400" : "text-slate-400"}`}>Kết thúc</div>
                  <div className="font-medium">
                    {new Date(campaign.end_date).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
            )}
            {campaign.budget && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <DollarSign className="size-4 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Ngân sách</div>
                  <div className="font-medium">{campaign.budget.toLocaleString("vi-VN")}đ</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Target className="size-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400">Công việc</div>
                <div className="font-medium">{totalTasks - totalMediaTasks} công việc</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clapperboard className="size-4 text-slate-400" />
              <div>
                <div className="text-xs text-slate-400">Media nội dung</div>
                <div className="font-medium">{totalMediaTasks} nội dung</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          {totalTasks > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Tiến độ công việc</span>
                <span className="font-medium">{progressPct}% ({doneTasks}/{totalTasks})</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
          )}

          {/* Channels */}
          {campaign.channels.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-400 mb-2">Kênh triển khai</div>
              <div className="flex flex-wrap gap-2">
                {campaign.channels.map((ch) => (
                  <Badge key={ch} variant="secondary">{ch}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListTodo className="size-4" />
            Công việc ({totalTasks})
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-1.5">
            <Clapperboard className="size-4" />
            Media nội dung ({totalMediaTasks})
          </TabsTrigger>
        </TabsList>

        {/* Tasks tab */}
        <TabsContent value="tasks">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">Danh sách công việc</h3>
              <Link href={`/tasks?campaign=${campaign.id}`}>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
                  Xem chi tiết →
                </Button>
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <ListTodo className="size-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có công việc nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isTaskOverdue ? "border-red-200 bg-red-50" : "border-slate-100 hover:border-slate-200"
                      } transition-colors`}
                    >
                      <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                        task.status === "completed" ? "bg-green-100" :
                        task.status === "review" ? "bg-orange-100" :
                        task.status === "working" ? "bg-cyan-100" :
                        task.status === "cancelled" ? "bg-slate-100" :
                        "bg-slate-50"
                      }`}>
                        {isTaskOverdue ? (
                          <AlertTriangle className="size-4 text-red-500" />
                        ) : task.status === "completed" ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <Clock className="size-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            task.status === "completed" ? "bg-green-100 text-green-700" :
                            task.status === "review" ? "bg-orange-100 text-orange-700" :
                            task.status === "working" ? "bg-cyan-100 text-cyan-700" :
                            task.status === "rework" ? "bg-red-100 text-red-700" :
                            task.status === "idea" ? "bg-purple-100 text-purple-700" :
                            task.status === "cancelled" ? "bg-slate-100 text-slate-500" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {task.status === "completed" ? "Hoàn thành" :
                             task.status === "review" ? "Chờ duyệt" :
                             task.status === "working" ? "Đang làm" :
                             task.status === "rework" ? "Cần sửa" :
                             task.status === "idea" ? "Ý tưởng" :
                             task.status === "cancelled" ? "Hủy" :
                             "Đã giao"}
                          </span>
                          {task.due_date && (
                            <span className={isTaskOverdue ? "text-red-500" : ""}>
                              {new Date(task.due_date).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                          {isTaskOverdue && <span className="text-red-500 font-medium">Quá hạn</span>}
                        </div>
                      </div>
                      <Link href={`/tasks/${task.id}`}>
                        <ExternalLink className="size-4 text-slate-400" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Media nội dung tab */}
        <TabsContent value="media">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 text-sm">Media nội dung</h3>
              <Link href={`/media-workflow?campaign=${campaign.id}`}>
                <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
                  Xem chi tiết →
                </Button>
              </Link>
            </div>

            {mediaTasks.length === 0 ? (
              <div className="text-center py-8">
                <Clapperboard className="size-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Chưa có nội dung nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mediaTasks.map((t) => {
                  const stageCfg = STATUS_CONFIG[t.status];
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      {t.status === "completed" ? (
                        <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                      ) : (
                        <div
                          className="size-5 rounded shrink-0"
                          style={{ backgroundColor: stageCfg?.color ?? "#94a3b8" }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          {t.task_type && (
                            <span>{TASK_TYPE_LABELS[t.task_type] ?? t.task_type}</span>
                          )}
                          {t.platform && (
                            <>
                              <span>·</span>
                              <span>{t.platform}</span>
                            </>
                          )}
                          {t.due_date && (
                            <>
                              <span>·</span>
                              <span>Hạn: {new Date(t.due_date).toLocaleDateString("vi-VN")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: stageCfg?.color ?? "#94a3b8" }}
                        >
                          {stageCfg?.label ?? t.status}
                        </span>
                        <Link href={`/tasks/${t.id}`}>
                          <ExternalLink className="size-4 text-slate-400" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <CampaignForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        campaign={campaign}
        projects={projects}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa vĩnh viễn chiến dịch?"
        description={`"${campaign.name}" sẽ bị xóa vĩnh viễn. Hành động này KHÔNG thể hoàn tác.`}
        warning="Tất cả dữ liệu liên quan đến chiến dịch này sẽ bị mất."
        confirmLabel="Xóa vĩnh viễn"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
