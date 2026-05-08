/**
 * Content Schedules API
 * GET  /api/content/schedules  - List schedules
 * POST /api/content/schedules  - Create schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { getSchedules, createSchedule } from "@/lib/content/db/schedules";
import type { ScheduleStatus } from "@/lib/content/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const channel = searchParams.get("channel") || undefined;
    const status = searchParams.get("status") as ScheduleStatus | null;
    const fromDate = searchParams.get("from_date") || undefined;
    const toDate = searchParams.get("to_date") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await getSchedules({
      channel,
      status: status || undefined,
      from_date: fromDate,
      to_date: toDate,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Schedules GET]", err);
    return NextResponse.json({ error: "Loi khi lay danh sach lich" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content_item_id, channel, publish_at, timezone, metadata, created_by } = body;

    if (!content_item_id || !channel || !publish_at) {
      return NextResponse.json(
        { error: "content_item_id, channel, publish_at la bat buoc" },
        { status: 400 }
      );
    }

    const schedule = await createSchedule({
      content_item_id: parseInt(content_item_id, 10),
      channel,
      publish_at,
      timezone: timezone || "Asia/Ho_Chi_Minh",
      metadata: metadata || {},
      created_by,
    });

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (err) {
    console.error("[Schedules POST]", err);
    return NextResponse.json({ error: "Loi khi tao lich" }, { status: 500 });
  }
}
