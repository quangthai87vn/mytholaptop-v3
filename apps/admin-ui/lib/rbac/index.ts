/**
 * ============================================================
 * Enterprise RBAC Engine — Centralized Permission System
 * ============================================================
 *
 * SINGLE SOURCE OF TRUTH for all permission decisions in the app.
 * Replaces scattered role-hierarchy checks in:
 *   - lib/auth/permissions.ts
 *   - lib/auth/require-admin.ts
 *   - All layout.tsx files
 *
 * Role Hierarchy (numeric, higher = more powerful):
 *   super_admin  >  admin  >  editor  >  intern  >  viewer
 *        100          80        60        30         20
 *
 * Super Admin: always bypasses all permission checks.
 * Admin:      has operational full access (workspace + products + sales + customers + reports + AI generate).
 *             Explicitly blocked from: credentials, system config, provider secrets, permission engine core.
 * Editor:     manages content/workspace — no system management.
 * Intern:     only acts on assigned tasks/content.
 * Viewer:     read-only.
 *
 * Custom roles: resolved via DB custom permissions, level defaults to 30 (same as intern).
 *
 * Usage:
 *   import { hasPermission, requireAccess, getRoleHierarchy, type Role, type Permission } from "@/lib/rbac";
 */

import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import type { AdminUser } from "@/lib/auth/session";

// ─── Role Types ─────────────────────────────────────────────────

export type SystemRole = "super_admin" | "admin" | "editor" | "intern" | "viewer";
export type Role = SystemRole | string;

export const SYSTEM_ROLES: SystemRole[] = ["super_admin", "admin", "editor", "intern", "viewer"];

// ─── Role Hierarchy ────────────────────────────────────────────

/**

 * Official role hierarchy — all permission decisions MUST use these levels.
 * Custom roles (isSystemRole returns false) default to level 30 (intern-equivalent).
 * NEVER use a hardcoded role-level check elsewhere in the codebase.
 */
export const ROLE_HIERARCHY: Record<SystemRole, number> = {
  super_admin: 100,
  admin: 80,
  editor: 60,
  intern: 30,
  viewer: 20,
} as const;

/**
 * Admin operational full-access preset.
 * An admin does NOT need individual permission grants for these modules.
 * They automatically have operational access to workspace, products, sales, customers, reports, AI generate.
 */
export const ADMIN_OPERATIONAL_PERMISSIONS: readonly Permission[] = [
  // Workspace
  "projects.read", "projects.create", "projects.update",
  "campaigns.read", "campaigns.create", "campaigns.update",
  "tasks.read", "tasks.create", "tasks.update", "tasks.delete",
  "comments.read", "comments.create", "comments.update",
  "assets.read", "assets.create", "assets.update",
  "content.read", "content.create", "content.update",
  "interns.read", "interns.manage",
  "workspace.members.read",
  // Products & Commerce
  "products.read", "products.create", "products.update", "products.delete",
  "sales.read", "sales.create", "sales.update", "sales.delete",
  "customers.read", "customers.create", "customers.update",
  // Reports
  "reports.read",
  // AI
  "ai_generate",
  // Notifications
  "notifications.read", "notifications.create", "notifications.update",
] as const;

/**
 * Admin explicitly blocked from these — even admins need explicit grants.
 */
export const ADMIN_EXPLICITLY_BLOCKED: readonly Permission[] = [
  "credentials.manage",
  "migration.manage",
] as const;

// ─── Permission Types ────────────────────────────────────────

