/**
 * AI Usage Stats API
 * GET /api/ai/usage-stats
 */

import { NextRequest, NextResponse } from "next/server";
import { getUsageStats } from "@/lib/content/db/usage-logs";
import { requireAdminAuth } from "@/lib/auth/require-admin";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const stats = await getUsageStats();
    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("[AI Usage Stats GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy usage stats" }, { status: 500 });
  }
}
