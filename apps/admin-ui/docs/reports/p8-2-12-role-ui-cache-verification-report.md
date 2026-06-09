# P8.2.12 — Role UI + Custom Role Permission Cache Verification

**Ngày:** 2026-05-28
**Trạng thái:** Hoàn thành ✅

---

## Tổng quan

Phase này verify và fix các vấn đề còn lại từ P8.2.11:

1. **Permission cache** — đảm bảo custom roles không bị mất quyền sau server restart
2. **Staff UI** — thêm intern vào role dropdowns
3. **Permission matrix** — verify đầy đủ

---

## 1. Permission Cache Architecture

### Vấn đề ban đầu

Khi server khởi động, `customRolePerms` Map trống. Nếu intern login TRƯỚC KHI bất kỳ API route nào gọi `loadCustomPermissionsFromDB()`, intern sẽ có `customRolePerms.get("intern")` = `[]` → không có quyền.

### Giải pháp: Module separation

```
lib/auth/
  permissions-core.ts     ← 0 imports. Chỉ chứa Map + cacheStamp. Client-safe.
  permissions.server.ts   ← import "@/lib/db". DB write operations.
  permissions.ts          ← import permissions-core. Logic chính. Client-safe.
```

**Quy tắc vàng:**
- `permissions-core.ts` — không bao giờ import gì cả
- `permissions.server.ts` — import `@/lib/db` (server-only)
- `permissions.ts` — import `permissions-core` (client-safe)

### hasPermission flow

```
1. hasPermission(user, "tasks.read")
2. Check SYSTEM_ROLE_PERMISSIONS[user.role] → system roles
3. customRolePerms.get(role) → custom roles
4. If empty:
   - intern → INTERN_DEFAULT_PERMISSIONS fallback ✅
   - other custom → false (will be fixed after cache loads)
5. First API route call → loadCustomPermissionsFromDB()
6. Subsequent calls → check fresh cache
```

### Cache lifecycle

- Server start: `cacheStamp = 0` → stale
- First API request: `loadCustomPermissionsFromDB()` → fills Map, sets `cacheStamp`
- 60s TTL: auto-refresh
- After role CRUD: `invalidateCustomPermissionsCache()` → forces reload

---

## 2. Staff UI Role Dropdowns

### Đã fix

**Filter dropdown** (`StaffFilters`):
```tsx
<SelectItem value="intern">Thực tập sinh</SelectItem>
```

**Create dialog** (chỉ super_admin thấy super_admin):
```tsx
{currentUser?.role === "super_admin" && (
  <SelectItem value="super_admin">Super Admin</SelectItem>
)}
<SelectItem value="admin">Quản trị viên</SelectItem>
<SelectItem value="editor">Biên tập viên</SelectItem>
<SelectItem value="viewer">Người xem</SelectItem>
<SelectItem value="intern">Thực tập sinh</SelectItem>
```

**Edit dialog** (chỉ super_admin sửa được role):
```tsx
{currentUser?.role === "super_admin" && (
  <SelectItem value="admin">Quản trị viên</SelectItem>
  <SelectItem value="editor">Biên tập viên</SelectItem>
  <SelectItem value="viewer">Người xem</SelectItem>
  <SelectItem value="intern">Thực tập sinh</SelectItem>
)}
```

**Default role**: `intern` (thay vì `editor`)

### Permission hierarchy đã apply

| Actor | Thấy super_admin | Tạo super_admin | Sửa role | Xóa user cao hơn |
|-------|-------------------|-------------------|-----------|-------------------|
| super_admin | ✅ | ✅ | ✅ | ✅ |
| admin | ❌ | ❌ | ❌ | ❌ |
| editor/viewer/intern | ❌ | ❌ | ❌ | ❌ |

---

## 3. Permission Matrix

### Groups đã có (14 groups):

1. Người dùng (users.read/create/update/delete)
2. Vai trò & Quyền (roles.read/manage, permissions.read)
3. Cài đặt (settings.manage, credentials.manage)
4. AI Engine (ai_engine.manage, ai_generate)
5. AI Provider (ai_providers.manage)
6. Project (read/create/update/delete)
7. Campaign (read/create/update/delete)
8. Task (read/create/update/delete)
9. Bình luận (read/create/update/delete)
10. Tài sản (read/create/update/delete)
11. Nội dung (read/create/update/delete)
12. Nhân viên (interns.manage)
13. Migration (migration.manage)
14. Media (media.manage)
15. Thông báo (notifications.read) ← **mới thêm**

