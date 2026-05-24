/**
 * AI Task Routes API
 * GET  /api/ai/task-routes      - List all routing rules (returns both legacy and new format)
 * PUT  /api/ai/task-routes      - Upsert routing rule (supports both legacy and new format)
 * DELETE /api/ai/task-routes?id= - Delete by id
 *
 * Supports BOTH legacy (provider_type + model_name) and new (provider_id + *_override)
 * request formats for backward compatibility. The new format is preferred when present.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllTaskRoutes,
  upsertTaskRoute,
  deleteTaskRoute,
  deleteRoutingRule,
  getAllRoutingRules,
  upsertRoutingRule,
  toggleRoutingRuleActive,
} from "@/lib/content/db/task-routes";

export async function GET() {
  try {
    // Return new format by default (RoutingRule), include legacy for compat
    const rules = await getAllRoutingRules();
    const legacy = await getAllTaskRoutes();
    return NextResponse.json({ data: { rules, legacy } });
  } catch (err) {
    console.error("[AI Task Routes GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy task routes" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Detect format: new format has primary_provider_id
    const isNewFormat = body.primary_provider_id !== undefined;

    if (isNewFormat) {
      // ── New format: RoutingRuleInput ────────────────────────────────
      const route = await upsertRoutingRule({
        task_type: body.task_type,
        task_label: body.task_label,
        primary_provider_id: body.primary_provider_id,
        primary_model_override: body.primary_model_override ?? null,
        fallback_provider_id: body.fallback_provider_id ?? null,
        fallback_model_override: body.fallback_model_override ?? null,
        temperature_override: body.temperature_override ?? null,
        max_tokens_override: body.max_tokens_override ?? null,
        top_p_override: body.top_p_override ?? null,
        priority: body.priority,
        system_prompt_id: body.system_prompt_id ?? null,
        brand_preset: body.brand_preset ?? null,
        is_active: body.is_active,
      });
      return NextResponse.json({ data: route });

    } else {
      // ── Legacy format: TaskRouteInput ──────────────────────────────
      if (!body.task_type || !body.provider_type || !body.model_name) {
        return NextResponse.json(
          { error: "task_type, provider_type và model_name là bắt buộc" },
          { status: 400 }
        );
      }

      const route = await upsertTaskRoute({
        task_type: body.task_type,
        provider_type: body.provider_type,
        model_name: body.model_name,
        fallback_provider_type: body.fallback_provider_type,
        fallback_model_name: body.fallback_model_name,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        priority: body.priority,
        system_prompt_id: body.system_prompt_id,
        brand_preset: body.brand_preset,
        is_active: body.is_active,
      });
      return NextResponse.json({ data: route });
    }
  } catch (err) {
    console.error("[AI Task Routes PUT]", err);
    return NextResponse.json({ error: "Lỗi khi lưu task route" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.task_type) {
      return NextResponse.json({ error: "task_type là bắt buộc" }, { status: 400 });
    }

    const route = await upsertRoutingRule({
      task_type: body.task_type,
      task_label: body.task_label || body.task_type,
      primary_provider_id: body.primary_provider_id ?? null,
      primary_model_override: body.primary_model_override ?? null,
      fallback_provider_id: body.fallback_provider_id ?? null,
      fallback_model_override: body.fallback_model_override ?? null,
      temperature_override: body.temperature_override ?? 0.7,
      max_tokens_override: body.max_tokens_override ?? 1500,
      top_p_override: body.top_p_override ?? null,
      priority: body.priority ?? 10,
      system_prompt_id: body.system_prompt_id ?? null,
      brand_preset: body.brand_preset ?? null,
      is_active: body.is_active ?? true,
    });

    return NextResponse.json({ data: route });
  } catch (err) {
    console.error("[AI Task Routes POST]", err);
    return NextResponse.json({ error: "Lỗi khi tạo task route" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    const task_type = searchParams.get("task_type");

    if (id) {
      const deleted = await deleteTaskRoute(parseInt(id, 10));
      if (!deleted) return NextResponse.json({ error: "Không tìm thấy task route" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (task_type) {
      const deleted = await deleteRoutingRule(task_type);
      if (!deleted) return NextResponse.json({ error: "Không tìm thấy routing rule" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "id hoặc task_type là bắt buộc" }, { status: 400 });
  } catch (err) {
    console.error("[AI Task Routes DELETE]", err);
    return NextResponse.json({ error: "Lỗi khi xóa task route" }, { status: 500 });
  }
}
