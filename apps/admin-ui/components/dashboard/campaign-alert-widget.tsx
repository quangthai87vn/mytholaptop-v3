"use client";

import type { OverdueCampaign } from "@/lib/workspace/db";
import { AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CampaignAlertWidgetProps {
  campaigns: OverdueCampaign[];
}

export function CampaignAlertWidget({ campaigns }: CampaignAlertWidgetProps) {
  if (campaigns.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-red-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="size-4 text-red-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">
            Chiến dịch quá hạn
          </h3>
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">
            {campaigns.length}
          </span>
        </div>
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
            Xem tất cả →
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/campaigns?highlight=${campaign.id}`}
            className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors group"
          >
            <div className="size-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate group-hover:text-red-700 transition-colors">
                {campaign.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-red-500 mt-0.5">
                <Calendar className="size-3" />
                <span>Quá hạn {campaign.days_overdue} ngày</span>
                <span className="text-slate-400">·</span>
                <span>end: {new Date(campaign.end_date).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
            <ExternalLink className="size-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
