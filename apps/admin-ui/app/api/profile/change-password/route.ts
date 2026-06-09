/**
 * P8.2.17: Change Password API
 * POST /api/profile/change-password
 *
 * Security:
 * - requireAdminAuth() — must be logged in
 * - requireCsrf() — POST requires valid CSRF token
 * - Validates current password before updating
 * - Logs action to audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { query } from "@/lib/db";
import { writeAuditLog, buildAuditEntry, extractIpAddress } from "@/lib/auth/audit-log";

const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  new_password: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự").max(128),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirm_password"],
});

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & { _authUser?: { id: string; email: string; full_name: string; role: string } })._authUser!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body không hợp lệ", code: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstKey = Object.keys(fieldErrors)[0];
    const firstMsg = fieldErrors[firstKey]?.[0] || "Dữ liệu không hợp lệ";
    return NextResponse.json({ error: firstMsg, code: "VALIDATION_ERROR" }, { status: 422 });
  }

  const { current_password, new_password } = parsed.data;

  try {
    // 1. Verify current password
    const { rows } = await query<{ password_hash: string }>(
      `SELECT password_hash FROM admin_users WHERE id = $1`,
      [authUser.id]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản", code: "USER_NOT_FOUND" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng", code: "INVALID_CURRENT_PASSWORD" },
        { status: 400 }
      );
    }

    // 2. Hash new password
    const newHash = await bcrypt.hash(new_password, 12);

    // 3. Update password
    await query(
      `UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, authUser.id]
    );

    // 4. Audit log
    const auditEntry = buildAuditEntry(
      {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.full_name,
        role: authUser.role as never,
        status: "active",
        last_login_at: null,
      },
      "user.password_reset",
      authUser.id,
      authUser.email,
      authUser.full_name,
      undefined,
      undefined,
      { ip: extractIpAddress(req), userAgent: req.headers.get("user-agent") }
    );
    await writeAuditLog(auditEntry);

    return NextResponse.json({ message: "Đổi mật khẩu thành công" }, { status: 200 });
  } catch (err) {
    console.error("[ChangePassword] DB error:", err);
    return NextResponse.json({ error: "Lỗi khi đổi mật khẩu", code: "DB_ERROR" }, { status: 500 });
  }
}
