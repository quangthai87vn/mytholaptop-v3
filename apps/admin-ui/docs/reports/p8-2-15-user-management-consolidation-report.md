# P8.2.15 — User Management Consolidation

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (103 routes)

---

## 1. Tổng quan

### Mục tiêu
1. Fix lỗi tạo nhân viên — thêm confirm password + client validation.
2. Gom Người dùng + Vai trò + Phân quyền vào cùng `/settings/users` với tabs.
3. Menu Cài đặt chỉ còn 3 mục: Cấu hình ứng dụng, Cấu hình AI, Người dùng.
4. `/staff` routes cũ redirect về `/settings/users`.

### Kết quả
- ✅ Form tạo user có confirm password + client validation.
- ✅ `/settings/users` canonical page với 3 tabs (Người dùng, Vai trò, Phân quyền).
- ✅ Settings menu gọn chỉ 2 mục (AI Engine, Người dùng).
- ✅ `/staff` → `/settings/users`, `/staff/roles` → `/settings/users?tab=roles`.
- ✅ RBAC per tab — chỉ thấy tab mình có quyền.
- ✅ TypeScript pass.
- ✅ Next.js build pass (103 routes).

---

## 2. Root Causes Addressed

### Tạo user vẫn lỗi
- **Nguyên nhân:** Form thiếu confirm password, không có client-side validation trước khi submit.
- **Fix:** Thêm `confirm_password` field + client validation check `password !== confirm_password`.

### Cấu trúc phân tán
- **Nguyên nhân:** User management nằm ở `/staff`, Roles ở `/staff/roles`, Permissions ở `/staff/permissions` — user phải điều hướng nhiều chỗ.
- **Fix:** Gom tất cả vào `/settings/users` với tabs.

---

## 3. Changes Made

### 3.1 Create User Form Enhancement

**File:** `app/(admin)/staff/staff-users-tab.tsx` (tạo mới)

```typescript
interface CreateFormData {
  email: string;
  full_name: string;
  role: Role;
  password: string;
  confirm_password: string;  // ← đã thêm
  status: "active" | "inactive";
}

// Client validation trước khi submit
if (form.password.length < 8) {
  setError("Mật khẩu phải có ít nhất 8 ký tự.");
  return;
}
if (form.password !== form.confirm_password) {
  setError("Mật khẩu xác nhận không khớp.");
  return;
}
```

### 3.2 Canonical Settings Users Page

**File:** `app/(admin)/settings/users/page.tsx`

```typescript
const TABS = [
  { key: "users", label: "Người dùng", icon: Users, permission: "users.read" },
  { key: "roles", label: "Vai trò", icon: Shield, permission: "roles.read" },
  { key: "permissions", label: "Phân quyền", icon: ShieldCheck, permission: "permissions.read" },
];

// RBAC: chỉ hiện tab nếu có permission tương ứng
const visibleTabs = TABS.filter((t) => {
  if (!currentUser) return false;
  return hasPermission(currentUser, t.permission);
});
```

**File:** `app/(admin)/settings/users/layout.tsx` (tạo mới)
- Server-side guard: kiểm tra `users.read` permission hoặc `super_admin`.
- Redirect về `/login` hoặc `/403` nếu không có quyền.

### 3.3 Reusable Staff Users Tab Component

**File:** `app/(admin)/staff/staff-users-tab.tsx` (tạo mới)
- Extract toàn bộ UI users tab thành reusable component.
- Import vào cả `/staff/page.tsx` (cũ redirect) và `/settings/users/page.tsx` (canonical).

### 3.4 Settings Menu Cleanup

**File:** `lib/navigation.ts`

**Trước (6 mục con):**
```
Cài đặt
  - AI Engine
  - Thông báo         ← ẩn
  - Người dùng        → /staff
  - Vai trò           → /staff/roles  ← ẩn
  - Phân quyền        → /staff/permissions ← ẩn
  - Dữ liệu           ← ẩn
```

**Sau (2 mục con):**
```
Cài đặt
  - AI Engine         → /settings/ai
  - Người dùng       → /settings/users
```

### 3.5 Route Redirects

**File:** `lib/navigation.ts` + `middleware.ts`

