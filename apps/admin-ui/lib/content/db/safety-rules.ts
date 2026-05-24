/**
 * AI Safety Rules CRUD
 */

import { query } from "@/lib/db";

export interface SafetyRule {
  id: number;
  rule_key: string;
  rule_text: string;
  severity: "low" | "medium" | "high";
  is_active: boolean;
  created_at: string;
}

export interface SafetyConfig {
  block_sensitive_content: boolean;
  block_false_claims: boolean;
  block_competitor_mentions: boolean;
  max_claims_per_post: number;
  blacklist_keywords: string[];
  rules: SafetyRule[];
}

export async function getSafetyRules(): Promise<SafetyRule[]> {
  const { rows } = await query<SafetyRule>(
    "SELECT * FROM ai_safety_rules ORDER BY severity DESC, id ASC"
  );
  return rows;
}

export async function upsertSafetyRule(data: {
  rule_key: string;
  rule_text: string;
  severity?: "low" | "medium" | "high";
  is_active?: boolean;
}): Promise<SafetyRule> {
  const { rows } = await query<SafetyRule>(
    `INSERT INTO ai_safety_rules (rule_key, rule_text, severity, is_active)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (rule_key) DO UPDATE SET
       rule_text = EXCLUDED.rule_text,
       severity  = EXCLUDED.severity,
       is_active = EXCLUDED.is_active
     RETURNING *`,
    [data.rule_key, data.rule_text, data.severity ?? "medium", data.is_active ?? true]
  );
  return rows[0];
}

export async function deleteSafetyRule(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_safety_rules WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function toggleSafetyRule(
  id: number,
  isActive: boolean
): Promise<SafetyRule | null> {
  const { rows } = await query<SafetyRule>(
    "UPDATE ai_safety_rules SET is_active = $1 WHERE id = $2 RETURNING *",
    [isActive, id]
  );
  return rows[0] || null;
}

// Blacklist stored as JSONB in ai_settings or separate table
export async function getBlacklist(): Promise<string[]> {
  try {
    const { rows } = await query<{ value: string }>(
      "SELECT value FROM ai_settings WHERE provider_id IS NULL AND model_name IS NULL LIMIT 1"
    );
    if (rows[0]) {
      const parsed = JSON.parse(rows[0].value as unknown as string);
      return parsed.blacklist ?? [];
    }
  } catch { /* ignore */ }
  return [];
}

export async function saveBlacklist(keywords: string[]): Promise<void> {
  await query(
    `INSERT INTO ai_settings (provider_id, model_name, temperature, max_tokens, is_active)
     VALUES (NULL, 'blacklist', 0, 0, true)
     ON CONFLICT (provider_id, model_name) DO UPDATE SET
       base_url = $1::text,
       updated_at = NOW()`,
    [JSON.stringify({ blacklist: keywords })]
  );
}
