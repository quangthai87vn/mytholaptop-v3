"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/workspace/types-calendar";
import { EVENT_TYPE_COLORS, STAGE_STATUS_COLORS } from "@/lib/workspace/types-calendar";
import { STATUS_CONFIG } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
} from "lucide-react";

type GroupBy = "date" | "task_type" | "platform" | "assignee" | "status";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
}

function getDaysLeft(dueDateStr: string): string {
  if (!dueDateStr) return "";
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} ngày quá hạn`;
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  return `${diff} ngày nữa`;
}

function isOverdue(event: CalendarEvent): boolean {
  if (!event.dueDate) return false;
  const due = new Date(event.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && event.publishStatus !== "published";
}

function TaskGridCard({ event }: { event: CalendarEvent }) {
  const overdue = isOverdue(event);
  const typeCfg = EVENT_TYPE_COLORS[event.eventType];
  const statusCfg = STAGE_STATUS_COLORS[event.publishStatus];

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors hover:shadow-sm",
        overdue ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
      )}
    >
      {/* Header: type badge + overdue badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0.5 font-medium", typeCfg.bg, typeCfg.color)}
          >
            {typeCfg.label}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0.5 font-medium", statusCfg.bg, statusCfg.color)}
          >
            {statusCfg.label}
          </Badge>
        </div>
        {overdue && (
          <span className="shrink-0 text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
            <AlertTriangle className="size-2.5 inline mr-0.5" />
            Quá hạn
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-2">
        {event.title ?? "—"}
      </h4>

      {/* Project / Campaign */}
      {(event.projectName || event.campaignName) && (
        <div className="flex flex-wrap gap-1">
          {event.projectName && (
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
              {event.projectName}
            </span>
          )}
          {event.campaignName && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
              {event.campaignName}
            </span>
          )}
        </div>
      )}

      {/* Dates row */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        {event.dueDate && (
          <div className="flex items-center gap-1">
            <Clock className={cn("size-3", overdue ? "text-red-500" : "text-slate-400")} />
            <span className={overdue ? "text-red-600 font-medium" : ""}>{formatDate(event.dueDate)}</span>
            <span className={cn("text-[10px]", overdue ? "text-red-500" : "text-green-600")}>
              ({getDaysLeft(event.dueDate)})
            </span>
          </div>
        )}
      </div>

      {/* Assignees */}
      {event.assigneeNames.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
            {event.assigneeNames.slice(0, 3).map((name, i) => (
              <Avatar key={i} className="size-5 border-2 border-white">
                <AvatarFallback className={cn("text-[8px] font-semibold", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-[11px] text-slate-500 truncate">
            {event.assigneeNames.slice(0, 2).join(", ")}
            {event.assigneeNames.length > 2 && ` +${event.assigneeNames.length - 2}`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
        {event.taskUrl && (
          <a
            href={event.taskUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            Chi tiết
          </a>
        )}
      </div>
    </div>
  );
}

interface CalendarGridViewProps {
  events: CalendarEvent[];
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarGridView({
  events,
  groupBy,
  onGroupByChange,
  onEventClick,
}: CalendarGridViewProps) {
  const grouped = useMemo(() => {
    const map: Record<string, { label: string; color?: string; items: CalendarEvent[] }> = {};

    for (const ev of events) {
      let key: string;
      let label: string;
      let color: string | undefined;

      switch (groupBy) {
        case "date": {
          const dateKey = ev.eventType === "campaign_deadline"
            ? ev.dueDate?.slice(0, 10)
            : (ev.publishDate ?? ev.dueDate ?? "").slice(0, 10);
          key = dateKey ?? "__no_date__";
          const d = new Date(key);
          label = key === "__no_date__" ? "Không ngày" : d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
          break;
        }
        case "task_type": {
          const typeCfg = EVENT_TYPE_COLORS[ev.eventType];
          key = ev.eventType;
          label = typeCfg.label;
          color = typeCfg.color;
          break;
        }
        case "platform": {
          key = ev.platform ?? "__no_platform__";
          label = key === "__no_platform__" ? "Không nền tảng" : ev.platform ?? "—";
          break;
        }
        case "assignee": {
          key = ev.assigneeIds[0] ?? "__no_assignee__";
          label = ev.assigneeNames[0] ?? "Chưa phân công";
          break;
        }
        case "status": {
          const statusCfg = STAGE_STATUS_COLORS[ev.publishStatus];
          key = ev.publishStatus;
          label = statusCfg.label;
          color = statusCfg.color;
          break;
        }
        default:
          key = "__other__";
          label = "Khác";
      }

      if (!map[key]) {
        map[key] = { label, color, items: [] };
      }
      map[key].items.push(ev);
    }

    // Sort groups
    const entries = Object.entries(map);
    if (groupBy === "date") {
      entries.sort(([a], [b]) => {
        if (a === "__no_date__") return 1;
        if (b === "__no_date__") return -1;
        return a.localeCompare(b);
      });
    } else if (groupBy === "status") {
      const order = ["draft", "review", "approved", "scheduled", "published", "overdue"];
      entries.sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries;
  }, [events, groupBy]);

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Calendar className="size-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Không có công việc nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group-by selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Nhóm theo:</span>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Ngày</SelectItem>
              <SelectItem value="task_type">Loại công việc</SelectItem>
              <SelectItem value="platform">Nền tảng</SelectItem>
              <SelectItem value="assignee">Nhân viên</SelectItem>
              <SelectItem value="status">Trạng thái</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-slate-400">{events.length} công việc</span>
      </div>

      {/* Grouped sections */}
      {grouped.map(([key, group]) => (
        <div key={key}>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            {group.color && (
              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: group.color.replace("text-", "") }} />
            )}
            <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              {group.items.length}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.items
              .sort((a, b) => {
                // Sort by date within group
                const aDate = a.dueDate ?? a.publishDate ?? "";
                const bDate = b.dueDate ?? b.publishDate ?? "";
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1;
                if (!bDate) return -1;
                return aDate.localeCompare(bDate);
              })
              .map((ev) => (
                <TaskGridCard key={ev.id} event={ev} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
