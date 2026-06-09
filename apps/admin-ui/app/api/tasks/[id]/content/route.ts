/**
 * Task Content API — Phase 3
 * GET  /api/tasks/[id]/content — Lấy content detail từ pm_task_contents
 * POST /api/tasks/[id]/content — Tạo content record
 * PUT  /api/tasks/[id]/content — Cập nhật content record
 */

import { NextRequest, NextResponse } from "next/server";
import { getTaskContent, upsertTaskContent } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_CONTENT_STATUSES = ["draft", "writing", "internal_review", "revision", "approved", "published"];

async function getSessionUser(req: NextRequest) {
  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) return null;
  return validateSession(sessionId);
}

// GET — lấy content detail
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(_req);
  if (authError) return authError;

  try {
    const content = await getTaskContent(taskId);
    if (!content) {
      return NextResponse.json({ data: null, message: "Chưa có content cho task này" });
    }
    return NextResponse.json({ data: content });
  } catch (error) {
    console.error("[API] GET /api/tasks/[id]/content error:", error);
    return NextResponse.json({ error: "Không thể lấy content" }, { status: 500 });
  }
}

// POST — tạo content record (upsert)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const sessionUser = await getSessionUser(req);

  try {
    const body = await req.json();

    if (body.content_status && !VALID_CONTENT_STATUSES.includes(body.content_status)) {
      return NextResponse.json(
        { error: `content_status không hợp lệ. Chỉ chấp nhận: ${VALID_CONTENT_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const content = await upsertTaskContent(taskId, {
      ...body,
      task_id: taskId,
      created_by: sessionUser?.id,
    }, sessionUser?.full_name || "System");

    return NextResponse.json({
      data: content,
      message: content ? "Content đã được lưu" : "Không có thay đổi"
    }, { status: content ? 201 : 200 });
  } catch (error) {
    console.error("[API] POST /api/tasks/[id]/content error:", error);
    return NextResponse.json({ error: "Không thể lưu content" }, { status: 500 });
  }
}

// PUT — cập nhật content record
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id: taskId } = await params;

  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const sessionUser = await getSessionUser(req);

  try {
    const body = await req.json();

    if (body.content_status && !VALID_CONTENT_STATUSES.includes(body.content_status)) {
      return NextResponse.json(
        { error: `content_status không hợp lệ. Chỉ chấp nhận: ${VALID_CONTENT_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await getTaskContent(taskId);
    if (!existing) {
      // Auto-upsert: tạo mới nếu chưa có
      const content = await upsertTaskContent(taskId, {
        ...body,
        task_id: taskId,
        created_by: sessionUser?.id,
      }, sessionUser?.full_name || "System");
      return NextResponse.json({
        data: content,
        message: "Content đã được tạo mới"
      }, { status: 201 });
    }

    const content = await upsertTaskContent(taskId, {
      ...body,
      task_id: taskId,
    }, sessionUser?.full_name || "System");

    return NextResponse.json({ data: content, message: "Content đã được cập nhật" });
  } catch (error) {
    console.error("[API] PUT /api/tasks/[id]/content error:", error);
    return NextResponse.json({ error: "Không thể cập nhật content" }, { status: 500 });
  }
}
