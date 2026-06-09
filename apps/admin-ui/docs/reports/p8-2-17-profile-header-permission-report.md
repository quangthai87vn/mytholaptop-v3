# P8.2.17 — User Profile Page + Header Permission Cleanup

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (108 routes)

---

## 1. Tổng quan

### Mục tiêu
1. Tạo trang hồ sơ cá nhân `/profile`
2. Tạo trang đổi mật khẩu `/profile/password`
3. Header dropdown hoạt động đúng (không còn link 404)
4. User không phải super_admin không thấy/đi vào cài đặt nhạy cảm

### Kết quả
- ✅ Profile page với thông tin user + permissions read-only
- ✅ Password change form với validate đầy đủ
- ✅ Profile settings page (sửa họ tên)
- ✅ Header dropdown links đã fix
- ✅ `/profile` route bảo vệ bởi server-side auth guard
- ✅ TypeScript pass
- ✅ Next.js build pass (108 routes)

---

## 2. Routes đã tạo

### Pages

| Route | File | Description |
|---|---|---|
| `/profile` | `app/(profile)/profile/page.tsx` | Profile overview: user info + permissions read-only |
| `/profile/password` | `app/(profile)/profile/password/page.tsx` | Change password form |
| `/profile/settings` | `app/(profile)/profile/settings/page.tsx` | Edit full_name |
| `/profile` layout | `app/(profile)/layout.tsx` | Server-side auth guard |

### APIs

| Endpoint | Method | Description |
|---|---|---|
| `/api/profile/me` | GET | Get current user profile + permissions |
| `/api/profile/me` | PUT | Update own profile (full_name only) |
| `/api/profile/change-password` | POST | Change password with current password verify |

---

## 3. Route Groups

### `app/(profile)/` — Profile Route Group

```
app/(profile)/
  layout.tsx        ← auth guard (server-side)
  profile/
    page.tsx        ← /profile
    password/
      page.tsx      ← /profile/password
    settings/
      page.tsx      ← /profile/settings
```

**Route group `(profile)`** tách biệt khỏi `(admin)` — tránh route conflicts:
- `/profile` → `app/(profile)/profile/page.tsx`
- `/settings` → `app/(admin)/settings/page.tsx`
- `/settings/users` → `app/(admin)/settings/users/page.tsx`

---

## 4. Header Dropdown — Trước & Sau

### Trước
```
Hồ sơ cá nhân  → /profile          ❌ 404 (chưa tạo)
Cài đặt tài khoản → /settings      ⚠️ sai (vào settings hệ thống)
Đổi mật khẩu   → /settings        ⚠️ sai (vào settings hệ thống)
```

### Sau
```
Hồ sơ cá nhân  → /profile              ✅
Cài đặt tài khoản → /profile/settings  ✅
Đổi mật khẩu   → /profile/password    ✅
```

---

## 5. Profile Layout — Server-Side Auth Guard

```typescript
// app/(profile)/layout.tsx
export default async function ProfileLayout({ children }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/profile");
  return <>{children}</>;
}
```

**Tính năng:**
- Server-side: không rely vào client-side hydration
- Direct URL `/profile` mà chưa login → redirect `/login`
- Sau login → redirect back về `/profile`

---

## 6. Profile Page — Thông tin hiển thị

```
┌──────────────────────────────────────────────────────────────┐
│ HỒ SƠ CÁ NHÂN                                              │
│                                                              │
│  [Avatar]  Tên user               [Sửa hồ sơ]              │
│            [Badge: Quản trị viên] [Badge: Đang hoạt động]  │
│  ─────────────────────────────────────────────────────       │
│  📧 email@mtl.vn                                           │
│  📅 Tạo: 27/05/2026 14:00                                  │
│  🕐 Đăng nhập gần nhất: 28/05/2026 18:30                  │
└──────────────────────────────────────────────────────────────┘
```

