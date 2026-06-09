/**
 * Content Items API
 * GET  /api/content/items  - List content items (filter by content_type, status, search)
 * POST /api/content/items  - Create content item manually
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getContentItems,
  createContentItem,
} from "@/lib/content/db/content";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import type { ContentType, ContentStatus } from "@/lib/content/types";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = req.nextUrl;
    const contentType = searchParams.get("content_type") as ContentType | null;
    const status = searchParams.get("status") as ContentStatus | null;
    const search = searchParams.get("search") || undefined;
    const productId = searchParams.get("product_id") || undefined;
    const taskId = searchParams.get("task_id") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getContentItems({
      content_type: contentType || undefined,
      status: status || undefined,
      search,
      product_id: productId,
      task_id: taskId,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Content Items GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy danh sách nội dung" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const item = await createContentItem({
      content_type: body.content_type,
      title: body.title,
      content_body: body.content_body,
      product_id: body.product_id,
      product_name: body.product_name,
      status: body.status || "draft",
      metadata: body.metadata,
      generated_by: body.generated_by,
      template_id: body.template_id,
      created_by: body.created_by,
      published_at: body.published_at,
      // V3: link to task
      task_id: body.task_id || null,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    console.error("[Content Items POST]", err);
    return NextResponse.json({ error: "Lỗi khi tạo nội dung" }, { status: 500 });
  }
}
