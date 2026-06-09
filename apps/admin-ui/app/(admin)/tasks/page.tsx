import { Suspense } from "react";
import { getTasks, getProjects, getCampaigns, getActiveStaff, getMasterDataItems } from "@/lib/workspace/db";
import { getAppSetting } from "@/lib/content/db/app-settings";
import { TasksClient } from "@/components/tasks/tasks-client";
import { CheckSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await getCurrentUser();

  // Server-side filtering: interns only see their assigned tasks
  const isIntern = user?.role === "intern";
  const isStaff = user?.role === "editor" || user?.role === "viewer";

  const [tasks, projects, campaigns, staff, companySettings] = await Promise.all([
    getTasks(isIntern || isStaff ? { assignee_id: user?.id } : undefined),
    getProjects(),
    getCampaigns(),
    getActiveStaff(),
    getAppSetting("company"),
  ]);

  const [taskTypes, taskStatuses, channels] = await Promise.all([
    getMasterDataItems("task_type"),
    getMasterDataItems("task_status"),
    getMasterDataItems("channel"),
  ]);

  const masterData = {
    task_types: taskTypes,
    task_statuses: taskStatuses,
    channels,
  };

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
        staff={staff}
        company={companySettings ? {
          name: typeof companySettings.name === "string" ? companySettings.name : "",
          website: typeof companySettings.website === "string" ? companySettings.website : "",
          phone: typeof companySettings.phone === "string" ? companySettings.phone : "",
          logoUrl: typeof companySettings.logoUrl === "string" ? companySettings.logoUrl : "",
          address: typeof companySettings.address === "string" ? companySettings.address : "",
        } : undefined}
        isSuperAdmin={user?.role === "super_admin"}
        isIntern={user?.role === "intern"}
        currentUser={user ? { id: user.id, role: user.role } : null}
        masterData={masterData}
      />
    </div>
  );
}
