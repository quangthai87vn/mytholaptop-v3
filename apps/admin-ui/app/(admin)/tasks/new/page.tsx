import { redirect } from "next/navigation";
import { getProjects, getCampaigns, getActiveStaff, getMasterDataItems } from "@/lib/workspace/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { TaskEditClient } from "@/components/tasks/task-edit-client";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function TaskNewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [user, projects, campaigns, staff, taskStatuses, taskTypes, channels] = await Promise.all([
    getCurrentUser(),
    getProjects(),
    getCampaigns(),
    getActiveStaff(),
    getMasterDataItems("task_status"),
    getMasterDataItems("task_type"),
    getMasterDataItems("channel"),
  ]);

  if (!user) redirect("/login?redirect=/tasks/new");

  const statusOptions = taskStatuses
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ code: s.code, name: s.name, color: s.color }));

  const taskTypeOptions = taskTypes
    .filter((t) => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({ code: t.code, name: t.name, color: t.color }));

  const platformOptions = channels
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ code: c.code, name: c.name, color: c.color }));

  const staffRoleMap: Record<string, string> = {};
  for (const s of staff) {
    staffRoleMap[s.id] = s.role;
  }

  // Default status: use URL param if valid, otherwise first active status
  const validStatuses = new Set(statusOptions.map((s) => s.code));
  const defaultStatus = params.status && validStatuses.has(params.status) ? params.status : (statusOptions[0]?.code ?? "idea");

  return (
    <TaskEditClient
      task={null}
      projects={projects}
      campaigns={campaigns}
      statusOptions={statusOptions}
      taskTypeOptions={taskTypeOptions}
      taskTypesWithMeta={taskTypes.map((t) => ({
        code: t.code,
        name: t.name,
        metadata: t.metadata,
      }))}
      platformOptions={platformOptions}
      staff={staff.map((s) => ({ id: s.id, full_name: s.full_name, email: s.email, role: s.role }))}
      staffRoleMap={staffRoleMap}
      currentUser={{ id: user.id, role: user.role }}
      createMode={true}
      defaultStatus={defaultStatus}
    />
  );
}