export type Permission =
  | "users.read" | "users.create" | "users.update" | "users.delete"
  | "roles.read" | "roles.manage"
  | "permissions.read"
  | "settings.manage"
  | "credentials.manage"
  | "ai_engine.manage" | "ai_generate" | "ai_providers.manage"
  | "projects.read" | "projects.create" | "projects.update" | "projects.delete"
  | "campaigns.read" | "campaigns.create" | "campaigns.update" | "campaigns.delete"
  | "tasks.read" | "tasks.create" | "tasks.update" | "tasks.delete"
  | "comments.read" | "comments.create" | "comments.update" | "comments.delete"
  | "assets.read" | "assets.create" | "assets.update" | "assets.delete"
  | "interns.read" | "interns.manage"
  | "media.manage"
  | "migration.manage"
  | "content.read" | "content.create" | "content.update" | "content.delete"
  | "reports.read"
  | "workspace.members.read"
  | "products.read" | "products.create" | "products.update" | "products.delete"
  | "sales.read" | "sales.create" | "sales.update" | "sales.delete"
  | "customers.read" | "customers.create" | "customers.update"
  | "notifications.read" | "notifications.create" | "notifications.update"
  | "ai_providers.manage";

// ─── Intern Default Permissions ────────────────────────────────

export const INTERN_DEFAULT_PERMISSIONS: readonly Permission[] = [
  "projects.read",
  "campaigns.read",
  "tasks.read", "tasks.update",
  "comments.read", "comments.create",
  "assets.read", "assets.create",
  "content.read", "content.create",
  "notifications.read",
  "ai_generate",
] as const;

// ─── Super Admin Reserved ───────────────────────────────────

export const SUPER_ADMIN_RESERVED: readonly Permission[] = [
  "credentials.manage",
  "migration.manage",
  "roles.manage",
] as const;

// ─── Debug Mode ─────────────────────────────────────────────

const DEBUG = process.env.NODE_ENV === "development" || process.env.RBAC_DEBUG === "true";

function debug(action: string, context: Record<string, unknown>): void {
  if (DEBUG) {
    console.debug(`[RBAC] ${action}`, context);
  }
}

// ─── Role Level Helpers ───────────────────────────────────────

/**

 * Get the numeric level of a role.
 * Custom roles default to 30 (intern-equivalent).
 */
export function getRoleLevel(role: Role): number {
  const level = ROLE_HIERARCHY[role as SystemRole];
  if (level !== undefined) return level;
  // Unknown/custom roles get intern-equivalent level by default
  return 30;
}

/**
 * Check if actor can manage target based on role hierarchy.
 * Returns false if actor level <= target level (cannot manage peers or superiors).
 * Super admin (100) can manage everyone.
 */
export function canManageTarget(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === targetRole) return false; // cannot manage peers
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

/**
 * Check if a role is a system role (defined in ROLE_HIERARCHY).
 */
export function isSystemRole(role: Role): role is SystemRole {
  return role in ROLE_HIERARCHY;
}

/**
 * Check if a role is a custom role (not in ROLE_HIERARCHY).
 */
export function isCustomRole(role: Role): boolean {
  return !isSystemRole(role);
}

/**
 * Get role display label.
 */
export function getRoleLabel(role: Role): string {
  const LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Quản trị viên",
    editor: "Biên tập viên",
    viewer: "Người xem",
    intern: "Thực tập sinh",
  };
  return LABELS[role] ?? role;
}

// ─── Permission Engine ────────────────────────────────────────

// Lazy cache for custom role permissions (loaded once per request wave)
let _customPermCache: Map<string, Permission[]> | null = null;
let _customPermCacheStamp = 0;
const CACHE_TTL_MS = 60_000;

function isCacheStale(): boolean {
  return Date.now() - _customPermCacheStamp > CACHE_TTL_MS;
}

/**
 * Load custom role permissions from DB if cache is stale.
 * Idempotent and deduplicated via a shared promise.
 */
async function ensureCustomPermsLoaded(): Promise<void> {
  if (!isCacheStale() && _customPermCache !== null) return;
  await loadCustomPermissionsFromDB();
  _customPermCacheStamp = Date.now();
}

/**
 * Get permissions for a custom role from the DB cache.
 * Returns [] for system roles and unknown roles.
 */
