import { notFound } from "next/navigation";
import { getTaskById, getMasterDataItems } from "@/lib/workspace/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [task, user, taskStatuses, taskTypes, channels] = await Promise.all([
    getTaskById(id),
    getCurrentUser(),
    getMasterDataItems("task_status"),
    getMasterDataItems("task_type"),
    getMasterDataItems("channel"),
  ]);

  if (!task) notFound();

  const statusOptions = taskStatuses
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ code: s.code, name: s.name, color: s.color }));

  return (
    <TaskDetailClient
      task={task}
      userId={user?.id}
      userRole={user?.role}
      statusOptions={statusOptions}
    />
  );
}
