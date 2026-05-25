"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/workspace/types";
import { PRIORITY_CONFIG } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const d = new Date(task.due_date);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const key = d.getDate().toString();
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(today);

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={goToday}>
          Hôm nay
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
        {DAYS.map((day) => (
          <div
            key={day}
            className="bg-slate-100 py-2 text-center text-xs font-semibold text-slate-600"
          >
            {day}
          </div>
        ))}

        {/* Calendar grid */}
        {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white min-h-[100px] p-1" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayTasks = tasksByDay[day.toString()] ?? [];
          const dateObj = new Date(year, month, day);
          const isToday = dateObj.toDateString() === today.toDateString();
          const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <div
              key={day}
              className={cn(
                "bg-white min-h-[100px] p-1.5 transition-colors",
                isToday && "ring-2 ring-inset ring-primary/30 bg-primary/[0.02]"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center",
                    isToday && "bg-primary text-white",
                    !isToday && isPast && "text-slate-400",
                    !isToday && !isPast && "text-slate-700"
                  )}
                >
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-slate-400">{dayTasks.length}</span>
                )}
              </div>

              {/* Task dots */}
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const priority = PRIORITY_CONFIG[task.priority];
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        "w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate transition-colors hover:opacity-80",
                        priority.bgColor,
                        priority.color
                      )}
                    >
                      {task.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
