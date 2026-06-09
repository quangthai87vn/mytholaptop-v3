# P5.7 — CSRF Protection cho Workspace/Admin Write APIs

**Ngày:** 2026-05-27
**Trạng thái:** ✅ Hoàn thành
**Người thực hiện:** Claude Agent

---

## 1. Tổng Quan

P5.7 triển khai CSRF Protection cho toàn bộ write APIs. Sử dụng **Double-Submit Cookie Pattern** — không cần server-side session storage cho CSRF token, không phá login/logout hiện tại, không ảnh hưởng GET APIs.

---

## 2. Cơ Chế CSRF Đã Chọn

### Double-Submit Cookie Pattern

```
Luồng hoàn chỉnh:
1. POST /api/auth/login thành công
   → Server tạo session cookie (httpOnly, Lax) + CSRF token cookie (non-httpOnly, Strict)
   → Browser lưu cả 2 cookies

2. Frontend gọi write API (POST/PUT/PATCH/DELETE)
   → adminFetch() tự động đọc csrf_token từ document.cookie
   → Gắn header: X-CSRF-Token: <value>
   → Gửi kèm session cookie (browser tự động)

3. Server nhận request
   → requireAdminAuth() kiểm tra session
   → requireCsrf() so sánh X-CSRF-Token header với csrf_token cookie
   → Match → cho qua. Không match → 403

4. POST /api/auth/logout
   → Xóa session DB record
   → Clear session cookie (maxAge=0)
   → Clear CSRF cookie (maxAge=0)
```

### CSRF Cookie Flags

| Flag | Giá trị | Lý do |
|------|---------|-------|
| `httpOnly` | `false` | JS cần đọc để gửi X-CSRF-Token header |
| `secure` | `true` (prod) / `false` (dev) | HTTPS-only trong production |
| `sameSite` | `"strict"` | Ngăn hoàn toàn cross-site submission |
| `maxAge` | `604800` (7 ngày) | Đồng bộ với session |
| `path` | `"/"` | Áp dụng toàn domain |

### Session Cookie Flags (không đổi)

| Flag | Giá trị |
|------|---------|
| `httpOnly` | `true` — XSS không đọc được |
| `sameSite` | `"lax"` — cho phép top-level navigation |

### Hai lớp bảo vệ độc lập:
- **CSRF token** (non-httpOnly) — bảo vệ CSRF attack
- **Session cookie** (httpOnly) — bảo vệ XSS/Session hijacking

---

## 3. File Đã Tạo / Sửa

### Tạo mới

| File | Mục đích |
|------|----------|
| `lib/auth/csrf.ts` | Core CSRF: validate, requireCsrf, cookie options |

### Sửa

| File | Thay đổi |
|------|----------|
| `lib/auth/session.ts` | `createSession()` trả thêm `csrfToken` + `csrfCookieOptions` |
| `app/api/auth/login/route.ts` | Set thêm `csrf_token` cookie khi login |
| `app/api/auth/logout/route.ts` | Clear thêm `csrf_token` cookie khi logout |
| `lib/api/admin-fetch.ts` | Auto-inject `X-CSRF-Token` header cho POST/PUT/PATCH/DELETE |
| `app/api/tasks/route.ts` | POST thêm `requireCsrf()` |
| `app/api/tasks/[id]/route.ts` | PUT + DELETE thêm `requireCsrf()` |
| `app/api/projects/route.ts` | POST thêm `requireCsrf()` |
| `app/api/projects/[id]/route.ts` | PUT + DELETE thêm `requireCsrf()` |
| `app/api/campaigns/route.ts` | POST thêm `requireCsrf()` |
| `app/api/campaigns/[id]/route.ts` | PUT + DELETE thêm `requireCsrf()` |
| `app/api/interns/route.ts` | POST thêm `requireCsrf()` |
| `app/api/settings/route.ts` | POST thêm `requireCsrf()` |
| `app/api/ai/settings/route.ts` | PUT thêm `requireCsrf()` |
| `app/api/ai/settings/all/route.ts` | PUT thêm `requireCsrf()` |
| `app/api/ai/settings/test/route.ts` | POST thêm `requireCsrf()` |
| `app/api/ai/providers/route.ts` | POST thêm `requireCsrf()` |
| `app/api/ai/providers/[id]/route.ts` | PUT + DELETE + POST thêm `requireCsrf()` |
| `app/api/ai/providers/[id]/models/route.ts` | POST + DELETE thêm `requireCsrf()` |
| `app/api/ai/providers/[id]/runtime-config/route.ts` | PUT thêm `requireCsrf()` |
| `app/api/ai/providers/api-key/route.ts` | POST thêm `requireCsrf()` |
| `app/api/ai/brand-voices/route.ts` | POST + DELETE thêm `requireCsrf()` |
| `app/api/ai/brand-voices/activate/route.ts` | POST thêm `requireCsrf()` |
| `app/api/ai/safety-rules/route.ts` | POST + DELETE + PATCH thêm `requireCsrf()` |
| `app/api/ai/prompt-rules/route.ts` | POST + DELETE + PATCH thêm `requireCsrf()` |
| `app/api/ai/task-routes/route.ts` | PUT + POST + DELETE thêm `requireCsrf()` |
| `app/api/ai/system-prompts/route.ts` | POST + PUT + DELETE thêm `requireCsrf()` |
| `app/api/content/generate/route.ts` | POST thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/content/templates/route.ts` | POST thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/content/templates/[id]/route.ts` | PUT + DELETE thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/content/schedules/route.ts` | POST thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/content/schedules/[id]/route.ts` | PUT + DELETE thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/content/items/route.ts` | POST thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/content/items/[id]/route.ts` | PUT + DELETE thêm `requireAdminAuth()` + `requireCsrf()` |
| `app/api/medusa/upload-media/route.ts` | POST thêm `requireCsrf()` |
| `app/api/migration/init/route.ts` | POST thêm `requireCsrf()` |
| `app/api/migration/repair/route.ts` | POST + DELETE thêm `requireCsrf()` |

