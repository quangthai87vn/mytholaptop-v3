import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import {
  getCalendarEvents,
  getCalendarStats,
} from "@/lib/workspace/db";
import type { CalendarFilters } from "@/lib/workspace/types-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const { searchParams } = req.nextUrl;

    const filters: CalendarFilters = {
      platforms: searchParams.get("platforms")?.split(",").filter(Boolean),
      assignees: searchParams.get("assignees")?.split(",").filter(Boolean),
      workflowStages: searchParams.get("workflowStages")?.split(",").filter(Boolean),
      taskTypes: searchParams.get("taskTypes")?.split(",").filter(Boolean),
      projectIds: searchParams.get("projectIds")?.split(",").filter(Boolean),
      campaignIds: searchParams.get("campaignIds")?.split(",").filter(Boolean),
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      overdue: searchParams.get("overdue") === "true",
      pendingApproval: searchParams.get("pendingApproval") === "true",
      completed: searchParams.get("completed") === "true",
      showProductionDeadline: searchParams.get("showProductionDeadline") !== "false",
      showPublishSchedule: searchParams.get("showPublishSchedule") !== "false",
      showCampaignDeadline: searchParams.get("showCampaignDeadline") !== "false",
    };

    // Support year/month range for grid view (default to current)
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()));

    const [events, stats] = await Promise.all([
      getCalendarEvents({ year, month, filters }),
      getCalendarStats(),
    ]);

    return NextResponse.json({ events, stats });
  } catch (error) {
    console.error("[API] GET /api/calendar error:", error);
    return NextResponse.json(
      { error: "Không thể lấy dữ liệu calendar" },
      { status: 500 }
    );
  }
}
