"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "destructive" | "default" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === "destructive" && (
              <AlertTriangle className="size-5 text-red-500 shrink-0" />
            )}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
          {warning && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              {warning}
            </p>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "outline"}
            className={
              variant === "warning"
                ? "bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                : undefined
            }
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hook for reusable confirm pattern ──────────────────────────────────

interface UseConfirmOptions {
  title: string;
  description?: string;
  warning?: string;
  confirmLabel?: string;
  variant?: "destructive" | "default" | "warning";
}

interface ConfirmState extends UseConfirmOptions {
  open: boolean;
  onConfirm: () => void | Promise<void>;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (
      options: UseConfirmOptions,
      onConfirm?: () => void | Promise<void>
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({
          ...options,
          open: true,
          onConfirm: () => {
            onConfirm?.();
            resolve(true);
          },
        });
      });
    },
    []
  );

  const close = useCallback(() => {
    setState((prev) => {
      if (prev) resolveRef.current?.(false);
      return prev ? { ...prev, open: false } : null;
    });
  }, []);

  const ConfirmDialogRenderer = useCallback(() => {
    if (!state) return null;
    return (
      <ConfirmDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={state.title}
        description={state.description}
        warning={state.warning}
        confirmLabel={state.confirmLabel}
        variant={state.variant}
        onConfirm={state.onConfirm}
      />
    );
  }, [state, close]);

  return { confirm, ConfirmDialog: ConfirmDialogRenderer };
}
