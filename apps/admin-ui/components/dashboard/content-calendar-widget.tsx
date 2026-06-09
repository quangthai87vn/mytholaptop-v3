"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarStats } from "@/lib/workspace/types-calendar";

export function ContentCalendarWidget() {
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((d) => {
        setStats(d.stats ?? null);
      })
      .catch((err) => {
        console.warn("[ContentCalendarWidget] fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = [
    {
      key: "thisWeek",
      label: "Content tuần này",
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      key: "approvedNotPublished",
      label: "Đã duyệt chưa đăng",
      icon: CheckCircle2,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
    {
      key: "overdue",
      label: "Quá hạn",
      icon: AlertTriangle,
      color: stats?.overdue ? "text-red-600" : "text-slate-400",
      bg: stats?.overdue ? "bg-red-50" : "bg-slate-50",
      border: stats?.overdue ? "border-red-200" : "border-slate-200",
    },
    {
      key: "scheduledThisMonth",
      label: "Lên lịch tháng này",
      icon: Clock,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <Calendar className="size-4 text-orange-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Content Calendar</h3>
        </div>
        <Link href="/workspace/calendar">
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-orange-600 hover:text-orange-700">
            Mở calendar
            <ArrowRight className="size-3" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const value = stats ? stats[item.key as keyof CalendarStats] : 0;
          return (
            <div
              key={item.key}
              className={`rounded-lg border p-3 ${item.bg} ${item.border}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`size-3.5 ${item.color}`} />
                <span className="text-xs text-slate-600 font-medium">{item.label}</span>
              </div>
              {loading ? (
                <Skeleton className="h-6 w-8" />
              ) : (
                <p className={`text-2xl font-bold ${item.color}`}>{value}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
