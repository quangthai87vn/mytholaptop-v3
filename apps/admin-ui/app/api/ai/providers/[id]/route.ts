/**
 * AI Provider by ID API
 * GET  /api/ai/providers/[id]
 * PUT  /api/ai/providers/[id]
 * DELETE /api/ai/providers/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getProviderById,
  updateProvider,
  deleteProvider,
} from "@/lib/content/db/providers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = await getProviderById(parseInt(id, 10));
    if (!provider) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ data: provider });
  } catch (err) {
    console.error("[AI Provider GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy provider" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateProvider(parseInt(id, 10), body);
    if (!updated) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[AI Provider PUT]", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật provider" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteProvider(parseInt(id, 10));
    if (!deleted) {
      return NextResponse.json({ error: "Provider không tìm thấy" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AI Provider DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xóa provider" }, { status: 500 });
  }
}
