# P8.2.8 — Auth/RBAC End-to-End Verification Report

**Phase:** P8.2.8
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## Phase 1: Login Flow Verification

### 1.1 Login Flow — `/api/auth/login`

| Check | Status | Detail |
|---|---|---|
| Database credential check | ✅ PASS | `admin_users` table with bcrypt hash |
| No hardcoded credentials | ✅ PASS | Dynamic query, no hardcoded email/password |
| Password hashing | ✅ PASS | `bcrypt.compare(password, user.password_hash)` |
| Rate limiting | ✅ PASS | 5 attempts/15min via `@/lib/auth/rate-limit` |
| CSRF token creation | ✅ PASS | Generated in `createSession()`, stored in DB |
| CSRF cookie set | ✅ PASS | Non-httpOnly `csrf_token` cookie |
| Session cookie set | ✅ PASS | httpOnly `admin_session` cookie |
| Session stored in DB | ✅ PASS | `admin_sessions` table with `session_id`, `user_id`, `expires_at` |
| `last_login_at` update | ✅ PASS | `UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP` |
| Inactive user blocked | ✅ PASS | Returns 403 if `user.status !== "active"` |
| Invalid credentials | ✅ PASS | Returns 401 with `INVALID_CREDENTIALS` code |
| Server error handling | ✅ PASS | 500 with `SERVER_ERROR` code |

**Code path:**
```
POST /api/auth/login
  → rate limit check
  → parse { email, password }
  → query admin_users WHERE email = $1
  → bcrypt.compare(password, password_hash)
  → createSession(userId) → writes admin_sessions + csrf_token
  → set admin_session (httpOnly) + csrf_token (non-httpOnly) cookies
  → return { user: { id, email, full_name, role } }
```

---

## Phase 2: Logout Flow Verification

### 2.1 Logout — `/api/auth/logout`

| Check | Status | Detail |
|---|---|---|
| Calls `destroySession()` | ✅ PASS | Deletes from `admin_sessions` table by `session_id` |
| DB session deleted | ✅ PASS | `DELETE FROM admin_sessions WHERE session_id = $1` |
| `admin_session` cookie cleared | ✅ PASS | `maxAge: 0` |
| `csrf_token` cookie cleared | ✅ PASS | `maxAge: 0`, `sameSite: "strict"` |
| Returns JSON, not redirect | ✅ PASS | `NextResponse.json({ success: true })` |
| Graceful on missing session | ✅ PASS | `if (sessionId)` guard |
| Error swallowed | ✅ PASS | `catch {}` prevents logout failure from breaking UI |

### 2.2 Client-side Logout Chain (P8.2.7 Fix)

| Check | Status | Detail |
|---|---|---|
| `AdminHeader` logout | ✅ PASS | Calls `useAuthStore.logout()` → POST `/api/auth/logout` → `router.push("/login")` |
| `useAuthStore.logout()` | ✅ PASS | Calls `POST /api/auth/logout`, clears store user |
| Browser back after logout | ✅ BLOCKED | Middleware redirects to `/login` because `admin_session` cookie is cleared |
| Session DB deleted | ✅ CONFIRMED | `admin_sessions` record removed |

### 2.3 Cookie & Session Summary

| Cookie | Type | HttpOnly | SameSite | Cleared on logout |
|---|---|---|---|---|
| `admin_session` | session ID | ✅ YES | `lax` | ✅ `maxAge: 0` |
| `csrf_token` | CSRF token | ❌ NO (readable by JS) | `strict` | ✅ `maxAge: 0` |

---

## Phase 3: Middleware Route Guard Verification

### 3.1 Auth Check Architecture

Middleware (`middleware.ts`) performs lightweight cookie check (no DB call). Route layout files do full `validateSession()` + DB check.

| Check | Status | Detail |
|---|---|---|
| Static files exempted | ✅ PASS | `/favicon`, `/_next`, files with `.` |
| Protected pages redirect | ✅ PASS | Unauthenticated → `/login?redirect=<path>` |
| Protected API return 401 | ✅ PASS | Unauthenticated → `NextResponse.json({ error, code: "NOT_AUTHENTICATED" }, 401)` |
| Authenticated → next() | ✅ PASS | Cookie exists → `NextResponse.next()` |
| Session cookie check | ✅ PASS | `sessionCookie.value.length > 0` |

### 3.2 Protected Routes in Middleware

