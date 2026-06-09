"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit2,
  Archive,
  Trash2,
  RotateCcw,
  Copy,
} from "lucide-react";

interface TaskCardActionsProps {
  task: Task;
  role?: string;
  userId?: string;
  onEdit?: (task: Task, closeMenu: () => void) => void;
  onCopy?: (task: Task, closeMenu: () => void) => void;
  onArchive?: (task: Task, closeMenu: () => void) => void;
  onRestore?: (task: Task, closeMenu: () => void) => void;
  onDelete?: (task: Task, closeMenu: () => void) => void;
}

/**
 * Action bar rendered at the BOTTOM of a task card.
 *
 * UX:
 * - ALWAYS visible (no opacity hide)
 * - Footer with border-top, prominent button "Thao tác"
 * - Button: outlined style, height 28-32px, MoreHorizontal icon
 * - Hover: background highlight
 * - Click "Thao tác" → opens DropdownMenu
 * - Click action item → calls callback, closes menu, does NOT open drawer
 *
 * Permission rules:
 * - Super Admin / Admin: all actions (Sửa, Sao chép, Lưu trữ, Khôi phục, Xóa)
 * - Intern / Staff: only Sửa (if not archived) and Sao chép
 */
export function TaskCardActions({
  task,
  role,
  userId,
  onEdit,
  onCopy,
  onArchive,
  onRestore,
  onDelete,
}: TaskCardActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const isIntern = role === "intern";
  const isStaff = role === "editor" || role === "viewer";
  const isArchived = task.is_archived ?? false;
  const isCancelled = task.status === "cancelled";
  const isCompleted = task.status === "completed";

  const canEditAdmin = !isArchived && !isCancelled;
  const canCopyAdmin = !isArchived && !!onCopy;
  const canArchive = !isArchived && !isCancelled && !isIntern && !isStaff && !!onArchive;
  const canRestore = isArchived && !isIntern && !isStaff && !!onRestore;
  const canDelete = !isIntern && !isStaff && !!onDelete;
  const canEditIntern = !isArchived && !isCompleted && !isCancelled && !!onEdit;
  const canCopyIntern = !isArchived && !!onCopy;

  const canEdit = isSuperAdmin || isAdmin ? canEditAdmin : canEditIntern;
  const canCopy = isSuperAdmin || isAdmin ? canCopyAdmin : canCopyIntern;

  const hasVisibleItems = canEdit || canCopy || canRestore || canArchive || canDelete;
  const showMenuButton = isSuperAdmin || isAdmin || hasVisibleItems;

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const handleEdit = useCallback(() => {
    if (onEdit) onEdit(task, handleClose);
    else handleClose();
  }, [onEdit, task, handleClose]);

  const handleCopy = useCallback(() => {
    if (onCopy) onCopy(task, handleClose);
    else handleClose();
  }, [onCopy, task, handleClose]);

  const handleArchive = useCallback(() => {
    if (onArchive) onArchive(task, handleClose);
    else handleClose();
  }, [onArchive, task, handleClose]);

  const handleRestore = useCallback(() => {
    if (onRestore) onRestore(task, handleClose);
    else handleClose();
  }, [onRestore, task, handleClose]);

  const handleDelete = useCallback(() => {
    if (onDelete) onDelete(task, handleClose);
    else handleClose();
  }, [onDelete, task, handleClose]);

  if (!showMenuButton) return null;

  return (
    <div className="flex items-center justify-center py-1.5 px-2.5">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "group flex items-center gap-1.5 h-7 px-2.5",
              "text-[12px] font-medium text-slate-600",
              "bg-white border border-slate-200 rounded-md",
              "hover:border-primary/40 hover:text-primary hover:bg-primary/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              "transition-all duration-150 cursor-pointer"
            )}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            data-menu-button
          >
            <MoreHorizontal className="size-3.5 shrink-0 text-slate-400 group-hover:text-primary transition-colors" />
            <span>Thao tác</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44"
          sideOffset={4}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {canEdit && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdit();
              }}
              className="cursor-pointer text-sm"
            >
              <Edit2 className="size-4 mr-2 text-slate-500" />
              Sửa
            </DropdownMenuItem>
          )}
          {canCopy && (
            <>
              {canEdit && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopy();
                }}
                className="cursor-pointer text-sm"
              >
                <Copy className="size-4 mr-2 text-slate-500" />
                Sao chép
              </DropdownMenuItem>
            </>
          )}
          {canRestore && (
            <>
              {(canEdit || canCopy) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRestore();
                }}
                className="cursor-pointer text-sm text-blue-600 focus:text-blue-600"
              >
                <RotateCcw className="size-4 mr-2" />
                Khôi phục
              </DropdownMenuItem>
            </>
          )}
          {canArchive && (
            <>
              {(canEdit || canCopy || canRestore) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleArchive();
                }}
                className="cursor-pointer text-sm text-orange-600 focus:text-orange-600"
              >
                <Archive className="size-4 mr-2" />
                Lưu trữ
              </DropdownMenuItem>
            </>
          )}
          {canDelete && (
            <>
              {(canEdit || canCopy || canRestore || canArchive) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete();
                }}
                className="cursor-pointer text-sm text-red-600 focus:text-red-600"
              >
                <Trash2 className="size-4 mr-2" />
                Xóa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
