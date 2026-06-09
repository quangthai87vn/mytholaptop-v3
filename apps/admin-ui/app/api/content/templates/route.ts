/**
 * Content Templates API
 * GET  /api/content/templates  - List templates (filter by content_type)
 * POST /api/content/templates  - Create template
 */

import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate } from "@/lib/content/db/templates";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import type { ContentType } from "@/lib/content/types";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = req.nextUrl;
    const contentType = searchParams.get("content_type") as ContentType | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await getTemplates({
      content_type: contentType || undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Templates GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy danh sách template" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const { template_name, content_type, system_prompt, user_template, variables, tone_options, is_active } = body;

    if (!template_name || !content_type || !user_template) {
      return NextResponse.json(
        { error: "template_name, content_type, user_template là bắt buộc" },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      template_name,
      content_type,
      system_prompt,
      user_template,
      variables: variables || [],
      tone_options: tone_options || [],
      is_active: is_active ?? true,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    console.error("[Templates POST]", err);
    return NextResponse.json({ error: "Lỗi khi tạo template" }, { status: 500 });
  }
}
