/**
 * Role CRUD by code — GET / PUT / DELETE
 * Path: /api/roles/[code]
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import {
  hasPermission,
  isSystemRole,
  type Permission,
} from "@/lib/auth/permissions";
import {
  loadCustomPermissionsFromDB,
  getCustomPermissions,
  setCustomPermissions,
  clearCustomPermissions,
  invalidateCustomPermissionsCache,
} from "@/lib/auth/permissions.server";
import type { AdminUser } from "@/lib/auth/session";

type Params = { params: Promise<{ code: string }> };

// ─── GET /api/roles/[code] ─────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "roles.read")) {
    return NextResponse.json(
      { error: "Không có quyền xem vai trò.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { code } = await params;
  await loadCustomPermissionsFromDB();

  if (isSystemRole(code)) {
    return NextResponse.json(
      { error: "Không xem được chi tiết vai trò hệ thống qua endpoint này.", code: "SYSTEM_ROLE" },
      { status: 400 }
    );
  }

  const result = await query<{
    code: string;
    name: string;
    description: string;
    is_active: boolean;
    role_type: string;
  }>(
    "SELECT code, name, description, is_active, role_type FROM admin_roles WHERE code = $1",
    [code]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Vai trò không tồn tại.", code: "NOT_FOUND" }, { status: 404 });
  }

  const row = result.rows[0];
  const staffCountResult = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM admin_users WHERE role = $1 AND status = 'active'",
    [code]
  );

  return NextResponse.json({
    data: {
      ...row,
      staffCount: parseInt(staffCountResult.rows[0]?.count ?? "0", 10),
      permissions: getCustomPermissions(code),
    },
  });
}

// ─── PUT /api/roles/[code] ─────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "roles.manage")) {
    return NextResponse.json(
      { error: "Không có quyền sửa vai trò.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { code } = await params;

  if (isSystemRole(code)) {
    return NextResponse.json(
      { error: "Không thể sửa vai trò hệ thống.", code: "SYSTEM_ROLE" },
      { status: 403 }
    );
  }

  let body: { name?: string; description?: string; is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ.", code: "INVALID_BODY" }, { status: 400 });
  }

  const { name, description, is_active } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Tên vai trò phải từ 2 ký tự trở lên.", code: "INVALID_NAME" },
      { status: 400 }
    );
  }

  const existing = await query<{ code: string }>(
    "SELECT code FROM admin_roles WHERE code = $1",
    [code]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Vai trò không tồn tại.", code: "NOT_FOUND" }, { status: 404 });
  }

  await query(
    `UPDATE admin_roles SET name = $1, description = $2, is_active = $3, updated_at = NOW()
     WHERE code = $4`,
    [name.trim(), (description || "").trim(), is_active ?? true, code]
  );

  invalidateCustomPermissionsCache();

  return NextResponse.json({
    data: {
      code,
      name: name.trim(),
      description: (description || "").trim(),
      is_active: is_active ?? true,
    },
  });
}

// ─── DELETE /api/roles/[code] ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "roles.manage")) {
    return NextResponse.json(
      { error: "Không có quyền xóa vai trò.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { code } = await params;

  if (isSystemRole(code)) {
    return NextResponse.json(
      { error: "Không thể xóa vai trò hệ thống.", code: "SYSTEM_ROLE" },
      { status: 403 }
    );
  }

  // Check role exists
  const existing = await query<{ code: string }>(
    "SELECT code FROM admin_roles WHERE code = $1",
    [code]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Vai trò không tồn tại.", code: "NOT_FOUND" }, { status: 404 });
  }

  // Check no users assigned
  const userCount = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM admin_users WHERE role = $1",
    [code]
  );
  if (parseInt(userCount.rows[0]?.count ?? "0", 10) > 0) {
    return NextResponse.json(
      { error: `Vai trò đang có ${userCount.rows[0].count} người dùng. Chuyển họ sang vai trò khác trước khi xóa.`, code: "HAS_USERS" },
      { status: 409 }
    );
  }

  // Delete role (CASCADE removes permissions)
  await query("DELETE FROM admin_roles WHERE code = $1", [code]);
  clearCustomPermissions(code);
  invalidateCustomPermissionsCache();

  return NextResponse.json({ success: true });
}
