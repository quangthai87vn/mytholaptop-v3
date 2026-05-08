"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  List,
  Facebook,
  Globe,
  Video,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { ScheduleStatus } from "@/lib/content/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type ScheduleItem = {
  id: number;
  content_item_id: number | null;
  channel: string;
  publish_at: string;
  timezone: string;
  status: ScheduleStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  content_title?: string | null;
};

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  facebook: { label: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-100" },
  website: { label: "Website", icon: Globe, color: "text-green-600", bg: "bg-green-100" },
  tiktok: { label: "TikTok", icon: Video, color: "text-pink-600", bg: "bg-pink-100" },
  youtube: { label: "YouTube", icon: Video, color: "text-red-600", bg: "bg-red-100" },
  zalo: { label: "Zalo", icon: Send, color: "text-blue-500", bg: "bg-blue-50" },
};

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

export default function CalendarPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 8));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const calendarDays = getCalendarDays(year, month);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = new Date(year, month, 1).toISOString();
      const toDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const params = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        limit: "200",
      });
      if (platformFilter !== "all") params.set("channel", platformFilter);
      const res = await fetch(`/api/content/schedules?${params}`);
      if (res.ok) {
        const result = await res.json();
        setSchedules(result.data || []);
      }
    } catch {
      toast.error("Loi khi lay lich");
    } finally {
      setLoading(false);
    }
  }, [year, month, platformFilter]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Group by day for calendar view
  const postsByDay = new Map<number, ScheduleItem[]>();
  for (const s of schedules) {
    const day = new Date(s.publish_at).getDate();
    if (!postsByDay.has(day)) postsByDay.set(day, []);
    postsByDay.get(day)!.push(s);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lich dang bai</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quan ly lich dang noi dung len cac nen tang
          </p>
        </div>
        <Button asChild className="gap-2">
          <a href="/content/ai-generator">
            Tao noi dung
          </a>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="gap-1"
              >
                <Calendar className="size-4" />
                Lich
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-1"
              >
                <List className="size-4" />
                Danh sach
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPlatformFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  platformFilter === "all" ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                }`}
              >
                Tat ca
              </button>
              {Object.entries(PLATFORM_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setPlatformFilter(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      platformFilter === key ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="size-3" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "calendar" ? (
        /* Calendar View */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="text-lg font-semibold">{monthName}</h2>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Hom nay
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="bg-muted py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden">
                  {calendarDays.map((day, idx) => {
                    const daySchedules = day ? postsByDay.get(day) || [] : [];
                    const isToday =
                      day === new Date().getDate() &&
                      month === new Date().getMonth() &&
                      year === new Date().getFullYear();

                    return (
                      <div
                        key={idx}
                        className={`min-h-[100px] sm:min-h-[120px] bg-card p-1 ${
                          day === null ? "bg-muted/30" : ""
                        }`}
                      >
                        {day !== null && (
                          <>
                            <div className="flex items-center justify-between px-1 py-0.5">
                              <span
                                className={`text-xs font-medium ${
                                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                                }`}
                              >
                                {day}
                              </span>
                              {daySchedules.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {daySchedules.length}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {daySchedules.slice(0, 2).map((s) => {
                                const config =
                                  PLATFORM_CONFIG[s.channel] || PLATFORM_CONFIG.facebook;
                                const Icon = config.icon;
                                return (
                                  <div
                                    key={s.id}
                                    className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate font-medium ${config.bg} ${config.color}`}
                                    title={s.content_title || s.channel}
                                  >
                                    <div className="flex items-center gap-0.5">
                                      <Icon className="size-2.5 shrink-0" />
                                      <span className="truncate">
                                        {s.content_title || config.label}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {daySchedules.length > 2 && (
                                <p className="text-[10px] text-muted-foreground pl-1">
                                  +{daySchedules.length - 2} more
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Khong co lich dang nao
              </div>
            ) : (
              <div className="divide-y">
                {[...schedules]
                  .sort(
                    (a, b) =>
                      new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime()
                  )
                  .map((s) => {
                    const config =
                      PLATFORM_CONFIG[s.channel] || PLATFORM_CONFIG.facebook;
                    const Icon = config.icon;
                    const scheduledDate = new Date(s.publish_at);

                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        {/* Date */}
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-muted-foreground">
                            {scheduledDate.toLocaleDateString("vi-VN", { weekday: "short" })}
                          </p>
                          <p className="text-lg font-bold">
                            {scheduledDate.getDate()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {scheduledDate.toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {/* Platform */}
                        <div className={`size-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                          <Icon className={`size-4 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {s.content_title || `Lich #${s.id}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {PLATFORM_CONFIG[s.channel]?.label || s.channel}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <Badge
                          variant={
                            s.status === "published"
                              ? "success"
                              : s.status === "pending"
                              ? "warning"
                              : "secondary"
                          }
                          className="shrink-0"
                        >
                          {s.status === "published"
                            ? "Da dang"
                            : s.status === "pending"
                            ? "Dang cho"
                            : s.status}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
