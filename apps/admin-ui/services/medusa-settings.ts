/**
 * Medusa Settings Helper
 *
 * Load Medusa config từ settings storage (server-side JSON file).
 */

import { loadApiSettings } from "@/lib/settings-storage";
import type { ApiSettings } from "@/lib/settings-storage";
import type { MedusaConfig } from "./medusa-types";

export interface MedusaSettings extends MedusaConfig {}

/**
 * Load Medusa config từ settings storage.
 * Returns null nếu chưa cấu hình backend URL và API key.
 */
export async function getMedusaSettings(): Promise<MedusaSettings | null> {
  const settings: ApiSettings = await loadApiSettings();

  if (!settings.medusaBackendUrl || !settings.medusaAdminKey) {
    return null;
  }

  return {
    backendUrl: settings.medusaBackendUrl,
    adminApiKey: settings.medusaAdminKey,
  };
}

/**
 * Check xem Medusa đã được cấu hình chưa.
 */
export async function isMedusaConfigured(): Promise<boolean> {
  const settings = await getMedusaSettings();
  return settings !== null;
}
