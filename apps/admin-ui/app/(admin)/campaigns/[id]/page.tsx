import { notFound } from "next/navigation";
import { getCampaignById, getTasks, getProjects, getMasterDataItems } from "@/lib/workspace/db";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [campaign, tasks, projects, campaignStatuses, campaignTypes] = await Promise.all([
    getCampaignById(id),
    getTasks({ campaign_id: id }),
    getProjects(),
    getMasterDataItems("campaign_status"),
    getMasterDataItems("campaign_type"),
  ]);

  if (!campaign) {
    notFound();
  }

  const activeCampaignStatuses = campaignStatuses
    .filter((s) => s.is_active || s.code === campaign.status)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ code: s.code, name: s.name, color: s.color }));

  const activeCampaignTypes = campaignTypes
    .filter((t) => t.is_active || t.code === campaign.campaign_type)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({ code: t.code, name: t.name }));

  const mediaTaskTypes = ["facebook_post", "tiktok_video", "youtube_video", "seo_article", "design_image", "product_photo", "livestream", "train", "other"];
  const mediaTasks = tasks.filter(
    (t) => t.task_type && mediaTaskTypes.includes(t.task_type)
  );

  return (
    <CampaignDetailClient
      campaign={campaign}
      initialTasks={tasks}
      mediaTasks={mediaTasks}
      projects={projects}
      statusOptions={activeCampaignStatuses}
      typeOptions={activeCampaignTypes}
    />
  );
}
