"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskActionPopup } from "@/components/tasks/task-action-popup";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { ArchiveConfirmDialog } from "@/components/tasks/archive-confirm-dialog";
import { CopyTaskDialog } from "@/components/tasks/copy-task-dialog";
import { CompleteConfirmDialog } from "@/components/tasks/complete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { adminFetch } from "@/lib/api/admin-fetch";
import { exportCampaignTaskReport } from "@/lib/workspace/task-report-export";
import { buildKanbanColumns, defaultStatusCode, toFormOptions, type FormOption, type KanbanColumnConfig } from "@/lib/workspace/master-data-helpers";
import type { Campaign, Project, Task } from "@/lib/workspace/types";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";
import { cn } from "@/lib/utils";
import { CalendarDays, Download, Plus, Search, SlidersHorizontal } from "lucide-react";

interface TasksClientProps {
  initialTasks: Task[];
  projects: Project[];
  campaigns: Campaign[];
  company?: {
    name?: string;
    website?: string;
    phone?: string;
    logoUrl?: string;
    address?: string;
  };
  staff?: Array<{ id: string; full_name: string; email: string; role: string }>;
  isSuperAdmin?: boolean;
  isIntern?: boolean;
  currentUser?: { id: string; role: string } | null;
  masterData?: {
    task_types?: MasterDataItem[];
    task_statuses?: MasterDataItem[];
    channels?: MasterDataItem[];
    content_tags?: MasterDataItem[];
  };
}

const STORAGE_KEY = "workspace.tasks.board";
const PAGE_SIZE_OPTIONS = [20, 30, 50, 100] as const;
const GRID_OPTIONS = [3, 4, 5, 6] as const;

const readBoardPrefs = () => {
  if (typeof window === "undefined") return { pageSize: 20, gridColumns: 4 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pageSize: 20, gridColumns: 4 };
    const parsed = JSON.parse(raw) as { pageSize?: number; gridColumns?: number };
    return {
      pageSize: PAGE_SIZE_OPTIONS.includes(parsed.pageSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? (parsed.pageSize as number) : 20,
      gridColumns: GRID_OPTIONS.includes(parsed.gridColumns as (typeof GRID_OPTIONS)[number]) ? (parsed.gridColumns as number) : 4,
    };
  } catch {
    return { pageSize: 20, gridColumns: 4 };
  }
};

