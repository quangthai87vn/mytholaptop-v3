import { NextRequest, NextResponse } from "next/server";
import { getMediaWorkflows, createMediaWorkflow } from "@/lib/workspace/db";

/**
 * @deprecated MediaWorkflow API - use /api/tasks instead
 * @deprecated since 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql
 * Data migrated: 10 media workflows → pm_tasks (2026-05-26)
 */

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "MediaWorkflow API has been deprecated",
      message: "Use /api/tasks instead. All media workflows have been migrated to pm_tasks with task_type field.",
      migrated_at: "2026-05-26",
      migration: "sql/workspace/008_media_workflow_merge.sql",
    },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "MediaWorkflow API has been deprecated",
      message: "Use POST /api/tasks instead with task_type field to create media content tasks.",
      migrated_at: "2026-05-26",
      migration: "sql/workspace/008_media_workflow_merge.sql",
    },
    { status: 410 }
  );
}
