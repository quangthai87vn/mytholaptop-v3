"use client";

import type { WorkspaceStats } from "@/lib/workspace/types";
import { Target, Clock, AlertTriangle, Clapperboard, GraduationCap, FileText } from "lucide-react";

interface WorkspaceStatsWidgetProps {
  stats: WorkspaceStats;
}

const STAT_ITEMS = [
  { key: "active_projects", label: "Dự án đang hoạt động", icon: Target, color: "text-red-600 bg-red-50" },
  { key: "due_this_week", label: "Đến hạn tuần này", icon: Clock, color: "text-orange-600 bg-orange-50" },
  { key: "overdue_tasks", label: "Công việc quá hạn", icon: AlertTriangle, color: "text-red-700 bg-red-100" },
  { key: "published_this_month", label: "Đã đăng tháng này", icon: Clapperboard, color: "text-green-600 bg-green-50" },
  { key: "total_interns", label: "Thực tập sinh", icon: GraduationCap, color: "text-purple-600 bg-purple-50" },
] as const;

export function WorkspaceStatsWidget({ stats }: WorkspaceStatsWidgetProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STAT_ITEMS.map(({ key, label, icon: Icon, color }) => {
        const value = stats[key];
        return (
          <div
            key={key}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="size-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">
              {value}
            </div>
            <div className="text-xs text-slate-500 leading-tight">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
