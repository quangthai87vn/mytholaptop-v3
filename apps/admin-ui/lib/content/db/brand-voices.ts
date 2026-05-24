/**
 * AI Brand Voices CRUD
 */

import { query } from "@/lib/db";
import type { BrandVoice, BrandVoiceInput } from "@/types/ai-operating";

export async function getAllBrandVoices(): Promise<BrandVoice[]> {
  const { rows } = await query<BrandVoice>(
    "SELECT * FROM ai_brand_voices ORDER BY id ASC"
  );
  return rows;
}

export async function getActiveBrandVoice(): Promise<BrandVoice | null> {
  const { rows } = await query<BrandVoice>(
    "SELECT * FROM ai_brand_voices WHERE is_active = true LIMIT 1"
  );
  return rows[0] || null;
}

export async function getBrandVoiceByPreset(
  preset: string
): Promise<BrandVoice | null> {
  const { rows } = await query<BrandVoice>(
    "SELECT * FROM ai_brand_voices WHERE preset = $1",
    [preset]
  );
  return rows[0] || null;
}

export async function upsertBrandVoice(
  data: BrandVoiceInput
): Promise<BrandVoice> {
  const { rows } = await query<BrandVoice>(
    `INSERT INTO ai_brand_voices
       (preset, name, description, target_audience, tone_instruction,
        keywords_to_use, keywords_to_avoid,
        tone_professional_casual, tone_luxury_affordable, tone_technical_simple,
        content_template, emoji_usage, cta_style, example_output, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (preset) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       target_audience = EXCLUDED.target_audience,
       tone_instruction = EXCLUDED.tone_instruction,
       keywords_to_use = EXCLUDED.keywords_to_use,
       keywords_to_avoid = EXCLUDED.keywords_to_avoid,
       tone_professional_casual = EXCLUDED.tone_professional_casual,
       tone_luxury_affordable = EXCLUDED.tone_luxury_affordable,
       tone_technical_simple = EXCLUDED.tone_technical_simple,
       content_template = EXCLUDED.content_template,
       emoji_usage = EXCLUDED.emoji_usage,
       cta_style = EXCLUDED.cta_style,
       example_output = EXCLUDED.example_output,
       updated_at = NOW()
     RETURNING *`,
    [
      data.preset,
      data.name,
      data.description,
      data.target_audience ?? "",
      data.tone_instruction ?? "",
      data.keywords_to_use ?? [],
      data.keywords_to_avoid ?? [],
      data.tone_professional_casual ?? 0,
      data.tone_luxury_affordable ?? 0,
      data.tone_technical_simple ?? 0,
      data.content_template ?? "",
      data.emoji_usage ?? "moderate",
      data.cta_style ?? "direct",
      data.example_output ?? "",
      data.is_active ?? true,
    ]
  );
  return rows[0];
}

export async function setActiveBrandVoice(preset: string): Promise<BrandVoice | null> {
  await query("UPDATE ai_brand_voices SET is_active = false");
  const { rows } = await query<BrandVoice>(
    "UPDATE ai_brand_voices SET is_active = true, updated_at = NOW() WHERE preset = $1 RETURNING *",
    [preset]
  );
  return rows[0] || null;
}

export async function deleteBrandVoice(preset: string): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM ai_brand_voices WHERE preset = $1",
    [preset]
  );
  return (rowCount ?? 0) > 0;
}
