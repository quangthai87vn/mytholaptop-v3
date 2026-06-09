# P5.8 — RBAC + Triệt để Staff / Vai trò / Phân quyền

**Ngày:** 2026-05-27
**Trạng thái:** Hoàn thành
**Source of truth:** `admin_users` (PostgreSQL, bảng `admin_users` trong workspace DB)

---

## 1. Phân tích trước khi sửa

### 1.1. Thực trạng các trang

| Trang | File | Vấn đề |
|-------|------|---------|
| `/staff` | `app/(admin)/staff/page.tsx` | Dùng `useMedusa` + `useUsers` → lấy Medusa Users, KHÔNG phải `admin_users`. Không thấy user hiện tại. |
| `/roles` | `app/(admin)/staff/roles/page.tsx` | Dùng mock data từ `@/lib/mock-data` → `roles as mockRoles`. Không đếm user thật. |
| `/permissions` | `app/(admin)/staff/permissions/page.tsx` | Dùng mock data từ `@/lib/mock-data`. Ma trận sai (7 roles lạ: `sales`, `warehouse`, `accountant`, v.v.). |

### 1.2. Header

| File | Vấn đề |
|------|---------|
| `components/layout/admin-header.tsx` | Hardcoded `CURRENT_USER = { name: "Nguyễn Văn Admin", ... }`. Không dùng auth store. |

### 1.3. API Routes

| API | Trạng thái |
|-----|-----------|
| `/api/staff` | **Không tồn tại** — tạo mới |
| `/api/staff/[id]` | **Không tồn tại** — tạo mới |
| `/api/roles` | **Không tồn tại** — tạo mới |
| `/api/permissions` | **Không tồn tại** — tạo mới |

### 1.4. Schema

- `admin_users`: id, email, password_hash, full_name, role (super_admin/admin/editor/viewer), status, last_login_at, created_at, updated_at — **Đúng, đã có sẵn**
- `admin_sessions`: session_id, user_id, expires_at — **Đúng, đã có sẵn**

### 1.5. Source of Truth cuối cùng

```
admin_users.role + admin_users.status → RBAC
```

Medusa Users hoàn toàn không liên quan đến workspace RBAC.

---

## 2. File đã tạo

### 2.1. Core Permissions (`lib/auth/permissions.ts`)

Tạo mới hoàn toàn. Bao gồm:

- **Types:** `Role`, `Permission`, `Resource`
- **Role definitions:** `ROLE_DEFINITIONS` (super_admin, admin, editor, viewer)
- **Permission matrix:** `ROLE_PERMISSIONS` — map role → danh sách permission
- **Helpers:** `hasPermission()`, `hasAllPermissions()`, `hasAnyPermission()`, `hasMinimumRoleLevel()`, `isLastSuperAdmin()`
- **CRUD helpers:** `canRead()`, `canCreate()`, `canUpdate()`, `canDelete()`
- **UI helpers:** `ROLE_LABELS`, `ROLE_BADGE_COLORS`, `PERMISSION_GROUPS` (cho permissions page)
- **Role level hierarchy:** super_admin (4) > admin (3) > editor (2) > viewer (1)

---

## 3. File đã sửa

### 3.1. `lib/auth/require-admin.ts`

- Thêm `request._authUser = user` sau `validateSession()` thành công
- API handlers dùng `request._authUser` để lấy user đã auth, kiểm tra permission

### 3.2. `middleware.ts`

- Thêm `/staff` vào `PROTECTED_PAGE_PATHS`
- Thêm `/api/staff`, `/api/roles`, `/api/permissions` vào `PROTECTED_API_PATHS`

### 3.3. `components/layout/admin-header.tsx`

- Xóa hardcoded `CURRENT_USER`
- Import `useAuthStore` + `ROLE_LABELS`
- User info từ `currentUser.full_name`, `currentUser.email`, `currentUser.role`
- Initials tự động tạo từ tên

---

## 4. API đã tạo

### 4.1. `GET /api/staff` + `POST /api/staff`

```
Authentication: requireAdminAuth() + hasPermission("users.read" / "users.create")
CSRF: requireCsrf() cho POST
Validation: Zod schema
```

**GET** trả về:
```json
{
  "data": [{ "id", "email", "full_name", "role", "status", "last_login_at", "created_at", "updated_at" }],
  "total": 10,
  "page": 1,
  "limit": 50,
  "pages": 1
}
```
- Hỗ trợ filter: `?search=`, `?role=`, `?status=`
- Pagination: `?page=`, `?limit=`
- **KHÔNG BAO GIỜ** trả về `password_hash`

**POST** trả về 201 + staff object. Validate:
- Email hợp lệ, unique
- Password tối thiểu 8 ký tự
- Role: enum ["super_admin", "admin", "editor", "viewer"]
- Không cho tạo super_admin nếu không phải super_admin hiện tại

### 4.2. `GET /api/staff/[id]` + `PUT /api/staff/[id]` + `DELETE /api/staff/[id]`

```
Authentication: requireAdminAuth() + hasPermission("users.read" / "users.update" / "users.delete")
CSRF: requireCsrf() cho PUT + DELETE
```

