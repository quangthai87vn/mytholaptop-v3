/**
 * AI Provider Management Service
 * Complete refactor:
 * - Soft delete (is_deleted, deleted_at)
 * - All queries filter is_deleted = false
 * - Supports filters: status, connection_status, search, group
 * - Separated activate/deactivate/set-default actions
 */

import { query } from "@/lib/db";
import { encrypt, decrypt } from "./encryption";
import type {
  AIProvider,
  AIProviderInput,
  AIProviderModel,
  AIRuntimeConfig,
  AIRuntimeConfigInput,
  ProviderGroup,
  ProviderGroupSlug,
  ConnectionStatus,
} from "../types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Base WHERE clause that excludes soft-deleted providers (no leading WHERE) */
const WHERE_NOT_DELETED = "p.is_deleted = false";

/** Detect which schema the ai_providers table has (old vs new) */
async function detectSchema(): Promise<"old" | "new"> {
  try {
    await query(`SELECT name, slug, group_slug, status FROM ai_providers LIMIT 1`);
    return "new";
  } catch {
    return "old";
  }
}

// Cache schema detection result
let cachedSchema: "old" | "new" | null = null;
async function getSchema(): Promise<"old" | "new"> {
  if (cachedSchema) return cachedSchema;
  cachedSchema = await detectSchema();
  return cachedSchema;
}

// Cache runtime_configs table existence
let cachedHasRuntimeConfigs: boolean | null = null;
async function hasRuntimeConfigsTable(): Promise<boolean> {
  if (cachedHasRuntimeConfigs !== null) return cachedHasRuntimeConfigs;
  try {
    await query(`SELECT 1 FROM ai_provider_runtime_configs LIMIT 1`);
    cachedHasRuntimeConfigs = true;
  } catch {
    cachedHasRuntimeConfigs = false;
  }
  return cachedHasRuntimeConfigs;
}

// Reset schema cache (useful for testing or re-migration)
export function resetSchemaCache() {
  cachedSchema = null;
  cachedHasRuntimeConfigs = null;
}

/**
 * Map a row from the database to AIProvider shape.
 * Handles both old schema (display_name → name) and new schema.
 */
function mapRowToProvider(row: Record<string, unknown>): AIProvider {
  const r = row;
  return {
    id: r.id as number,
    name: (r.name as string) || (r.display_name as string) || "",
    display_name: (r.display_name as string) || (r.name as string) || "",
    slug: (r.slug as string) || (r.provider as string) || "",
    provider: (r.provider as string) || (r.slug as string) || "",
    group_slug: (r.group_slug as ProviderGroupSlug) || "cloud_api",
    type: (r.type as string) || (r.provider as string) || "",
    base_url: (r.base_url as string) || "",
    status: (r.status as "active" | "inactive") || (r.is_active ? "active" : "inactive"),
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
    is_system: Boolean(r.is_system),
    is_default: Boolean(r.is_default),
    is_deleted: Boolean(r.is_deleted),
    deleted_at: r.deleted_at as string | null,
    connection_status: (r.connection_status as ConnectionStatus) || "unknown",
    api_key_encrypted: (r.api_key_encrypted as string) || null,
    api_key_iv: (r.api_key_iv as string) || null,
    custom_headers: (r.custom_headers as Record<string, string>) || {},
    model_name: (r.selected_model as string) || "",
    temperature: (r.temperature as number) ?? 0.7,
    max_output_tokens: (r.max_output_tokens as number) ?? 2048,
    top_p: (r.top_p as number) ?? 1,
    frequency_penalty: (r.frequency_penalty as number) ?? 0,
    presence_penalty: (r.presence_penalty as number) ?? 0,
    timeout_ms: (r.timeout_ms as number) ?? 60000,
    retry_count: (r.retry_count as number) ?? 3,
    streaming_enabled: Boolean(r.streaming_enabled),
    sort_order: (r.sort_order as number) ?? 0,
    created_at: (r.created_at as string) || "",
    updated_at: (r.updated_at as string) || "",
    last_checked_at: (r.last_checked_at as string) || null,
    last_error: (r.last_error as string) || null,
  } as AIProvider;
}

