"use client";

import type { InternRanking } from "@/lib/workspace/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TeamActivityWidgetProps {
  activities: {
    id: string;
    actor_name?: string | null;
    action: string;
    new_value?: string | null;
    created_at: string;
  }[];
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(name?: string | null) {
  if (!name) return "bg-slate-100 text-slate-600";
  const colors = ["bg-red-100 text-red-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-purple-100 text-purple-700", "bg-yellow-100 text-yellow-700"];
  return colors[name.charCodeAt(0) % colors.length];
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export function TeamActivityWidget({ activities }: TeamActivityWidgetProps) {
  // Group by time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeek = new Date(today.getTime() - 7 * 86400000);

  const grouped = {
    "Hôm nay": activities.filter((a) => new Date(a.created_at) >= today),
    "Hôm qua": activities.filter(
      (a) => new Date(a.created_at) >= yesterday && new Date(a.created_at) < today
    ),
    "Tuần này": activities.filter(
      (a) => new Date(a.created_at) >= thisWeek && new Date(a.created_at) < yesterday
    ),
  };

  const actionLabels: Record<string, string> = {
    created: "đã tạo",
    updated: "đã cập nhật",
    status_changed: "đã chuyển trạng thái",
    assigned: "đã giao",
    commented: "đã bình luận",
    attached: "đã đính kèm",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm">Hoạt động gần đây</h3>
        <Link href="/workspace/activity">
          <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-500">
            Xem tất cả →
          </Button>
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
            <svg className="size-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">Chưa có hoạt động nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["Hôm nay", "Hôm qua", "Tuần này"] as const).map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {group}
                </div>
                <div className="space-y-2">
                  {items.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        <AvatarFallback className={`text-[10px] ${getAvatarColor(activity.actor_name)}`}>
                          {getInitials(activity.actor_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">
                            {activity.actor_name ?? "Hệ thống"}
                          </span>{" "}
                          {actionLabels[activity.action] ?? activity.action}
                          {activity.new_value && (
                            <span className="text-slate-500"> "{activity.new_value}"</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {timeAgo(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
