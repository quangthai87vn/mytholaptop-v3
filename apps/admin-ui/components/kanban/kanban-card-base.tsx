"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { TASK_TYPE_CONFIG, TASK_PRIORITY_CONFIG } from "@/lib/workspace/types";
import type { Task, TaskPriority } from "@/lib/workspace/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  ExternalLink,
  CheckCircle2,
  Circle,
  Monitor,
  Eye,
  Youtube,
  FileText,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTaskDeadlineLabel } from "@/lib/workspace/date-utils";
import { KanbanCardMenu } from "./kanban-card-menu";

interface KanbanCardBaseProps {
  task: Task;
  /** Called when card body is clicked */
  onCardClick?: (task: Task) => void;
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  campaignMap?: Record<string, string>;
  platformMap?: Record<string, { name: string; color: string }>;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
  /** Menu actions */
  onEdit?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onCopy?: (task: Task) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  disableDrag?: boolean;
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
  const hasBody = !!task.content_body;

  if (!task.content_status && !hasBody) return null;

  const label = hasBody
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
      : hasBody
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-50 text-slate-500 border-slate-200";

  return (
    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 font-medium", colorClass)}>
      {hasBody ? <FileText className="size-3 mr-0.5" /> : <Circle className="size-2 mr-0.5" />}
      {label}
    </Badge>
  );
}

