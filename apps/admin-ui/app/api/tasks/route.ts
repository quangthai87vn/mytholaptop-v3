import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/workspace/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tasks = await getTasks({
      project_id: searchParams.get("project_id") ?? undefined,
      campaign_id: searchParams.get("campaign_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      assignee_id: searchParams.get("assignee_id") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ data: tasks });
  } catch (error) {
    console.error("[API] GET /api/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await createTask({
      title: body.title,
      description: body.description,
      project_id: body.project_id,
      campaign_id: body.campaign_id,
      parent_task_id: body.parent_task_id,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      stage: body.stage,
      assignee_ids: body.assignee_ids ?? [],
      reporter_id: body.reporter_id,
      start_date: body.start_date,
      due_date: body.due_date,
      estimated_hours: body.estimated_hours,
      actual_hours: body.actual_hours,
      tags: body.tags ?? [],
      attachments: body.attachments ?? [],
      dependencies: body.dependencies ?? [],
      progress: body.progress ?? 0,
      metadata: body.metadata ?? {},
    });
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 400 });
  }
}