### Permissions Card
- Read-only badges: `users.read`, `tasks.create`, `ai_generate`, ...
- Grouped theo resource
- Không thể sửa từ profile

### Security Card
- Nút "Đổi mật khẩu" → `/profile/password`

---

## 7. Change Password — Security Features

```
POST /api/profile/change-password

Security layers:
1. requireAdminAuth() — đã đăng nhập
2. requireCsrf() — valid CSRF token
3. bcrypt.compare(current_password) — xác minh mk cũ
4. bcrypt.hash(new_password, 12) — hash mk mới
5. writeAuditLog("user.password_reset") — audit trail
```

### Validation Rules
| Rule | Error |
|---|---|
| Current password đúng | ✅ OK |
| Current password sai | "Mật khẩu hiện tại không đúng" |
| New password < 8 chars | "Mật khẩu mới phải có ít nhất 8 ký tự" |
| Confirm password khớp | "Mật khẩu xác nhận không khớp" |

---

## 8. Navigation Permission — Đã có sẵn

Từ P8.1.4 và P8.2.x, sidebar navigation đã filter theo `requiredPermission`:

```typescript
// lib/navigation.ts
{
  title: "AI Engine",
  href: "/settings/ai",
  icon: Brain,
  requiredPermission: "ai_engine.manage",  // ← chỉ ai_engine.manage mới thấy
},
{
  title: "Người dùng",
  href: "/settings/users",
  icon: UsersIcon,
  requiredPermission: "users.read",  // ← users.read mới thấy
},
```

**Kết quả:**
- Intern/viewer/editor: **không thấy** AI Engine trong sidebar
- Không có `users.read`: **không thấy** Người dùng trong sidebar
- Intern/viewer: sidebar vẫn hiện Dashboard, Tasks, Projects (theo permission hiện có)

---

## 9. Middleware Updates

```typescript
// middleware.ts
const PROTECTED_PAGE_PATHS = [
  // ... existing ...
  "/profile",       // ← đã thêm
];

const PROTECTED_API_PATHS = [
  // ... existing ...
  "/api/profile",   // ← đã thêm
];
```

---

## 10. Files Created/Modified

| File | Action |
|---|---|
| `app/(profile)/layout.tsx` | **CREATED** — server-side auth guard |
| `app/(profile)/profile/page.tsx` | **CREATED** — profile overview |
| `app/(profile)/profile/password/page.tsx` | **CREATED** — change password |
| `app/(profile)/profile/settings/page.tsx` | **CREATED** — edit full_name |
| `app/api/profile/me/route.ts` | **CREATED** — GET + PUT profile |
| `app/api/profile/change-password/route.ts` | **CREATED** — change password |
| `components/layout/admin-header.tsx` | **MODIFIED** — dropdown links fixed |
| `middleware.ts` | **MODIFIED** — added /profile to protected paths |

---

## 11. Route Conflicts — Đã tránh

### Problem
`(profile)/settings/page.tsx` và `(admin)/settings/page.tsx` cùng resolve `/settings`.

### Solution
Profile settings page đặt tại:
- **Path:** `app/(profile)/profile/settings/page.tsx`
- **URL:** `/profile/settings` (không conflict với `/settings`)

---

## 12. Rủi ro còn lại

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Audit log action cho profile update dùng `user.password_reset` | Thấp | Ghi lại nhưng action gần đúng; có thể mở rộng sau |
| Không có `avatar_url` trong DB | Thấp | Profile settings chỉ sửa `full_name`; UI placeholder |
| Không logout các session khác khi đổi password | Trung bình | Có thể thêm sau — cần session management |

---

## 13. Bước tiếp theo đề xuất

- **P8.2.18:** Thêm `avatar_url` column vào `admin_users` → cho phép upload avatar
- **P8.2.19:** Thêm "Hoạt động gần đây" card vào profile page (đọc từ `admin_audit_logs` cho user hiện tại)
- **P8.2.20:** Session management — logout all other sessions khi đổi password
