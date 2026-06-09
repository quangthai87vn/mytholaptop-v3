# P4.Auth — Login Access Fix — Báo Cáo Hoàn Thành

**Ngày:** 2026-05-26
**Trạng thái:** ✅ Hoàn thành
**Task:** P4.Auth-Fix — Cung cấp thông tin đăng nhập dev

---

## 1. Tổng Quan

Đã thực hiện các bước cần thiết để admin có thể đăng nhập workspace:
1. Chạy migration tạo bảng `admin_users` + `admin_sessions`
2. Seed admin user đầu tiên với credentials dev
3. Verify toàn bộ login/logout/auth flow
4. Kiểm tra TypeScript pass

---

## 2. Migration — Đã Chạy

**File:** `sql/workspace/011_admin_auth.sql`

**Bảng đã tạo:**

| Bảng | Mô tả |
|---|---|
| `admin_users` | Lưu thông tin admin (email, password_hash, role, status) |
| `admin_sessions` | Lưu session (session_id → user_id, expires_at) |

**Lệnh chạy:**
```bash
node scripts/run-auth-migration.js
```

**Kết quả:**
```
[Migration] Connected to PostgreSQL
[Migration] Checking existing tables...
  admin_users:    MISSING
  admin_sessions: MISSING
[Migration] Running 011_admin_auth.sql...
[Migration] Done!
[Migration] Verification:
  ✓ admin_sessions
  ✓ admin_users
```

---

## 3. Admin User — Đã Tạo

**File:** `scripts/seed-admin.js`

**Lệnh:**
```bash
node scripts/seed-admin.js
```

**Kết quả:**
```
[Seed] No user found. Creating new admin...
[Seed] User created OK!

========================================
   DEV LOGIN CREDENTIALS
========================================
   URL:      http://localhost:3000/login
   Email:    admin@mtl.vn
   Password: Mtl@2026!
   Name:     MTL Admin
   Role:     super_admin
========================================

  ✅ Admin user ready!
  Redirect sau login: /workspace
```

**Dev server restart:** Đã kill dev server cũ và restart để reload module mới.

---

## 4. Thông Tin Đăng Nhập DEV

| Field | Giá trị |
|---|---|
| URL | `http://localhost:3000/login` |
| Email | `admin@mtl.vn` |
| Password | `Mtl@2026!` |
| Role | `super_admin` |

**Cách seed với credentials tùy chỉnh:**
```bash
# Reset password cho user hiện có
RESET_ADMIN_PASSWORD=true node scripts/seed-admin.js
node scripts/seed-admin.js --reset

# Tạo user mới với env vars
ADMIN_EMAIL=admin2@mtl.vn ADMIN_PASSWORD=SecurePass123 node scripts/seed-admin.js
```

---

## 5. Kết Quả Test Login/Logout/Auth Flow

**Script test:** `scripts/test-login.js`

### Test Results

| # | Mô tả | Status | Chi tiết |
|---|---|---|---|
| T1 | Login đúng credentials | ✅ PASS | `POST /api/auth/login` → 200, user object, Set-Cookie |
| T2 | Login sai password | ✅ PASS | → 401 `INVALID_CREDENTIALS` |
| T3 | `/api/auth/me` với session | ✅ PASS | → 200, trả user info (id, email, full_name, role) |
| T4 | `/api/auth/me` không session | ✅ PASS | → 401 `NOT_AUTHENTICATED` |
| T5 | `POST /api/tasks` không session | ✅ PASS | → 401 `NOT_AUTHENTICATED` |
| T6 | `POST /api/tasks` với session | ✅ PASS | → 201, task được tạo thành công |
| T7 | Logout | ✅ PASS | → 200, Set-Cookie clear |
| T8 | `/api/auth/me` sau logout | ✅ PASS | → 401 `NOT_AUTHENTICATED` |

### Security Checks

| Check | Result |
|---|---|
| Login response không chứa `password_hash` | ✅ PASS |
| Login response không chứa `apiKey` | ✅ PASS |
| Session cookie là `httpOnly` | ✅ PASS |
| Session cookie có `Max-Age=604800` (7 ngày) | ✅ PASS |
| `/api/auth/me` không session trả 401 | ✅ PASS |
| POST task không session trả 401 | ✅ PASS |

---

## 6. API Routes Đã Tạo/Sửa

### Tạo mới