function getPlatformIds(task: Task): string[] {
  const meta = (task.metadata as Record<string, unknown>) ?? {};
  const ids = meta.platform_ids as string[] | undefined;
  return ids ?? [];
}

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function HoverPopup({
  task,
  staffMap,
  staffRoleMap,
  projectMap,
  campaignMap,
  platformMap,
  taskTypeColorMap,
  onCardClick,
  popupStyle,
}: {
  task: Task;
  staffMap: Record<string, string>;
  staffRoleMap: Record<string, string>;
  projectMap: Record<string, string>;
  campaignMap: Record<string, string>;
  platformMap: Record<string, { name: string; color: string }>;
  taskTypeColorMap: Record<string, { color: string; bgColor: string; label: string }>;
  onCardClick?: (task: Task) => void;
  popupStyle?: React.CSSProperties;
}) {
  const masterDataColor = taskTypeColorMap[task.task_type ?? ""];
  const fallbackConfig = TASK_TYPE_CONFIG[task.task_type ?? ""];
  const taskTypeCfg = task.task_type
    ? (masterDataColor ?? fallbackConfig ?? null)
    : null;

  const typeColor = masterDataColor?.color ?? taskTypeCfg?.color ?? "#6b7280";
  const typeBgColor = masterDataColor?.bgColor ?? taskTypeCfg?.bgColor ?? "bg-slate-100";
  const typeLabel = masterDataColor?.label ?? taskTypeCfg?.label ?? "Không phân loại";

  const deadline = getTaskDeadlineLabel(task.due_date, task.status);
  const platformIds = getPlatformIds(task);
  const ytId = task.youtube_url ? extractYouTubeVideoId(task.youtube_url) : null;
  const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  const assigneeNames = task.assignee_ids
    .map((id) => staffMap[id] ?? "NN")
    .filter(Boolean);
  const displayAssignees = task.assignee_ids.slice(0, 4);

  const contentSnippet =
    typeof task.content_body === "string" && task.content_body.length > 0
      ? task.content_body.slice(0, 160) + (task.content_body.length > 160 ? "…" : "")
      : null;

  return (
    <div
      className="absolute z-50 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{
          top: Number(popupStyle?.top ?? 0) + 16,
          left: Number(popupStyle?.left ?? 0) + 16,
        }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Thumbnail */}
      {thumbUrl ? (
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl}
            alt={task.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span
              className="text-[10px] px-2 py-0.5 rounded font-semibold text-white"
              style={{ backgroundColor: `${typeColor}cc` }}
            >
              {typeLabel}
            </span>
          </div>
          {ytId && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-10 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                <Youtube className="size-5 text-red-600 ml-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full px-4 py-3 flex items-center gap-2"
          style={{ background: `linear-gradient(135deg, ${typeColor}18, ${typeColor}08)` }}
        >
          <div
            className="size-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: typeColor }}
          >
            {typeLabel.slice(0, 2)}
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: typeColor }}
          >
            {typeLabel}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Title */}
        <h3 className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">
          {task.title}
        </h3>

        {/* Content snippet */}
        {contentSnippet && (
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 bg-slate-50 rounded-md px-2.5 py-2">
            {contentSnippet}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {task.project_id && projectMap[task.project_id] && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600"
            >
              📁 {projectMap[task.project_id]}
            </span>
          )}
          {task.campaign_id && campaignMap[task.campaign_id] && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600"
            >
              📣 {campaignMap[task.campaign_id]}
            </span>
          )}
        </div>

        {/* Deadline */}
        {deadline && (
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3 text-slate-400" />
            <span
              className={cn(
                "text-[11px] font-medium",
                deadline.overdue ? "text-red-600" : deadline.urgent ? "text-orange-500" : "text-green-600"
              )}
            >
              {deadline.label}
            </span>
          </div>
        )}

        {/* Platform links */}
        {(task.youtube_url || task.website_url || task.tiktok_url || task.facebook_url) && (
          <div className="flex flex-wrap gap-1">
            {task.youtube_url && (
              <a
                href={task.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors border border-red-100"
              >
                ▶ YT <ExternalLink className="size-2.5 opacity-50" />
              </a>
            )}
            {task.tiktok_url && (
              <a
                href={task.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 font-medium hover:bg-pink-100 transition-colors border border-pink-100"
              >
                ♪ TikTok <ExternalLink className="size-2.5 opacity-50" />
              </a>
            )}
            {task.facebook_url && (
              <a
                href={task.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors border border-blue-100"
              >
                f FB <ExternalLink className="size-2.5 opacity-50" />
              </a>
            )}
            {task.website_url && (
              <a
                href={task.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors border border-slate-200"
              >
                🌐 Web <ExternalLink className="size-2.5 opacity-50" />
              </a>
            )}
          </div>
        )}

        {/* Platforms */}
        {platformIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platformIds.slice(0, 3).map((id) => {
              const platform = platformMap[id];
              return (
                <span
                  key={id}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: platform ? `${platform.color}18` : "#f3f4f6",
                    color: platform ? platform.color : "#6b7280",
                  }}
                >
                  <Monitor className="size-2.5 inline mr-0.5" />
                  {platform?.name ?? id}
                </span>
              );
            })}
            {platformIds.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                +{platformIds.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Assignees + CTA */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex -space-x-1.5">
              {displayAssignees.map((id, i) => {
                const name = staffMap[id] ?? "NN";
                return (
                  <Avatar key={id} className="size-6 border-2 border-white">
                    <AvatarFallback
                      className={cn("text-[9px] font-bold", AVATAR_COLORS[i % AVATAR_COLORS.length])}
                    >
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {task.assignee_ids.length > 4 && (
                <span className="text-[9px] text-slate-500 ml-1">
                  +{task.assignee_ids.length - 4}
                </span>
              )}
            </div>
            {assigneeNames.length > 0 && (
              <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                {assigneeNames.slice(0, 3).join(", ")}
                {assigneeNames.length > 3 ? ` +${assigneeNames.length - 3}` : ""}
              </span>
            )}
          </div>

          {onCardClick && (
            <button
              onClick={() => onCardClick(task)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E60012] text-white text-[11px] font-semibold hover:bg-[#c00010] transition-colors shrink-0"
            >
              <Eye className="size-3" />
              Chi tiết
            </button>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div
        className="absolute w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45"
        style={{
          top: "16px",
          left: "-7px",
          transform: "rotate(45deg)",
        }}
      />
    </div>
  );
}

/**
 * Base Kanban card — display only, no action logic.
 * Use `actionMenu` prop to inject any action menu (e.g. "..." button).
 */
export function KanbanCardBase({
  task,
  onCardClick,
  staffMap = {},
  staffRoleMap = {},
  projectMap = {},
  campaignMap = {},
  platformMap = {},
  taskTypeColorMap = {},
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  canArchive = true,
  canDelete = true,
  canRestore = false,
  disableDrag = false,
}: KanbanCardBaseProps) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const masterDataColor = taskTypeColorMap[task.task_type ?? ""];
  const fallbackConfig = TASK_TYPE_CONFIG[task.task_type ?? ""];
  const taskTypeCfg = task.task_type
    ? (masterDataColor ?? fallbackConfig ?? null)
    : null;

  const typeColor = masterDataColor?.color ?? taskTypeCfg?.color ?? "#6b7280";
  const typeBgColor = masterDataColor?.bgColor ?? taskTypeCfg?.bgColor ?? "bg-slate-100";

  const isArchived = task.is_archived ?? false;
  const platformIds = getPlatformIds(task);
  const displayPlatforms = platformIds.slice(0, 3);
  const extraPlatformCount = platformIds.length - 3;

  const assigneeNames = task.assignee_ids
    .map((id) => staffMap[id] ?? "NN")
    .filter(Boolean);
  const displayAssignees = task.assignee_ids.slice(0, 2);
  const extraAssigneeCount = Math.max(0, task.assignee_ids.length - 2);
  const visibleNames = assigneeNames.slice(0, 3);
  const extraNameCount = Math.max(0, assigneeNames.length - 3);
  const assigneeNamesStr = visibleNames.join(", ") + (extraNameCount > 0 ? ` +${extraNameCount}` : "");

  const hasYouTube = !!(task as unknown as Record<string, unknown>)?.youtube_url;
  const youtubeUrl = hasYouTube ? (task as unknown as Record<string, unknown>)?.youtube_url as string : null;

  const deadline = getTaskDeadlineLabel(task.due_date, task.status);

  const handleMouseEnter = (e: React.MouseEvent) => {
    hoverTimerRef.current = setTimeout(() => {
      setPopupPos({ top: e.clientY, left: e.clientX });
      setHovered(true);
      setMounted(true);
    }, 120);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (hovered) {
      setPopupPos({ top: e.clientY, left: e.clientX });
    }
  };
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHovered(false);
    setMounted(false);
  };

  return (
    <div
      className={cn("relative", hovered && "z-50")}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover popup — rendered via portal to escape overflow-hidden clipping */}
      {hovered && mounted && createPortal(
        <HoverPopup
          task={task}
          staffMap={staffMap}
          staffRoleMap={staffRoleMap}
          projectMap={projectMap}
          campaignMap={campaignMap}
          platformMap={platformMap}
          taskTypeColorMap={taskTypeColorMap}
          onCardClick={onCardClick}
          popupStyle={{ top: popupPos.top, left: popupPos.left }}
        />,
        document.body
      )}

      {/* Card body */}
      <div
        className={cn(
          "relative bg-white rounded-lg border border-slate-200 min-w-0 max-w-[300px] w-full overflow-hidden",
          "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 select-none overflow-hidden",
          onCardClick ? "cursor-pointer" : "cursor-default"
        )}
      >
        {/* 1. Task type left border accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l pointer-events-none"
          style={{ backgroundColor: typeColor }}
        />

        {/* 1b. Action menu — top-right corner */}
        {(onEdit || onCopy) && (
          <div className="absolute top-2 right-2 z-10">
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
        )}

        {/* 2. Card body */}
        <div
          className="pl-3 pr-10 pt-2.5 pb-2.5 space-y-1.5 min-w-0"
          onClick={(e) => {
            if (onCardClick) {
              e.stopPropagation();
              onCardClick(task);
            }
          }}
        >

          {/* Thumbnail → Title → Meta → Assignees → Progress (Notion/Trello style) */}

          {/* 1. Thumbnail (if any) */}
          {youtubeUrl ? (
            <div className="rounded-md overflow-hidden -mx-0.5" style={{ aspectRatio: "16/9" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${extractYouTubeVideoId(youtubeUrl)}/hqdefault.jpg`}
                alt="Thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : task.thumbnail_url ? (
            <div className="rounded-md overflow-hidden -mx-0.5" style={{ aspectRatio: "16/9" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.thumbnail_url!}
                alt="Thumbnail"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : null}

          {/* 2. Task title */}
          <h4 className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-2 break-words">
            {task.title}
          </h4>

          {/* 3. Meta row: type badge + priority dot (always visible) + archived + deadline */}
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
            ) : null}
            {/* Priority dot — always shown (Notion style) */}
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
            {isArchived ? (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4.5 font-medium bg-slate-100 text-slate-500 border-slate-300"
              >
                Đã lưu trữ
              </Badge>
            ) : null}
            {deadline ? (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 font-medium rounded",
                  deadline.overdue
                    ? "bg-red-50 text-red-600"
                    : deadline.urgent
                    ? "bg-orange-50 text-orange-600"
                    : "bg-slate-50 text-slate-500"
                )}
              >
                <Calendar className="size-2.5 inline mr-0.5" />
                {deadline.label}
              </span>
            ) : null}
          </div>

          {/* 4. Assignees (compact) */}
          {task.assignee_ids.length > 0 ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex -space-x-1 shrink-0">
                {displayAssignees.map((id, i) => {
                  const name = staffMap[id] ?? "NN";
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <Avatar className="size-5 border-2 border-white">
                          <AvatarFallback
                            className={cn("text-[8px] font-semibold", AVATAR_COLORS[i % AVATAR_COLORS.length])}
                          >
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs z-[200]">
                        <div className="font-medium">{name}</div>
                        {staffRoleMap[id] ? (
                          <div className="text-muted-foreground text-[10px]">{staffRoleMap[id]}</div>
                        ) : null}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {extraAssigneeCount > 0 ? (
                  <Avatar className="size-5 border-2 border-white bg-slate-200">
                    <AvatarFallback className="text-[8px] text-slate-600">+{extraAssigneeCount}</AvatarFallback>
                  </Avatar>
                ) : null}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[11px] text-slate-500 truncate min-w-0 flex-1">
                    {assigneeNamesStr}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs z-[200] max-w-[200px]">
                  <div className="font-medium mb-1">Người phụ trách</div>
                  {task.assignee_ids.map((id) => (
                    <div key={id} className="text-muted-foreground">
                      {staffMap[id] ?? "NN"}{staffRoleMap[id] ? ` (${staffRoleMap[id]})` : ""}
                    </div>
                  ))}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}

          {/* 5. Progress bar — single block */}
          {task.progress > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Tiến độ</span>
                <span className="font-medium text-slate-700">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1.5" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
