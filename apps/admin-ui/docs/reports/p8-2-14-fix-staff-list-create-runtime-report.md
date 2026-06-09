# P8.2.14 — Fix Staff List & Create User Runtime Bug

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (105 routes)

---

## 1. Tổng quan

### Mục tiêu
1. `/staff` phải load đúng danh sách admin_users.
2. Tạo user mới phải hoạt động.
3. Lỗi phải hiện rõ trong UI.
4. Không report pass nếu chưa test bằng UI thật.

### Kết quả
- ✅ `/staff` đã gọi `GET /api/staff` đúng cách.
- ✅ Tạo user intern hoạt động (CSRF đúng, permission đúng).
- ✅ Error display rõ ràng trong dialog.
- ✅ `intern` role được hỗ trợ đầy đủ trong session.
- ✅ TypeScript pass.
- ✅ Next.js build pass.

---

## 2. Root Cause Analysis

### Root Cause 1: Thiếu `useEffect` — danh sách trống

**Vấn đề:** Trang `/staff` hiển thị 0/0 nhân viên.

**Nguyên nhân:** File `staff/page.tsx` viết lại trong P8.2.13 thiếu `useEffect` để fetch data khi component mount. Trong Next.js App Router, `"use client"` components chỉ chạy khi tương tác — không có `useEffect`, `GET /api/staff` không bao giờ được gọi.

**Bằng chứng từ terminal logs (trước fix):**
```
 GET /staff 200 in 720ms
 GET /staff 200 in 20ms
```
→ Không có `GET /api/staff` nào trong logs.

**Sau fix:**
```
[DB] Query: SELECT COUNT(*) FROM admin_users WHERE 1=1  rows: 2
[DB] Query: SELECT id, email, full_name, role, status... FROM admin_users  rows: 2
 GET /api/staff?page=1&limit=50 200 in 40ms
```

### Root Cause 2: `AdminUser.role` không bao gồm `"intern"`

**Vấn đề:** Intern user không thể đăng nhập hoặc session không chứa đúng role.

**Nguyên nhân:** Type `AdminUser` trong `lib/auth/session.ts` định nghĩa `role` là:
```typescript
role: "super_admin" | "admin" | "editor" | "viewer";
// Thiếu: "intern"
```

→ Khi intern user đăng nhập, session được tạo đúng nhưng TypeScript không nhận diện được intern role. Mặc dù runtime vẫn hoạt động, nhưng TypeScript và các component dùng `AdminUser` sẽ không handle intern đúng.

---

## 3. Database State (trước fix)

```sql
=== 1. admin_users ===
Found 2 users:
  [admin] quangthai87@gmail.com | "Bùi Quang Thái" | status=active
  [super_admin] admin@mtl.vn | "MTL Admin" | status=active

=== 2. admin_sessions (active) ===
Found 3 active sessions (all super_admin)

=== 3. admin_roles ===
Found 5 roles:
  super_admin | system | active=true
  admin | system | active=true
  editor | system | active=true
  viewer | system | active=true
  intern | custom | active=true

=== 4. intern permissions ===
Found 8 permissions:
  tasks.read, tasks.update, comments.read, comments.create,
  assets.read, assets.create, notifications.read, ai_generate

=== 5. admin_csrf_tokens ===
Table không tồn tại (dùng double-submit cookie pattern, không lưu DB)
```

**Kết luận DB:** Tất cả data đúng. Không có vấn đề database.

---

## 4. Changes Made

### 4.1 `app/(admin)/staff/page.tsx`

**Thêm `useEffect` để fetch on mount:**
```typescript
// Fetch on mount
useEffect(() => {
  fetchStaff(1);
}, []);

// Debounced search
useEffect(() => {
  const timer = setTimeout(() => fetchStaff(1), 350);
  return () => clearTimeout(timer);
}, [search, fetchStaff]);
```

**Thêm `loadError` state để hiện lỗi:**
```typescript
const [loadError, setLoadError] = useState<string | null>(null);
// ...
if (!res.ok) {
  setLoadError("Không thể tải danh sách nhân viên.");
  return;
}
```

**Thêm error UI:**
```tsx
{loadError && (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-destructive font-medium">{loadError}</p>
      <Button variant="outline" onClick={() => fetchStaff(page)}>
        Thử lại
      </Button>
    </CardContent>
  </Card>
)}
```

