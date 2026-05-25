import { Suspense } from "react";
import { getTasks, getProjects, getCampaigns } from "@/lib/workspace/db";
import { TasksClient } from "@/components/tasks/tasks-client";
import { CheckSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, projects, campaigns] = await Promise.all([
    getTasks(),
    getProjects(),
    getCampaigns(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Công việc</h1>
            <p className="text-sm text-slate-500">
              Quản lý công việc với Kanban board
            </p>
          </div>
        </div>
      </div>

      <TasksClient
        initialTasks={tasks}
        projects={projects}
        campaigns={campaigns}
      />
    </div>
  );
}
