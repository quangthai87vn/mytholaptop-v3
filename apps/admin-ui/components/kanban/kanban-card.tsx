"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/workspace/types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Paperclip } from "lucide-react";

interface KanbanCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

export function KanbanCard({ task, onDragStart }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < today &&
    task.status !== "done";

  const isDueSoon =
    task.due_date &&
    !isOverdue &&
    new Date(task.due_date) <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, task);
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => (window.location.href = `/tasks/${task.id}`)}
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-3 cursor-grab hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 select-none",
        isDragging && "opacity-50 cursor-grabbing shadow-lg rotate-2"
      )}
    >
      {/* Priority indicator */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2 flex-1">
          {task.title}
        </h4>
      </div>

      {/* Priority & Status badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 font-medium",
            priority.bgColor,
            priority.color
          )}
        >
          {priority.icon} {priority.label}
        </Badge>
        {task.stage && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200"
          >
            {task.stage}
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Tiến độ</span>
            <span>{task.progress}%</span>
          </div>
          <Progress value={task.progress} className="h-1" />
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        {/* Due date */}
        {task.due_date && (
          <div
            className={cn(
              "flex items-center gap-1",
              isOverdue && "text-red-600 font-medium",
              isDueSoon && "text-orange-500"
            )}
          >
            <Calendar className="size-3" />
            <span>{new Date(task.due_date).toLocaleDateString("vi-VN", { day: "numeric", month: "short" })}</span>
          </div>
        )}

        {/* Right side: comments + attachments + assignees */}
        <div className="flex items-center gap-2 ml-auto">
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1 text-slate-400">
              <Paperclip className="size-3" />
              <span>{task.attachments.length}</span>
            </div>
          )}
          <div className="flex -space-x-1.5">
            {task.assignee_ids.slice(0, 3).map((_, i) => (
              <Avatar key={i} className="size-5 border-2 border-white">
                <AvatarFallback className="text-[8px] bg-slate-200 text-slate-600">
                  {String.fromCharCode(65 + i)}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignee_ids.length > 3 && (
              <Avatar className="size-5 border-2 border-white">
                <AvatarFallback className="text-[8px] bg-slate-200">
                  +{task.assignee_ids.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
            >
              #{tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-slate-400 text-[10px]">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
