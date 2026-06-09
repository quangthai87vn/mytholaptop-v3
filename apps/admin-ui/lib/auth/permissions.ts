/**
 * RBAC — Role-Based Access Control
 *
 * Source of truth:
 *   System roles (super_admin, admin, editor, viewer): hardcoded in SYSTEM_ROLE_PERMISSIONS
 *   Custom roles (e.g. intern): stored in admin_roles + admin_role_permissions tables
 *
 * Permission format: "{resource}.{action}"
 * Ví dụ: users.read, tasks.create, credentials.manage
 */

import type { AdminUser } from "@/lib/auth/session";
export type { AdminUser } from "@/lib/auth/session";
import { customRolePerms } from "@/lib/auth/permissions-core";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type Role = "super_admin" | "admin" | "editor" | "viewer" | "intern";

export type Permission =
  | "users.read" | "users.create" | "users.update" | "users.delete"
  | "roles.read" | "roles.manage" | "permissions.read"
  | "settings.manage" | "credentials.manage"
  | "ai_engine.manage" | "ai_generate" | "ai_providers.manage"
  | "products.read" | "products.manage" | "products.create" | "products.update" | "products.delete"
  | "sales.read" | "sales.create" | "sales.update" | "sales.delete"
  | "customers.read" | "customers.create" | "customers.update"
  | "projects.read" | "projects.manage" | "projects.create" | "projects.update" | "projects.delete"
  | "campaigns.read" | "campaigns.manage" | "campaigns.create" | "campaigns.update" | "campaigns.delete"
  | "tasks.create" | "tasks.update" | "tasks.delete" | "tasks.read"
  | "interns.read" | "interns.manage" | "media.manage" | "migration.manage"
  | "content.create" | "content.update" | "content.delete" | "content.read"
  | "comments.read" | "comments.create" | "comments.update" | "comments.delete"
  | "assets.read" | "assets.create" | "assets.update" | "assets.delete"
  | "notifications.read" | "notifications.create" | "notifications.update"
  | "reports.read"
  | "workspace.members.read";

export type Resource =
  | "users" | "roles" | "permissions" | "settings" | "credentials"
  | "ai_engine" | "ai_generate" | "ai_providers"
  | "products" | "sales" | "customers"
  | "projects" | "campaigns" | "tasks" | "interns" | "media" | "migration"
  | "content" | "comments" | "assets" | "notifications" | "workspace" | "members";

export type RoleType = "system" | "custom";

export interface RoleDefinition {
  code: Role;
  name: string;
  description: string;
  role_type: RoleType;
  level: number;
}

// ─────────────────────────────────────────────
// System Role Definitions
// ─────────────────────────────────────────────

export const SYSTEM_ROLE_DEFINITIONS: RoleDefinition[] = [
  { code: "super_admin", name: "Super Admin",    description: "Toàn quyền quản trị hệ thống. Không giới hạn.", role_type: "system", level: 100 },
  { code: "admin",       name: "Quản trị viên", description: "Quản lý workspace, nội dung, nhân viên. Không quản lý credentials hệ thống.", role_type: "system", level: 80 },
  { code: "editor",      name: "Biên tập viên", description: "Tạo/sửa project, campaign, task, nội dung. Không xóa project/campaign. Không chỉnh settings.", role_type: "system", level: 60 },
  { code: "viewer",      name: "Người xem",     description: "Chỉ xem dữ liệu. Không tạo, sửa, xóa gì.",                                                   role_type: "system", level: 20 },
];