| Route | In Protected List | Auth Required |
|---|---|---|
| `/dashboard` | ✅ | ✅ Login → /dashboard |
| `/workspace` | ✅ | ✅ Login → /workspace |
| `/settings/ai` | ✅ (`/settings`) | ✅ Login → /settings/ai |
| `/notifications` | ✅ | ✅ Login → /notifications |
| `/staff` | ✅ | ✅ Login → /staff |
| `/settings/users` | ✅ (`/settings`) | ✅ Login → /settings/users |
| `/settings/roles` | ✅ (`/settings`) | ✅ Login → /settings/roles |
| `/settings/permissions` | ✅ (`/settings`) | ✅ Login → /settings/permissions |
| `/login` | ❌ (public) | — |
| `/api/auth/login` | ❌ (public) | — |

### 3.3 Route Layout Guards (Full DB Validation)

| Route | Guard File | Auth Check | Permission Check |
|---|---|---|---|
| `/settings/ai` | `settings/ai/layout.tsx` | ✅ `validateSession()` | ✅ `ai_engine.manage` OR `super_admin` → 403 |
| `/settings` | `settings/layout.tsx` | ✅ `validateSession()` | ✅ `settings.manage` OR `super_admin` → 403 |
| All other protected pages | Middleware only | ✅ Cookie check | ❌ (RBAC via API-level guards) |

### 3.4 Bug Found & Fixed: `/notifications` Redirect

**Bug:** Middleware had `"/notifications": "/settings/notifications"` in `LEGACY_REDIRECTS`, redirecting `/notifications` → `/settings/notifications`. But `/notifications` is a real page with `page.tsx`, and `/settings/notifications` has no page.

**Fix:** Removed `"/notifications"` from middleware redirect. `/notifications` now resolves directly to its real page. Added `"/settings/team": "/staff"` redirect to protect legacy links.

---

## Phase 4: User Display Verification

### 4.1 Header User Display — `AdminHeader`

| Check | Status | Detail |
|---|---|---|
| Reads from `useAuthStore` | ✅ PASS | `const currentUser = useAuthStore((s) => s.user)` |
| Shows `full_name` | ✅ PASS | `currentUser?.full_name` |
| Shows role label | ✅ PASS | `ROLE_LABELS[currentUser?.role]` |
| Calls `/api/auth/me` on load | ✅ PASS | `checkSession()` called in component `useEffect` |
| Real DB user | ✅ PASS | `/api/auth/me` calls `validateSession()` → DB read |

### 4.2 Legacy `user-menu.tsx` — Fixed (P8.2.7)

| Check | Status | Detail |
|---|---|---|
| Was using hardcoded user | ✅ FIXED | `CURRENT_USER = { name: "Nguyễn Văn Admin", ... }` removed |
| Now uses `useAuthStore` | ✅ FIXED | Shows `user.full_name`, `user.email`, role label |
| Logout calls API | ✅ FIXED | `await logout()` → `POST /api/auth/logout` |
| Shows initials | ✅ PASS | Derived from `full_name.split(" ").map(n => n[0]).join("").slice(0, 2)` |
| Shows `null` gracefully | ✅ PASS | `user ? ... : <p>Chưa đăng nhập</p>` |

---

## Phase 5: RBAC Permission Matrix (Actual)

### 5.1 Permissions by Role

| Permission | super_admin | admin | editor | viewer |
|---|---|---|---|---|
| `ai_engine.manage` | ✅ | ❌ | ❌ | ❌ |
| `ai_generate` | ✅ | ✅ | ✅ | ❌ |
| `settings.manage` | ✅ | ❌ | ❌ | ❌ |
| `credentials.manage` | ✅ | ❌ | ❌ | ❌ |
| `users.read` | ✅ | ✅ | ❌ | ❌ |
| `roles.read` | ✅ | ✅ | ❌ | ❌ |
| `permissions.read` | ✅ | ✅ | ❌ | ❌ |
| `projects.*` | ✅ | ✅ (no delete) | ✅ (create/update only) | read only |
| `campaigns.*` | ✅ | ✅ (no delete) | ✅ (create/update only) | read only |
| `tasks.*` | ✅ | ✅ | ✅ (create/update only) | read only |
| `content.*` | ✅ | ✅ | ✅ (create/update only) | read only |
| `interns.manage` | ✅ | ✅ | ❌ | ❌ |
| `media.manage` | ✅ | ✅ | ❌ | ❌ |
| `migration.manage` | ✅ | ✅ | ❌ | ❌ |

### 5.2 AI Engine Visibility Matrix

| Role | Sees AI Engine in Menu | Can Access `/settings/ai` |
|---|---|---|
| `super_admin` | ✅ (via `filterNavItems` check) | ✅ (layout guard: `super_admin` bypass) |
| `admin` | ❌ (no `ai_engine.manage`) | ❌ (redirects to 403) |
| `editor` | ❌ (no `ai_engine.manage`) | ❌ (redirects to 403) |
| `viewer` | ❌ (no `ai_engine.manage`) | ❌ (redirects to 403) |

