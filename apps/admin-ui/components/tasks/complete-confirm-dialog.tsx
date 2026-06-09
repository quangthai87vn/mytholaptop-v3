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

interface CompleteConfirmDialogProps {
  open: boolean;
  task: Task | null;
  onOpenChange: (open: boolean) => void;
  /** Called when user confirms completing without result */
  onConfirm: (task: Task) => void;
  /** Called when user wants to cancel and go back to edit */
  onEdit: (task: Task) => void;
}

export function CompleteConfirmDialog({
  open,
  task,
  onOpenChange,
  onConfirm,
  onEdit,
}: CompleteConfirmDialogProps) {
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

  const handleEdit = () => {
    onOpenChange(false);
    onEdit(task);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="size-5 shrink-0 text-orange-500" />
            Công việc chưa có kết quả nộp
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Công việc <strong>&ldquo;{task.title}&rdquo;</strong> không có link xuất bản, file asset, hoặc ghi chú kết quả.
            </p>
            <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              Bạn có muốn chuyển sang Hoàn thành không?
            </p>
            <p className="text-xs text-slate-500">
              Nhân viên nên bổ sung kết quả trước khi hoàn thành. Quản trị viên có thể bỏ qua cảnh báo này.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} onClick={handleEdit}>
            <span className="flex items-center gap-1.5">
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sửa kết quả trước
            </span>
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <AlertTriangle className="size-4" />
                Vẫn hoàn thành
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
