/**
 * requirePermission — Permission Guard cho API Routes
 *
 * Dùng sau requireAdminAuth() để check specific permission.
 * requireAdminAuth gắn user vào request._authUser, nên đọc từ đó.
 *
 * Usage:
 *   const authResult = await requireAdminAuth(request);
 *   if (authResult) return authResult;
 *   const permResult = requirePermission(request, "ai_engine.manage");
 *   if (permResult) return permResult;
 */

import { NextRequest, NextResponse } from "next/server";
import type { AdminUser } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";

type AuthenticatedRequest = NextRequest & { _authUser?: AdminUser };

export function requirePermission(
  request: NextRequest,
  permission: Permission
): NextResponse | void {
  const req = request as AuthenticatedRequest;
  const user = req._authUser as AdminUser | undefined;

  if (!user) {
    return NextResponse.json(
      {
        error: "Không xác định được người dùng",
        code: "USER_NOT_FOUND",
      },
      { status: 401 }
    );
  }

  if (!hasPermission(user, permission)) {
    return NextResponse.json(
      {
        error: "Không có quyền thực hiện thao tác này",
        message: `Cần quyền "${permission}" để truy cập chức năng này.`,
        code: "FORBIDDEN",
      },
      { status: 403 }
    );
  }
}
