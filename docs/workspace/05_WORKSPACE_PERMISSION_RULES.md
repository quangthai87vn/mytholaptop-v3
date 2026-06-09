# 05_WORKSPACE_PERMISSION_RULES.md

## RBAC System

All permission checks go through `lib/rbac/index.ts`.

**Never write inline role checks** like `if (user.role === "admin")`. Use the RBAC functions instead.

## RBAC Functions

```ts
import { hasPermission, hasAllPermissions, hasMinimumRoleLevel } from "@/lib/rbac";

// Check single permission
hasPermission(user, "tasks.update") → boolean

// Check multiple permissions (all required)
hasAllPermissions(user, ["tasks.read", "tasks.update"]) → boolean

// Check role level
hasMinimumRoleLevel(user.role, "admin") → boolean
```

## Role Hierarchy

```
super_admin (100) > admin (80) > editor (60) > intern (30) > viewer (20)
```

Custom roles default to level 30 (intern-equivalent).

## Permission Presets

### Super Admin
- Bypasses ALL permission checks — always returns true
- Has access to everything including system settings

### Admin
- Operational preset: projects, campaigns, tasks, content, AI generate, notifications, reports
- Explicitly blocked: `credentials.manage`, `migration.manage`
- Cannot access: role/permission management without explicit grant

### Editor
- Intern default permissions + additional: tasks.delete, comments.update, content management
- Cannot access: admin settings, user management

### Intern
- Default: read + update on own assigned tasks, comments, assets, content
- Cannot delete, archive, or manage other users
- **Can only edit tasks where `assignee_ids` includes their own user ID**

### Viewer
- Read-only across all workspace modules
- Cannot create, update, or delete anything

## Task-Level Permissions

### Who Can View a Task
| Role | Rule |
|------|-------|
| Super Admin | All tasks |
| Admin | All tasks |
| Editor | All tasks |
| Intern | Tasks where `assignee_ids` includes intern ID OR `created_by` is intern |
| Viewer | Tasks where `assignee_ids` includes viewer ID OR `created_by` is viewer |

### Who Can Edit a Task
| Role | Own Non-Completed | Own Completed | Any Task |
|------|-------------------|---------------|---------|
| Super Admin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Editor | ✅ | ❌ | ❌ |
| Intern | ✅ | ❌ | ❌ |

### Who Can Archive/Delete a Task
| Role | Archive | Delete |
|------|---------|--------|
| Super Admin | ✅ | ✅ |
| Admin | ✅ | ❌ |
| Editor | ❌ | ❌ |
| Intern | ❌ | ❌ |

## Server-Side Enforcement

All API routes enforce permissions:

```ts
// In route handler
const user = await getCurrentUser(req);
if (!user) return 401;
if (!hasPermission(user, "tasks.update")) return 403;
```

## Client-Side Enforcement

UI hides/disables actions the user cannot perform:

```tsx
// Task card menu
<DropdownMenuItem
  onClick={handleDelete}
  disabled={!isSuperAdmin}
>
  Xóa
</DropdownMenuItem>

// Create button
{canCreate && <Button>Tạo mới</Button>}
```

## Locking Completed Tasks

When task status is `completed` or `approved`:
1. UI: Hide all edit controls for non-admin users
2. API: Reject `PUT /api/tasks/[id]` with 403 if `task.status` is `completed`/`approved` and `actor.role` is not `admin`/`super_admin`
3. Exception: Super Admin can always unlock

```ts
// In PUT /api/tasks/[id]
if (["completed", "approved"].includes(task.status)) {
  if (!["admin", "super_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Task is locked" }, { status: 403 });
  }
}
```

## Intern Filtering

On page load, filter tasks server-side:

```ts
// In app/(admin)/tasks/page.tsx
if (user.role === "intern") {
  tasks = tasks.filter(t =>
    t.assignee_ids.includes(user.id) || t.created_by === user.id
  );
}
```

## Notification Triggers

Send notifications for:
- Task submitted for review → notify admin
- Task approved/rejected → notify assignee
- Task deadline approaching (24h) → notify assignee
- Task overdue → notify admin
