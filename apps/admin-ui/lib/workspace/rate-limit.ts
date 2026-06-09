/**
 * Workspace Write API Rate Limiter
 *
 * P5.3: Chống spam API ghi dữ liệu Workspace.
 *
 * Cơ chế:
 * - Ưu tiên theo userId (từ session) nếu có
 * - Fallback theo IP nếu chưa đăng nhập
 * - Tái sử dụng MemoryRateLimitStore từ lib/auth/rate-limit.ts
 *
 * ⚠️ Memory store không hoạt động đúng trong multi-instance deployment.
 *    Thiết kế interface để dễ thay bằng Redis.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  getRateLimitStore,
  type RateLimitConfig,
  type CheckResult,
} from "@/lib/auth/rate-limit";

// ============================================================
// Config
// ============================================================

export const WORKSPACE_RATE_LIMIT: RateLimitConfig = {
  /** 60 requests / 1 phút */
  maxAttempts: 60,
  /** 1 phút */
  windowMs: 60 * 1000,
  /** Lock 1 phút khi vượt limit */
  lockDurationMs: 60 * 1000,
};

// ============================================================
// Key Extraction
// ============================================================

export interface RateLimitKey {
  key: string;
  source: "user" | "ip";
}

/**
 * Lấy rate limit key: ưu tiên userId từ session, fallback IP.
 * Không log sensitive data.
 */
export async function getRateLimitKey(req: NextRequest): Promise<RateLimitKey> {
  // Thử lấy userId từ session (không log email/name)
  const sessionId = req.cookies.get("admin_session")?.value;

  if (sessionId) {
    try {
      const user = await validateSession(sessionId);
      if (user) {
        return { key: `ws:user:${user.id}`, source: "user" };
      }
    } catch {
      // Session validation failed — fall through to IP
    }
  }

  // Fallback: dùng IP
  return { key: `ws:ip:${getClientIp(req)}`, source: "ip" };
}

/**
 * Tạo HTTP 429 response cho workspace rate limit.
 * Không log request body hay sensitive data.
 */
export function workspaceRateLimitResponse(result: CheckResult): NextResponse {
  return NextResponse.json(
    {
      error: "Quá nhiều yêu cầu",
      code: "RATE_LIMIT_EXCEEDED",
      message:
        result.remaining === 0
          ? "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại."
          : `Còn lại ${result.remaining} yêu cầu trong phút này.`,
      retryAfterMs: result.retryAfterMs,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(WORKSPACE_RATE_LIMIT.maxAttempts),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(
          Math.ceil((Date.now() + result.retryAfterMs) / 1000)
        ),
      },
    }
  );
}

/**
 * Kiểm tra và tăng rate limit counter cho workspace write API.
 * Gọi ở đầu mỗi write handler.
 *
 * @param req - NextRequest để extract user/IP
 * @param config - Rate limit config (mặc định WORKSPACE_RATE_LIMIT)
 * @returns CheckResult — allowed=true nếu được phép, 429 response đã gửi nếu bị block
 * @returns null nếu request bị rate-limit (response đã được gửi)
 */
export async function checkWorkspaceRateLimit(
  req: NextRequest,
  config: RateLimitConfig = WORKSPACE_RATE_LIMIT
): Promise<{ allowed: true; key: RateLimitKey } | { allowed: false; response: NextResponse }> {
  const { key } = await getRateLimitKey(req);
  const store = getRateLimitStore();
  const now = Date.now();

  const entry = store.increment(key, config.windowMs, config.maxAttempts);
  const remaining = Math.max(0, config.maxAttempts - entry.attempts);

  if (entry.lockedUntil > 0) {
    const result: CheckResult = {
      allowed: false,
      attempts: entry.attempts,
      remaining: 0,
      lockedUntil: entry.lockedUntil,
      retryAfterMs: Math.max(0, entry.lockedUntil - now),
    };
    return { allowed: false, response: workspaceRateLimitResponse(result) };
  }

  return { allowed: true, key: { key, source: "user" } };
}

// ============================================================
// Helpers (from lib/auth/rate-limit.ts)
// ============================================================

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "editor" | "viewer";
  status: "active" | "inactive";
}

async function validateSession(sessionId: string): Promise<AdminUser | null> {
  try {
    const { rows } = await query<{
      user_id: string;
      expires_at: string;
      user_email: string;
      user_full_name: string;
      user_role: "super_admin" | "admin" | "editor" | "viewer";
      user_status: "active" | "inactive";
    }>(
      `SELECT
         s.user_id,
         s.expires_at,
         u.email AS user_email,
         u.full_name AS user_full_name,
         u.role AS user_role,
         u.status AS user_status
       FROM admin_sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.session_id = $1`,
      [sessionId]
    );

    if (!rows[0]) return null;

    const row = rows[0];
    const expiresAt = new Date(row.expires_at);
    if (expiresAt < new Date()) return null;

    return {
      id: row.user_id,
      email: row.user_email,
      full_name: row.user_full_name,
      role: row.user_role,
      status: row.user_status,
    };
  } catch {
    return null;
  }
}
