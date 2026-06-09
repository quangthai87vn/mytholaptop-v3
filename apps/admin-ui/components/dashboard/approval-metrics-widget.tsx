"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceKpiOverview } from "@/lib/workspace/types-kpi";

export function ApprovalMetricsWidget() {
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
          <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <TrendingUp className="size-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Approval Metrics</h3>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const submitted = overview.approvalsSubmitted30d;
  const approved = overview.approvalsApproved30d;
  const rejected = overview.approvalsRejected30d;

  const approveRate = submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
  const rejectRate = submitted > 0 ? Math.round((rejected / submitted) * 100) : 0;
  const pending = submitted - approved - rejected;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <TrendingUp className="size-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Approval Metrics</h3>
        </div>
        <span className="text-[10px] text-slate-400">30 ngày</span>
      </div>

      {/* Approval funnel */}
      <div className="space-y-2 mb-4">
        <FunnelRow
          label="Đã gửi duyệt"
          count={submitted}
          total={Math.max(submitted, approved, rejected, 1)}
          color="bg-orange-400"
          icon={Clock}
          iconColor="text-orange-600"
        />
        <FunnelRow
          label="Đã duyệt"
          count={approved}
          total={Math.max(submitted, approved, rejected, 1)}
          color="bg-green-500"
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <FunnelRow
          label="Bị từ chối"
          count={rejected}
          total={Math.max(submitted, approved, rejected, 1)}
          color="bg-red-400"
          icon={XCircle}
          iconColor="text-red-600"
        />
      </div>

      {/* Rate badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{approveRate}%</div>
          <div className="text-[10px] text-green-600 font-medium">Tỷ lệ duyệt</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{rejectRate}%</div>
          <div className="text-[10px] text-red-600 font-medium">Tỷ lệ từ chối</div>
        </div>
      </div>

      {/* Pending count */}
      {pending > 0 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-slate-500">
            {pending} yêu cầu đang chờ duyệt
          </span>
        </div>
      )}
    </div>
  );
}

function FunnelRow({
  label,
  count,
  total,
  color,
  icon: Icon,
  iconColor,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("size-3.5 shrink-0", iconColor)} />
      <span className="text-[10px] text-slate-600 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-700 w-6 text-right">{count}</span>
    </div>
  );
}
