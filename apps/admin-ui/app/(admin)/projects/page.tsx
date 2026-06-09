import { getProjects, getMasterDataItems } from "@/lib/workspace/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ProjectsClient } from "./projects-client";
import { Target } from "lucide-react";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";

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

  const [projects, user, projectStatuses, priorities] = await Promise.all([
    getProjects(filters),
    getCurrentUser(),
    getMasterDataItems("project_status"),
    getMasterDataItems("priority"),
  ]);

  const masterData = {
    project_statuses: projectStatuses,
    priorities,
  };

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

      <ProjectsClient
        projects={projects}
        masterData={masterData}
        isSuperAdmin={user?.role === "super_admin"}
        isIntern={user?.role === "intern"}
        userId={user?.id}
      />
    </div>
  );
}
