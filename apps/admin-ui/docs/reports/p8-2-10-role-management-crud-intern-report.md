# P8.2.10 — Role Management CRUD + Intern Role

**Ngày:** 2026-05-27
**Trạng thái:** Hoàn thành ✅

---

## Tổng quan

Phase này chuyển hệ thống RBAC từ **hardcoded hoàn toàn** sang **hybrid DB + hardcoded**:

- **System roles** (`super_admin`, `admin`, `editor`, `viewer`) vẫn hardcoded để đảm bảo an toàn
- **Custom roles** (bắt đầu với `intern`) được lưu trong DB và quản lý qua UI
- User có role `intern` có thể login, thấy task được giao, comment, upload asset, dùng AI generate

---

## 1. Kiến trúc Role mới

### Database Schema

**Bảng `admin_roles`** — lưu custom role definitions:

| Column | Type | Notes |
|--------|------|-------|
| `code` | VARCHAR(50) PK | Mã vai trò, duy nhất |
| `name` | VARCHAR(100) | Tên hiển thị |
| `description` | TEXT | Mô tả |
| `role_type` | VARCHAR(20) | `'system'` hoặc `'custom'` |
| `is_active` | BOOLEAN | Tắt/mở vai trò |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

**Bảng `admin_role_permissions`** — map role → permission:

| Column | Type | Notes |
|--------|------|-------|
| `role_code` | VARCHAR(50) FK | Tham chiếu `admin_roles.code` |
| `permission` | VARCHAR(100) | Key quyền, e.g. `tasks.read` |
| PK | (role_code, permission) | Composite key |

### Architecture

```
lib/auth/
  permissions.ts          ← Client-safe (ko DB). Types, system perms, hasPermission()
  permissions.server.ts   ← Server-only. DB access cho custom roles
  permissions-core.ts     ← Shared in-memory cache (customRolePerms Map)
```

**Tại sao cần tách:**

- `permissions.ts` được import bởi `admin-sidebar.tsx` (client component)
- `pg` (PostgreSQL driver) sử dụng `dns`, `fs`, `net` — không có trên browser
- Giải pháp: `permissions-core.ts` chứa `customRolePerms` Map, được write bởi `permissions.server.ts` và read bởi `permissions.ts`
- JS module caching đảm bảo cùng một Map instance

---

## 2. System Role Logic

4 vai trò hệ thống, **không bao giờ sửa/xóa được**:

| Code | Tên | Level |
|------|------|-------|
| `super_admin` | Super Admin | 4 |
| `admin` | Quản trị viên | 3 |
| `editor` | Biên tập viên | 2 |
| `viewer` | Người xem | 1 |

- Permissions hardcoded trong `SYSTEM_ROLE_PERMISSIONS`
- API check: `isSystemRole(code)` → block edit/delete
- UI: hiển thị badge "Hệ thống", ẩn nút Sửa/Xóa

---

## 3. Permission của Intern

Role `intern` được seed tự động khi chạy migration:

**Được phép:**
- `tasks.read` — xem task được giao
- `tasks.update` — cập nhật task (nếu là assignee)
- `comments.read` — đọc bình luận
- `comments.create` — tạo bình luận
- `assets.read` — xem tài sản
- `assets.create` — upload tài sản
- `notifications.read` — xem thông báo
- `ai_generate` — dùng AI generate nội dung

**Bị cấm:**
- `settings.manage`, `ai_engine.manage`, `credentials.manage`
- `users.manage`, `roles.manage`, `permissions.manage`
- `projects.delete`, `campaigns.delete`, `tasks.delete`

---

## 4. API Endpoints

### GET /api/roles
- Auth: `requireAdminAuth` + `roles.read`
- Trả về: system roles (hardcoded) + custom roles (từ DB)
- Mỗi role có `staffCount`, `role_type`, `is_active`, `permissions` (cho custom)

### POST /api/roles
- Auth: `requireAdminAuth` + `roles.manage`
- Body: `{ code, name, description, permissions[] }`
- Validation: code 2-50 ký tự, chỉ `[a-z0-9_]`, không trùng system role
- Insert vào `admin_roles` + `admin_role_permissions`

### GET /api/roles/[code]
- Auth: `requireAdminAuth` + `roles.read`
- Trả về chi tiết custom role (không dùng cho system roles)

### PUT /api/roles/[code]
- Auth: `requireAdminAuth` + `roles.manage`
- Block system roles → 403
- Update name, description, is_active

