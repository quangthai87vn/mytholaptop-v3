/**
 * UnsavedChangesGuard - Cảnh báo khi rời tab có thay đổi chưa lưu
 * Sử dụng browser beforeunload event + window.confirm cho navigation
 */

"use client";

import { useEffect } from "react";
import { useAIStore } from "@/store/ai-settings-store";

const WARNING_MESSAGE = "Bạn có thay đổi chưa lưu trong AI Operating Center. Nếu rời khỏi bây giờ, toàn bộ thay đổi sẽ bị mất.";

export function UnsavedChangesGuard() {
  const isDirty = useAIStore((s) => s.isDirty);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = WARNING_MESSAGE;
      return WARNING_MESSAGE;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return null;
}
