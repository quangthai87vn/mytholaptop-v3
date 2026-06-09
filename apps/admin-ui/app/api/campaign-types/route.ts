import { NextResponse } from "next/server";
import { getCampaignTypes } from "@/lib/workspace/db";

export async function GET() {
  try {
    const types = await getCampaignTypes();
    return NextResponse.json({ data: types });
  } catch (err) {
    console.error("[API/campaign-types] GET error:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
