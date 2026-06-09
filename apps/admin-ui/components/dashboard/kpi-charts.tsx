"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, CheckCircle2, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyTrendPoint } from "@/lib/workspace/types-kpi";

interface KpiChartsProps {
  weeks?: number;
}

function formatWeek(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function KpiCharts({ weeks = 8 }: KpiChartsProps) {
  const [trend, setTrend] = useState<WeeklyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/kpi?type=weekly&weeks=${weeks}`)
      .then((r) => r.json())
      .then((d) => setTrend(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weeks]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trend.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu trend</p>
      </div>
    );
  }

  const maxVal = Math.max(
    ...trend.map((t) => Math.max(t.completed, t.approved, t.published)),
    1
  );

  const barWidth = Math.max(8, Math.min(48, (100 / trend.length) - 2));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="size-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <TrendingUp className="size-4 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Xu hướng tuần</h3>
          <p className="text-[10px] text-slate-400">{weeks} tuần gần nhất</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {[
          { label: "Hoàn thành", color: "bg-blue-500", icon: CheckCircle2 },
          { label: "Duyệt", color: "bg-green-500", icon: CheckCircle2 },
          { label: "Đăng", color: "bg-purple-500", icon: Clapperboard },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={cn("size-2.5 rounded-full", l.color)} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-[9px] text-slate-400 absolute -left-6 top-0 bottom-0 py-1" style={{ height: "180px" }}>
          <span>{maxVal}</span>
          <span>{Math.round(maxVal / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div
          className="flex items-end gap-1.5 ml-4 pb-4 border-b border-slate-200"
          style={{ height: "180px" }}
        >
          {trend.map((t, i) => {
            const completedH = (t.completed / maxVal) * 180;
            const approvedH = (t.approved / maxVal) * 180;
            const publishedH = (t.published / maxVal) * 180;

            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end items-center gap-px group relative"
                style={{ minWidth: `${barWidth}px` }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-slate-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-semibold">{formatWeek(t.weekStart)}</div>
                  <div>Hoàn thành: {t.completed}</div>
                  <div>Duyệt: {t.approved}</div>
                  <div>Đăng: {t.published}</div>
                </div>

                {/* Stacked bars */}
                <div
                  className="w-full bg-blue-500 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${completedH}px` }}
                />
                <div
                  className="w-full bg-green-500 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${approvedH}px` }}
                />
                <div
                  className="w-full bg-purple-500 rounded-t transition-all hover:opacity-80"
                  style={{ height: `${publishedH}px` }}
                />

                {/* X-axis label */}
                <div className="absolute top-full mt-1 text-[9px] text-slate-400">
                  {formatWeek(t.weekStart)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-blue-700">
            {trend.reduce((s, t) => s + t.completed, 0)}
          </div>
          <div className="text-[9px] text-blue-500">Hoàn thành</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-green-700">
            {trend.reduce((s, t) => s + t.approved, 0)}
          </div>
          <div className="text-[9px] text-green-500">Duyệt</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-purple-700">
            {trend.reduce((s, t) => s + t.published, 0)}
          </div>
          <div className="text-[9px] text-purple-500">Đăng</div>
        </div>
      </div>
    </div>
  );
}
