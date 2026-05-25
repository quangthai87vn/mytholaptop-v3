"use client";

import { cn } from "@/lib/utils";
import type { MediaWorkflow, MediaStage } from "@/lib/workspace/types";
import { MEDIA_PIPELINE_STAGES } from "@/lib/workspace/types";
import { WorkflowCard } from "./workflow-card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorkflowPipelineProps {
  workflows: MediaWorkflow[];
  onWorkflowClick?: (workflow: MediaWorkflow) => void;
}

export function WorkflowPipeline({ workflows, onWorkflowClick }: WorkflowPipelineProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-1">
      {MEDIA_PIPELINE_STAGES.map((stage) => {
        const stageWorkflows = workflows.filter((w) => w.status === stage.id);
        return (
          <div key={stage.id} className="flex flex-col min-w-[260px] w-[260px] flex-shrink-0">
            {/* Stage header */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b-2"
              style={{
                backgroundColor: `${stage.color}15`,
                borderBottomColor: stage.color,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </span>
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${stage.color}25`,
                  color: stage.color,
                }}
              >
                {stageWorkflows.length}
              </span>
            </div>

            {/* Stage cards */}
            <div
              className="flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px]"
              style={{
                backgroundColor: `${stage.color}08`,
                borderColor: `${stage.color}30`,
              }}
            >
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2 pr-1">
                  {stageWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onClick={() => onWorkflowClick?.(workflow)}
                    />
                  ))}

                  {stageWorkflows.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg"
                      style={{ borderColor: `${stage.color}30` }}>
                      <p className="text-xs" style={{ color: `${stage.color}80` }}>
                        Chưa có nội dung
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      })}
    </div>
  );
}
