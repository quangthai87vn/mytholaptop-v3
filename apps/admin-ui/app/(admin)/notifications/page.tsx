"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_LABELS,
  NOTIFICATION_COLORS,
  type Notification,
  type NotificationType,
} from "@/lib/workspace/types-notification";
import { adminFetch } from "@/lib/api/admin-fetch";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  UserCheck,
  Send,
  Clapperboard,
  Bell as BellIcon,
  MessageSquare,
  AtSign,
  Settings,
} from "lucide-react";

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  task_assigned: UserCheck,
  task_due_soon: Clock,
  task_overdue: AlertTriangle,
  task_approved: CheckCircle2,
  task_rejected: XCircle,
  task_submit_review: Send,
  publish_scheduled: Calendar,
  campaign_deadline: Clapperboard,
  task_comment: MessageSquare,        // P6.7
  task_comment_mention: AtSign,       // P6.7
  system: BellIcon,
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("isRead", "false");
      params.set("limit", "50");

      const res = await adminFetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data ?? []);
        setTotal(data.total ?? 0);
        setUnread(data.unread ?? 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    setMarkingId(id);
    try {
      await adminFetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationIds: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // fail silently
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingId("all");
    try {
      await adminFetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // fail silently
    } finally {
      setMarkingId(null);
    }
  };

  const getHref = (notif: Notification): string => {
    if (notif.entityType === "task" && notif.entityId) {
      return `/tasks/${notif.entityId}`;
    }
    if (notif.entityType === "campaign" && notif.entityId) {
      return `/campaigns/${notif.entityId}`;
    }
    return "#";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Bell className="size-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thông báo</h1>
            <p className="text-sm text-slate-500">
              {unread > 0 ? `${unread} thông báo chưa đọc` : "Tất cả đã đọc"}
            </p>
          </div>
        </div>

        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={markAllRead}
            disabled={markingId === "all"}
          >
            {markingId === "all" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Tất cả ({total})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
            filter === "unread"
              ? "bg-primary text-primary-foreground"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Chưa đọc
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 size-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="size-12 text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Không có thông báo nào</p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === "unread" ? "Tất cả thông báo đã được đọc" : "Bạn chưa có thông báo nào"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] ?? BellIcon;
              const colorCfg = NOTIFICATION_COLORS[notif.type] ?? NOTIFICATION_COLORS.system;
              const href = getHref(notif);

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors",
                    !notif.isRead && "bg-blue-50/50"
                  )}
                >
                  {/* Icon */}
                  <div className={cn("size-10 rounded-full flex items-center justify-center shrink-0", colorCfg.bg)}>
                    <Icon className={cn("size-5", colorCfg.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!notif.isRead && (
                            <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <p className={cn(
                            "text-sm leading-tight",
                            !notif.isRead ? "font-semibold text-slate-900" : "font-normal text-slate-600"
                          )}>
                            {notif.title}
                          </p>
                        </div>
                        {notif.message && (
                          <p className="text-sm text-slate-500 leading-snug line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1.5">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => markRead(notif.id)}
                            disabled={markingId === notif.id}
                            title="Đánh dấu đã đọc"
                          >
                            {markingId === notif.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5 text-slate-400" />
                            )}
                          </Button>
                        )}
                        {href !== "#" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                            <Link href={href}>Mở</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
