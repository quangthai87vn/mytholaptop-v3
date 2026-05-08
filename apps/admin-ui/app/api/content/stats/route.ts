/**
 * Content Stats API
 * GET /api/content/stats
 */

import { NextRequest, NextResponse } from "next/server";
import { getContentItems, getRecentContentItems } from "@/lib/content/db/content";
import { getTotalTokenUsage } from "@/lib/content/db/logs";

export async function GET(_req: NextRequest) {
  try {
    const [allResult, recentItems, tokenUsage] = await Promise.all([
      getContentItems({ limit: 1 }),
      getRecentContentItems(5),
      getTotalTokenUsage(),
    ]);

    // Get counts by type
    const typeResult = await getContentItems({ limit: 1000 });
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const item of typeResult.data) {
      byType[item.content_type] = (byType[item.content_type] || 0) + 1;
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    // This week count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekResult = await getContentItems({ limit: 1000 });
    const thisWeek = weekResult.data.filter(
      (item) => new Date(item.created_at) >= weekAgo
    ).length;

    return NextResponse.json({
      data: {
        total_items: allResult.total,
        by_type: byType,
        by_status: byStatus,
        recent_items: recentItems,
        this_week: thisWeek,
        this_month: allResult.total,
        token_usage: tokenUsage,
      },
    });
  } catch (err) {
    console.error("[Content Stats GET]", err);
    return NextResponse.json({ error: "Loi khi lay thong ke" }, { status: 500 });
  }
}
