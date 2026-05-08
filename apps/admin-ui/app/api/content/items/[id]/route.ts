/**
 * Content Item by ID API
 * GET    /api/content/items/[id]
 * PUT    /api/content/items/[id]
 * DELETE /api/content/items/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getContentItemById,
  updateContentItem,
  deleteContentItem,
} from "@/lib/content/db/content";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await getContentItemById(parseInt(id, 10));
    if (!item) {
      return NextResponse.json({ error: "Khong tim thay noi dung" }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error("[Content Item GET]", err);
    return NextResponse.json({ error: "Loi khi lay noi dung" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateContentItem(parseInt(id, 10), body);
    if (!updated) {
      return NextResponse.json({ error: "Khong tim thay noi dung" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[Content Item PUT]", err);
    return NextResponse.json({ error: "Loi khi cap nhat noi dung" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteContentItem(parseInt(id, 10));
    if (!deleted) {
      return NextResponse.json({ error: "Khong tim thay noi dung" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Content Item DELETE]", err);
    return NextResponse.json({ error: "Loi khi xoa noi dung" }, { status: 500 });
  }
}