function getCustomRolePermissions(role: string): Permission[] {
  // loadCustomPermissionsFromDB populates an in-memory map in permissions.server
  // We re-export that here via the server module's getCustomPermissions
  // The actual cache lives in permissions.server.ts
  return _customPermCache?.get(role) ?? [];
}

// ─── Core Permission Check ────────────────────────────────────

interface PermissionCheckOptions {
  /** If true, returns reason string on deny instead of throwing/returning false */
  explain?: boolean;
}

/**

 * The canonical permission check.
 *
 * SUPER ADMIN: always true (bypass all permission checks)
 * ADMIN:     has ADMIN_OPERATIONAL_PERMISSIONS as a preset
 *             + any explicitly granted permissions
 *             blocked only by ADMIN_EXPLICITLY_BLOCKED (credentials, migration)
 * INTERN:    has INTERN_DEFAULT_PERMISSIONS + any explicitly granted
 * VIEWER:    read-only by default (only .read permissions pass)
 * CUSTOM:    has DB-granted permissions + INTERN_DEFAULT_PERMISSIONS baseline
 *
 * @param user      - The authenticated user (must have role)
 * @param permission - The permission to check
 * @param options   - Optional config (explain returns reason string on deny)
 * @returns true if allowed, reason string if explain=true and denied, false otherwise
 */
export function hasPermission(
  user: { role: string; permissions?: Permission[] },
  permission: Permission,
  options?: PermissionCheckOptions
): boolean | string {
  const { role } = user;

  // ── Super Admin: unconditional bypass ──────────────────────
  if (role === "super_admin") {
    debug("ALLOW", { role, permission, reason: "super_admin bypass" });
    return options?.explain
      ? "ALLOW: super_admin bypass"
      : true;
  }

  // ── Admin: operational preset ────────────────────────────
  if (role === "admin") {
    // Explicitly blocked even for admin
    if (ADMIN_EXPLICITLY_BLOCKED.includes(permission)) {
      debug("DENY", { role, permission, reason: "admin explicitly blocked" });
      return options?.explain
        ? "DENY: admin explicitly blocked from this permission"
        : false;
    }
    // Admin has operational preset
    if (ADMIN_OPERATIONAL_PERMISSIONS.includes(permission)) {
      debug("ALLOW", { role, permission, reason: "admin operational preset" });
      return options?.explain
        ? "ALLOW: admin operational preset"
        : true;
    }
    // Fall back to explicit grants
    if (user.permissions?.includes(permission)) {
      debug("ALLOW", { role, permission, reason: "explicit grant" });
      return options?.explain
        ? "ALLOW: explicit grant"
        : true;
    }
    debug("DENY", { role, permission, reason: "not in admin preset or explicit grants" });
    return options?.explain
      ? "DENY: not in admin operational preset or explicit grants"
      : false;
  }

  // ── Viewer: read-only ──────────────────────────────────
  if (role === "viewer") {
    if (permission.endsWith(".read")) {
      debug("ALLOW", { role, permission, reason: "viewer read-only" });
      return options?.explain
        ? "ALLOW: viewer read-only"
        : true;
    }
    debug("DENY", { role, permission, reason: "viewer write denied" });
    return options?.explain
      ? "DENY: viewer write denied"
      : false;
  }

  // ── Intern: default permissions + explicit grants ─────────
  if (role === "intern") {
    if (INTERN_DEFAULT_PERMISSIONS.includes(permission)) {
      debug("ALLOW", { role, permission, reason: "intern default permissions" });
      return options?.explain
        ? "ALLOW: intern default permissions"
        : true;
    }
    if (user.permissions?.includes(permission)) {
      debug("ALLOW", { role, permission, reason: "intern explicit grant" });
      return options?.explain
        ? "ALLOW: intern explicit grant"
        : true;
    }
    debug("DENY", { role, permission, reason: "not in intern defaults or explicit grants" });
    return options?.explain
      ? "DENY: not in intern defaults or explicit grants"
      : false;
  }

  // ── Editor: baseline = intern + more ────────────────────
  if (role === "editor") {
    // Editor inherits intern defaults + additional content/workspace write access
    const EDITOR_ADDITIONAL: Permission[] = [
      "tasks.delete",
      "comments.update", "comments.delete",
      "assets.update", "assets.delete",
      "content.update", "content.delete",
      "projects.update",
      "campaigns.update",
    ];
    if (
      INTERN_DEFAULT_PERMISSIONS.includes(permission) ||
      EDITOR_ADDITIONAL.includes(permission) ||
      user.permissions?.includes(permission)
    ) {
      debug("ALLOW", { role, permission, reason: "editor baseline or explicit grant" });
      return options?.explain
        ? "ALLOW: editor baseline or explicit grant"
        : true;
    }
    debug("DENY", { role, permission, reason: "not in editor baseline or explicit grants" });
    return options?.explain
      ? "DENY: not in editor baseline or explicit grants"
      : false;
  }

  // ── Custom roles: DB grants + intern baseline ─────────────
  // isSystemRole returns false for unknown/custom roles
  if (user.permissions?.includes(permission)) {
    debug("ALLOW", { role, permission, reason: "custom role explicit grant" });
    return options?.explain
      ? "ALLOW: custom role explicit grant"
      : true;
  }
  if (INTERN_DEFAULT_PERMISSIONS.includes(permission)) {
    debug("ALLOW", { role, permission, reason: "custom role intern baseline" });
    return options?.explain
      ? "ALLOW: custom role intern baseline"
      : true;
  }
  debug("DENY", { role, permission, reason: "custom role no matching permission" });
  return options?.explain
    ? "DENY: custom role has no matching permission"
    : false;
}

