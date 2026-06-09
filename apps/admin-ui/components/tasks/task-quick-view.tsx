"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { TASK_TYPE_CONFIG, STATUS_CONFIG } from "@/lib/workspace/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Paperclip,
  MessageSquare,
  ExternalLink,
  Edit2,
  Archive,
  Trash2,
  CheckSquare,
  ArrowRight,
  Clock,
  User,
  RotateCcw,
  Monitor,
} from "lucide-react";
import Link from "next/link";

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

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  // YYYY-MM-DD: safe parse with noon to avoid UTC roll-back
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDaysLeft(dueDateStr: string | undefined | null): string {
  if (!dueDateStr) return "";
  // Parse as local date to avoid UTC midnight roll-back
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
  if (diff < 0) return `${Math.abs(diff)} ngày quá hạn`;
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  return `${diff} ngày nữa`;
}

interface TaskQuickViewProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (task: Task, closeSheet: () => void) => void;
  onArchive?: (task: Task, closeSheet: () => void) => void;
  onRestore?: (task: Task, closeSheet: () => void) => void;
  onDelete?: (task: Task, closeSheet: () => void) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  projectName?: string;
  campaignName?: string;
  platformMap?: Record<string, { name: string; color: string }>;
}

export function TaskQuickView({
  task,
  open,
  onOpenChange,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  canArchive = true,
  canDelete = false,
  staffMap = {},
  staffRoleMap = {},
  projectName,
  campaignName,
  platformMap = {},
}: TaskQuickViewProps) {
  if (!task) return null;

  const taskTypeCfg = task.task_type ? TASK_TYPE_CONFIG[task.task_type] : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = !!(
    task.due_date &&
    new Date(task.due_date) < today &&
    task.status !== "completed" &&
    task.status !== "cancelled"
  );
  const daysLeft = getDaysLeft(task.due_date);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-full flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-5 border-b border-slate-100 shrink-0">
          {/* Task type */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {taskTypeCfg && (
              <Badge
                variant="outline"
                className={cn("text-xs px-2 py-0.5 font-medium", taskTypeCfg.bgColor, taskTypeCfg.color)}
              >
                {taskTypeCfg.label}
              </Badge>
            )}
            {task.is_archived === true && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 font-medium bg-slate-100 text-slate-500 border-slate-300">
                Đã lưu trữ
              </Badge>
            )}
          </div>

          <SheetTitle className="text-base font-semibold text-slate-900 leading-snug">
            {task.title}
          </SheetTitle>
          {task.description && (
            <SheetDescription className="line-clamp-2 mt-1">
              {task.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Status + Due Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Trạng thái</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-2 py-1 font-medium",
                    STATUS_CONFIG[task.status]?.bgColor,
                    STATUS_CONFIG[task.status]?.color
                  )}
                >
                  {STATUS_CONFIG[task.status]?.label ?? task.status}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Hạn chót</p>
                {task.due_date ? (
                  <div className="space-y-0.5">
                    <p className={cn(
                      "text-sm font-medium flex items-center gap-1.5",
                      isOverdue && "text-red-600"
                    )}>
                      <Calendar className="size-3.5" />
                      {formatDate(task.due_date)}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isOverdue ? "text-red-500 font-medium" : "text-slate-500"
                    )}>
                      {daysLeft}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Chưa có</p>
                )}
              </div>
            </div>

            {/* Project / Campaign */}
            {(projectName || campaignName) && (
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Liên quan</p>
                <div className="flex flex-wrap gap-2">
                  {projectName && (
                    <Link
                      href="/projects"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-medium text-slate-700 transition-colors"
                    >
                      <span className="text-slate-500">Dự án:</span>
                      {projectName}
                      <ExternalLink className="size-3 text-slate-400" />
                    </Link>
                  )}
                  {campaignName && (
                    <Link
                      href="/campaigns"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md text-xs font-medium text-blue-700 transition-colors"
                    >
                      <span className="text-blue-500">Chiến dịch:</span>
                      {campaignName}
                      <ExternalLink className="size-3 text-blue-400" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Assignees */}
            {task.assignee_ids.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                  Người phụ trách
                </p>
                <div className="flex flex-wrap gap-2">
                  {task.assignee_ids.map((id, i) => {
                    const name = staffMap[id] ?? "—";
                    const role = staffRoleMap[id];
                    return (
                      <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg">
                        <Avatar className="size-7">
                          <AvatarFallback
                            className={cn("text-[10px]", AVATAR_COLORS[i % AVATAR_COLORS.length])}
                          >
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium text-slate-700">{name}</p>
                          {role && <p className="text-[10px] text-slate-400 capitalize">{role}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Platforms */}
            {(() => {
              const meta = (task?.metadata as Record<string, unknown>) ?? {};
              const platformIds = (meta.platform_ids as string[] | undefined) ?? [];
              if (platformIds.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Nền tảng
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {platformIds.map((id) => {
                      const platform = platformMap[id];
                      return (
                        <span
                          key={id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            backgroundColor: platform ? `${platform.color}15` : "#f3f4f6",
                            borderColor: platform ? `${platform.color}40` : "#e2e8f0",
                            color: platform ? platform.color : "#6b7280",
                          }}
                        >
                          <Monitor className="size-3.5 shrink-0" />
                          {platform?.name ?? id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Progress */}
            {task.progress > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tiến độ</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Hoàn thành</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>
              </div>
            )}

            {/* Checklist Progress */}
            {task.checklist_progress && task.checklist_progress.total > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1.5">
                  <CheckSquare className="size-3.5" />
                  Checklist
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {task.checklist_progress.completed}/{task.checklist_progress.total} hoàn thành
                    </span>
                    <span className="font-medium">
                      {task.checklist_progress.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={task.checklist_progress.percentage}
                    className={cn(
                      "h-2",
                      task.checklist_progress.percentage === 100 && "[&>div]:bg-green-500"
                    )}
                  />
                </div>
              </div>
            )}

            {/* Updated metadata */}
            {task.updated_at && (
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-0.5">
                <p>
                  <Clock className="size-3 inline mr-1" />
                  Cập nhật lần cuối:{" "}
                  <span className="font-medium text-slate-700">
                    {new Date(task.updated_at).toLocaleString("vi-VN")}
                  </span>
                </p>
                {task.updated_by_user_id && (
                  <p>
                    <User className="size-3 inline mr-1" />
                    Người cập nhật:{" "}
                    <span className="font-medium text-slate-700">
                      {staffMap[task.updated_by_user_id] || task.updated_by_user_id}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Attachments */}
            {task.attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1.5">
                  <Paperclip className="size-3.5" />
                  File đính kèm ({task.attachments.length})
                </p>
                <div className="space-y-1.5">
                  {task.attachments.slice(0, 3).map((att, i) => (
                    <a
                      key={i}
                      href={att.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Paperclip className="size-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{att.name}</p>
                        {att.type && (
                          <p className="text-[10px] text-slate-400">{att.type}</p>
                        )}
                      </div>
                    </a>
                  ))}
                  {task.attachments.length > 3 && (
                    <p className="text-xs text-slate-400 pl-1">
                      +{task.attachments.length - 3} file khác
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/tasks/${task.id}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Xem chi tiết
              <ArrowRight className="size-4" />
            </Link>

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onEdit(task, () => onOpenChange(false));
                }}
              >
                <Edit2 className="size-3.5" />
                Sửa
              </Button>
            )}

            {onRestore && task.is_archived === true && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                onClick={() => {
                  onOpenChange(false);
                  onRestore(task, () => onOpenChange(false));
                }}
              >
                <RotateCcw className="size-3.5" />
                Khôi phục
              </Button>
            )}

            {onArchive && canArchive && task.is_archived !== true && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => {
                  onOpenChange(false);
                  onArchive(task, () => onOpenChange(false));
                }}
              >
                <Archive className="size-3.5" />
                Lưu trữ
              </Button>
            )}

            {onDelete && canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(task, () => onOpenChange(false));
                }}
              >
                <Trash2 className="size-3.5" />
                Xóa
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
