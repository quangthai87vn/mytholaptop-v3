"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/workspace/types";

function displayShortDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("vi-VN", {
      day: "numeric", month: "short",
    });
  }
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "numeric", month: "short",
  });
}

interface OverdueTask extends Pick<Task, "id" | "title" | "status" | "due_date" | "assignee_ids" | "project_id"> {
  _assignee_names?: string[];
}

interface OverdueTasksWidgetProps {
  /** Pre-fetched tasks — if not provided, fetches from API */
  initialTasks?: Task[];
}

export function OverdueTasksWidget({ initialTasks }: OverdueTasksWidgetProps) {
  const [tasks, setTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(!initialTasks);

  useEffect(() => {
    if (initialTasks) {
      setTasks(initialTasks as OverdueTask[]);
      return;
    }
    fetch("/api/kpi?type=overdue")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) setTasks(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialTasks]);

  // Compute overdue from initialTasks if not pre-fetched
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const due = /^\d{4}-\d{2}-\d{2}$/.test(t.due_date)
      ? new Date(t.due_date + "T00:00:00")
      : new Date(t.due_date);
    return due < new Date() && t.status !== "completed" && t.status !== "cancelled";
  }).slice(0, 8);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle className="size-4 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Công việc quá hạn</h3>
            <p className="text-[10px] text-slate-400">{overdueTasks.length} việc quá hạn</p>
          </div>
        </div>
        <Link href="/tasks?filter=overdue">
          <button className="text-xs text-slate-400 hover:text-primary transition-colors">
            Xem tất cả →
          </button>
        </Link>
      </div>

      {overdueTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="size-8 text-green-400 mb-2" />
          <p className="text-sm text-slate-500">Không có công việc quá hạn</p>
        </div>
      ) : (
        <div className="space-y-2">
          {overdueTasks.map((task) => {
            const daysOverdue = task.due_date
              ? Math.ceil(
                  (new Date().getTime() -
                    (/^\d{4}-\d{2}-\d{2}$/.test(task.due_date)
                      ? new Date(task.due_date + "T00:00:00").getTime()
                      : new Date(task.due_date).getTime())) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;

            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="mt-0.5 shrink-0">
                  <AlertTriangle className="size-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <Calendar className="size-3" />
                      {displayShortDate(task.due_date ?? "")}
                    </span>
                    <span className="text-[10px] text-red-500 font-medium">
                      Quá {daysOverdue}d
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