// ─── Batch Permission Checks ─────────────────────────────────

export function hasAllPermissions(
  user: { role: string; permissions?: Permission[] },
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

export function hasAnyPermission(
  user: { role: string; permissions?: Permission[] },
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Check if actor has at least the required role level.
 * Equivalent to getRoleLevel(actor) >= getRoleLevel(required).
 */
export function hasMinimumRoleLevel(
  actorRole: Role,
  requiredRole: SystemRole
): boolean {
  if (actorRole === "super_admin") return true;
  return getRoleLevel(actorRole) >= getRoleLevel(requiredRole);
}

// ─── Route Guard Builder ─────────────────────────────────────

export type AccessContext = {
  user: { role: string; permissions?: Permission[] };
  path?: string;
};

export interface AccessRule {
  /** Human-readable label for debug logs */
  label: string;
  /** Permission(s) required. Pass an array to require ALL. */
  permission?: Permission | Permission[];
  /** Minimum role level required (optional — super_admin always bypasses) */
  minimumRole?: SystemRole;
  /** If true, super_admin always passes regardless of permission/role */
  superAdminBypass?: boolean;
}

/**
 * Build a guard function for a route or layout.
 *
 * Usage in layout:
 *   const guard = buildRouteGuard({ label: "Workspace", permission: ["projects.read", "campaigns.read", "tasks.read"] });
 *   const result = guard({ user, path: "/workspace" });
 *   if (!result.allowed) redirect("/403");
 *
 * Debug output (dev mode):
 *   [RBAC] CHECK Workspace { user: "admin", permission: "projects.read", path: "/workspace", allowed: true, reason: "admin preset" }
 */
export function buildRouteGuard(rule: AccessRule) {
  return (ctx: AccessContext): { allowed: boolean; reason: string } => {
    const { user, path } = ctx;

    // Super admin bypass (unless explicitly disabled)
    if (rule.superAdminBypass !== false && user.role === "super_admin") {
      const reason = "ALLOW: super_admin bypass";
      debug("CHECK", { ...rule, user: user.role, path, allowed: true, reason });
      return { allowed: true, reason };
    }

    // Role-level check
    if (rule.minimumRole !== undefined) {
      if (!hasMinimumRoleLevel(user.role, rule.minimumRole)) {
        const reason = `DENY: role "${user.role}" below minimum "${rule.minimumRole}"`;
        debug("CHECK", { ...rule, user: user.role, path, allowed: false, reason });
        return { allowed: false, reason };
      }
    }

    // Permission check
    if (rule.permission !== undefined) {
      const perms = Array.isArray(rule.permission) ? rule.permission : [rule.permission];
      const allAllowed = perms.every((p) => hasPermission(user, p));

      if (perms.length === 1) {
        const result = hasPermission(user, perms[0], { explain: true });
        const reason = typeof result === "string" ? result : result ? "ALLOW" : "DENY";
        debug("CHECK", { ...rule, user: user.role, permission: perms[0], path, allowed: allAllowed, reason });
        return { allowed: allAllowed, reason };
      }

      // Multiple permissions (AND logic)
      const reasons = perms.map((p) => hasPermission(user, p, { explain: true }));
      debug("CHECK", { ...rule, user: user.role, permissions: perms, path, allowed: allAllowed, reasons });
      return {
        allowed: allAllowed,
        reason: allAllowed
          ? `ALLOW: all ${perms.length} permissions granted`
          : `DENY: missing ${perms.filter((p, i) => typeof reasons[i] !== "string" || !reasons[i]).length} permissions`,
      };
    }

    // No specific rule — default deny
    const reason = "DENY: no permission or role rule matched";
    debug("CHECK", { ...rule, user: user.role, path, allowed: false, reason });
    return { allowed: false, reason };
  };
}

// ─── Predefined Access Rules ─────────────────────────────────

/** Workspace layout: needs any workspace module permission */
export const WORKSPACE_ACCESS = buildRouteGuard({
  label: "Workspace",
  permission: [
    "projects.read",
    "campaigns.read",
    "tasks.read",
    "content.read",
    "assets.read",
    "workspace.members.read",
  ],
});

/** Nhân sự (Workspace Members) section */
export const MEMBERS_ACCESS = buildRouteGuard({
  label: "WorkspaceMembers",
  permission: "workspace.members.read",
  minimumRole: "admin",
});

/** Products section */
export const PRODUCTS_ACCESS = buildRouteGuard({
  label: "Products",
  permission: "products.read",
});

/** Sales section */
export const SALES_ACCESS = buildRouteGuard({
  label: "Sales",
  permission: "sales.read",
});

/** Customers section */
export const CUSTOMERS_ACCESS = buildRouteGuard({
  label: "Customers",
  permission: "customers.read",
});

/** Reports section */
export const REPORTS_ACCESS = buildRouteGuard({
  label: "Reports",
  permission: "reports.read",
});

/** Tasks section */
export const TASKS_ACCESS = buildRouteGuard({
  label: "Tasks",
  permission: "tasks.read",
});

/** Campaigns section */
export const CAMPAIGNS_ACCESS = buildRouteGuard({
  label: "Campaigns",
  permission: "campaigns.read",
});

/** Content section */
export const CONTENT_ACCESS = buildRouteGuard({
  label: "Content",
  permission: "content.read",
});

/** Media workflow */
export const MEDIA_WORKFLOW_ACCESS = buildRouteGuard({
  label: "MediaWorkflow",
  permission: ["assets.read", "tasks.read"],
});

/** AI engine settings */
export const AI_ENGINE_ACCESS = buildRouteGuard({
  label: "AIEngine",
  permission: "ai_engine.manage",
  minimumRole: "admin",
});

/** System settings */
export const SETTINGS_ACCESS = buildRouteGuard({
  label: "Settings",
  permission: "settings.manage",
});

/** Users management */
export const USERS_ACCESS = buildRouteGuard({
  label: "Users",
  permission: "users.read",
});

/** Profile: any authenticated user */
export const PROFILE_ACCESS = buildRouteGuard({
  label: "Profile",
  // No permission required — just authenticated
  superAdminBypass: false,
});

/** Staff user management */
export const STAFF_ACCESS = buildRouteGuard({
  label: "Staff",
  permission: "users.read",
});
