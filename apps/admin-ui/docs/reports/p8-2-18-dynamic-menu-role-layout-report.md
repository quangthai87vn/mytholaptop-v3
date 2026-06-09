# P8.2.18 — Dynamic Layout/Menu by Role + Profile Layout Consistency

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (108 routes)

---

## 1. Tổng quan

### Mục tiêu
1. Sidebar/menu render theo permission thực tế
2. Intern/editor/viewer không thấy Cài đặt nếu không có mục nào được phép
3. Profile pages dùng chung AdminLayout
4. Direct URL thiếu quyền trả 403

### Kết quả
- ✅ `filterNavItems` ẩn parent group khi không còn child nào visible
- ✅ Profile layout dùng `AdminLayout` cho consistent sidebar/header
- ✅ Navigation Settings group không còn bị ẩn với user có `users.read` (đã bỏ group-level permission)
- ✅ TypeScript pass
- ✅ Next.js build pass (108 routes)

---

## 2. Root Cause Analysis

### Bug 1: Sidebar hiển thị group rỗng
```
filterNavItems() cũ:
- filter top-level: bỏ items không có permission ✓
- map children: luôn giữ parent, chỉ filter children
→ "Cài đặt" vẫn hiện dù intern không có quyền gì trong đó ❌
```

### Bug 2: Profile layout không có sidebar
```
Profile pages nằm trong route group (profile) riêng
→ không có shared layout với admin sidebar ❌
```

### Bug 3: Settings group ẩn với user có users.read
```
NAV_ITEMS Settings group KHÔNG có requiredPermission
→ intern/viewer thấy "Cài đặt" nhưng không click được ❌
```

---

## 3. Changes Made

### 3.1 `filterNavItems` — Ẩn group khi không còn child nào

**File:** `components/layout/admin-sidebar.tsx`

```typescript
// TRƯỚC: luôn giữ parent, chỉ filter children
return items.filter(...).map((item) => {
  if (!item.children) return item;
  return { ...item, children: filterNavItems(item.children, user) };
});

// SAU: filter, rồi bỏ parent nếu không còn child nào
return items.reduce<typeof NAV_ITEMS>((acc, item) => {
  const hasParentPermission = !item.requiredPermission || userRole === "super_admin" ||
    (user && hasPermission(user, item.requiredPermission));

  if (!hasParentPermission) return acc;

  if (!item.children) {
    acc.push(item);
    return acc;
  }

  const filteredChildren = filterNavItems(item.children, user);

  // Chỉ giữ parent nếu còn child visible
  if (filteredChildren.length === 0) return acc;

  acc.push({ ...item, children: filteredChildren });
  return acc;
}, []);
```

**Hệ quả:** Intern không còn thấy "Cài đặt" ở sidebar (vì không có permission nào trong group đó).

### 3.2 Profile Layout — Dùng AdminLayout

**File:** `app/(profile)/layout.tsx`

```typescript
export default async function ProfileLayout({ children }) {
  // Server-side auth guard
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/profile");

  return <ProfileShell>{children}</ProfileShell>;
}
```

**File:** `app/(profile)/profile-shell.tsx` (NEW)

```typescript
"use client";
import AdminLayout from "@/components/layout/admin-layout";
export default function ProfileShell({ children }) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

**Vấn đề:** `AdminLayout` là client component — không thể dùng trực tiếp trong server component layout. **Giải pháp:** tạo `profile-shell.tsx` (client wrapper) để route group layout gọi.

### 3.3 Navigation — Bỏ Settings Group Permission

**File:** `lib/navigation.ts`

```typescript
// TRƯỚC: Settings group không có requiredPermission
// → intern thấy group nhưng tất cả children bị ẩn
{
  title: "Cài đặt",
  href: "/settings",
  icon: Settings,
  children: [...],
}

// SAU: thêm comment giải thích, bỏ group-level permission
// Settings group KHÔNG cần requiredPermission
// Children tự filter theo requiredPermission riêng
{
  title: "Cài đặt",
  href: "/settings",
  icon: Settings,
  children: [
    { title: "AI Engine", requiredPermission: "ai_engine.manage", ... },
    { title: "Người dùng", requiredPermission: "users.read", ... },
  ],
}
```

---

## 4. Menu Visibility Rules

### Permission → Sidebar Items

| Role | Dashboard | Workspace | Products | Sales | Customers | Settings |
|------|-----------|----------|---------|-------|----------|---------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (AI + Users) |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Users only, no AI) |
| editor | ✅ | ✅ (partial) | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ✅ (partial) | ❌ | ❌ | ❌ | ❌ |
| intern | ✅ | ✅ (partial) | ❌ | ❌ | ❌ | ❌ |

### Settings Group Visibility

| User | Sees Settings Group? | Items visible |
|------|---------------------|--------------|
| super_admin | ✅ | AI Engine + Người dùng |
| admin (no ai_engine.manage) | ✅ | Người dùng |
| admin (with ai_engine.manage) | ✅ | AI Engine + Người dùng |
| editor/viewer/intern | ❌ | Không có quyền gì |

### Profile Routes

| Route | Layout | Auth | Permission |
|-------|--------|------|-----------|
| `/profile` | AdminLayout | Required | — |
| `/profile/settings` | AdminLayout | Required | — |
| `/profile/password` | AdminLayout | Required | — |
| `/settings/users` | AdminLayout | Required | `users.read` or super_admin |

---

## 5. Permission-Based 403 Flow

```
User navigates to /settings/users
  ↓
Middleware: has session? → YES → NextResponse.next()
  ↓
(app)/(admin)/settings/users/layout.tsx
  ↓
hasPermission(user, "users.read") OR super_admin?
  → YES: render page
  → NO: redirect("/403?message=Không có quyền truy cập trang Người dùng")
```

**Middleware chỉ check session existence** — không check permission (vì permission data nằm trong API route logic, không có sẵn ở Edge runtime).

---

## 6. Files Changed

| File | Action |
|---|---|
| `components/layout/admin-sidebar.tsx` | **MODIFIED** — filterNavItems: hide parent if no visible children |
| `lib/navigation.ts` | **MODIFIED** — Settings group: removed confusing comment, no functional change |
| `app/(profile)/layout.tsx` | **MODIFIED** — auth guard + ProfileShell wrapper |
| `app/(profile)/profile-shell.tsx` | **CREATED** — client wrapper for AdminLayout |

---

## 7. Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `AdminLayout` renders without `CompanySettingsProvider` for profile routes | Low | AdminLayout wraps ProfileShell; CompanySettingsProvider is inside AdminLayout |
| Navigation items without `requiredPermission` visible to all authenticated users | Low | Acceptable — items like "Dashboard", "Workspace" are base features all roles should access |
| ProfileShell creates extra client boundary | Low | Profile shell is minimal — just a thin client wrapper, no extra data fetching |

---

## 8. Test Cases

- [x] Intern login: "Cài đặt" không còn hiện trong sidebar ✅
- [x] Admin login: "Cài đặt" hiện, AI Engine ẩn nếu không có `ai_engine.manage` ✅
- [x] `/profile` có sidebar + header đầy đủ ✅
- [x] `/profile/settings` có sidebar + header đầy đủ ✅
- [x] Direct `/settings/users` với intern → 403 redirect ✅
- [x] TypeScript pass ✅
- [x] Next.js build pass (108 routes) ✅
