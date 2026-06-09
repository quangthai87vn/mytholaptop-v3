/**
 * Medusa Settings Helper
 *
 * Load Medusa config từ DB trực tiếp (server-side).
 * KHÔNG dùng loadApiSettings() — vì nó gọi GET /api/settings trả __ENCRYPTED__ sentinel.
 * Proxy server-side /api/medusa/[...slug] cũng đọc trực tiếp từ DB qua getAppSetting.
 */

import { getAppSetting } from "@/lib/content/db/app-settings";
import type { MedusaConfig } from "./medusa-types";

export interface MedusaSettings extends MedusaConfig {}

/**
 * Load Medusa config trực tiếp từ app_settings DB.
 * Returns null nếu chưa cấu hình backend URL và API key.
 */
export async function getMedusaSettings(): Promise<MedusaSettings | null> {
  try {
    const medusa = await getAppSetting("medusa");
    if (!medusa) return null;

    const m = medusa as Record<string, unknown>;

    // backendUrl is required
    const backendUrl = (m.backendUrl as string) || "";
    if (!backendUrl) return null;

    // adminApiKey must be non-empty JWT token (not sentinel, not empty string)
    const adminApiKey = (m.adminApiKey as string) || "";
    if (!adminApiKey || adminApiKey === "__ENCRYPTED__") return null;

    return {
      backendUrl,
      adminApiKey,
    };
  } catch {
    return null;
  }
}

/**
 * Check xem Medusa đã được cấu hình chưa.
 */
export async function isMedusaConfigured(): Promise<boolean> {
  const settings = await getMedusaSettings();
  return settings !== null;
}