function parseCustomHeaders(r: AIProvider): AIProvider {
  let headers: Record<string, string> = {};
  if (r.custom_headers) {
    try {
      if (typeof r.custom_headers === "string") {
        headers = JSON.parse(r.custom_headers || "{}");
      } else {
        headers = r.custom_headers as Record<string, string>;
      }
    } catch {
      headers = {};
    }
  }
  return { ...r, custom_headers: headers };
}

function parseRows(rows: Record<string, unknown>[]): AIProvider[] {
  return rows.map((r) => parseCustomHeaders(mapRowToProvider(r)));
}

// ── Provider Groups ────────────────────────────────────────────────────────────

export async function getAllProviderGroups(): Promise<ProviderGroup[]> {
  const { rows } = await query<ProviderGroup>(
    "SELECT * FROM ai_provider_groups ORDER BY sort_order ASC"
  );
  return rows;
}

// ── Providers ────────────────────────────────────────────────────────────────

export interface GetProvidersOptions {
  status?: "active" | "inactive";
  connection_status?: ConnectionStatus;
  group_slug?: ProviderGroupSlug;
  search?: string;
  includeDeleted?: boolean;
}

export async function getAllProviders(
  options: GetProvidersOptions = {}
): Promise<AIProvider[]> {
  // Detect schema first so we build the right query
  const schema = await getSchema();

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (!options.includeDeleted) {
    conditions.push(`p.is_deleted = false`);
  }
  if (options.status) {
    conditions.push(`p.status = $${idx++}`);
    values.push(options.status);
  }
  if (options.connection_status) {
    conditions.push(`p.connection_status = $${idx++}`);
    values.push(options.connection_status);
  }
  if (options.group_slug) {
    conditions.push(`p.group_slug = $${idx++}`);
    values.push(options.group_slug);
  }
  if (options.search) {
    if (schema === "new") {
      conditions.push(`(p.name ILIKE $${idx} OR p.slug ILIKE $${idx})`);
    } else {
      conditions.push(`(p.display_name ILIKE $${idx} OR p.provider ILIKE $${idx})`);
    }
    values.push(`%${options.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Use explicit columns that work with both old and new schemas
  const baseSelect = schema === "new"
    ? `p.id, p.name, p.display_name, p.slug, p.provider, p.group_slug, p.type,
        p.base_url, p.status, p.is_active, p.is_system, p.is_default,
        p.is_deleted, p.deleted_at, p.connection_status,
        p.api_key_encrypted, p.api_key_iv, p.custom_headers, p.sort_order,
        p.created_at, p.updated_at`
    : `p.id, p.provider, p.display_name, p.base_url, p.is_active,
        p.sort_order, p.created_at, p.updated_at, p.is_deleted`;

  // Only JOIN runtime_configs if that table exists
  const hasRC = await hasRuntimeConfigsTable();
  const rcSelect = hasRC
    ? `rc.selected_model, rc.temperature, rc.max_output_tokens, rc.top_p,
       rc.frequency_penalty, rc.presence_penalty, rc.timeout_ms, rc.retry_count,
       rc.streaming_enabled`
    : `NULL as selected_model, NULL as temperature, NULL as max_output_tokens, NULL as top_p,
       NULL as frequency_penalty, NULL as presence_penalty, NULL as timeout_ms, NULL as retry_count,
       NULL as streaming_enabled`;
  const rcJoin = hasRC
    ? `LEFT JOIN ai_provider_runtime_configs rc ON p.id = rc.provider_id`
    : ``;

  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${baseSelect},
            ${rcSelect}
     FROM ai_providers p
     ${rcJoin}
     ${where}
     ORDER BY p.is_default DESC, p.sort_order ASC`,
    values
  );
  return parseRows(rows);
}

export async function getProviderById(
  id: number,
  includeDeleted = false
): Promise<AIProvider | null> {
  const schema = await getSchema();
  const baseSelect = schema === "new"
    ? `p.id, p.name, p.display_name, p.slug, p.provider, p.group_slug, p.type,
        p.base_url, p.status, p.is_active, p.is_system, p.is_default,
        p.is_deleted, p.deleted_at, p.connection_status,
        p.api_key_encrypted, p.api_key_iv, p.custom_headers, p.sort_order,
        p.created_at, p.updated_at`
    : `p.id, p.provider, p.display_name, p.base_url, p.is_active,
        p.sort_order, p.created_at, p.updated_at, p.is_deleted`;
  const where = includeDeleted ? "WHERE p.id = $1" : `WHERE ${WHERE_NOT_DELETED} AND p.id = $1`;
  const hasRC = await hasRuntimeConfigsTable();
  const rcSelect = hasRC
    ? `rc.selected_model, rc.temperature, rc.max_output_tokens, rc.top_p,
       rc.frequency_penalty, rc.presence_penalty, rc.timeout_ms, rc.retry_count,
       rc.streaming_enabled`
    : `NULL as selected_model, NULL as temperature, NULL as max_output_tokens, NULL as top_p,
       NULL as frequency_penalty, NULL as presence_penalty, NULL as timeout_ms, NULL as retry_count,
       NULL as streaming_enabled`;
  const rcJoin = hasRC
    ? `LEFT JOIN ai_provider_runtime_configs rc ON p.id = rc.provider_id`
    : ``;
  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${baseSelect},
            ${rcSelect}
     FROM ai_providers p
     ${rcJoin}
     ${where}`,
    [id]
  );
  if (!rows[0]) return null;
  return parseCustomHeaders(mapRowToProvider(rows[0]));
}

export async function getProviderBySlug(slug: string): Promise<AIProvider | null> {
  const schema = await getSchema();
  const baseSelect = schema === "new"
    ? `p.id, p.name, p.display_name, p.slug, p.provider, p.group_slug, p.type,
        p.base_url, p.status, p.is_active, p.is_system, p.is_default,
        p.is_deleted, p.deleted_at, p.connection_status,
        p.api_key_encrypted, p.api_key_iv, p.custom_headers, p.sort_order,
        p.created_at, p.updated_at`
    : `p.id, p.provider, p.display_name, p.base_url, p.is_active,
        p.sort_order, p.created_at, p.updated_at, p.is_deleted`;
  const hasRC = await hasRuntimeConfigsTable();
  const rcSelect = hasRC
    ? `rc.selected_model, rc.temperature, rc.max_output_tokens, rc.top_p,
       rc.frequency_penalty, rc.presence_penalty, rc.timeout_ms, rc.retry_count,
       rc.streaming_enabled`
    : `NULL as selected_model, NULL as temperature, NULL as max_output_tokens, NULL as top_p,
       NULL as frequency_penalty, NULL as presence_penalty, NULL as timeout_ms, NULL as retry_count,
       NULL as streaming_enabled`;
  const rcJoin = hasRC
    ? `LEFT JOIN ai_provider_runtime_configs rc ON p.id = rc.provider_id`
    : ``;
  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${baseSelect},
            ${rcSelect}
     FROM ai_providers p
     ${rcJoin}
     ${WHERE_NOT_DELETED} AND p.slug = $1`,
    [slug]
  );
  if (!rows[0]) return null;
  return parseCustomHeaders(mapRowToProvider(rows[0]));
}

