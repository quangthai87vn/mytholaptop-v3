/**
 * AI Prompt Rules CRUD
 */

import { query } from "@/lib/db";
import { getCacheOrFetch, invalidateAICache } from "./cache";

export interface PromptRule {
  id: number;
  scope: string;
  platform: string | null;
  rule_key: string;
  rule_text: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface PromptRulesConfig {
  global_rules: PromptRule[];
  platform_rules: Record<string, PromptRule[]>;
}

export async function getPromptRules(): Promise<PromptRulesConfig> {
  return getCacheOrFetch("ai:prompt-rules", async () => {
    const { rows } = await query<PromptRule>(
      "SELECT * FROM ai_prompt_rules ORDER BY scope, priority DESC"
    );

    const global_rules = rows.filter((r) => r.scope === "global");
    const platform_rules: Record<string, PromptRule[]> = {};

    for (const row of rows.filter((r) => r.scope === "platform")) {
      if (!platform_rules[row.platform!]) {
        platform_rules[row.platform!] = [];
      }
      platform_rules[row.platform!].push(row);
    }

    return { global_rules, platform_rules };
  });
}

export async function upsertPromptRule(data: {
  scope: string;
  platform?: string;
  rule_key: string;
  rule_text: string;
  priority?: number;
  is_active?: boolean;
}): Promise<PromptRule> {
  const { rows } = await query<PromptRule>(
    `INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
       rule_text = EXCLUDED.rule_text,
       priority  = EXCLUDED.priority,
       is_active = EXCLUDED.is_active
     RETURNING *`,
    [
      data.scope,
      data.platform ?? null,
      data.rule_key,
      data.rule_text,
      data.priority ?? 0,
      data.is_active ?? true,
    ]
  );
  invalidateAICache();
  return rows[0];
}

export async function deletePromptRule(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_prompt_rules WHERE id = $1",
    [id]
  );
  invalidateAICache();
  return (rowCount ?? 0) > 0;
}

export async function togglePromptRule(
  id: number,
  isActive: boolean
): Promise<PromptRule | null> {
  const { rows } = await query<PromptRule>(
    "UPDATE ai_prompt_rules SET is_active = $1 WHERE id = $2 RETURNING *",
    [isActive, id]
  );
  invalidateAICache();
  return rows[0] || null;
}
