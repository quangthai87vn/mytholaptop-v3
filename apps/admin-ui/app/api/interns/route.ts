import { NextRequest, NextResponse } from "next/server";
import { getInterns, createIntern } from "@/lib/workspace/db";

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
  try {
    const body = await request.json();
    const intern = await createIntern({
      user_id: body.user_id,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone,
      avatar_url: body.avatar_url,
      university: body.university,
      major: body.major,
      year_of_study: body.year_of_study,
      position: body.position,
      start_date: body.start_date,
      end_date: body.end_date,
      mentor_id: body.mentor_id,
      status: body.status ?? "active",
      skills: body.skills ?? [],
      bio: body.bio,
    });
    return NextResponse.json({ data: intern }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/interns error:", error);
    return NextResponse.json({ error: "Failed to create intern" }, { status: 400 });
  }
}
