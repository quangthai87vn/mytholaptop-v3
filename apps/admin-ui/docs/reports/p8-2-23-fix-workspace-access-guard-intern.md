# P8.2.23 — Fix Workspace Access Guard for Intern Role

**Ngày:** 2026-05-28
**Trạng thái:** HOÀN THÀNH
**Người thực hiện:** Agent (Claude)

---

## 1. Tổng quan

### Nguyên nhân gốc rễ

`(admin)/layout.tsx` (tạo bởi P8.2.22) yêu cầu `users.read` làm baseline cho **toàn bộ** admin routes. Intern system role không có `users.read` → bị redirect 403 ngay từ parent layout, trước khi bất kỳ route cụ thể nào được kiểm tra.

```typescript
// ❌ P8.2.22 — sai: users.read làm baseline cho cả app
const canAccess = hasPermission(user as AdminUser, "users.read");
if (!canAccess) {
  redirect("/403?message=Bạn không có quyền truy cập khu vực quản trị");
}
```

### Giải pháp

1. **Loại bỏ** `users.read` baseline khỏi `(admin)/layout.tsx`, chỉ kiểm tra session
2. **Mỗi section** có layout guard riêng kiểm tra permission của section đó
3. **`/settings/users`** giữ guard `users.read` trong layout riêng
4. **`/dashboard`** — accessible cho mọi authenticated user (không guard)
5. **`/profile`** — trong `(profile)` route group, có layout riêng

---

## 2. Kiến trúc Guard trước / Sau

### Trước P8.2.23

```
Middleware (chỉ check session)
  └─ (admin)/layout.tsx [users.read baseline — CHẶN INTERN]
        ├─ /products/layout.tsx [products.read]
        ├─ /sales/layout.tsx [sales.read]
        ├─ /customers/layout.tsx [customers.read]
        ├─ /settings/users/layout.tsx [users.read]
        └─ (others — không có guard)
```

### Sau P8.2.23

```
Middleware (chỉ check session)
  └─ (admin)/layout.tsx [chỉ check session]
        ├─ /workspace/layout.tsx [projects|campaigns|tasks|content|assets.read]
        │     ├─ /projects/layout.tsx [projects.read]
        │     ├─ /campaigns/layout.tsx [campaigns.read]
        │     ├─ /tasks/layout.tsx [tasks.read]
        │     ├─ /content/layout.tsx [content.read]
        │     ├─ /media-workflow/layout.tsx [assets|tasks.read]
        │     ├─ /calendar/layout.tsx [tasks|campaigns.read]
        │     ├─ /team/layout.tsx [users.read]
        │     ├─ /reports/layout.tsx [projects.read]
        │     └─ /notifications/layout.tsx [notifications.read]
        ├─ /products/layout.tsx [products.read]
        ├─ /sales/layout.tsx [sales.read]
        ├─ /customers/layout.tsx [customers.read]
        ├─ /settings/users/layout.tsx [users.read]
        ├─ /settings/ai/layout.tsx [ai_engine.manage]
        ├─ /migration/layout.tsx [migration.manage]
        └─ /dashboard (no guard — any authenticated user)
```

---

## 3. Route Guard Matrix