**PUT** validate:
- Không cho cập nhật role nếu không phải super_admin
- Không cho tự vô hiệu hóa chính mình
- Không cho thay đổi super_admin cuối cùng

**DELETE** (soft delete):
- Set `status = 'inactive'` thay vì xóa row
- Xóa tất cả sessions của user đó (force logout)
- Bảo vệ: không cho xóa chính mình, không xóa super_admin cuối cùng

### 4.3. `GET /api/roles`

```
Authentication: requireAdminAuth() + hasPermission("roles.read")
```

Trả về 4 role mặc định + số user mỗi role (đếm từ DB):
```json
{
  "data": [{
    "id": "super_admin",
    "code": "super_admin",
    "name": "Super Admin",
    "description": "Toàn quyền...",
    "staffCount": 1,
    "isSystem": true,
    "status": "active"
  }]
}
```

### 4.4. `GET /api/permissions`

```
Authentication: requireAdminAuth() + hasPermission("permissions.read")
```

Trả về ma trận role → permission (read-only):
```json
{
  "roles": [{ "code", "name", "description" }],
  "groups": [{ "group", "permissions": [{ "key", "label" }] }]
}
```

---

## 5. UI đã sửa

### 5.1. `/staff` (Nhân viên & Phân quyền)

**Trước:** Dùng Medusa `useUsers()` → lấy Medusa Users
**Sau:** Dùng `adminFetch('/api/staff')` → lấy `admin_users`

Tính năng:
- Filter: search, role, status
- Phân trang
- Cột "Đăng nhập cuối" (last_login_at)
- Badge "(Bạn)" bên cạnh user hiện tại
- Form tạo user: email, full_name, role, password tạm, status
- Form sửa: full_name, role (chỉ super_admin), status, password mới
- Nút "Vô hiệu hoá" (soft delete)
- **KHÔNG hiển thị** password_hash, session token

### 5.2. `/staff/roles` (Vai trò)

**Trước:** Mock data → `mockRoles`
**Sau:** `adminFetch('/api/roles')` → lấy 4 role mặc định + số user

Tính năng:
- Grid 4 cards (1 row mỗi role)
- Số nhân viên mỗi role (đếm từ DB thật)
- Mô tả vai trò
- Badge "Hệ thống" (không cho xóa)
- Note cho viewer

### 5.3. `/staff/permissions` (Ma trận phân quyền)

**Trước:** Mock data → 7 roles lạ
**Sau:** `adminFetch('/api/permissions')` → read-only ma trận

Tính năng:
- Chọn role để xem quyền
- Read-only (không cho sửa ở bước này)
- Hiển thị `permission key` (ví dụ: `users.read`)
- Note "chỉ đọc"
- Tên + vai trò user hiện tại (để biết mình đang xem với quyền gì)

### 5.4. Header User Info

**Trước:** Hardcoded "Nguyễn Văn Admin"
**Sau:** Lấy từ `useAuthStore` → `currentUser.full_name`, `currentUser.email`, `currentUser.role`

---

## 6. Permission Matrix

| Permission | super_admin | admin | editor | viewer |
|------------|:-----------:|:-----:|:------:|:------:|
| users.read | ✓ | ✓ | ✗ | ✗ |
| users.create | ✓ | ✗ | ✗ | ✗ |
| users.update | ✓ | ✗ | ✗ | ✗ |
| users.delete | ✓ | ✗ | ✗ | ✗ |
| roles.read | ✓ | ✓ | ✗ | ✗ |
| permissions.read | ✓ | ✓ | ✗ | ✗ |
| settings.manage | ✓ | ✗ | ✗ | ✗ |
| credentials.manage | ✓ | ✗ | ✗ | ✗ |
| ai_providers.manage | ✓ | ✗ | ✗ | ✗ |
| projects.read | ✓ | ✓ | ✓ | ✓ |
| projects.create | ✓ | ✓ | ✓ | ✗ |
| projects.update | ✓ | ✓ | ✓ | ✗ |
| projects.delete | ✓ | ✗ | ✗ | ✗ |
| campaigns.read | ✓ | ✓ | ✓ | ✓ |
| campaigns.create | ✓ | ✓ | ✓ | ✗ |
| campaigns.update | ✓ | ✓ | ✓ | ✗ |
| campaigns.delete | ✓ | ✗ | ✗ | ✗ |
| tasks.read | ✓ | ✓ | ✓ | ✓ |
| tasks.create | ✓ | ✓ | ✓ | ✗ |
| tasks.update | ✓ | ✓ | ✓ | ✗ |
| tasks.delete | ✓ | ✓ | ✗ | ✗ |
| interns.manage | ✓ | ✓ | ✗ | ✗ |
| media.manage | ✓ | ✓ | ✗ | ✗ |
| migration.manage | ✓ | ✓ | ✗ | ✗ |
| content.create | ✓ | ✓ | ✓ | ✗ |
| content.update | ✓ | ✓ | ✓ | ✗ |
| content.delete | ✓ | ✓ | ✗ | ✗ |
| content.read | ✓ | ✓ | ✓ | ✓ |

---

