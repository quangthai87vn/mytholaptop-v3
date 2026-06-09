import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import {
  getWorkspaceKpiOverview,
  getUserKpiList,
  getUserKpi,
  getWeeklyTrend,
  getContentKpi,
  getCampaignKpi,
} from "@/lib/workspace/db";
import type { KpiRole } from "@/lib/workspace/types-kpi";

export const dynamic = "force-dynamic";

// GET /api/kpi?type=overview|user|team|weekly|content&userId=xxx
export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const sessionUser = (req as NextRequest & {
    _authUser?: { id: string; name: string; role: string };
  })._authUser;

  const userRole = (sessionUser?.role as KpiRole) ?? "viewer";
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? "overview";
  const userId = searchParams.get("userId");

  try {
    switch (type) {
      case "overview": {
        const overview = await getWorkspaceKpiOverview();
        return NextResponse.json({ data: overview });
      }

      case "user": {
        // Team KPI: admin+ only
        if (userRole === "viewer") {
          return NextResponse.json({ error: "Không có quyền xem KPI team" }, { status: 403 });
        }
        const list = await getUserKpiList();
        return NextResponse.json({ data: list });
      }

      case "myself": {
        if (!sessionUser) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const kpi = await getUserKpi(sessionUser.id);
        return NextResponse.json({ data: kpi });
      }

      case "weekly": {
        const weeks = parseInt(searchParams.get("weeks") ?? "8");
        const trend = await getWeeklyTrend(Math.min(weeks, 12));
        return NextResponse.json({ data: trend });
      }

      case "content": {
        const content = await getContentKpi();
        return NextResponse.json({ data: content });
      }

      case "campaign": {
        const campaign = await getCampaignKpi();
        return NextResponse.json({ data: campaign });
      }

      default:
        return NextResponse.json({ error: "Loại KPI không hợp lệ" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] GET /api/kpi error:", error);
    return NextResponse.json(
      { error: "Không thể lấy dữ liệu KPI" },
      { status: 500 }
    );
  }
}
