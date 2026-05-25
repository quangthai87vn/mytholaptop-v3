import { Suspense } from "react";
import { getMediaWorkflows, getProjects, getCampaigns } from "@/lib/workspace/db";
import { WorkflowPipeline } from "@/components/media-workflow/workflow-pipeline";
import { WorkflowCard } from "@/components/media-workflow/workflow-card";
import { Clapperboard } from "lucide-react";
import { MediaWorkflowClient } from "./media-workflow-client";

export const dynamic = "force-dynamic";

export default async function MediaWorkflowPage() {
  const [workflows, projects, campaigns] = await Promise.all([
    getMediaWorkflows(),
    getProjects(),
    getCampaigns(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clapperboard className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Media Workflow</h1>
            <p className="text-sm text-slate-500">
              Quản lý pipeline sản xuất nội dung
            </p>
          </div>
        </div>
      </div>

      <MediaWorkflowClient
        workflows={workflows}
        projects={projects}
        campaigns={campaigns}
      />
    </div>
  );
}
