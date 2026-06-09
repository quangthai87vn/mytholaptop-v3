import { notFound } from "next/navigation";
import { getProjectById, getTasks, getCampaigns } from "@/lib/workspace/db";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { getCurrentUser } from "@/lib/auth/get-current-user";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [project, tasks, campaigns, user] = await Promise.all([
    getProjectById(id),
    getTasks({ project_id: id }),
    getCampaigns({ project_id: id }),
    getCurrentUser(),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      project={project}
      initialTasks={tasks}
      initialCampaigns={campaigns}
      isIntern={user?.role === "intern"}
    />
  );
}