export async function getDefaultProvider(): Promise<AIProvider | null> {
  const schema = await getSchema();
  const baseSelect = schema === "new"
    ? `p.id, p.name, p.display_name, p.slug, p.provider, p.group_slug, p.type,
        p.base_url, p.status, p.is_active, p.is_system, p.is_default,
        p.is_deleted, p.deleted_at, p.connection_status,
        p.api_key_encrypted, p.api_key_iv, p.custom_headers, p.sort_order,
        p.created_at, p.updated_at`
    : `p.id, p.provider, p.display_name, p.base_url, p.is_active,
        p.sort_order, p.created_at, p.updated_at, p.is_deleted`;
  const hasRC = await hasRuntimeConfigsTable();
  const rcSelect = hasRC
    ? `rc.selected_model, rc.temperature, rc.max_output_tokens, rc.top_p,
       rc.frequency_penalty, rc.presence_penalty, rc.timeout_ms, rc.retry_count,
       rc.streaming_enabled`
    : `NULL as selected_model, NULL as temperature, NULL as max_output_tokens, NULL as top_p,
       NULL as frequency_penalty, NULL as presence_penalty, NULL as timeout_ms, NULL as retry_count,
       NULL as streaming_enabled`;
  const rcJoin = hasRC
    ? `LEFT JOIN ai_provider_runtime_configs rc ON p.id = rc.provider_id`
    : ``;
  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${baseSelect},
            ${rcSelect}
     FROM ai_providers p
     ${rcJoin}
     ${WHERE_NOT_DELETED} AND p.is_default = true AND p.status = 'active'
     LIMIT 1`
  );
  if (!rows[0]) return null;
  return parseCustomHeaders(mapRowToProvider(rows[0]));
}

export async function getActiveProviders(): Promise<AIProvider[]> {
  return getAllProviders({ status: "active" });
}

export async function getProvidersByGroup(
  groupSlug: ProviderGroupSlug
): Promise<AIProvider[]> {
  return getAllProviders({ group_slug: groupSlug });
}

// ── Create ─────────────────────────────────────────────────────────────────────

export async function createProvider(
  input: AIProviderInput
): Promise<AIProvider> {
  let apiKeyEncrypted: string | null = null;
  let apiKeyIv: string | null = null;
  if (input.api_key?.trim()) {
    const enc = encrypt(input.api_key.trim());
    apiKeyEncrypted = enc.encrypted;
    apiKeyIv = enc.iv;
  }

  // Detect schema
  const schema = await getSchema();

  // Get max sort_order among non-deleted providers
  const { rows: maxRows } = await query<{ max_order: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 as max_order FROM ai_providers WHERE is_deleted = false"
  );
  const nextSortOrder = maxRows[0]?.max_order ?? 1;

  // If is_default, unset other defaults
  if (input.is_default) {
    const defaultCol = schema === "new" ? "is_default" : "is_default";
    await query(`UPDATE ai_providers SET is_default = false WHERE is_deleted = false AND is_default = true`);
  }

  let providerId: number;
  if (schema === "new") {
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO ai_providers
         (name, display_name, slug, provider, group_slug, type, base_url, api_key_encrypted, api_key_iv,
          status, is_system, is_default, sort_order, custom_headers)
       VALUES ($1, $1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        input.name.trim(),
        input.slug.trim().toLowerCase(),
        input.group_slug || "cloud_api",
        input.type || input.slug.trim().toLowerCase(),
        input.base_url.trim(),
        apiKeyEncrypted,
        apiKeyIv,
        input.status ?? "active",
        false,
        input.is_default ?? false,
        nextSortOrder,
        JSON.stringify(input.custom_headers ?? {}),
      ]
    );
    providerId = rows[0].id as number;
  } else {
    // Old schema: use display_name and is_active
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO ai_providers
         (provider, display_name, base_url, api_key_encrypted, api_key_iv, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.slug.trim().toLowerCase(),
        input.name.trim(),
        input.base_url.trim(),
        apiKeyEncrypted,
        apiKeyIv,
        true, // is_active defaults to true for old schema
        nextSortOrder,
      ]
    );
    providerId = rows[0].id as number;
  }

  // Create runtime config with ALL settings from input
  await query(
    `INSERT INTO ai_provider_runtime_configs
       (provider_id, selected_model, temperature, max_output_tokens, top_p,
        frequency_penalty, presence_penalty, timeout_ms, retry_count, streaming_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      providerId,
      input.model_name || "gpt-4o-mini",
      input.temperature ?? 0.7,
      input.max_output_tokens ?? 2048,
      input.top_p ?? 1.0,
      input.frequency_penalty ?? 0.0,
      input.presence_penalty ?? 0.0,
      input.timeout_ms ?? 60000,
      input.retry_count ?? 3,
      input.streaming_enabled ?? false,
    ]
  );

  return getProviderById(providerId) as Promise<AIProvider>;
}

