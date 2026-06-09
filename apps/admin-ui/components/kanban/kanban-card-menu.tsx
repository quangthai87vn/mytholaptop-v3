"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import {
  Edit2,
  Archive,
  Trash2,
  RotateCcw,
  Copy,
} from "lucide-react";

interface KanbanCardMenuProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onCopy?: (task: Task) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  disableDrag?: boolean;
}

export function KanbanCardMenu({
  task,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  canArchive = true,
  canDelete = false,
  canRestore = false,
  disableDrag = false,
}: KanbanCardMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isArchived = task.is_archived ?? false;
  const isCancelled = task.status === "cancelled";

  const canEdit = !isArchived && !disableDrag && !!onEdit;
  const canCopy = !isArchived && !disableDrag && !!onCopy;
  const canArchiveItem = !isArchived && !isCancelled && !!onArchive && canArchive;
  const canRestoreItem = !!onRestore && canRestore;
  const canDeleteItem = !!onDelete && canDelete !== false;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!canEdit && !canCopy && !canArchiveItem && !canRestoreItem && !canDeleteItem) return null;

  const MenuItem = ({
    onClick,
    children,
    className,
  }: {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(false); onClick(); }}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer",
        "hover:bg-slate-100 transition-colors text-left",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        className={cn(
          "flex items-center justify-center size-6 rounded-md",
          "bg-white/90 backdrop-blur-sm border border-slate-200",
          "text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm",
          "transition-colors cursor-pointer"
        )}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="3" cy="7" r="1.5" />
          <circle cx="7" cy="7" r="1.5" />
          <circle cx="11" cy="7" r="1.5" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-[100]",
            "min-w-[140px] bg-white rounded-lg border border-slate-200 shadow-lg",
            "py-1 text-sm"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {canEdit && (
            <MenuItem onClick={() => onEdit?.(task)}>
              <Edit2 className="size-4 text-slate-500" />
              <span>Sửa</span>
            </MenuItem>
          )}
          {canCopy && (
            <MenuItem onClick={() => onCopy?.(task)}>
              <Copy className="size-4 text-slate-500" />
              <span>Sao chép</span>
            </MenuItem>
          )}
          {canRestoreItem && (
            <MenuItem onClick={() => onRestore?.(task)} className="text-blue-600 hover:bg-blue-50">
              <RotateCcw className="size-4" />
              <span>Khôi phục</span>
            </MenuItem>
          )}
          {canArchiveItem && (
            <MenuItem onClick={() => onArchive?.(task)} className="text-orange-600 hover:bg-orange-50">
              <Archive className="size-4" />
              <span>Lưu trữ</span>
            </MenuItem>
          )}
          {canDeleteItem && (
            <MenuItem onClick={() => onDelete?.(task)} className="text-red-600 hover:bg-red-50">
              <Trash2 className="size-4" />
              <span>Xóa</span>
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}
