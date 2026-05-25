import { NextRequest, NextResponse } from "next/server";
import { getMediaWorkflows, createMediaWorkflow } from "@/lib/workspace/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflows = await getMediaWorkflows({
      project_id: searchParams.get("project_id") ?? undefined,
      campaign_id: searchParams.get("campaign_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      platform: searchParams.get("platform") ?? undefined,
      content_type: searchParams.get("content_type") ?? undefined,
    });
    return NextResponse.json({ data: workflows });
  } catch (error) {
    console.error("[API] GET /api/media-workflow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const workflow = await createMediaWorkflow({
      project_id: body.project_id,
      campaign_id: body.campaign_id,
      title: body.title,
      description: body.description,
      content_type: body.content_type,
      platform: body.platform,
      status: body.status ?? "idea",
      ai_prompt: body.ai_prompt,
      ai_generated_content: body.ai_generated_content,
      ai_model_used: body.ai_model_used,
      ai_generated_at: body.ai_generated_at,
      published_at: body.published_at,
      published_url: body.published_url,
      engagement_metrics: body.engagement_metrics ?? {},
      assignee_ids: body.assignee_ids ?? [],
      due_date: body.due_date,
      tags: body.tags ?? [],
      attachments: body.attachments ?? [],
      metadata: body.metadata ?? {},
    });
    return NextResponse.json({ data: workflow }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/media-workflow error:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 400 });
  }
}
