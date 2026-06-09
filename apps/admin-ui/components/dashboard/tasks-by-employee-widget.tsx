"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserKpi } from "@/lib/workspace/types-kpi";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Clock, User } from "lucide-react";

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

interface UserKpiRow extends Pick<UserKpi, "userId" | "userName" | "tasksAssigned" | "tasksCompleted" | "tasksInProgress" | "tasksOverdue" | "completionRate"> {}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TasksByEmployeeWidget() {
  const [data, setData] = useState<UserKpiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kpi?type=user")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  const maxTasks = Math.max(...data.map((d) => d.tasksAssigned), 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <User className="size-4 text-violet-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Công việc theo nhân viên</h3>
          <p className="text-[10px] text-slate-400">Phân bổ &amp; tiến độ</p>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu nhân viên</p>
      ) : (
        <div className="space-y-4">
          {data.map((row, i) => (
            <div key={row.userId} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="size-7 border-2 border-white shadow-sm shrink-0">
                    <AvatarFallback className={cn("text-[9px]", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                      {getInitials(row.userName || "NN")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-slate-700 truncate">{row.userName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px]">
                  <span className="flex items-center gap-0.5 text-slate-500">
                    <Clock className="size-3" />
                    {row.tasksInProgress}
                  </span>
                  <span className="flex items-center gap-0.5 text-green-600">
                    <CheckCircle2 className="size-3" />
                    {row.tasksCompleted}
                  </span>
                  {row.tasksOverdue > 0 && (
                    <span className="flex items-center gap-0.5 text-red-500">
                      <AlertTriangle className="size-3" />
                      {row.tasksOverdue}
                    </span>
                  )}
                </div>
              </div>
              <MiniBar value={row.tasksAssigned} max={maxTasks} color="bg-violet-500" />
              <div className="flex items-center justify-between text-[9px] text-slate-400">
                <span>{row.tasksAssigned} công việc</span>
                <span className="font-medium text-violet-600">{Math.round(row.completionRate * 100)}% hoàn thành</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
