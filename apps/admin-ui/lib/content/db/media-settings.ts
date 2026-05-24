/**
 * AI Media Settings CRUD
 * Lưu provider riêng cho image/video/audio AI
 */

import { query } from "@/lib/db";
import { encrypt, decrypt } from "./encryption";

export interface MediaSetting {
  id: number;
  media_type: "image" | "video" | "audio";
  provider: string;
  model_name: string | null;
  base_url: string | null;
  api_key_encrypted: string | null;
  api_key_iv: string | null;
  temperature: number;
  quality: string;
  size: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAllMediaSettings(): Promise<MediaSetting[]> {
  const { rows } = await query<MediaSetting>(
    "SELECT * FROM ai_media_settings ORDER BY media_type ASC"
  );
  return rows;
}

export async function getMediaSettingByType(
  mediaType: "image" | "video" | "audio"
): Promise<MediaSetting | null> {
  const { rows } = await query<MediaSetting>(
    "SELECT * FROM ai_media_settings WHERE media_type = $1",
    [mediaType]
  );
  return rows[0] || null;
}

export async function upsertMediaSetting(data: {
  media_type: "image" | "video" | "audio";
  provider: string;
  model_name?: string | null;
  base_url?: string | null;
  api_key?: string;
  temperature?: number;
  quality?: string;
  size?: string;
  is_active?: boolean;
}): Promise<MediaSetting> {
  let apiKeyEncrypted: string | null = null;
  let apiKeyIv: string | null = null;

  if (data.api_key) {
    const enc = encrypt(data.api_key);
    apiKeyEncrypted = enc.encrypted;
    apiKeyIv = enc.iv;
  }

  const { rows } = await query<MediaSetting>(
    `INSERT INTO ai_media_settings
       (media_type, provider, model_name, base_url, api_key_encrypted, api_key_iv,
        temperature, quality, size, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (media_type) DO UPDATE SET
       provider = EXCLUDED.provider,
       model_name = EXCLUDED.model_name,
       base_url = EXCLUDED.base_url,
       api_key_encrypted = COALESCE($5, ai_media_settings.api_key_encrypted),
       api_key_iv = COALESCE($6, ai_media_settings.api_key_iv),
       temperature = EXCLUDED.temperature,
       quality = EXCLUDED.quality,
       size = EXCLUDED.size,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()
     RETURNING *`,
    [
      data.media_type,
      data.provider,
      data.model_name ?? null,
      data.base_url ?? null,
      apiKeyEncrypted,
      apiKeyIv,
      data.temperature ?? 0.9,
      data.quality ?? "standard",
      data.size ?? "1024x1024",
      data.is_active ?? false,
    ]
  );
  return rows[0];
}

export async function getDecryptedApiKey(
  mediaType: "image" | "video" | "audio"
): Promise<string | null> {
  const setting = await getMediaSettingByType(mediaType);
  if (!setting?.api_key_encrypted || !setting.api_key_iv) return null;
  try {
    return decrypt(setting.api_key_encrypted, setting.api_key_iv);
  } catch {
    return null;
  }
}
