/**
 * AI Settings CRUD - handles encryption/decryption of api_key
 */

import { query } from "@/lib/db";
import { encrypt, decrypt } from "./encryption";
import type { AISettings, AISettingsInput, AISettingsOutput } from "../types";

export async function getSettings(): Promise<AISettingsOutput | null> {
  const { rows } = await query<AISettings>(
    `SELECT s.*, p.provider, p.display_name as provider_display_name
     FROM ai_settings s
     LEFT JOIN ai_providers p ON s.provider_id = p.id
     ORDER BY s.id DESC LIMIT 1`
  );
  if (!rows[0]) return null;

  const row = rows[0];
  let apiKey: string | null = null;

  if (row.api_key_encrypted && row.api_key_iv) {
    try {
      apiKey = decrypt(row.api_key_encrypted, row.api_key_iv);
    } catch {
      apiKey = null;
    }
  }

  return {
    ...row,
    api_key: apiKey,
  };
}

export async function saveSettings(
  data: AISettingsInput
): Promise<AISettingsOutput> {
  let apiKeyEncrypted: string | null = null;
  let apiKeyIv: string | null = null;

  if (data.api_key) {
    const { encrypted, iv } = encrypt(data.api_key);
    apiKeyEncrypted = encrypted;
    apiKeyIv = iv;
  }

  // Upsert - update if exists, insert if not
  const { rows } = await query<AISettings>(
    `INSERT INTO ai_settings
       (provider_id, base_url, model_name, api_key_encrypted, api_key_iv,
        temperature, max_tokens, brand_voice, prompt_rules, safety_rules, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       provider_id = EXCLUDED.provider_id,
       base_url = EXCLUDED.base_url,
       model_name = EXCLUDED.model_name,
       api_key_encrypted = COALESCE(EXCLUDED.api_key_encrypted, ai_settings.api_key_encrypted),
       api_key_iv = COALESCE(EXCLUDED.api_key_iv, ai_settings.api_key_iv),
       temperature = EXCLUDED.temperature,
       max_tokens = EXCLUDED.max_tokens,
       brand_voice = EXCLUDED.brand_voice,
       prompt_rules = EXCLUDED.prompt_rules,
       safety_rules = EXCLUDED.safety_rules,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *`,
    [
      data.provider_id,
      data.base_url || null,
      data.model_name,
      apiKeyEncrypted,
      apiKeyIv,
      data.temperature,
      data.max_tokens,
      data.brand_voice || null,
      data.prompt_rules || null,
      data.safety_rules || null,
      data.is_active ?? true,
    ]
  );

  // Re-fetch with provider info
  const { rows: fullRows } = await query<AISettings>(
    `SELECT s.*, p.provider, p.display_name as provider_display_name
     FROM ai_settings s
     LEFT JOIN ai_providers p ON s.provider_id = p.id
     WHERE s.id = $1`,
    [rows[0].id]
  );

  const row = fullRows[0];
  let apiKey: string | null = null;
  if (row.api_key_encrypted && row.api_key_iv) {
    try {
      apiKey = decrypt(row.api_key_encrypted, row.api_key_iv);
    } catch {
      apiKey = null;
    }
  }

  return { ...row, api_key: apiKey };
}

export async function updateSettingsPartial(
  id: number,
  data: Partial<AISettingsInput>
): Promise<AISettings | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.base_url !== undefined) {
    fields.push(`base_url = $${idx++}`);
    values.push(data.base_url);
  }
  if (data.model_name !== undefined) {
    fields.push(`model_name = $${idx++}`);
    values.push(data.model_name);
  }
  if (data.api_key !== undefined) {
    if (data.api_key) {
      const { encrypted, iv } = encrypt(data.api_key);
      fields.push(`api_key_encrypted = $${idx++}`);
      values.push(encrypted);
      fields.push(`api_key_iv = $${idx++}`);
      values.push(iv);
    }
  }
  if (data.temperature !== undefined) {
    fields.push(`temperature = $${idx++}`);
    values.push(data.temperature);
  }
  if (data.max_tokens !== undefined) {
    fields.push(`max_tokens = $${idx++}`);
    values.push(data.max_tokens);
  }
  if (data.brand_voice !== undefined) {
    fields.push(`brand_voice = $${idx++}`);
    values.push(data.brand_voice);
  }
  if (data.prompt_rules !== undefined) {
    fields.push(`prompt_rules = $${idx++}`);
    values.push(data.prompt_rules);
  }
  if (data.safety_rules !== undefined) {
    fields.push(`safety_rules = $${idx++}`);
    values.push(data.safety_rules);
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(data.is_active);
  }

  if (fields.length === 0) {
    const { rows } = await query<AISettings>(
      "SELECT * FROM ai_settings WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  }

  fields.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query<AISettings>(
    `UPDATE ai_settings SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}
