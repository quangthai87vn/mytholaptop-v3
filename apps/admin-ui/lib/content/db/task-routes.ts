/**
 * AI Task Routes CRUD
 *
 * Provides two layers:
 * 1. Legacy (TaskRoute / TaskRouteInput) — backward compat with old DB schema
 * 2. New (RoutingRule / RoutingRuleInput) — uses provider FK and override fields
 *
 * The DB uses OLD column names (provider_type, model_name, temperature) for
 * backward compat, but the new code prefers the new columns (primary_provider_id,
 * primary_model_override, *_override) when present.
 */

import { query } from "@/lib/db";
import { getCacheOrFetch, invalidateAICache } from "./cache";
import type {
  TaskRoute,
  TaskRouteInput,
  RoutingRule,
  RoutingRuleInput,
} from "@/types/ai-operating";
import type { AIProvider } from "@/lib/content/types";

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY FUNCTIONS (backward compat)
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAllTaskRoutes(): Promise<TaskRoute[]> {
  return getCacheOrFetch("ai:routing-rules", async () => {
    const { rows } = await query<TaskRoute>(
      "SELECT * FROM ai_task_routes ORDER BY priority ASC"
    );
    return rows;
  });
}

export async function getTaskRouteByType(
  taskType: string
): Promise<TaskRoute | null> {
  const { rows } = await query<TaskRoute>(
    "SELECT * FROM ai_task_routes WHERE task_type = $1",
    [taskType]
  );
  return rows[0] || null;
}

