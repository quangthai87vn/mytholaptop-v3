/**
 * AI Providers API
 * GET  /api/ai/providers      - List all providers
 * POST /api/ai/providers      - Create provider
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllProviders, createProvider } from "@/lib/content/db/providers";

export async function GET() {
  try {
    const providers = await getAllProviders();
    return NextResponse.json({ data: providers });
  } catch (err) {
    console.error("[AI Providers GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy danh sách provider" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, display_name, base_url } = body;

    if (!provider || !display_name) {
      return NextResponse.json(
        { error: "provider và display_name là bắt buộc" },
        { status: 400 }
      );
    }

    const created = await createProvider({ provider, display_name, base_url });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[AI Providers POST]", err);
    return NextResponse.json({ error: "Lỗi khi tạo provider" }, { status: 500 });
  }
}