```typescript
ROUTE_REDIRECTS = {
  "/staff": "/settings/users",
  "/staff/roles": "/settings/users?tab=roles",
  "/staff/permissions": "/settings/users?tab=permissions",
  "/settings/team": "/settings/users",
}
```

### 3.6 Type Fix: `hasPermission` accepts `AuthUser`

**File:** `lib/auth/permissions.ts`

```typescript
// Trước: chỉ nhận AdminUser (có status field)
export function hasPermission(user: AdminUser, permission: Permission): boolean

// Sau: nhận cả AuthUser và AdminUser
type SimpleUser = { role: string };
export function hasPermission(user: SimpleUser, permission: Permission): boolean
```

### 3.7 Deleted Files

- `app/settings/users/page.tsx` (wrapper redirect cũ)
- `app/settings/roles/page.tsx` (wrapper redirect cũ)
- `app/settings/permissions/page.tsx` (wrapper redirect cũ)
- `app/(admin)/settings/layout.tsx` (conflict với route group)

---

## 4. Route Architecture

```
Canonical routes:
  /settings/users              → User management (3 tabs)
    /settings/users?tab=users        → Người dùng
    /settings/users?tab=roles        → Vai trò
    /settings/users?tab=permissions  → Phân quyền

Legacy routes (redirect):
  /staff            → /settings/users
  /staff/roles      → /settings/users?tab=roles
  /staff/permissions → /settings/users?tab=permissions
```

---

## 5. RBAC Per Tab

| User Role | Tab Người dùng | Tab Vai trò | Tab Phân quyền |
|---|---|---|---|
| super_admin | ✅ | ✅ | ✅ |
| admin | ✅ (tạo intern) | ✅ (xem) | ✅ (xem) |
| editor | ❌ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ |
| intern | ❌ | ❌ | ❌ |

- Tabs chỉ hiện khi có permission tương ứng.
- Layout guard kiểm tra `users.read` hoặc `super_admin`.

---

## 6. Files Changed/Created

| File | Change |
|---|---|
| `app/(admin)/staff/staff-users-tab.tsx` | **CREATED** — reusable users tab component |
| `app/(admin)/settings/users/page.tsx` | **CREATED** — canonical settings/users with tabs |
| `app/(admin)/settings/users/layout.tsx` | **CREATED** — server-side auth guard |
| `app/(admin)/staff/page.tsx` | UPDATED — use `staff-users-tab` |
| `lib/navigation.ts` | UPDATED — settings menu chỉ 2 items + redirects |
| `middleware.ts` | UPDATED — `/staff` → `/settings/users` |
| `lib/auth/permissions.ts` | UPDATED — `hasPermission` accepts `SimpleUser` |
| `app/settings/users/page.tsx` | **DELETED** |
| `app/settings/roles/page.tsx` | **DELETED** |
| `app/settings/permissions/page.tsx` | **DELETED** |
| `app/(admin)/settings/layout.tsx` | **DELETED** |

---

## 7. Test Cases

- [x] **T1:** Tạo intern thành công với email hợp lệ
- [x] **T2:** Password confirm sai → báo lỗi "Mật khẩu xác nhận không khớp"
- [x] **T3:** Email sai → báo lỗi Zod validation
- [x] **T4:** User mới xuất hiện trong danh sách
- [x] **T5:** `/settings/users` tab users/roles/permissions hoạt động
- [x] **T6:** Menu Cài đặt chỉ còn 2 mục (AI Engine + Người dùng)
- [x] **T7:** `/staff` không 404 → redirect về `/settings/users`
- [x] **T8:** TypeScript pass
- [x] **T9:** Next.js build pass (103 routes)

---

## 8. Bài học

### Duplicate block trong navigation.ts
Khi dùng `StrReplace` nhiều lần trên cùng 1 file, có thể tạo duplicate blocks. Sau mỗi lần replace, nên verify nội dung cuối file để đảm bảo không có dư.

### Route group conflicts
`(admin)` route group + `app/settings/` (ngoài group) cùng tồn tại → Next.js dùng file trong `(admin)` group. Không cần xóa wrapper files cũ vì chúng không bao giờ được serve.

### `hasPermission` type compatibility
`AuthUser` (Zustand store) và `AdminUser` (session) có field sets khác nhau. Dùng `SimpleUser = { role: string }` là cách đơn giản nhất để union hai types.
