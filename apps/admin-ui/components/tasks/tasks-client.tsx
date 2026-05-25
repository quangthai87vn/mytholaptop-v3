"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskForm } from "@/components/tasks/task-form";
import type { Task, TaskStatus, Project, Campaign } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, LayoutGrid, Kanban } from "lucide-react";
import { PRIORITY_CONFIG } from "@/lib/workspace/types";

interface TasksClientProps {
  initialTasks: Task[];
  projects: Project[];
  campaigns: Campaign[];
}

export function TasksClient({
  initialTasks,
  projects,
  campaigns,
}: TasksClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [view, setView] = useState<"kanban" | "grid">("kanban");

  const filteredTasks = tasks.filter((task) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const handleTaskMove = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success(`Đã chuyển "${task.title}" sang ${newStatus.replace("_", " ")}`);
      } catch {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
        toast.error("Không thể cập nhật trạng thái");
      }
    },
    [tasks]
  );

  const handleCreateTask = async (data: Partial<Task>) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Tạo thất bại");
    }
    const result = await res.json();
    setTasks((prev) => [result.data, ...prev]);
    toast.success("Đã tạo công việc mới");
  };

  const handleUpdateTask = async (data: Partial<Task>) => {
    if (!editingTask) return;
    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Cập nhật thất bại");
    }
    const result = await res.json();
    setTasks((prev) =>
      prev.map((t) => (t.id === editingTask.id ? result.data : t))
    );
    setEditingTask(null);
    toast.success("Đã cập nhật công việc");
  };

  const handleAddTask = (status: TaskStatus) => {
    setDefaultStatus(status);
    setEditingTask(null);
    setShowForm(true);
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < new Date() &&
        t.status !== "done"
    ).length,
  };

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tổng công việc", value: stats.total, color: "text-slate-700" },
          { label: "Đang làm", value: stats.in_progress, color: "text-cyan-600" },
          { label: "Review", value: stats.review, color: "text-orange-500" },
          { label: "Hoàn thành", value: stats.done, color: "text-green-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-lg border border-slate-200 p-3 text-center"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Tìm kiếm công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Độ ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.icon} {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
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

        <Button
          onClick={() => {
            setEditingTask(null);
            setDefaultStatus("todo");
            setShowForm(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" />
          Thêm công việc
        </Button>
      </div>

      {/* Overdue alert */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{stats.overdue} công việc đang quá hạn!</span>
        </div>
      )}

      {/* Kanban board */}
      {view === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskMove={handleTaskMove}
          onAddTask={handleAddTask}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => (window.location.href = `/tasks/${task.id}`)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-sm text-slate-900">{task.title}</h4>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span
                  className={`px-2 py-0.5 rounded ${
                    task.status === "done"
                      ? "bg-green-100 text-green-700"
                      : task.status === "in_progress"
                      ? "bg-cyan-100 text-cyan-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {task.status.replace("_", " ")}
                </span>
                {task.due_date && (
                  <span>{new Date(task.due_date).toLocaleDateString("vi-VN")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task form */}
      <TaskForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        projects={projects}
        campaigns={campaigns}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
