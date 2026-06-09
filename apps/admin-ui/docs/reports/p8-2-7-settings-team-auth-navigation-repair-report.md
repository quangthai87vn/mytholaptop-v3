# P8.2.7 — Settings, Team, Auth & Navigation Repair Report

**Phase:** P8.2.7
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## Phase A: Route Audit Results

### A.1 Routes Found

| Route | page.tsx | route.ts | Status |
|---|---|---|---|
| `/login` | YES | NO | ✅ |
| `/403` | YES | NO | ✅ |
| `/dashboard` | YES | NO | ✅ |
| `/workspace` | YES | NO | ✅ |
| `/workspace/activity` | YES | NO | ✅ |
| `/workspace/calendar` | YES | NO | ✅ |
| `/team` | YES | NO | ✅ **Canonical: Team vận hành** |
| `/team/interns` | YES | NO | ✅ |
| `/staff` | YES | NO | ✅ **Canonical: Admin Users** |
| `/staff/roles` | YES | NO | ✅ **Canonical: Vai trò** |
| `/staff/permissions` | YES | NO | ✅ **Canonical: Phân quyền** |
| `/notifications` | YES | NO | ✅ |
| `/migration` | YES | NO | ✅ |
| `/settings` | YES | YES | ✅ |
| `/settings/ai` | YES | YES | ✅ **Canonical: AI Engine** |
| `/settings/notifications` | **NO** | NO | ❌ **404** |
| `/settings/team` | **NO** | NO | ❌ **404** |
| `/settings/data` | **NO** | NO | ❌ **404** |
| `/settings/system` | **NO** | NO | ❌ **404** |
| `/settings/users` | **NO** | NO | ❌ **404** |
| `/settings/roles` | **NO** | NO | ❌ **404** |
| `/settings/permissions` | **NO** | NO | ❌ **404** |

### A.2 Duplicate Routes — None Found

No route exists in two different locations. All routes are unique.

### A.3 API Routes Status

| API | Status |
|---|---|
| `/api/auth/login` | ✅ Database-backed login |
| `/api/auth/logout` | ✅ DB session deletion |
| `/api/auth/me` | ✅ DB session validation |
| `/api/staff` | ✅ Staff CRUD |
| `/api/roles` | ✅ Roles API |
| `/api/permissions` | ✅ Permissions API |
| `/api/interns` | ✅ Interns API |

---

## Phase B: Canonical Route Design

### B.1 Architecture After Fix

```
Cài đặt
├── AI Engine         → /settings/ai         (canonical)
├── Thông báo       → /notifications         (canonical, standalone)
├── Người dùng     → /staff                 (canonical, admin users)
├── Vai trò         → /staff/roles          (canonical)
├── Phân quyền      → /staff/permissions     (canonical)
└── Dữ liệu        → /migration             (canonical, standalone)

Quản lý Workspace
└── Team            → /team                  (canonical, vận hành + interns)

Legacy redirects:
/settings/team       → /staff
/settings/users      → /staff
/settings/roles      → /staff/roles
/settings/permissions → /staff/permissions
/settings/notifications → /notifications
/settings/data        → /migration
/staff               → (no longer redirects, now canonical)
/notifications        → (no longer redirects, now canonical)
```

---

## Phase C: Navigation Fixes

### C.1 Settings Children Updated

**Before (4 routes were 404):**

```typescript
children: [
  { title: "AI Engine", href: "/settings/ai" },        // ✅ existed
  { title: "Thông báo", href: "/settings/notifications" },  // ❌ 404
  { title: "Team", href: "/settings/team" },            // ❌ 404
  { title: "Dữ liệu", href: "/settings/data" },       // ❌ 404
  { title: "Hệ thống", href: "/settings/system" },    // ❌ 404
]
```

**After (all routes valid):**

```typescript
children: [
  { title: "AI Engine", href: "/settings/ai" },           // ✅
  { title: "Thông báo", href: "/notifications" },         // ✅ redirect to real page
  { title: "Người dùng", href: "/staff" },              // ✅
  { title: "Vai trò", href: "/staff/roles" },            // ✅
  { title: "Phân quyền", href: "/staff/permissions" },   // ✅
  { title: "Dữ liệu", href: "/migration" },             // ✅
]
```

