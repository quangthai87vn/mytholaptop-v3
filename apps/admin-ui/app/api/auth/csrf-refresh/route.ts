import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { generateCsrfToken } from "@/lib/auth/csrf";

/**
 * Refresh CSRF token — gọi khi token hết hạn.
 * Cần auth vì chỉ user đã login mới được refresh.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const newToken = generateCsrfToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set("csrf_token", newToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return response;
}
