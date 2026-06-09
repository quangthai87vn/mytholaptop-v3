"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { KanbanCardBase } from "@/components/kanban/kanban-card-base";

interface TaskKanbanCardProps {
  task: Task;
  /** Called when drag starts */
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  /** Disable drag-and-drop */
  disableDrag?: boolean;
  /** Menu action callbacks */
  onEdit?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onRestore?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onCopy?: (task: Task) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  /** Additional maps for display */
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  campaignMap?: Record<string, string>;
  platformMap?: Record<string, { name: string; color: string }>;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
}

/**
 * Task Kanban card — display with "..." menu for actions.
 *
 * UX:
 * - Click "..." menu → Edit / Copy / Archive / Delete
 * - Drag card → drag-and-drop to move between columns
 * - No click-to-open on card body
 *
 * Set disableDrag={true} for display-only cards (e.g. Workflow Board).
 */
export function TaskKanbanCard({
  task,
  onDragStart,
  disableDrag = false,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  canArchive = true,
  canDelete,
  canRestore = false,
  staffMap = {},
  staffRoleMap = {},
  projectMap = {},
  campaignMap = {},
  platformMap = {},
  taskTypeColorMap = {},
}: TaskKanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (disableDrag) return;
      setIsDragging(true);
      if (onDragStart) onDragStart(e, task);
    },
    [disableDrag, onDragStart, task]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      draggable={!disableDrag}
      onDragStart={disableDrag ? undefined : handleDragStart}
      onDragEnd={disableDrag ? undefined : handleDragEnd}
      className={cn(
        isDragging ? "opacity-50 cursor-grabbing" : "cursor-default"
      )}
    >
      <KanbanCardBase
        task={task}
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
        onDelete={onDelete}
        onCopy={onCopy}
        canArchive={canArchive}
        canDelete={canDelete}
        canRestore={canRestore}
        disableDrag={disableDrag}
        staffMap={staffMap}
        staffRoleMap={staffRoleMap}
        projectMap={projectMap}
        campaignMap={campaignMap}
        platformMap={platformMap}
        taskTypeColorMap={taskTypeColorMap}
      />
    </div>
  );
}
