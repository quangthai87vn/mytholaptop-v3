# P5.1 — Báo Cáo Rate Limit Cho Auth API

**Ngày:** 2026-05-26
**Trạng thái:** ✅ Hoàn thành
**Người thực hiện:** Claude Agent

---

## 1. Tổng Quan

P5.1 triển khai rate limit cho Auth API nhằm chống brute-force đăng nhập. Hệ thống giới hạn số lần đăng nhập sai trên mỗi IP, tự động khóa khi vượt ngưỡng.

---

## 2. File Đã Tạo / Sửa

### Tạo mới

| File | Mục đích |
|------|---------|
| `lib/auth/rate-limit.ts` | Rate limit store — in-memory, interface-ready cho Redis. Cung cấp `checkAndIncrement()`, `resetRateLimit()`, `getRateLimitStatus()` |

### Sửa

| File | Thay đổi |
|------|---------|
| `app/api/auth/login/route.ts` | Thêm rate limit check ở đầu handler. Gọi `checkAndIncrement()` khi login thất bại. Gọi `resetRateLimit()` khi login thành công. Log không có password. |

---

## 3. Cơ Chế Rate Limit

### 3.1 Config hiện tại

| Thông số | Giá trị | Ghi chú |
|----------|---------|---------|
| Số lần sai tối đa | **5 lần** | Trong window |
| Window | **15 phút** | Từ lần sai đầu tiên |
| Thời gian lock | **15 phút** | Sau khi vượt limit |
| Identifier | **IP address** | Ưu tiên `X-Forwarded-For` (client IP đầu tiên) |

### 3.2 Luồng hoạt động

```
Login attempt
      │
      ▼
┌─────────────────┐
│ Check rate limit│ ─── allowed=false ──► HTTP 429 (Retry-After)
│ status (IP)     │
└────────┬────────┘
         │ allowed=true
         ▼
   Parse credentials
         │
         ▼
   Fetch user from DB
         │
    ┌────┴────┐
    │ User    │── no ──► bcrypt delay + checkAndIncrement()
    │ found?  │         recordFailedAttempt() → Log
    └────┬────┘         return 401
         │ yes
         ▼
   User active?
         │
    ┌────┴────┐
    │ Status  │── no ──► return 403 (ACCOUNT_DISABLED)
    │ active? │
    └────┬────┘
         │ yes
         ▼
   bcrypt.compare(password, hash)
         │
    ┌────┴────┐
    │ Valid?  │── no ──► bcrypt delay + checkAndIncrement()
    │         │         recordFailedAttempt() → Log + 401
    └────┬────┘
         │ yes
         ▼
   resetRateLimit(IP)   ← Xóa attempts, không bị lock
   createSession()
   return 200 + session cookie
```

### 3.3 HTTP Response khi bị rate limit

```
HTTP/1.1 429 Too Many Requests
Retry-After: 900
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1751420400

{
  "error": "Bạn đã đăng nhập sai quá nhiều lần.",
  "message": "Vui lòng chờ 900 giây trước khi thử lại. Khoảng thời gian chờ: 15 phút.",
  "code": "RATE_LIMITED",
  "retryAfter": 900
}
```

### 3.4 Storage — In-Memory Map

**Cấu trúc data:**
```typescript
interface RateLimitEntry {
  attempts: number;     // Số lần sai trong window
  firstAttemptAt: number;  // Timestamp ms — bắt đầu window
  lockedUntil: number; // Timestamp ms — 0 = không bị lock
}
```

**Ưu điểm:**
- Không cần thêm dependency
- Hoạt động ngay trong development
- Cleanup tự động entry cũ

**Nhược điểm:**
- ⚠️ **Không chính xác trong multi-instance** — mỗi server có memory riêng
- Attacker có thể bypass bằng cách hit nhiều server instance
- **Cần Redis khi deploy production multi-instance**

### 3.5 Redis-Ready Interface

```typescript
interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  increment(key: string, windowMs: number, maxAttempts: number): RateLimitEntry;
  reset(key: string): void;
}
```

Để switch sang Redis: implement class mới với cùng interface, gọi `getRateLimitStore()` sẽ trả về RedisStore khi `REDIS_URL` env tồn tại.

---

## 4. Bảo Mật

### 4.1 Không log password
```typescript
// ✅ Đúng
console.warn(`[Auth/Login] Login failed — email=${normalizedEmail}, ip=${clientIp}`);

// ❌ Sai — KHÔNG BAO GIỜ làm vậy
console.warn(`[Auth/Login] Login failed — password=${password}`); // ← Cấm!
```