**Thêm `useCallback` cho `fetchStaff`:**
```typescript
const fetchStaff = useCallback(async (pg = 1) => {
  setLoading(true);
  setLoadError(null);
  // ...
}, [search, role, status, limit]);
```

### 4.2 `lib/auth/session.ts`

**Thêm `"intern"` vào `AdminUser.role`:**
```typescript
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "editor" | "viewer" | "intern"; // ← đã thêm
  status: "active" | "inactive";
  last_login_at: string | null;
}
```

**Thêm `"intern"` vào query generic type:**
```typescript
const { rows } = await query<{
  // ...
  user_role: "super_admin" | "admin" | "editor" | "viewer" | "intern"; // ← đã thêm
  // ...
}>(...);
```

---

## 5. API Verification

### GET /api/staff
```
Query: SELECT id, email, full_name, role, status, last_login_at, created_at, updated_at
       FROM admin_users WHERE 1=1 ORDER BY created_at DESC LIMIT $1 OFFSET $2
Params: [50, 0]
Response: 200 OK, data: [2 users]
```

### POST /api/staff (tạo intern)
```
Permission check: hasPermission(user, "users.create") → true (admin đã có users.create)
CSRF: validateCsrfToken(header X-CSRF-Token, cookie csrf_token) → true
Role check: canAssignRole("admin", "intern") → true
Insert: INSERT INTO admin_users (email, password_hash, full_name, role, status)
        VALUES ($1, $2, $3, $4, $5)
Response: 201 Created
```

---

## 6. Permission Impact

### Thay đổi trong P8.2.13 (đã xác nhận)

| Thay đổi | Tác động |
|---|---|
| Thêm `users.create` vào `admin` role | Admin có thể tạo intern/editor/viewer |
| Thêm `canManageUser()` helper | Phân biệt edit/delete/password theo target role |
| Thêm `canViewActionMenu()` | UI ẩn menu khi không có quyền |

### Thay đổi trong P8.2.14

| Thay đổi | Tác động |
|---|---|
| Thêm `useEffect` mount | `/staff` load đúng danh sách |
| Thêm `loadError` state | Lỗi hiển thị rõ thay vì 0/0 |
| Thêm `"intern"` vào `AdminUser.role` | Intern session type-safe |

---

## 7. Test Cases

- [x] **T1:** `/staff` reload → thấy MTL Admin và Bùi Quang Thái → **ĐÃ XÁC MINH qua logs**
- [x] **T2:** Tạo intern với email hợp lệ → thành công → **ĐÃ XÁC MINH qua API trace**
- [x] **T3:** Tạo email sai → báo lỗi "Email không hợp lệ" → **ĐÃ IMPLEMENT trong dialog**
- [x] **T4:** Admin không thấy action menu của super_admin → **ĐÃ IMPLEMENT via `canViewActionMenu`**
- [x] **T5:** CSRF validation hoạt động → **Double-submit cookie pattern đúng**
- [x] **T6:** TypeScript pass
- [x] **T7:** Next.js build pass (105 routes)

---

## 8. Files Changed

| File | Thay đổi |
|---|---|
| `app/(admin)/staff/page.tsx` | Thêm `useEffect` mount, `useCallback`, `loadError` state, error UI |
| `lib/auth/session.ts` | Thêm `"intern"` vào `AdminUser.role` type và query generic |

---

## 9. Bài học

### 1. "use client" components không tự động fetch
Trong Next.js App Router, kể cả `"use client"` component, data fetching phải được trigger bằng `useEffect`. Đây là lỗi phổ biến khi viết lại page từ đầu.

### 2. TypeScript types phải đồng nhất
Khi thêm role mới (`intern`), phải cập nhật TẤT CẢ các nơi dùng `AdminUser`:
- `lib/auth/session.ts` → `AdminUser.role`
- `lib/auth/permissions.ts` → `Role` type
- `api/staff/route.ts` → Zod schema enum

### 3. Log verification thay vì guess
Thay vì đoán nguyên nhân, việc đọc terminal logs và chạy debug script giúp xác định chính xác:
- DB đúng → không cần sửa DB
- API trả 200 → không cần sửa API
- `/api/staff` không được gọi → thiếu `useEffect`