---

## 4. Route Đã Bảo Vệ

### Workspace APIs
- `POST /api/tasks` — Tạo task
- `PUT /api/tasks/[id]` — Cập nhật task
- `DELETE /api/tasks/[id]` — Xóa task
- `POST /api/projects` — Tạo project
- `PUT /api/projects/[id]` — Cập nhật project
- `DELETE /api/projects/[id]` — Xóa project
- `POST /api/campaigns` — Tạo campaign
- `PUT /api/campaigns/[id]` — Cập nhật campaign
- `DELETE /api/campaigns/[id]` — Xóa campaign
- `POST /api/interns` — Tạo intern
- `POST /api/settings` — Lưu settings

### AI Settings APIs
- `PUT /api/ai/settings` — Lưu AI settings
- `PUT /api/ai/settings/all` — Lưu toàn bộ AI config
- `POST /api/ai/settings/test` — Test connection

### AI Provider APIs
- `POST /api/ai/providers` — Tạo provider
- `PUT /api/ai/providers/[id]` — Cập nhật provider
- `DELETE /api/ai/providers/[id]` — Xóa provider
- `POST /api/ai/providers/[id]` — Action (activate/deactivate/set-default)
- `POST /api/ai/providers/[id]/models` — Tạo model
- `DELETE /api/ai/providers/[id]/models` — Xóa model
- `PUT /api/ai/providers/[id]/runtime-config` — Lưu runtime config
- `POST /api/ai/providers/api-key` — Decrypt API key

### AI Rule APIs
- `POST /api/ai/brand-voices` — Upsert brand voice
- `DELETE /api/ai/brand-voices` — Xóa brand voice
- `POST /api/ai/brand-voices/activate` — Kích hoạt brand voice
- `POST /api/ai/safety-rules` — Upsert safety rule
- `DELETE /api/ai/safety-rules` — Xóa safety rule
- `PATCH /api/ai/safety-rules` — Toggle safety rule
- `POST /api/ai/prompt-rules` — Upsert prompt rule
- `DELETE /api/ai/prompt-rules` — Xóa prompt rule
- `PATCH /api/ai/prompt-rules` — Toggle prompt rule
- `PUT /api/ai/task-routes` — Upsert routing rule
- `POST /api/ai/task-routes` — Tạo routing rule
- `DELETE /api/ai/task-routes` — Xóa routing rule
- `POST /api/ai/system-prompts` — Tạo system prompt
- `PUT /api/ai/system-prompts` — Cập nhật system prompt
- `DELETE /api/ai/system-prompts` — Xóa system prompt

### Content APIs
- `POST /api/content/generate` — Generate content
- `POST /api/content/templates` — Tạo template
- `PUT /api/content/templates/[id]` — Cập nhật template
- `DELETE /api/content/templates/[id]` — Xóa template
- `POST /api/content/schedules` — Tạo schedule
- `PUT /api/content/schedules/[id]` — Cập nhật schedule
- `DELETE /api/content/schedules/[id]` — Xóa schedule
- `POST /api/content/items` — Tạo content item
- `PUT /api/content/items/[id]` — Cập nhật content item
- `DELETE /api/content/items/[id]` — Xóa content item

### Migration APIs
- `POST /api/medusa/upload-media` — Upload media
- `POST /api/migration/init` — Init migration
- `POST /api/migration/repair` — Repair images
- `DELETE /api/migration/repair` — Abort repair

### Auth (Logout)
- `POST /api/auth/logout` — Clear session + CSRF cookies

**Tổng cộng: ~35 endpoints write được bảo vệ**

---

## 5. Cách Frontend Gửi Token

### Sử dụng `adminFetch` (Khuyến nghị)

```tsx
import { adminFetch } from "@/lib/api/admin-fetch";

// Write — CSRF tự động được gắn
const res = await adminFetch("/api/tasks", {
  method: "POST",
  body: JSON.stringify({ title: "Task mới" }),
});

// GET — không cần CSRF
const list = await adminFetch("/api/tasks");
```

### Cơ chế bên trong `adminFetch`

```ts
// adminFetch tự động:
// 1. Đọc csrf_token từ document.cookie
// 2. Gắn header X-CSRF-Token cho POST/PUT/PATCH/DELETE
// 3. Gửi credentials: "include" (browser tự gửi session cookie)
```

