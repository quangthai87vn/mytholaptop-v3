/**
 * AI Provider Management API
 * GET  /api/ai/providers      - List providers (supports filters) + auto-migrate
 * POST /api/ai/providers      - Create provider
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllProviders,
  getAllProviderGroups,
  createProvider,
} from "@/lib/content/db/provider-service";
import { query } from "@/lib/db";
import type { AIProviderInput } from "@/lib/content/types";
import type { ConnectionStatus, ProviderGroupSlug } from "@/lib/content/types";

// Disable caching — always query fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── Auto-migrate on first access ────────────────────────────────────────────
let migrationChecked = false;

async function ensureMigration() {
  if (migrationChecked) return;
  migrationChecked = true;
  try {
    await query(`SELECT 1 FROM ai_providers LIMIT 1`);
  } catch {
    // Table may not have new columns — try to add them
    console.log("[AI Providers] Running auto-migration for ai_providers...");
    try {
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT ''`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS slug VARCHAR(50)`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS group_slug VARCHAR(50) DEFAULT 'cloud_api'`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS type VARCHAR(50)`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS connection_status VARCHAR(20) DEFAULT 'unknown'`);
      await query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS custom_headers JSONB DEFAULT '{}'`);

      // Backfill NULL slugs/types from existing data
      await query(`UPDATE ai_providers SET slug = name WHERE slug IS NULL AND name IS NOT NULL AND name != ''`);
      await query(`UPDATE ai_providers SET slug = 'provider_' || id::text WHERE slug IS NULL`);
      await query(`UPDATE ai_providers SET type = slug WHERE type IS NULL AND slug IS NOT NULL`);

      console.log("[AI Providers] Auto-migration complete.");
    } catch (mErr) {
      console.error("[AI Providers] Auto-migration failed:", mErr);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureMigration();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "active" | "inactive" | null;
    const connectionStatus = searchParams.get("connection_status") as ConnectionStatus | null;
    const groupSlug = searchParams.get("group_slug") as ProviderGroupSlug | null;
    const search = searchParams.get("search") ?? undefined;
    const includeDeleted = searchParams.get("include_deleted") === "true";

    const [providers, groups] = await Promise.all([
      getAllProviders({
        status: status ?? undefined,
        connection_status: connectionStatus ?? undefined,
        group_slug: groupSlug ?? undefined,
        search,
        includeDeleted,
      }),
      getAllProviderGroups(),
    ]);

    return NextResponse.json({ data: { providers, groups } });
  } catch (err) {
    console.error("[AI Providers GET]", err);
    const msg = err instanceof Error ? err.message : String(err);
    // Detect missing columns / migration not run
    if (msg.includes("column") || msg.includes("relation") || msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error: "Database schema chưa đầy đủ. Vui lòng chạy migration: npx tsx lib/content/migration-providers.ts",
          detail: msg,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Lỗi khi lấy danh sách provider" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body = await req.json() as AIProviderInput;
    console.log("[AI Providers POST] body:", JSON.stringify(body));

    // Flatten runtimeConfig if sent from frontend
    if (body && typeof body === "object" && "runtimeConfig" in body && body.runtimeConfig) {
      const rc = body.runtimeConfig as Record<string, unknown>;
      body = {
        ...body,
        model_name: (rc.selected_model as string) || body.model_name || "",
        temperature: (rc.temperature as number) ?? body.temperature,
        max_output_tokens: (rc.max_output_tokens as number) ?? body.max_output_tokens,
        top_p: (rc.top_p as number) ?? body.top_p,
        frequency_penalty: (rc.frequency_penalty as number) ?? body.frequency_penalty,
        presence_penalty: (rc.presence_penalty as number) ?? body.presence_penalty,
        timeout_ms: (rc.timeout_ms as number) ?? body.timeout_ms,
        retry_count: (rc.retry_count as number) ?? body.retry_count,
        streaming_enabled: (rc.streaming_enabled as boolean) ?? body.streaming_enabled,
      };
    }

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Tên provider là bắt buộc" }, { status: 400 });
    }
    if (!body.slug?.trim()) {
      return NextResponse.json({ error: "Slug là bắt buộc" }, { status: 400 });
    }
    if (!body.base_url?.trim()) {
      return NextResponse.json({ error: "Base URL là bắt buộc" }, { status: 400 });
    }

    // Check slug uniqueness (exclude deleted)
    try {
      const existing = await getAllProviders({ search: body.slug.trim().toLowerCase() });
      if (existing.some((p) => p.slug === body.slug.trim().toLowerCase())) {
        return NextResponse.json(
          { error: `Provider slug "${body.slug}" đã tồn tại` },
          { status: 409 }
        );
      }
    } catch (e) {
      // Migration may not have run — try to detect missing columns
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes("column") && (errMsg.includes("slug") || errMsg.includes("group_slug"))) {
        console.error("[AI Providers POST] Migration not run. Missing columns:", errMsg);
        return NextResponse.json(
          {
            error: "Database migration chưa chạy. Vui lòng chạy: npx tsx lib/content/migration-providers.ts",
            detail: errMsg,
          },
          { status: 500 }
        );
      }
      throw e;
    }

    const created = await createProvider(body);
    console.log("[AI Providers POST] created id:", created.id);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[AI Providers POST] ERROR:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("column") || msg.includes("slug") || msg.includes("group_slug") || msg.includes("relation")) {
      return NextResponse.json(
        {
          error: "Database schema chưa đầy đủ. Vui lòng chạy: npx tsx lib/content/migration-providers.ts",
          detail: msg,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi tạo provider" },
      { status: 500 }
    );
  }
}
