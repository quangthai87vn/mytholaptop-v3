"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  List,
  LayoutGrid,
  Table2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  CalendarDays,
  TrendingUp,
  ExternalLink,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PLATFORM_COLORS,
  STAGE_STATUS_COLORS,
  EVENT_TYPE_COLORS,
  type CalendarEvent,
  type CalendarViewMode,
  type CalendarStats,
  type CalendarFilters,
  type GridGroupBy,
} from "@/lib/workspace/types-calendar";
import {
  WORKFLOW_STAGE_LABELS,
  PLATFORM_LABELS,
  STATUS_CONFIG,
  type TaskStatus,
} from "@/lib/workspace/types";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";
import { CalendarFilterPanel } from "@/components/workspace/calendar/calendar-filter-panel";
import { CalendarGridView } from "@/components/workspace/calendar/calendar-grid-view";
import { TaskActionPopup } from "@/components/tasks/task-action-popup";
import * as XLSX from "xlsx";
import type { Task } from "@/lib/workspace/types";

// ─── Helpers ──────────────────────────────────────────────────────

function getYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return match ? match[1] : "";
}

// ─── Master data types from server ──────────────────────────────

interface CalendarMasterData {
  taskStatuses: MasterDataItem[];
  taskTypes: MasterDataItem[];
  channels: MasterDataItem[];
  projects: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; full_name: string }>;
}

// ─── Stats Bar ───────────────────────────────────────────────────

