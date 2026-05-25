"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/workspace/types";
import { KanbanCard } from "./kanban-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanColumnData {
  id: TaskStatus;
  title: string;
  color: string;
}

const COLUMN_CONFIG: KanbanColumnData[] = [
  { id: "backlog", title: "Backlog", color: "hsl(220 14% 70%)" },
  { id: "todo", title: "To Do", color: "hsl(220 14% 70%)" },
  { id: "in_progress", title: "In Progress", color: "hsl(199 89% 48%)" },
  { id: "review", title: "Review", color: "hsl(38 92% 50%)" },
  { id: "done", title: "Done", color: "hsl(142 70% 45%)" },
];

const COLUMN_STYLES: Record<TaskStatus, { bg: string; headerBg: string; border: string }> = {
  backlog: { bg: "bg-slate-50", headerBg: "bg-slate-100", border: "border-slate-200" },
  todo: { bg: "bg-slate-50", headerBg: "bg-slate-100", border: "border-slate-200" },
  in_progress: { bg: "bg-cyan-50/50", headerBg: "bg-cyan-100/50", border: "border-cyan-200" },
  review: { bg: "bg-orange-50/50", headerBg: "bg-orange-100/50", border: "border-orange-200" },
  done: { bg: "bg-green-50/50", headerBg: "bg-green-100/50", border: "border-green-200" },
  cancelled: { bg: "bg-slate-50", headerBg: "bg-slate-100", border: "border-slate-200" },
};

interface KanbanColumnProps {
  column: KanbanColumnData;
  tasks: Task[];
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent, status: TaskStatus) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onAddTask?: (status: TaskStatus) => void;
  isDragOver: boolean;
}

function KanbanColumn({
  column,
  tasks,
  onDragStart,
  onDragOver,
  onDrop,
  onAddTask,
  isDragOver,
}: KanbanColumnProps) {
  const styles = COLUMN_STYLES[column.id];

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0">
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b-2",
          styles.headerBg
        )}
        style={{ borderBottomColor: column.color }}
      >
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-semibold text-slate-700">{column.title}</span>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-white/80 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Column body — this is where drops happen */}
      <div
        className={cn(
          "flex-1 rounded-b-lg border border-t-0 p-2 flex flex-col gap-2 transition-all min-h-[200px]",
          styles.bg,
          styles.border,
          isDragOver && "bg-primary/5 ring-2 ring-primary/20"
        )}
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
        <ScrollArea className="flex-1 max-h-[calc(100vh-280px)]">
          <div className="space-y-2 pr-1">
            {tasks.map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                onDragStart={onDragStart}
              />
            ))}

            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                <p className="text-xs">Chưa có công việc</p>
                {column.id === "todo" && onAddTask && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs h-7 gap-1 text-slate-500"
                    onClick={() => onAddTask(column.id)}
                  >
                    <Plus className="size-3" />
                    Thêm công việc
                  </Button>
                )}
              </div>
            )}

            {isDragOver && tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
                <p className="text-xs text-primary font-medium">Thả vào đây</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {(column.id === "todo" || column.id === "backlog") && onAddTask && tasks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 h-8 text-xs text-slate-500 hover:text-primary gap-1"
            onClick={() => onAddTask(column.id)}
          >
            <Plus className="size-3" />
            Thêm công việc
          </Button>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function KanbanBoard({ tasks, onTaskMove, onAddTask }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStatus(status);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTask && draggedTask.status !== status) {
      onTaskMove(draggedTask.id, status);
    }
    setDraggedTask(null);
    setDragOverStatus(null);
  };

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4 px-1 min-h-[400px]"
    >
      {COLUMN_CONFIG.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        return (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={columnTasks}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onAddTask={onAddTask}
            isDragOver={dragOverStatus === column.id}
          />
        );
      })}
    </div>
  );
}
