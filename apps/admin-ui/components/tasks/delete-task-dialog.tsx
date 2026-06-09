"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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

interface DeleteTaskDialogProps {
  open: boolean;
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (task: Task) => Promise<void>;
}

export function DeleteTaskDialog({
  open,
  task,
  onOpenChange,
  onConfirm,
}: DeleteTaskDialogProps) {
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
            <AlertTriangle className="size-5 text-red-500 shrink-0" />
            Xóa công việc
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Bạn có chắc muốn xóa vĩnh viễn công việc này?
              Hành động này <strong>không thể hoàn tác</strong>.
            </p>
            <p className="font-medium text-foreground">
              &ldquo;{task.title}&rdquo;
            </p>
            <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              Toàn bộ dữ liệu liên quan (bình luận, checklist, file đính kèm, activity log) cũng sẽ bị xóa vĩnh viễn.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 focus:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa vĩnh viễn"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
