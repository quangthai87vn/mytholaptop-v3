/**
 * App Settings CRUD - lưu trữ settings ứng dụng (WooCommerce, Medusa, Company info)
 * trong PostgreSQL thay vì file JSON (file JSON không ghi được trong Docker).
 */

import { query } from "@/lib/db";

export interface AppSetting {
  id: number;
  key: string;
  value: string; // JSON string
  updated_at: string;
}

/**
 * Lấy giá trị settings theo key.
 */
export async function getAppSetting(key: string): Promise<Record<string, unknown> | null> {
  const { rows } = await query<AppSetting>(
    "SELECT * FROM app_settings WHERE key = $1 LIMIT 1",
    [key]
  );
  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return null;
  }
}

/**
 * Lưu settings theo key (upsert).
 */
export async function saveAppSetting(
  key: string,
  value: Record<string, unknown>
): Promise<void> {
  const json = JSON.stringify(value);
  await query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = NOW()`,
    [key, json]
  );
}

/**
 * Xóa settings theo key.
 */
export async function deleteAppSetting(key: string): Promise<void> {
  await query("DELETE FROM app_settings WHERE key = $1", [key]);
}
