import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { loadCustomPermissionsFromDB, getCustomPermissions } from "@/lib/auth/permissions.server";
import {
  SYSTEM_ROLE_PERMISSIONS,
  ADMIN_OPERATIONAL_PERMISSIONS,
  INTERN_DEFAULT_PERMISSIONS,
  EDITOR_ADDITIONAL_PERMISSIONS,
  type Permission,
} from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(getSessionCookieName())?.value;
  const user = await validateSession(sessionId);

  if (!user) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  // Load custom role permissions into server cache
  await loadCustomPermissionsFromDB();

  let permissions: Permission[] = [];

  // ── Super Admin: all permissions ───────────────────────────────
  if (user.role === "super_admin") {
    // Super admin bypasses everything — return empty for client (bypass always true)
    permissions = [];
  }
  // ── Admin: operational preset ─────────────────────────────────
  else if (user.role === "admin") {
    permissions = [...ADMIN_OPERATIONAL_PERMISSIONS];
    // Merge any explicit DB grants
    const dbPerms = getCustomPermissions(user.role);
    const unique = new Set([...permissions, ...dbPerms]);
    permissions = Array.from(unique) as Permission[];
  }
  // ── Editor: intern baseline + editor additional ─────────────
  else if (user.role === "editor") {
    permissions = [...INTERN_DEFAULT_PERMISSIONS, ...EDITOR_ADDITIONAL_PERMISSIONS];
    const dbPerms = getCustomPermissions(user.role);
    const unique = new Set([...permissions, ...dbPerms]);
    permissions = Array.from(unique) as Permission[];
  }
  // ── Intern ──────────────────────────────────────────────────
  else if (user.role === "intern") {
    permissions = [...INTERN_DEFAULT_PERMISSIONS];
    const dbPerms = getCustomPermissions(user.role);
    const unique = new Set([...permissions, ...dbPerms]);
    permissions = Array.from(unique) as Permission[];
  }
  // ── Viewer: all .read permissions ────────────────────────────
  else if (user.role === "viewer") {
    // Load all read permissions from system roles
    const sysPerms = SYSTEM_ROLE_PERMISSIONS["viewer"] ?? [];
    permissions = [...sysPerms];
    const dbPerms = getCustomPermissions(user.role);
    const unique = new Set([...permissions, ...dbPerms]);
    permissions = Array.from(unique) as Permission[];
  }
  // ── Custom roles: DB grants + intern baseline ───────────────
  else {
    const customPerms = getCustomPermissions(user.role);
    if (customPerms.length > 0) {
      permissions = [...customPerms];
    }
    // Always merge intern baseline for custom roles
    const unique = new Set([...permissions, ...INTERN_DEFAULT_PERMISSIONS]);
    permissions = Array.from(unique) as Permission[];
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    permissions,
    last_login_at: user.last_login_at,
  });
}
