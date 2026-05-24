/**
 * AI System Prompts CRUD
 */

import { query } from "@/lib/db";
import type { SystemPromptTemplate } from "@/types/ai-operating";

export async function getAllSystemPrompts(): Promise<SystemPromptTemplate[]> {
  const { rows } = await query<SystemPromptTemplate>(
    "SELECT * FROM ai_system_prompt_templates ORDER BY is_default DESC, id ASC"
  );
  return rows;
}

export async function getSystemPromptById(
  id: number
): Promise<SystemPromptTemplate | null> {
  const { rows } = await query<SystemPromptTemplate>(
    "SELECT * FROM ai_system_prompt_templates WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

export async function getDefaultSystemPrompt(): Promise<SystemPromptTemplate | null> {
  const { rows } = await query<SystemPromptTemplate>(
    "SELECT * FROM ai_system_prompt_templates WHERE is_default = true LIMIT 1"
  );
  return rows[0] || null;
}

export async function upsertSystemPrompt(data: {
  id?: number;
  name: string;
  description: string;
  prompt_text: string;
  is_active?: boolean;
  is_default?: boolean;
}): Promise<SystemPromptTemplate> {
  if (data.id) {
    const { rows } = await query<SystemPromptTemplate>(
      `UPDATE ai_system_prompt_templates
         SET name = $1, description = $2, prompt_text = $3, is_active = $4, updated_at = NOW()
         WHERE id = $5 RETURNING *`,
      [data.name, data.description, data.prompt_text, data.is_active ?? true, data.id]
    );
    return rows[0];
  }

  const { rows } = await query<SystemPromptTemplate>(
    `INSERT INTO ai_system_prompt_templates
       (name, description, prompt_text, is_active, is_default)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.description, data.prompt_text, data.is_active ?? true, data.is_default ?? false]
  );
  return rows[0];
}

export async function setDefaultSystemPrompt(id: number): Promise<void> {
  await query("UPDATE ai_system_prompt_templates SET is_default = false");
  await query(
    "UPDATE ai_system_prompt_templates SET is_default = true WHERE id = $1",
    [id]
  );
}

export async function deleteSystemPrompt(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_system_prompt_templates WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}
