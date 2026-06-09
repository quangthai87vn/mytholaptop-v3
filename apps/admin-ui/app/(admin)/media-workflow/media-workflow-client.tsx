"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { Task, Project, Campaign } from "@/lib/workspace/types";
import {
  toFormOptions,
  type KanbanColumnConfig,
  type FormOption,
} from "@/lib/workspace/master-data-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Kanban, LayoutGrid, Clapperboard } from "lucide-react";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";

interface MediaWorkflowClientProps {
  tasks: Task[];
  projects: Project[];
  campaigns: Campaign[];
  stages: KanbanColumnConfig[];
  /** Full task type items from master data (includes metadata) */
  taskTypes?: MasterDataItem[];
  /** Full channel items from master data (platform options) */
  channels?: MasterDataItem[];
  /** Task type color map for Kanban cards */
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
  /** Platform form options */
  platformOptions?: FormOption[];
}

export function MediaWorkflowClient({
  tasks: initialTasks,
  projects,
  campaigns,
  stages,
  taskTypes = [],
  channels = [],
  taskTypeColorMap = {},
  platformOptions = [],
}: MediaWorkflowClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [view, setView] = useState<"kanban" | "grid">("kanban");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Columns are already KanbanColumnConfig[] — passed from page.tsx (derived from master data)
  const columns: KanbanColumnConfig[] = stages;

  // Task type form options
  const taskTypeOptions: FormOption[] = useMemo(
    () =>
      taskTypes
        .filter((t) => t.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({
          code: t.code,
          name: t.name,
          color: t.color ?? "#6b7280",
        })),
    [taskTypes]
  );

  // Default Kanban status: first active master data item
  const defaultStatus = useMemo(() => {
    if (stages.length === 0) return "idea";
    const active = stages.filter((s) => s.id);
    if (active.length === 0) return "idea";
    return active[0].id;
  }, [stages]);

  // Stats per column
  const stats = useMemo(() => {
    const columnCodes = columns.map((c) => c.id);
    return {
      total: tasks.length,
      byStatus: Object.fromEntries(
        columnCodes.map((code) => [
          code,
          tasks.filter((t) => t.status === code).length,
        ])
      ),
    };
  }, [tasks, columns]);

  // Filtered tasks
  const filteredTasks = tasks.filter((task) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    // platform filter: check metadata.platform_ids array or fallback to platform field
    if (platformFilter !== "all") {
      const platformIds = (task.metadata?.platform_ids as string[] | undefined) ?? [];
      const fallback = task.platform ?? "";
      if (!platformIds.includes(platformFilter) && fallback !== platformFilter) {
        return false;
      }
    }
    if (taskTypeFilter !== "all" && task.task_type !== taskTypeFilter) {
      return false;
    }
    return true;
  });

  const paginatedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  // Kanban status move
  const handleTaskMove = useCallback(
    async (taskId: string, newStatus: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t
        )
      );

      try {
        const res = await adminFetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
        const col = columns.find((c) => c.id === newStatus);
        toast.success(`Đã chuyển "${task.title}" sang ${col?.title ?? newStatus}`);
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
        toast.error("Không thể cập nhật trạng thái");
      }
    },
    [tasks, columns]
  );

  const staffNameMap = useMemo(() => ({}), []);
  const staffRoleMap = useMemo(() => ({}), []);

  const projectNameMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects]
  );
  const campaignNameMap = useMemo(
    () => Object.fromEntries(campaigns.map((c) => [c.id, c.name])),
    [campaigns]
  );

  const statusOptions: FormOption[] = useMemo(
    () =>
      columns.map((c) => ({
        code: c.id,
        name: c.title,
        color: c.color,
      })),
    [columns]
  );

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
          <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
          <div className="text-xs text-slate-500">Tổng workflow</div>
        </div>
        {columns.slice(0, 3).map((col) => (
          <div key={col.id} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: col.color }}
            >
              {(stats.byStatus[col.id] as number) ?? 0}
            </div>
            <div className="text-xs text-slate-500">{col.title}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm nội dung..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Platform filter */}
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Nền tảng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nền tảng</SelectItem>
            {platformOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Task type filter */}
        <Select value={taskTypeFilter} onValueChange={(v) => { setTaskTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Loại công việc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {taskTypeOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "kanban"
                ? "bg-white shadow-sm text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
            title="Kanban"
          >
            <Kanban className="size-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "grid"
                ? "bg-white shadow-sm text-primary"
                : "text-slate-500 hover:text-slate-700"
            }`}
            title="Grid"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {view === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          columns={columns}
          onTaskMove={handleTaskMove}
          disableDrag={false}
          staffMap={staffNameMap}
          staffRoleMap={staffRoleMap}
          projectMap={projectNameMap}
          campaignMap={campaignNameMap}
          taskTypeColorMap={taskTypeColorMap}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedTasks.map((task) => {
              const statusCol = columns.find((c) => c.id === task.status);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => (window.location.href = `/tasks/${task.id}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm text-slate-900 line-clamp-2">
                      {task.title}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {statusCol ? (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: statusCol.bg, color: statusCol.color }}
                      >
                        {statusCol.title}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                        {task.status}
                      </span>
                    )}
                    {task.due_date && (
                      <span>
                        {new Date(task.due_date).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Clapperboard className="size-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-semibold text-slate-600">Không tìm thấy workflow</h3>
                <p className="text-slate-400 mt-1">
                  Thử thay đổi bộ lọc hoặc tạo task mới có loại tạo workflow
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
