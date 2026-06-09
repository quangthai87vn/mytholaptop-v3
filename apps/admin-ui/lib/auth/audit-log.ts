/**
 * Admin Audit Log — P5.9 RBAC Hardening / P5.11 Production Cleanup
 *
 * Ghi audit trail khi admin thay đổi user/role/status.
 * Table: admin_audit_logs (migration 012)
 *
 * P5.11: Mở rộng hỗ trợ settings.woo_updated, settings.medusa_updated,
 * settings.company_updated — ghi lại thay đổi credentials mà không log raw secret.
 */

import { query } from "@/lib/db";
import type { AdminUser } from "@/lib/auth/session";

export type AuditAction =
  | "user.created"
  | "user.role_changed"
  | "user.status_changed"
  | "user.password_reset"
  | "user.disabled"
  | "settings.woo_updated"
  | "settings.medusa_updated"
  | "settings.company_updated"
  | "settings.product_data_source_updated";

export interface AuditLogEntry {
  actor_id: string | null;
  actor_name: string;
  actor_email: string;
  action: AuditAction;
  target_user_id: string | null;
  target_user_email: string | null;
  target_user_name: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

/**
 * Ghi một audit log entry.
 * Dùng await khi gọi — không fire-and-forget.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_audit_logs
         (actor_id, actor_name, actor_email, action, target_user_id,
          target_user_email, target_user_name, old_value, new_value, metadata,
          ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.actor_id ?? null,
        entry.actor_name,
        entry.actor_email,
        entry.action,
        entry.target_user_id ?? null,
        entry.target_user_email ?? null,
        entry.target_user_name ?? null,
        entry.old_value ?? null,
        entry.new_value ?? null,
        entry.metadata ?? {},
        entry.ip_address ?? null,
        entry.user_agent ?? null,
      ]
    );
  } catch (err) {
    // Audit log failure không được phép break main operation
    // Chỉ log lỗi ra console
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

/**
 * Extract IP address từ request headers.
 */
export function extractIpAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? null;
}

/**
 * Tạo audit log entry từ actor (AdminUser) và metadata chuẩn.
 */
export function buildAuditEntry(
  actor: AdminUser,
  action: AuditAction,
  targetId: string | null,
  targetEmail: string | null,
  targetName: string | null,
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null,
  extra?: { ip?: string | null; userAgent?: string | null }
): AuditLogEntry {
  return {
    actor_id: actor.id,
    actor_name: actor.full_name,
    actor_email: actor.email,
    action,
    target_user_id: targetId,
    target_user_email: targetEmail,
    target_user_name: targetName,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    ip_address: extra?.ip ?? null,
    user_agent: extra?.userAgent ?? null,
  };
}

/**
 * P5.11: Mask sensitive fields trong settings trước khi ghi audit log.
 * Không bao giờ log raw credentials.
 *
 * Fields được mask:
 * - WooCommerce: consumerKey, consumerSecret
 * - Medusa: adminApiKey, adminPassword
 */
export function maskSettingsForAudit(
  settings: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!settings) return null;

  const result: Record<string, unknown> = { ...settings };
  const mask = (v: unknown): string => {
    if (typeof v !== "string" || !v) return "";
    if (v.length <= 8) return "••••••••";
    return `${v.slice(0, 4)}••••${v.slice(-4)}`;
  };

  // WooCommerce
  if ("consumerKey" in result) result.consumerKey = mask((result as Record<string, unknown>).consumerKey);
  if ("consumerSecret" in result) result.consumerSecret = mask((result as Record<string, unknown>).consumerSecret);

  // Medusa
  if ("adminApiKey" in result) result.adminApiKey = mask((result as Record<string, unknown>).adminApiKey);
  if ("adminPassword" in result) result.adminPassword = mask((result as Record<string, unknown>).adminPassword);

  return result;
}

/**
 * P5.11: Ghi audit log khi settings được cập nhật.
 * Dùng cho WooCommerce, Medusa, Company settings changes.
 */
export async function writeSettingsAuditLog(
  actor: AdminUser,
  action: "settings.woo_updated" | "settings.medusa_updated" | "settings.company_updated" | "settings.product_data_source_updated",
  oldSettings: Record<string, unknown> | null,
  newSettings: Record<string, unknown>,
  extra?: { ip?: string | null; userAgent?: string | null }
): Promise<void> {
  await writeAuditLog({
    actor_id: actor.id,
    actor_name: actor.full_name,
    actor_email: actor.email,
    action,
    target_user_id: actor.id,
    target_user_email: actor.email,
    target_user_name: actor.full_name,
    old_value: maskSettingsForAudit(oldSettings),
    new_value: maskSettingsForAudit(newSettings),
    ip_address: extra?.ip ?? null,
    user_agent: extra?.userAgent ?? null,
  });
}