| File | Mục đích |
|---|---|
| `scripts/run-auth-migration.js` | Migration runner cho bảng auth |
| `scripts/seed-admin.js` | Seed admin user (Node.js, bcryptjs) |
| `scripts/check-db.js` | Check database tables |
| `scripts/verify-db.js` | Verify DB state |
| `scripts/test-login.js` | Test login/auth flow |

### Sửa đổi

| File | Thay đổi |
|---|---|
| `sql/workspace/011_admin_auth.sql` | Tạo bảng `admin_users` + `admin_sessions` |

---

## 7. API Security — Rủi Ro Còn Tồn Tại

### 7.1. `/api/admin/me` — Cờ Cảnh Báo ⚠️

**File:** `app/api/admin/me/route.ts`

**Vấn đề:**
- Endpoint **không có auth guard** — ai cũng gọi được
- Trả về `admin_api_key` từ `app_settings` table
- Nếu `admin_api_key` được set, endpoint này expose Medusa API key cho bất kỳ ai

**Tình trạng:** Chưa xóa vì:
- Chưa xác định có component nào dùng endpoint này
- Cần audit toàn bộ codebase trước khi xóa

**Xử lý trong P4.2:**
- Xóa endpoint `/api/admin/me` hoàn toàn
- Hoặc thêm auth guard: chỉ admin đã login mới gọi được

### 7.2. JWT Token Trong URL Query String

**Phát hiện trong dev server logs:**
```
GET /api/medusa/admin/product-categories?limit=1000&backendUrl=...&adminApiKey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

JWT token bị gửi qua URL query string — có thể bị log trong server access logs.

**Xử lý trong P4.2:** Chuyển token sang `Authorization: Bearer` header thay vì query param.

---

## 8. Kiến Trúc Auth — Không Thay Đổi

| Hệ thống | Nguồn | Dùng cho |
|---|---|---|
| **P4.Auth (mới)** | `admin_users` PostgreSQL | Workspace: `/workspace`, `/projects`, `/tasks`, `/campaigns`, `/interns` |
| **Medusa Users (cũ)** | Medusa Backend API | Commerce: `/staff`, products, orders, customers |

Quyết định: Giữ nguyên kiến trúc đã chốt. Xem `docs/reports/p4-auth-architecture-audit.md`.

---

## 9. Dev Server

- **Restart:** Đã kill dev server cũ (PID 26516) và restart (PID 32752)
- **Port:** `http://localhost:3000`
- **Runtime:** Next.js 16.2.4 (Turbopack)
- **Cờ cảnh báo:** `"middleware" file convention is deprecated` — cần đổi sang `proxy` trong P4.2

---

## 10. TypeScript Check

```bash
pnpm exec tsc --noEmit
```

**Kết quả:** ✅ PASS — 0 errors

---

## 11. Checklist Hoàn Thành

- [x] Migration 011 đã chạy (bảng `admin_users`, `admin_sessions` tạo thành công)
- [x] Admin user đã tạo (`admin@mtl.vn`, `super_admin`)
- [x] Seed script hoạt động đúng
- [x] Dev server restart thành công
- [x] Login flow test: PASS (7/7 tests)
- [x] `/api/auth/me` không lộ secret: PASS
- [x] `/api/admin/me` cờ cảnh báo — đã ghi nhận cho P4.2
- [x] JWT trong URL query — cờ cảnh báo cho P4.2
- [x] TypeScript check: PASS

---

## 12. Bước Tiếp Theo

### Ngay lập tức (sau khi báo cáo này)

1. **Truy cập:** `http://localhost:3000/login`
2. **Đăng nhập:** `admin@mtl.vn` / `Mtl@2026!`
3. **Redirect:** `/workspace`

### Trong P4.2 (API Security)

1. Xóa `/api/admin/me` endpoint cũ
2. Fix JWT token trong URL query string → chuyển sang header
3. Thêm rate limiting cho `/api/auth/login`
4. Đổi middleware convention → proxy
5. Tạo user management UI cho `admin_users`

---

## 13. Có Đủ Điều Kiện Quay Lại P4.2 Không?

**Có ✅**

P4.Auth đã hoàn thành:
- Admin user có thể login thành công
- Session cookie hoạt động đúng
- API routes được bảo vệ bằng session
- TypeScript pass
- Không có breaking changes với commerce features

P4.2 có thể tiếp tục ngay với các nhiệm vụ:
- Rate limiting cho login endpoint
- Audit cho `/api/admin/me`
- Fix JWT trong query string
- Thêm user management CRUD

**Điều kiện:** Dev server đang chạy tại `http://localhost:3000`, admin credentials đã có sẵn.
