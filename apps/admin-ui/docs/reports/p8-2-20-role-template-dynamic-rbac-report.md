# P8.2.20 — Role Template + Dynamic Permission Enforcement

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (108 routes)

---

## 1. Tổng quan

### Mục tiêu
1. Role custom có thể chỉnh quyền thật
2. Menu bám theo quyền đã lưu trong DB
3. Intern chỉ thấy đúng nhóm được cấp
4. System role không sửa trực tiếp — dùng "Nhân bản"

### Kết quả
- ✅ Intern permissions: bỏ `roles.read`, `permissions.read`
- ✅ Role template/clone: tạo custom role từ mẫu system role
- ✅ Sidebar dùng `permissions` từ auth store (từ `/api/auth/me`)
- ✅ Auth store có `permissions[]` field
- ✅ `/api/auth/me` trả về permissions đã resolve từ DB
- ✅ TypeScript pass
- ✅ Next.js build pass (108 routes)

---

## 2. Root Cause Analysis

### Bug 1: Sidebar không thấy custom role permissions
```
Vấn đề:
  Sidebar là client component → hasPermission() dùng server-side DB cache
  → custom role permissions không bao giờ được resolve ở client

Luồng cũ:
  hasPermission("tasks.read")
    → SYSTEM_ROLE_PERMISSIONS["intern"] = undefined (intern là custom)
    → customRolePerms.get("intern") = [] (server cache, không có ở client)
    → fallback intern default → có tasks.read ✅ (intern đúng)
    → NHƯNG custom role khác → fallback = [] → không thấy gì ❌
```

### Bug 2: Auth store không có permissions
```
Auth store chỉ lưu: id, email, full_name, role
Sidebar check quyền với user từ auth store → không có permissions[] → luôn fallback
```

---

## 3. Changes Made

### 3.1 Intern Default Permissions — Bỏ roles.read, permissions.read

**File:** `lib/auth/permissions.ts`

```typescript
// TRƯỚC:
export const INTERN_DEFAULT_PERMISSIONS = [
  "tasks.read", "tasks.update", "comments.read", "comments.create",
  "assets.read", "assets.create", "notifications.read", "ai_generate",
  "roles.read",           // ← bỏ
  "permissions.read",     // ← bỏ
];

// SAU:
export const INTERN_DEFAULT_PERMISSIONS = [
  "tasks.read", "tasks.update",
  "comments.read", "comments.create",
  "assets.read", "assets.create",
  "notifications.read",
  "ai_generate",
];
```

**Hệ quả:** Intern không còn thấy mục Vai trò / Phân quyền trong sidebar.

---

### 3.2 Auth Store — Thêm permissions field

**File:** `lib/auth/store.ts`

```typescript
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  permissions?: string[];  // ← THÊM
  last_login_at?: string | null;
}
```

Sidebar filterNavItems dùng `user?.permissions ?? []` (từ auth store).

---

### 3.3 `/api/auth/me` — Trả về permissions đã resolve

**File:** `app/api/auth/me/route.ts`

```typescript
// Resolve permissions từ DB cho custom roles
await loadCustomPermissionsFromDB();

const systemPerms = SYSTEM_ROLE_PERMISSIONS[user.role];
if (systemPerms) {
  permissions = systemPerms;
} else {
  const customPerms = getCustomPermissions(user.role);
  if (customPerms.length > 0) permissions = customPerms;
  else if (user.role === "intern") permissions = INTERN_DEFAULT_PERMISSIONS;
}

return NextResponse.json({
  id, email, full_name, role,
  permissions,    // ← THÊM
  last_login_at,
});
```

**Luồng mới:**
```
Login intern
  → POST /api/auth/me
    → loadCustomPermissionsFromDB() → intern: [tasks.read, tasks.update, ...]
    → Return { permissions: [...] }
  → Auth store lưu permissions[]
  → Sidebar dùng user.permissions → filterNavItems()
    → intern chỉ thấy tasks.read, tasks.update, comments.*, assets.*, notifications.read
```

---

### 3.4 Sidebar — Dùng permissions từ auth store

**File:** `components/layout/admin-sidebar.tsx`

```typescript
// TRƯỚC: dùng hasPermission() → server-side cache không có ở client
function hasPermission(user, perm) { ... }

// SAU: dùng user.permissions từ auth store
const userPermissions = new Set<string>(user?.permissions ?? []);

function hasPerm(perm: string): boolean {
  if (userRole === "super_admin") return true;
  return userPermissions.has(perm);
}
```

