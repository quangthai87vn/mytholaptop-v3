import { getMasterDataItems, getProjects, getCampaigns, getActiveStaff } from "@/lib/workspace/db";
import { CalendarClient } from "./calendar-client";
import type { MasterDataItem } from "@/lib/workspace/types-master-data";

export const dynamic = "force-dynamic";

interface CalendarMasterData {
  taskStatuses: MasterDataItem[];
  taskTypes: MasterDataItem[];
  channels: MasterDataItem[];
  projects: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; full_name: string }>;
}

export default async function CalendarPage() {
  const [taskStatuses, taskTypes, channels, projects, campaigns, staff] = await Promise.all([
    getMasterDataItems("task_status"),
    getMasterDataItems("task_type"),
    getMasterDataItems("channel"),
    getProjects(),
    getCampaigns(),
    getActiveStaff(),
  ]);

  const masterData: CalendarMasterData = {
    taskStatuses,
    taskTypes,
    channels,
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
    campaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
    staff: staff.map((s) => ({ id: s.id, full_name: s.full_name })),
  };

  return <CalendarClient masterData={masterData} />;
}
