"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clapperboard, CheckCircle2, Clock, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceKpiOverview } from "@/lib/workspace/types-kpi";

export function ContentPipelineWidget() {
  const [overview, setOverview] = useState<WorkspaceKpiOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kpi?type=overview")
      .then((r) => r.json())
      .then((d) => setOverview(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !overview) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Clapperboard className="size-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Content Pipeline</h3>
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    );
  }

  const items = [
    {
      label: "Đang thực hiện",
      value: overview.tasksInProgress,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    {
      label: "Chờ đăng",
      value: overview.approvedNotPublished,
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "Đã đăng tháng này",
      value: overview.publishedThisMonth,
      icon: Clapperboard,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      label: "Quá hạn",
      value: overview.tasksOverdue,
      icon: AlertTriangle,
      color: overview.tasksOverdue > 0 ? "text-red-600" : "text-slate-400",
      bg: overview.tasksOverdue > 0 ? "bg-red-50" : "bg-slate-50",
      border: overview.tasksOverdue > 0 ? "border-red-200" : "border-slate-200",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Clapperboard className="size-4 text-blue-600" />
        </div>
        <h3 className="font-semibold text-slate-900 text-sm">Content Pipeline</h3>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2.5",
                item.bg,
                item.border
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("size-4", item.color)} />
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
              <span className={cn("text-lg font-bold", item.color)}>{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Publish rate */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
          <span>Tỷ lệ đăng tháng</span>
          <span className="font-semibold text-slate-700">
            {overview.tasksInProgress + overview.tasksPublished > 0
              ? Math.round(
                  (overview.publishedThisMonth /
                    Math.max(overview.tasksInProgress + overview.tasksPublished, 1)) *
                    100
                )
              : 0}
            %
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
            style={{
              width: `${
                overview.tasksInProgress + overview.tasksPublished > 0
                  ? Math.min(
                      (overview.publishedThisMonth /
                        Math.max(overview.tasksInProgress + overview.tasksPublished, 1)) *
                        100,
                      100
                    )
                  : 0
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
