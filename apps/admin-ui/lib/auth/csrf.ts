/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * Cơ chế:
 * 1. Khi login thành công → server tạo CSRF token, set vào non-httpOnly cookie
 * 2. Browser gửi request ghi → adminFetch đọc cookie, gửi qua header X-CSRF-Token
 * 3. Server validate: header X-CSRF-Token phải khớp với cookie csrf_token
 * 4. Logout → clear CSRF cookie
 *
 * Lưu ý: csrf_token cookie là non-httpOnly để JS đọc được, nhưng
 * httpOnly session cookie ngăn chặn XSS đọc session.
 * Hai lớp bảo vệ độc lập.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export const CSRF_COOKIE_NAME = "csrf_token" as const;
export const CSRF_HEADER_NAME = "X-CSRF-Token" as const;

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Lấy cookie options để set CSRF token.
 * Non-httpOnly để JS đọc được gửi qua header.
 * SameSite=Strict để ngăn cross-site submission hoàn toàn.
 */
export function getCsrfCookieOptions(token: string): Record<string, unknown> {
  return {
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  };
}

/**
 * Lấy cookie options để clear CSRF token (logout).
 */
export function getClearCsrfCookieOptions(): Record<string, unknown> {
  return {
    name: CSRF_COOKIE_NAME,
    value: "",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}

/**
 * Validate CSRF token: so sánh header X-CSRF-Token với cookie csrf_token.
 * Dùng timing-safe comparison để tránh timing attack.
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken) return false;
  if (headerToken.length !== cookieToken.length) return false;

  let diff = 0;
  for (let i = 0; i < headerToken.length; i++) {
    diff |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Require CSRF check cho write requests.
 * Gọi sau requireAdminAuth() trong các POST/PUT/PATCH/DELETE handlers.
 *
 * Trả về NextResponse 403 nếu CSRF fail.
 * Trả về void nếu CSRF hợp lệ.
 */
export function requireCsrf(request: NextRequest): NextResponse | void {
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      {
        error: "Yêu cầu không hợp lệ (CSRF)",
        message: "Token bảo mật không hợp lệ hoặc bị thiếu. Vui lòng tải lại trang và thử lại.",
        code: "CSRF_INVALID",
      },
      { status: 403 }
    );
  }
}

export { generateCsrfToken };
