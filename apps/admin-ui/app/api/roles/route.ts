/**
 * Roles API — GET list + POST create
 * Path: /api/roles
 *
 * GET  — List all roles (system + custom)
 * POST — Create a custom role (super_admin or roles.manage required)
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import {
  hasPermission,
  SYSTEM_ROLE_DEFINITIONS,
  isSystemRole,
  type Permission,
} from "@/lib/auth/permissions";
import {
  loadCustomPermissionsFromDB,
  getCustomPermissions,
} from "@/lib/auth/permissions.server";
import type { AdminUser } from "@/lib/auth/session";

// ─── GET /api/roles ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "roles.read")) {
    return NextResponse.json(
      { error: "Không có quyền xem vai trò.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  await loadCustomPermissionsFromDB();

  const countResult = await query<{ role: string; count: string }>(
    "SELECT role, COUNT(*) as count FROM admin_users WHERE status = 'active' GROUP BY role"
  );
  const countMap: Record<string, number> = {};
  countResult.rows.forEach((r) => {
    countMap[r.role] = parseInt(r.count, 10);
  });

  const systemRoles = SYSTEM_ROLE_DEFINITIONS.map((def) => ({
    code: def.code,
    name: def.name,
    description: def.description,
    role_type: "system" as const,
    is_active: true,
    staffCount: countMap[def.code] || 0,
  }));

  const customRows = await query<{
    code: string;
    name: string;
    description: string;
    is_active: boolean;
  }>(
    "SELECT code, name, description, is_active FROM admin_roles WHERE role_type = 'custom' ORDER BY name"
  );

  const customRoles = customRows.rows.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.description || "",
    role_type: "custom" as const,
    is_active: r.is_active,
    staffCount: countMap[r.code] || 0,
    permissions: getCustomPermissions(r.code),
  }));

  return NextResponse.json({
    data: [...systemRoles, ...customRoles],
    total: systemRoles.length + customRoles.length,
  });
}

// ─── POST /api/roles ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "roles.manage")) {
    return NextResponse.json(
      { error: "Không có quyền tạo vai trò.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  let body: { code?: string; name?: string; description?: string; permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ.", code: "INVALID_BODY" }, { status: 400 });
  }

  const { code, name, description, permissions } = body;

  if (!code || typeof code !== "string" || code.length < 2 || code.length > 50 || !/^[a-z0-9_]+$/.test(code)) {
    return NextResponse.json(
      { error: "Mã vai trò phải 2-50 ký tự, chỉ chữ thường, số và dấu gạch dưới.", code: "INVALID_CODE" },
      { status: 400 }
    );
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Tên vai trò phải từ 2 ký tự trở lên.", code: "INVALID_NAME" },
      { status: 400 }
    );
  }
  if (isSystemRole(code)) {
    return NextResponse.json(
      { error: "Mã vai trò này đã tồn tại trong hệ thống.", code: "CODE_EXISTS" },
      { status: 409 }
    );
  }

  const existing = await query<{ code: string }>(
    "SELECT code FROM admin_roles WHERE code = $1", [code]
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Mã vai trò đã tồn tại.", code: "CODE_EXISTS" }, { status: 409 });
  }

  const VALID_PERMS = new Set<string>([
    "users.read","users.create","users.update","users.delete",
    "roles.read","roles.manage","permissions.read",
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
  if (permissions && Array.isArray(permissions)) {
    for (const p of permissions) {
      if (typeof p === "string" && VALID_PERMS.has(p)) {
        validPerms.push(p as Permission);
      }
    }
  }

  await query(
    `INSERT INTO admin_roles (code, name, description, role_type, is_active) VALUES ($1, $2, $3, 'custom', TRUE)`,
    [code, name.trim(), (description || "").trim()]
  );

  if (validPerms.length > 0) {
    const vals = validPerms.map((_, i) => `($1, $${i + 2})`).join(", ");
    await query(
      `INSERT INTO admin_role_permissions (role_code, permission) VALUES ${vals}`,
      [code, ...validPerms]
    );
  }

  return NextResponse.json({
    data: {
      code,
      name: name.trim(),
      description: (description || "").trim(),
      role_type: "custom",
      is_active: true,
      staffCount: 0,
      permissions: validPerms,
    },
  }, { status: 201 });
}
