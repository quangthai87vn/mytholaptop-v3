"use client";

import { useState } from "react";
import type { Campaign } from "@/lib/workspace/types";
import { Calendar, Clapperboard, DollarSign, Users, Target, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CampaignStatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

interface CampaignTypeConfig {
  label: string;
  color: string;
}

interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  canDelete?: boolean;
  /** Total tasks in campaign (all task_type values) */
  taskCount?: number;
  /** Completed tasks in campaign (status = completed only, NOT cancelled) */
  completedTaskCount?: number;
  /** Media/content production tasks in campaign */
  mediaTaskCount?: number;
  /** Completed media tasks */
  mediaCompletedCount?: number;
  statusConfig?: CampaignStatusConfig;
  typeConfig?: CampaignTypeConfig;
  staffMap?: Record<string, string>;
  /** INTERN: hide action buttons */
  isIntern?: boolean;
}

const FALLBACK_STATUS: Record<string, CampaignStatusConfig> = {
  planning:  { label: "Lên kế hoạch", color: "text-slate-600", bgColor: "bg-slate-100" },
  active:    { label: "Đang chạy",     color: "text-green-700", bgColor: "bg-green-100" },
  paused:   { label: "Tạm dừng",    color: "text-orange-700", bgColor: "bg-orange-100" },
  completed:{ label: "Hoàn thành",  color: "text-blue-700",  bgColor: "bg-blue-100" },
  archived: { label: "Lưu trữ",     color: "text-gray-500",  bgColor: "bg-gray-100" },
  cancelled:{ label: "Đã hủy",     color: "text-red-500",   bgColor: "bg-red-50" },
};

const FALLBACK_TYPE: Record<string, CampaignTypeConfig> = {
  product_launch:   { label: "Khai trương",     color: "#3b82f6" },
  seasonal:         { label: "Theo mùa",         color: "#8b5cf6" },
  social_media:     { label: "Mạng xã hội",       color: "#06b6d4" },
  seo:              { label: "SEO",                color: "#22c55e" },
  advertising:      { label: "Quảng cáo",          color: "#f97316" },
  email_marketing:  { label: "Email Marketing",   color: "#ec4899" },
  influencer:      { label: "Influencer",         color: "#eab308" },
};

