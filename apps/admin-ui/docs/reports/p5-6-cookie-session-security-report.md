# P5.6 — Cookie & Session Security Audit

**Ngày:** 2026-05-27
**Trạng thái:** ✅ Hoàn thành
**Người thực hiện:** Claude Agent

---

## 1. Tổng Quan

P5.6 audit toàn bộ auth/session code để đảm bảo session cookie an toàn production. Không phá login/logout hiện tại. Không làm UI lớn, không làm tính năng mới.

---

## 2. File Đã Kiểm Tra

| File | Mục đích |
|------|----------|
| `app/api/auth/login/route.ts` | Login, tạo session, set cookie |
| `app/api/auth/logout/route.ts` | Logout, xóa session, clear cookie |
| `app/api/auth/me/route.ts` | Validate session, trả thông tin user |
| `lib/auth/session.ts` | Core session logic: create, validate, destroy |
| `lib/auth/require-admin.ts` | Auth guard cho workspace API |
| `lib/auth/store.ts` | Zustand store (client-side, không lưu token) |
| `lib/auth/types.ts` | Type definitions |
| `lib/auth/constants.ts` | **Tạo mới** — Edge-compatible constants |
| `middleware.ts` | Edge middleware bảo vệ route |
| `sql/workspace/011_admin_auth.sql` | Schema: admin_users, admin_sessions |

---

## 3. Vấn Đề Phát Hiện & Đã Fix

### 3.1 Hardcoded Cookie Name (NGHIÊM TRỌNG)

**Vấn đề:** Nhiều files hardcode `"admin_session"` trực tiếp thay vì dùng constant trung tâm. Nếu đổi tên cookie phải sửa nhiều nơi — dễ miss.

**Files bị ảnh hưởng:**
- `logout/route.ts` — hardcode `"admin_session"`
- `me/route.ts` — hardcode `"admin_session"`
- `require-admin.ts` — hardcode `"admin_session"`
- `middleware.ts` — hardcode `const SESSION_COOKIE_NAME = "admin_session"`

**Fix:** Tạo `lib/auth/constants.ts` (Edge-compatible), export `SESSION_COOKIE_NAME`. Tất cả files import từ đây.

```ts
// lib/auth/constants.ts (mới)
export const SESSION_COOKIE_NAME = "admin_session" as const;
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
```

**Files đã sửa:**
- `logout/route.ts` — `getSessionCookieName()`
- `me/route.ts` — `getSessionCookieName()`
- `require-admin.ts` — `getSessionCookieName()`
- `middleware.ts` — `SESSION_COOKIE_NAME` từ constants
- `session.ts` — dùng `SESSION_COOKIE_NAME` thay vì define lại

### 3.2 Constants Duplicate (TRUNG BÌNH)

**Vấn đề:** `session.ts` define `SESSION_COOKIE_NAME` và `SESSION_MAX_AGE` cục bộ. `constants.ts` (tạo mới) cũng define cùng giá trị. Với single source of truth, `constants.ts` là nguồn duy nhất.

**Fix:** `session.ts` import từ `constants.ts` thay vì define lại.

---

## 4. Cookie Flags — Trạng Thái Cuối Cùng

| Flag | Giá trị | Nguồn |
|------|---------|-------|
| `httpOnly` | `true` | Luôn true — không đọc bằng JS |
| `secure` | `true` (prod) / `false` (dev) | `process.env.NODE_ENV === "production"` |
| `sameSite` | `"lax"` | Cho phép GET request cùng site |
| `path` | `"/"` | Áp dụng toàn domain |
| `maxAge` | `604800` (7 ngày) | `SESSION_MAX_AGE` constant |
| `name` | `"admin_session"` | `SESSION_COOKIE_NAME` constant |

**DevTools không đọc được cookie bằng JavaScript** — `httpOnly: true` đảm bảo.

---

## 5. Session Expiration Logic

### Database Schema
```sql
-- admin_sessions có expires_at
expires_at TIMESTAMP WITH TIME ZONE NOT NULL
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
```

### Validation Flow
```
validateSession(sessionId)
  → Query DB: SELECT ... FROM admin_sessions s JOIN admin_users u ON ...
  → Kiểm tra expires_at < NOW() → xóa session → return null
  → Kiểm tra user_status != "active" → xóa session → return null
  → Return user object
```

### requireAdminAuth()
- Không có session cookie → **401 NOT_AUTHENTICATED**
- Session hết hạn / không tồn tại / user inactive → **401 SESSION_INVALID**
- Viewer + POST/PUT/PATCH/DELETE → **403 FORBIDDEN**

### Middleware
- Không có cookie → API **401**, Page **redirect /login?redirect=...**
- Có cookie → cho đi qua (route handler validate chi tiết)

---

## 6. Logout Cleanup Logic