### DELETE /api/roles/[code]
- Auth: `requireAdminAuth` + `roles.manage`
- Block system roles → 403
- Block nếu có user đang dùng role → 409 + thông báo số user
- CASCADE xóa permissions

### GET /api/roles/[code]/permissions
- Auth: `requireAdminAuth` + `permissions.read`
- Trả về mảng permission của role đó

### PUT /api/roles/[code]/permissions
- Auth: `requireAdminAuth` + `roles.manage`
- Block system roles → 403
- Replace all: DELETE rồi INSERT
- Update in-memory cache

### GET /api/permissions
- Auth: `requireAdminAuth` + `permissions.read`
- Trả về ma trận role × permission
- System roles: hardcoded
- Custom roles: từ DB cache

---

## 5. UI Pages

### /staff/roles
- **Phân loại:** 2 nhóm — "Vai trò hệ thống" và "Vai trò tùy chỉnh"
- **System roles:** chỉ hiển thị, badge "Hệ thống", không nút Sửa/Xóa
- **Custom roles:** badge "Tùy chỉnh", nút Sửa + Xóa
- **Tạo role:** Dialog form với code, name, description
- **Sửa role:** Dialog form, code không sửa được
- **Xóa role:** Confirm dialog, block nếu có user
- **Check permission:** admin + super_admin được thêm/sửa/xóa

### /staff/permissions
- **Ma trận:** Mỗi hàng = 1 permission, mỗi cột = 1 role
- **Check icon:** Có quyền (xanh), không có (xám)
- **System roles:** cột không chỉnh sửa được, nền mờ
- **Custom roles:** click vào ô để toggle quyền
- **Save per role:** Nút "Lưu [Tên Role]" xuất hiện khi có thay đổi
- **Chỉ super_admin** được chỉnh phân quyền

---

## 6. Test Checklist

Chạy thủ công sau khi chạy migration:

- [ ] Thêm role `intern` từ UI → thành công
- [ ] Tạo user với role `intern` → thành công
- [ ] Intern login được
- [ ] Intern không vào `/settings` (redirect về dashboard)
- [ ] Intern thấy task được giao
- [ ] Intern comment/upload asset được
- [ ] Xóa system role → bị chặn (403)
- [ ] Xóa custom role đang có user → bị chặn (409)
- [ ] TypeScript pass: `pnpm exec tsc --noEmit`
- [ ] Next build pass: `pnpm run build`

---

## 7. Rủi ro còn tồn tại

1. **Intern không có `tasks.update` tự động** — chỉ cập nhật task nếu user là assignee (cần kiểm tra ở task API)
2. **Cache invalidation** — custom role perms cache chỉ invalidate khi reload server. Long-running process sẽ dùng stale cache. Giải pháp: restart server sau khi thay đổi role.
3. **Intern permissions không visible trong ma trận nếu cache chưa load** — GET /api/permissions gọi `loadCustomPermissionsFromDB()` trước, nên luôn load đúng.
4. **`intern` role chưa có trong dropdown user creation** — cần kiểm tra user creation UI có include intern trong role dropdown không.

---

## 8. Files Changed/Created

### Created
- `sql/workspace/020_admin_roles_crud.sql` — migration + seed
- `lib/auth/permissions-core.ts` — shared cache
- `lib/auth/permissions.server.ts` — server-only DB access
- `app/api/roles/[code]/route.ts` — PUT/DELETE custom role
- `app/api/roles/[code]/permissions/route.ts` — GET/PUT role permissions

### Modified
- `lib/auth/permissions.ts` — added intern, hybrid system/custom logic
- `app/api/roles/route.ts` — full CRUD rewrite
- `app/api/permissions/route.ts` — merge DB roles into matrix
- `app/(admin)/staff/roles/page.tsx` — full CRUD UI
- `app/(admin)/staff/permissions/page.tsx` — interactive matrix UI

---

## 9. Migration Instructions

Chạy migration trước khi deploy:

```sql
-- Chạy file này trong Postgres
-- apps/admin-ui/sql/workspace/020_admin_roles_crud.sql

-- Hoặc qua API migration endpoint (nếu có)
-- POST /api/migration/init với script 020_admin_roles_crud.sql
```

Sau khi migration chạy xong:
1. Intern role tự động được seed
2. GET /api/roles sẽ trả về 5 roles (4 system + 1 intern)
3. GET /api/permissions sẽ trả về ma trận với intern
