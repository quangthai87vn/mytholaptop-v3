/**
 * AI Usage Stats API
 * GET /api/ai/usage-stats
 */

import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/content/db/usage-logs";

export async function GET() {
  try {
    const stats = await getUsageStats();
    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("[AI Usage Stats GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy usage stats" }, { status: 500 });
  }
}
