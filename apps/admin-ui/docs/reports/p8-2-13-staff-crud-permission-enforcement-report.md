# P8.2.13 — Staff User CRUD Permission Enforcement

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass

---

## 1. Tổng quan

### Mục tiêu
1. Admin không được sửa/vô hiệu hóa/reset password Super Admin.
2. Role thấp không được thao tác user có role cao hơn hoặc bằng mình.
3. Tạo user mới phải hoạt động và báo lỗi rõ nếu fail.
4. UI và API phải enforce giống nhau.

### Kết quả
- ✅ Hoàn thành toàn bộ 4 mục tiêu.
- ✅ TypeScript pass.
- ✅ Next.js build pass (105 routes).

---

## 2. Root Cause Analysis

### Vấn đề 1: Action menu hiển thị cho Super Admin
- **Nguyên nhân:** Logic `canManage` trong `staff/page.tsx` cũ chỉ check `isSuperAdmin || isAdmin`. Không hề kiểm tra target user role.
- **Hậu quả:** Admin vẫn thấy menu sửa/vô hiệu hóa Super Admin.

### Vấn đề 2: Tạo user mới thất bại
- **Nguyên nhân:** `admin` role không có permission `users.create` trong `SYSTEM_ROLE_PERMISSIONS`. API trả 403 Forbidden.
- **Hậu quả:** Admin không tạo được intern user.

### Vấn đề 3: Form không hiển thị lỗi
- **Nguyên nhân:** `CreateUserDialog` cũ không xử lý response body từ API, luôn show generic error hoặc toast.
- **Hậu quả:** Không phân biệt được validation error, duplicate email, hay permission error.

---

## 3. Changes Made

### 3.1 `lib/auth/permissions.ts`

**Thêm helper functions mới:**

```typescript
// Kiểm tra actor có quyền quản lý target user không
export function canManageUser(
  actorRole: string,
  actorId: string,
  targetId: string,
  targetRole: string,
  action: "edit" | "delete" | "password",
): boolean

// Kiểm tra actor có quyền xem action menu của target user không
export function canViewActionMenu(
  actorRole: string,
  actorId: string,
  targetId: string,
  targetRole: string,
): boolean
```

**Logic `canManageUser` (action = "edit"):**
- Tự thao tác chính mình → `false`
- System role target (super_admin/admin) → chỉ `super_admin` được
- Custom role target → `getRoleLevel(actor) > getRoleLevel(target)`

**Logic `canManageUser` (action = "password"):**
- Chỉ `super_admin` được reset password

**Logic `canManageUser` (action = "delete"):**
- Tự thao tác chính mình → `false`
- Target là `super_admin` → `false` (luôn)
- `getRoleLevel(actor) > getRoleLevel(target)`

**Logic `canViewActionMenu`:**
- Tự thao tác chính mình → `false`
- `super_admin` xem được tất cả
- Actor level phải cao hơn target

**Thêm `users.create` vào `admin` role:**
```typescript
admin: [
  "users.read","users.create",  // ← đã thêm users.create
  "roles.read","permissions.read",
  ...
]
```

### 3.2 `app/(admin)/staff/page.tsx` (rewrite hoàn toàn)

**Thay đổi action menu:**
```typescript
// Trước (sai)
const canManage = isSuperAdmin || isAdmin;

// Sau (đúng)
const showMenu = canViewActionMenu(
  currentUser?.role || "",
  currentUser?.id || "",
  member.id,
  member.role
);
```

**Thay đổi Create Dialog:**
- Reset form khi mở dialog
- Hiển thị error rõ ràng theo error code:
  - `FORBIDDEN` → "Bạn không có quyền tạo tài khoản với vai trò này."
  - `VALIDATION_ERROR` → "Email không hợp lệ."
  - `DUPLICATE_EMAIL` → "Email đã tồn tại trong hệ thống."
  - Default → hiển thị `data.error`
- Placeholder email: `user@mytholaptop.vn`

**Thay đổi Edit Dialog:**
- Role change chỉ super_admin mới thấy dropdown
- Hiển thị error rõ ràng

**Thay đổi Delete Dialog:**
- Error display từ API

### 3.3 `app/api/staff/[id]/route.ts`

**Thêm import `canManageUser`:**

```typescript
import {
  hasPermission,
  canAssignRole,
  canManageRole,
  canManageUser,  // ← đã thêm
  isLastSuperAdmin,
  getRoleLevel,
  type Role,
} from "@/lib/auth/permissions";
```

**PUT endpoint — thêm `canManageUser` check:**
```typescript
// Sau khi lấy current user từ DB, thêm:
// ── Hierarchy: actor must be able to manage this target user for any edit ──
if (!canManageUser(authUser.role, authUser.id, id, current.role, "edit")) {
  return NextResponse.json(
    { error: "Bạn không có quyền chỉnh sửa tài khoản này.", code: "FORBIDDEN" },
    { status: 403 }
  );
}
```

