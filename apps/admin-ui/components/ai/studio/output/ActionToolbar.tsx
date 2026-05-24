"use client";

import { Button } from "@/components/ui/button";
import {
  Copy,
  RefreshCw,
  Edit3,
  Calendar,
  Share2,
  Download,
  Check,
} from "lucide-react";
import { useState } from "react";

interface ActionToolbarProps {
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onSchedule?: () => void;
  onPost?: () => void;
  onExport?: () => void;
  isCopied?: boolean;
  isRegenerating?: boolean;
}

export function ActionToolbar({
  onCopy,
  onRegenerate,
  onEdit,
  onSchedule,
  onPost,
  onExport,
  isCopied = false,
  isRegenerating = false,
}: ActionToolbarProps) {
  return (
    <div className="
      sticky bottom-0
      bg-background/80 backdrop-blur-lg
      border-t border-border/60
      px-4 py-3
      rounded-t-2xl
      shadow-[0_-4px_20px_rgba(0,0,0,0.06)]
      animate-in slide-in-from-bottom-4 duration-300
    ">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Copy */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium"
          onClick={onCopy}
        >
          {isCopied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-600">Đã copy</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>

        {/* Regenerate */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw className={`size-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
          <span>Tạo lại</span>
        </Button>

        {/* Edit */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium"
          onClick={onEdit}
        >
          <Edit3 className="size-3.5" />
          <span>Chỉnh sửa</span>
        </Button>

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1" />

        {/* Schedule */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5 font-medium"
          onClick={onSchedule}
        >
          <Calendar className="size-3.5" />
          <span className="hidden sm:inline">Lên lịch</span>
        </Button>

        {/* Export */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 font-medium"
            onClick={onExport}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Post to Facebook */}
        <Button
          size="sm"
          className="h-9 text-xs gap-1.5 font-semibold shadow-sm"
          onClick={onPost}
        >
          <Share2 className="size-3.5" />
          <span>Đăng Facebook</span>
        </Button>
      </div>
    </div>
  );
}
