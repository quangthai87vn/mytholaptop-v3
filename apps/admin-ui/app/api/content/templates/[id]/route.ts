/**
 * Content Template by ID API
 * GET    /api/content/templates/[id]
 * PUT    /api/content/templates/[id]
 * DELETE /api/content/templates/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from "@/lib/content/db/templates";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(parseInt(id, 10));
    if (!template) {
      return NextResponse.json({ error: "Template không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ data: template });
  } catch (err) {
    console.error("[Template GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy template" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateTemplate(parseInt(id, 10), body);
    if (!updated) {
      return NextResponse.json({ error: "Template không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[Template PUT]", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật template" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteTemplate(parseInt(id, 10));
    if (!deleted) {
      return NextResponse.json({ error: "Template không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Template DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xóa template" }, { status: 500 });
  }
}
