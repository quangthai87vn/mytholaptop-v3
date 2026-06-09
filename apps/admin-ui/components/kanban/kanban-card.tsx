"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TASK_TYPE_CONFIG, TASK_PRIORITY_CONFIG } from "@/lib/workspace/types";
import type { Task, TaskPriority } from "@/lib/workspace/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  Youtube,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KanbanCardMenu } from "./kanban-card-menu";

interface KanbanCardProps {
  task: Task;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onEdit?: (task: Task, closeSheet?: () => void) => void;
  onArchive?: (task: Task, closeSheet?: () => void) => void;
  onRestore?: (task: Task, closeSheet?: () => void) => void;
  onDelete?: (task: Task, closeSheet?: () => void) => void;
  onCopy?: (task: Task, closeSheet?: () => void) => void;
  onView?: (task: Task) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  isIntern?: boolean;
  disableDrag?: boolean;
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  campaignMap?: Record<string, string>;
  platformMap?: Record<string, { name: string; color: string }>;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
}

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

function displayShortDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
  }
  const dt = new Date(dateStr);
  const d2 = String(dt.getDate()).padStart(2, "0");
  const m2 = String(dt.getMonth() + 1).padStart(2, "0");
  const y2 = String(dt.getFullYear()).slice(-2);
  return `${d2}/${m2}/${y2}`;
}

function ContentStatusBadge({ task }: { task: Task }) {
  if (!task.content_status && !task.content_body) return null;

  const label =
    task.content_body
      ? "Có kịch bản"
      : task.content_status === "published"
      ? "Đã xuất bản"
      : task.content_status === "approved"
      ? "Đã duyệt"
      : task.content_status === "writing"
      ? "Đang viết"
      : task.content_status === "internal_review"
      ? "Chờ duyệt nội bộ"
      : task.content_status === "revision"
      ? "Cần sửa"
      : "Chưa có nội dung";

  const colorClass =
    task.content_status === "published" || task.content_status === "approved"
      ? "bg-green-50 text-green-700 border-green-200"
      : task.content_status === "writing" || task.content_status === "internal_review"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : task.content_status === "revision"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : task.content_body
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-50 text-slate-500 border-slate-200";

  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 font-medium", colorClass)}>
      {task.content_body ? <FileText className="size-3 mr-0.5" /> : <Circle className="size-2 mr-0.5" />}
      {label}
    </Badge>
  );
}