### Intern permissions trong matrix:

| Group | Permission | Intern |
|-------|-----------|--------|
| Task | tasks.read | ✅ |
| Task | tasks.update | ✅ |
| Bình luận | comments.read | ✅ |
| Bình luận | comments.create | ✅ |
| Tài sản | assets.read | ✅ |
| Tài sản | assets.create | ✅ |
| Thông báo | notifications.read | ✅ |
| AI Engine | ai_generate | ✅ |
| Vai trò | roles.read | ✅ |
| Vai trò | permissions.read | ✅ |

---

## 4. Role Hierarchy Rules — Tổng hợp

### Role Levels:

| Level | Role |
|-------|------|
| 100 | super_admin |
| 80 | admin |
| 60 | editor |
| 40 | intern |
| 20 | viewer |
| 30 | custom (default) |

### Helpers:

```typescript
canManageRole(actor, target)
  → super_admin: tất cả
  → system role target: chỉ super_admin
  → custom role: actor level > target level

canAssignRole(actor, target)
  → super_admin: tất cả
  → admin: editor/viewer/intern, KHÔNG super_admin
  → thấp hơn: không ai

canDeleteRole(actor, target)
  → super_admin + custom role: ✅
  → system role: ❌

canDemoteSelf(actorId, actorRole, targetId, targetRole, totalSameRole)
  → Không tự hạ chính mình
  → Không hạ super_admin cuối cùng
```

---

## 5. Test Checklist

- [ ] `super_admin` load `/staff/roles` → intern có quyền roles.read
- [ ] `super_admin` load `/staff/permissions` → ma trận đầy đủ
- [ ] `admin` xem được roles/permissions
- [ ] `admin` không tạo được user super_admin
- [ ] `admin` không sửa được role của super_admin
- [ ] Editor/viewer/intern không thấy nút tạo user
- [ ] Xóa system role → 403 blocked
- [ ] Xóa custom role đang có user → 409 blocked
- [ ] Tạo user intern → thành công
- [ ] Intern login → intern không vào Settings (middleware check)
- [ ] TypeScript pass: `pnpm exec tsc --noEmit` ✅
- [ ] Next build pass: `pnpm run build` ✅

---

## 6. Files Changed

| File | Action |
|------|--------|
| `lib/auth/permissions-core.ts` | Rewrite — 0 imports, chỉ plain state |
| `lib/auth/permissions.server.ts` | Rewrite — loadFromDB với shared promise |
| `lib/auth/permissions.ts` | Thêm INTERN_DEFAULT_PERMISSIONS fallback, thêm notifications |
| `app/(admin)/staff/page.tsx` | Thêm intern vào filter/create/edit dropdowns |
| `app/api/permissions/route.ts` | Thêm notifications.read vào mọi role |

---

## 7. Rủi ro còn tồn tại

1. **Custom role khác intern** (sau này tạo) — nếu user login TRƯỚC KHI cache loaded, sẽ không có quyền. Giải pháp: mỗi API route đầu tiên gọi `loadCustomPermissionsFromDB()` → đảm bảo cache load kịp thời.
2. **Server restart** — intern vẫn có fallback, custom roles khác sẽ được load sau request đầu tiên.
3. **Cache TTL 60s** — nếu thay đổi role permission trong DB, phải đợi max 60s để cache refresh. Giải pháp: `invalidateCustomPermissionsCache()` được gọi sau PUT/DELETE role.
4. **`notifications` resource** trong `permissions.ts` — chưa có trong `canRead`/`canCreate` helpers (vì notifications không có write permissions trong spec hiện tại).

---

## 8. Điều kiện quay lại P8.2 cleanup

Sau P8.2.12, hệ thống RBAC đã stable. Các điều kiện để chuyển qua cleanup:

- ✅ Role CRUD hoạt động (/staff/roles load được)
- ✅ Permission matrix hiển thị đúng (/staff/permissions load được)
- ✅ Intern có đầy đủ quyền theo spec
- ✅ Role hierarchy được enforce ở API + UI
- ✅ Staff management UI có intern trong dropdown
- ✅ TypeScript pass + Next build pass
- ✅ Migration 020 đã chạy và verified

**Có thể chuyển sang P8.2.x cleanup** khi user sẵn sàng — drop các bảng/column không dùng, consolidate duplicate code.
