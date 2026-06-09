/**
 * Server-only: custom role permissions DB access
 *
 * This module MUST only be imported from API route files (server-side).
 * Do NOT import from client components.
 */

import type { Permission } from "@/lib/auth/permissions";
import {
  customRolePerms,
  isCacheStale,
  setCacheStamp,
} from "@/lib/auth/permissions-core";

let _loadPromise: Promise<void> | null = null;

async function loadFromDB(): Promise<void> {
  const { query } = await import("@/lib/db");
  const { rows } = await query<{ role_code: string; permission: string }>(
    "SELECT role_code, permission FROM admin_role_permissions"
  );
  customRolePerms.clear();
  for (const r of rows) {
    const arr = customRolePerms.get(r.role_code) ?? [];
    arr.push(r.permission as Permission);
    customRolePerms.set(r.role_code, arr);
  }
  setCacheStamp(Date.now());
}

/**
 * Load all custom role permissions from DB into in-memory cache.
 * Idempotent — skips if cache is fresh.
 * Uses a shared promise to avoid concurrent DB queries.
 */
export async function loadCustomPermissionsFromDB(): Promise<void> {
  if (!isCacheStale()) return;
  if (_loadPromise) return _loadPromise;
  _loadPromise = loadFromDB().finally(() => { _loadPromise = null; });
  return _loadPromise;
}

/**
 * Synchronously get permissions for a custom role from cache.
 * Returns empty array if cache is empty (use hasPermission() for fallback).
 */
export function getCustomPermissions(roleCode: string): Permission[] {
  return customRolePerms.get(roleCode) ?? [];
}

/**
 * Set permissions for a custom role (used after PUT /api/roles/[code]/permissions).
 */
export function setCustomPermissions(roleCode: string, perms: Permission[]): void {
  customRolePerms.set(roleCode, perms);
}

/**
 * Clear a specific role from cache (used after DELETE role).
 */
export function clearCustomPermissions(roleCode: string): void {
  customRolePerms.delete(roleCode);
}

/**
 * Invalidate cache — forces reload on next request.
 */
export function invalidateCustomPermissionsCache(): void {
  setCacheStamp(0);
}