function getPlatformIds(task: Task): string[] {
  const meta = (task.metadata as Record<string, unknown>) ?? {};
  const ids = meta.platform_ids as string[] | undefined;
  return ids ?? [];
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function KanbanCard({
  task,
  onDragStart,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  onView,
  canArchive = true,
  canDelete = false,
  canRestore = false,
  isIntern = false,
  disableDrag = false,
  staffMap = {},
  staffRoleMap = {},
  projectMap = {},
  campaignMap = {},
  platformMap = {},
  taskTypeColorMap = {},
}: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Resolve task type config from master data first, then fallback to TASK_TYPE_CONFIG
  const masterDataColor = taskTypeColorMap[task.task_type ?? ""];
  const fallbackConfig = TASK_TYPE_CONFIG[task.task_type ?? ""];
  const taskTypeCfg = task.task_type
    ? (masterDataColor ?? fallbackConfig ?? null)
    : null;

  // Use task type color as left border accent
  const typeColor = masterDataColor?.color ?? taskTypeCfg?.color ?? "#6b7280";
  const typeBgColor = masterDataColor?.bgColor ?? taskTypeCfg?.bgColor ?? "bg-slate-100";

  // Date calculations
  const dueDateMs = task.due_date
    ? (() => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(task.due_date)) {
          const [y, m, d] = task.due_date.split("-").map(Number);
          return new Date(y, m - 1, d, 12, 0, 0).getTime();
        }
        return new Date(task.due_date).getTime();
      })()
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysLeft = dueDateMs !== null
    ? Math.ceil((dueDateMs - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue =
    dueDateMs !== null &&
    dueDateMs < today.getTime() &&
    task.status !== "completed" && task.status !== "cancelled";

  const isDueSoon =
    dueDateMs !== null &&
    !isOverdue &&
    dueDateMs <= today.getTime() + 3 * 24 * 60 * 60 * 1000;

  // Platforms
  const platformIds = getPlatformIds(task);
  const displayPlatforms = platformIds.slice(0, 3);
  const extraPlatformCount = platformIds.length - 3;

  // Assignees: show all names in one truncated line with full tooltip
  const assigneeNames = task.assignee_ids
    .map((id) => staffMap[id] ?? "NN")
    .filter(Boolean);
  const displayAssignees = task.assignee_ids.slice(0, 2);
  const extraAssigneeCount = Math.max(0, task.assignee_ids.length - 2);
  const visibleNames = assigneeNames.slice(0, 3);
  const extraNameCount = Math.max(0, assigneeNames.length - 3);
  const assigneeNamesStr = visibleNames.join(", ") + (extraNameCount > 0 ? ` +${extraNameCount}` : "");

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    if (onDragStart) onDragStart(e, task);
  };
  const handleDragEnd = () => setIsDragging(false);

  const isArchived = task.is_archived ?? false;
  const isCancelled = task.status === "cancelled";

  return (
    <div
      className={cn(
        "group relative bg-white rounded-lg border border-slate-200 min-w-0 max-w-[300px] w-full",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 select-none",
        !disableDrag && "cursor-grab active:cursor-grabbing",
        disableDrag && "cursor-pointer",
        isDragging && "opacity-50 cursor-grabbing shadow-lg rotate-2",
        isArchived && "opacity-70"
      )}
      style={{ minHeight: "unset" }}
    >
      {/* 1. Task type left border accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: typeColor }}
      />

      {/* 2. Action menu — top-right corner, OUTSIDE inner body to avoid overflow:hidden clipping */}
      <div className="absolute top-2 right-2 z-50">
        <KanbanCardMenu
          task={task}
          onEdit={onEdit}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
          onCopy={onCopy}
          canArchive={canArchive}
          canDelete={canDelete}
          canRestore={canRestore}
          disableDrag={disableDrag}
        />
      </div>

      {/* Card body — offset right to avoid overlap with left border */}
      <div
        className="pl-3 pr-10 pt-2.5 pb-2.5 space-y-1.5 min-w-0"
        draggable={!disableDrag}
        onDragStart={disableDrag ? undefined : handleDragStart}
        onDragEnd={disableDrag ? undefined : handleDragEnd}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-menu-button]")) return;
          if (onView) { e.stopPropagation(); onView(task); }
        }}
        data-drag-handle
      >


        {/* Meta row: type badge + priority dot (always) + archived + deadline */}
        <div className="flex flex-wrap items-center gap-1.5">
          {taskTypeCfg ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4.5 font-semibold",
                typeBgColor,
                taskTypeCfg.color
              )}
            >
              {taskTypeCfg.label}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4.5 font-medium bg-slate-100 text-slate-400 border-slate-300"
            >
              Chưa phân loại
            </Badge>
          )}
          {/* Priority dot — always shown */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="size-2 rounded-full shrink-0 cursor-default"
                style={{ backgroundColor: TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color ?? "#9ca3af" }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Độ ưu tiên: {TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.label ?? "Bình thường"}
            </TooltipContent>
          </Tooltip>
          {isArchived && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4.5 font-medium bg-slate-100 text-slate-500 border-slate-300"
            >
              Đã lưu trữ
            </Badge>
          )}
          {task.due_date && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 font-medium rounded flex items-center gap-0.5",
                isOverdue
                  ? "bg-red-50 text-red-600"
                  : isDueSoon
                  ? "bg-orange-50 text-orange-600"
                  : "bg-slate-50 text-slate-500"
              )}
            >
              <Calendar className="size-2.5 shrink-0" />
              {displayShortDate(task.due_date)}
              {dueDateMs !== null && !isOverdue && daysLeft !== null && (
                <span className="font-medium">{daysLeft}d</span>
              )}
              {isOverdue && (
                <span className="font-medium">quá {Math.abs(daysLeft ?? 0)}d</span>
              )}
            </span>
          )}
        </div>

        {/* 3b. YouTube Thumbnail — 16:9, below type badge, title below image */}
        {(() => {
          const ytId = task.youtube_url ? extractYouTubeId(task.youtube_url) : null;
          if (!ytId) return null;
          return (
            <a
              href={task.youtube_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md overflow-hidden bg-slate-100 relative"
              style={{ aspectRatio: "16/9" }}
              onClick={(e) => e.stopPropagation()}
              title={`Xem video: ${task.title}`}
            >
              <Image
                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                alt={`YouTube thumbnail cho: ${task.title}`}
                fill
                className="object-cover hover:brightness-110 transition-all"
                unoptimized
                sizes="(max-width: 768px) 100vw, 400px"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors">
                <div className="size-8 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                  <Youtube className="size-4 text-red-600 ml-0.5" />
                </div>
              </div>
            </a>
          );
        })()}

        {/* 4. Task title — line clamp 2, below thumbnail */}
        <h4 className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-2">
          {task.title}
        </h4>

        {/* Assignees */}
        {task.assignee_ids.length > 0 && (
          <div className="flex items-center gap-2 min-h-0 min-w-0">
            <div className="flex -space-x-1 shrink-0">
              {displayAssignees.map((id, i) => {
                const name = staffMap[id] ?? "NN";
                return (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <Avatar className="size-5 border-2 border-white cursor-default">
                        <AvatarFallback
                          className={cn("text-[8px] font-semibold", AVATAR_COLORS[i % AVATAR_COLORS.length])}
                        >
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs z-[200]">
                      <div className="font-medium">{name}</div>
                      {staffRoleMap[id] && (
                        <div className="text-muted-foreground text-[10px] capitalize">{staffRoleMap[id]}</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {extraAssigneeCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="size-5 border-2 border-white bg-slate-200">
                      <AvatarFallback className="text-[8px] text-slate-600">
                        +{extraAssigneeCount}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs z-[200]">
                    <div className="font-medium">{extraAssigneeCount} người khác</div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-slate-500 truncate min-w-0 flex-1">
                  {assigneeNamesStr}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs z-[200] max-w-[200px]">
                <div className="font-medium mb-1">Người phụ trách</div>
                {task.assignee_ids.map((id) => {
                  const name = staffMap[id] ?? "NN";
                  const role = staffRoleMap[id];
                  return (
                    <div key={id} className="text-muted-foreground">
                      {name}{role ? ` (${role})` : ""}
                    </div>
                  );
                })}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Progress */}
        {task.progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Tiến độ</span>
              <span className="font-medium text-slate-700">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1.5" />
          </div>
        )}

      </div>
    </div>
  );
}
