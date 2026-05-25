/**
 * In-memory cache cho AI configuration data.
 * Giảm database queries bằng cách cache các dữ liệu hiếm khi thay đổi.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry<unknown>>();

// Default TTL: 60 giây (đủ nhanh để thấy thay đổi admin, đủ chậm để giảm query)
const DEFAULT_TTL_MS = 60_000;

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() > entry.expiresAt;
}

export function getCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = _cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (isExpired(entry)) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key?: string): void {
  if (key) {
    _cache.delete(key);
  } else {
    _cache.clear();
  }
}

/** Xóa toàn bộ cache, thường gọi khi có write operation */
export function invalidateAICache(): void {
  invalidateCache("ai:context");
  invalidateCache("ai:routing-rules");
  invalidateCache("ai:brand-voices");
  invalidateCache("ai:active-brand-voice");
  invalidateCache("ai:providers");
  invalidateCache("ai:provider-cards");
  invalidateCache("ai:safety-rules");
  invalidateCache("ai:system-prompts");
  invalidateCache("ai:prompt-rules");
}

/** Lấy hoặc fetch với cache.
 * @param key Cache key
 * @param fetcher Hàm gọi DB khi cache miss
 * @param ttlMs TTL milliseconds
 */
export async function getCacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = getCache<T>(key, ttlMs);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCache(key, data, ttlMs);
  return data;
}
