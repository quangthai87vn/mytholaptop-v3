"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle as AlertTriangleIcon,
  Clock as ClockIcon,
  CheckCircle2 as CheckIcon,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notification } from "@/lib/workspace/types-notification";
import { NOTIFICATION_COLORS } from "@/lib/workspace/types-notification";
import { adminFetch } from "@/lib/api/admin-fetch";
import { cn } from "@/lib/utils";

export function NotificationAlertWidget() {
  const [tasks, setTasks] = useState<{ overdue: number; pendingReview: number; dueSoon: number }>({
    overdue: 0,
    pendingReview: 0,
    dueSoon: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch("/api/notifications?limit=5&types=task_overdue"),
      adminFetch("/api/notifications?limit=5&types=task_submit_review"),
      adminFetch("/api/notifications?limit=5&types=task_due_soon"),
    ])
      .then(([ov, rv, dv]) => Promise.all([ov.json(), rv.json(), dv.json()]))
      .then(([ov, rv, dv]) => {
        setTasks({
          overdue: ov.total ?? 0,
          pendingReview: rv.total ?? 0,
          dueSoon: dv.total ?? 0,
        });
      })
      .catch((err) => {
        console.warn("[NotificationAlertWidget] fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const alerts = [
    {
      key: "overdue",
      label: "Quá hạn",
      icon: AlertTriangleIcon,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      count: tasks.overdue,
    },
    {
      key: "pendingReview",
      label: "Chờ duyệt",
      icon: ClockIcon,
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-200",
      count: tasks.pendingReview,
    },
    {
      key: "dueSoon",
      label: "Sắp đến hạn",
      icon: ClockIcon,
      color: "text-yellow-600",
      bg: "bg-yellow-50 border-yellow-200",
      count: tasks.dueSoon,
    },
  ];

  const hasAlerts = alerts.some((a) => a.count > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <Bell className="size-4 text-orange-600" />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm">Việc cần chú ý</h3>
        </div>
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-orange-600 hover:text-orange-700">
            Tất cả
            <ArrowRight className="size-3" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ) : !hasAlerts ? (
        <div className="text-center py-4">
          <CheckIcon className="size-8 text-green-400 mx-auto mb-1" />
          <p className="text-sm text-slate-500">Mọi thứ đều ổn</p>
          <p className="text-xs text-slate-400 mt-0.5">Không có việc cần chú ý</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.key}
                className={cn(
                  "rounded-lg border p-3 text-center",
                  alert.count > 0 ? alert.bg : "bg-slate-50 border-slate-200"
                )}
              >
                <Icon className={cn("size-5 mx-auto mb-1", alert.count > 0 ? alert.color : "text-slate-300")} />
                <p className={cn("text-2xl font-bold", alert.count > 0 ? alert.color : "text-slate-300")}>
                  {alert.count}
                </p>
                <p className={cn("text-[10px] font-medium mt-0.5", alert.count > 0 ? "text-slate-700" : "text-slate-400")}>
                  {alert.label}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
