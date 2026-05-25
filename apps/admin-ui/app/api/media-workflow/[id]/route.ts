import { NextRequest, NextResponse } from "next/server";
import { getMediaWorkflowById, updateMediaWorkflow } from "@/lib/workspace/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflow = await getMediaWorkflowById(id);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ data: workflow });
  } catch (error) {
    console.error("[API] GET /api/media-workflow/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle status change to published
    if (body.status === "published" && !body.published_at) {
      body.published_at = new Date().toISOString();
    }

    const workflow = await updateMediaWorkflow(id, body);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ data: workflow });
  } catch (error) {
    console.error("[API] PUT /api/media-workflow/[id] error:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 400 });
  }
}
