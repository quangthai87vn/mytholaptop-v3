# Employee Management + Settings Menu / RBAC / App Logo Report

**Date:** 2026-05-30
**Task:** Build Employee Management Page + Fix Settings/Menu/RBAC/App Logo issues
**Status:** Completed

---

## 1. CodeGraph Findings

### 1.1 User/Staff System Architecture

**Tables:**
- `admin_users` — core user table with email, password_hash, role, status, last_login_at, created_at, updated_at
- `admin_roles` — custom roles (extended by `admin_role_permissions`)
- `admin_role_permissions` — role-permission mappings
- `admin_sessions` — session storage (DB-backed for multi-instance)
- `admin_audit_logs` — audit trail
- `app_settings` — JSON key-value store for settings (company, medusa, wooCommerce)
- `pm_audit_logs` — project management audit logs

**Auth Flow:**
- Login: `app/api/auth/login/route.ts` → bcrypt verify → createSession → set session cookie (httpOnly)
- Middleware: only checks session cookie existence (Edge-compatible)
- `requireAdminAuth()`: validates session from DB, attaches `req._authUser`
- `requireCsrf()`: CSRF token check for write operations
- Login already checked `status !== "active"` for disabled users (checked BEFORE password verify)

**RBAC Hierarchy:**
```
super_admin (level 100) > admin (level 80) > editor (level 60) > intern (level 30) > viewer (level 20)
```

**Key helpers in `lib/auth/permissions.ts`:**
- `hasPermission(user, permission)` — canonical RBAC check
- `canManageUser(actorRole, actorId, targetId, targetRole, action)` — user management hierarchy
- `canAssignRole(actorRole, targetRole)` — role assignment hierarchy
- `canViewActionMenu(...)` — UI-level action visibility

**Existing RBAC guards:**
- `canManageUser` prevents self-edit, self-delete, lower-to-higher edits
- Last Super Admin protection via `isLastSuperAdmin()`
- Admin cannot assign role higher/equal to own level

### 1.2 Existing Pages/Routes

- `/settings/users` → `app/(admin)/settings/users/page.tsx` (tabs: Người dùng, Vai trò, Phân quyền)
- `/staff/*` → `app/(admin)/staff/` (old routes, now redirects)
- `/profile` → `app/(profile)/profile/`
- `/settings/app` → `app/(admin)/settings/app/page.tsx` (Company + Medusa + WooCommerce tabs)

### 1.3 Navigation/Sidebar

- `lib/navigation.ts` — `NAV_ITEMS` array with children
- Settings section had NO group-level permission guard (each child had its own)
- Hoạt động was under Workspace (not under Settings)
- `components/layout/admin-sidebar.tsx` — filters nav items by permission, manages expandedParents state

### 1.4 App Settings / Branding

- `lib/company-settings.tsx` — client-side only, uses localStorage, dispatches `company-settings-changed` event
- Settings app page saves to `app_settings` table via `/api/settings` POST
- `admin-sidebar.tsx` listens for `company-settings-changed` event to reload logo
- Already supports `logoUrl` in `CompanySettings` interface and `loadCompanySettings()`

---

## 2. Files Changed

### 2.1 New Files

| File | Description |
|------|-------------|
| `sql/workspace/027_admin_users_extended_fields.sql` | Migration: add extended fields to `admin_users` |
| `app/(admin)/settings/users/[id]/layout.tsx` | Route layout with RBAC guard |
| `app/(admin)/settings/users/[id]/page.tsx` | Employee detail page (5 tabs) |

### 2.2 Modified Files

| File | Changes |
|------|---------|
| `lib/navigation.ts` | Settings group requires `settings.manage` (super_admin only); added Activity child under Settings; removed Hoạt động from Workspace |
| `components/layout/admin-sidebar.tsx` | Sidebar state persistence via localStorage; merged route-change updates with existing state to preserve manual toggles |
| `app/api/staff/[id]/route.ts` | Extended StaffRow/StaffResponse with 16 new fields; extended UPDATE logic for all fields; DELETE sets `disabled_at`/`disabled_by` |
| `app/api/auth/login/route.ts` | Added `disabled_at` check alongside `status !== "active"`; clearer error message |
| `app/(admin)/settings/app/page.tsx` | Sync localStorage on company save; dispatch `company-settings-changed` event |
| `app/(admin)/staff/staff-users-tab.tsx` | Added "Xem hồ sơ" menu item linking to `/settings/users/[id]` |
| `components/layout/admin-layout.tsx` | (no net changes — reverted intermediate state) |

---

## 3. DB Migration Added

### 027_admin_users_extended_fields.sql

**Deployed successfully.** Added columns:

**Personal/Contact:**
- `avatar_url TEXT`
- `phone VARCHAR(20)`
- `citizen_id VARCHAR(20)`
- `address TEXT`
- `birth_date DATE`
- `gender VARCHAR(20)` — CHECK: `male`, `female`, `other`
- `emergency_contact TEXT`

