"use client";

import type { Campaign } from "@/lib/workspace/types";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";
import { CampaignCard } from "./campaign-card";
import { Clapperboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CampaignListProps {
  campaigns: Campaign[];
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onAdd?: () => void;
  canDelete?: boolean;
  statusOptions?: MasterDataItem[];
  typeOptions?: MasterDataItem[];
  /** Staff ID → full_name map for avatar display */
  staffMap?: Record<string, string>;
  /** INTERN: hide action buttons */
  isIntern?: boolean;
}

export function CampaignList({
  campaigns,
  onEdit,
  onDelete,
  onArchive,
  onAdd,
  canDelete = false,
  statusOptions = [],
  typeOptions = [],
  staffMap = {},
  isIntern = false,
}: CampaignListProps) {
  // Build lookup maps for fast access
  const statusMap = Object.fromEntries(statusOptions.map((s) => [s.code, s]));
  const typeMap = Object.fromEntries(typeOptions.map((t) => [t.code, t]));

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Clapperboard className="size-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Chưa có chiến dịch nào
        </h3>
        <p className="text-slate-500 mb-6 max-w-sm">
          Tạo chiến dịch đầu tiên để bắt đầu quản lý marketing.
        </p>
        {onAdd && !isIntern && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="size-4" />
            Tạo chiến dịch đầu tiên
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onEdit={onEdit}
          onDelete={canDelete ? onDelete : undefined}
          onArchive={onArchive}
          canDelete={canDelete}
          taskCount={campaign._task_count ?? 0}
          completedTaskCount={campaign._completed_task_count ?? 0}
          mediaTaskCount={campaign._media_task_count ?? 0}
          mediaCompletedCount={campaign._media_completed_count ?? 0}
          statusConfig={statusMap[campaign.status]
            ? {
                label: statusMap[campaign.status].name,
                color: statusMap[campaign.status].color,
                bgColor: statusMap[campaign.status].bg_color,
              }
            : undefined}
          typeConfig={typeMap[campaign.campaign_type ?? ""]
            ? {
                label: typeMap[campaign.campaign_type ?? ""].name,
                color: typeMap[campaign.campaign_type ?? ""].color,
              }
            : undefined}
          staffMap={staffMap}
        />
      ))}
    </div>
  );
}
