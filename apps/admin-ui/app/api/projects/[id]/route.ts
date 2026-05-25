import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@/lib/workspace/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[API] GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const project = await updateProject(id, body);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[API] PUT /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteProject(id);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[API] DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 400 });
  }
}
