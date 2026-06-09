import { NextRequest, NextResponse } from "next/server";
import { getInterns, createIntern } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { createInternSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import type { InternPosition, InternStatus } from "@/lib/workspace/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const interns = await getInterns({
      status: searchParams.get("status") ?? undefined,
      position: searchParams.get("position") ?? undefined,
    });
    return NextResponse.json({ data: interns });
  } catch (error) {
    console.error("[API] GET /api/interns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  try {
    const body = await request.json();

    const result = createInternSchema.safeParse(body);
    if (!result.success) {
      return buildValidationResponse(result.error.issues);
    }
    const d = result.data;

    const intern = await createIntern({
      user_id: d.user_id || undefined,
      full_name: d.full_name,
      email: d.email || undefined,
      phone: d.phone || undefined,
      avatar_url: d.avatar_url || undefined,
      university: d.university,
      major: d.major,
      year_of_study: d.year_of_study,
      position: d.position as InternPosition,
      start_date: d.start_date,
      end_date: d.end_date || undefined,
      mentor_id: d.mentor_id || undefined,
      status: (d.status || "active") as InternStatus,
      skills: d.skills,
      bio: d.bio,
    });
    return NextResponse.json({ data: intern }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/interns error:", error);
    return NextResponse.json({ error: "Failed to create intern" }, { status: 400 });
  }
}
