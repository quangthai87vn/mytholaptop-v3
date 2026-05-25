"use client";

import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { PRIORITY_CONFIG } from "@/lib/workspace/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertTriangle, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DeadlineAlertWidgetProps {
  tasks: Task[];
}

export function DeadlineAlertWidget({ tasks }: DeadlineAlertWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < today && t.status !== "done"
  );
  const dueToday = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date).toDateString() === today.toDateString() &&
      t.status !== "done"
  );
  const dueSoon = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    const d = new Date(t.due_date);
    d.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  });

  const displayTasks = [...overdue, ...dueToday, ...dueSoon].slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm">Công việc đến hạn</h3>
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
            Xem tất cả →
          </Button>
        </Link>
      </div>

      {displayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="size-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
            <svg className="size-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Không có công việc đến hạn</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayTasks.map((task) => {
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < today;
            const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
            const priority = PRIORITY_CONFIG[task.priority];

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border transition-colors hover:bg-slate-50 cursor-pointer",
                  isOverdue
                    ? "border-red-200 bg-red-50/50 border-l-4 border-l-red-500"
                    : isDueToday
                    ? "border-orange-200 bg-orange-50/50 border-l-4 border-l-orange-500"
                    : "border-slate-100"
                )}
                onClick={() => (window.location.href = `/tasks/${task.id}`)}
              >
                {/* Priority icon */}
                <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0", priority.bgColor)}>
                  {isOverdue ? (
                    <AlertTriangle className={cn("size-4", priority.color)} />
                  ) : (
                    <Clock className={cn("size-4", isDueToday ? "text-orange-500" : "text-slate-400")} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {dueDate && (
                      <span className={cn(
                        "flex items-center gap-1",
                        isOverdue && "text-red-600 font-medium",
                        isDueToday && "text-orange-600"
                      )}>
                        <Calendar className="size-3" />
                        {isOverdue
                          ? `Quá hạn ${Math.abs(Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))} ngày`
                          : isDueToday
                          ? "Hôm nay"
                          : dueDate.toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                {task.assignee_ids.length > 0 && (
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-slate-100">
                      {String.fromCharCode(65)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
