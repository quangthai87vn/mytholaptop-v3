/**
 * AI Providers CRUD
 */

import { query } from "@/lib/db";
import type { AIProvider, AIProviderType } from "../types";
import type { ProviderCard } from "@/types/ai-operating";

export async function getAllProviders(): Promise<AIProvider[]> {
  const { rows } = await query<AIProvider>(
    "SELECT * FROM ai_providers WHERE is_deleted = false ORDER BY sort_order ASC"
  );
  return rows;
}

/** Tra ve ProviderCard[] voi field `type` thay vi `provider`.
 *  Chi lay provider chua xoa (is_deleted = false). */
export async function getAllProviderCards(): Promise<ProviderCard[]> {
  // Use status column (new schema) as active flag; ORDER BY is_default first
  const { rows } = await query<AIProvider & { is_active: boolean; sort_order: number; status: string }>(
    "SELECT * FROM ai_providers WHERE is_deleted = false ORDER BY is_default DESC, sort_order ASC"
  );
  return rows.map((r) => ({
    id: r.id,
    type: (r.provider ?? "openai") as ProviderCard["type"],
    display_name: r.display_name ?? r.provider ?? "Unknown",
    name: r.display_name ?? r.provider ?? "Unknown",  // alias
    slug: r.slug ?? r.provider ?? "",
    base_url: (r.base_url ?? null) as string | null,
    // Use status column as primary flag (new schema), is_active as fallback
    is_active: r.status === "active" || (r.is_active ?? false),
    sort_order: r.sort_order ?? 0,
    model_name: r.model_name ?? undefined,
    temperature: r.temperature ?? undefined,
  }));
}

export async function getProviderById(id: number): Promise<AIProvider | null> {
  const { rows } = await query<AIProvider>(
    "SELECT * FROM ai_providers WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

export async function getProviderByType(
  provider: AIProviderType
): Promise<AIProvider | null> {
  const { rows } = await query<AIProvider>(
    "SELECT * FROM ai_providers WHERE provider = $1",
    [provider]
  );
  return rows[0] || null;
}

export async function createProvider(data: {
  provider: AIProviderType;
  display_name: string;
  base_url?: string;
  model_name?: string;
  streaming_enabled?: boolean;
  timeout_ms?: number;
  retry_count?: number;
  is_active?: boolean;
  api_key_encrypted?: string | null;
  api_key_iv?: string | null;
}): Promise<AIProvider> {
  const { rows } = await query<AIProvider>(
    `INSERT INTO ai_providers
       (provider, display_name, base_url, model_name, streaming_enabled,
        timeout_ms, retry_count, is_active, api_key_encrypted, api_key_iv, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       COALESCE((SELECT MAX(sort_order) FROM ai_providers), 0) + 1)
     RETURNING *`,
    [
      data.provider,
      data.display_name,
      data.base_url || null,
      data.model_name || null,
      data.streaming_enabled ?? false,
      data.timeout_ms ?? 60000,
      data.retry_count ?? 3,
      data.is_active ?? false,
      data.api_key_encrypted ?? null,
      data.api_key_iv ?? null,
    ]
  );
  return rows[0];
}

export async function updateProvider(
  id: number,
  data: {
    display_name?: string;
    base_url?: string;
    is_active?: boolean;
    sort_order?: number;
  }
): Promise<AIProvider | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.display_name !== undefined) {
    fields.push(`display_name = $${idx++}`);
    values.push(data.display_name);
  }
  if (data.base_url !== undefined) {
    fields.push(`base_url = $${idx++}`);
    values.push(data.base_url);
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(data.is_active);
  }
  if (data.sort_order !== undefined) {
    fields.push(`sort_order = $${idx++}`);
    values.push(data.sort_order);
  }

  if (fields.length === 0) return getProviderById(id);

  fields.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query<AIProvider>(
    `UPDATE ai_providers SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function setActiveProvider(
  id: number,
  active: boolean
): Promise<AIProvider | null> {
  const { rows } = await query<AIProvider>(
    `UPDATE ai_providers SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [active, id]
  );
  return rows[0] || null;
}

/** Lấy decrypted API key của một provider bằng id (ưu tiên) hoặc provider type */
export async function getDecryptedApiKey(providerId?: number, providerType?: string): Promise<string | null> {
  if (!providerId && !providerType) return null;
  try {
    let rows: { api_key_encrypted: string | null; api_key_iv: string | null }[] = [];
    if (providerId) {
      const result = await query<{ api_key_encrypted: string | null; api_key_iv: string | null }>(
        "SELECT api_key_encrypted, api_key_iv FROM ai_providers WHERE id = $1 LIMIT 1",
        [providerId]
      );
      rows = result.rows;
    } else if (providerType) {
      const result = await query<{ api_key_encrypted: string | null; api_key_iv: string | null }>(
        "SELECT api_key_encrypted, api_key_iv FROM ai_providers WHERE provider = $1 LIMIT 1",
        [providerType]
      );
      rows = result.rows;
    }
    if (!rows[0]?.api_key_encrypted || !rows[0]?.api_key_iv) return null;
    const { decrypt } = await import("@/lib/content/db/encryption");
    return decrypt(rows[0].api_key_encrypted!, rows[0].api_key_iv!);
  } catch {
    return null;
  }
}
