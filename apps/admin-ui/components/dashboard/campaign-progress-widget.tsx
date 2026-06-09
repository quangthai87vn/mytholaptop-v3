"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clapperboard, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignKpi } from "@/lib/workspace/types-kpi";
import Link from "next/link";

export function CampaignProgressWidget() {
  const [data, setData] = useState<CampaignKpi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kpi?type=campaign")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.data) setData(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const completionPct = Math.round((data.completionRate ?? 0) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <TrendingUp className="size-4 text-teal-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Tiến độ chiến dịch</h3>
          <p className="text-[10px] text-slate-400">{data.total} chiến dịch</p>
        </div>
      </div>

      {/* Completion rate */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Tỷ lệ hoàn thành</span>
          <span className={cn(
            "font-semibold",
            completionPct >= 70 ? "text-green-600" : completionPct >= 40 ? "text-orange-500" : "text-red-500"
          )}>
            {completionPct}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              completionPct >= 70 ? "bg-green-400" :
              completionPct >= 40 ? "bg-orange-400" : "bg-red-400"
            )}
            style={{ width: `${Math.max(2, completionPct)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-600">{data.active}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Đang chạy</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{data.completed}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Hoàn thành</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className={cn("text-xl font-bold", data.overdue > 0 ? "text-red-500" : "text-slate-400")}>
            {data.overdue}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Quá hạn</div>
        </div>
      </div>

      {/* Link */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <Link
          href="/campaigns"
          className="flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-primary transition-colors py-1"
        >
          <Clapperboard className="size-3.5" />
          Xem chiến dịch →
        </Link>
      </div>
    </div>
  );
}
