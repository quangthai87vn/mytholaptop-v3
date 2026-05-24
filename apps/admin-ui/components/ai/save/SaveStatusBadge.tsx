/**
 * SaveStatusBadge - Hiển thị trạng thái lưu
 * "Đã lưu" | "Chưa lưu" | "Đang đồng bộ"
 */

"use client";

import { useAIStore, type SaveStatus } from "@/store/ai-settings-store";
import { CheckCircle2, AlertCircle, Loader2, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_CONFIG: Record<SaveStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  idle: {
    label: "Đã lưu",
    icon: CheckCircle2,
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  saved: {
    label: "Đã lưu",
    icon: CheckCircle2,
    className: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  saving: {
    label: "Đang đồng bộ...",
    icon: Loader2,
    className: "text-blue-600 bg-blue-50 border-blue-200 animate-spin",
  },
  error: {
    label: "Lỗi lưu",
    icon: AlertCircle,
    className: "text-red-600 bg-red-50 border-red-200",
  },
};

export function SaveStatusBadge({ className }: { className?: string }) {
  const saveStatus = useAIStore((s) => s.saveStatus);
  const isDirty = useAIStore((s) => s.isDirty);
  const isHydrated = useAIStore((s) => s.isHydrated);

  if (!isHydrated) {
    return null;
  }

  const config = isDirty ? BADGE_CONFIG.error : BADGE_CONFIG[saveStatus];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", saveStatus === "saving" && "animate-spin")} />
      {config.label}
    </span>
  );
}
