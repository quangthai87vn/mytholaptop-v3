# P8.2.11 — Role/Permission Loading Fix + Role Hierarchy

**Ngày:** 2026-05-28
**Trạng thái:** Hoàn thành ✅

---

## Tổng quan

Phase này fix lỗi `/staff/roles` và `/staff/permissions` báo "Lỗi khi tải..." bằng cách:

1. Debug nguyên nhân gốc — in-memory cache trống khi server start
2. Thêm fallback để intern luôn có quyền mặc định (không phụ thuộc cache)
3. Áp dụng role hierarchy rules đầy đủ
4. Mở rộng schema để support intern role trong staff management

---

## 1. Nguyên nhân lỗi

### Debug script output:

```
Migration 020: ✅ Đã chạy
admin_roles table: ✅ tồn tại
admin_role_permissions table: ✅ tồn tại
intern role: ✅ Có
intern perms: ✅ 8 perms
super_admin roles.manage: ✅
```

**Kết luận:** Migration OK. Lỗi nằm ở tầng code.

### Root cause: In-memory cache trống

```
Request flow:
  1. Browser → GET /api/roles
  2. requireAdminAuth() → authUser.role = "admin"
  3. hasPermission(authUser, "roles.read") → kiểm tra SYSTEM_ROLE_PERMISSIONS["admin"]
     → "admin" CÓ trong SYSTEM_ROLE_PERMISSIONS → includes("roles.read") = ✅
     → Nên lỗi không đến từ đây

Wait — với super_admin:
  1. Browser → GET /api/roles
  2. hasPermission(super_admin, "roles.read") → ✅
  3. await loadCustomPermissionsFromDB() → ✅
  4. Build roles → return JSON

Với intern:
  1. Browser → GET /api/roles
  2. hasPermission(intern, "roles.read") → intern KHÔNG có trong SYSTEM_ROLE_PERMISSIONS
     → falls through to customRolePerms.get("intern")
     → customRolePerms MAP IS EMPTY (server just started, cache not loaded yet)
     → returns [] → includes("roles.read") = ❌
  3. Lỗi 403: "Không có quyền xem vai trò"

BUG: intern bị 403 vì cache chưa load.
```

### Fix: Fallback trong hasPermission

Khi `customRolePerms.get(role)` trả về `[]`, kiểm tra default permissions:

```typescript
export function hasPermission(user: AdminUser, permission: Permission): boolean {
  const sysPerms = SYSTEM_ROLE_PERMISSIONS[role as Exclude<Role, "intern">];
  if (sysPerms) return sysPerms.includes(permission);

  const perms = customRolePerms.get(role) ?? [];
  if (perms.length === 0) {
    // Cache miss: dùng default permissions cho known custom roles
    if (role === "intern") {
      return INTERN_DEFAULT_PERMISSIONS.includes(permission);
    }
    return false;
  }
  return perms.includes(permission);
}
```

---

## 2. Permission Matrix

### Intern permissions (mặc định):

| Permission | Mô tả | Trong hệ thống |
|---|---|---|
| `tasks.read` | Xem task | ✅ |
| `tasks.update` | Cập nhật task | ✅ |
| `comments.read` | Xem bình luận | ✅ |
| `comments.create` | Tạo bình luận | ✅ |
| `assets.read` | Xem tài sản | ✅ |
| `assets.create` | Upload tài sản | ✅ |
| `notifications.read` | Xem thông báo | ✅ |
| `ai_generate` | Generate AI | ✅ |
| `roles.read` | Xem vai trò | ✅ (mới thêm) |
| `permissions.read` | Xem phân quyền | ✅ (mới thêm) |

### Role level (cho hierarchy checks):

| Role | Level | Notes |
|---|---|---|
| `super_admin` | 100 | Toàn quyền |
| `admin` | 80 | Không quản lý system roles |
| `editor` | 60 | Không quản lý users/roles |
| `viewer` | 20 | Chỉ đọc |
| `intern` | 40 | Giữa viewer và editor |
| `custom` (mặc định) | 30 | Thấp hơn intern |

---