export const SYSTEM_ROLE_PERMISSIONS: Record<Exclude<Role, "intern">, Permission[]> = {
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
  ],
  admin: [
    "users.read","users.create",
    "roles.read","permissions.read",
    "ai_generate",
    "projects.read","projects.manage","projects.create","projects.update",
    "campaigns.read","campaigns.manage","campaigns.create","campaigns.update",
    "tasks.read","tasks.create","tasks.update","tasks.delete",
    "interns.manage","media.manage","migration.manage",
    "content.read","content.create","content.update","content.delete",
    "comments.read","comments.create","comments.update","comments.delete",
    "assets.read","assets.create","assets.update","assets.delete",
  ],
  editor: [
    "ai_generate",
    "tasks.read","tasks.create","tasks.update",
    "projects.read","projects.create","projects.update",
    "campaigns.read","campaigns.create","campaigns.update",
    "content.read","content.create","content.update",
    "comments.read","comments.create",
    "assets.read","assets.create",
  ],
  viewer: [
    "tasks.read","projects.read","campaigns.read","content.read",
    "comments.read","assets.read",
  ],
};

// ─────────────────────────────────────────────
// Admin Operational Permissions (preset — no individual grants needed)
// ─────────────────────────────────────────────

export const ADMIN_OPERATIONAL_PERMISSIONS: Permission[] = [
  // Workspace
  "projects.read", "projects.create", "projects.update", "projects.delete",
  "campaigns.read", "campaigns.create", "campaigns.update", "campaigns.delete",
  "tasks.read", "tasks.create", "tasks.update", "tasks.delete",
  "comments.read", "comments.create", "comments.update", "comments.delete",
  "assets.read", "assets.create", "assets.update", "assets.delete",
  "content.read", "content.create", "content.update", "content.delete",
  "interns.read", "interns.manage",
  "workspace.members.read",
  "media.manage",
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
];

/**
 * Permissions explicitly blocked for admin.
 * Admins need explicit DB grants to access these.
 */
export const ADMIN_EXPLICITLY_BLOCKED_PERMISSIONS: Permission[] = [
  "credentials.manage",
  "migration.manage",
];

// ─────────────────────────────────────────────
// Editor Additional Permissions
// ─────────────────────────────────────────────

export const EDITOR_ADDITIONAL_PERMISSIONS: Permission[] = [
  "tasks.delete",
  "comments.update", "comments.delete",
  "assets.update", "assets.delete",
  "content.update", "content.delete",
  "projects.update",
  "campaigns.update",
];

// ─────────────────────────────────────────────
// Intern Default Permissions (seed)
// ─────────────────────────────────────────────

export const INTERN_DEFAULT_PERMISSIONS: Permission[] = [
  // Workspace access — minimum to navigate workspace section
  "projects.read",
  "campaigns.read",
  "tasks.read",
  "tasks.update",
  // Content & collaboration
  "content.read",
  "comments.read",
  "comments.create",
  // Assets & notifications
  "assets.read",
  "assets.create",
  "notifications.read",
  // AI
  "ai_generate",
];

// ─────────────────────────────────────────────
// Permission Groups (for UI display)
// ─────────────────────────────────────────────

