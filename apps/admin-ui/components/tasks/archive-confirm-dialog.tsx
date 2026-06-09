"use client";

import { useState } from "react";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/workspace/types";

interface ArchiveConfirmDialogProps {
  open: boolean;
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (task: Task) => Promise<void>;
  /** If true, shows "Khôi phục" instead of "Lưu trữ" */
  isRestore?: boolean;
}

export function ArchiveConfirmDialog({
  open,
  task,
  onOpenChange,
  onConfirm,
  isRestore = false,
}: ArchiveConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!task) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(task);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isRestore ? (
              <RotateCcw className="size-5 text-blue-500 shrink-0" />
            ) : (
              <Archive className="size-5 text-orange-500 shrink-0" />
            )}
            {isRestore ? "Khôi phục công việc" : "Lưu trữ công việc"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRestore
              ? "Công việc sẽ được khôi phục và hiển thị lại trong danh sách."
              : "Công việc sẽ bị ẩn khỏi danh sách. Bạn có thể khôi phục sau nếu cần."}
          </AlertDialogDescription>
          <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-2">
            <strong>&ldquo;{task.title}&rdquo;</strong>
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={
              isRestore
                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                : "bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
            }
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isRestore ? "Đang khôi phục..." : "Đang lưu trữ..."}
              </>
            ) : isRestore ? (
              "Khôi phục"
            ) : (
              "Lưu trữ"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
