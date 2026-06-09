import { NextRequest, NextResponse } from "next/server";

/**
 * @deprecated MediaWorkflow API - use /api/tasks instead
 * @deprecated since 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql
 * Data migrated: 10 media workflows → pm_tasks (2026-05-26)
 */

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return NextResponse.json(
    {
      error: "MediaWorkflow API has been deprecated",
      message: `GET /api/tasks/${id} instead. Note: media workflow ID ${id} has been migrated to pm_tasks with task_type field.`,
      migrated_at: "2026-05-26",
      migration: "sql/workspace/008_media_workflow_merge.sql",
    },
    { status: 410 }
  );
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return NextResponse.json(
    {
      error: "MediaWorkflow API has been deprecated",
      message: `Use PUT /api/tasks/${id} with workflow_stage field instead.`,
      migrated_at: "2026-05-26",
      migration: "sql/workspace/008_media_workflow_merge.sql",
    },
    { status: 410 }
  );
}
