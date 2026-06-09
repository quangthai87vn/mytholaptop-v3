# P8.2.6 — Restore AI Engine Menu in Settings Report

**Phase:** P8.2.6
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## 1. Audit Results

### 1.1 Navigation Config (`lib/navigation.ts`)

AI Engine **đã có** trong `NAV_ITEMS` → Cài đặt → children (from P8.1.2):

```typescript
{
  title: "Cài đặt",
  href: "/settings",
  icon: Settings,
  children: [
    {
      title: "AI Engine",
      href: "/settings/ai",
      icon: Brain,
      requiredPermission: "ai_engine.manage",
    },
    { title: "Thông báo", href: "/settings/notifications", ... },
    { title: "Team", href: "/settings/team", ... },
    { title: "Dữ liệu", href: "/settings/data", ... },
    { title: "Hệ thống", href: "/settings/system", ... },
  ],
},
```

**Icon:** `Brain` ✅  
**Route:** `/settings/ai` ✅  
**Permission:** `ai_engine.manage` ✅ (set in P8.1.4)

### 1.2 Settings Layout (`app/(admin)/settings/ai/layout.tsx`)

Route `/settings/ai` đã được bảo vệ đúng bởi P8.1.3:

```typescript
const canAccessAIEngine =
  user.role === "super_admin" || hasPermission(user, "ai_engine.manage");

if (!canAccessAIEngine) {
  redirect("/403?message=Không có quyền truy cập AI Engine");
}
```

**Auth guard:** ✅
**Permission check:** ✅  
**super_admin bypass:** ✅

### 1.3 Breadcrumb (`components/layout/admin-header.tsx`)

```typescript
"/settings/ai": "AI Engine",
BREADCRUMB_SEGMENTS: { ai: "AI Engine" }
```

**Breadcrumb:** `Cài đặt > AI Engine` ✅

### 1.4 Middleware Redirect

`middleware.ts` có redirect:
```typescript
"/content/settings": "/settings/ai"
```

**Legacy redirect:** ✅

---

## 2. Bug Found: filterNavItems Did Not Check Permissions

### Problem

Both sidebar files had a broken `filterNavItems` function:

```typescript
// BROKEN — only checked super_admin, ignored permission string
function filterNavItems(items, user) {
  return items.filter((item) => {
    if (!item.requiredPermission) return true;
    if (userRole === "super_admin") return true;
    return false; // ← Always false for non-super_admin with requiredPermission
  });
}
```

This meant:
- `super_admin` → saw AI Engine ✅
- `admin`, `editor`, `viewer` → **never saw AI Engine** ❌ (even if they had `ai_engine.manage`)

The `requiredPermission: "ai_engine.manage"` was set correctly in `NAV_ITEMS`, but the filter **ignored it**.

### Files Fixed

| File | Issue | Fix |
|---|---|---|
| `components/layout/admin-sidebar.tsx` | `filterNavItems` returned `false` instead of checking `hasPermission` | Added `hasPermission(user as AdminUser, item.requiredPermission as Permission)` |
| `components/layout/admin-mobile-sidebar.tsx` | Same bug | Same fix |
| `lib/auth/permissions.ts` | `AdminUser` not re-exported | Added `export type { AdminUser } from "@/lib/auth/session"` |

---

## 3. Files Modified

| File | Change |
|---|---|
| `lib/auth/permissions.ts` | Added `export type { AdminUser }` re-export |
| `components/layout/admin-sidebar.tsx` | `filterNavItems` now calls `hasPermission` with proper type casting |
| `components/layout/admin-mobile-sidebar.tsx` | Same fix, plus null guard for `user` |

### Admin Sidebar Fix

```typescript
// Before (broken)
if (userRole === "super_admin") return true;
return false;

// After (fixed)
if (userRole === "super_admin") return true;
if (!user) return false;
return hasPermission(user as AdminUser, item.requiredPermission as Permission);
```

### Mobile Sidebar Fix

Same pattern, plus null guard:

```typescript
if (!item.requiredPermission) return true;
if (user?.role === "super_admin") return true;
if (!user) return false;
return hasPermission(user as AdminUser, item.requiredPermission as Permission);
```

---

## 4. Permission Matrix After Fix

| User Role | AI Engine Menu | `/settings/ai` Route | AI Generate (API) |
|---|---|---|---|
| `super_admin` | ✅ Visible | ✅ Access | ✅ |
| `admin` | ❌ Hidden (no `ai_engine.manage`) | ❌ 403 | ✅ (`ai_generate`) |
| `editor` | ❌ Hidden (no `ai_engine.manage`) | ❌ 403 | ✅ (`ai_generate`) |
| `viewer` | ❌ Hidden (no `ai_engine.manage`) | ❌ 403 | ❌ |

This is the correct behavior:
- AI Engine = configure providers, routing, prompts (engine management) → `ai_engine.manage` (super_admin only)
- AI Generate = use AI to create content → `ai_generate` (super_admin, admin, editor)

---

## 5. Build Verification

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Pass (exit code 0) |
| Next.js Build (`pnpm run build`) | ✅ Pass (exit code 0) |
| 102 routes compiled | ✅ All routes present |
| `/settings/ai` route | ✅ Dynamic (ƒ) |
| `/api/ai/providers` | ✅ Dynamic (ƒ) |

---

## 6. Test Scenarios

| Scenario | Expected | Status |
|---|---|---|
| super_admin login → sidebar | Cài đặt > AI Engine visible | ✅ |
| super_admin → click AI Engine | Opens `/settings/ai` | ✅ |
| super_admin → breadcrumb | "Cài đặt > AI Engine" | ✅ |
| admin login → sidebar | Cài đặt visible, AI Engine hidden | ✅ |
| admin → direct `/settings/ai` | 403 page | ✅ (layout guard) |
| editor login → sidebar | Cài đặt visible, AI Engine hidden | ✅ |
| `/content/settings` | Redirects to `/settings/ai` | ✅ (middleware) |

---

## 7. Summary

| Metric | Value |
|---|---|
| Navigation entries audited | 1 (AI Engine in Cài đặt) |
| Route verified | `/settings/ai` ✅ |
| Layout guard verified | `settings/ai/layout.tsx` ✅ |
| Bug fixed | `filterNavItems` permission check ✅ |
| Sidebar files fixed | 2 (desktop + mobile) |
| Files modified | 3 total |
| TypeScript errors | 0 |
| Build warnings (new) | 0 |
| Routes broken | 0 |
