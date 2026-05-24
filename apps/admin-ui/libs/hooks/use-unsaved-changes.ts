/**
 * useUnsavedChanges - Hook cảnh báo khi rời trang có thay đổi chưa lưu
 *
 * Dùng useEffect + window.onbeforeunload để cảnh báo browser navigation
 * và useRouter events để cảnh báo Next.js navigation
 */

"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAIStore } from "@/store/ai-settings-store";
import { toast } from "sonner";

export function useUnsavedChanges(options?: {
  message?: string;
  onLeave?: () => void | Promise<void>;
}) {
  const isDirty = useAIStore((s) => s.isDirty);
  const router = useRouter();

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      const msg = options?.message ?? "Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi trang?";
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    },
    [isDirty, options?.message]
  );

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);

  const handleLeaveWithWarning = useCallback(async () => {
    if (!isDirty) return true;
    const confirmed = window.confirm(
      options?.message ??
        "Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi trang?"
    );
    if (confirmed) {
      await options?.onLeave?.();
      return true;
    }
    return false;
  }, [isDirty, options]);

  return { isDirty, handleLeaveWithWarning };
}