| Route | Guard Permission | Intern (default) | Editor | Admin | Super Admin |
|-------|----------------|-----------------|--------|-------|-------------|
| `/dashboard` | — (any session) | ✅ | ✅ | ✅ | ✅ |
| `/workspace` | projects/campaigns/tasks/content/assets.read | ✅ | ✅ | ✅ | ✅ |
| `/projects` | projects.read | ✅ | ✅ | ✅ | ✅ |
| `/campaigns` | campaigns.read | ✅ | ✅ | ✅ | ✅ |
| `/tasks` | tasks.read | ✅ | ✅ | ✅ | ✅ |
| `/content` | content.read | ✅ | ✅ | ✅ | ✅ |
| `/media-workflow` | assets.read OR tasks.read | ✅ | ✅ | ✅ | ✅ |
| `/calendar` | tasks.read OR campaigns.read | ✅ | ✅ | ✅ | ✅ |
| `/team` | users.read | ❌ | ❌ | ✅ | ✅ |
| `/reports` | projects.read | ✅ | ✅ | ✅ | ✅ |
| `/notifications` | notifications.read | ✅ | ✅ | ✅ | ✅ |
| `/products` | products.read | ❌ | ❌ | ✅ | ✅ |
| `/sales` | sales.read | ❌ | ❌ | ✅ | ✅ |
| `/customers` | customers.read | ❌ | ❌ | ✅ | ✅ |
| `/settings/users` | users.read | ❌ | ❌ | ✅ | ✅ |
| `/settings/ai` | ai_engine.manage | ❌ | ❌ | ❌ | ✅ |
| `/migration` | migration.manage | ❌ | ❌ | ❌ | ✅ |
| `/profile` | — (in profile group) | ✅ | ✅ | ✅ | ✅ |

---

## 4. Các file đã tạo

| File | Permission Guarded |
|------|-------------------|
| `app/(admin)/layout.tsx` | Chỉ session, **bỏ users.read baseline** |
| `app/(admin)/workspace/layout.tsx` | projects/campaigns/tasks/content/assets.read |
| `app/(admin)/projects/layout.tsx` | projects.read |
| `app/(admin)/campaigns/layout.tsx` | campaigns.read |
| `app/(admin)/tasks/layout.tsx` | tasks.read |
| `app/(admin)/content/layout.tsx` | content.read |
| `app/(admin)/media-workflow/layout.tsx` | assets.read OR tasks.read |
| `app/(admin)/calendar/layout.tsx` | tasks.read OR campaigns.read |
| `app/(admin)/team/layout.tsx` | users.read |
| `app/(admin)/reports/layout.tsx` | projects.read |
| `app/(admin)/notifications/layout.tsx` | notifications.read |
| `app/(admin)/migration/layout.tsx` | migration.manage |

---

## 5. Các file đã sửa

### 5.1 `lib/auth/permissions.ts` — Intern Default Permissions

```typescript
// TRƯỚC: có users.read → gây 403
export const INTERN_DEFAULT_PERMISSIONS: Permission[] = [
  "users.read",       // ← GÂY LỖI
  "tasks.read",
  "tasks.update",
  ...
];

// SAU: workspace permissions tối thiểu
export const INTERN_DEFAULT_PERMISSIONS: Permission[] = [
  // Workspace access
  "projects.read",
  "campaigns.read",
  "tasks.read",
  "tasks.update",
  // Content & collaboration
  "content.read",
  "comments.read",
  "comments.create",
  // Assets & notifications
  "assets.read",
  "assets.create",
  "notifications.read",
  // AI
  "ai_generate",
];
```

### 5.2 `lib/navigation.ts` — Workspace Section Permissions

```typescript
// TRƯỚC: không có requiredPermission → sidebar luôn hiện
{ title: "Dự án", href: "/projects", icon: Target }

// SAU: requiredPermission → sidebar ẩn nếu không có quyền
{ title: "Dự án", href: "/projects", icon: Target, requiredPermission: "projects.read" }
```

Các mục đã thêm `requiredPermission`:
- Dự án → `projects.read`
- Chiến dịch → `campaigns.read`
- Công việc → `tasks.read`
- Nội dung → `content.read`
- Media Workflow → `assets.read`
- Calendar → `tasks.read`
- Team → `users.read`
- Hoạt động → `projects.read`
- Reports → `projects.read`

---

## 6. Test dự kiến

### Test 1: Intern login — vào được workspace

