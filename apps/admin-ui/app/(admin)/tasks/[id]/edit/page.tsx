import { notFound } from "next/navigation";
import { getTaskById, getProjects, getCampaigns, getActiveStaff, getMasterDataItems } from "@/lib/workspace/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { TaskEditClient } from "@/components/tasks/task-edit-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskEditPage({ params }: PageProps) {
  const { id } = await params;
  const [task, user, projects, campaigns, staff, taskStatuses, taskTypes, channels] = await Promise.all([
    getTaskById(id),
    getCurrentUser(),
    getProjects(),
    getCampaigns(),
    getActiveStaff(),
    getMasterDataItems("task_status"),
    getMasterDataItems("task_type"),
    getMasterDataItems("channel"),
  ]);

  if (!task) notFound();

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

  // Build staff role map for display
  const staffRoleMap: Record<string, string> = {};
  for (const s of staff) {
    staffRoleMap[s.id] = s.role;
  }

  return (
    <TaskEditClient
      task={task}
      createMode={false}
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
      currentUser={user ? { id: user.id, role: user.role } : null}
    />
  );
}
