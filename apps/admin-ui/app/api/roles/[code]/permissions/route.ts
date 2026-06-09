/**
 * Role Permissions API
 * Path: /api/roles/[code]/permissions
 *
 * GET  — Get permissions for a role
 * PUT  — Set permissions for a custom role (replaces all)
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
  setCustomPermissions,
  getCustomPermissions,
  invalidateCustomPermissionsCache,
} from "@/lib/auth/permissions.server";
import type { AdminUser } from "@/lib/auth/session";

type Params = { params: Promise<{ code: string }> };

// ─── GET /api/roles/[code]/permissions ────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "permissions.read")) {
    return NextResponse.json(
      { error: "Không có quyền xem phân quyền.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { code } = await params;
  await loadCustomPermissionsFromDB();

  const perms = getCustomPermissions(code);
  return NextResponse.json({ data: perms });
}

// ─── PUT /api/roles/[code]/permissions ────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: Params) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "roles.manage")) {
    return NextResponse.json(
      { error: "Không có quyền chỉnh phân quyền.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { code } = await params;

  if (isSystemRole(code)) {
    return NextResponse.json(
      { error: "Không thể chỉnh phân quyền cho vai trò hệ thống.", code: "SYSTEM_ROLE" },
      { status: 403 }
    );
  }

  // Verify role exists
  const existing = await query<{ code: string }>(
    "SELECT code FROM admin_roles WHERE code = $1",
    [code]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Vai trò không tồn tại.", code: "NOT_FOUND" }, { status: 404 });
  }

  let body: { permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ.", code: "INVALID_BODY" }, { status: 400 });
  }

  const { permissions } = body;

  if (!Array.isArray(permissions)) {
    return NextResponse.json(
      { error: "permissions phải là một mảng.", code: "INVALID_PERMISSIONS" },
      { status: 400 }
    );
  }

  // Validate permissions
  const validPermSet = new Set<string>([
    "users.read","users.create","users.update","users.delete",
    "roles.read","permissions.read",
    "settings.manage","credentials.manage",
    "ai_engine.manage","ai_generate","ai_providers.manage",
    "projects.read","projects.manage","projects.create","projects.update","projects.delete",
    "campaigns.read","campaigns.manage","campaigns.create","campaigns.update","campaigns.delete",
    "tasks.read","tasks.create","tasks.update","tasks.delete",
    "comments.read","comments.create","comments.update","comments.delete",
    "assets.read","assets.create","assets.update","assets.delete",
    "interns.manage","media.manage","migration.manage",
    "content.read","content.create","content.update","content.delete",
  ]);

  const validPerms: Permission[] = [];
  for (const p of permissions) {
    if (typeof p === "string" && validPermSet.has(p)) {
      validPerms.push(p as Permission);
    }
  }

  // Replace permissions in DB — delete old, insert new
  await query("DELETE FROM admin_role_permissions WHERE role_code = $1", [code]);

  if (validPerms.length > 0) {
    // ($1, $2), ($1, $3), ... — $1 is role_code, $2..$N are permissions
    const permValues = validPerms.map((_p, i) => `($1, $${i + 2})`).join(", ");
    await query(
      `INSERT INTO admin_role_permissions (role_code, permission) VALUES ${permValues}`,
      [code, ...validPerms]
    );
  }

  // Update in-memory cache
  setCustomPermissions(code, validPerms);
  invalidateCustomPermissionsCache();

  return NextResponse.json({ data: validPerms });
}
