"use client";

import { useState } from "react";
import type { MediaWorkflow, Project, Campaign, MediaStage } from "@/lib/workspace/types";
import { MEDIA_PIPELINE_STAGES, CONTENT_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/workspace/types";
import { WorkflowPipeline } from "@/components/media-workflow/workflow-pipeline";
import { WorkflowCard } from "@/components/media-workflow/workflow-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, LayoutGrid, Kanban, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MediaWorkflowClientProps {
  workflows: MediaWorkflow[];
  projects: Project[];
  campaigns: Campaign[];
}

export function MediaWorkflowClient({
  workflows: initialWorkflows,
  projects,
  campaigns,
}: MediaWorkflowClientProps) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [view, setView] = useState<"pipeline" | "grid">("pipeline");
  const [showForm, setShowForm] = useState(false);

  const filtered = workflows.filter((w) => {
    if (search && !w.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (platformFilter !== "all" && w.platform !== platformFilter) return false;
    if (contentTypeFilter !== "all" && w.content_type !== contentTypeFilter) return false;
    return true;
  });

  const stageCounts = MEDIA_PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.id] = workflows.filter((w) => w.status === stage.id).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleStatusChange = async (workflowId: string, newStatus: MediaStage) => {
    const res = await fetch(`/api/media-workflow/${workflowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      toast.error("Cập nhật thất bại");
      return;
    }
    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflowId ? { ...w, status: newStatus } : w))
    );
    toast.success("Đã cập nhật trạng thái");
  };

  return (
    <div className="space-y-5">
      {/* Stage counts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {MEDIA_PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm shrink-0"
          >
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-slate-600">{stage.label}</span>
            <span
              className="font-semibold"
              style={{ color: stage.color }}
            >
              {stageCounts[stage.id] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Tìm kiếm nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Nền tảng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nền tảng</SelectItem>
            {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Loại nội dung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => setView("pipeline")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "pipeline" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Kanban className="size-4" />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "pipeline" ? (
        <WorkflowPipeline
          workflows={filtered}
          onWorkflowClick={(w) => router.push(`/media-workflow/${w.id}`)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onClick={() => router.push(`/media-workflow/${workflow.id}`)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
              <Clapperboard className="size-12 text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-600">Không tìm thấy nội dung</h3>
              <p className="text-slate-400 mt-1">Thử thay đổi bộ lọc</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