export function TasksClient({
  initialTasks,
  projects,
  campaigns,
  company,
  staff = [],
  isSuperAdmin = false,
  isIntern = false,
  currentUser = null,
  masterData,
}: TasksClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks.filter((task) => !task.is_archived));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [pageSize, setPageSize] = useState<number>(20);
  const [gridColumns, setGridColumns] = useState<number>(4);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [copyingTask, setCopyingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [archivingTask, setArchivingTask] = useState<Task | null>(null);
  const [archiveMode, setArchiveMode] = useState<"archive" | "restore">("archive");
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [pendingCompleteStatus, setPendingCompleteStatus] = useState<string | null>(null);
  const [popupTask, setPopupTask] = useState<Task | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const prefs = readBoardPrefs();
    setPageSize(prefs.pageSize);
    setGridColumns(prefs.gridColumns);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ pageSize, gridColumns }));
  }, [pageSize, gridColumns]);

  const columns: KanbanColumnConfig[] = useMemo(() => buildKanbanColumns(masterData?.task_statuses ?? []), [masterData?.task_statuses]);
  const statusOptions: FormOption[] = useMemo(() => toFormOptions(masterData?.task_statuses ?? []), [masterData?.task_statuses]);
  const taskTypeOptions: FormOption[] = useMemo(() => toFormOptions(masterData?.task_types ?? []), [masterData?.task_types]);
  const platformOptions: FormOption[] = useMemo(() => toFormOptions(masterData?.channels ?? []), [masterData?.channels]);
  const defaultStatus = useMemo(() => defaultStatusCode(masterData?.task_statuses ?? []), [masterData?.task_statuses]);

  const taskTypeColorMap = useMemo(
    () =>
      Object.fromEntries(
        (masterData?.task_types ?? [])
          .filter((item) => item.is_active)
          .map((item) => [item.code, { color: item.color ?? "#6b7280", bgColor: item.bg_color ?? "bg-slate-100", label: item.name }])
      ),
    [masterData?.task_types]
  );

  const platformMap = useMemo(
    () =>
      Object.fromEntries(
        (masterData?.channels ?? [])
          .filter((item) => item.is_active)
          .map((item) => [item.code, { name: item.name, color: item.color ?? "#6b7280" }])
      ),
    [masterData?.channels]
  );

  const staffMap = useMemo(() => Object.fromEntries(staff.map((item) => [item.id, item.full_name])), [staff]);
  const staffRoleMap = useMemo(() => Object.fromEntries(staff.map((item) => [item.id, item.role])), [staff]);
  const projectMap = useMemo(() => Object.fromEntries(projects.map((item) => [item.id, item.name])), [projects]);
  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map((item) => [item.id, item.name])), [campaigns]);
  const filteredCampaigns = useMemo(
    () => (projectFilter === "all" ? campaigns : campaigns.filter((campaign) => campaign.project_id === projectFilter)),
    [campaigns, projectFilter]
  );

  useEffect(() => {
    if (campaignFilter === "all") return;
    const isValidCampaign = filteredCampaigns.some((campaign) => campaign.id === campaignFilter);
    if (!isValidCampaign) {
      setCampaignFilter("all");
    }
  }, [campaignFilter, filteredCampaigns]);

  const selectedCampaign = useMemo(
    () => (campaignFilter === "all" ? null : campaigns.find((campaign) => campaign.id === campaignFilter) ?? null),
    [campaignFilter, campaigns]
  );

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (projectFilter !== "all" && task.project_id !== projectFilter) return false;
      if (campaignFilter !== "all" && task.campaign_id !== campaignFilter) return false;
      if (assigneeFilter !== "all" && !task.assignee_ids.includes(assigneeFilter)) return false;
      if (taskTypeFilter !== "all" && task.task_type !== taskTypeFilter) return false;
      if (platformFilter !== "all") {
        const platformIds = (task.metadata?.platform_ids as string[] | undefined) ?? [];
        if (!platformIds.includes(platformFilter) && task.platform !== platformFilter) return false;
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, projectFilter, campaignFilter, assigneeFilter, taskTypeFilter, platformFilter, priorityFilter]);

  const boardTasks = useMemo(() => visibleTasks.filter((task) => task.is_archived !== true), [visibleTasks]);
  const gridTasks = useMemo(() => boardTasks.slice(0, Math.max(pageSize, boardTasks.length)), [boardTasks, pageSize]);

  const stats = useMemo(() => {
    const columnIds = columns.map((column) => column.id);
    return {
      total: boardTasks.length,
      byStatus: Object.fromEntries(columnIds.map((id) => [id, boardTasks.filter((task) => task.status === id).length])),
      overdue: boardTasks.filter((task) => task.due_date && new Date(task.due_date) < new Date() && !["completed", "cancelled"].includes(task.status)).length,
      archived: initialTasks.filter((task) => task.is_archived).length,
    };
  }, [boardTasks, columns, initialTasks]);

  const closeDialogs = useCallback(() => {
    setShowForm(false);
    setEditingTask(null);
    setCopyingTask(null);
    setDeletingTask(null);
    setArchivingTask(null);
    setCompletingTask(null);
    setPendingCompleteStatus(null);
  }, []);

  const openCreateDialog = useCallback((status?: string) => {
    const params = status ? `?status=${status}` : "";
    router.push(`/tasks/new${params}`);
  }, [router]);

  const handleEditTask = useCallback((task: Task) => {
    router.push(`/tasks/${task.id}/edit`);
  }, [router]);

  const handleCopyTask = useCallback((task: Task) => {
    setCopyingTask(task);
  }, []);

  const handleArchiveTask = useCallback((task: Task) => {
    setArchivingTask(task);
    setArchiveMode("archive");
  }, []);

  const handleRestoreTask = useCallback((task: Task) => {
    setArchivingTask(task);
    setArchiveMode("restore");
  }, []);

  const handleDeleteTask = useCallback((task: Task) => {
    setDeletingTask(task);
  }, []);

  const handleOpenPopup = useCallback((task: Task) => {
    setPopupTask(task);
  }, []);

  const mergeTaskState = useCallback((currentTask: Task, serverTask?: Task) => {
    if (!serverTask) return currentTask;

    const parseAssignees = (val: unknown): string[] | undefined => {
      if (val === undefined) return undefined;
      if (Array.isArray(val)) return val as string[];
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed.startsWith("{")) {
          const inner = trimmed.slice(1, -1);
          if (!inner) return [];
          return inner.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      return undefined;
    };

    const serverAssignees = parseAssignees(serverTask.assignee_ids);
    const result: Task = {
      ...currentTask,
      ...serverTask,
    };
    if (serverAssignees !== undefined) {
      result.assignee_ids = serverAssignees;
    }
    if (serverTask.metadata === undefined) {
      result.metadata = currentTask.metadata;
    }
    console.debug("[mergeTaskState]", {
      taskId: currentTask.id,
      serverHasAssignees: serverAssignees !== undefined,
      resultAssignees: result.assignee_ids,
      serverKeys: Object.keys(serverTask),
    });
    return result;
  }, []);

  const replaceTaskState = useCallback((taskId: string, nextTask: Task) => {
    console.debug("[replaceTaskState] taskId=", taskId, "assignees=", nextTask.assignee_ids, "status=", nextTask.status);
    setTasks((prev) => prev.map((item) => (item.id === taskId ? mergeTaskState(item, nextTask) : item)));
  }, [mergeTaskState]);

  const handleTaskMove = useCallback(async (taskId: string, newStatus: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    console.debug("[TasksClient] drag start", {
      taskId,
      beforeAssignees: task.assignee_ids,
      newStatus,
    });

    const optimisticTask = { ...task, status: newStatus as Task["status"] };
    replaceTaskState(taskId, optimisticTask);

    try {
      const res = await adminFetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      const result = await res.json();
      const serverTask = result.data as Task | undefined;
      console.debug("[TasksClient] drag response", {
        taskId,
        responseAssignees: serverTask?.assignee_ids,
        responseStatus: serverTask?.status,
      });
      if (serverTask) replaceTaskState(taskId, serverTask);
      toast.success(`Đã chuyển "${task.title}" sang ${columns.find((column) => column.id === newStatus)?.title ?? newStatus}`);
    } catch {
      replaceTaskState(taskId, task);
      toast.error("Không thể cập nhật trạng thái");
    }
  }, [columns, replaceTaskState, tasks]);

  const handleCreateSubmit = useCallback(async (data: Partial<Task>) => {
    const res = await adminFetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Create failed");
    const result = await res.json();
    setTasks((prev) => [result.data as Task, ...prev]);
    toast.success("Đã tạo công việc");
    closeDialogs();
  }, [closeDialogs]);

  const handleUpdateSubmit = useCallback(async (data: Partial<Task>) => {
    if (!editingTask?.id) return;
    console.debug("[TasksClient] form submit", {
      taskId: editingTask.id,
      beforeAssignees: editingTask.assignee_ids,
      submitAssignees: data.assignee_ids,
      payloadKeys: Object.keys(data),
    });
    const previous = tasks;
    setTasks((prev) => prev.map((item) => (item.id === editingTask.id ? { ...item, ...data } as Task : item)));
    const res = await adminFetch(`/api/tasks/${editingTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setTasks(previous);
      throw new Error("Update failed");
    }
    const result = await res.json();
    const serverTask = result.data as Task | undefined;
    console.debug("[TasksClient] form response", {
      taskId: editingTask.id,
      responseAssignees: serverTask?.assignee_ids,
    });
    if (serverTask) replaceTaskState(editingTask.id, serverTask);
    toast.success("Đã lưu công việc");
    closeDialogs();
  }, [closeDialogs, editingTask?.id, replaceTaskState, tasks]);

  const handleCopyConfirm = useCallback(async (task: Task) => {
    const res = await adminFetch(`/api/tasks/${task.id}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error("Duplicate failed");
    const result = await res.json();
    setTasks((prev) => [result.data as Task, ...prev]);
    toast.success("Đã sao chép công việc");
    closeDialogs();
  }, [closeDialogs]);

  const handleArchiveConfirm = useCallback(async (task: Task) => {
    const isRestore = archiveMode === "restore";
    const res = await adminFetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isRestore ? "restore" : "archive" }),
    });
    if (!res.ok) throw new Error(isRestore ? "Restore failed" : "Archive failed");
    setTasks((prev) => (isRestore ? prev.map((item) => (item.id === task.id ? { ...item, is_archived: false } : item)) : prev.filter((item) => item.id !== task.id)));
    toast.success(isRestore ? "Đã khôi phục công việc" : "Đã lưu trữ công việc");
    closeDialogs();
  }, [archiveMode, closeDialogs]);

  const handleDeleteConfirm = useCallback(async (task: Task) => {
    const res = await adminFetch(`/api/tasks/${task.id}?hard=true`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    toast.success("Đã xóa vĩnh viễn công việc");
    closeDialogs();
  }, [closeDialogs]);

  const handleCompleteConfirm = useCallback(async (task: Task) => {
    if (!pendingCompleteStatus) return;
    await handleTaskMove(task.id, pendingCompleteStatus);
    closeDialogs();
  }, [closeDialogs, handleTaskMove, pendingCompleteStatus]);

  const handleCompleteEdit = useCallback((task: Task) => {
    setCompletingTask(null);
    setPendingCompleteStatus(null);
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleExportCampaignReport = useCallback(async () => {
    if (!selectedCampaign) {
      toast.error("Vui lòng chọn chiến dịch để xuất báo cáo");
      return;
    }

    if (isExporting) return;

    const loadingToastId = toast.loading("Đang chuẩn bị xuất Excel...");
    setIsExporting(true);

    try {
      await exportCampaignTaskReport({
        tasks: visibleTasks,
        projects,
        campaigns,
        company,
        statusOptions,
        taskTypeOptions,
        staffMap,
        platformMap,
        campaignId: selectedCampaign.id,
        onStageChange: (stage) => {
          console.debug("[task-export]", stage);
          toast.loading(stage, { id: loadingToastId });
        },
      });
      toast.success(`Đã xuất báo cáo chiến dịch \"${selectedCampaign.name}\"`, { id: loadingToastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xuất báo cáo Excel";
      console.error("[task-export] failed", error);
      toast.error(message, { id: loadingToastId });
    } finally {
      setIsExporting(false);
    }
  }, [campaigns, company, isExporting, platformMap, projects, selectedCampaign, staffMap, statusOptions, taskTypeOptions, visibleTasks]);

  const handleStatusMove = useCallback(async (taskId: string, newStatus: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const shouldConfirmCompletion = newStatus === "completed" && !task.output_links?.length && !task.completion_note;
    if (shouldConfirmCompletion) {
      setCompletingTask(task);
      setPendingCompleteStatus(newStatus);
      return;
    }

    await handleTaskMove(taskId, newStatus);
  }, [handleTaskMove, tasks]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Tổng công việc</p>
          <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Quá hạn</p>
          <div className="mt-2 text-2xl font-semibold text-red-600">{stats.overdue}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Đã lưu trữ</p>
          <div className="mt-2 text-2xl font-semibold text-orange-600">{stats.archived}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Bộ lọc đang dùng</p>
          <div className="mt-2 text-2xl font-semibold text-slate-700">{[search, statusFilter, projectFilter, campaignFilter, assigneeFilter, taskTypeFilter, platformFilter].filter((value) => value !== "" && value !== "all").length}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm công việc..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {statusOptions.map((option) => <SelectItem key={option.code} value={option.code}>{option.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={projectFilter}
              onValueChange={(value) => {
                setProjectFilter(value);
              }}
            >
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Dự án" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dự án</SelectItem>
                {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Chiến dịch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chiến dịch</SelectItem>
                {filteredCampaigns.map((campaign) => <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      onClick={handleExportCampaignReport}
                      disabled={!selectedCampaign || isExporting}
                      className="gap-2"
                    >
                      <Download className="size-4" />
                      {isExporting ? "Đang xuất..." : "Xuất Excel"}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!selectedCampaign && (
                  <TooltipContent>
                    Chọn chiến dịch để xuất báo cáo Excel chi tiết.
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" onClick={() => setViewMode("kanban")} className={cn(viewMode === "kanban" && "border-primary text-primary")}>Kanban</Button>
            <Button variant="outline" onClick={() => setViewMode("grid")} className={cn(viewMode === "grid" && "border-primary text-primary")}>Lưới</Button>
            <Button onClick={() => openCreateDialog()} className="gap-2"><Plus className="size-4" />Thêm công việc</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{boardTasks.length} đang hiển thị</Badge>
          <Badge variant="outline">{platformOptions.length} nền tảng</Badge>
          <Badge variant="outline">{taskTypeOptions.length} loại công việc</Badge>
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          <KanbanBoard
            tasks={boardTasks}
            columns={columns}
            role={currentUser?.role}
            userId={currentUser?.id}
            onTaskMove={handleStatusMove}
            onAddTask={openCreateDialog}
            onEditTask={handleEditTask}
            onArchiveTask={isIntern ? undefined : handleArchiveTask}
            onRestoreTask={handleRestoreTask}
            onDeleteTask={isSuperAdmin ? handleDeleteTask : undefined}
            onCopyTask={handleCopyTask}
            disableDrag={false}
            staffMap={staffMap}
            staffRoleMap={staffRoleMap}
            projectMap={projectMap}
            campaignMap={campaignMap}
            platformMap={platformMap}
            taskTypeColorMap={taskTypeColorMap}
          />
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className={cn("grid gap-4", gridColumns === 3 && "md:grid-cols-2 xl:grid-cols-3", gridColumns === 4 && "md:grid-cols-2 xl:grid-cols-4", gridColumns === 5 && "md:grid-cols-3 xl:grid-cols-5", gridColumns === 6 && "md:grid-cols-3 xl:grid-cols-6")}>{gridTasks.map((task) => <div key={task.id} className="rounded-lg border p-4 shadow-sm">{task.title}</div>)}</div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><SlidersHorizontal className="size-4" />Bộ lọc phụ</div>
          <Separator orientation="vertical" className="h-6" />
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Người phụ trách" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhân sự</SelectItem>
              {staff.map((item) => <SelectItem key={item.id} value={item.id}>{item.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Loại công việc" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {taskTypeOptions.map((option) => <SelectItem key={option.code} value={option.code}>{option.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Nền tảng" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nền tảng</SelectItem>
              {platformOptions.map((option) => <SelectItem key={option.code} value={option.code}>{option.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Độ ưu tiên" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức</SelectItem>
              <SelectItem value="urgent">🔴 Khẩn cấp</SelectItem>
              <SelectItem value="high">🟠 Cao</SelectItem>
              <SelectItem value="normal">🔵 Bình thường</SelectItem>
              <SelectItem value="low">🟢 Thấp</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Số lượng" /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(gridColumns)} onValueChange={(value) => setGridColumns(Number(value))}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Cột lưới" /></SelectTrigger>
            <SelectContent>
              {GRID_OPTIONS.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowForm(true)} className="ml-auto gap-2"><CalendarDays className="size-4" />Mở form</Button>
        </div>
      </div>

      <TaskForm
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeDialogs();
        }}
        onSubmit={editingTask?.id ? handleUpdateSubmit : handleCreateSubmit}
        task={editingTask ?? undefined}
        projects={projects}
        campaigns={campaigns}
        defaultStatus={defaultStatus}
        statusOptions={statusOptions}
        taskTypeOptions={taskTypeOptions}
        taskTypesWithMeta={(masterData?.task_types ?? []).filter((item) => item.is_active).map((item) => ({ code: item.code, name: item.name, metadata: item.metadata }))}
        platformOptions={platformOptions}
        staff={staff}
        staffRoleMap={staffRoleMap}
        currentUser={currentUser}
      />

      <CopyTaskDialog open={!!copyingTask} task={copyingTask} onOpenChange={(open) => !open && setCopyingTask(null)} onConfirm={handleCopyConfirm} />
      <ArchiveConfirmDialog open={!!archivingTask} task={archivingTask} isRestore={archiveMode === "restore"} onOpenChange={(open) => !open && setArchivingTask(null)} onConfirm={handleArchiveConfirm} />
      <DeleteTaskDialog open={!!deletingTask} task={deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)} onConfirm={handleDeleteConfirm} />
      <CompleteConfirmDialog open={!!completingTask} task={completingTask} onOpenChange={(open) => !open && closeDialogs()} onConfirm={handleCompleteConfirm} onEdit={handleCompleteEdit} />

      <TaskActionPopup
        open={!!popupTask}
        task={popupTask}
        onOpenChange={(open) => !open && setPopupTask(null)}
        onEdit={handleEditTask}
        onCopy={handleCopyTask}
        onArchive={isIntern ? undefined : handleArchiveTask}
        onRestore={handleRestoreTask}
        onDelete={isSuperAdmin ? handleDeleteTask : undefined}
        role={currentUser?.role}
        staffMap={staffMap}
        staffRoleMap={staffRoleMap}
        taskTypeColorMap={taskTypeColorMap}
        projectMap={projectMap}
        campaignMap={campaignMap}
        platformMap={platformMap}
      />
    </div>
  );
}
