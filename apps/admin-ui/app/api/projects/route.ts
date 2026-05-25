import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/workspace/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };
    const projects = await getProjects(filters);
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("[API] GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const project = await createProject({
      name: body.name,
      description: body.description,
      status: body.status ?? "active",
      priority: body.priority ?? "medium",
      color: body.color ?? "#E60012",
      start_date: body.start_date,
      end_date: body.end_date,
      budget: body.budget,
      owner_id: body.owner_id,
      team_ids: body.team_ids ?? [],
      tags: body.tags ?? [],
      metadata: body.metadata ?? {},
    });
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 400 });
  }
}
