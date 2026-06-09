"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
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
import type { Task } from "@/lib/workspace/types";

interface CopyTaskDialogProps {
  open: boolean;
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (task: Task) => Promise<void>;
}

export function CopyTaskDialog({
  open,
  task,
  onOpenChange,
  onConfirm,
}: CopyTaskDialogProps) {
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
            <Copy className="size-5 text-primary shrink-0" />
            Sao chép công việc?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Hệ thống sẽ tạo một bản sao của công việc này và đặt ngay bên dưới công việc gốc.
            </p>
            <p className="font-medium text-foreground">
              &ldquo;{task.title}&rdquo;
            </p>
            <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Các trường được giữ nguyên: dự án, chiến dịch, loại công việc, người phụ trách, ngày bắt đầu, ngày hết hạn, nội dung yêu cầu.
              <br />
              Đặt lại: tiến độ, ngày tạo, liên kết đã xuất bản, ghi chú hoàn thành.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang sao chép...
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Sao chép
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