// ── Update ─────────────────────────────────────────────────────────────────────

export async function updateProvider(
  id: number,
  input: Partial<AIProviderInput> & { api_key?: string }
): Promise<AIProvider | null> {
  // Check existence (exclude deleted)
  const existing = await getProviderById(id);
  if (!existing) return null;

  const schema = await getSchema();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined && schema === "new") {
    fields.push(`display_name = $${idx++}`);
    values.push(input.name.trim());
    // Keep name column in sync (name = display_name for display purposes)
    fields.push(`name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.slug !== undefined && schema === "new") {
    fields.push(`slug = $${idx++}`);
    values.push(input.slug.trim().toLowerCase());
    // IMPORTANT: Do NOT update `provider` column — it is the internal key set at creation
    // Only update `provider` if user explicitly provides a new internal key (via separate advanced field)
  } else if (input.name !== undefined && schema === "old") {
    fields.push(`display_name = $${idx++}`);
    values.push(input.name.trim());
  }
  if (input.group_slug !== undefined && schema === "new") {
    fields.push(`group_slug = $${idx++}`);
    values.push(input.group_slug);
  }
  if (input.base_url !== undefined) {
    fields.push(`base_url = $${idx++}`);
    values.push(input.base_url.trim());
  }
  if (input.status !== undefined) {
    if (schema === "new") {
      fields.push(`status = $${idx++}`);
      values.push(input.status);
    } else {
      // Old schema: map status to is_active
      fields.push(`is_active = $${idx++}`);
      values.push(input.status === "active");
    }
  }
  if (input.is_default !== undefined && schema === "new") {
    if (input.is_default) {
      await query(
        "UPDATE ai_providers SET is_default = false WHERE is_deleted = false AND is_default = true AND id != $1",
        [id]
      );
    }
    fields.push(`is_default = $${idx++}`);
    values.push(input.is_default);
  }
  if (input.custom_headers !== undefined && schema === "new") {
    fields.push(`custom_headers = $${idx++}`);
    values.push(JSON.stringify(input.custom_headers));
  }
  if (input.api_key !== undefined && input.api_key.trim() && schema === "new") {
    const enc = encrypt(input.api_key.trim());
    fields.push(`api_key_encrypted = $${idx++}`);
    values.push(enc.encrypted);
    fields.push(`api_key_iv = $${idx++}`);
    values.push(enc.iv);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = NOW()");
  values.push(id);

  await query(
    `UPDATE ai_providers SET ${fields.join(", ")} WHERE is_deleted = false AND id = $${idx}`,
    values
  );

  return getProviderById(id);
}

// ── Delete (Soft) ─────────────────────────────────────────────────────────────

/**
 * Hard delete provider and all related data.
 *
 * Cleanup order:
 * 1. Clear routing rules that reference this provider (set provider_id = null, model = null)
 * 2. Delete provider models
 * 3. Delete runtime configs
 * 4. Delete the provider record
 *
 * Routing rules are NOT deleted — only the provider FK is nulled.
 * This prevents orphan routing and the UI will show "Chưa chọn AI".
 */
export async function deleteProvider(id: number): Promise<{ success: boolean; message?: string }> {
  const existing = await getProviderById(id);
  if (!existing) {
    return { success: false, message: "Provider không tìm thấy" };
  }

  // 1. Clear routing rules that reference this provider (primary + fallback)
  await query(
    `UPDATE ai_task_routes
       SET primary_provider_id = NULL, primary_model_override = NULL, updated_at = NOW()
       WHERE primary_provider_id = $1`,
    [id]
  );
  await query(
    `UPDATE ai_task_routes
       SET fallback_provider_id = NULL, fallback_model_override = NULL, updated_at = NOW()
       WHERE fallback_provider_id = $1`,
    [id]
  );

  // 2. Delete provider models (no FK needed, direct delete)
  await query("DELETE FROM ai_provider_models WHERE provider_id = $1", [id]);

  // 3. Delete runtime configs (no FK needed, direct delete)
  await query("DELETE FROM ai_provider_runtime_configs WHERE provider_id = $1", [id]);

  // 4. Hard delete the provider record
  await query("DELETE FROM ai_providers WHERE id = $1", [id]);

  return { success: true };
}

// ── Status Actions ─────────────────────────────────────────────────────────────

export async function activateProvider(id: number): Promise<AIProvider | null> {
  await query(
    `UPDATE ai_providers SET status = 'active', updated_at = NOW()
       WHERE is_deleted = false AND id = $1`,
    [id]
  );
  return getProviderById(id);
}

export async function deactivateProvider(id: number): Promise<AIProvider | null> {
  // Don't deactivate if it's the only provider and is default
  const current = await getProviderById(id);
  if (!current) return null;

  const { rows: activeRows } = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM ai_providers WHERE is_deleted = false AND status = 'active'`
  );
  const activeCount = parseInt(String(activeRows[0]?.count ?? "0"), 10);

  if (activeCount <= 1 && current.is_default) {
    throw new Error("Không thể tắt provider duy nhất đang hoạt động. Hãy bật provider khác trước.");
  }

  await query(
    `UPDATE ai_providers SET status = 'inactive', updated_at = NOW()
       WHERE is_deleted = false AND id = $1`,
    [id]
  );
  return getProviderById(id);
}