### 5.3 `filterNavItems` — Now Working (P8.2.6 Fix)

```typescript
// Fixed: now calls hasPermission()
if (userRole === "super_admin") return true;
if (!user) return false;
return hasPermission(user as AdminUser, item.requiredPermission as Permission);
```

---

## Phase 6: Settings Routes Redirect Verification

### 6.1 Settings Redirect Routes

| Route | Type | Target | Status |
|---|---|---|---|
| `/settings/ai` | Real page | — | ✅ EXISTS |
| `/settings/users` | Wrapper | `/staff` | ✅ EXISTS (P8.2.7) |
| `/settings/roles` | Wrapper | `/staff/roles` | ✅ EXISTS (P8.2.7) |
| `/settings/permissions` | Wrapper | `/staff/permissions` | ✅ EXISTS (P8.2.7) |
| `/settings/notifications` | **Removed redirect** | — (real page at `/notifications`) | ✅ `/notifications` is canonical |
| `/settings/data` | **Removed redirect** | — (real page at `/migration`) | ✅ `/migration` is canonical |
| `/settings/team` | Middleware redirect | `/staff` | ✅ Added in P8.2.8 |

### 6.2 Navigation Menu After Fixes

```
Cài đặt
├── AI Engine         → /settings/ai         (permission: ai_engine.manage)
├── Thông báo       → /notifications          (all logged-in users)
├── Người dùng     → /staff                  (all logged-in users)
├── Vai trò         → /staff/roles          (all logged-in users)
├── Phân quyền      → /staff/permissions   (all logged-in users)
└── Dữ liệu        → /migration             (all logged-in users)
```

---

## Phase 7: Bugs Fixed

| # | Severity | Location | Bug | Fix |
|---|---|---|---|---|
| 1 | **High** | `middleware.ts` | `"/notifications"` → `"/settings/notifications"` redirect broke real `/notifications` page | Removed redirect; `/notifications` is now canonical |
| 2 | **Medium** | `middleware.ts` | `"/settings/team"` had no redirect | Added `"/settings/team": "/staff"` |
| 3 | **Medium** | `admin-header.tsx` | Logout only `router.push("/login")`, didn't call logout API | Fixed to call `useAuthStore.logout()` |
| 4 | **Low** | `user-menu.tsx` | Hardcoded "Nguyễn Văn Admin" | Rewrote to use `useAuthStore` |

---

## Phase 8: Build Verification

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Pass (exit code 0) |
| Next.js Build (`pnpm run build`) | ✅ Pass (exit code 0) |
| Total routes | 105 |
| New pages | `/settings/users`, `/settings/roles`, `/settings/permissions` |
| Build warnings (new) | 0 |

---

## Phase 9: Files Modified

| File | Change |
|---|---|
| `middleware.ts` | Fixed `/notifications` redirect; added `/settings/team` redirect |
| `components/layout/admin-header.tsx` | Logout calls `useAuthStore.logout()` |
| `components/layout/user-menu.tsx` | Uses real auth store data; logout calls API |

---

## P8.2 Readiness After P8.2.8

| Phase | Status | Notes |
|---|---|---|
| **P8.2.1** providers.ts deprecation | ✅ COMPLETED | providers.ts deleted |
| **P8.2.2** Medusa service merge | ⏸️ SKIPPED | Not critical |
| **P8.2.3** Drop deprecated workspace tables | ✅ READY | Run after verifying 0 rows |
| **P8.2.4** Consolidate ai_settings | ⏸️ LOW PRIORITY | 1 API route uses it |
| **P8.2.5** Clean unused legacy files | ✅ COMPLETED | 3 files deleted |
| **P8.2.6** Restore AI Engine menu | ✅ COMPLETED | Sidebar permission fixed |
| **P8.2.7** Settings/Team/Auth nav | ✅ COMPLETED | Navigation + 3 wrappers |
| **P8.2.8** Auth/RBAC E2E verification | ✅ COMPLETED THIS | Auth flow verified + bugs fixed |

### Recommended next: P8.2.3 (Drop Deprecated Workspace Tables)

```sql
-- Verify row counts first:
SELECT COUNT(*) FROM pm_media_workflows;
SELECT COUNT(*) FROM pm_workflow_stages;
SELECT COUNT(*) FROM pm_workflow_comments;
SELECT COUNT(*) FROM pm_ai_suggestions;
-- All must return 0 before running DROP TABLE

-- Then:
DROP TABLE pm_media_workflows;
DROP TABLE pm_workflow_stages;
DROP TABLE pm_workflow_comments;
DROP TABLE pm_ai_suggestions;
```

Risk: **LOW** — confirmed deprecated by migration 008, no active imports.