export async function upsertTaskRoute(
  data: TaskRouteInput
): Promise<TaskRoute> {
  const { rows } = await query<TaskRoute>(
    `INSERT INTO ai_task_routes
       (task_type, task_label, provider_type, model_name,
        fallback_provider_type, fallback_model_name,
        temperature, max_tokens, priority,
        system_prompt_id, brand_preset,
        is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (task_type) DO UPDATE SET
       provider_type         = EXCLUDED.provider_type,
       model_name           = EXCLUDED.model_name,
       fallback_provider_type = EXCLUDED.fallback_provider_type,
       fallback_model_name  = EXCLUDED.fallback_model_name,
       temperature          = EXCLUDED.temperature,
       max_tokens           = EXCLUDED.max_tokens,
       priority             = EXCLUDED.priority,
       system_prompt_id     = EXCLUDED.system_prompt_id,
       brand_preset         = EXCLUDED.brand_preset,
       is_active            = EXCLUDED.is_active,
       updated_at           = NOW()
     RETURNING *`,
    [
      data.task_type,
      data.task_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      data.provider_type,
      data.model_name,
      data.fallback_provider_type ?? null,
      data.fallback_model_name ?? null,
      data.temperature ?? 0.7,
      data.max_tokens ?? 2048,
      data.priority ?? 10,
      data.system_prompt_id ?? null,
      data.brand_preset ?? null,
      data.is_active ?? true,
    ]
  );
  invalidateAICache();
  return rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW ROUTING RULE FUNCTIONS (provider FK + override fields)
// ═══════════════════════════════════════════════════════════════════════════════

export async function deleteTaskRoute(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_task_routes WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteRoutingRule(taskType: string): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_task_routes WHERE task_type = $1",
    [taskType]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Detect whether the new routing columns exist in the DB.
 * Cached after first check.
 */
let _schemaChecked = false;
let _hasNewColumns = false;

async function checkNewSchema(): Promise<boolean> {
  if (_schemaChecked) return _hasNewColumns;
  try {
    await query(
      "SELECT primary_provider_id FROM ai_task_routes LIMIT 1"
    );
    _hasNewColumns = true;
  } catch {
    _hasNewColumns = false;
  }
  _schemaChecked = true;
  return _hasNewColumns;
}

/** Map raw DB row to RoutingRule */
function mapRowToRoutingRule(row: Record<string, unknown>): RoutingRule {
  return {
    id: row.id as number,
    task_type: (row.task_type ?? "") as RoutingRule["task_type"],
    task_label: (row.task_label as string) || "",
    primary_provider_id: row.primary_provider_id as number | null,
    primary_model_override: (row.primary_model_override as string) || null,
    fallback_provider_id: row.fallback_provider_id as number | null,
    fallback_model_override: (row.fallback_model_override as string) || null,
    temperature_override: row.temperature_override as number | null,
    max_tokens_override: row.max_tokens_override as number | null,
    top_p_override: row.top_p_override as number | null,
    priority: (row.priority as number) ?? 10,
    system_prompt_id: row.system_prompt_id as number | null,
    brand_preset: (row.brand_preset as RoutingRule["brand_preset"]) ?? null,
    is_active: row.is_active !== false,
    created_at: (row.created_at as string) || "",
    updated_at: (row.updated_at as string) || "",
  };
}

/**
 * Get all routing rules with full provider info attached.
 * Prefers new columns (primary_provider_id) when available,
 * falls back to old columns (provider_type slug) for backward compat.
 */
export async function getAllRoutingRules(): Promise<RoutingRule[]> {
  return getCacheOrFetch("ai:routing-rules", async () => {
    const hasNew = await checkNewSchema();

    if (!hasNew) {
      const rows = await getAllTaskRoutes();
      return rows.map((r) => ({
        id: r.id,
        task_type: r.task_type,
        task_label: r.task_label,
        primary_provider_id: null,
        primary_model_override: r.model_name || null,
        fallback_provider_id: null,
        fallback_model_override: r.fallback_model_name || null,
        temperature_override: r.temperature !== 0.7 ? r.temperature : null,
        max_tokens_override: r.max_tokens !== 2048 ? r.max_tokens : null,
        top_p_override: null,
        priority: r.priority,
        system_prompt_id: r.system_prompt_id ?? null,
        brand_preset: r.brand_preset ?? null,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    }

    const { rows } = await query<Record<string, unknown>>(
      "SELECT * FROM ai_task_routes ORDER BY priority ASC"
    );
    return rows.map(mapRowToRoutingRule);
  });
}

/**
 * Get a single routing rule by task_type.
 */
export async function getRoutingRuleByType(
  taskType: string
): Promise<RoutingRule | null> {
  const hasNew = await checkNewSchema();

  if (!hasNew) {
    const r = await getTaskRouteByType(taskType);
    if (!r) return null;
    return {
      id: r.id,
      task_type: r.task_type,
      task_label: r.task_label,
      primary_provider_id: null,
      primary_model_override: r.model_name || null,
      fallback_provider_id: null,
      fallback_model_override: r.fallback_model_name || null,
      temperature_override: r.temperature !== 0.7 ? r.temperature : null,
      max_tokens_override: r.max_tokens !== 2048 ? r.max_tokens : null,
      top_p_override: null,
      priority: r.priority,
      system_prompt_id: r.system_prompt_id ?? null,
      brand_preset: r.brand_preset ?? null,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  const { rows } = await query<Record<string, unknown>>(
    "SELECT * FROM ai_task_routes WHERE task_type = $1",
    [taskType]
  );
  if (!rows[0]) return null;
  return mapRowToRoutingRule(rows[0]);
}

/**
 * Upsert a routing rule using the new provider FK schema.
 * Writes to BOTH old and new columns for seamless migration.
 *
 * Resolution priority at write time:
 * - If primary_provider_id is set, also populate provider_type from the provider slug
 * - If primary_model_override is set, also populate model_name
 * - All override fields are written to both old and new column names
 */
export async function upsertRoutingRule(
  data: RoutingRuleInput
): Promise<RoutingRule> {
  const hasNew = await checkNewSchema();

  // Resolve provider slugs for the old columns
  let providerType = "";
  let fallbackProviderType = "";

  if (data.primary_provider_id) {
    const { rows } = await query<{ slug: string }>(
      "SELECT slug FROM ai_providers WHERE id = $1",
      [data.primary_provider_id]
    );
    providerType = rows[0]?.slug ?? "";
  }

  if (data.fallback_provider_id) {
    const { rows } = await query<{ slug: string }>(
      "SELECT slug FROM ai_providers WHERE id = $1",
      [data.fallback_provider_id]
    );
    fallbackProviderType = rows[0]?.slug ?? "";
  }

  const taskLabel =
    data.task_label ??
    data.task_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (!hasNew) {
    // Write using old schema
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO ai_task_routes
         (task_type, task_label, provider_type, model_name,
          fallback_provider_type, fallback_model_name,
          temperature, max_tokens, priority,
          system_prompt_id, brand_preset, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (task_type) DO UPDATE SET
         provider_type          = EXCLUDED.provider_type,
         model_name            = EXCLUDED.model_name,
         fallback_provider_type = EXCLUDED.fallback_provider_type,
         fallback_model_name   = EXCLUDED.fallback_model_name,
         temperature           = EXCLUDED.temperature,
         max_tokens            = EXCLUDED.max_tokens,
         priority              = EXCLUDED.priority,
         system_prompt_id      = EXCLUDED.system_prompt_id,
         brand_preset          = EXCLUDED.brand_preset,
         is_active             = EXCLUDED.is_active,
         updated_at            = NOW()
       RETURNING *`,
      [
        data.task_type,
        taskLabel,
        providerType,
        data.primary_model_override ?? "",
        fallbackProviderType || null,
        data.fallback_model_override ?? null,
        data.temperature_override ?? 0.7,
        data.max_tokens_override ?? 2048,
        data.priority ?? 10,
        data.system_prompt_id ?? null,
        data.brand_preset ?? null,
        data.is_active ?? true,
      ]
    );
    return mapRowToRoutingRule(rows[0]);
  }

  // Write using new schema (both old + new columns)
  const { rows } = await query<Record<string, unknown>>(
    `INSERT INTO ai_task_routes
       (task_type, task_label,
        primary_provider_id, primary_model_override,
        fallback_provider_id, fallback_model_override,
        temperature_override, max_tokens_override, top_p_override,
        priority, system_prompt_id, brand_preset, is_active,
        -- Also write to old columns for backward compat
        provider_type, model_name,
        fallback_provider_type, fallback_model_name,
        temperature, max_tokens)
     VALUES (
       $1, $2,
       $3, $4,
       $5, $6,
       $7, $8, $9,
       $10, $11, $12, $13,
       $14, $15,
       $16, $17,
       $18, $19
     )
     ON CONFLICT (task_type) DO UPDATE SET
       task_label               = EXCLUDED.task_label,
       primary_provider_id      = EXCLUDED.primary_provider_id,
       primary_model_override   = EXCLUDED.primary_model_override,
       fallback_provider_id     = EXCLUDED.fallback_provider_id,
       fallback_model_override  = EXCLUDED.fallback_model_override,
       temperature_override     = EXCLUDED.temperature_override,
       max_tokens_override     = EXCLUDED.max_tokens_override,
       top_p_override           = EXCLUDED.top_p_override,
       priority                 = EXCLUDED.priority,
       system_prompt_id         = EXCLUDED.system_prompt_id,
       brand_preset             = EXCLUDED.brand_preset,
       is_active                = EXCLUDED.is_active,
       -- Also sync old columns
       provider_type            = EXCLUDED.provider_type,
       model_name               = EXCLUDED.model_name,
       fallback_provider_type   = EXCLUDED.fallback_provider_type,
       fallback_model_name      = EXCLUDED.fallback_model_name,
       temperature              = EXCLUDED.temperature,
       max_tokens               = EXCLUDED.max_tokens,
       updated_at               = NOW()
     RETURNING *`,
    [
      data.task_type,
      taskLabel,
      data.primary_provider_id ?? null,
      data.primary_model_override ?? "",
      data.fallback_provider_id ?? null,
      data.fallback_model_override ?? null,
      data.temperature_override ?? null,
      data.max_tokens_override ?? null,
      data.top_p_override ?? null,
      data.priority ?? 10,
      data.system_prompt_id ?? null,
      data.brand_preset ?? null,
      data.is_active ?? true,
      // Old columns (for compat)
        providerType,
        data.primary_model_override ?? "",
        fallbackProviderType || null,
        data.fallback_model_override ?? null,
        data.temperature_override ?? 0.7,
        data.max_tokens_override ?? 2048,
    ]
  );
  return mapRowToRoutingRule(rows[0]);
}

/**
 * Toggle active status for a routing rule.
 */
export async function toggleRoutingRuleActive(
  taskType: string,
  isActive: boolean
): Promise<RoutingRule | null> {
  const hasNew = await checkNewSchema();

  if (!hasNew) {
    await query(
      `UPDATE ai_task_routes SET is_active = $1, updated_at = NOW() WHERE task_type = $2`,
      [isActive, taskType]
    );
    invalidateAICache();
    return getRoutingRuleByType(taskType);
  }

  const { rows } = await query<Record<string, unknown>>(
    `UPDATE ai_task_routes SET is_active = $1, updated_at = NOW() WHERE task_type = $2 RETURNING *`,
    [isActive, taskType]
  );
  invalidateAICache();
  if (!rows[0]) return null;
  return mapRowToRoutingRule(rows[0]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: Provider reference management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Disable all task routes that reference a deleted provider.
 * Updates both old and new columns.
 */
export async function disableRoutingRulesForProvider(
  providerId: number
): Promise<{ disabled: number }> {
  const hasNew = await checkNewSchema();

  if (!hasNew) {
    const { rows: slugRows } = await query<{ slug: string }>(
      "SELECT slug FROM ai_providers WHERE id = $1",
      [providerId]
    );
    if (!slugRows[0]?.slug) return { disabled: 0 };
    const { rowCount } = await query(
      `UPDATE ai_task_routes SET is_active = false, updated_at = NOW()
       WHERE provider_type = $1 OR fallback_provider_type = $1`,
      [slugRows[0].slug]
    );
    return { disabled: rowCount ?? 0 };
  }

  const { rowCount } = await query(
    `UPDATE ai_task_routes SET is_active = false, updated_at = NOW()
     WHERE primary_provider_id = $1 OR fallback_provider_id = $1`,
    [providerId]
  );
  return { disabled: rowCount ?? 0 };
}

/**
 * Check if a routing rule's primary provider still exists.
 * Returns provider info if found, null if missing.
 */
export async function getRoutingRuleProvider(
  routingRule: RoutingRule
): Promise<AIProvider | null> {
  if (routingRule.primary_provider_id) {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT p.*, rc.selected_model, rc.temperature, rc.max_output_tokens,
              rc.top_p, rc.streaming_enabled, rc.timeout_ms, rc.retry_count
       FROM ai_providers p
       LEFT JOIN ai_provider_runtime_configs rc ON p.id = rc.provider_id
       WHERE p.id = $1 AND p.is_deleted = false`,
      [routingRule.primary_provider_id]
    );
    if (rows[0]) {
      const r = rows[0];
      return {
        id: r.id as number,
        name: (r.name as string) || (r.display_name as string) || "",
        display_name: (r.display_name as string) || (r.name as string) || "",
        slug: (r.slug as string) || "",
        provider: (r.provider as string) || (r.slug as string) || "",
        group_slug: (r.group_slug as AIProvider["group_slug"]) || "cloud_api",
        type: (r.type as string) || "",
        base_url: (r.base_url as string) || "",
        status: (r.status as AIProvider["status"]) || "inactive",
        is_active: r.is_active !== undefined ? Boolean(r.is_active) : false,
        is_system: Boolean(r.is_system),
        is_default: Boolean(r.is_default),
        is_deleted: Boolean(r.is_deleted),
        connection_status: (r.connection_status as AIProvider["connection_status"]) || "unknown",
        api_key_encrypted: null,
        api_key_iv: null,
        custom_headers: {},
        model_name: (r.selected_model as string) || "",
        temperature: (r.temperature as number) ?? 0.7,
        max_output_tokens: (r.max_output_tokens as number) ?? 2048,
        top_p: (r.top_p as number) ?? 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        timeout_ms: (r.timeout_ms as number) ?? 60000,
        retry_count: (r.retry_count as number) ?? 3,
        streaming_enabled: Boolean(r.streaming_enabled),
        sort_order: 0,
        created_at: (r.created_at as string) || "",
        updated_at: (r.updated_at as string) || "",
        last_checked_at: null,
        last_error: null,
      } as AIProvider;
    }
  }
  return null;
}

// ── Backward compat aliases ─────────────────────────────────────────────────────

/**
 * Update all routing rules that reference old_provider_id to point to new_provider_id.
 * Used when replacing a deleted provider.
 * @deprecated Use the new FK-based approach where possible.
 */
export async function updateTaskRoutesForProvider(
  oldProviderId: number,
  newProviderId: number
): Promise<void> {
  await query(
    `UPDATE ai_task_routes
     SET primary_provider_id = $2, updated_at = NOW()
     WHERE primary_provider_id = $1`,
    [oldProviderId, newProviderId]
  );
  await query(
    `UPDATE ai_task_routes
     SET fallback_provider_id = $2, updated_at = NOW()
     WHERE fallback_provider_id = $1`,
    [oldProviderId, newProviderId]
  );
}

/** @deprecated Use disableRoutingRulesForProvider instead */
export const disableTaskRoutesForProvider = disableRoutingRulesForProvider;