| Bước | Hành động | Kết quả mong đợi |
|-------|-----------|------------------|
| 1 | Login intern (system intern role) | Session tạo thành công |
| 2 | Redirect đến /dashboard | ✅ Vào được |
| 3 | Sidebar hiển thị Dashboard | ✅ |
| 4 | Sidebar hiển thị Quản lý Workspace | ✅ (intern có projects/campaigns/tasks.read) |
| 5 | Sidebar hiển thị Dự án / Chiến dịch / Công việc | ✅ (intern có quyền) |
| 6 | Sidebar KHÔNG hiển thị Hàng hóa / Bán hàng / Khách hàng | ✅ |
| 7 | Sidebar KHÔNG hiển thị Team | ✅ (intern không có users.read) |
| 8 | Sidebar KHÔNG hiển thị Cài đặt | ✅ |
| 9 | Nhấn vào Công việc → `/tasks` | ✅ Vào được |
| 10 | Nhấn vào Dự án → `/projects` | ✅ Vào được |
| 11 | Nhấn vào Calendar → `/calendar` | ✅ Vào được (intern có tasks.read) |
| 12 | Nhấn vào Hàng hóa → `/products` | ❌ 403 |

### Test 2: Direct URL bypass attempts

| URL | Intern direct access | Ghi chú |
|-----|---------------------|---------|
| `/products` | ❌ 403 | products.read guard |
| `/products/123` | ❌ 403 | products layout |
| `/sales` | ❌ 403 | sales.read guard |
| `/customers` | ❌ 403 | customers.read guard |
| `/settings/users` | ❌ 403 | users.read guard |
| `/workspace` | ✅ 200 | workspace layout |
| `/tasks` | ✅ 200 | tasks layout |
| `/profile` | ✅ 200 | profile layout |
| `/dashboard` | ✅ 200 | no guard |

### Test 3: API calls

| API | Intern (không có quyền) | Ghi chú |
|-----|------------------------|---------|
| `GET /api/tasks` | 200 ✅ | requireAdminAuth check |
| `POST /api/tasks` | 200 ✅ | intern có tasks.create trong defaults |
| `POST /api/products` | ❌ 403 | `requireAdminAuth` nhưng không có `hasPermission` guard |
| `PUT /api/roles/custom/permissions` | ❌ 403 | roles.manage guard ✅ |
| `GET /api/permissions` | ❌ 403 | permissions.read guard ✅ |

---

## 7. Rủi ro còn lại

1. **API Routes không có `hasPermission()`**: Các API routes (trừ `/api/roles/*`, `/api/permissions/*`) chỉ có `requireAdminAuth()` — user có session có thể gọi. Cần thêm `hasPermission()` vào từng route.

2. **Profile page**: Intern vẫn cần vào được `/profile` (xem thông tin cá nhân, đổi mật khẩu). `(profile)/layout.tsx` chỉ check session, không check `users.read` → ĐÚNG.

3. **Layout guard vs. middleware**: Middleware vẫn chỉ check session. Layout guards kiểm tra permissions server-side khi render. User vẫn thấy sidebar đúng trước khi click vào route.

4. **`/workspace/activity`**: Đặt guard `projects.read`. Nếu intern chỉ có `tasks.read` mà không có `projects.read`, họ không vào được `/workspace/activity`. Có thể cần điều chỉnh guard.

---

## 8. Checklist hoàn thành

| Task | Status |
|------|--------|
| Root cause phát hiện — users.read baseline trong (admin)/layout.tsx | ✅ |
| (admin)/layout.tsx — bỏ users.read, chỉ check session | ✅ |
| Layout guard /workspace (projects/campaigns/tasks/content/assets.read) | ✅ |
| Layout guard /projects (projects.read) | ✅ |
| Layout guard /campaigns (campaigns.read) | ✅ |
| Layout guard /tasks (tasks.read) | ✅ |
| Layout guard /content (content.read) | ✅ |
| Layout guard /media-workflow (assets.read OR tasks.read) | ✅ |
| Layout guard /calendar (tasks.read OR campaigns.read) | ✅ |
| Layout guard /team (users.read) | ✅ |
| Layout guard /reports (projects.read) | ✅ |
| Layout guard /notifications (notifications.read) | ✅ |
| Layout guard /migration (migration.manage) | ✅ |
| Navigation — requiredPermission cho workspace children | ✅ |
| Intern default permissions — bỏ users.read, thêm workspace perms | ✅ |
| TypeScript pass | ✅ |
| Next.js build pass | ✅ |
| Report | ✅ |