### 4.2 Không trả thông tin nhạy cảm khi login sai

```
# Response khi email không tồn tại — giống hệt khi password sai
{ "error": "Email hoặc password không đúng", "code": "INVALID_CREDENTIALS" }
```

- Không cho biết email có tồn tại hay không
- Timing attack được giảm thiểu bằng `bcrypt.compare()` delay

### 4.3 Rate limit headers

Response luôn có headers chuẩn cho client biết trạng thái:
- `Retry-After` — số giây chờ (khi bị 429)
- `X-RateLimit-Limit` — số lần thử tối đa
- `X-RateLimit-Remaining` — số lần còn lại
- `X-RateLimit-Reset` — Unix timestamp khi reset

---

## 5. Cách Test

### 5.1 Test login đúng (không bị ảnh hưởng)

```bash
# Đăng nhập đúng — phải vào được bình thường
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mytholaptop.vn","password":"correct_password"}'
# → HTTP 200 + Set-Cookie: admin_session=...
```

### 5.2 Test login sai 5 lần

```bash
for i in {1..5}; do
  echo "=== Attempt $i ==="
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@mytholaptop.vn","password":"wrong_password"}' \
    -w "\nHTTP %{http_code}\n" | head -5
done
```

**Kết quả mong đợi:**
- Attempt 1-4: HTTP 401
- Attempt 5: HTTP 429 (rate limited)

### 5.3 Test login đúng bị chặn

```bash
# Sau 5 lần sai, thử login đúng
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mytholaptop.vn","password":"correct_password"}' \
  -w "\nHTTP %{http_code}\n"
# → HTTP 429 — ngay cả password đúng cũng bị chặn
```

### 5.4 Test hết thời gian lock

```bash
# Chờ hết 15 phút (hoặc check header Retry-After)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mytholaptop.vn","password":"correct_password"}' \
  -w "\nHTTP %{http_code}\n"
# → HTTP 200 — sau khi hết thời gian lock
```

### 5.5 TypeScript check

```bash
cd apps/admin-ui
pnpm exec tsc --noEmit
# → Exit 0 = PASS
```

---

## 6. Route Nào Có Rate Limit

| Route | Rate Limit | Ghi chú |
|-------|-----------|---------|
| `POST /api/auth/login` | ✅ Nghiêm ngặt (5 lần/15 phút) | Check ở đầu handler, trước khi parse body |
| `POST /api/auth/logout` | ❌ Không | Chỉ destroy session, không có security risk |
| `GET /api/auth/me` | ❌ Không | Chỉ đọc session, session đã có rate limit khi tạo |

---

## 7. Rủi ro Còn Lại

### 7.1 Memory store không phù hợp multi-instance

**Rủi ro:** Trong deployment nhiều server instance, mỗi instance có memory riêng. Attacker có thể bypass rate limit bằng cách distribute requests qua nhiều IP hoặc qua nhiều instance.

**Giải pháp:** Implement `RedisRateLimitStore` khi deploy production.

### 7.2 IP spoofing / X-Forwarded-For manipulation

**Rủi ro:** Attacker có thể spoof `X-Forwarded-For` header để bypass rate limit theo IP.

**Giải pháp hiện tại:** Chỉ lấy IP đầu tiên trong `X-Forwarded-For` chain. Proxy/load balancer đáng tin cậy phải trust. Nếu admin-ui không đặt sau proxy, cần disable X-Forwarded-For parsing.

**Cờ tương lai:** `AUTH_RATE_LIMIT_TRUST_PROXY=false` để fallback về direct connection IP.

### 7.3 Không có CAPTCHA sau nhiều lần lock

**Rủi ro:** Attacker có thể chiếm dụng tài khoản người dùng bằng cách lock họ cố ý.

**Giải pháp tương lai:** Sau khi unlock, yêu cầu CAPTCHA để login.

---

## 8. Điều Kiện Sang P5.2

| Yêu cầu | Trạng thái |
|----------|-----------|
| Rate limit login hoạt động | ✅ |
| Không phá login hiện tại | ✅ |
| Message tiếng Việt | ✅ |
| Không log password | ✅ |
| HTTP 429 khi vượt limit | ✅ |
| TypeScript pass | ✅ |
| Next.js build pass | ✅ |

**Có đủ điều kiện sang P5.2:** ✅ Có
