"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api/admin-fetch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceKpiOverview } from "@/lib/workspace/types-kpi";

interface TeamPerformanceWidgetProps {
  showTeam?: boolean; // editor chỉ thấy KPI cá nhân
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function TeamPerformanceWidget({ showTeam = false }: TeamPerformanceWidgetProps) {
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
          <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Target className="size-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Hiệu suất Team</h3>
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const completionRate = overview.tasksPublished + overview.tasksPublished > 0
    ? Math.round((overview.tasksPublished / Math.max(overview.tasksPublished + overview.tasksInProgress, 1)) * 100)
    : 0;

  const rejectionRate = overview.approvalsSubmitted30d > 0
    ? Math.round((overview.approvalsRejected30d / overview.approvalsSubmitted30d) * 100)
    : 0;

  const metrics = [
    {
      label: "Đã đăng tháng này",
      value: overview.publishedThisMonth,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      trend: "+12%",
      trendUp: true,
    },
    {
      label: "Gửi duyệt (30d)",
      value: overview.approvalsSubmitted30d,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      trend: null,
    },
    {
      label: "Đã duyệt (30d)",
      value: overview.approvalsApproved30d,
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: null,
    },
    {
      label: "Bị từ chối (30d)",
      value: overview.approvalsRejected30d,
      icon: XCircle,
      color: rejectionRate > 30 ? "text-red-600" : "text-slate-600",
      bg: rejectionRate > 30 ? "bg-red-50" : "bg-slate-50",
      trend: rejectionRate > 0 ? `${rejectionRate}%` : null,
      trendUp: false,
    },
    {
      label: "Quá hạn",
      value: overview.tasksOverdue,
      icon: AlertTriangle,
      color: overview.tasksOverdue > 0 ? "text-red-600" : "text-green-600",
      bg: overview.tasksOverdue > 0 ? "bg-red-50" : "bg-green-50",
      trend: null,
    },
    {
      label: "Đến hạn tuần này",
      value: overview.tasksDueThisWeek,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: null,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Target className="size-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Hiệu suất Team</h3>
        </div>
        <span className="text-xs text-slate-400">30 ngày</span>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{overview.tasksPublished}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Đã đăng</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{overview.approvalsApproved30d}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Đã duyệt</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{completionRate}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tỷ lệ đăng</div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={cn("rounded-lg border p-3", m.bg)}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className={cn("size-3.5", m.color)} />
                <span className="text-[10px] text-slate-600 font-medium">{m.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <div className={cn("text-xl font-bold", m.color)}>{m.value}</div>
                {m.trend && (
                  <span className={cn("text-[10px] font-medium", m.trendUp ? "text-green-600" : "text-red-600")}>
                    {m.trend}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Published by platform */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-500 font-medium mb-2">Đã đăng theo nền tảng</p>
        <div className="space-y-2">
          {[
            { label: "Facebook", value: overview.publishedFacebook, max: Math.max(overview.publishedFacebook, overview.publishedWebsite, overview.publishedTiktok, overview.publishedYoutube, overview.publishedZalo) },
            { label: "Website", value: overview.publishedWebsite, max: Math.max(overview.publishedFacebook, overview.publishedWebsite, overview.publishedTiktok, overview.publishedYoutube, overview.publishedZalo) },
            { label: "TikTok", value: overview.publishedTiktok, max: Math.max(overview.publishedFacebook, overview.publishedWebsite, overview.publishedTiktok, overview.publishedYoutube, overview.publishedZalo) },
            { label: "YouTube", value: overview.publishedYoutube, max: Math.max(overview.publishedFacebook, overview.publishedWebsite, overview.publishedTiktok, overview.publishedYoutube, overview.publishedZalo) },
            { label: "Zalo", value: overview.publishedZalo, max: Math.max(overview.publishedFacebook, overview.publishedWebsite, overview.publishedTiktok, overview.publishedYoutube, overview.publishedZalo) },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16 shrink-0">{p.label}</span>
              <MiniBar value={p.value} max={p.max || 1} color="bg-blue-500" />
              <span className="text-[10px] font-semibold text-slate-700 w-4 text-right">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
