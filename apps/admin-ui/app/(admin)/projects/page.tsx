import { getProjects } from "@/lib/workspace/db";
import { ProjectsClient } from "./projects-client";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ status?: string; priority?: string; search?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };

  const projects = await getProjects(filters);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dự án</h1>
            <p className="text-sm text-slate-500">
              Quản lý dự án và chiến dịch marketing
            </p>
          </div>
        </div>
      </div>

      <ProjectsClient projects={projects} />
    </div>
  );
}
