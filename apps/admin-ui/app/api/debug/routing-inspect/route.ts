import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, task_type, task_label, primary_provider_id, primary_model_override, provider_type, model_name, is_active FROM ai_task_routes ORDER BY id ASC`
    );

    return NextResponse.json({ data: { routing: rows } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
