/**
 * Settings Storage Service
 *
 * Quản lý lưu/truy xuất settings từ server (file JSON).
 * Dùng chung cho Settings page và Migration page.
 * Settings được lưu trên server, không phụ thuộc browser.
 */

import type { Settings } from "@/types";
import { defaultSettings } from "@/lib/mock-data";

export interface ApiSettings {
  wordpressUrl: string;
  wooConsumerKey: string;
  wooConsumerSecret: string;
  medusaBackendUrl: string;
  medusaAdminKey: string;
  medusaAdminEmail: string;
  medusaAdminPassword: string;
}

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Lấy toàn bộ settings từ server.
 * Trả về default nếu lỗi hoặc chưa có.
 */
export async function loadSettings(): Promise<Settings> {
  try {
    const settings = await apiFetch<Settings>("/api/settings");
    return { ...defaultSettings, ...settings };
  } catch {
    return defaultSettings;
  }
}

/**
 * Lưu toàn bộ settings lên server.
 */
export async function saveSettings(settings: Settings): Promise<void> {
  await apiFetch<{ success: boolean }>("/api/settings", {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

/**
 * Lấy API config (chỉ phần kết nối WooCommerce + Medusa).
 * Dùng cho Migration page.
 */
export async function loadApiSettings(): Promise<ApiSettings> {
  const settings = await loadSettings();
  return {
    wordpressUrl: settings.wooCommerce.wordpressUrl,
    wooConsumerKey: settings.wooCommerce.consumerKey,
    wooConsumerSecret: settings.wooCommerce.consumerSecret,
    medusaBackendUrl: settings.medusa.backendUrl,
    medusaAdminKey: settings.medusa.adminApiKey,
    medusaAdminEmail: settings.medusa.adminEmail,
    medusaAdminPassword: settings.medusa.adminPassword,
  };
}

/**
 * Lưu API config vào settings trên server.
 * Cập nhật chỉ phần WooCommerce + Medusa.
 */
export async function saveApiSettings(apiSettings: ApiSettings): Promise<void> {
  const settings = await loadSettings();
  const updated: Settings = {
    ...settings,
    wooCommerce: {
      wordpressUrl: apiSettings.wordpressUrl,
      consumerKey: apiSettings.wooConsumerKey,
      consumerSecret: apiSettings.wooConsumerSecret,
    },
    medusa: {
      backendUrl: apiSettings.medusaBackendUrl,
      adminApiKey: apiSettings.medusaAdminKey,
      adminEmail: apiSettings.medusaAdminEmail,
      adminPassword: apiSettings.medusaAdminPassword,
    },
  };
  await saveSettings(updated);
}