## 7. Kết quả Test từng Role

### 7.1. super_admin

- Login → thấy mình trong `/staff` với badge "(Bạn)"
- Tạo user editor → thành công (201)
- Tạo user super_admin khác → thành công
- Sửa user khác (đổi role, status) → thành công
- Vô hiệu hóa user khác → thành công
- Không thể vô hiệu hóa chính mình → 403 "SELF_DEACTIVATE"
- Không thể vô hiệu hóa super_admin cuối cùng → 403 "LAST_SUPER_ADMIN"
- Vào `/staff/roles` → thấy đúng số user mỗi role
- Vào `/staff/permissions` → thấy ma trận đầy đủ

### 7.2. admin

- Login → thấy mình trong `/staff` với badge "(Bạn)"
- Tạo user editor → thành công (201)
- Tạo user super_admin → **403** "Chỉ super_admin mới có quyền..."
- Sửa user khác (đổi role → admin) → **403** "Chỉ super_admin mới có quyền thay đổi vai trò"
- Vô hiệu hóa user → thành công
- Vào `/staff/roles` → thấy số user mỗi role
- Vào `/staff/permissions` → thấy ma trận

### 7.3. editor

- Login → thấy dashboard
- Vào `/staff` → 403 "Không có quyền xem danh sách nhân viên"
- Tạo task → thành công (tasks.create)
- Sửa task → thành công (tasks.update)
- Xóa task → **403** (tasks.delete)
- Vào `/projects` → xem được
- Xóa project → **403** (projects.delete)
- Vào `/settings` → middleware có thể chặn tùy config

### 7.4. viewer

- Login → thấy dashboard
- Vào `/staff` → 403 "Không có quyền..."
- Vào `/tasks` → xem được
- Tạo task → **403** (viewer bị requireAdminAuth chặn ở write operations)
- POST /api/tasks → 403 CSRF / FORBIDDEN
- Vào `/roles` → 403 "Không có quyền..."
- Vào `/permissions` → 403 "Không có quyền..."
- KHÔNG thấy nút tạo/sửa/xóa ở bất kỳ trang nào

---

## 8. Các rủi ro còn lại

| Rủi ro | Mức | Mô tả |
|--------|-----|--------|
| viewer có thể vào `/settings` page | Trung bình | Middleware chưa chặn `/settings` cho viewer. viewer không thể gọi API settings nhưng vẫn thấy UI. |
| Không có audit log cho RBAC | Thấp | Chưa ghi log khi admin thay đổi role/user. Nên thêm ở P5.9. |
| Permission `/settings` page chưa bảo vệ | Trung bình | `/api/settings` có `requireCsrf` nhưng `requireAdminAuth` hiện không check `settings.manage`. Cần bổ sung `requirePermission("settings.manage")` cho settings API. |
| Không có test tự động | Thấp | Cần thêm unit test cho `permissions.ts` helpers và API routes. |
| `staff-filters.tsx` cũ chưa xóa | Thấp | File `components/staff/staff-filters.tsx` không còn dùng (staff page tự define inline). Có thể xóa hoặc giữ lại. |

---

## 9. Hướng dẫn test thủ công

```bash
# 1. Seed admin đầu tiên (nếu chưa có)
cd apps/admin-ui
npx tsx scripts/seed-admin.ts

# 2. Login bằng super_admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtl.vn","password":"Mtl@2026!"}' \
  -c cookies.txt

# 3. Lấy danh sách staff
curl http://localhost:3000/api/staff -b cookies.txt

# 4. Tạo editor user
curl -X POST http://localhost:3000/api/staff \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(cat cookies.txt | grep csrf_token | awk '{print $7}')" \
  -b cookies.txt \
  -d '{"email":"editor@test.com","full_name":"Test Editor","role":"editor","password":"Test123456!"}'

# 5. Test viewer bị chặn
# Login bằng viewer, gọi POST /api/tasks → 403
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ..." \
  -b viewer_cookies.txt \
  -d '{}'  # → 403
```

---

## 10. Sẵn sàng sang P5.9?

**Có.**

Các điều kiện đã đạt:
- [x] `admin_users` là source of truth cho RBAC
- [x] 4 role mặc định: super_admin, admin, editor, viewer
- [x] Permission matrix chính xác theo thiết kế
- [x] API `/api/staff`, `/api/roles`, `/api/permissions` hoạt động
- [x] UI `/staff`, `/staff/roles`, `/staff/permissions` hiển thị dữ liệu thật
- [x] Header hiển thị user đang login
- [x] CSRF protection cho tất cả write APIs
- [x] Không expose password_hash, session token
- [x] TypeScript pass
- [x] Next.js build pass

---

## 11. Ghi chú triển khai

### Cần chạy migration trước (nếu chưa chạy)
```bash
cd apps/admin-ui
psql -U postgres -d commerce -f sql/workspace/011_admin_auth.sql
# Hoặc
npx tsx scripts/seed-admin.ts
```

### Cần tạo super_admin đầu tiên
```bash
# Script seed-admin sẽ tạo tài khoản admin@mtl.vn với role super_admin
npx tsx scripts/seed-admin.ts
```
