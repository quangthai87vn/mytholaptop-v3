/**
 * AI Providers CRUD
 */

import { query } from "@/lib/db";
import type { AIProvider, AIProviderType } from "../types";

export async function getAllProviders(): Promise<AIProvider[]> {
  const { rows } = await query<AIProvider>(
    "SELECT * FROM ai_providers ORDER BY sort_order ASC"
  );
  return rows;
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
}): Promise<AIProvider> {
  const { rows } = await query<AIProvider>(
    `INSERT INTO ai_providers (provider, display_name, base_url, sort_order)
     VALUES ($1, $2, $3,
       COALESCE((SELECT MAX(sort_order) FROM ai_providers), 0) + 1)
     RETURNING *`,
    [data.provider, data.display_name, data.base_url || null]
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

export async function deleteProvider(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_providers WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
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