function StatsBar({ stats, loading }: { stats: CalendarStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
            <div className="h-8 bg-slate-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Công việc tuần này",
      value: stats.thisWeek,
      icon: CalendarDays,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      label: "Chờ duyệt",
      value: stats.approvedNotPublished,
      icon: CheckCircle2,
      color: "text-purple-600",
      bg: "bg-purple-50 border-purple-200",
      iconBg: "bg-purple-100",
    },
    {
      label: "Quá hạn",
      value: stats.overdue,
      icon: AlertTriangle,
      color: stats.overdue > 0 ? "text-red-600" : "text-slate-600",
      bg: stats.overdue > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200",
      iconBg: stats.overdue > 0 ? "bg-red-100" : "bg-slate-100",
    },
    {
      label: "Lên lịch tháng này",
      value: stats.scheduledThisMonth,
      icon: Clock,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("rounded-lg border p-4 flex items-center gap-3", item.bg)}
        >
          <div className={cn("size-9 rounded-lg flex items-center justify-center shrink-0", item.iconBg)}>
            <item.icon className={cn("size-4", item.color)} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{item.label}</p>
            <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Event Card ──────────────────────────────────────────────────

function EventCard({
  event,
  compact = false,
  onClick,
}: {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (e: CalendarEvent) => void;
}) {
  const statusCfg = STAGE_STATUS_COLORS[event.publishStatus as keyof typeof STAGE_STATUS_COLORS] ?? STAGE_STATUS_COLORS.draft;
  const typeCfg = EVENT_TYPE_COLORS[event.eventType];

  // Platform links
  const platformLinks: Array<{ label: string; url: string; color: string; bg: string; icon: string }> = [];
  if (event.websiteUrl) platformLinks.push({ label: "Web", url: event.websiteUrl, color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100", icon: "🌐" });
  if (event.youtubeUrl) platformLinks.push({ label: "YouTube", url: event.youtubeUrl, color: "text-red-600", bg: "bg-red-50 hover:bg-red-100", icon: "▶" });
  if (event.tiktokUrl) platformLinks.push({ label: "TikTok", url: event.tiktokUrl, color: "text-pink-600", bg: "bg-pink-50 hover:bg-pink-100", icon: "♪" });
  if (event.facebookUrl) platformLinks.push({ label: "Facebook", url: event.facebookUrl, color: "text-blue-500", bg: "bg-blue-50 hover:bg-blue-100", icon: "f" });

  if (compact) {
    const typeLabel = typeCfg.label;
    const platformLabel = event.platform
      ? PLATFORM_LABELS[event.platform as keyof typeof PLATFORM_LABELS]
      : null;

    const displayAssignees = event.assigneeNames.slice(0, 2);
    const extraCount = event.assigneeNames.length - 2;
    const assigneeLabel =
      displayAssignees.length === 0
        ? ""
        : displayAssignees.length === 1
        ? displayAssignees[0]
        : `${displayAssignees[0]}, ${displayAssignees[1]}${extraCount > 0 ? ` +${extraCount}` : ""}`;

    return (
      <button
        onClick={() => onClick?.(event)}
        className={cn(
          "w-full text-left px-1.5 py-1 rounded border transition-opacity hover:opacity-80 font-medium text-[10px]",
          statusCfg.bg,
          statusCfg.color
        )}
        title={event.title}
      >
        <div className="flex items-start gap-1">
          <span className={cn("shrink-0 font-semibold text-[9px] mt-0.5", typeCfg.color)}>
            {typeLabel}
          </span>
          <span className="flex-1 truncate text-[10px]">{event.title}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 min-w-0">
          {assigneeLabel && (
            <span className="truncate max-w-[80%]">{assigneeLabel}</span>
          )}
          {platformLabel && (
            <span className="shrink-0 opacity-70 text-[9px]">· {platformLabel}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(event)}
      className={cn(
        "w-full text-left rounded-lg border p-2.5 transition-colors hover:shadow-sm",
        event.publishStatus === "overdue"
          ? "bg-red-50 border-red-200 hover:border-red-300"
          : "bg-white border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="flex gap-2.5">
        {/* Thumbnail 16:9 */}
        <div className="relative shrink-0 w-[120px] h-[68px] rounded-md overflow-hidden bg-slate-100 border">
          {event.youtubeUrl ? (
            <img
              src={`https://img.youtube.com/vi/${getYouTubeId(event.youtubeUrl)}/mqdefault.jpg`}
              alt="thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : event.websiteUrl ? (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <span className="text-2xl">🌐</span>
            </div>
          ) : event.facebookUrl ? (
            <div className="w-full h-full flex items-center justify-center text-blue-400">
              <span className="text-2xl">f</span>
            </div>
          ) : event.tiktokUrl ? (
            <div className="w-full h-full flex items-center justify-center text-pink-400">
              <span className="text-2xl">♪</span>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <span className="text-2xl">📋</span>
            </div>
          )}
          {event.publishStatus === "published" && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-[10px] font-medium bg-green-600 px-1.5 py-0.5 rounded">Đã đăng</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", typeCfg.bg, typeCfg.color)}>
              {typeCfg.label}
            </span>
            {event.platform && (
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", PLATFORM_COLORS[event.platform as keyof typeof PLATFORM_COLORS]?.bg, PLATFORM_COLORS[event.platform as keyof typeof PLATFORM_COLORS]?.color)}>
                {PLATFORM_LABELS[event.platform as keyof typeof PLATFORM_LABELS]}
              </span>
            )}
            {event.publishStatus === "overdue" && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                Quá hạn
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">{event.title}</p>

          {/* Platform links */}
          {platformLinks.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {platformLinks.map((p) => (
                <a
                  key={p.label}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn("flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border border-transparent hover:border-current transition-colors", p.color, p.bg)}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  <ExternalLink className="size-2.5 opacity-60" />
                </a>
              ))}
            </div>
          )}

          {/* Assignees + Completion date */}
          <div className="flex items-center gap-2 flex-wrap">
            {event.assigneeNames && event.assigneeNames.length > 0 && (
              <span className="text-[10px] text-slate-400 truncate">
                {event.assigneeNames.join(", ")}
              </span>
            )}
            {event.publishStatus === "published" && event.publishDate && (
              <span className="text-[10px] text-green-600 font-medium shrink-0">
                ✓ {new Date(event.publishDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Month View ──────────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
  onEventClick,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const today = new Date();
  const todayStr = today.toDateString();
  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: Array<{ date: Date | null; day: number | null }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), day: d });
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const dateKey = ev.eventType === "campaign_deadline"
        ? ev.dueDate?.slice(0, 10)
        : (ev.publishDate ?? ev.dueDate ?? "").slice(0, 10);
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    });
    return map;
  }, [events]);

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {dayLabels.map((label) => (
          <div key={label} className="py-2 text-center text-xs font-semibold text-slate-500">
            {label}
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
          {row.map((cell, ci) => {
            if (!cell.date) {
              return <div key={`empty-${ci}`} className="min-h-[120px] bg-slate-50/50" />;
            }
            const dateStr = cell.date.toISOString().slice(0, 10);
            const dayEvents = eventsByDate[dateStr] ?? [];
            const isToday = cell.date.toDateString() === todayStr;
            const isPast = cell.date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            return (
              <div
                key={dateStr}
                className={cn(
                  "min-h-[120px] p-1.5 border-r border-slate-100 last:border-r-0",
                  isToday ? "bg-red-50/40" : isPast ? "bg-slate-50/30" : "bg-white"
                )}
              >
                <div className="flex items-center justify-center mb-1">
                  <span
                    className={cn(
                      "size-6 rounded-full flex items-center justify-center text-xs font-semibold",
                      isToday ? "bg-red-600 text-white" : "text-slate-600"
                    )}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <EventCard key={ev.id} event={ev} compact onClick={onEventClick} />
                  ))}
                  {dayEvents.length > 3 && (
                    <button
                      onClick={() => dayEvents.slice(3).forEach((ev) => onEventClick(ev))}
                      className="w-full text-center text-[10px] text-slate-500 hover:text-slate-700 py-0.5"
                    >
                      +{dayEvents.length - 3} thêm
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────

function WeekView({
  currentDate,
  events,
  onEventClick,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const today = new Date();
  const todayStr = today.toDateString();
  const dayOfWeek = currentDate.getDay();
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const wd = new Date(weekStart);
    wd.setDate(wd.getDate() + i);
    return wd;
  });

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const dateKey = ev.eventType === "campaign_deadline"
        ? ev.dueDate?.slice(0, 10)
        : (ev.publishDate ?? ev.dueDate ?? "").slice(0, 10);
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    });
    return map;
  }, [events]);

  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-t-lg overflow-hidden">
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === todayStr;
            return (
              <div key={i} className={cn("bg-slate-100 py-2 text-center", isToday && "bg-red-50")}>
                <p className={cn("text-xs font-semibold", isToday ? "text-red-600" : "text-slate-600")}>
                  {dayLabels[i]}
                </p>
                <p className={cn("text-sm font-bold mt-0.5", isToday ? "text-red-600" : "text-slate-700")}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>
        <div className="divide-y divide-slate-100 border border-t-0 border-slate-200 rounded-b-lg overflow-hidden">
          {weekDays.map((d, i) => {
            const key = d.toISOString().slice(0, 10);
            const dayEvents = eventsByDay[key] ?? [];
            const isToday = d.toDateString() === todayStr;
            return (
              <div key={i} className={cn("min-h-[300px] p-2 space-y-1", isToday && "bg-red-50/30")}>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-300 text-center py-4">—</p>
                ) : (
                  dayEvents.map((ev) => <EventCard key={ev.id} event={ev} onClick={onEventClick} />)
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Agenda View ─────────────────────────────────────────────────

function AgendaView({
  events,
  onEventClick,
}: {
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const key = ev.eventType === "campaign_deadline"
        ? ev.dueDate?.slice(0, 10) ?? ""
        : (ev.publishDate ?? ev.dueDate ?? "").slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Calendar className="size-10 mx-auto mb-2 opacity-30" />
        <p>Không có sự kiện nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([dateStr, dayEvents]) => {
        const d = new Date(dateStr);
        const today = new Date();
        const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isToday = d.toDateString() === today.toDateString();
        return (
          <div key={dateStr}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "size-10 rounded-lg flex flex-col items-center justify-center shrink-0",
                isToday ? "bg-red-600 text-white" : isPast ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-700"
              )}>
                <span className="text-[10px] font-medium uppercase">
                  {d.toLocaleDateString("vi-VN", { weekday: "short" })}
                </span>
                <span className="text-lg font-bold leading-none">{d.getDate()}</span>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 shrink-0">
                {d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
              </span>
            </div>
            <div className="pl-13 space-y-2">
              {dayEvents
                .sort((a, b) => {
                  const order = { production_deadline: 0, publish_schedule: 1, campaign_deadline: 2 };
                  return (order[a.eventType] ?? 3) - (order[b.eventType] ?? 3);
                })
                .map((ev) => (
                  <div key={ev.id} className="pl-13">
                    <EventCard event={ev} onClick={onEventClick} />
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Excel Export ───────────────────────────────────────────────

async function exportExcel(events: CalendarEvent[], dateLabel: string) {
  // Deduplicate: each task appears at most once (prefer production_deadline over publish_schedule)
  const seen = new Set<string>();
  const unique = events.filter((ev) => {
    if (ev.taskId && seen.has(ev.taskId)) return false;
    if (ev.taskId) seen.add(ev.taskId);
    return true;
  });

  const rows = unique.map((ev, idx) => ({
    "STT": idx + 1,
    "Tiêu đề": ev.title ?? "",
    "Mô tả": "",
    "Dự án": ev.projectName ?? "",
    "Chiến dịch": ev.campaignName ?? "",
    "Loại công việc": ev.taskType ?? "",
    "Nền tảng": ev.platform ? (PLATFORM_LABELS[ev.platform as keyof typeof PLATFORM_LABELS] ?? ev.platform) : "",
    "Người phụ trách": ev.assigneeNames.join(", "),
    "Ngày bắt đầu": ev.publishDate ? new Date(ev.publishDate).toLocaleDateString("vi-VN") : "",
    "Hạn chót": ev.dueDate ? new Date(ev.dueDate).toLocaleDateString("vi-VN") : "",
    "Trạng thái": STATUS_CONFIG[ev.status as TaskStatus]?.label ?? ev.status ?? "",
    "Trạng thái nội dung": ev.publishStatus ?? "",
    "Link đã xuất bản": ev.taskUrl ? `https://admin.mytholaptop.vn${ev.taskUrl}` : "",
    "File/Asset đã nộp": "",
    "Ghi chú hoàn thành": "",
    "Website": ev.websiteUrl ?? "",
    "YouTube": ev.youtubeUrl ?? "",
    "TikTok": ev.tiktokUrl ?? "",
    "Fanpage/Facebook": ev.facebookUrl ?? "",
    "Ngày tạo": "",
    "Ngày cập nhật": "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  // Set column widths for readability
  ws["!cols"] = [
    { wch: 5 },   // STT
    { wch: 35 },  // Tiêu đề
    { wch: 20 },  // Mô tả
    { wch: 20 },  // Dự án
    { wch: 20 },  // Chiến dịch
    { wch: 18 },  // Loại công việc
    { wch: 12 },  // Nền tảng
    { wch: 20 },  // Người phụ trách
    { wch: 14 },  // Ngày bắt đầu
    { wch: 14 },  // Hạn chót
    { wch: 14 },  // Trạng thái
    { wch: 18 },  // Trạng thái nội dung
    { wch: 40 },  // Link đã xuất bản
    { wch: 30 },  // File/Asset
    { wch: 25 },  // Ghi chú
    { wch: 35 },  // Website
    { wch: 35 },  // YouTube
    { wch: 35 },  // TikTok
    { wch: 35 },  // Fanpage/Facebook
    { wch: 14 },  // Ngày tạo
    { wch: 14 },  // Ngày cập nhật
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Tasks");
  const fileName = `workspace-calendar-tasks-${dateLabel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ─── Task Quick View Dialog ─────────────────────────────────────

function TaskQuickViewDialog({
  event,
  open,
  onClose,
  onEdit,
}: {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (task: Task) => void;
}) {
  if (!event) return null;
  const statusCfg = STAGE_STATUS_COLORS[event.publishStatus as keyof typeof STAGE_STATUS_COLORS] ?? STAGE_STATUS_COLORS.draft;
  const typeCfg = EVENT_TYPE_COLORS[event.eventType];
  const isCampaign = event.eventType === "campaign_deadline";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: typeCfg.color.replace("text-", "#").replace("-600", "") }} />
          <DialogHeader className="px-4 pt-4 pb-3 text-left">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 font-medium", typeCfg.bg, typeCfg.color)}>
                {typeCfg.label}
              </Badge>
              <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 font-medium", statusCfg.bg, statusCfg.color)}>
                {statusCfg.label}
              </Badge>
              {event.platform && (
                <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 font-medium", PLATFORM_COLORS[event.platform as keyof typeof PLATFORM_COLORS]?.bg, PLATFORM_COLORS[event.platform as keyof typeof PLATFORM_COLORS]?.color)}>
                  {PLATFORM_LABELS[event.platform as keyof typeof PLATFORM_LABELS]}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-[15px] font-semibold text-slate-900 leading-snug">
              {event.title}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-4 pb-1 space-y-2">
          {event.projectName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 shrink-0">Dự án:</span>
              <span className="font-medium text-slate-700">{event.projectName}</span>
            </div>
          )}
          {event.campaignName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 shrink-0">Chiến dịch:</span>
              <span className="font-medium text-slate-700">{event.campaignName}</span>
            </div>
          )}
          {event.assigneeNames.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 shrink-0">Phụ trách:</span>
              <span className="text-slate-700">{event.assigneeNames.join(", ")}</span>
            </div>
          )}
          {event.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-slate-400 shrink-0" />
              <span className={cn("text-slate-700", event.publishStatus === "overdue" && "text-red-600 font-medium")}>
                Hạn: {new Date(event.dueDate).toLocaleDateString("vi-VN", { dateStyle: "long" })}
              </span>
            </div>
          )}
          {!isCampaign && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 shrink-0">Trạng thái:</span>
              <Badge variant="outline" className={cn(STATUS_CONFIG[event.status as TaskStatus]?.bgColor)}>
                {STATUS_CONFIG[event.status as TaskStatus]?.label ?? event.status}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 pb-4 pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
          {!isCampaign && event.taskUrl && (
            <Button asChild size="sm" className="ml-auto">
              <a href={event.taskUrl} target="_blank" rel="noopener noreferrer">
                Xem chi tiết
                <ExternalLink className="size-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Calendar Client Component ──────────────────────────────

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

interface CalendarClientProps {
  masterData: CalendarMasterData;
}

export function CalendarClient({ masterData }: CalendarClientProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [gridGroupBy, setGridGroupBy] = useState<GridGroupBy>("date");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const staffOptions = masterData.staff.map((s) => ({ id: s.id, name: s.full_name }));
  const projectOptions = masterData.projects.map((p) => ({ id: p.id, name: p.name }));
  const campaignOptions = masterData.campaigns.map((c) => ({ id: c.id, name: c.name }));
  const taskTypeOptions = masterData.taskTypes.map((t) => ({ code: t.code, name: t.name, color: t.color }));
  const statusOptions = masterData.taskStatuses.map((s) => ({ code: s.code, name: s.name, color: s.color }));
  const platformOptions = masterData.channels.map((c) => ({ code: c.code, name: c.name, color: c.color }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: String(year), month: String(month) });
      if (filters.platforms?.length) params.set("platforms", filters.platforms.join(","));
      if (filters.assignees?.length) params.set("assignees", filters.assignees.join(","));
      if (filters.workflowStages?.length) params.set("workflowStages", filters.workflowStages.join(","));
      if (filters.taskTypes?.length) params.set("taskTypes", filters.taskTypes.join(","));
      if (filters.projectIds?.length) params.set("projectIds", filters.projectIds.join(","));
      if (filters.campaignIds?.length) params.set("campaignIds", filters.campaignIds.join(","));
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.overdue) params.set("overdue", "true");
      if (filters.pendingApproval) params.set("pendingApproval", "true");
      if (filters.completed) params.set("completed", "true");
      if (filters.showProductionDeadline === false) params.set("showProductionDeadline", "false");
      if (filters.showPublishSchedule === false) params.set("showPublishSchedule", "false");
      if (filters.showCampaignDeadline === false) params.set("showCampaignDeadline", "false");

      const res = await adminFetch(`/api/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
        setStats(data.stats ?? null);
      }
    } catch (err) {
      console.warn("[CalendarClient] fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const prevPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    }
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const handleEventClick = (ev: CalendarEvent) => {
    setSelectedEvent(ev);
    setShowQuickView(true);
  };

  const periodLabel = useMemo(() => {
    if (viewMode === "month") return `${MONTHS[month]} ${year}`;
    if (viewMode === "week") {
      const dayOfWeek = currentDate.getDay();
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `Tuần ${weekStart.getDate()}–${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
    }
    return `${MONTHS[month]} ${year}`;
  }, [viewMode, year, month, currentDate]);

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    exportExcel(events, today);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
            <p className="text-sm text-slate-500">
              Lịch sản xuất &amp; lịch đăng bài cho team media
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleExport}
            disabled={loading || events.length === 0}
          >
            <Download className="size-3.5" />
            Xuất Excel
          </Button>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setViewMode("month")}
            >
              <LayoutGrid className="size-3.5" />
              Tháng
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setViewMode("week")}
            >
              <CalendarDays className="size-3.5" />
              Tuần
            </Button>
            <Button
              variant={viewMode === "agenda" ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setViewMode("agenda")}
            >
              <List className="size-3.5" />
              DS
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setViewMode("grid")}
            >
              <Table2 className="size-3.5" />
              Grid
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} loading={loading} />

      {/* Filter panel */}
      <CalendarFilterPanel
        filters={filters}
        onChange={setFilters}
        staffOptions={staffOptions}
        projectOptions={projectOptions}
        campaignOptions={campaignOptions}
        taskTypeOptions={taskTypeOptions}
        statusOptions={statusOptions}
        platformOptions={platformOptions}
      />

      {/* Calendar controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevPeriod}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-900 min-w-[200px] text-center">
            {periodLabel}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextPeriod}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>
          Hôm nay
        </Button>
      </div>

      {/* Calendar body */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {viewMode === "month" && (
              <MonthView year={year} month={month} events={events} onEventClick={handleEventClick} />
            )}
            {viewMode === "week" && (
              <WeekView currentDate={currentDate} events={events} onEventClick={handleEventClick} />
            )}
            {viewMode === "agenda" && (
              <div className="p-5">
                <AgendaView events={events} onEventClick={handleEventClick} />
              </div>
            )}
            {viewMode === "grid" && (
              <div className="p-5">
                <CalendarGridView
                  events={events}
                  groupBy={gridGroupBy}
                  onGroupByChange={setGridGroupBy}
                  onEventClick={handleEventClick}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick view dialog */}
      <TaskQuickViewDialog
        event={selectedEvent}
        open={showQuickView}
        onClose={() => setShowQuickView(false)}
      />
    </div>
  );
}
