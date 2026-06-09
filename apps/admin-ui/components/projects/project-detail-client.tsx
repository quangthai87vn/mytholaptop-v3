"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Project, Task, Campaign, ProjectStatus } from "@/lib/workspace/types";
import { STATUS_CONFIG, CONTENT_TYPE_LABELS } from "@/lib/workspace/types";
import { ProjectStatusBadge } from "./project-status-badge";
import { ProjectForm } from "./project-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Calendar,
  Target,
  Users,
  Clapperboard,
  DollarSign,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ListTodo,
  BarChart3,
  Tag,
} from "lucide-react";

interface ProjectDetailClientProps {
  project: Project;
  initialTasks: Task[];
  initialCampaigns: Campaign[];
  isIntern?: boolean;
}

export function ProjectDetailClient({
  project,
  initialTasks,
  initialCampaigns,
  isIntern = false,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [campaigns] = useState<Campaign[]>(initialCampaigns);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);

  // ── Thống kê ──────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "completed").length;
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed" && t.status !== "cancelled"
  ).length;
  const inProgressTasks = tasks.filter((t) => t.status === "working").length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ── Sắp xếp tasks theo kanban ─────────────────────────────
  const taskByStatus = {
    idea: tasks.filter((t) => t.status === "idea"),
    assigned: tasks.filter((t) => t.status === "assigned"),
    working: tasks.filter((t) => t.status === "working"),
    review: tasks.filter((t) => t.status === "review"),
    rework: tasks.filter((t) => t.status === "rework"),
    completed: tasks.filter((t) => t.status === "completed"),
    cancelled: tasks.filter((t) => t.status === "cancelled"),
  };

  const STATUS_ORDER = ["idea", "assigned", "working", "review", "rework", "completed"] as const;

  const STATUS_LABEL: Record<string, string> = {
    idea: "Ý tưởng",
    assigned: "Đã giao",
    working: "Đang thực hiện",
    review: "Chờ duyệt",
    rework: "Cần sửa",
    completed: "Hoàn thành",
    cancelled: "Hủy",
  };

  const STATUS_COLOR: Record<string, string> = {
    idea: "bg-purple-100 text-purple-700",
    assigned: "bg-slate-100 text-slate-700",
    working: "bg-cyan-100 text-cyan-700",
    review: "bg-orange-100 text-orange-700",
    rework: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-500",
  };

  const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
    planning: "Lên kế hoạch",
    active: "Đang chạy",
    paused: "Tạm dừng",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };

  const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
    product_launch: "Khai trương sản phẩm",
    seasonal: "Theo mùa",
    social_media: "Mạng xã hội",
    seo: "SEO",
    advertising: "Quảng cáo",
    "": "—",
  };

  // ── Handlers ───────────────────────────────────────────────
  const handleEdit = useCallback(async (data: Partial<Project>) => {
    setEditing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      router.refresh();
      setEditOpen(false);
    } catch {
      toast.error("Không thể cập nhật dự án. Vui lòng thử lại.");
    } finally {
      setEditing(false);
    }
  }, [project.id, router]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteConfirm(false);
      router.push("/projects");
    } catch {
      toast.error("Không thể xóa dự án. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  }, [project.id, router]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Back button ── */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách dự án
      </Link>

      {/* ── Header ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Colored top bar */}
        <div className="h-1.5" style={{ backgroundColor: project.color || "#E60012" }} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-slate-600 text-sm leading-relaxed">{project.description}</p>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {!isIntern && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                    className="gap-1.5"
                  >
                    <Pencil className="size-4" />
                    Sửa
                  </Button>
                  {!deleteConfirm ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(true)}
                      className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                      Xóa
                    </Button>
                  ) : (
                    <div className="flex gap-2 items-center bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-red-600 font-medium whitespace-nowrap">Xác nhận xóa?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="h-7 text-xs px-2"
                      >
                        {deleting ? "..." : "Xóa"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(false)}
                        className="h-7 text-xs px-2"
                      >
                        Hủy
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {project.start_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 text-slate-400" />
                <span>
                  {new Date(project.start_date).toLocaleDateString("vi-VN")}
                  {project.end_date && ` – ${new Date(project.end_date).toLocaleDateString("vi-VN")}`}
                </span>
              </div>
            )}
            {project.budget && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="size-4 text-slate-400" />
                <span>{project.budget.toLocaleString("vi-VN")} VNĐ</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Target className="size-4 text-slate-400" />
              <span>{totalTasks} công việc</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clapperboard className="size-4 text-slate-400" />
              <span>{campaigns.length} chiến dịch</span>
            </div>
          </div>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                  <Tag className="size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tổng công việc", value: totalTasks, icon: ListTodo, color: "text-slate-600" },
          { label: "Đang làm", value: inProgressTasks, icon: Clock, color: "text-cyan-600" },
          { label: "Hoàn thành", value: doneTasks, icon: CheckCircle2, color: "text-green-600" },
          { label: "Quá hạn", value: overdueTasks, icon: AlertCircle, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Progress bar ── */}
      {totalTasks > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium flex items-center gap-1.5">
                <BarChart3 className="size-4" />
                Tiến độ dự án
              </span>
              <span className="text-slate-900 font-semibold">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <div className="text-xs text-slate-500">
              {doneTasks}/{totalTasks} công việc hoàn thành
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs: Tasks + Campaigns ── */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListTodo className="size-4" />
            Công việc ({totalTasks})
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Clapperboard className="size-4" />
            Chiến dịch ({campaigns.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tasks tab ── */}
        <TabsContent value="tasks">
          {totalTasks === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <ListTodo className="size-12" />
                <p className="text-sm">Chưa có công việc nào trong dự án này.</p>
                <p className="text-xs">Công việc sẽ được quản lý qua trang Nhiệm vụ.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {STATUS_ORDER.map((status) => {
                const colTasks = taskByStatus[status];
                if (colTasks.length === 0) return null;
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${STATUS_COLOR[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="text-xs text-slate-400">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map((task) => {
                        const isOverdue =
                          task.due_date &&
                          new Date(task.due_date) < new Date() &&
                          task.status !== "completed" &&
                          task.status !== "cancelled";
                        return (
                          <div
                            key={task.id}
                            className={`bg-white rounded-lg border p-4 flex items-start gap-3 hover:shadow-sm transition-shadow ${
                              isOverdue ? "border-red-200 bg-red-50/30" : "border-slate-200"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium text-slate-800 ${isOverdue ? "text-red-700" : ""}`}>
                                    {task.title}
                                  </p>
                                  {task.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                {isOverdue && (
                                  <span className="shrink-0 inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                                    <AlertCircle className="size-3" />
                                    Quá hạn
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[task.status]}`}>
                                  {STATUS_LABEL[task.status]}
                                </span>
                                {task.due_date && (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="size-3" />
                                    {new Date(task.due_date).toLocaleDateString("vi-VN")}
                                  </span>
                                )}
                                {task.progress > 0 && task.status !== "completed" && (
                                  <div className="flex items-center gap-1.5">
                                    <Progress value={task.progress} className="h-1.5 w-16" />
                                    <span className="text-xs text-slate-400">{task.progress}%</span>
                                  </div>
                                )}
                                {task.assignee_ids.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                    <Users className="size-3" />
                                    {task.assignee_ids.length} người
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Campaigns tab ── */}
        <TabsContent value="campaigns">
          {campaigns.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-16 flex flex-col items-center gap-3 text-slate-400">
                <Clapperboard className="size-12" />
                <p className="text-sm">Chưa có chiến dịch nào trong dự án này.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
                  planning: "bg-slate-100 text-slate-600",
                  active: "bg-green-100 text-green-700",
                  paused: "bg-orange-100 text-orange-700",
                  completed: "bg-blue-100 text-blue-700",
                  cancelled: "bg-red-50 text-red-500",
                };
                return (
                  <Card key={campaign.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-slate-900 text-sm">{campaign.name}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CAMPAIGN_STATUS_COLOR[campaign.status]}`}>
                              {CAMPAIGN_STATUS_LABEL[campaign.status]}
                            </span>
                            {campaign.campaign_type && (
                              <Badge variant="outline" className="text-xs">
                                {CAMPAIGN_TYPE_LABEL[campaign.campaign_type] ?? campaign.campaign_type}
                              </Badge>
                            )}
                          </div>
                          {campaign.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{campaign.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                            {campaign.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {new Date(campaign.start_date).toLocaleDateString("vi-VN")}
                              </span>
                            )}
                            {campaign.budget && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="size-3" />
                                {campaign.budget.toLocaleString("vi-VN")} VNĐ
                              </span>
                            )}
                            {campaign.channels.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span>Kênh:</span>
                                {campaign.channels.map((ch) => (
                                  <Badge key={ch} variant="secondary" className="text-xs py-0">
                                    {ch}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ── */}
      <ProjectForm
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSubmit={handleEdit}
      />
    </div>
  );
}