export interface PermissionGroup {
  group: string;
  permissions: { key: Permission; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { group: "Người dùng",       permissions: [{ key: "users.read", label: "Xem" }, { key: "users.create", label: "Tạo" }, { key: "users.update", label: "Sửa" }, { key: "users.delete", label: "Xóa" }] },
  { group: "Vai trò & Quyền",   permissions: [{ key: "roles.read", label: "Xem vai trò" }, { key: "roles.manage", label: "Quản lý vai trò" }, { key: "permissions.read", label: "Xem quyền" }] },
  { group: "Cài đặt",           permissions: [{ key: "settings.manage", label: "Quản lý" }, { key: "credentials.manage", label: "Credentials" }] },
  { group: "AI Engine",          permissions: [{ key: "ai_engine.manage", label: "Quản lý toàn bộ" }, { key: "ai_generate", label: "Generate nội dung AI" }] },
  { group: "AI Provider",        permissions: [{ key: "ai_providers.manage", label: "Quản lý" }] },
  { group: "Project",            permissions: [{ key: "projects.read", label: "Xem" }, { key: "projects.create", label: "Tạo" }, { key: "projects.update", label: "Sửa" }, { key: "projects.delete", label: "Xóa" }] },
  { group: "Campaign",           permissions: [{ key: "campaigns.read", label: "Xem" }, { key: "campaigns.create", label: "Tạo" }, { key: "campaigns.update", label: "Sửa" }, { key: "campaigns.delete", label: "Xóa" }] },
  { group: "Task",               permissions: [{ key: "tasks.read", label: "Xem" }, { key: "tasks.create", label: "Tạo" }, { key: "tasks.update", label: "Sửa" }, { key: "tasks.delete", label: "Xóa" }] },
  { group: "Bình luận",           permissions: [{ key: "comments.read", label: "Xem" }, { key: "comments.create", label: "Tạo" }, { key: "comments.update", label: "Sửa" }, { key: "comments.delete", label: "Xóa" }] },
  { group: "Tài sản",            permissions: [{ key: "assets.read", label: "Xem" }, { key: "assets.create", label: "Tải lên" }, { key: "assets.update", label: "Sửa" }, { key: "assets.delete", label: "Xóa" }] },
  { group: "Nội dung",            permissions: [{ key: "content.read", label: "Xem" }, { key: "content.create", label: "Tạo" }, { key: "content.update", label: "Sửa" }, { key: "content.delete", label: "Xóa" }] },
  { group: "Nhân viên",         permissions: [{ key: "interns.manage", label: "Quản lý" }] },
  { group: "Migration",          permissions: [{ key: "migration.manage", label: "Quản lý" }] },
  { group: "Media",             permissions: [{ key: "media.manage", label: "Quản lý" }] },
  { group: "Thông báo",        permissions: [{ key: "notifications.read", label: "Xem thông báo" }] },
];

// ─────────────────────────────────────────────
// Role Helpers
// ─────────────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  viewer: "Người xem",
  intern: "Thực tập sinh",
};

export const ROLE_BADGE_COLORS: Record<Role, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  admin:       "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  editor:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  viewer:      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  intern:      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export const ROLE_DEFINITIONS: RoleDefinition[] = SYSTEM_ROLE_DEFINITIONS;

export function isSystemRole(code: string): boolean {
  return SYSTEM_ROLE_DEFINITIONS.some((r) => r.code === code);
}

export function getRoleLevel(code: string): number {
  return SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === code)?.level ?? 30;
}

export function isCustomRole(code: string): boolean {
  return !isSystemRole(code);
}

// ─────────────────────────────────────────────
// Role Hierarchy Helpers (Phase C)
// ─────────────────────────────────────────────

/**
 * Kiểm tra actor có quyền quản lý target role không.
 * Rules:
 *   - Chỉ super_admin mới được quản lý system roles
 *   - Actor phải có level cao hơn target
 *   - super_admin có thể quản lý tất cả custom roles
 */
