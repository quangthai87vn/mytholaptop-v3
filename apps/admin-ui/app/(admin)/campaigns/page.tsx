import { getCampaigns, getProjects, getMasterDataItems, getActiveStaff } from "@/lib/workspace/db";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { CampaignsClient } from "./campaigns-client";
import { Clapperboard } from "lucide-react";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";

export const dynamic = "force-dynamic";

interface CampaignMasterData {
  campaign_types: MasterDataItem[];
  campaign_statuses: MasterDataItem[];
  channels: MasterDataItem[];
}

export default async function CampaignsPage() {
  const [
    campaigns,
    projects,
    user,
    campaignTypes,
    campaignStatuses,
    channels,
    staff,
  ] = await Promise.all([
    getCampaigns(),
    getProjects(),
    getCurrentUser(),
    getMasterDataItems("campaign_type"),
    getMasterDataItems("campaign_status"),
    getMasterDataItems("channel"),
    getActiveStaff(),
  ]);

  const masterData: CampaignMasterData = {
    campaign_types: campaignTypes,
    campaign_statuses: campaignStatuses,
    channels,
  };

  const staffMap = Object.fromEntries(
    staff.map((s: { id: string; full_name: string }) => [s.id, s.full_name])
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clapperboard className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chiến dịch</h1>
            <p className="text-sm text-slate-500">
              Quản lý chiến dịch marketing
            </p>
          </div>
        </div>
      </div>

      <CampaignsClient
        campaigns={campaigns}
        projects={projects}
        masterData={masterData}
        staffMap={staffMap}
        isSuperAdmin={user?.role === "super_admin"}
        isIntern={user?.role === "intern"}
        userId={user?.id}
      />
    </div>
  );
}