```
POST /api/auth/logout
  1. Lấy sessionId từ cookie (getSessionCookieName())
  2. Gọi destroySession(sessionId)
     → DELETE FROM admin_sessions WHERE session_id = $1
  3. Set clear cookie:
     - name: SESSION_COOKIE_NAME
     - value: ""
     - maxAge: 0  → browser xóa cookie
     - httpOnly: true
     - secure: NODE_ENV === "production"
     - sameSite: "lax"
     - path: "/"
  4. Trả { success: true }
```

**Logout xóa cả DB record và cookie.**

---

## 7. Điểm Đã Verify

| # | Kiểm tra | Kết quả |
|---|----------|---------|
| 1 | Login set cookie với httpOnly=true | ✅ |
| 2 | Logout clear cookie (maxAge=0) | ✅ |
| 3 | Logout xóa session trong DB | ✅ |
| 4 | Session hết hạn → validateSession return null | ✅ |
| 5 | Session hết hạn → requireAdminAuth trả 401 | ✅ |
| 6 | Session hết hạn → middleware redirect /login (page) | ✅ |
| 7 | Session hết hạn → middleware 401 (API) | ✅ |
| 8 | httpOnly=true → JS không đọc được cookie | ✅ |
| 9 | secure=true khi NODE_ENV=production | ✅ |
| 10 | Session token không expose ra JSON response | ✅ (chỉ trả user info) |
| 11 | Cookie name dùng constant trung tâm | ✅ |
| 12 | TypeScript build pass | ✅ |
| 13 | Next.js build pass | ✅ |

---

## 8. Cách Test Thủ Công

### 8.1 Login set cookie đúng flags
```bash
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtl.vn","password":"Mtl@2026!"}'
# Kiểm tra response headers có Set-Cookie:
# admin_session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

### 8.2 Logout clear cookie
```bash
curl -v -X POST http://localhost:3000/api/auth/logout \
  --cookie "admin_session=<token>"
# Kiểm tra Set-Cookie: admin_session=; Max-Age=0
```

### 8.3 Session hết hạn
1. Login → lấy token
2. Xóa row trong DB: `DELETE FROM admin_sessions WHERE session_id = '<token>'`
3. Gọi `/api/auth/me` → phải trả **401**

### 8.4 Middleware redirect
1. Không login, truy cập `/workspace` → phải redirect `/login`
2. Không login, gọi `/api/tasks` → phải nhận **401 JSON**

### 8.5 httpOnly
1. Login → mở DevTools → Application → Cookies
2. `admin_session` không có cột "Accessible via script" → ✅

---

## 9. Rủi Ro Còn Tồn Tại

| Rủi ro | Mức | Mô tả | Xử lý |
|--------|-----|-------|-------|
| CSRF attack | **Thấp** | `sameSite: "lax"` cho phép GET cross-site; CSRF token chưa implement | Cân nhắc thêm CSRF token ở P5.x tiếp theo nếu cần |
| Session fixation | **Thấp** | Session ID mới được tạo mỗi login; không reuse token cũ | Đã OK — mỗi login tạo `crypto.randomUUID()` mới |
| Cookie name quá generic | **Thấp** | `"admin_session"` khá generic | Tên OK cho internal admin tool; có thể đổi thành `mtl_admin_session` nếu muốn |
| HTTPS-only enforcement | **N/A** | Chỉ set `Secure` khi `NODE_ENV=production` | Đúng — dev không cần HTTPS |

---

## 10. Khuyến Nghị (Không Bắt Buộc)

1. **Đổi tên cookie** thành `mtl_admin_session` để rõ brand hơn và tránh conflict nếu có multi-app trên cùng domain.
2. **CSRF token** cho các POST/PUT/PATCH/DELETE API — cần cân nhắc nếu admin tool dùng cross-origin.
3. **Sliding expiration** — session tự động gia hạn khi user active. Hiện tại session cố định 7 ngày.

---

## 11. Điều Kiện Sang P5.7

| Tiêu chí | Trạng thái |
|----------|------------|
| Cookie flags đầy đủ (httpOnly, secure, sameSite, maxAge) | ✅ |
| Session có expires_at trong DB | ✅ |
| requireAdminAuth kiểm tra expiration | ✅ |
| Logout xóa DB + clear cookie | ✅ |
| Cookie name dùng constant trung tâm | ✅ |
| Session hết hạn → 401 / redirect | ✅ |
| Session token không expose JSON | ✅ |
| TypeScript pass | ✅ |
| Next.js build pass | ✅ |
| Không phá login/logout hiện tại | ✅ |

**→ Sẵn sàng sang P5.7.**

---

## 12. File Đã Tạo / Sửa Tóm Tắt

| Action | File |
|--------|------|
| **Tạo** | `lib/auth/constants.ts` |
| **Sửa** | `lib/auth/session.ts` — import constants |
| **Sửa** | `app/api/auth/logout/route.ts` — dùng getSessionCookieName() |
| **Sửa** | `app/api/auth/me/route.ts` — dùng getSessionCookieName() |
| **Sửa** | `lib/auth/require-admin.ts` — dùng getSessionCookieName() |
| **Sửa** | `middleware.ts` — import SESSION_COOKIE_NAME từ constants |
