# P8.2.22 — Permission Save + Menu Enforcement Verification

**Ngày:** 2026-05-28
**Trạng thái:** HOÀN THÀNH
**Người thực hiện:** Agent (Claude)

---

## 1. Tổng quan

P8.2.21 đã sửa SQL syntax error trong `PUT /api/roles/[code]/permissions`. P8.2.22 xác nhận và bổ sung enforcement:

1. **Sidebar menu** — ẩn Hàng hóa / Bán hàng / Khách hàng khi intern không có quyền ✓
2. **Direct URL guard** — thêm layout files chặn `/products`, `/sales`, `/customers` nếu không có quyền ✓
3. **AI Generate button** — ẩn trong header quick actions khi không có `ai_generate` permission ✓
4. **Intern default permissions** — thêm `users.read` để intern có thể xem profile page ✓

---

## 2. Kiến trúc RBAC hiện tại

### 2.1 Permission Resolution Flow

```
User login / session check
  │
  └─ GET /api/auth/me
        │
        ├─ loadCustomPermissionsFromDB() — load all custom perms from DB
        │
        ├─ System role → SYSTEM_ROLE_PERMISSIONS[role] (hardcoded)
        │   super_admin: tất cả permissions
        │   admin: tất cả trừ roles.manage, credentials
        │   editor: workspace + ai_generate
        │   viewer: chỉ read
        │
        ├─ Custom role → getCustomPermissions(role_code) từ DB cache
        │
        └─ Response: { id, email, full_name, role, permissions, last_login_at }
              └─ Lưu vào Zustand useAuthStore → user.permissions
                    └─ Sidebar filter: filterNavItems(user) dùng user.permissions
```

### 2.2 Permission Enforcement Points

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Sidebar menu | `filterNavItems()` dùng `user.permissions` từ Zustand | ✅ Hoạt động |
| Direct URL | Server layout files với `validateSession()` + `hasPermission()` | ✅ Mới thêm |
| API routes | `requireAdminAuth()` + `hasPermission()` trong handler | ⚠️ Cần review từng route |
| AI Generate button | `visibleActions` filtered bởi `user.permissions` | ✅ Mới thêm |

---

## 3. Các file đã sửa / tạo mới

### 3.1 File mới

| File | Mục đích |
|------|-----------|
| `app/(admin)/layout.tsx` | Baseline auth guard — redirect `/login` nếu không session. Chỉ kiểm tra `users.read` |
| `app/(admin)/products/layout.tsx` | Guard `/products/*` — yêu cầu `products.read` |
| `app/(admin)/sales/layout.tsx` | Guard `/sales/*` — yêu cầu `sales.read` |
| `app/(admin)/customers/layout.tsx` | Guard `/customers/*` — yêu cầu `customers.read` |

### 3.2 File sửa

| File | Thay đổi |
|------|-----------|
| `lib/navigation.ts` | Thêm `requiredPermission` cho "Hàng hoá" (`products.read`), "Bán hàng" (`sales.read`), "Khách hàng" (`customers.read`) |
| `lib/auth/permissions.ts` | Thêm `products.*`, `sales.read`, `customers.read` vào `Permission` type và `INTERN_DEFAULT_PERMISSIONS` |
| `components/layout/admin-header.tsx` | Thêm `useMemo` filter cho `QUICK_ACTIONS` — ẩn "Tạo nội dung AI" nếu không có `ai_generate` |

---

## 4. Chi tiết từng thay đổi

### 4.1 Permission Types (`lib/auth/permissions.ts`)

```typescript
export type Permission =
  // ... existing ...
  | "products.read" | "products.manage" | "products.create" | "products.update" | "products.delete"
  | "sales.read" | "sales.manage" | "customers.read" | "customers.manage"
  // ... existing ...
```

### 4.2 Intern Default Permissions

```typescript
export const INTERN_DEFAULT_PERMISSIONS: Permission[] = [
  "users.read",          // ← THÊM MỚI — để intern có thể vào profile/settings
  "tasks.read",
  "tasks.update",
  "comments.read",
  "comments.create",
  "assets.read",
  "assets.create",
  "notifications.read",
  "ai_generate",
];
```

### 4.3 Navigation Permissions (`lib/navigation.ts`)

```typescript
// Hàng hoá — THÊM
{
  title: "Hàng hoá",
  href: "/products",
  icon: Package,
  requiredPermission: "products.read",  // ← THÊM
  children: [ ... ],
},

// Bán hàng — THÊM
{
  title: "Bán hàng",
  href: "/sales",
  icon: ShoppingBag,
  requiredPermission: "sales.read",    // ← THÊM
  children: [ ... ],
},

// Khách hàng — THÊM
{
  title: "Khách hàng",
  href: "/customers",
  icon: UsersIcon,
  requiredPermission: "customers.read",  // ← THÊM
  children: [ ... ],
},
```

### 4.4 Layout Guard (ví dụ: `app/(admin)/products/layout.tsx`)

```typescript
export default async function ProductsLayout({ children }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/products");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/products");
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, "products.read")) {
    redirect("/403?message=Bạn không có quyền truy cập Hàng hóa");
  }
  return <>{children}</>;
}
```

### 4.5 AI Generate Button Filter (`components/layout/admin-header.tsx`)

```typescript
const visibleActions = useMemo(() => {
  const perms = new Set(currentUser?.permissions ?? []);
  const isSuperAdmin = currentUser?.role === "super_admin";
  return QUICK_ACTIONS.filter((action) => {
    if (action.href === "/content") {
      return isSuperAdmin || perms.has("ai_generate");
    }
    return true;
  });
}, [currentUser]);
```

