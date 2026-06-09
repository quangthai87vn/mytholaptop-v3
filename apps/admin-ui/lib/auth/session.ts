/**
 * Admin Auth Session Management
 *
 * Cơ chế:
 * - Session ID được tạo ngẫu nhiên (crypto random), lưu trong httpOnly cookie
 * - Sessions được lưu trong bảng admin_sessions (PostgreSQL)
 * - Database storage hoạt động với mọi Next.js runtime (Edge + Node.js)
 * - Multi-instance server đều đọc được session từ DB
 */

import { query } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from "@/lib/auth/constants";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "editor" | "viewer" | "intern";
  status: "active" | "inactive";
  last_login_at: string | null;
}

function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getSessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

/**
 * Tạo session mới cho user đã login thành công.
 * Lưu session vào database để hỗ trợ multi-instance.
 * Đồng thời tạo CSRF token để bảo vệ write operations.
 */
export async function createSession(
  userId: string
): Promise<{
  sessionId: string;
  csrfToken: string;
  cookieOptions: Record<string, unknown>;
  csrfCookieOptions: Record<string, unknown>;
}> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await query(
    `INSERT INTO admin_sessions (session_id, user_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id) DO UPDATE
       SET expires_at = EXCLUDED.expires_at`,
    [sessionId, userId, expiresAt.toISOString()]
  );

  // Generate CSRF token for this session
  const csrfBytes = new Uint8Array(32);
  crypto.getRandomValues(csrfBytes);
  const csrfToken = Array.from(csrfBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  return {
    sessionId,
    csrfToken,
    cookieOptions: {
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: SESSION_MAX_AGE,
      path: "/",
    },
    csrfCookieOptions: {
      name: "csrf_token",
      value: csrfToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: SESSION_MAX_AGE,
      path: "/",
    },
  };
}

/**
 * Validate session từ sessionId trong cookie.
 * Đọc trực tiếp từ database (Edge-compatible).
 */
export async function validateSession(
  sessionId: string | undefined
): Promise<AdminUser | null> {
  if (!sessionId) return null;

  try {
    // Lấy session + user trong 1 query
    const { rows } = await query<{
      user_id: string;
      expires_at: string;
      user_email: string;
      user_full_name: string;
      user_role: "super_admin" | "admin" | "editor" | "viewer" | "intern";
      user_status: "active" | "inactive";
      user_last_login_at: string | null;
    }>(
      `SELECT
         s.user_id,
         s.expires_at,
         u.email AS user_email,
         u.full_name AS user_full_name,
         u.role AS user_role,
         u.status AS user_status,
         u.last_login_at AS user_last_login_at
       FROM admin_sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.session_id = $1`,
      [sessionId]
    );

    if (!rows[0]) return null;

    // Check expiration
    if (new Date(rows[0].expires_at) < new Date()) {
      // Cleanup expired session
      await query("DELETE FROM admin_sessions WHERE session_id = $1", [sessionId]);
      return null;
    }

    // Check user status
    if (rows[0].user_status !== "active") {
      await query("DELETE FROM admin_sessions WHERE session_id = $1", [sessionId]);
      return null;
    }

    return {
      id: rows[0].user_id,
      email: rows[0].user_email,
      full_name: rows[0].user_full_name,
      role: rows[0].user_role,
      status: rows[0].user_status,
      last_login_at: rows[0].user_last_login_at,
    };
  } catch {
    return null;
  }
}

/**
 * Xóa session (logout). Xóa cả cookie và database record.
 */
export async function destroySession(
  sessionId: string | undefined
): Promise<void> {
  if (sessionId) {
    try {
      await query("DELETE FROM admin_sessions WHERE session_id = $1", [sessionId]);
    } catch {
      // Ignore DB errors on logout
    }
  }
}

/**
 * Tạo cookie options để clear session.
 */
export function getClearSessionCookieOptions(): Record<string, unknown> {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}
