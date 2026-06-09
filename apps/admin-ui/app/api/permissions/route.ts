/**
 * GET /api/permissions — Ma trận role × permission
 *
 * Returns:
 *   - All system roles (hardcoded)
 *   - All custom active roles from admin_roles table
 *   - Permission matrix (legacy format for compatibility)
 *   - rolePermissions: Record<roleCode, Permission[]> for new UI
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import {
  hasPermission,
  SYSTEM_ROLE_DEFINITIONS,
  PERMISSION_GROUPS,
  type Permission,
} from "@/lib/auth/permissions";
import {
  loadCustomPermissionsFromDB,
  getCustomPermissions,
} from "@/lib/auth/permissions.server";
import type { AdminUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "permissions.read")) {
    return NextResponse.json(
      { error: "Không có quyền xem phân quyền.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  await loadCustomPermissionsFromDB();

  // Build roles list
  const roles: { code: string; name: string; description: string; role_type: "system" | "custom" }[] = [
    ...SYSTEM_ROLE_DEFINITIONS.map((def) => ({
      code: def.code,
      name: def.name,
      description: def.description,
      role_type: "system" as const,
    })),
  ];

  const customRows = await query<{ code: string; name: string; description: string }>(
    "SELECT code, name, description FROM admin_roles WHERE role_type = 'custom' AND is_active = TRUE ORDER BY name"
  );
  for (const r of customRows.rows) {
    roles.push({ code: r.code, name: r.name, description: r.description || "", role_type: "custom" as const });
  }

  // Build role → permissions map (new format for group-based UI)
  const rolePermissions: Record<string, Permission[]> = {};
  for (const role of roles) {
    if (role.role_type === "system") {
      const sysPerms = SYSTEM_PERMISSIONS_MAP[role.code] ?? [];
      rolePermissions[role.code] = sysPerms as Permission[];
    } else {
      rolePermissions[role.code] = getCustomPermissions(role.code) as Permission[];
    }
  }

  // Legacy matrix format (kept for compatibility)
  const matrix = PERMISSION_GROUPS.map((group) => ({
    group: group.group,
    permissions: group.permissions.map((p) => ({
      key: p.key,
      label: p.label,
      _allowed: buildRolePermissionMap(p.key, roles),
    })),
  }));

  return NextResponse.json({ roles, matrix, groups: PERMISSION_GROUPS, rolePermissions });
}

const SYSTEM_PERMISSIONS_MAP: Record<string, string[]> = {
  super_admin: [
    "users.read","users.create","users.update","users.delete",
    "roles.read","roles.manage","permissions.read",
    "settings.manage","credentials.manage",
    "ai_engine.manage","ai_generate","ai_providers.manage",
    "projects.read","projects.manage","projects.create","projects.update","projects.delete",
    "campaigns.read","campaigns.manage","campaigns.create","campaigns.update","campaigns.delete",
    "tasks.read","tasks.create","tasks.update","tasks.delete",
    "interns.manage","media.manage","migration.manage",
    "content.read","content.create","content.update","content.delete",
    "comments.read","comments.create","comments.update","comments.delete",
    "assets.read","assets.create","assets.update","assets.delete",
    "notifications.read",
  ],
  admin: [
    "users.read","roles.read","permissions.read","ai_generate",
    "projects.read","projects.manage","projects.create","projects.update",
    "campaigns.read","campaigns.manage","campaigns.create","campaigns.update",
    "tasks.read","tasks.create","tasks.update","tasks.delete",
    "interns.manage","media.manage","migration.manage",
    "content.read","content.create","content.update","content.delete",
    "comments.read","comments.create","comments.update","comments.delete",
    "assets.read","assets.create","assets.update","assets.delete",
    "notifications.read",
  ],
  editor: [
    "ai_generate",
    "tasks.read","tasks.create","tasks.update",
    "projects.read","projects.create","projects.update",
    "campaigns.read","campaigns.create","campaigns.update",
    "content.read","content.create","content.update",
    "comments.read","comments.create",
    "assets.read","assets.create",
    "notifications.read",
  ],
  viewer: [
    "tasks.read","projects.read","campaigns.read","content.read",
    "comments.read","assets.read",
    "notifications.read",
  ],
};

function buildRolePermissionMap(
  permissionKey: string,
  roles: { code: string; role_type: string }[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const role of roles) {
    if (role.role_type === "system") {
      result[role.code] = (SYSTEM_PERMISSIONS_MAP[role.code] ?? []).includes(permissionKey);
    } else {
      result[role.code] = getCustomPermissions(role.code).includes(permissionKey as Permission);
    }
  }
  return result;
}