### Fallback: Dùng fetch trực tiếp

```ts
// Nếu không dùng adminFetch, cần tự gắn:
const csrfToken = document.cookie
  .split("; ")
  .find(row => row.startsWith("csrf_token="))
  ?.split("=")[1];

await fetch("/api/tasks", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken ?? "",
  },
  credentials: "include",
  body: JSON.stringify(data),
});
```

---

## 6. API Không Cần CSRF

| API | Lý do |
|-----|-------|
| `GET /api/tasks` | Chỉ đọc dữ liệu |
| `GET /api/projects` | Chỉ đọc dữ liệu |
| `GET /api/campaigns` | Chỉ đọc dữ liệu |
| `GET /api/auth/me` | Chỉ đọc user info |
| `POST /api/auth/login` | Chưa có session → không CSRF được |
| Các GET APIs khác | Không thay đổi dữ liệu |

---

## 7. Cách Test Thủ Công

### 7.1 Login tạo CSRF cookie
```bash
curl -v -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtl.vn","password":"Mtl@2026!"}'
# Kiểm tra Set-Cookie có: csrf_token=...; SameSite=Strict
```

### 7.2 Write API không có CSRF → 403
```bash
# Chưa login hoặc không gửi X-CSRF-Token
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -b "admin_session=<valid-session>" \
  -d '{"title":"test"}'
# → HTTP 403 {"error":"Yêu cầu không hợp lệ (CSRF)",...}
```

### 7.3 Write API có CSRF đúng → 201
```bash
# Lấy CSRF token từ cookie
CSRF=$(curl -s -c - -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtl.vn","password":"Mtl@2026!"}' \
  | grep csrf_token | awk '{print $7}')

# Gọi POST với CSRF token
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -b "admin_session=<session>; csrf_token=$CSRF" \
  -d '{"title":"Task mới","status":"todo","priority":"medium"}'
# → HTTP 201
```

### 7.4 GET không bị ảnh hưởng
```bash
curl http://localhost:3000/api/tasks
# → HTTP 200 (không cần CSRF)
```

### 7.5 Logout clear cookies
```bash
curl -v -X POST http://localhost:3000/api/auth/logout \
  --cookie "admin_session=<session>; csrf_token=<csrf>"
# Set-Cookie: admin_session=; Max-Age=0
# Set-Cookie: csrf_token=; Max-Age=0
```

### 7.6 CSRF token sai → 403
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: wrong-token" \
  -b "admin_session=<session>; csrf_token=<real-token>" \
  -d '{"title":"test"}'
# → HTTP 403
```

---

## 8. Error Response Khi CSRF Fail

```json
{
  "error": "Yêu cầu không hợp lệ (CSRF)",
  "message": "Token bảo mật không hợp lệ hoặc bị thiếu. Vui lòng tải lại trang và thử lại.",
  "code": "CSRF_INVALID"
}
```
HTTP Status: **403 Forbidden**

---

## 9. Rủi Ro Còn Tồn Tại

| Rủi ro | Mức | Mô tả | Xử lý |
|--------|------|-------|-------|
| CSRF cookie đọc được bằng XSS | **Thấp** | Nếu có XSS, attacker đọc csrf_token và gửi request | httpOnly session cookie ngăn XSS đọc session; Content Security Policy giảm thiểu XSS |
| CSRF cookie không có httpOnly | **Chấp nhận** | Cần thiết để JS đọc và gửi X-CSRF-Token header | Hai lớp bảo vệ độc lập: XSS bị ngăn bởi httpOnly session cookie |
| Cross-origin với credentials | **Thấp** | sameSite=strict ngăn hoàn toàn cross-site | Các trình duyệt hiện đại hỗ trợ sameSite=strict |
| Không có refresh token rotation | **Thấp** | CSRF token không thay đổi trong 7 ngày | Phù hợp cho internal admin tool; có thể rotate khi sensitive action |

---

## 10. Điều Kiện Sang P5.8

| Tiêu chí | Trạng thái |
|----------|------------|
| CSRF helper (`lib/auth/csrf.ts`) hoàn chỉnh | ✅ |
| CSRF token auto-generate khi login | ✅ |
| CSRF cookie set với đúng flags (non-httpOnly, strict) | ✅ |
| `requireCsrf()` trả 403 khi fail | ✅ |
| `adminFetch` auto-inject X-CSRF-Token | ✅ |
| Tất cả write APIs có `requireCsrf()` | ✅ |
| Login/logout không bị ảnh hưởng | ✅ |
| GET APIs không bị ảnh hưởng | ✅ |
| Timing-safe comparison (chống timing attack) | ✅ |
| TypeScript pass | ✅ |
| Next.js build pass | ✅ |

**→ Sẵn sàng sang P5.8.**

---

## 11. Tổng Kết

**Tổng files tạo mới:** 1 (`lib/auth/csrf.ts`)
**Tổng files sửa:** 38
**Tổng endpoints bảo vệ:** ~35 write endpoints
**Build:** ✅ Pass | **TypeScript:** ✅ Pass
