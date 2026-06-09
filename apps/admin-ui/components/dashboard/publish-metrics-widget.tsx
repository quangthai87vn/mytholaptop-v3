"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clapperboard, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentKpi } from "@/lib/workspace/types-kpi";

export function PublishMetricsWidget() {
  const [content, setContent] = useState<ContentKpi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kpi?type=content")
      .then((r) => r.json())
      .then((d) => setContent(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !content) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Clapperboard className="size-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Publish Metrics</h3>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const platforms = [
    { label: "Facebook", value: content.byPlatform.facebook ?? 0, color: "bg-blue-500" },
    { label: "Website", value: content.byPlatform.website ?? 0, color: "bg-indigo-500" },
    { label: "TikTok", value: content.byPlatform.tiktok ?? 0, color: "bg-pink-500" },
    { label: "YouTube", value: content.byPlatform.youtube ?? 0, color: "bg-red-500" },
    { label: "Zalo", value: content.byPlatform.zalo ?? 0, color: "bg-blue-400" },
  ].sort((a, b) => b.value - a.value);

  const maxPlatform = platforms[0]?.value ?? 1;
  const totalPublished = platforms.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Clapperboard className="size-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Publish Metrics</h3>
        </div>
        <span className="text-[10px] text-slate-400">Tổng: {totalPublished}</span>
      </div>

      {/* Weekly/Monthly */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="size-3 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-700">{content.publishedThisWeek}</div>
          <div className="text-[10px] text-blue-500">Tuần này</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="size-3 text-green-500" />
          </div>
          <div className="text-xl font-bold text-green-700">{content.publishedThisMonth}</div>
          <div className="text-[10px] text-green-500">Tháng này</div>
        </div>
      </div>

      {/* Platform breakdown */}
      <p className="text-[10px] text-slate-500 font-medium mb-2">Theo nền tảng</p>
      <div className="space-y-2">
        {platforms.map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-14 shrink-0">{p.label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", p.color)}
                style={{ width: `${maxPlatform > 0 ? (p.value / maxPlatform) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 w-4 text-right">
              {p.value}
            </span>
          </div>
        ))}
      </div>

      {/* Approved not published */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Chờ đăng</span>
        <span className="text-sm font-bold text-blue-600">{content.approvedNotPublished}</span>
      </div>
    </div>
  );
}
