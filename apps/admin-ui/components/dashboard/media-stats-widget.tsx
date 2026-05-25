"use client";

import { cn } from "@/lib/utils";
import type { MediaWorkflow, MediaStage } from "@/lib/workspace/types";
import { MEDIA_PIPELINE_STAGES } from "@/lib/workspace/types";
import { Clapperboard, Eye, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface MediaStatsWidgetProps {
  workflows: MediaWorkflow[];
}

export function MediaStatsWidget({ workflows }: MediaStatsWidgetProps) {
  const stageCounts = MEDIA_PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.id] = workflows.filter((w) => w.status === stage.id).length;
      return acc;
    },
    {} as Record<MediaStage, number>
  );

  const totalThisMonth = workflows.filter((w) => {
    if (w.status !== "published") return false;
    if (!w.published_at) return false;
    const pubDate = new Date(w.published_at);
    const now = new Date();
    return pubDate.getMonth() === now.getMonth() && pubDate.getFullYear() === now.getFullYear();
  }).length;

  const topPerforming = workflows
    .filter((w) => w.status === "published" && Object.keys(w.engagement_metrics).length > 0)
    .sort((a, b) => {
      const aEng = Object.values(a.engagement_metrics).reduce((s, v) => s + (Number(v) || 0), 0);
      const bEng = Object.values(b.engagement_metrics).reduce((s, v) => s + (Number(v) || 0), 0);
      return bEng - aEng;
    })
    .slice(0, 3);

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

      {/* Pipeline stages */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {MEDIA_PIPELINE_STAGES.map((stage, i) => {
          const count = stageCounts[stage.id] ?? 0;
          return (
            <div key={stage.id} className="flex items-center">
              {i > 0 && (
                <div className="w-4 h-px bg-slate-200 mx-0.5" />
              )}
              <div className="flex flex-col items-center px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors min-w-[60px]">
                <div
                  className="text-lg font-bold"
                  style={{ color: stage.color }}
                >
                  {count}
                </div>
                <div className="text-[10px] text-slate-500 text-center leading-tight">
                  {stage.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-slate-900">{totalThisMonth}</div>
          <div className="text-xs text-slate-500">Đã đăng tháng này</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-slate-900">{workflows.length}</div>
          <div className="text-xs text-slate-500">Tổng nội dung</div>
        </div>
      </div>

      {/* Top performing */}
      {topPerforming.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Top nội dung
          </h4>
          <div className="space-y-2">
            {topPerforming.map((w, i) => {
              const totalEng = Object.values(w.engagement_metrics).reduce(
                (s, v) => s + (Number(v) || 0),
                0
              );
              return (
                <div key={w.id} className="flex items-center gap-2 text-sm">
                  <span className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                    i === 1 ? "bg-slate-100 text-slate-600" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-slate-700">{w.title}</span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {(totalEng / 1000).toFixed(1)}K tương tác
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