export function canManageRole(actorRole: string, targetRole: string): boolean {
  // super_admin quản lý được mọi thứ
  if (actorRole === "super_admin") return true;

  // System roles: chỉ super_admin được
  if (isSystemRole(targetRole)) return false;

  // Custom roles: actor level phải cao hơn target
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

/**
 * Kiểm tra actor có quyền assign target role cho user khác không.
 * Rules:
 *   - super_admin assign được mọi thứ
 *   - admin assign được editor/viewer/intern, KHÔNG assign được super_admin
 *   - Editor/viewer/intern không assign được ai
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") {
    return targetRole !== "super_admin";
  }
  return false;
}

/**
 * Kiểm tra actor có quyền xóa target role không.
 * Rules:
 *   - System roles: KHÔNG ai được xóa
 *   - Custom roles: chỉ super_admin được xóa
 */
export function canDeleteRole(actorRole: string, targetRole: string): boolean {
  if (actorRole !== "super_admin") return false;
  if (isSystemRole(targetRole)) return false;
  return true;
}

/**
 * Kiểm tra actor có thể chỉnh permissions của target role không.
 * Tương tự canManageRole nhưng cho phép super_admin sửa cả system roles nếu cần.
 */
export function canEditRolePermissions(actorRole: string, targetRole: string): boolean {
  if (actorRole === "super_admin") return true;
  if (isSystemRole(targetRole)) return false;
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

/**
 * Kiểm tra có thể downgrade quyền của chính mình không.
 * Không cho phép tự hạ quyền nếu là super_admin cuối cùng.
 */
export function canDemoteSelf(
  actorId: string,
  actorRole: string,
  targetId: string,
  targetRole: string,
  totalSameRole: number,
): boolean {
  // Không tự hạ quyền chính mình
  if (actorId === targetId) return false;

  // Không tự hạ super_admin cuối cùng
  if (targetRole === "super_admin" && totalSameRole <= 1) return false;

  return canManageRole(actorRole, targetRole);
}

/**
 * Kiểm tra actor có quyền quản lý target user không.
 * Phân biệt 3 action:
 *   "edit" — sửa thông tin (name, role, status)
 *   "delete" — vô hiệu hóa user
 *   "password" — reset password
 *
 * Rules:
 *   - Không tự thao tác chính mình (edit/delete/password)
 *   - super_admin quản lý được mọi user, trừ super_admin cuối cùng
 *   - admin quản lý được editor/viewer/intern, KHÔNG được super_admin hoặc admin khác
 *   - editor/viewer/intern không quản lý user nào
 *   - reset password chỉ super_admin được làm
 */
export function canManageUser(
  actorRole: string,
  actorId: string,
  targetId: string,
  targetRole: string,
  action: "edit" | "delete" | "password",
): boolean {
  // Không tự thao tác chính mình
  if (actorId === targetId) return false;

  switch (action) {
    case "password":
      // Chỉ super_admin được reset password
      return actorRole === "super_admin";

    case "delete":
      // super_admin cuối cùng không được xóa
      if (targetRole === "super_admin") return false;
      // actor level phải cao hơn target
      return getRoleLevel(actorRole) > getRoleLevel(targetRole);

    case "edit":
    default:
      // System roles: chỉ super_admin được
      if (isSystemRole(targetRole)) {
        return actorRole === "super_admin";
      }
      // Custom roles: actor level phải cao hơn target
      return getRoleLevel(actorRole) > getRoleLevel(targetRole);
  }
}

/**
 * Kiểm tra actor có quyền xem action menu của target user không.
 * Cho phép super_admin xem tất cả, còn lại chỉ xem user level thấp hơn mình.
 */
export function canViewActionMenu(
  actorRole: string,
  actorId: string,
  targetId: string,
  targetRole: string,
): boolean {
  if (actorId === targetId) return false;
  // super_admin xem được mọi thứ
  if (actorRole === "super_admin") return true;
  // Actor level phải cao hơn target
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

// ─────────────────────────────────────────────
// Permission Helpers
// ─────────────────────────────────────────────

/**
 * SimpleUser — minimal user object with just role field.
 * Accepts both AdminUser and AuthUser from the store.
 */
type SimpleUser = { role: string };

/**
 * Canonical permission check — all routes and components MUST use this.
 *
 * SUPER ADMIN: always true (bypass all permission checks).
 * ADMIN:      operational full access preset — does NOT need individual grants
 *             for workspace, products, sales, customers, reports, AI generate.
 *             Explicitly blocked only from: credentials.manage, migration.manage.
 * INTERN:    default intern permissions + explicit grants.
 * VIEWER:    read-only (only .read permissions pass).
 * CUSTOM:    DB-granted permissions + intern default baseline.
 */
export function hasPermission(user: SimpleUser, permission: Permission): boolean {
  const role = user.role;

  // ── Super Admin: unconditional bypass ───────────────────────────
  if (role === "super_admin") return true;

  // ── Admin: operational preset ──────────────────────────────────
  if (role === "admin") {
    // Explicitly blocked even for admin
    if (ADMIN_EXPLICITLY_BLOCKED_PERMISSIONS.includes(permission)) return false;
    // Admin operational preset
    if (ADMIN_OPERATIONAL_PERMISSIONS.includes(permission)) return true;
    // Fall back to explicit grants
    const perms = customRolePerms.get(role) ?? [];
    if (perms.includes(permission)) return true;
    return false;
  }

  // ── Viewer: read-only ──────────────────────────────────────────
  if (role === "viewer") {
    return permission.endsWith(".read");
  }

  // ── Intern: default permissions + explicit grants ───────────────
  if (role === "intern") {
    if (INTERN_DEFAULT_PERMISSIONS.includes(permission)) return true;
    const perms = customRolePerms.get(role) ?? [];
    if (perms.includes(permission)) return true;
    return false;
  }

  // ── Editor: intern baseline + additional write access ───────────
  if (role === "editor") {
    if (INTERN_DEFAULT_PERMISSIONS.includes(permission)) return true;
    if (EDITOR_ADDITIONAL_PERMISSIONS.includes(permission)) return true;
    const perms = customRolePerms.get(role) ?? [];
    if (perms.includes(permission)) return true;
    return false;
  }

  // ── Custom roles: DB grants + intern baseline ───────────────────
  const perms = customRolePerms.get(role) ?? [];
  if (perms.length > 0 && perms.includes(permission)) return true;
  if (INTERN_DEFAULT_PERMISSIONS.includes(permission)) return true;
  return false;
}

export function hasAllPermissions(user: AdminUser, perms: Permission[]): boolean {
  return perms.every((p) => hasPermission(user, p));
}

export function hasAnyPermission(user: AdminUser, perms: Permission[]): boolean {
  return perms.some((p) => hasPermission(user, p));
}

export function hasMinimumRoleLevel(userRole: string, requiredRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    super_admin: 100,
    admin: 80,
    editor: 60,
    intern: 30,
    viewer: 20,
  };
  const level = hierarchy[userRole as Role] ?? 30;
  return level >= (hierarchy[requiredRole] ?? 0);
}

export function isLastSuperAdmin(_userId: string, totalSuperAdmins: number): boolean {
  return totalSuperAdmins <= 1;
}

export function canRead(user: AdminUser, resource: Resource): boolean {
  const map: Partial<Record<Resource, Permission>> = {
    users: "users.read", roles: "roles.read", permissions: "permissions.read",
    projects: "projects.read", campaigns: "campaigns.read", tasks: "tasks.read",
    content: "content.read", comments: "comments.read", assets: "assets.read",
    ai_engine: "ai_engine.manage", ai_generate: "ai_generate", ai_providers: "ai_providers.manage",
    products: "products.read", sales: "sales.read", customers: "customers.read",
  };
  const p = map[resource];
  return p ? hasPermission(user, p) : false;
}

export function canCreate(user: AdminUser, resource: Resource): boolean {
  const map: Partial<Record<Resource, Permission>> = {
    projects: "projects.create", campaigns: "campaigns.create", tasks: "tasks.create",
    content: "content.create", users: "users.create", comments: "comments.create", assets: "assets.create",
  };
  const p = map[resource];
  return p ? hasPermission(user, p) : false;
}

export function canUpdate(user: AdminUser, resource: Resource): boolean {
  const map: Partial<Record<Resource, Permission>> = {
    users: "users.update", projects: "projects.update", campaigns: "projects.update",
    tasks: "tasks.update", content: "content.update", comments: "comments.update", assets: "assets.update",
  };
  const p = map[resource];
  return p ? hasPermission(user, p) : false;
}

export function canDelete(user: AdminUser, resource: Resource): boolean {
  const map: Partial<Record<Resource, Permission>> = {
    users: "users.delete", projects: "projects.delete", campaigns: "projects.delete",
    tasks: "tasks.delete", content: "content.delete", comments: "comments.delete", assets: "assets.delete",
  };
  const p = map[resource];
  return p ? hasPermission(user, p) : false;
}
