import { getTasks } from "@/lib/workspace/db";
import { CalendarView } from "@/components/workspace/calendar-view";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WorkspaceCalendarPage() {
  const tasks = await getTasks();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch làm việc</h1>
          <p className="text-sm text-slate-500">
            Xem công việc theo lịch
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <CalendarView
          tasks={tasks.filter((t) => t.due_date)}
          onTaskClick={(task) => {
            // navigate handled by client
          }}
        />
      </div>
    </div>
  );
}