export function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onArchive,
  canDelete = true,
  taskCount = 0,
  completedTaskCount = 0,
  mediaTaskCount = 0,
  mediaCompletedCount = 0,
  statusConfig,
  typeConfig,
  staffMap = {},
  isIntern = false,
}: CampaignCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const effectiveStatus = statusConfig ?? FALLBACK_STATUS[campaign.status] ?? FALLBACK_STATUS.planning;
  const effectiveType = typeConfig ?? FALLBACK_TYPE[campaign.campaign_type ?? ""] ?? { label: "—" };

  const canArchive = onArchive && campaign.status !== "archived";

  const now = new Date();
  const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
  const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = endDate ? endDate < now && campaign.status === "active" : false;
  const isEndingSoon = !isOverdue && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && campaign.status === "active";

  const pct = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

  const fmt = (ds: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
      const [y, m, d] = ds.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
    }
    return new Date(ds).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const handleArchive = () => {
    setShowArchiveDialog(false);
    onArchive?.(campaign.id);
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete?.(campaign.id);
  };

  return (
    <>
      <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        {/* Action buttons — floating top-right, hover to reveal */}
        {!isIntern && (onEdit || onDelete || onArchive) && (
          <div
            className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-slate-700 shadow-sm"
                onClick={() => onEdit(campaign)}
              >
                <span className="sr-only">Sửa</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Button>
            )}
            {canArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-orange-500 shadow-sm"
                onClick={() => setShowArchiveDialog(true)}
                title="Lưu trữ"
              >
                <span className="sr-only">Lưu trữ</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </Button>
            )}
            {onDelete && canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 shadow-sm"
                onClick={() => setShowDeleteDialog(true)}
                title="Xóa vĩnh viễn"
              >
                <span className="sr-only">Xóa</span>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            )}
          </div>
        )}

        <Link href={`/campaigns/${campaign.id}`} className="block p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {campaign.name}
              </h3>
              {campaign.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {campaign.description}
                </p>
              )}
            </div>
          </div>

          {/* Badges: status + type + task counts */}
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${effectiveStatus.bgColor} ${effectiveStatus.color}`}>
              {effectiveStatus.label}
            </span>
            {campaign.campaign_type && (
              <Badge variant="outline" className="text-xs">
                {effectiveType.label}
              </Badge>
            )}
            {taskCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Target className="size-3" />
                {taskCount} công việc
              </Badge>
            )}
            {mediaTaskCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1 text-slate-600 border-slate-300">
                <Clapperboard className="size-3" />
                {mediaTaskCount} nội dung
              </Badge>
            )}
          </div>

          {/* Task progress bar */}
          {taskCount > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-green-500" />
                  Hoàn thành
                </span>
                <span>{completedTaskCount}/{taskCount}</span>
              </div>
              <Progress
                value={pct}
                className="h-2"
              />
            </div>
          )}

          {/* Quick metrics row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100">
            {(campaign.start_date || campaign.end_date) ? (
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0" />
                <span className={isOverdue ? "text-red-500 font-medium" : isEndingSoon ? "text-orange-500 font-medium" : ""}>
                  {campaign.start_date ? fmt(campaign.start_date) : "—"}
                  {campaign.end_date && ` – ${fmt(campaign.end_date)}`}
                  {isOverdue && " (Quá hạn)"}
                  {!isOverdue && isEndingSoon && " (Sắp kết thúc)"}
                </span>
              </div>
            ) : null}
            {campaign.target_metrics && Object.keys(campaign.target_metrics).length > 0 && (
              <div className="flex items-center gap-1.5">
                <Target className="size-3.5 shrink-0 text-slate-400" />
                <span>{Object.values(campaign.target_metrics).reduce((s, v) => s + v, 0).toLocaleString("vi-VN")} mục tiêu</span>
              </div>
            )}
            {campaign.budget && (
              <div className="flex items-center gap-1.5 ml-auto">
                <DollarSign className="size-3.5 shrink-0 text-slate-400" />
                <span>{campaign.budget.toLocaleString("vi-VN")} VNĐ</span>
              </div>
            )}
          </div>

          {/* Channels */}
          {campaign.channels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span className="text-xs text-slate-400">Kênh:</span>
              {campaign.channels.slice(0, 3).map((ch) => (
                <Badge key={ch} variant="secondary" className="text-xs py-0">
                  {ch}
                </Badge>
              ))}
              {campaign.channels.length > 3 && (
                <span className="text-xs text-slate-400">+{campaign.channels.length - 3}</span>
              )}
            </div>
          )}

          {/* Team members */}
          {(campaign._assignee_ids?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Users className="size-3" />
                {campaign._unique_assignees ?? 0}
              </span>
              <div className="flex -space-x-1.5">
                {(campaign._assignee_ids ?? []).slice(0, 5).map((id, i) => {
                  const name = staffMap[id] ?? "NN";
                  const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? "").join("");
                  const colors = [
                    "bg-blue-100 text-blue-700",
                    "bg-green-100 text-green-700",
                    "bg-purple-100 text-purple-700",
                    "bg-orange-100 text-orange-700",
                    "bg-pink-100 text-pink-700",
                  ];
                  return (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>
                        <Avatar className="size-6 border-2 border-white cursor-default">
                          <AvatarFallback className={cn("text-[9px]", colors[i % colors.length])}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {name}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {((campaign._assignee_ids?.length ?? 0) > 5) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="size-6 border-2 border-white bg-slate-100">
                        <AvatarFallback className="text-[9px] text-slate-600">
                          +{Math.max(0, (campaign._assignee_ids?.length ?? 0) - 5)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {(campaign._assignee_ids ?? []).slice(5).map((id: string) => staffMap[id] ?? "NN").join(", ")}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {campaign.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
              {campaign.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  #{tag}
                </span>
              ))}
              {campaign.tags.length > 3 && (
                <span className="px-2 py-0.5 text-slate-400 text-xs">
                  +{campaign.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Archive Dialog */}
      <ConfirmDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        title="Lưu trữ chiến dịch?"
        description="Chiến dịch sẽ bị ẩn khỏi danh sách. Bạn có thể khôi phục sau nếu cần."
        confirmLabel="Lưu trữ"
        cancelLabel="Hủy"
        onConfirm={handleArchive}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa vĩnh viễn chiến dịch?"
        description="Hành động này không thể hoàn tác. Dữ liệu sẽ mất vĩnh viễn."
        variant="destructive"
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy"
        onConfirm={handleDelete}
      />
    </>
  );
}