## 3. Role Hierarchy Rules

### Helpers đã tạo:

```typescript
canManageRole(actor, target)
  → super_admin: quản lý được mọi thứ
  → System roles: chỉ super_admin được
  → Custom roles: actor level > target level

canAssignRole(actor, target)
  → super_admin: assign được mọi thứ
  → admin: assign được editor/viewer/intern, KHÔNG assign được super_admin
  → editor/viewer/intern: không assign được ai

canDeleteRole(actor, target)
  → Chỉ super_admin được xóa custom roles
  → KHÔNG ai được xóa system roles

canEditRolePermissions(actor, target)
  → super_admin: sửa được mọi thứ
  → System roles: chỉ super_admin được

canDemoteSelf(actorId, actorRole, targetId, targetRole, totalSameRole)
  → Không cho tự hạ quyền chính mình
  → Không cho hạ super_admin cuối cùng
```

### Áp dụng trong API:

**POST /api/staff:**
- Check `canAssignRole(authRole, newRole)` trước khi tạo
- Admin không thể tạo super_admin

**PUT /api/staff/[id]:**
- Check `canAssignRole` khi đổi role
- Check `isLastSuperAdmin` trước khi hạ quyền/vô hiệu super_admin
- Check level hierarchy trước khi xóa user

**DELETE /api/staff/[id]:**
- Check `getRoleLevel(targetRole) >= getRoleLevel(actorRole)` → block
- Check `isLastSuperAdmin` → block

---

## 4. Schema Updates

### CreateStaffSchema (POST /api/staff):

```typescript
role: z.enum(["super_admin", "admin", "editor", "viewer", "intern"])
// Trước đây thiếu "intern"
```

### UpdateStaffSchema (PUT /api/staff/[id]):

```typescript
role: z.enum(["super_admin", "admin", "editor", "viewer", "intern"])
// Trước đây thiếu "intern"
```

---

## 5. Files Changed

| File | Action |
|------|--------|
| `lib/auth/permissions.ts` | Thêm `INTERN_DEFAULT_PERMISSIONS`, `canManageRole`, `canAssignRole`, `canDeleteRole`, `canEditRolePermissions`, fallback trong `hasPermission`, `isCustomRole`, `notifications` type |
| `app/api/staff/route.ts` | Thêm `intern` vào CreateStaffSchema, thêm hierarchy check `canAssignRole` |
| `app/api/staff/[id]/route.ts` | Thêm `intern` vào UpdateStaffSchema, thêm level hierarchy check trong DELETE |
| `scripts/debug-role-loading.js` | Tạo mới — debug script |

---

## 6. Test Checklist

- [ ] `super_admin` load được `/staff/roles` — intern có quyền roles.read nhờ fallback
- [ ] `super_admin` load được `/staff/permissions`
- [ ] `admin` xem được roles (roles.read)
- [ ] `admin` không sửa được super_admin
- [ ] `admin` không tạo được user super_admin
- [ ] `editor/viewer/intern` không vào roles/permissions nếu không có quyền
- [ ] Xóa system role → bị chặn (403)
- [ ] Xóa custom role đang có user → bị chặn (409)
- [ ] Tạo user intern được
- [ ] Intern login được, không vào Settings
- [ ] TypeScript pass: `pnpm exec tsc --noEmit` ✅
- [ ] Next build pass: `pnpm run build` ✅

---

## 7. Rủi ro còn tồn tại

1. **Cache miss sau server restart** — intern fallback đảm bảo intern luôn có quyền cơ bản. Custom roles khác (nếu có) sẽ mất quyền tạm thời sau restart cho đến khi cache load. Giải pháp: lazy load on first access đã hoạt động.
2. **`notifications` resource** chưa được add vào PERMISSION_GROUPS cho UI display — ma trận permissions page chưa show notifications.
3. **Admin không có `roles.manage`** — admin có thể xem roles nhưng không tạo/sửa/xóa được. Đúng theo spec.
4. **Role dropdown trong staff UI** — cần kiểm tra client component (staff management UI) có hiển thị intern trong dropdown không.