export async function setDefaultProvider(id: number): Promise<AIProvider | null> {
  const existing = await getProviderById(id);
  if (!existing) return null;

  // Check if it's active
  if (existing.status !== "active") {
    throw new Error("Chỉ có thể đặt provider đang active làm mặc định");
  }

  await query(
    `UPDATE ai_providers SET is_default = false, updated_at = NOW()
       WHERE is_deleted = false AND is_default = true`
  );
  await query(
    `UPDATE ai_providers SET is_default = true, updated_at = NOW()
       WHERE is_deleted = false AND id = $1`,
    [id]
  );
  return getProviderById(id);
}

export async function toggleProviderStatus(id: number): Promise<AIProvider | null> {
  const existing = await getProviderById(id);
  if (!existing) return null;

  if (existing.status === "active") {
    return deactivateProvider(id);
  } else {
    return activateProvider(id);
  }
}

// ── Connection Status ──────────────────────────────────────────────────────────

export async function updateConnectionStatus(
  id: number,
  status: ConnectionStatus,
  error?: string
): Promise<void> {
  await query(
    `UPDATE ai_providers
       SET connection_status = $1, last_error = $2, last_checked_at = NOW(), updated_at = NOW()
       WHERE is_deleted = false AND id = $3`,
    [status, error ?? null, id]
  );
}