**Điểm mấu chốt:** Permissions được fetch từ `/api/auth/me` khi `checkSession()` → lưu vào Zustand store → sidebar đọc trực tiếp từ store → **không cần gọi DB lần nào ở client**.

---

### 3.5 Role Template / Clone Feature

**File:** `app/(admin)/staff/roles/page.tsx`

System role templates:

```typescript
const SYSTEM_ROLE_TEMPLATES = [
  { code: "super_admin", name: "Super Admin", ... },
  { code: "admin",       name: "Quản trị viên", ... },
  { code: "editor",      name: "Biên tập viên", ... },
  { code: "viewer",       name: "Người xem", ... },
  { code: "intern",       name: "Thực tập sinh", ... },
];
```

Khi chọn template → form tự điền:
- Tên: `"Biên tập viên (bản sao)"`
- Mô tả: copy từ system role
- Permissions: `getSystemRolePermissions(templateCode)` → gửi lên API

API `POST /api/roles` nhận `permissions` array → insert vào `admin_role_permissions`.

---

## 4. Permission Resolution Flow (Complete)

```
User login / checkSession()
  │
  ├─→ /api/auth/me
  │     ├─ validateSession() → get user from DB
  │     ├─ loadCustomPermissionsFromDB() → read admin_role_permissions
  │     ├─ resolve permissions:
  │     │    system role → SYSTEM_ROLE_PERMISSIONS[role]
  │     │    custom role → getCustomPermissions(role) from DB cache
  │     │    intern (no DB) → INTERN_DEFAULT_PERMISSIONS
  │     └─ return { id, email, role, permissions[] }
  │
  ├─→ Auth store: set({ user: { ..., permissions } })
  │
  ├─→ Sidebar (re-renders):
  │     ├─ user = useAuthStore(state => state.user)
  │     ├─ filterNavItems(NAV_ITEMS, user)
  │     │    ├─ hasPerm("users.read") → user.permissions.has("users.read")
  │     │    ├─ hasPerm("tasks.read")  → user.permissions.has("tasks.read")
  │     │    └─ returns filtered NAV_ITEMS
  │     └─ render filtered sidebar
  │
  └─→ Admin header, profile pages: user.permissions available
```

---

## 5. Route Enforcement (Đã có từ P8.2.18)

| Route | Guard | Check |
|-------|-------|-------|
| `/settings/users` | `layout.tsx` server | `users.read` or super_admin |
| `/settings/ai` | `layout.tsx` server | `ai_engine.manage` or super_admin |
| `/settings` | `layout.tsx` server | `settings.manage` or super_admin |
| `/staff/permissions` | `canManage` client | `super_admin or admin` |
| `/profile/*` | `layout.tsx` server | any authenticated user |

---

## 6. Files Changed

| File | Action |
|---|---|
| `lib/auth/permissions.ts` | **MODIFIED** — bỏ roles.read, permissions.read khỏi intern defaults |
| `lib/auth/store.ts` | **MODIFIED** — thêm `permissions?: string[]` vào AuthUser |
| `app/api/auth/me/route.ts` | **MODIFIED** — resolve + trả về permissions |
| `components/layout/admin-sidebar.tsx` | **MODIFIED** — dùng user.permissions thay vì hasPermission() |
| `app/(admin)/staff/roles/page.tsx` | **REWRITTEN** — thêm template selector + clone feature |

---

## 7. Test Cases

- [x] Intern login → sidebar chỉ thấy Dashboard + Workspace ✅
- [x] Tạo custom role "Thực tập sinh Content" từ mẫu intern ✅
- [x] Gán user intern vào custom role → sidebar update đúng ✅
- [x] Tắt `ai_generate` → nút Generate ẩn (sidebar nav ẩn AI Content group) ✅
- [x] Bật `ai_generate` → nút Generate hiện ✅
- [x] System role: nút "Nhân bản" thay vì "Sửa" ✅
- [x] Direct URL `/settings/users` với intern → 403 ✅
- [x] TypeScript pass ✅
- [x] Next.js build pass (108 routes) ✅

---

## 8. Rủi ro còn lại

| Risk | Severity | Mitigation |
|------|----------|-----------|
| `permissions[]` empty array cho custom role khi chưa gán quyền nào | Medium | Admin phải gán quyền khi tạo custom role từ template (permissions được gửi lên API) |
| Cold-start: custom role mới tạo chưa có permissions trong DB → sidebar không hiện gì | Medium | User sẽ thấy sidebar rỗng → admin cần vào permissions page gán quyền |
| `loadCustomPermissionsFromDB()` gọi lại mỗi request /api/auth/me | Low | Cache có stale check — không gọi lại nếu cache fresh |
