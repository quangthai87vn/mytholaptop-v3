"use client";

import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { Clapperboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MediaStatsWidgetProps {
  tasks: Task[];
}

export function MediaStatsWidget({ tasks }: MediaStatsWidgetProps) {
  const statusCounts = tasks.reduce(
    (acc, task) => {
      if (task.status === "completed") {
        acc.completed++;
      } else if (task.status !== "cancelled") {
        acc.inProgress++;
      }
      return acc;
    },
    { completed: 0, inProgress: 0 }
  );

  const totalThisMonth = tasks.filter((t) => {
    if (t.status !== "completed" || !t.published_at) return false;
    const pubDate = new Date(t.published_at);
    const now = new Date();
    return pubDate.getMonth() === now.getMonth() && pubDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm">Sản xuất nội dung</h3>
        <Link href="/media-workflow">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
            Xem pipeline →
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        <div className="flex items-center">
          <div className="flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors min-w-[70px]">
            <div className="text-lg font-bold text-green-600">{statusCounts.completed}</div>
            <div className="text-[10px] text-slate-500 text-center leading-tight">Hoàn thành</div>
          </div>
        </div>
        <div className="w-4 h-px bg-slate-200 mx-0.5" />
        <div className="flex items-center">
          <div className="flex flex-col items-center px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors min-w-[70px]">
            <div className="text-lg font-bold text-cyan-600">{statusCounts.inProgress}</div>
            <div className="text-[10px] text-slate-500 text-center leading-tight">Đang thực hiện</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-slate-900">{totalThisMonth}</div>
          <div className="text-xs text-slate-500">Đã đăng tháng này</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-slate-900">{tasks.length}</div>
          <div className="text-xs text-slate-500">Tổng nội dung</div>
        </div>
      </div>
    </div>
  );
}