**DELETE endpoint — thay thế 3 checks riêng bằng `canManageUser`:**
```typescript
// Trước: self-delete check + level check + last SA check
// Sau: dùng canManageUser + last SA check (giữ riêng vì cần count query)
if (!canManageUser(authUser.role, authUser.id, id, current.role, "delete")) {
  return NextResponse.json(
    { error: "Bạn không có quyền vô hiệu hóa người dùng có vai trò này.", code: "FORBIDDEN" },
    { status: 403 }
  );
}
```

---

## 4. Permission Enforcement Matrix

| Actor \ Target | Super Admin | Admin | Editor | Viewer | Intern | Custom |
|---|---|---|---|---|---|---|
| **Super Admin** | view only | edit/delete | edit/delete | edit/delete | edit/delete | edit/delete |
| **Admin** | no access | no access | edit/delete | edit/delete | edit/delete | no access |
| **Editor** | no access | no access | no access | no access | no access | no access |
| **Viewer** | no access | no access | no access | no access | no access | no access |
| **Intern** | no access | no access | no access | no access | no access | no access |

### Self-action
| Action | Self |
|---|---|
| Edit | ❌ Not shown in menu |
| Delete | ❌ Not shown in menu |
| Change password | ❌ Not shown in menu |
| Deactivate self | ❌ API returns `SELF_DEACTIVATE` |

---

## 5. API Error Codes

| Code | HTTP | Nguyên nhân | UI Message |
|---|---|---|---|
| `FORBIDDEN` | 403 | Không có permission hoặc hierarchy violation | "Bạn không có quyền..." |
| `SELF_DEACTIVATE` | 403 | Tự vô hiệu hóa chính mình | "Bạn không thể tự vô hiệu hóa..." |
| `LAST_SUPER_ADMIN` | 403 | Thay đổi/vô hiệu hóa SA cuối cùng | "Không thể thay đổi vai trò..." |
| `VALIDATION_ERROR` | 422 | Zod validation fail | Field-specific message |
| `DUPLICATE_EMAIL` | 409 | Email đã tồn tại | "Email đã tồn tại..." |
| `DB_ERROR` | 500 | Database error | "Lỗi khi tạo nhân viên" |

---

## 6. Test Cases

- [x] **T1:** Login admin → không thấy action menu của Super Admin
- [x] **T2:** Login admin → tạo intern với email hợp lệ → thành công
- [x] **T3:** Login admin → không tạo được super_admin
- [x] **T4:** Login super_admin → tạo intern → thành công
- [x] **T5:** Login super_admin → edit admin → thành công
- [x] **T6:** Tạo user với email sai → báo lỗi "Email không hợp lệ"
- [x] **T7:** Tạo user trùng email → báo lỗi "Email đã tồn tại trong hệ thống"
- [x] **T8:** API direct PUT super_admin bằng admin → 403 Forbidden
- [x] **T9:** API direct DELETE super_admin bằng admin → 403 Forbidden
- [x] **T10:** TypeScript pass
- [x] **T11:** Next.js build pass (105 routes)

---

## 7. Files Changed

| File | Change |
|---|---|
| `lib/auth/permissions.ts` | Thêm `canManageUser`, `canViewActionMenu` helpers; thêm `users.create` vào admin role |
| `app/(admin)/staff/page.tsx` | Rewrite hoàn toàn: fix action menu, error display, form validation |
| `app/api/staff/[id]/route.ts` | Thêm `canManageUser` vào PUT và DELETE; import helper mới |

---

## 8. Phân tích kỹ thuật

### Vấn đề cũ: Phân quyền không đồng nhất
- UI chỉ check `isSuperAdmin || isAdmin` → luôn hiển thị menu
- API chỉ check permission (`users.update`, `users.delete`) → không check target role

### Giải pháp: Centralized hierarchy helpers
- Tất cả role hierarchy logic nằm trong `permissions.ts`
- UI và API cùng dùng `canViewActionMenu` / `canManageUser`
- Một nguồn chân lý duy nhất

### Về Email validation
- API vẫn dùng `z.string().email()` — đúng vì admin user nên có email thật.
- Placeholder trong UI: `user@mytholaptop.vn` — đủ rõ ràng.
- Nếu muốn username format (tts.001), cần thêm trường `username` vào DB và schema riêng.

---

## 9. Bước tiếp theo đề xuất

- **P8.2.14:** Audit tất cả `/api/*` routes còn dùng `isSystemAdmin` hoặc `role === "admin"` thay vì `canManageUser`.
- **P8.3:** Database cleanup — xóa các bảng trùng lặp (sau khi đã consolidate logic).
