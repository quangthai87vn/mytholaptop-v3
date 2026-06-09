/**
 * AI Unified Settings API
 * GET  /api/ai/settings/all - Load toàn bộ config (masked api_key)
 * PUT  /api/ai/settings/all - Save toàn bộ config
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";
import { query } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/content/db/encryption";
import { getAllRoutingRules } from "@/lib/content/db/task-routes";
import type {
  ProviderCard,
  TaskRoute,
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
  RoutingRule,
  BrandPreset,
} from "@/types/ai-operating";
import type { PromptRulesConfig } from "@/lib/content/db/prompt-rules";

// ── Masked API Key ────────────────────────────────────────────────────────────

export function maskApiKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return "sk-****";
  return `sk-****${key.slice(-8)}`;
}

// ── GET: Load toàn bộ config ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  // Helper: safe query with error logging
  const safeQuery = async <T,>(sql: string, fallback: T[] = []): Promise<{ rows: T[] }> => {
    try { return await query<T>(sql); }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Log first 100 chars of SQL to identify which query failed
      console.error("[AI Settings safeQuery] Error:", msg, "| SQL:", sql.substring(0, 100));
      return { rows: fallback };
    }
  };

  try {
    const [providersResult, brandVoicesResult, promptRulesResult, safetyRulesResult, systemPromptsResult, mediaSettingsResult, runtimeConfigsResult] =
      await Promise.all([
        safeQuery<{
          id: number; provider: string; name: string; slug: string; group_slug: string;
          display_name: string; base_url: string | null; is_active: boolean; sort_order: number;
          api_key_encrypted: string | null; api_key_iv: string | null;
          status: string; is_system: boolean; is_default: boolean;
          connection_status: string; last_checked_at: string | null; last_error: string | null;
        }>(
          `SELECT id, provider, name, slug, group_slug, display_name, base_url, is_active, sort_order,
                  api_key_encrypted, api_key_iv,
                  status, is_system, is_default,
                  connection_status, last_checked_at, last_error
           FROM ai_providers
           WHERE is_deleted = false
           ORDER BY is_default DESC, sort_order ASC`
        ),
        safeQuery<BrandVoice>("SELECT * FROM ai_brand_voices ORDER BY id ASC"),
        safeQuery<{ id: number; scope: string; platform: string | null; rule_key: string; rule_text: string; priority: number; is_active: boolean; created_at: string }>(
          "SELECT * FROM ai_prompt_rules ORDER BY scope, priority DESC"
        ),
        safeQuery<SafetyRule>("SELECT * FROM ai_safety_rules ORDER BY severity DESC, id ASC"),
        safeQuery<SystemPromptTemplate>("SELECT * FROM ai_system_prompt_templates ORDER BY is_default DESC, id ASC"),
        safeQuery<{ id: number; media_type: string; provider: string; model_name: string | null; base_url: string | null; temperature: number; quality: string; size: string; is_active: boolean }>(
          "SELECT id, media_type, provider, model_name, base_url, temperature, quality, size, is_active FROM ai_media_settings ORDER BY media_type ASC"
        ),
        safeQuery<{ provider_id: number; selected_model: string; temperature: number; max_output_tokens: number; top_p: number; frequency_penalty: number; presence_penalty: number; timeout_ms: number; retry_count: number; streaming_enabled: boolean }>(
          "SELECT * FROM ai_provider_runtime_configs"
        ),
      ]);

    // Build providers with masked API key + runtime config
    const runtimeConfigMap = new Map(
      runtimeConfigsResult.rows.map((r) => [r.provider_id, r])
    );
    const providers: ProviderCard[] = providersResult.rows.map((p) => {
      let maskedKey = "";
      if (p.api_key_encrypted && p.api_key_iv) {
        try {
          const decrypted = decrypt(p.api_key_encrypted, p.api_key_iv);
          maskedKey = maskApiKey(decrypted);
        } catch {
          maskedKey = "sk-****(lỗi giải mã)";
        }
      }
      const rc = runtimeConfigMap.get(p.id);
      return {
        id: p.id,
        type: (p.slug || p.provider) as ProviderCard["type"],
        // name = display_name for human-readable UI display
        name: p.display_name || p.name || p.provider || "Unknown",
        slug: p.slug || p.provider,
        group_slug: p.group_slug,
        // display_name = display_name — the human-readable label user edits
        display_name: p.display_name || p.name || "",
        base_url: p.base_url,
        is_active: p.status === "active" || p.is_active,
        sort_order: p.sort_order,
        status: p.status as ProviderCard["status"],
        is_system: p.is_system,
        is_default: p.is_default,
        connection_status: p.connection_status as ProviderCard["connection_status"],
        last_checked_at: p.last_checked_at,
        last_error: p.last_error,
        request_count: 0,
        // From runtime config (ai_provider_runtime_configs)
        model_name: rc?.selected_model ?? undefined,
        temperature: rc?.temperature ?? undefined,
        streaming_enabled: rc?.streaming_enabled ?? undefined,
        timeout_ms: rc?.timeout_ms ?? undefined,
        retry_count: rc?.retry_count ?? undefined,
        // From runtime config
        max_output_tokens: rc?.max_output_tokens,
        top_p: rc?.top_p,
        frequency_penalty: rc?.frequency_penalty,
        presence_penalty: rc?.presence_penalty,
        api_key_masked: maskedKey,
      } as ProviderCard;
    });

    // Build prompt rules config
    const promptRules: PromptRulesConfig = {
      global_rules: promptRulesResult.rows.filter((r) => r.scope === "global"),
      platform_rules: promptRulesResult.rows
        .filter((r) => r.scope === "platform")
        .reduce<Record<string, typeof promptRulesResult.rows>>((acc, r) => {
          if (!acc[r.platform!]) acc[r.platform!] = [];
          acc[r.platform!].push(r);
          return acc;
        }, {}),
    };

    // ── Map raw TaskRoute → RoutingRule format ────────────────────────────────
    // The DB stores routing rules using old column names (provider_type, model_name).
    // The frontend resolver expects RoutingRule format (primary_provider_id, primary_model_override).
    // Normalize here so both sides use the same format.

    // ── Load routing rules using getAllRoutingRules() — handles new FK schema + legacy fallback
    let routingRules: RoutingRule[] = [];
    try {
      routingRules = await getAllRoutingRules();
      // Attach legacy fields for backward compat (needed by generation-resolver.ts via (rule as any).provider_type)
      const legacyResult = await safeQuery<TaskRoute & Record<string, unknown>>(
        "SELECT * FROM ai_task_routes ORDER BY priority ASC"
      );
      const legacyMap = new Map(legacyResult.rows.map((r) => [r.id, r]));
      routingRules = routingRules.map((r) => {
        const legacy = legacyMap.get(r.id);
        if (!legacy) return r;
        return {
          ...r,
          provider_type: legacy.provider_type as string | null,
          model_name: legacy.model_name as string | null,
          fallback_provider_type: legacy.fallback_provider_type as string | null,
          fallback_model_name: legacy.fallback_model_name as string | null,
          temperature: legacy.temperature as number | null,
          max_tokens: legacy.max_tokens as number | null,
        } as any;
      });
    } catch (e) {
      console.error("[AI Settings] getAllRoutingRules failed:", e instanceof Error ? e.message : String(e));
    }

    // ── Build active brand preset from active voice ─────────────────────────────
    const activeBrandVoice = brandVoicesResult.rows.find((v) => (v as any).is_active);
    const activeBrandPreset = activeBrandVoice
      ? ((activeBrandVoice as any).preset as BrandPreset | null)
      : null;

    // ── Build safety rules with is_active normalization ────────────────────────
    const safetyRules = safetyRulesResult.rows.map((r) => ({
      ...r,
      is_active: (r as any).is_active !== false,
    }));

    return NextResponse.json({
      data: {
        providers,
        taskRoutes: routingRules,
        brandVoices: brandVoicesResult.rows,
        promptRules,
        safetyRules,
        systemPrompts: systemPromptsResult.rows,
        mediaSettings: mediaSettingsResult.rows,
        activeBrandPreset,
      },
    });
  } catch (err) {
    console.error("[AI Settings All GET]", err);
    return NextResponse.json({ error: "Lỗi khi load cấu hình AI" }, { status: 500 });
  }
}

// ── PUT: Save toàn bộ config ─────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const body = await req.json();

    // Validate top-level structure
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body không hợp lệ" }, { status: 400 });
    }

    const results: string[] = [];

    // ── 1. Save Provider Configs ────────────────────────────────────────────
    // Using new schema: status, is_default, slug, group_slug
    if (body.providers && Array.isArray(body.providers)) {
      for (const p of body.providers) {
        const { id, type, slug, name, group_slug, display_name, base_url, status, is_default, api_key, model_name, temperature, streaming_enabled, timeout_ms, retry_count } = p;
        let apiKeyEncrypted: string | null = null;
        let apiKeyIv: string | null = null;
        if (api_key && typeof api_key === "string" && api_key.length > 0) {
          const enc = encrypt(api_key);
          apiKeyEncrypted = enc.encrypted;
          apiKeyIv = enc.iv;
        }

        // Update provider base
        await query(
          `UPDATE ai_providers SET
             name = COALESCE($1, name),
             slug = COALESCE($2, slug),
             group_slug = COALESCE($3, group_slug),
             display_name = COALESCE($4, display_name),
             base_url = COALESCE($5, base_url),
             status = COALESCE($6, status),
             is_default = COALESCE($7, is_default),
             model_name = COALESCE($8, model_name),
             temperature = COALESCE($9, temperature),
             streaming_enabled = COALESCE($10, streaming_enabled),
             timeout_ms = COALESCE($11, timeout_ms),
             retry_count = COALESCE($12, retry_count),
             api_key_encrypted = COALESCE($13, api_key_encrypted),
             api_key_iv = COALESCE($14, api_key_iv),
             updated_at = NOW()
           WHERE id = $15`,
          [name, slug, group_slug, display_name, base_url, status, is_default ?? false,
           model_name ?? null, temperature ?? null, streaming_enabled ?? false,
           timeout_ms ?? null, retry_count ?? null,
           apiKeyEncrypted, apiKeyIv, id]
        );

        // Save runtime config
        if (model_name || temperature !== undefined || timeout_ms || retry_count) {
          await query(
            `INSERT INTO ai_provider_runtime_configs
               (provider_id, selected_model, temperature, timeout_ms, retry_count, streaming_enabled)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (provider_id) DO UPDATE SET
               selected_model = COALESCE(EXCLUDED.selected_model, ai_provider_runtime_configs.selected_model),
               temperature = COALESCE(EXCLUDED.temperature, ai_provider_runtime_configs.temperature),
               timeout_ms = COALESCE(EXCLUDED.timeout_ms, ai_provider_runtime_configs.timeout_ms),
               retry_count = COALESCE(EXCLUDED.retry_count, ai_provider_runtime_configs.retry_count),
               streaming_enabled = COALESCE(EXCLUDED.streaming_enabled, ai_provider_runtime_configs.streaming_enabled),
               updated_at = NOW()`,
            [id, model_name ?? "gpt-4o-mini", temperature ?? 0.7,
             timeout_ms ?? 60000, retry_count ?? 3, streaming_enabled ?? false]
          );
        }

        results.push(`provider:${type || slug || id}`);
      }
    }

    // ── 2. Save Task Routes ─────────────────────────────────────────────────
    if (body.taskRoutes && Array.isArray(body.taskRoutes)) {
      for (const route of body.taskRoutes) {
        const { task_type, task_label, provider_type, model_name,
          fallback_provider_type, fallback_model_name,
          temperature, max_tokens, priority,
          system_prompt_id, brand_preset, is_active } = route;

        await query(
          `INSERT INTO ai_task_routes
             (task_type, task_label, provider_type, model_name,
              fallback_provider_type, fallback_model_name,
              temperature, max_tokens, priority,
              system_prompt_id, brand_preset, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (task_type) DO UPDATE SET
             provider_type = EXCLUDED.provider_type,
             model_name = EXCLUDED.model_name,
             fallback_provider_type = EXCLUDED.fallback_provider_type,
             fallback_model_name = EXCLUDED.fallback_model_name,
             temperature = EXCLUDED.temperature,
             max_tokens = EXCLUDED.max_tokens,
             priority = EXCLUDED.priority,
             system_prompt_id = EXCLUDED.system_prompt_id,
             brand_preset = EXCLUDED.brand_preset,
             is_active = EXCLUDED.is_active,
             updated_at = NOW()`,
          [
            task_type,
            task_label || task_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            provider_type, model_name,
            fallback_provider_type || null, fallback_model_name || null,
            temperature ?? 0.7, max_tokens ?? 2048, priority ?? 10,
            system_prompt_id || null, brand_preset || null,
            is_active ?? true,
          ]
        );
        results.push(`route:${task_type}`);
      }
    }

    // ── 3. Save Brand Voices ────────────────────────────────────────────────
    if (body.brandVoices && Array.isArray(body.brandVoices)) {
      for (const v of body.brandVoices) {
        const {
          preset, name, description, target_audience, tone_instruction,
          keywords_to_use, keywords_to_avoid,
          tone_professional_casual, tone_luxury_affordable, tone_technical_simple,
          content_template, emoji_usage, cta_style, example_output, is_active,
        } = v;
        await query(
          `INSERT INTO ai_brand_voices
             (preset, name, description, target_audience, tone_instruction,
              keywords_to_use, keywords_to_avoid,
              tone_professional_casual, tone_luxury_affordable, tone_technical_simple,
              content_template, emoji_usage, cta_style, example_output, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (preset) DO UPDATE SET
             name = EXCLUDED.name, description = EXCLUDED.description,
             target_audience = EXCLUDED.target_audience, tone_instruction = EXCLUDED.tone_instruction,
             keywords_to_use = EXCLUDED.keywords_to_use, keywords_to_avoid = EXCLUDED.keywords_to_avoid,
             tone_professional_casual = EXCLUDED.tone_professional_casual,
             tone_luxury_affordable = EXCLUDED.tone_luxury_affordable,
             tone_technical_simple = EXCLUDED.tone_technical_simple,
             content_template = EXCLUDED.content_template,
             emoji_usage = EXCLUDED.emoji_usage, cta_style = EXCLUDED.cta_style,
             example_output = EXCLUDED.example_output, is_active = EXCLUDED.is_active,
             updated_at = NOW()`,
          [
            preset, name, description || "", target_audience || "", tone_instruction || "",
            keywords_to_use || [], keywords_to_avoid || [],
            tone_professional_casual ?? 0, tone_luxury_affordable ?? 0, tone_technical_simple ?? 0,
            content_template || "", emoji_usage || "moderate", cta_style || "direct",
            example_output || "", is_active ?? true,
          ]
        );
        results.push(`brand:${preset}`);
      }
    }

    // ── 4. Save Prompt Rules ───────────────────────────────────────────────
    if (body.promptRules) {
      const { global_rules, platform_rules } = body.promptRules;
      if (global_rules && Array.isArray(global_rules)) {
        for (const r of global_rules) {
          await query(
            `INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
               VALUES ('global', NULL, $1, $2, $3, $4)
             ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
               rule_text = EXCLUDED.rule_text, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active`,
            [r.rule_key, r.rule_text, r.priority ?? 0, r.is_active ?? true]
          );
        }
      }
      if (platform_rules && typeof platform_rules === "object") {
        for (const [platform, rules] of Object.entries(platform_rules)) {
          for (const r of rules as Array<{ rule_key: string; rule_text: string; priority?: number; is_active?: boolean }>) {
            await query(
              `INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
                 VALUES ('platform', $1, $2, $3, $4, $5)
               ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
                 rule_text = EXCLUDED.rule_text, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active`,
              [platform, r.rule_key, r.rule_text, r.priority ?? 0, r.is_active ?? true]
            );
          }
        }
      }
      results.push("promptRules");
    }

    // ── 5. Save Safety Rules ───────────────────────────────────────────────
    if (body.safetyRules && Array.isArray(body.safetyRules)) {
      for (const r of body.safetyRules) {
        await query(
          `INSERT INTO ai_safety_rules (rule_key, rule_text, severity, is_active)
             VALUES ($1, $2, $3, $4)
           ON CONFLICT (rule_key) DO UPDATE SET
             rule_text = EXCLUDED.rule_text, severity = EXCLUDED.severity, is_active = EXCLUDED.is_active`,
          [r.rule_key, r.rule_text, r.severity ?? "medium", r.is_active ?? true]
        );
      }
      results.push("safetyRules");
    }

    // ── 6. Save System Prompts ─────────────────────────────────────────────
    if (body.systemPrompts && Array.isArray(body.systemPrompts)) {
      for (const sp of body.systemPrompts) {
        if (sp.id && sp.id > 0) {
          await query(
            `UPDATE ai_system_prompt_templates
               SET name = $1, description = $2, prompt_text = $3, is_active = $4, is_default = $5
               WHERE id = $6`,
            [sp.name, sp.description || "", sp.prompt_text, sp.is_active ?? true, sp.is_default ?? false, sp.id]
          );
        } else {
          await query(
            `INSERT INTO ai_system_prompt_templates (name, description, prompt_text, is_active, is_default)
               VALUES ($1, $2, $3, $4, $5)`,
            [sp.name, sp.description || "", sp.prompt_text, sp.is_active ?? true, sp.is_default ?? false]
          );
        }
      }
      results.push("systemPrompts");
    }

    // ── 7. Save Media Settings ─────────────────────────────────────────────
    try {
      // Auto-create table if not exists
      await query(`
        CREATE TABLE IF NOT EXISTS ai_media_settings (
          id SERIAL PRIMARY KEY,
          media_type VARCHAR(20) UNIQUE NOT NULL,
          provider VARCHAR(50) NOT NULL,
          model_name VARCHAR(100),
          base_url VARCHAR(255),
          api_key_encrypted TEXT,
          api_key_iv VARCHAR(64),
          temperature NUMERIC(3,2) DEFAULT 0.9,
          quality VARCHAR(20) DEFAULT 'standard',
          size VARCHAR(20) DEFAULT '1024x1024',
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      if (body.mediaSettings && Array.isArray(body.mediaSettings)) {
        for (const m of body.mediaSettings) {
          const { media_type, provider, model_name, base_url, temperature, quality, size, is_active } = m;
          let apiKeyEncrypted: string | null = null;
          let apiKeyIv: string | null = null;
          if (m.api_key && typeof m.api_key === "string" && m.api_key.length > 0) {
            const enc = encrypt(m.api_key);
            apiKeyEncrypted = enc.encrypted;
            apiKeyIv = enc.iv;
          }
          await query(
            `INSERT INTO ai_media_settings
               (media_type, provider, model_name, base_url, api_key_encrypted, api_key_iv,
                temperature, quality, size, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (media_type) DO UPDATE SET
               provider = EXCLUDED.provider, model_name = EXCLUDED.model_name,
               base_url = EXCLUDED.base_url,
               api_key_encrypted = COALESCE($5, ai_media_settings.api_key_encrypted),
               api_key_iv = COALESCE($6, ai_media_settings.api_key_iv),
               temperature = EXCLUDED.temperature, quality = EXCLUDED.quality,
               size = EXCLUDED.size, is_active = EXCLUDED.is_active,
               updated_at = NOW()`,
            [media_type, provider, model_name || null, base_url || null,
             apiKeyEncrypted, apiKeyIv,
             temperature ?? 0.9, quality ?? "standard", size ?? "1024x1024", is_active ?? false]
          );
        }
        results.push("mediaSettings");
      }
    } catch (mediaErr) {
      console.warn("[AI Settings] ai_media_settings skipped:", mediaErr);
    }

    return NextResponse.json({
      success: true,
      saved: results,
      message: `Đã lưu thành công: ${results.join(", ") || "không có gì thay đổi"}`,
    });
  } catch (err) {
    console.error("[AI Settings All PUT]", err);
    return NextResponse.json({ error: "Lỗi khi lưu cấu hình AI" }, { status: 500 });
  }
}
