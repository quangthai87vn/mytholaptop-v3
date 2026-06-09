/**
 * Shared in-memory cache state for custom role permissions.
 *
 * This file has ZERO imports — it only exports plain JS values.
 * It is safe to import from both client and server modules.
 *
 * API routes (server-only) manage the cache via permissions.server.ts.
 */

import type { Permission } from "@/lib/auth/permissions";

/** In-memory Map: role_code → Permission[] */
export const customRolePerms = new Map<string, Permission[]>();

/** Unix timestamp (ms) when cache was last loaded. 0 = never loaded. */
export let cacheStamp = 0;

/** TTL in ms — cache is considered stale after this duration */
export const CACHE_TTL_MS = 60_000;

export function setCacheStamp(val: number): void {
  cacheStamp = val;
}

export function isCacheStale(): boolean {
  if (cacheStamp === 0) return true;
  return Date.now() - cacheStamp > CACHE_TTL_MS;
}

export function isCacheLoaded(): boolean {
  return cacheStamp > 0;
}