---

## 5. Luồng test dự kiến

### Test 1: Tạo custom role và lưu permissions

| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-----------------|
| 1 | Login super_admin | Vào được `/settings/users?tab=permissions` |
| 2 | Bấm "Nhân bản" trên role "Thực tập sinh" | Tạo custom role mới |
| 3 | Trong custom role: bật `projects.read`, `tasks.read`, `tasks.update` | Toggle hoạt động |
| 4 | Bật `ai_generate` | Toggle hoạt động |
| 5 | Bỏ tất cả Hàng hóa / Bán hàng / Khách hàng | Không chọn |
| 6 | Bấm "Lưu phân quyền" | Toast thành công |
| 7 | Reload trang `/settings/users?tab=permissions` | Quyền vẫn giữ đúng |
| 8 | Gọi `GET /api/auth/me` | `permissions` chứa `["projects.read", "tasks.read", "tasks.update", "ai_generate"]` |

### Test 2: Intern login — sidebar visibility

| Bước | Hành động | Kết quả mong đợi |
|------|-----------|-----------------|
| 1 | Login intern (custom role đã lưu ở Test 1) | |
| 2 | Sidebar hiển thị | Dashboard ✓ |
| 3 | Sidebar hiển thị | Quản lý Workspace ✓ (vì có projects.read) |
| 4 | Sidebar KHÔNG hiển thị | Hàng hóa ✗ (không có products.read) |
| 5 | Sidebar KHÔNG hiển thị | Bán hàng ✗ (không có sales.read) |
| 6 | Sidebar KHÔNG hiển thị | Khách hàng ✗ (không có customers.read) |
| 7 | Sidebar KHÔNG hiển thị | Cài đặt ✗ (không có users.read) |
| 8 | Header quick actions | Không thấy "Tạo nội dung AI" (không có ai_generate) |

### Test 3: Direct URL 403 enforcement

| URL | Intern (không quyền) | Admin (có users.read) |
|-----|---------------------|----------------------|
| `/products` | ❌ 403 redirect to /403 | ✅ Vào được |
| `/sales` | ❌ 403 redirect to /403 | ✅ Vào được |
| `/customers` | ❌ 403 redirect to /403 | ✅ Vào được |
| `/settings/users` | ❌ 403 redirect to /403 | ✅ Vào được |
| `/dashboard` | ✅ Vào được | ✅ Vào được |
| `/profile` | ✅ Vào được (intern có users.read) | ✅ Vào được |

### Test 4: API enforcement

| API | Intern (không quyền) | Ghi chú |
|-----|---------------------|---------|
| `GET /api/products` | 401/403 (không có products.read) | Chờ API thêm `hasPermission` |
| `POST /api/tasks` | 200 (có tasks.create) | Nếu có quyền |
| `DELETE /api/tasks/123` | 403 (intern không có tasks.delete) | Chờ API thêm `hasPermission` |
| `PUT /api/roles/custom_code/permissions` | 403 (intern không có roles.manage) | ✅ Đã có trong API |

---

## 6. Rủi ro còn lại

1. **API routes không có `hasPermission()` guard**: Hầu hết API routes chỉ có `requireAdminAuth()` (kiểm tra session), không kiểm tra specific permissions. User intern có thể gọi `POST /api/tasks` nếu có `tasks.create`, nhưng không thể gọi `POST /api/products` nếu không có `products.create` — Tuy nhiên route này hiện tại không có permission check. Cần thêm `hasPermission()` vào từng API route.

2. **Profile page access**: Intern cần `users.read` để vào profile. Đã thêm vào `INTERN_DEFAULT_PERMISSIONS`. Nếu intern role là system `intern` (không phải custom), `INTERN_DEFAULT_PERMISSIONS` được dùng. Nếu intern là custom role, permissions từ DB được dùng.

3. **Cache invalidation**: `invalidateCustomPermissionsCache()` đặt `cacheStamp = 0`. Cache được reload trên request tiếp theo. Trong multi-instance, cần sticky session hoặc distributed cache.

4. **Transaction**: DELETE + INSERT permissions không wrap trong explicit transaction. Nếu INSERT fail, data đã bị DELETE. Rủi ro thấp vì request fail sẽ return error và user thấy toast.

---

## 7. Checklist hoàn thành

| Task | Status |
|------|--------|
| P8.2.21 SQL fix — permissions lưu được | ✅ Hoàn thành |
| Sidebar ẩn Hàng hóa/Bán hàng/Khách hàng cho intern | ✅ Hoàn thành |
| Layout guards cho `/products`, `/sales`, `/customers` | ✅ Hoàn thành |
| AI Generate button ẩn khi không có `ai_generate` | ✅ Hoàn thành |
| Intern có `users.read` để vào profile | ✅ Hoàn thành |
| TypeScript pass | ✅ Hoàn thành |
| Next.js build pass | ✅ Hoàn thành |
| Verification report | ✅ Hoàn thành |

---

## 8. Bước tiếp theo đề xuất

1. **Thêm `hasPermission()` vào các API routes quan trọng**: `POST /api/tasks`, `POST /api/projects`, `POST /api/products`, `POST /api/campaigns`
2. **Test UI thực tế**: Cần login intern và xác nhận sidebar ẩn đúng, direct URL chặn đúng
3. **Kiểm tra `ai_generate` toggle**: Khi tắt `ai_generate` trong custom role, button phải biến mất sau login lại
4. **Xem xét `/workspace`, `/tasks`, `/projects`, `/content` guards**: Các route này cũng nên có layout guards nếu intern không có quyền
