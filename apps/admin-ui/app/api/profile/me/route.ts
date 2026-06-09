/**
 * P8.2.17: Current user profile API
 * GET /api/profile/me — get profile + permissions
 * PUT /api/profile/me — update own profile (full_name only — no avatar_url in DB)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { query } from "@/lib/db";
import { writeAuditLog, buildAuditEntry, extractIpAddress } from "@/lib/auth/audit-log";
import {
  SYSTEM_ROLE_PERMISSIONS,
  INTERN_DEFAULT_PERMISSIONS,
  type Permission,
} from "@/lib/auth/permissions";

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự").max(255),
});

async function getPermissionsForRole(role: string): Promise<Permission[]> {
  const systemPerms = SYSTEM_ROLE_PERMISSIONS[role as keyof typeof SYSTEM_ROLE_PERMISSIONS];
  if (systemPerms) return systemPerms;

  const { rows: permRows } = await query<{ permission: string }>(
    `SELECT permission FROM admin_role_permissions WHERE role_code = $1`,
    [role]
  );
  const perms = permRows.map((r) => r.permission as Permission);
  if (perms.length === 0 && role === "intern") {
    return INTERN_DEFAULT_PERMISSIONS;
  }
  return perms;
}

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & {
    _authUser?: { id: string; email: string; full_name: string; role: string };
  })._authUser!;

  try {
    const { rows } = await query<{
      id: string; email: string; full_name: string;
      role: string; status: string;
      last_login_at: string | null; created_at: string;
    }>(
      `SELECT id, email, full_name, role, status, last_login_at, created_at
       FROM admin_users WHERE id = $1`,
      [authUser.id]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    const permissions = await getPermissionsForRole(rows[0].role);

    return NextResponse.json({
      user: rows[0],
      permissions,
    }, { status: 200 });
  } catch (err) {
    console.error("[Profile GET] DB error:", err);
    return NextResponse.json({ error: "Lỗi khi tải thông tin" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & {
    _authUser?: { id: string; email: string; full_name: string; role: string };
  })._authUser!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body không hợp lệ" }, { status: 400 });
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstKey = Object.keys(fieldErrors)[0];
    const firstMsg = fieldErrors[firstKey]?.[0] || "Dữ liệu không hợp lệ";
    return NextResponse.json({ error: firstMsg, code: "VALIDATION_ERROR" }, { status: 422 });
  }

  const { full_name } = parsed.data;

  try {
    const oldName = authUser.full_name;
    await query(
      `UPDATE admin_users SET full_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [full_name, authUser.id]
    );

    const { rows } = await query<{
      id: string; email: string; full_name: string;
      role: string; status: string;
    }>(
      `SELECT id, email, full_name, role, status FROM admin_users WHERE id = $1`,
      [authUser.id]
    );

    // Audit log — profile updated
    await writeAuditLog(buildAuditEntry(
      {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.full_name,
        role: authUser.role as never,
        status: "active",
        last_login_at: null,
      },
      "user.password_reset" as never,
      authUser.id,
      authUser.email,
      authUser.full_name,
      { full_name: oldName },
      { full_name },
      { ip: extractIpAddress(req), userAgent: req.headers.get("user-agent") }
    ));

    return NextResponse.json({ user: rows[0], message: "Cập nhật hồ sơ thành công" }, { status: 200 });
  } catch (err) {
    console.error("[Profile PUT] DB error:", err);
    return NextResponse.json({ error: "Lỗi khi cập nhật hồ sơ" }, { status: 500 });
  }
}
