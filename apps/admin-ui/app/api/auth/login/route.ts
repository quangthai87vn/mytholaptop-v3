import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";
import {
  checkAndIncrement,
  resetRateLimit,
  getRateLimitStatus,
  getClientIp,
  AUTH_RATE_LIMIT,
} from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // ================================================================
    // Rate limit check — trước khi parse body
    // ================================================================
    const clientIp = getClientIp(request);

    // Kiểm tra trạng thái hiện tại (không tăng counter)
    const currentStatus = getRateLimitStatus(clientIp);

    if (!currentStatus.allowed) {
      const retryAfterSec = Math.ceil(currentStatus.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: "Bạn đã đăng nhập sai quá nhiều lần.",
          message: `Vui lòng chờ ${retryAfterSec} giây trước khi thử lại. Khoảng thời gian chờ: ${Math.ceil(currentStatus.retryAfterMs / 60000)} phút.`,
          code: "RATE_LIMITED",
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(AUTH_RATE_LIMIT.maxAttempts),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(currentStatus.lockedUntil / 1000)),
          },
        }
      );
    }

    // ================================================================
    // Parse body
    // ================================================================
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email và password là bắt buộc", code: "MISSING_CREDENTIALS" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail.length > 255) {
      return NextResponse.json(
        { error: "Email không hợp lệ", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    // ================================================================
    // Fetch user from database
    // ================================================================
    const { query } = await import("@/lib/db");
    const { rows } = await query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      status: string;
      disabled_at: string | null;
    }>(
      "SELECT id, email, password_hash, full_name, role, status, disabled_at FROM admin_users WHERE email = $1",
      [normalizedEmail]
    );

    if (!rows[0]) {
      // Timing-attack delay + rate limit
      await bcrypt.compare(password, "$2a$12$notfoundhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
      recordFailedAttempt(clientIp);

      return NextResponse.json(
        { error: "Email hoặc password không đúng", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const user = rows[0];

    // Check if user is active (status = active AND never disabled)
    if (user.status !== "active" || user.disabled_at !== null) {
      return NextResponse.json(
        { error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.", code: "ACCOUNT_DISABLED" },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      recordFailedAttempt(clientIp);

      // Log không có password — chỉ có email và IP
      console.warn(`[Auth/Login] Login failed — email=${normalizedEmail}, ip=${clientIp}`);

      return NextResponse.json(
        { error: "Email hoặc password không đúng", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // ================================================================
    // Login thành công — reset rate limit
    // ================================================================
    resetRateLimit(clientIp);

    // Update last_login_at
    await query(
      "UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Create session (includes CSRF token)
    const { cookieOptions, csrfCookieOptions } = await createSession(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });

    // Set session cookie (httpOnly, Lax)
    response.cookies.set(
      cookieOptions.name as string,
      cookieOptions.value as string,
      {
        httpOnly: cookieOptions.httpOnly as boolean,
        secure: cookieOptions.secure as boolean,
        sameSite: cookieOptions.sameSite as "lax",
        maxAge: cookieOptions.maxAge as number,
        path: cookieOptions.path as string,
      }
    );

    // Set CSRF cookie (non-httpOnly, Lax)
    // JavaScript có thể đọc cookie này để gửi X-CSRF-Token header
    response.cookies.set(
      csrfCookieOptions.name as string,
      csrfCookieOptions.value as string,
      {
        httpOnly: false,
        secure: csrfCookieOptions.secure as boolean,
        sameSite: "lax" as const,
        maxAge: csrfCookieOptions.maxAge as number,
        path: csrfCookieOptions.path as string,
      }
    );

    return response;
  } catch (error) {
    console.error("[Auth/Login] Error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống. Vui lòng thử lại sau.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * Ghi nhận lần đăng nhập thất bại và trả về thông tin rate limit.
 */
function recordFailedAttempt(clientIp: string) {
  const result = checkAndIncrement(clientIp, AUTH_RATE_LIMIT);

  if (!result.allowed) {
    // Log rõ ràng khi bị lock
    const waitMin = Math.ceil(result.retryAfterMs / 60000);
    console.warn(
      `[Auth/Login] IP locked after too many failed attempts — ip=${clientIp}, lockedUntil=${result.lockedUntil}, retryAfter=${waitMin}min`
    );
  }
}