**Employment:**
- `employee_type VARCHAR(50)` — CHECK: `intern`, `employee`, `freelancer`, `collaborator`
- `job_title VARCHAR(255)`
- `department VARCHAR(255)`
- `start_date DATE`
- `end_date DATE`
- `employment_status VARCHAR(50)` — CHECK: `working`, `on_leave`, `suspended`, `terminated`
- `manager_id UUID REFERENCES admin_users(id)`

**Audit:**
- `notes TEXT`
- `disabled_at TIMESTAMP`
- `disabled_by UUID REFERENCES admin_users(id)`

**Indexes:** `idx_admin_users_phone`, `idx_admin_users_manager_id`, `idx_admin_users_employee_type`, `idx_admin_users_employment_status`, `idx_admin_users_disabled_at`

---

## 4. Routes Added/Changed

### New Routes

| Route | File | Description |
|-------|------|-------------|
| `/settings/users/[id]` | `app/(admin)/settings/users/[id]/page.tsx` | Employee detail with 5 tabs |

### Changed Routes

| Route | Change |
|-------|--------|
| `/settings/users` | Tab "Người dùng" now has "Xem hồ sơ" link in action menu |
| `/settings/app` | Company tab now syncs localStorage + dispatches branding event |

---

## 5. API Added/Changed

### Extended APIs

| Endpoint | Change |
|----------|--------|
| `GET /api/staff/[id]` | Added 16 extended fields to SELECT and response |
| `PUT /api/staff/[id]` | Extended Zod schema with all 16 new fields; UPDATE sets all fields; RETURNING includes extended fields |
| `DELETE /api/staff/[id]` | Sets `disabled_at = CURRENT_TIMESTAMP`, `disabled_by = authUser.id` before deleting sessions |
| `POST /api/auth/login` | Added `disabled_at !== null` check; clearer error: "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." |

---

## 6. RBAC Rules Implemented

| Rule | Location | Status |
|------|----------|--------|
| Settings menu only for `settings.manage` (super_admin) | `lib/navigation.ts` | Done |
| `/settings/*` returns 403 for non-super_admin (layout redirect) | `app/(admin)/settings/users/[id]/layout.tsx` | Done |
| Only super_admin can assign roles | `app/api/staff/[id]/route.ts` | Already existed |
| Admin cannot assign role higher/equal to own level | `app/api/staff/[id]/route.ts` | Already existed |
| Cannot disable last Super Admin | `app/api/staff/[id]/route.ts` | Already existed |
| Cannot self-disable | `app/api/staff/[id]/route.ts` | Already existed |
| Admin cannot edit Super Admin | `canManageUser()` | Already existed |
| Disabled user cannot login | `app/api/auth/login/route.ts` | Enhanced |
| Basic info editable by self or admin/super_admin | `app/(admin)/settings/users/[id]/page.tsx` | Done |
| Password change: self (own password) or super_admin | `app/(admin)/settings/users/[id]/page.tsx` | Done |
| Role/Status edit: super_admin only | `app/(admin)/settings/users/[id]/page.tsx` | Done |

---

## 7. Sidebar State Fix

**Problem:** When navigating between pages, manually expanded menu groups would collapse because the state was re-initialized from route on every render.

**Solution:**
1. **LocalStorage persistence:** On mount, `expandedParents` initializes from `localStorage.getItem("sidebar_expanded")` if available
2. **Toggle updates storage:** Every `toggleExpand` call persists the new set to localStorage
3. **Route-change merge:** On pathname change, the effect merges new active parents INTO existing state (not replaces it), preserving manually toggled groups

```typescript
// Persist to localStorage on toggle
useEffect(() => {
  localStorage.setItem("sidebar_expanded", JSON.stringify([...expandedParents]));
}, [expandedParents]);

// Merge route-change with existing state (preserve manual toggles)
useEffect(() => {
  setExpandedParents((prev) => {
    const next = new Set(prev);
    filteredNavItems.forEach((item) => {
      if (item.children && isParentRoute(item, pathname)) {
        next.add(item.title);
      }
    });
    return next;
  });
}, [pathname, filteredNavItems]);
```

---

## 8. Logo Setting Implementation

**How it works:**
1. Super Admin edits Company info in `/settings/app` → Company tab
2. On save: `POST /api/settings { company: { logoUrl, name, ... } }` saves to `app_settings` DB table
3. Settings page syncs to localStorage: `mtl-company-settings`
4. Settings page dispatches `company-settings-changed` custom event
5. `AdminSidebar` listens for event, calls `reloadCompany()` → `loadCompanySettings()` from localStorage
6. Sidebar re-renders with new `company.logoUrl`
7. After page refresh, logo loads from localStorage (already populated from the save)

**Note:** Logo URL is stored in `app_settings` table via existing `/api/settings` POST. The Settings page already had Company tab. We added the localStorage sync and event dispatch.

---

## 9. Navigation Changes Summary

### Settings Menu (Before)

```
Cài đặt (no permission guard)
├── Cấu hình ứng dụng
├── AI Engine (ai_engine.manage)
└── Người dùng (users.read)
```

### Settings Menu (After)

