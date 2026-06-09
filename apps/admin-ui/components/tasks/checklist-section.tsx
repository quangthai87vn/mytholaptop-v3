"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { TaskChecklistItem, TaskChecklistProgress } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";

interface ChecklistSectionProps {
  taskId: string;
  /** Checklist items loaded server-side (optional — component fetches its own data) */
  initialItems?: TaskChecklistItem[];
  initialProgress?: TaskChecklistProgress;
  /** P9: Can the current user manage checklist items? */
  canManage?: boolean;
}

export function ChecklistSection({
  taskId,
  initialItems = [],
  initialProgress,
  canManage = true,
}: ChecklistSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState<TaskChecklistItem[]>(initialItems);
  const [progress, setProgress] = useState<TaskChecklistProgress>(
    initialProgress ?? { completed: 0, total: 0, percentage: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    const res = await adminFetch(`/api/tasks/${taskId}/checklist`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.data ?? []);
      setProgress(data.progress ?? { completed: 0, total: 0, percentage: 0 });
    }
  }, [taskId]);

  const toggleItem = useCallback(
    async (item: TaskChecklistItem) => {
      setTogglingId(item.id);
      try {
        const res = await adminFetch(`/api/tasks/${taskId}/checklist/${item.id}`, {
          method: "PUT",
          body: JSON.stringify({ is_completed: !item.is_completed }),
        });
        if (res.ok) {
          const data = await res.json();
          setItems(data.data ?? []);
          setProgress(data.progress ?? progress);
          router.refresh();
        }
      } finally {
        setTogglingId(null);
      }
    },
    [taskId, progress, router]
  );

  const addItem = useCallback(async () => {
    if (!newItemTitle.trim()) return;
    setAddingItem(true);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        body: JSON.stringify({ title: newItemTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data ?? []);
        setProgress(data.progress ?? progress);
        setNewItemTitle("");
        router.refresh();
      }
    } finally {
      setAddingItem(false);
    }
  }, [newItemTitle, taskId, progress, router]);

  const confirmDeleteItem = useCallback((itemId: string) => {
    setPendingDeleteId(itemId);
  }, []);

  const executeDeleteItem = useCallback(async () => {
    const itemId = pendingDeleteId;
    if (!itemId) return;
    setDeletingId(itemId);
    try {
      const res = await adminFetch(`/api/tasks/${taskId}/checklist/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.data ?? []);
        setProgress(data.progress ?? progress);
        router.refresh();
      }
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, taskId, progress, router]);

  const deleteItem = useCallback(
    async (_itemId: string) => {
      // Placeholder — actual delete triggered by confirmDeleteItem + executeDeleteItem
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="size-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Checklist
          </span>
          {progress.total > 0 && (
            <span className="text-xs text-slate-400">
              {progress.completed}/{progress.total}
            </span>
          )}
        </div>
        {canManage && (
          <span className="text-xs text-slate-400">
            {progress.percentage}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <Progress
          value={progress.percentage}
          className="h-1.5"
        />
      )}

      {/* Empty state */}
      {items.length === 0 && !canManage && (
        <p className="text-sm text-slate-400 py-2">
          Chưa có checklist nào.
        </p>
      )}

      {/* Add new item */}
      {canManage && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Thêm mục checklist..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
            className="h-8 text-sm"
            disabled={addingItem}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addItem}
            disabled={addingItem || !newItemTitle.trim()}
            className="h-8 shrink-0"
          >
            {addingItem ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
          </Button>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 group py-1"
          >
            {/* Checkbox */}
            <button
              onClick={() => canManage && toggleItem(item)}
              disabled={togglingId === item.id || !canManage}
              className="mt-0.5 shrink-0 transition-colors"
              title={item.is_completed ? "Đánh dấu chưa xong" : "Đánh dấu xong"}
            >
              {togglingId === item.id ? (
                <Loader2 className="size-4 text-slate-400 animate-spin" />
              ) : item.is_completed ? (
                <CheckCircle2 className="size-4 text-green-600" />
              ) : (
                <Circle className="size-4 text-slate-300 hover:text-slate-500 transition-colors" />
              )}
            </button>

            {/* Title */}
            <span
              className={`flex-1 text-sm leading-6 ${
                item.is_completed
                  ? "text-slate-400 line-through"
                  : "text-slate-700"
              }`}
            >
              {item.title}
            </span>

            {/* Delete */}
            {canManage && (
              <button
                onClick={() => confirmDeleteItem(item.id)}
                disabled={deletingId === item.id}
                className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity"
                title="Xóa mục"
              >
                {deletingId === item.id ? (
                  <Loader2 className="size-3.5 text-slate-400 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5 text-slate-400 hover:text-red-500 transition-colors" />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* All done state */}
      {items.length > 0 && progress.completed === progress.total && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <CheckCircle2 className="size-3.5" />
          Tất cả mục đã hoàn thành
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        title="Xóa mục checklist?"
        description="Mục này sẽ bị xóa khỏi danh sách."
        confirmLabel="Xóa"
        variant="destructive"
        loading={deletingId !== null}
        onConfirm={executeDeleteItem}
      />
    </div>
  );
}
