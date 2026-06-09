"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Plus, Kanban } from "lucide-react";
import type { KanbanColumnConfig } from "@/lib/workspace/master-data-helpers";
import { TaskKanbanCard } from "@/components/workspace/tasks/task-kanban-card";

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  tasks: Task[];
  role?: string;
  userId?: string;
  actionsEnabled?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onAddTask?: (status: string) => void;
  onEditTask?: (task: Task, closeSheet?: () => void) => void;
  onArchiveTask?: (task: Task, closeSheet?: () => void) => void;
  onDeleteTask?: (task: Task, closeSheet?: () => void) => void;
  onRestoreTask?: (task: Task, closeSheet?: () => void) => void;
  onCopyTask?: (task: Task, closeSheet?: () => void) => void;
  canArchive?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  disableDrag?: boolean;
  isDragOver: boolean;
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  campaignMap?: Record<string, string>;
  platformMap?: Record<string, { name: string; color: string }>;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
}

function KanbanColumn(props: KanbanColumnProps) {
  const {
    column,
    tasks,
    actionsEnabled = true,
    onDragStart,
    onDragOver,
    onDrop,
    onAddTask,
    onEditTask,
    onArchiveTask,
    onDeleteTask,
    onRestoreTask,
    onCopyTask,
    canArchive,
    canDelete,
    canRestore,
    disableDrag = false,
    isDragOver,
    staffMap,
    staffRoleMap,
    projectMap,
    campaignMap,
    platformMap,
    taskTypeColorMap,
  } = props;

  return (
    <div className="flex flex-col min-w-[300px] w-[300px] flex-shrink-0 overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b-2"
        )}
        style={{ borderBottomColor: column.color, backgroundColor: column.headerBg }}
      >
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-semibold text-slate-700">{column.title}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-white/80 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div
        className={cn(
          "flex-1 rounded-b-lg border border-t-0 p-2 flex flex-col gap-2 transition-all min-h-[120px]",
          isDragOver && "bg-primary/5 ring-2 ring-primary/20"
        )}
        style={{ backgroundColor: column.bg, borderColor: column.border }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDragOver(e, column.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, column.id);
        }}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 pr-1 pb-2">
            {tasks.map((task) => {
              return (
                <TaskKanbanCard
                  key={task.id}
                  task={task}
                  onEdit={disableDrag ? undefined : onEditTask}
                  onCopy={disableDrag ? undefined : onCopyTask}
                  onArchive={disableDrag ? undefined : onArchiveTask}
                  onDelete={disableDrag ? undefined : onDeleteTask}
                  onRestore={disableDrag ? undefined : onRestoreTask}
                  canArchive={canArchive}
                  canDelete={canDelete}
                  canRestore={canRestore}
                  onDragStart={disableDrag ? undefined : onDragStart}
                  disableDrag={disableDrag}
                  staffMap={staffMap}
                  staffRoleMap={staffRoleMap}
                  projectMap={projectMap}
                  campaignMap={campaignMap}
                  platformMap={platformMap}
                  taskTypeColorMap={taskTypeColorMap}
                />
              );
            })}

            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                <p className="text-xs">Chua co cong viec</p>
                {!disableDrag && onAddTask && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs h-7 gap-1 text-slate-500"
                    onClick={() => onAddTask(column.id)}
                  >
                    <Plus className="size-3" />
                    Them
                  </Button>
                )}
              </div>
            )}

            {isDragOver && tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                <p className="text-xs text-primary font-medium">Tha vao day</p>
              </div>
            )}
          </div>
        </div>

        {tasks.length > 0 && !disableDrag && onAddTask && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-7 text-xs text-slate-500 hover:text-primary gap-1 shrink-0"
            onClick={() => onAddTask(column.id)}
          >
            <Plus className="size-3" />
            Them cong viec
          </Button>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  columns: KanbanColumnConfig[];
  onTaskMove: (taskId: string, newStatus: string) => void;
  onAddTask?: (status: string) => void;
  onEditTask?: (task: Task, closeSheet?: () => void) => void;
  onArchiveTask?: (task: Task, closeSheet?: () => void) => void;
  onDeleteTask?: (task: Task, closeSheet?: () => void) => void;
  onRestoreTask?: (task: Task, closeSheet?: () => void) => void;
  onCopyTask?: (task: Task, closeSheet?: () => void) => void;
  role?: string;
  userId?: string;
  actionsEnabled?: boolean;
  canArchive?: boolean;
  canDelete?: boolean;
  canRestore?: boolean;
  disableDrag?: boolean;
  staffMap?: Record<string, string>;
  staffRoleMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  campaignMap?: Record<string, string>;
  platformMap?: Record<string, { name: string; color: string }>;
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
}

export function KanbanBoard(props: KanbanBoardProps) {
  const {
    tasks,
    columns,
    onTaskMove,
    onAddTask,
    onEditTask,
    onArchiveTask,
    onDeleteTask,
    onRestoreTask,
    onCopyTask,
    role,
    userId,
    actionsEnabled = true,
    canArchive = true,
    canDelete,
    canRestore = false,
    disableDrag = false,
    staffMap,
    staffRoleMap,
    projectMap,
    campaignMap,
    platformMap,
    taskTypeColorMap,
  } = props;

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    if (draggedTaskId) {
      onTaskMove(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-0 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasks
              .filter((t) => t.status === column.id)
              .sort((a, b) => {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
              })}
            role={role}
            userId={userId}
            actionsEnabled={actionsEnabled}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onArchiveTask={onArchiveTask}
            onDeleteTask={onDeleteTask}
            onRestoreTask={onRestoreTask}
            onCopyTask={onCopyTask}
            canArchive={canArchive}
            canDelete={canDelete}
            canRestore={canRestore}
            disableDrag={disableDrag}
            isDragOver={dragOverStatus === column.id}
            staffMap={staffMap}
            staffRoleMap={staffRoleMap}
            projectMap={projectMap}
            campaignMap={campaignMap}
            platformMap={platformMap}
            taskTypeColorMap={taskTypeColorMap}
          />
        ))}
      </div>
    </div>
  );
}
