import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { query } from "@/lib/db";

/**
 * GET /api/debug/routing-inspect — Lấy routing config (AI task routes)
 *
 * P5.10 Security Audit: Auth required — this endpoint exposes internal routing
 * logic that should not be available to unauthenticated users.
 */
export async function GET(req: Request) {
  const request = req as unknown as import("next/server").NextRequest;
  const authError = await requireAdminAuth(request);
  if (authError) return authError;
  try {
    const { rows } = await query(
      `SELECT id, task_type, task_label, primary_provider_id, primary_model_override, provider_type, model_name, is_active FROM ai_task_routes ORDER BY id ASC`
    );

    return NextResponse.json({ data: { routing: rows } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
