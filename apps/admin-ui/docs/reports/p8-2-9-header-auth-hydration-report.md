# P8.2.9 — Header Auth Hydration & Session Reliability Report

**Phase:** P8.2.9
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## 1. Root Cause Analysis

### Problem: Header shows "—" after login

**Symptom:** After successful login and redirect to dashboard, the header displays:
- Avatar: `?`
- Name: `—`
- Email: `—`
- Role: `—`

### Root Cause: AdminLayout never called `checkSession()`

```
User flow (BEFORE):
Login → POST /api/auth/login → sets admin_session cookie + user in Zustand store
     → redirect to /workspace
     → AdminLayout mounts
     → ❌ NO checkSession() call — store has user from login, but header re-renders on route change
     → header reads useAuthStore → user IS set (from login) → ✓ shows name correctly

BUT after page refresh:
User refresh /workspace
     → AdminLayout mounts fresh (store resets to { user: null })
     → ❌ checkSession() never called → store.user stays null
     → header shows "—" and "?"

Edge case — hydration race:
     → Login form calls useAuthStore.login() → sets user in store
     → Redirect to /workspace → header renders BEFORE login state propagates
     → Zustand store update is synchronous but React re-render is async
     → Brief flash of "—" until re-render completes
```

The store WAS being set correctly after `login()` — the real issue was the **missing `checkSession()` call on mount**, causing:
1. User state lost on page refresh
2. Brief hydration gap on navigation

---

## 2. Files Modified

| File | Change |
|---|---|
| `lib/auth/store.ts` | Added `isAuthenticated` boolean; dev-mode incomplete user data warning; typed `AuthUser` explicitly |
| `components/layout/admin-layout.tsx` | Added `checkSession()` call on mount via `useEffect`; added auth guard redirect to `/login` if `user === null` |
| `components/layout/admin-header.tsx` | Added `isChecking` state; loading spinner in avatar; "Đang tải..." label; `getUserInitials()` and `getUserLabel()` helpers |

---

## 3. Auth Store Flow (After Fix)

### Store State Machine

```
Initial state: { user: null, isChecking: false, isAuthenticated: false, error: null }

On login() success:
  { user: <AuthUser>, isChecking: false, isAuthenticated: true, error: null }

On checkSession() success (refresh):
  { user: <AuthUser>, isChecking: false, isAuthenticated: true, error: null }

On checkSession() 401:
  { user: null, isChecking: false, isAuthenticated: false, error: null }

On logout():
  { user: null, isChecking: false, isAuthenticated: false, error: null }
```

### Lifecycle: Refresh Page

```
1. User refreshes /workspace
2. AdminLayout mounts → useEffect runs → checkSession() called
3. isChecking: true → header shows avatar spinner + "Đang tải..."
4. GET /api/auth/me → returns { id, email, full_name, role }
5. isChecking: false, user: <user>, isAuthenticated: true
6. Header re-renders: shows real name, email, role
```

### Lifecycle: Login

```
1. User submits login form → useAuthStore.login()
2. POST /api/auth/login → sets admin_session cookie
3. login() resolves → user set in store immediately
4. Login form calls router.push(redirectTo)
5. AdminLayout mounts on new page
6. useEffect → checkSession() (already has user, but ensures consistency)
7. Header shows user immediately (store already populated)
```

### Lifecycle: Logout

```
1. User clicks logout → useAuthStore.logout()
2. POST /api/auth/logout → deletes DB session + clears cookies
3. store.user: null, store.isAuthenticated: false
4. router.push("/login")
5. AdminLayout on new page → checkSession() → 401 → redirect handled
6. Login page shows
```

---

## 4. Header Behavior After Fix

| State | Avatar | Name Label | Role Label |
|---|---|---|---|
| `isChecking === true` (initial/refresh) | `Loader2` spinner | `Đang tải...` (gray) | `""` (empty) |
| `user !== null` (authenticated) | Initials from `full_name` | `full_name` | Role label from `ROLE_LABELS` |
| `user === null` after check (unauthenticated) | `?` | `—` (stays on redirect) | `—` |

### Helpers Added

```typescript
function getUserInitials(fullName: string | null | undefined): string {
  if (!fullName) return "...";
  return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getUserLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] || role;
}
```

---

## 5. Auth Guard in AdminLayout

```typescript
useEffect(() => {
  if (mounted && user === null) {
    const currentPath = window.location.pathname;
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
}, [mounted, user, router]);
```

If `checkSession()` returns 401 (no valid session), `user` stays `null`, and the guard redirects to `/login`.

---

## 6. Dev-mode Incomplete User Warning

```typescript
if (process.env.NODE_ENV === "development" && (!user.full_name || !user.email)) {
  console.warn("[Auth] /api/auth/me returned incomplete user data:", JSON.stringify(data));
}
```

Logs to console if `/api/auth/me` returns missing fields. Does NOT crash — just warns.

---

## 7. Build Verification

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Pass (exit code 0) |
| Next.js Build (`pnpm run build`) | ✅ Pass (exit code 0) |
| Total routes | 105 |
| Build warnings (new) | 0 |

---

## 8. Summary of Fixes

| # | Issue | Fix |
|---|---|---|
| 1 | `admin-layout.tsx` never called `checkSession()` — user lost on refresh | Added `useEffect(() => { checkSession() }, [])` on mount |
| 2 | No auth guard — unauthenticated user could see protected pages | Added redirect to `/login` when `user === null` after check |
| 3 | Header showed `"—"` when `user` was `null` during `isChecking` | Added `isChecking` state to show `Loader2` spinner + "Đang tải..." |
| 4 | No `isAuthenticated` boolean in store | Added `isAuthenticated` for explicit auth state |
| 5 | No dev warning for incomplete `/api/auth/me` response | Added `console.warn` in dev mode |
| 6 | Untyped `AuthUser` object creation in store | Explicit `AuthUser` type annotation |

---

## P8.2 Readiness After P8.2.9

| Phase | Status | Notes |
|---|---|---|
| **P8.2.1** providers.ts deprecation | ✅ COMPLETED | providers.ts deleted |
| **P8.2.2** Medusa service merge | ⏸️ SKIPPED | Not critical |
| **P8.2.3** Drop deprecated workspace tables | ✅ READY | Run after verifying 0 rows |
| **P8.2.4** Consolidate ai_settings | ⏸️ LOW PRIORITY | 1 API route uses it |
| **P8.2.5** Clean unused legacy files | ✅ COMPLETED | 3 files deleted |
| **P8.2.6** Restore AI Engine menu | ✅ COMPLETED | Sidebar permission fixed |
| **P8.2.7** Settings/Team/Auth nav | ✅ COMPLETED | Navigation + 3 wrappers |
| **P8.2.8** Auth/RBAC E2E verification | ✅ COMPLETED | Auth flow verified + bugs fixed |
| **P8.2.9** Header Auth Hydration | ✅ COMPLETED THIS | Auth hydration fixed |

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
