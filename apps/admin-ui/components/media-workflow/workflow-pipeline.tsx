"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/lib/workspace/types";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";
import { WorkflowCard } from "./workflow-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { adminFetch } from "@/lib/api/admin-fetch";
import type { KanbanColumnConfig } from "@/lib/workspace/master-data-helpers";

interface WorkflowPipelineProps {
  tasks: Task[];
  stages: KanbanColumnConfig[];
  taskTypes?: MasterDataItem[];
  channels?: MasterDataItem[];
  taskTypeColorMap?: Record<string, { color: string; bgColor: string; label: string }>;
  platformOptions?: Array<{ code: string; name: string; color: string }>;
  projectNameMap?: Record<string, string>;
  campaignNameMap?: Record<string, string>;
  onTaskClick?: (task: Task) => void;
}

export function WorkflowPipeline({
  tasks,
  stages,
  taskTypes = [],
  channels = [],
  taskTypeColorMap = {},
  platformOptions = [],
  projectNameMap = {},
  campaignNameMap = {},
  onTaskClick,
}: WorkflowPipelineProps) {
  const [assetCounts, setAssetCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (tasks.length === 0) return;

    async function fetchAssetCounts() {
      const counts: Record<string, number> = {};
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const res = await adminFetch(`/api/tasks/${task.id}/assets`);
            if (res.ok) {
              const data = await res.json();
              counts[task.id] = data.total || 0;
            }
          } catch {
            counts[task.id] = 0;
          }
        })
      );
      setAssetCounts(counts);
    }

    fetchAssetCounts();
  }, [tasks]);

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-center">
        <div>
          <p className="text-sm text-slate-500 mb-1">Chưa có trạng thái công việc nào</p>
          <p className="text-xs text-slate-400">
            Vui lòng tạo trạng thái trong Workspace / Danh mục / Trạng thái công việc
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-1">
      {stages.map((stage) => {
        const stageTasks = tasks.filter((t) => t.status === stage.id);
        const bgColor = stage.bg ?? `${stage.color}08`;
        const borderColor = stage.border ?? `${stage.color}30`;
        const headerBg = stage.headerBg ?? `${stage.color}15`;

        return (
          <div
            key={stage.id}
            className="flex flex-col min-w-[300px] w-[300px] flex-shrink-0"
          >
            {/* Stage header */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b-2"
              style={{
                backgroundColor: headerBg,
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
                  {stage.title}
                </span>
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${stage.color}25`,
                  color: stage.color,
                }}
              >
                {stageTasks.length}
              </span>
            </div>

            {/* Stage cards */}
            <div
              className="flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px]"
              style={{
                backgroundColor: bgColor,
                borderColor,
              }}
            >
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2 pr-1">
                  {stageTasks.map((task) => (
                    <WorkflowCard
                      key={task.id}
                      task={task}
                      projectName={projectNameMap[task.project_id ?? ""]}
                      campaignName={campaignNameMap[task.campaign_id ?? ""]}
                      taskTypeColorMap={taskTypeColorMap}
                      platformOptions={platformOptions}
                      assetCount={assetCounts[task.id]}
                      onClick={() => onTaskClick?.(task)}
                    />
                  ))}

                  {stageTasks.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg"
                      style={{ borderColor }}
                    >
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
