/**
 * System Prompt Templates API
 * GET  /api/ai/system-prompts - List all
 * POST /api/ai/system-prompts - Create/Update
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SystemPromptTemplate } from "@/types/ai-operating";
import { DEFAULT_VI_SYSTEM_PROMPT } from "@/types/ai-operating";

export async function GET() {
  try {
    const { rows } = await query<SystemPromptTemplate>(
      "SELECT * FROM ai_system_prompt_templates ORDER BY is_default DESC, id ASC"
    );
    if (rows.length === 0) {
      return NextResponse.json({
        data: [{
          id: 0,
          name: "Mặc định tiếng Việt",
          description: "Luôn trả lời bằng tiếng Việt.",
          prompt_text: DEFAULT_VI_SYSTEM_PROMPT,
          is_active: true,
          is_default: true,
          created_at: new Date().toISOString(),
        }],
      });
    }
    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[System Prompts GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy system prompts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, prompt_text, is_active, is_default } = body;

    if (!name || !prompt_text) {
      return NextResponse.json(
        { error: "name và prompt_text là bắt buộc" },
        { status: 400 }
      );
    }

    const { rows } = await query<SystemPromptTemplate>(
      `INSERT INTO ai_system_prompt_templates (name, description, prompt_text, is_active, is_default)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
      [name, description ?? "", prompt_text, is_active ?? true, is_default ?? false]
    );

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("[System Prompts POST]", err);
    return NextResponse.json({ error: "Lỗi khi lưu system prompt" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, description, prompt_text, is_active, is_default } = body;

    if (!id || !name || !prompt_text) {
      return NextResponse.json(
        { error: "id, name và prompt_text là bắt buộc" },
        { status: 400 }
      );
    }

    const { rows } = await query<SystemPromptTemplate>(
      `UPDATE ai_system_prompt_templates
         SET name = $1, description = $2, prompt_text = $3, is_active = $4, is_default = $5
         WHERE id = $6
         RETURNING *`,
      [name, description ?? "", prompt_text, is_active ?? true, is_default ?? false, id]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy template" }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("[System Prompts PUT]", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật system prompt" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 });
    }
    await query("DELETE FROM ai_system_prompt_templates WHERE id = $1", [parseInt(id)]);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[System Prompts DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xoá system prompt" }, { status: 500 });
  }
}
