"use client";

import { cn } from "@/lib/utils";
import type { MediaWorkflow, MediaStage } from "@/lib/workspace/types";
import {
  MEDIA_PIPELINE_STAGES,
  CONTENT_TYPE_LABELS,
  PLATFORM_LABELS,
} from "@/lib/workspace/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Sparkles, ExternalLink } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700 border-blue-200",
  youtube: "bg-red-100 text-red-700 border-red-200",
  tiktok: "bg-pink-100 text-pink-700 border-pink-200",
  website: "bg-green-100 text-green-700 border-green-200",
  zalo: "bg-blue-50 text-blue-600 border-blue-100",
  instagram: "bg-purple-100 text-purple-700 border-purple-200",
};

interface WorkflowCardProps {
  workflow: MediaWorkflow;
  onClick?: () => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const isOverdue =
    workflow.due_date &&
    new Date(workflow.due_date) < new Date() &&
    workflow.status !== "published";

  const platformColor = workflow.platform
    ? PLATFORM_COLORS[workflow.platform] ?? "bg-slate-100 text-slate-600"
    : "bg-slate-100 text-slate-600";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer overflow-hidden"
    >
      {/* Platform colored top bar */}
      {workflow.platform && (
        <div
          className={cn(
            "h-1",
            workflow.platform === "facebook" && "bg-blue-500",
            workflow.platform === "youtube" && "bg-red-500",
            workflow.platform === "tiktok" && "bg-pink-500",
            workflow.platform === "website" && "bg-green-500",
            workflow.platform === "zalo" && "bg-blue-400",
            workflow.platform === "instagram" && "bg-purple-500"
          )}
        />
      )}

      <div className="p-3">
        {/* Content type + Platform badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {CONTENT_TYPE_LABELS[workflow.content_type] ?? workflow.content_type}
          </Badge>
          {workflow.platform && (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", platformColor)}>
              {PLATFORM_LABELS[workflow.platform]}
            </Badge>
          )}
          {workflow.ai_generated_content && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"
            >
              <Sparkles className="size-2.5" />
              AI
            </Badge>
          )}
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2 mb-2">
          {workflow.title}
        </h4>

        {/* Status badge */}
        <div className="mb-2">
          {workflow.status === "published" ? (
            <Badge className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-800 border-green-200 gap-1">
              <svg className="size-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Đã đăng
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5"
            >
              {MEDIA_PIPELINE_STAGES.find((s) => s.id === workflow.status)?.label ?? workflow.status}
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          {workflow.due_date && (
            <div
              className={cn(
                "flex items-center gap-1",
                isOverdue && "text-red-600 font-medium"
              )}
            >
              <Calendar className="size-3" />
              <span>
                {new Date(workflow.due_date).toLocaleDateString("vi-VN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}

          {/* Assignee avatars */}
          {workflow.assignee_ids.length > 0 && (
            <div className="flex -space-x-1.5 ml-auto">
              {workflow.assignee_ids.slice(0, 3).map((_, i) => (
                <Avatar key={i} className="size-5 border-2 border-white">
                  <AvatarFallback className="text-[8px] bg-slate-200 text-slate-600">
                    {String.fromCharCode(65 + i)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>

        {/* Published URL link */}
        {workflow.published_url && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <a
              href={workflow.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-3" />
              Xem bài đăng
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
