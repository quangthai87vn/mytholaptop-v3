/**
 * Content Schedule by ID API
 * GET    /api/content/schedules/[id]
 * PUT    /api/content/schedules/[id]
 * DELETE /api/content/schedules/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScheduleById,
  updateSchedule,
  deleteSchedule,
} from "@/lib/content/db/schedules";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schedule = await getScheduleById(parseInt(id, 10));
    if (!schedule) {
      return NextResponse.json({ error: "Không tìm thấy lịch" }, { status: 404 });
    }
    return NextResponse.json({ data: schedule });
  } catch (err) {
    console.error("[Schedule GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy lịch" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateSchedule(parseInt(id, 10), body);
    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy lịch" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[Schedule PUT]", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật lịch" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminAuth(_req);
  if (authError) return authError;

  const csrfError = requireCsrf(_req);
  if (csrfError) return csrfError;

  try {
    const { id } = await params;
    const deleted = await deleteSchedule(parseInt(id, 10));
    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy lịch" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Schedule DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xóa lịch" }, { status: 500 });
  }
}
