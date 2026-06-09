/**
 * Auth Guard Helper cho Workspace API
 *
 * Hệ thống auth mới (P4.Auth):
 * - Middleware: chỉ check cookie tồn tại (Edge-compatible)
 * - requireAdminAuth(): validate session từ DB (Node.js runtime)
 * - Session lưu trong bảng admin_sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

/**
 * Kiểm tra request đã đăng nhập chưa qua session cookie.
 * Luôn validate session từ database (Node.js runtime).
 *
 * Trả về:
 * - NextResponse 401/403 nếu auth thất bại
 * - void nếu auth thành công
 *
 * Gắn validated user vào request._authUser để downstream handlers dùng.
 */
export async function requireAdminAuth(
  request: NextRequest
): Promise<NextResponse | void> {
  const sessionId = request.cookies.get(getSessionCookieName())?.value;

  if (!sessionId) {
    return NextResponse.json(
      {
        error: "Chưa đăng nhập",
        message: "Vui lòng đăng nhập để tiếp tục.",
        code: "NOT_AUTHENTICATED",
      },
      { status: 401 }
    );
  }

  const user = await validateSession(sessionId);

  if (!user) {
    return NextResponse.json(
      {
        error: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ",
        message: "Vui lòng đăng nhập lại.",
        code: "SESSION_INVALID",
      },
      { status: 401 }
    );
  }

  // Attach validated user to request for downstream handlers
  (request as NextRequest & { _authUser?: unknown })._authUser = user;

  // super_admin bypasses all write restrictions
  if (user.role === "super_admin") return;

  // Write-method guard (POST/PUT/PATCH/DELETE) — blocked for viewer
  const method = request.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (user.role === "viewer") {
      return NextResponse.json(
        {
          error: "Không có quyền thực hiện thao tác này",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }
  }
}

/**
 * Check if user has at least the required role level.
 * Includes intern in hierarchy.
 * super_admin always returns true.
 */
export function hasMinimumRole(
  userRole: string,
  requiredRole: "viewer" | "editor" | "admin" | "super_admin"
): boolean {
  if (userRole === "super_admin") return true;
  const roleHierarchy: Record<string, number> = {
    viewer: 20,
    editor: 60,
    admin: 80,
    intern: 30,
  };
  const level = roleHierarchy[userRole] ?? 30;
  return level >= (roleHierarchy[requiredRole] ?? 0);
}
