"use client";

import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { TASK_TYPE_LABELS, PLATFORM_LABELS, STATUS_CONFIG } from "@/lib/workspace/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, ExternalLink, CheckCircle2, Clock } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  facebook:  "bg-blue-100 text-blue-700 border-blue-200",
  tiktok:   "bg-pink-100 text-pink-700 border-pink-200",
  youtube:   "bg-red-100 text-red-700 border-red-200",
  website:   "bg-green-100 text-green-700 border-green-200",
  zalo:     "bg-blue-50 text-blue-600 border-blue-100",
  instagram: "bg-purple-100 text-purple-700 border-purple-200",
  seo:      "bg-slate-100 text-slate-600 border-slate-200",
};

function displayDate(dateStr: string): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${String(y).slice(-2)}`;
  }
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

function getAssigneeInitials(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

interface WorkflowCardProps {
  task: Task;
  projectName?: string;
  campaignName?: string;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
  platformOptions?: Array<{ code: string; name: string; color: string }>;
  /** From pm_task_assets count */
  assetCount?: number;
  onClick?: () => void;
}

export function WorkflowCard({
  task,
  projectName,
  campaignName,
  taskTypeColorMap = {},
  platformOptions = [],
  assetCount,
  onClick,
}: WorkflowCardProps) {
  // Resolve task type config
  const typeCfg = taskTypeColorMap[task.task_type ?? ""];
  const typeLabel = task.task_type
    ? typeCfg?.label ?? TASK_TYPE_LABELS[task.task_type] ?? task.task_type
    : null;

  // Resolve platforms: metadata.platform_ids[] or fallback to task.platform (single string)
  const rawPlatformIds = task.metadata?.platform_ids as string[] | undefined;
  const platformIds: string[] = rawPlatformIds?.length
    ? rawPlatformIds
    : task.platform ? [task.platform] : [];

  // Due date check
  const dueDateMs = task.due_date
    ? (() => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(task.due_date!)) {
          const [y, m, d] = task.due_date!.split("-").map(Number);
          return new Date(y, m - 1, d, 12, 0, 0).getTime();
        }
        return new Date(task.due_date!).getTime();
      })()
    : null;

  const isOverdue =
    dueDateMs !== null &&
    dueDateMs < Date.now() &&
    task.status !== "completed";

  // Published URL
  const publishedUrl = task.published_url;

  // Assignee initials (up to 3)
  const displayAssignees = task.assignee_ids.slice(0, 3);

  // Status badge
  const statusCfg = STATUS_CONFIG[task.status];
  const statusLabel = statusCfg?.label ?? task.status;

  // Content status badge (if task has content_status)
  const contentStatus = task.metadata?.content_status as string | undefined;

  // Workflow badge color: task type color or primary
  const barColor = typeCfg?.color ?? "#E60012";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer overflow-hidden relative group"
    >
      {/* Left color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: barColor }}
      />

      <div className="p-3 pl-4">
        {/* Row 1: Task type + Status */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {typeLabel && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 font-medium border-0"
              style={{
                backgroundColor: typeCfg?.bgColor ?? "bg-slate-100",
                color: typeCfg?.color ?? "#6b7280",
              }}
            >
              {typeLabel}
            </Badge>
          )}
          {contentStatus && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 font-medium border border-slate-200 bg-slate-50 text-slate-600"
            >
              {contentStatus}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 ml-auto font-normal border-0",
              statusCfg?.bgColor ?? "bg-slate-100",
              statusCfg?.color ?? "text-slate-600"
            )}
          >
            {statusLabel}
          </Badge>
        </div>

        {/* Row 2: Title */}
        <h4 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2 mb-2">
          {task.title}
        </h4>

        {/* Row 3: Project + Campaign */}
        {(projectName || campaignName) && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-500">
            {projectName && (
              <span className="font-medium truncate max-w-[100px]">{projectName}</span>
            )}
            {projectName && campaignName && (
              <span className="text-slate-300">/</span>
            )}
            {campaignName && (
              <span className="truncate max-w-[100px]">{campaignName}</span>
            )}
          </div>
        )}

        {/* Row 4: Platform badges */}
        {platformIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {platformIds.map((code) => {
              const platformName = PLATFORM_LABELS[code]
                ?? platformOptions.find((p) => p.code === code)?.name
                ?? code;
              return (
                <Badge
                  key={code}
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 font-normal border",
                    PLATFORM_COLORS[code] ?? "bg-slate-100 text-slate-600 border-slate-200"
                  )}
                >
                  {platformName}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Row 5: Due date + Assignees + asset count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.due_date && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[11px]",
                  isOverdue ? "text-red-600 font-medium" : "text-slate-500"
                )}
              >
                {isOverdue ? <Clock className="size-3" /> : <Calendar className="size-3" />}
                <span>{displayDate(task.due_date)}</span>
              </div>
            )}
            {assetCount !== undefined && assetCount > 0 && (
              <span className="text-[11px] text-slate-400">{assetCount} file</span>
            )}
          </div>

          {displayAssignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {displayAssignees.map((_, i) => (
                <Avatar
                  key={i}
                  className="size-5 border-2 border-white"
                >
                  <AvatarFallback
                    className="text-[8px] font-medium"
                    style={{
                      backgroundColor: `${barColor}20`,
                      color: barColor,
                    }}
                  >
                    {getAssigneeInitials(i)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignee_ids.length > 3 && (
                <div className="size-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-slate-600 font-medium">
                    +{task.assignee_ids.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 6: Published URL */}
        {publishedUrl && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <a
              href={publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle2 className="size-3 shrink-0" />
              <span className="truncate">Xem bài đăng</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
