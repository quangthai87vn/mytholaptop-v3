/**
 * Rate Limiter Store
 *
 * P5.1: Chống brute-force đăng nhập.
 *
 * Cơ chế:
 * - Lưu theo IP address
 * - Đếm số lần thất bại trong sliding window
 * - Tự động xóa entry hết hạn
 *
 * Storage: In-memory Map (development)
 * ⚠️  CẢNH BÁO: Memory store KHÔNG hoạt động đúng trong multi-instance deployment.
 *    Khi deploy nhiều server instance, mỗi instance có memory riêng.
 *    → Rate limit bypass được khi attacker hit nhiều instance.
 *    → Cần thay bằng Redis khi scale ra production.
 *
 * Interface thiết kế để dễ dàng thay bằng Redis:
 *   - get(key): lấy số attempts hiện tại
 *   - increment(key): tăng số attempts, reset TTL
 *   - reset(key): xóa entry (gọi khi login thành công)
 *   - Chỉ cần implement class mới với cùng interface để switch sang Redis
 */

export interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number; // timestamp ms
  lockedUntil: number;    // timestamp ms — 0 = không bị lock
}

export interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  increment(key: string, windowMs: number, maxAttempts: number): RateLimitEntry;
  reset(key: string): void;
}

export interface RateLimitConfig {
  /** Số lần thử tối đa trong window */
  maxAttempts: number;
  /** Độ dài window (ms) — mặc định 15 phút */
  windowMs: number;
  /** Thời gian lock khi vượt limit (ms) — mặc định 15 phút */
  lockDurationMs: number;
}