### C.2 Route Redirect Maps Cleaned

Removed stale redirect entries that were no longer needed:
- Removed `"/staff": "/team"` — `/staff` is now canonical for admin users
- Removed `"/notifications": "/settings/notifications"` — `/notifications` is canonical
- Removed `"/migration": "/settings/data"` — `/migration` is canonical

Updated legacy child redirects:
- `"/staff/roles": "/staff/roles"` (was `"/settings/team"`)
- `"/staff/permissions": "/staff/permissions"` (was `"/settings/team"`)
- `"/settings/team": "/staff"` (new — protects old links)

---

## Phase D: Route Wrappers & Redirects

### D.1 Created Wrapper Pages

| File | Route | Redirects To | Purpose |
|---|---|---|---|
| `app/settings/users/page.tsx` | `/settings/users` | `/staff` | Admin users management |
| `app/settings/roles/page.tsx` | `/settings/roles` | `/staff/roles` | Roles management |
| `app/settings/permissions/page.tsx` | `/settings/permissions` | `/staff/permissions` | Permissions management |

All wrappers use Next.js `redirect()` for instant server-side redirects (no client bundle impact).

### D.2 Design Decision: Wrapper vs Full Pages

**Chosen: Wrapper pages (redirect)**, NOT shared layout, for these reasons:
- `/staff`, `/staff/roles`, `/staff/permissions` are full-featured pages with complex client-side state
- Creating a shared layout would require significant refactoring of the existing pages
- Redirect is semantically correct: `/settings/users` is a logical URL for admin users in settings
- Zero UX impact — redirect is instant

---

## Phase E: Auth Flow

### E.1 Login — Verified Working

| Check | Status |
|---|---|
| Credential validation | ✅ DB (bcrypt + `admin_users` table) |
| Hardcoded credentials | ❌ None found |
| Rate limiting | ✅ Via `@/lib/auth/rate-limit` |
| CSRF protection | ✅ CSRF token cookie set |
| Session creation | ✅ DB `admin_sessions` table |
| Cookie | ✅ `httpOnly`, `Lax` session cookie |

### E.2 Logout — Fixed

**Bug found:** `AdminHeader` logout button only did `router.push("/login")` without calling `/api/auth/logout`. This left the DB session valid.

**Fix applied:**
```typescript
// Before (broken)
onClick={() => router.push("/login")}

// After (fixed)
onClick={async () => {
  await useAuthStore.getState().logout();
  router.push("/login");
}}
```

`useAuthStore.logout()` calls `POST /api/auth/logout` which:
- Deletes the session from `admin_sessions` table
- Clears the `admin_session` and `csrf_token` cookies
- Then client navigates to `/login`

### E.3 User Display — Fixed