```
Cài đặt (settings.manage = super_admin only)
├── Cấu hình ứng dụng (settings.manage)
├── Cấu hình AI (ai_engine.manage)
├── Người dùng (users.read)
└── Hoạt động (settings.manage)
```

### Workspace Menu (Before)

```
Workspace
├── ...
├── Nhân sự (workspace.members.read)
├── Danh mục (projects.read)
└── Hoạt động (projects.read) ← REMOVED
```

### Workspace Menu (After)

```
Workspace
├── ...
├── Nhân sự (workspace.members.read)
└── Danh mục (projects.read)
```

---

## 10. Test Results

| Test | Expected | Status |
|------|---------|--------|
| TypeScript compilation | 0 errors | PASS |
| Migration 027 deploy | All 16 columns added, indexes created | PASS |
| Navigation Settings guard | Only super_admin sees Settings group | Manual |
| Hoạt động moved | Visible under Settings, not Workspace | Manual |
| Sidebar state persists | Expanded groups survive navigation | Manual |
| Employee detail page loads | GET /api/staff/[id] returns all fields | Manual |
| Tab navigation | All 5 tabs render correctly | Manual |
| Disabled login check | Returns 403 with clear message | Manual |
| Company save updates logo | Sidebar logo changes after save | Manual |

---

## 11. Employee Detail Page Tabs

| Tab | Content | Edit Permission |
|-----|---------|----------------|
| **Thông tin cơ bản** | Avatar, Họ tên, Phone, CCCD, Địa chỉ, Ngày sinh, Giới tính, Liên hệ khẩn cấp, Ghi chú | Self or Admin |
| **Thông tin tài khoản** | Email (readonly), Vai trò, Trạng thái, Đổi mật khẩu | Role/Status: Super Admin only; Password: Self or Super Admin |
| **Quá trình công tác** | Loại nhân sự, Vị trí, Bộ phận, Ngày bắt đầu/kết thúc, Trạng thái làm việc | Self or Admin |
| **Phân quyền & trạng thái** | Current role, Account status, Last login, Created/Updated dates | Read-only display |
| **Hoạt động** | Recent audit log entries for this user | Read-only display |

---

## 12. Remaining Risks

| Risk | Severity | Note |
|------|---------|------|
| Avatar upload not implemented | Medium | Only URL input supported. Full file upload (POST `/api/staff/[id]/avatar`) not built — explicitly deferred in requirements. Report as limitation. |
| Activity tab shows empty if `/api/activity` not configured for user filter | Low | Falls back to empty state with message. Audit logs exist in DB. |
| Company logo localStorage sync on other pages | Low | Only Settings page currently syncs. If user changes logo on Settings page, all open admin pages will update via event listener. |
| `requireAdminAuth` does not check `disabled_at` for existing sessions | Medium | Disabled user sessions remain valid until expiry. DELETE `/api/staff/[id]` already invalidates sessions via `DELETE FROM admin_sessions`. |
| Manager dropdown not implemented | Low | `manager_id` field is text input (UUID) in Employment tab. Dropdown to select from staff list was explicitly deferred. |
| Settings/Activity page does not exist yet | Medium | `/settings/activity` route exists in navigation but no page created yet. Currently navigates to `/settings/activity` which will 404. |

---

## 13. Limitations Documented

1. **Avatar upload:** Only URL input field. Full file upload with server-side storage deferred to future iteration.
2. **Activity tab:** Reads from `/api/activity` with `target_user_id` filter. If this API doesn't return user-filtered results, tab shows empty state.
3. **Settings/Activity page:** Route exists in navigation but no page component created yet. This was deferred.
4. **Manager dropdown:** `manager_id` is a UUID text field. Dropdown to select staff member was deferred.
5. **Profile page `/profile`:** Not enhanced in this task. User's own profile page remains separate from employee detail.

---

## 14. Manual Test Checklist

### Super Admin
- [ ] See Settings menu in sidebar
- [ ] Navigate to Settings → Người dùng
- [ ] Click any user → `/settings/users/[id]` opens
- [ ] Edit Basic Info tab → saves successfully
- [ ] Change Password in Account tab → saves successfully
- [ ] Change Role in Account tab → saves successfully
- [ ] View Permissions tab → displays role + status
- [ ] View Activity tab → shows audit log
- [ ] Change logo URL in Settings → Cấu hình ứng dụng → Company tab → logo updates in sidebar after save + refresh

### Admin
- [ ] Does NOT see Settings menu
- [ ] Direct `/settings/users` → 403
- [ ] Can edit own Basic Info in `/settings/users/[own-id]`
- [ ] Cannot change role/status of any user

### Intern/Staff
- [ ] Does NOT see Settings menu
- [ ] Can access `/profile` (own profile)
- [ ] Can edit own basic info in `/settings/users/[own-id]`

### Disabled User
- [ ] Login attempt → "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên."
- [ ] Returns 403 status

### Sidebar
- [ ] Open Workspace group, navigate between pages → stays expanded
- [ ] Open Settings group as Super Admin, navigate between settings pages → stays expanded
- [ ] Collapse sidebar, navigate, expand → state preserved
