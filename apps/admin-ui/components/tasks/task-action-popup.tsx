"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { TASK_TYPE_CONFIG, STATUS_CONFIG, TASK_PRIORITY_CONFIG } from "@/lib/workspace/types";
import type { TaskPriority } from "@/lib/workspace/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Edit2,
  Archive,
  Trash2,
  Copy,
  RotateCcw,
  Calendar,
  CheckSquare,
  Monitor,
  FolderOpen,
  Megaphone,
  Youtube,
  ExternalLink,
} from "lucide-react";

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

function formatShortDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
  }
  const dt = new Date(dateStr);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getFullYear()).slice(-2)}`;
}

function getDaysLeftStr(dueDateStr: string, taskStatus: string): string {
  const due = /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)
    ? (() => {
        const [y, m, d] = dueDateStr.split("-").map(Number);
        return new Date(y, m - 1, d, 12, 0, 0);
      })()
    : new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (taskStatus === "completed" || taskStatus === "cancelled") return "";

  if (diff < 0) return `quá ${Math.abs(diff)} ngày`;
  if (diff === 0) return "hôm nay";
  if (diff === 1) return "ngày mai";
  return `${diff} ngày nữa`;
}

interface TaskActionPopupProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: Task) => void;
  onCopy?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  role?: string;
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
  projectMap?: Record<string, string>;
  campaignMap?: Record<string, string>;
  platformMap?: Record<string, { name: string; color: string }>;
}

export function TaskActionPopup({
  task,
  open,
  onOpenChange,
  onEdit,
  onCopy,
  onArchive,
  onRestore,
  onDelete,
  role,
  staffMap = {},
  staffRoleMap = {},
  taskTypeColorMap = {},
  projectMap = {},
  campaignMap = {},
  platformMap = {},
}: TaskActionPopupProps) {
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const isIntern = role === "intern";
  const isStaff = role === "editor" || role === "viewer";
  const isArchived = task?.is_archived ?? false;
  const isCancelled = task?.status === "cancelled";
  const isCompleted = task?.status === "completed";

  const canEditAdmin = !isArchived && !isCancelled;
  const canCopy = !isArchived && !!onCopy;
  const canArchive = !isArchived && !isCancelled && !isIntern && !isStaff && !!onArchive;
  const canRestore = isArchived && !isIntern && !isStaff && !!onRestore;
  const canDelete = !isIntern && !isStaff && !!onDelete;
  const canEditIntern = !isArchived && !isCompleted && !isCancelled && !!onEdit;
  const canEdit = isSuperAdmin || isAdmin ? canEditAdmin : canEditIntern;

  const masterDataColor = task?.task_type ? taskTypeColorMap[task.task_type] : undefined;
  const fallbackConfig = task?.task_type ? TASK_TYPE_CONFIG[task.task_type] : undefined;
  const taskTypeCfg = task?.task_type ? (masterDataColor ?? fallbackConfig ?? null) : null;

  const typeColor = masterDataColor?.color ?? taskTypeCfg?.color ?? "#E60012";
  const typeBgColor = masterDataColor?.bgColor ?? taskTypeCfg?.bgColor ?? "bg-red-50";

  const isOverdue = (() => {
    if (!task?.due_date) return false;
    const due = /^\d{4}-\d{2}-\d{2}$/.test(task.due_date)
      ? (() => {
          const [y, m, d] = task.due_date.split("-").map(Number);
          return new Date(y, m - 1, d, 12, 0, 0);
        })()
      : new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today && task.status !== "completed" && task.status !== "cancelled";
  })();

  const meta = (task?.metadata as Record<string, unknown>) ?? {};
  const platformIds = (meta.platform_ids as string[] | undefined) ?? [];

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-[calc(100vw-32px)] p-0 gap-0 overflow-hidden rounded-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        {/* Header — nền đỏ MTL, title trắng */}
        <div className="bg-[#E60012] px-5 py-4">
          {/* Thumbnail section */}
          {(task.youtube_url || task.thumbnail_url) && (
            <div
              className="relative rounded-lg overflow-hidden mb-3"
              style={{ aspectRatio: "16/9", position: "relative" }}
            >
              {task.youtube_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.youtube.com/vi/${(() => {
                      const match = task.youtube_url!.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
                      return match ? match[1] : "";
                    })()}/mqdefault.jpg`}
                    alt="YouTube thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="size-10 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                      <Youtube className="size-5 text-red-600 ml-0.5" />
                    </div>
                  </div>
                </>
              ) : task.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={task.thumbnail_url!}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Type badge */}
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                {task.priority && task.priority !== "normal" && (
                  <Badge
                    className={cn("text-[11px] px-2 py-0.5 font-semibold")}
                    style={{
                      backgroundColor: `${TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color}30`,
                      color: "white",
                      borderColor: "transparent",
                    }}
                  >
                    {TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.label}
                  </Badge>
                )}
                {taskTypeCfg ? (
                  <Badge
                    className={cn(
                      "text-[11px] px-2 py-0.5 font-semibold border-0",
                    )}
                    style={{
                      backgroundColor: `${typeColor}30`,
                      color: "white",
                      borderColor: "transparent",
                    }}
                  >
                    {taskTypeCfg.label}
                  </Badge>
                ) : (
                  <Badge
                    className="text-[11px] px-2 py-0.5 font-semibold bg-white/20 text-white border-0"
                  >
                    Chưa phân loại
                  </Badge>
                )}
                {isArchived && (
                  <Badge className="text-[11px] px-2 py-0.5 font-medium bg-white/20 text-white border-0">
                    Đã lưu trữ
                  </Badge>
                )}
              </div>
              {/* Task title — trắng */}
              <h2 className="text-[16px] font-bold text-white leading-snug line-clamp-2">
                {task.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-5 py-4 space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Trạng thái</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] px-2 py-0.5 font-medium",
                STATUS_CONFIG[task.status]?.bgColor,
                STATUS_CONFIG[task.status]?.color
              )}
            >
              {STATUS_CONFIG[task.status]?.label ?? task.status}
            </Badge>
          </div>

          {/* Priority */}
          {task.priority && task.priority !== "normal" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Độ ưu tiên</span>
              <Badge
                className={cn("text-[11px] px-2 py-0.5 font-medium")}
                style={{
                  backgroundColor: `${TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color}18`,
                  color: TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color,
                }}
              >
                {TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.label}
              </Badge>
            </div>
          )}

          {/* Progress */}
          {task.progress > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Tiến độ</span>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <Progress value={task.progress} className="h-2 flex-1" />
                <span className="text-xs font-medium text-slate-700 w-10 text-right">{task.progress}%</span>
              </div>
            </div>
          )}

          {/* Deadline */}
          {task.due_date && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Hạn chót</span>
              <div className="flex items-center gap-1.5">
                <Calendar className={cn("size-3", isOverdue ? "text-red-500" : "text-slate-400")} />
                <span className={cn("text-xs font-medium", isOverdue ? "text-red-600" : "text-slate-700")}>
                  {formatShortDate(task.due_date)}
                </span>
                {!isCompleted && (
                  <span className={cn("text-[10px]", isOverdue ? "text-red-500" : "text-green-600")}>
                    ({getDaysLeftStr(task.due_date, task.status)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Project */}
          {task.project_id && projectMap[task.project_id] && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0 flex items-center gap-1">
                <FolderOpen className="size-3 text-slate-400" />
                Dự án
              </span>
              <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]" title={projectMap[task.project_id]}>
                {projectMap[task.project_id]}
              </span>
            </div>
          )}

          {/* Campaign */}
          {task.campaign_id && campaignMap[task.campaign_id] && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0 flex items-center gap-1">
                <Megaphone className="size-3 text-slate-400" />
                Chiến dịch
              </span>
              <span className="text-xs font-medium text-blue-700 truncate max-w-[200px]" title={campaignMap[task.campaign_id]}>
                {campaignMap[task.campaign_id]}
              </span>
            </div>
          )}

          {/* Assignees */}
          {task.assignee_ids.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Phụ trách</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex -space-x-1 shrink-0">
                  {task.assignee_ids.slice(0, 3).map((id, i) => {
                    const name = staffMap[id] ?? "NN";
                    return (
                      <Avatar key={id} className="size-5 border-2 border-white">
                        <AvatarFallback
                          className={cn("text-[8px] font-semibold", AVATAR_COLORS[i % AVATAR_COLORS.length])}
                        >
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </div>
                <span className="text-xs text-slate-600 truncate">
                  {task.assignee_ids.map((id) => staffMap[id] ?? "NN").join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Platform links */}
          {(task.youtube_url || task.website_url || task.tiktok_url || task.facebook_url) && (
            <div className="flex items-start justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0 flex items-center gap-1 pt-0.5">
                <ExternalLink className="size-3 text-slate-400" />
                Links
              </span>
              <div className="flex flex-wrap gap-1 justify-end">
                {task.youtube_url && (
                  <a
                    href={task.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                  >
                    ▶ YT <ExternalLink className="size-2.5 opacity-50" />
                  </a>
                )}
                {task.tiktok_url && (
                  <a
                    href={task.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors border border-pink-100"
                  >
                    ♪ TikTok <ExternalLink className="size-2.5 opacity-50" />
                  </a>
                )}
                {task.facebook_url && (
                  <a
                    href={task.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    f FB <ExternalLink className="size-2.5 opacity-50" />
                  </a>
                )}
                {task.website_url && (
                  <a
                    href={task.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
                  >
                    🌐 Web <ExternalLink className="size-2.5 opacity-50" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Platforms */}
          {platformIds.length > 0 && (
            <div className="flex items-start justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0 flex items-center gap-1 pt-0.5">
                <Monitor className="size-3 text-slate-400" />
                Nền tảng
              </span>
              <div className="flex flex-wrap gap-1 justify-end">
                {platformIds.slice(0, 4).map((id) => {
                  const platform = platformMap[id];
                  return (
                    <span
                      key={id}
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: platform ? `${platform.color}18` : "#f3f4f6",
                        color: platform ? platform.color : "#6b7280",
                      }}
                    >
                      {platform?.name ?? id}
                    </span>
                  );
                })}
                {platformIds.length > 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                    +{platformIds.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Checklist */}
          {task.checklist_progress && task.checklist_progress.total > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium w-24 shrink-0">Checklist</span>
              <div className="flex items-center gap-1.5">
                {task.checklist_progress.percentage === 100 ? (
                  <CheckSquare className="size-3 text-green-500" />
                ) : (
                  <CheckSquare className="size-3 text-slate-400" />
                )}
                <span className="text-xs text-slate-600 font-medium">
                  {task.checklist_progress.completed}/{task.checklist_progress.total}
                </span>
                {task.checklist_progress.percentage > 0 && (
                  <span className="text-[10px] text-slate-400">({task.checklist_progress.percentage}%)</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {canEdit && (
              <button
                onClick={() => { onOpenChange(false); onEdit?.(task); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[#E60012] text-white hover:bg-[#c00010] transition-colors"
              >
                <Edit2 className="size-4" />
                Sửa
              </button>
            )}
            {canCopy && (
              <button
                onClick={() => { onOpenChange(false); onCopy?.(task); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <Copy className="size-4" />
                Sao chép
              </button>
            )}
            {canRestore && (
              <button
                onClick={() => { onOpenChange(false); onRestore?.(task); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="size-4" />
                Khôi phục
              </button>
            )}
            {canArchive && (
              <button
                onClick={() => { onOpenChange(false); onArchive?.(task); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Archive className="size-4" />
                Lưu trữ
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { onOpenChange(false); onDelete?.(task); }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors col-span-2"
              >
                <Trash2 className="size-4" />
                Xóa vĩnh viễn
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