**Bug found:** `user-menu.tsx` had hardcoded `CURRENT_USER = { name: "Nguyễn Văn Admin", ... }`. This component was unused by the main header (replaced by `admin-header.tsx`'s own user menu), but still contained wrong user data.

**Fix applied:**
- Rewrote `user-menu.tsx` to use `useAuthStore` for real user data
- Shows `user.full_name`, `user.email`, role label from `ROLE_LABELS`
- Logout calls `useAuthStore.logout()` → `/api/auth/logout` → DB session deleted

### E.4 Session Validation

| Check | Status |
|---|---|
| `/api/auth/me` calls DB | ✅ `validateSession()` reads `admin_sessions` JOIN `admin_users` |
| Expired session handling | ✅ Deletes from DB on validate |
| Inactive user handling | ✅ Returns 401, deletes session |
| httpOnly cookie | ✅ XSS-resistant |

---

## Phase F: RBAC Verification

### F.1 Permission Matrix

| Route | `super_admin` | `admin` | `editor` | `viewer` |
|---|---|---|---|---|
| `/settings/ai` | ✅ see menu + access | ❌ hidden menu, 403 if direct | ❌ hidden menu, 403 if direct | ❌ hidden menu, 403 if direct |
| `/notifications` | ✅ | ✅ | ✅ | ✅ |
| `/staff` | ✅ see menu + access | ✅ see menu + access | ✅ see menu + access | ✅ see menu + access |
| `/staff/roles` | ✅ | ✅ | ✅ | ✅ |
| `/staff/permissions` | ✅ | ✅ | ✅ | ✅ |
| `/migration` | ✅ | ✅ | ✅ | ✅ |

**AI Engine visibility:** `requiredPermission: "ai_engine.manage"` — only `super_admin` has this permission.

### F.2 `filterNavItems` Fix (P8.2.6)

The sidebar permission filter was not calling `hasPermission()`. Fixed in P8.2.6 to properly check `ai_engine.manage` for AI Engine visibility.

---

## Phase G: Build Verification

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Pass (exit code 0) |
| Next.js Build (`pnpm run build`) | ✅ Pass (exit code 0) |
| Total routes | 105 (up from 102 — +3 wrapper pages) |
| New pages compiled | ✅ `/settings/users`, `/settings/roles`, `/settings/permissions` |

### Routes in build output:
```
ƒ /settings/ai
○ /settings/permissions   ← NEW
○ /settings/roles       ← NEW
○ /settings/users       ← NEW
○ /staff
○ /staff/permissions
○ /staff/roles
```

---

## Files Modified

| File | Change |
|---|---|
| `lib/navigation.ts` | Updated settings children to point to real routes; cleaned redirect maps |
| `app/settings/users/page.tsx` | **NEW** — redirect wrapper |
| `app/settings/roles/page.tsx` | **NEW** — redirect wrapper |
| `app/settings/permissions/page.tsx` | **NEW** — redirect wrapper |
| `components/layout/admin-header.tsx` | Logout now calls `useAuthStore.logout()` before redirect |
| `components/layout/user-menu.tsx` | Rewrote to use real auth store data; logout calls API |

---

## Bugs Fixed

| # | Severity | Description | Fix |
|---|---|---|---|
| 1 | **High** | 4 settings menu items pointed to 404 routes | Updated nav to point to real routes |
| 2 | **High** | Logout in header did not call `/api/auth/logout` — session remained valid | Fixed to call `useAuthStore.logout()` |
| 3 | **Medium** | `user-menu.tsx` showed hardcoded "Nguyễn Văn Admin" | Rewrote to use `useAuthStore` |
| 4 | **Low** | Stale redirect entries in `ROUTE_REDIRECTS` | Cleaned up |
| 5 | **Info** | `filterNavItems` didn't check `hasPermission` (fixed in P8.2.6) | Already fixed |

---

## Canonical Route Final Map

| Feature | Canonical Route | Settings Menu Entry |
|---|---|---|
| AI Engine | `/settings/ai` | ✅ AI Engine |
| Notifications | `/notifications` | ✅ Thông báo |
| Admin Users | `/staff` | ✅ Người dùng |
| Roles | `/staff/roles` | ✅ Vai trò |
| Permissions | `/staff/permissions` | ✅ Phân quyền |
| Migration/Data | `/migration` | ✅ Dữ liệu |
| Team Operations | `/team` | (in Workspace section) |
| Interns | `/team/interns` | (in Team section) |

---

## P8.2 Consolidation Status

| Phase | Status | Notes |
|---|---|---|
| **P8.2.1** Deprecate providers.ts | ✅ COMPLETED | providers.ts deleted |
| **P8.2.2** Medusa service merge | ⏸️ SKIPPED | Not critical |
| **P8.2.3** Drop deprecated workspace tables | ✅ READY | Run after verifying 0 rows |
| **P8.2.4** Consolidate ai_settings | ⏸️ LOW PRIORITY | 1 API route uses it |
| **P8.2.5** Clean up unused legacy files | ✅ COMPLETED | 3 files deleted |
| **P8.2.6** Restore AI Engine menu | ✅ COMPLETED | Sidebar permission fixed |
| **P8.2.7** Settings/Team/Auth navigation | ✅ COMPLETED THIS | Navigation + logout + 3 wrappers |

### Recommended next: P8.2.3 (Drop Deprecated Workspace Tables)

```sql
-- Verify first:
SELECT COUNT(*) FROM pm_media_workflows;
SELECT COUNT(*) FROM pm_workflow_stages;
SELECT COUNT(*) FROM pm_workflow_comments;
SELECT COUNT(*) FROM pm_ai_suggestions;
-- All must return 0 before running DROP TABLE
```

Risk: **LOW** — confirmed deprecated by migration 008.