// ============================================================
// Memory Store (development)
// ============================================================

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  private cleanUp(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      // Xóa entry đã hết lock và quá window (không còn active)
      if (entry.lockedUntil === 0 && now - entry.firstAttemptAt > 2 * 60 * 60 * 1000) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();

    // Entry đã hết lock period
    if (entry.lockedUntil > 0 && now >= entry.lockedUntil) {
      this.store.delete(key);
      return undefined;
    }

    // Entry quá cũ (window đã hết mà không bị lock) — xem như mới
    if (entry.lockedUntil === 0 && now - entry.firstAttemptAt > 2 * 60 * 60 * 1000) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  increment(key: string, windowMs: number, maxAttempts: number): RateLimitEntry {
    this.cleanUp();

    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.lockedUntil > 0) {
      // Bắt đầu window mới
      const entry: RateLimitEntry = {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: 0,
      };
      this.store.set(key, entry);
      return entry;
    }

    // Đang trong window
    const elapsed = now - existing.firstAttemptAt;

    if (elapsed >= windowMs) {
      // Window đã hết — reset
      const entry: RateLimitEntry = {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: 0,
      };
      this.store.set(key, entry);
      return entry;
    }

    // Trong window — tăng attempts
    existing.attempts += 1;

    if (existing.attempts >= maxAttempts) {
      // Vượt limit → lock
      existing.lockedUntil = now + windowMs;
    }

    return existing;
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

// ============================================================
// Redis Store (production-ready interface)
// ============================================================

/**
 * Redis-backed RateLimitStore.
 * Sử dụng Redis để đảm bảo rate limit chính xác trong multi-instance.
 *
 * Khi có Redis, thay thế bằng:
 *   const store = new RedisRateLimitStore(process.env.REDIS_URL!)
 *
 * Redis key pattern: `ratelimit:auth:{ip}`
 * TTL: windowMs (tự động expire)
 */
class RedisRateLimitStore implements RateLimitStore {
  // TODO(P5.x): Implement when Redis is available
  // private redis: Redis;

  get(key: string): RateLimitEntry | undefined {
    throw new Error("Redis store not implemented. Use MemoryRateLimitStore for development.");
  }

  increment(key: string, windowMs: number, maxAttempts: number): RateLimitEntry {
    throw new Error("Redis store not implemented. Use MemoryRateLimitStore for development.");
  }

  reset(key: string): void {
    throw new Error("Redis store not implemented. Use MemoryRateLimitStore for development.");
  }
}

// ============================================================
// Factory — chọn store theo environment
// ============================================================

let globalStore: RateLimitStore | null = null;

/**
 * Lấy singleton rate limit store.
 * Hiện tại: luôn dùng MemoryStore.
 * Khi có Redis: kiểm tra env REDIS_URL và trả RedisStore.
 */
export function getRateLimitStore(): RateLimitStore {
  if (globalStore) return globalStore;

  if (process.env.REDIS_URL) {
    // globalStore = new RedisRateLimitStore(process.env.REDIS_URL);
    throw new Error("Redis rate limit store not yet implemented. Set REDIS_URL and implement RedisRateLimitStore.");
  }

  globalStore = new MemoryRateLimitStore();
  return globalStore;
}

// ============================================================
// Rate Limit Check
// ============================================================

export interface CheckResult {
  allowed: boolean;
  attempts: number;
  remaining: number;
  lockedUntil: number; // 0 = không bị lock
  retryAfterMs: number; // ms còn lại trước khi retry được
}

/**
 * Kiểm tra và cập nhật rate limit cho một IP.
 * Gọi sau mỗi lần login thất bại.
 *
 * @param key - Identifier (thường là IP)
 * @param config - Cấu hình limit
 * @returns CheckResult cho response
 */
export function checkAndIncrement(
  key: string,
  config: RateLimitConfig
): CheckResult {
  const store = getRateLimitStore();
  const now = Date.now();

  const entry = store.increment(key, config.windowMs, config.maxAttempts);

  const remaining = Math.max(0, config.maxAttempts - entry.attempts);

  if (entry.lockedUntil > 0) {
    return {
      allowed: false,
      attempts: entry.attempts,
      remaining: 0,
      lockedUntil: entry.lockedUntil,
      retryAfterMs: Math.max(0, entry.lockedUntil - now),
    };
  }

  return {
    allowed: true,
    attempts: entry.attempts,
    remaining,
    lockedUntil: 0,
    retryAfterMs: 0,
  };
}

/**
 * Reset rate limit — gọi khi login thành công.
 */
export function resetRateLimit(key: string): void {
  const store = getRateLimitStore();
  store.reset(key);
}

/**
 * Lấy thông tin rate limit hiện tại — không tăng counter.
 */
export function getRateLimitStatus(key: string): CheckResult {
  const store = getRateLimitStore();
  const entry = store.get(key);

  if (!entry) {
    return {
      allowed: true,
      attempts: 0,
      remaining: AUTH_RATE_LIMIT.maxAttempts,
      lockedUntil: 0,
      retryAfterMs: 0,
    };
  }

  const now = Date.now();
  const remaining = Math.max(0, AUTH_RATE_LIMIT.maxAttempts - entry.attempts);

  return {
    allowed: entry.lockedUntil === 0,
    attempts: entry.attempts,
    remaining,
    lockedUntil: entry.lockedUntil,
    retryAfterMs: entry.lockedUntil > 0 ? Math.max(0, entry.lockedUntil - now) : 0,
  };
}

// ============================================================
// Default Config
// ============================================================

export const AUTH_RATE_LIMIT: RateLimitConfig = {
  /** 5 lần sai trong 15 phút */
  maxAttempts: 5,
  /** 15 phút */
  windowMs: 15 * 60 * 1000,
  /** Lock 15 phút khi vượt limit */
  lockDurationMs: 15 * 60 * 1000,
};

/**
 * Extract client IP từ request.
 * Hỗ trợ: X-Forwarded-For header (behind proxy/load balancer) hoặc direct connection.
 */
export function getClientIp(req: NextRequest): string {
  // X-Forwarded-For: client, proxy1, proxy2, ...
  // Chỉ lấy IP đầu tiên (client thật)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // X-Real-IP (nginx)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Fallback: connect info (chỉ hoạt động khi không qua proxy)
  // Next.js không cung cấp direct IP trong edge runtime
  return "unknown";
}

// Re-export NextRequest for convenience
import type { NextRequest } from "next/server";