// ── Models ─────────────────────────────────────────────────────────────────────

export async function getModelsByProvider(
  providerId: number
): Promise<AIProviderModel[]> {
  const { rows } = await query<AIProviderModel>(
    "SELECT * FROM ai_provider_models WHERE provider_id = $1 ORDER BY is_default DESC, display_name ASC",
    [providerId]
  );
  return rows;
}

export async function createModel(
  providerId: number,
  data: {
    model_name: string;
    display_name?: string;
    context_length?: number;
    is_default?: boolean;
  }
): Promise<AIProviderModel> {
  const { rows } = await query<AIProviderModel>(
    `INSERT INTO ai_provider_models
       (provider_id, model_name, display_name, context_length, is_default)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider_id, model_name) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, ai_provider_models.display_name),
       context_length = COALESCE(EXCLUDED.context_length, ai_provider_models.context_length)
     RETURNING *`,
    [
      providerId,
      data.model_name,
      data.display_name ?? data.model_name,
      data.context_length ?? null,
      data.is_default ?? false,
    ]
  );
  return rows[0];
}

export async function deleteModel(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_provider_models WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

// ── Runtime Config ─────────────────────────────────────────────────────────────

export async function getRuntimeConfig(
  providerId: number
): Promise<AIRuntimeConfig | null> {
  const { rows } = await query<AIRuntimeConfig>(
    "SELECT * FROM ai_provider_runtime_configs WHERE provider_id = $1",
    [providerId]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    custom_settings:
      typeof rows[0].custom_settings === "string"
        ? JSON.parse((rows[0].custom_settings as unknown as string) || "{}")
        : (rows[0].custom_settings ?? {}),
  };
}

export async function saveRuntimeConfig(
  input: AIRuntimeConfigInput
): Promise<AIRuntimeConfig> {
  const { rows } = await query<AIRuntimeConfig>(
    `INSERT INTO ai_provider_runtime_configs
       (provider_id, selected_model, temperature, max_output_tokens, top_p,
        frequency_penalty, presence_penalty, timeout_ms, retry_count,
        streaming_enabled, custom_settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (provider_id) DO UPDATE SET
       selected_model = EXCLUDED.selected_model,
       temperature = EXCLUDED.temperature,
       max_output_tokens = EXCLUDED.max_output_tokens,
       top_p = EXCLUDED.top_p,
       frequency_penalty = EXCLUDED.frequency_penalty,
       presence_penalty = EXCLUDED.presence_penalty,
       timeout_ms = EXCLUDED.timeout_ms,
       retry_count = EXCLUDED.retry_count,
       streaming_enabled = EXCLUDED.streaming_enabled,
       custom_settings = EXCLUDED.custom_settings,
       updated_at = NOW()
     RETURNING *`,
    [
      input.provider_id,
      input.selected_model,
      input.temperature ?? 0.7,
      input.max_output_tokens ?? 2048,
      input.top_p ?? 1.0,
      input.frequency_penalty ?? 0.0,
      input.presence_penalty ?? 0.0,
      input.timeout_ms ?? 60000,
      input.retry_count ?? 3,
      input.streaming_enabled ?? false,
      JSON.stringify(input.custom_settings ?? {}),
    ]
  );
  return {
    ...rows[0],
    custom_settings:
      typeof rows[0].custom_settings === "string"
        ? JSON.parse((rows[0].custom_settings as unknown as string) || "{}")
        : (rows[0].custom_settings ?? {}),
  };
}

// ── Decryption helpers ─────────────────────────────────────────────────────────

export async function getDecryptedApiKey(
  providerId: number
): Promise<string | null> {
  const { rows } = await query<{
    api_key_encrypted: string | null;
    api_key_iv: string | null;
  }>(
    "SELECT api_key_encrypted, api_key_iv FROM ai_providers WHERE id = $1",
    [providerId]
  );
  if (!rows[0]?.api_key_encrypted || !rows[0]?.api_key_iv) return null;
  try {
    return decrypt(rows[0].api_key_encrypted, rows[0].api_key_iv);
  } catch {
    return null;
  }
}

export async function getProviderWithDecryptedKey(
  id: number
): Promise<(AIProvider & { api_key: string | null }) | null> {
  const provider = await getProviderById(id);
  if (!provider) return null;
  const apiKey = await getDecryptedApiKey(id);
  return { ...provider, api_key: apiKey };
}

// ── Dependency checks ──────────────────────────────────────────────────────────

export async function isProviderInUse(providerId: number): Promise<boolean> {
  // Check task_routes
  const { rows: routeRows } = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM ai_task_routes
     WHERE provider_type = (SELECT slug FROM ai_providers WHERE id = $1)
        OR fallback_provider_type = (SELECT slug FROM ai_providers WHERE id = $1)`,
    [providerId]
  );
  if ((routeRows[0]?.count ?? 0) > 0) return true;

  // Check content_generation_logs
  const { rows: logRows } = await query<{ count: number }>(
    `SELECT COUNT(*) as count FROM content_generation_logs
     WHERE provider = (SELECT slug FROM ai_providers WHERE id = $1)`,
    [providerId]
  );
  return (logRows[0]?.count ?? 0) > 0;
}

export interface ProviderDeleteCheck {
  canDelete: boolean;
  isDefault: boolean;
  isInUse: boolean;
  reason?: string;
}

export async function checkProviderDelete(id: number): Promise<ProviderDeleteCheck> {
  const provider = await getProviderById(id);
  if (!provider) {
    return { canDelete: false, isDefault: false, isInUse: false, reason: "Provider không tìm thấy" };
  }

  const [inUse] = await Promise.all([isProviderInUse(id)]);

  // Always allow deletion — return flags for frontend dialog to handle warnings
  return {
    canDelete: true,
    isDefault: provider.is_default,
    isInUse: inUse,
    reason: inUse
      ? "Provider đang được dùng trong routing. Hãy chuyển sang provider khác trước khi xóa."
      : provider.is_default
      ? "Provider này đang là mặc định."
      : undefined,
  };
}
