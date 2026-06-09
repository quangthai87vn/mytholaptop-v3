# P5.3 — Báo cáo Rate Limit cho Workspace Write APIs

**Ngày hoàn thành:** 26/05/2026
**Trạng thái:** Hoàn thành ✅

---

## 1. File đã tạo

### `lib/workspace/rate-limit.ts`
Helper rate limiter riêng cho Workspace write APIs.

**Thiết kế:**
- Tái sử dụng `MemoryRateLimitStore` từ `lib/auth/rate-limit.ts` (P5.1)
- Ưu tiên theo `userId` từ session, fallback theo IP
- Interface tương thực Redis (dễ swap sau này)

**Các hàm chính:**

| Hàm | Mô tả |
|------|--------|
| `WORKSPACE_RATE_LIMIT` | Config: 60 requests/phút, lock 1 phút |
| `getRateLimitKey(req)` | Lấy key: `ws:user:{id}` hoặc `ws:ip:{ip}` |
| `checkWorkspaceRateLimit(req)` | Kiểm tra & tăng counter, trả 429 nếu vượt limit |
| `workspaceRateLimitResponse(result)` | Tạo HTTP 429 response chuẩn |

**Config hiện tại:**

```typescript
WORKSPACE_RATE_LIMIT: {
  maxAttempts: 60,        // 60 requests
  windowMs: 60_000,       // trong 1 phút
  lockDurationMs: 60_000,   // lock 1 phút khi vượt limit
}
```

---

## 2. File đã sửa

### Route — thêm rate limit check

| File | Route | Method |
|------|-------|--------|
| `app/api/tasks/route.ts` | `/api/tasks` | POST |
| `app/api/tasks/[id]/route.ts` | `/api/tasks/[id]` | PUT |
| `app/api/tasks/[id]/route.ts` | `/api/tasks/[id]` | DELETE |
| `app/api/campaigns/route.ts` | `/api/campaigns` | POST |
| `app/api/campaigns/[id]/route.ts` | `/api/campaigns/[id]` | PUT |
| `app/api/campaigns/[id]/route.ts` | `/api/campaigns/[id]` | DELETE |
| `app/api/projects/route.ts` | `/api/projects` | POST |
| `app/api/projects/[id]/route.ts` | `/api/projects/[id]` | PUT |
| `app/api/projects/[id]/route.ts` | `/api/projects/[id]` | DELETE |
| `app/api/interns/route.ts` | `/api/interns` | POST |

**Thứ tự xử lý:** `requireAdminAuth()` → `checkWorkspaceRateLimit()` → validation → database

---

## 3. Response khi vượt Rate Limit

Khi vượt giới hạn (HTTP 429):

```json
{
  "error": "Quá nhiều yêu cầu",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.",
  "retryAfterMs": 45230
}
```

**Headers kèm theo:**

| Header | Ví dụ | Mô tả |
|--------|--------|--------|
| `Retry-After` | `45` | Số giây chờ |
| `X-RateLimit-Limit` | `60` | Tổng limit |
| `X-RateLimit-Remaining` | `0` | Số request còn lại |
| `X-RateLimit-Reset` | `1751077800` | Unix timestamp hết lock |

---

## 4. Cách hoạt động

```
Request → requireAdminAuth() → checkWorkspaceRateLimit()
                                      ↓
                              Có session?
                              ├── Có → key = ws:user:{id}
                              └── Không → key = ws:ip:{ip}
                                      ↓
                              Counter++
                                      ↓
                              attempts >= 60?
                              ├── Không → cho đi tiếp ✅
                              └── Có → Lock 1 phút, trả 429 🚫
```

---

## 5. Cấu trúc Key

| Trường hợp | Key format | Ví dụ |
|------------|-----------|--------|
| Đã đăng nhập | `ws:user:{userId}` | `ws:user:550e8400-e29b-41d4-a716-446655440000` |
| Chưa đăng nhập | `ws:ip:{ip}` | `ws:ip:192.168.1.100` |

---

## 6. Cách Test

### Test bằng script

```bash
# Test spam POST /api/tasks (cần session cookie)
node -e "
const count = 70; // vượt limit 60
const results = [];

async function run() {
  for (let i = 0; i < count; i++) {
    const r = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'admin_session=<token>' },
      body: JSON.stringify({ title: 'Test ' + i, status: 'todo', priority: 'medium' })
    });
    if (i < 5 || i >= 65) {
      console.log('Request ' + (i+1) + ': HTTP ' + r.status + ' - remaining: ' + r.headers.get('X-RateLimit-Remaining'));
    }
  }
}
run();
"

# Test GET không bị rate limit
curl -X GET http://localhost:3000/api/tasks -H "Cookie: admin_session=<token>"
# → HTTP 200, không có rate limit headers
```

### Test bằng cURL

```bash
# Test spam tạo task (cần auth cookie)
for i in {1..65}; do
  curl -s -o /dev/null -w "%{http_code} " \
    -X POST http://localhost:3000/api/tasks \
    -H "Content-Type: application/json" \
    -H "Cookie: admin_session=<token>" \
    -d '{"title":"Test","status":"todo","priority":"medium"}'
done
echo ""
# Request 1-60 → 201
# Request 61-65 → 429
```

### Kiểm tra DevTools

1. Mở DevTools → Network tab
2. Thực hiện thao tác tạo/sửa task liên tục
3. Sau 60 lần trong 1 phút → HTTP 429
4. Kiểm tra Response headers có `Retry-After`, `X-RateLimit-*`

---

## 7. So sánh P5.1 vs P5.3

| Tiêu chí | P5.1 Auth Rate Limit | P5.3 Workspace Rate Limit |
|-----------|---------------------|------------------------|
| Scope | `/api/auth/login` | Tất cả workspace write APIs |
| Limit | 5 attempts / 15 phút | 60 requests / 1 phút |
| Lock duration | 15 phút | 1 phút |
| Key | IP only | UserId → IP fallback |
| Trigger | Login thất bại | Mọi write request |

---

## 8. Rủi ro còn lại

1. **Memory store** — Rate limit vẫn dùng `MemoryRateLimitStore`, không chính xác trong multi-instance deployment. Khi scale ra production, cần thay bằng Redis.

2. **`X-Forwarded-For` spoofing** — Attacker có thể spoof header để bypass IP-based fallback. Có thể khắc phục bằng cách trust only known proxies.

3. **Không có CAPTCHA** — Sau nhiều lần bị rate limit, không có CAPTCHA để distinguish human vs bot.

4. **`/api/interns/[id]` PUT** — Chưa có route handler PUT cho intern update. Nếu cần, thêm route với rate limit.

5. **Rate limit headers chỉ có khi đạt limit** — `X-RateLimit-*` headers chỉ được set khi trả 429. Có thể thêm vào mọi response để client biết số request còn lại.

---

## 9. Build Test

```bash
# TypeScript
pnpm --filter admin-ui exec tsc --noEmit
# → Pass ✅

# Next.js build
npm run build
# → Exit code 0 ✅
```

---

## 10. Điều kiện sang P5.4

### Checklist:
- [x] Helper rate limit riêng cho workspace
- [x] Áp dụng cho 10 routes write
- [x] GET không bị ảnh hưởng
- [x] Ưu tiên userId, fallback IP
- [x] HTTP 429 với message tiếng Việt
- [x] Headers: Retry-After, X-RateLimit-*
- [x] Không log sensitive data
- [x] TypeScript pass
- [x] Build pass
- [x] Báo cáo đã tạo

### Khuyến nghị cho P5.4:
- Thêm `X-RateLimit-*` headers vào mọi write response (not just 429)
- Implement PUT `/api/interns/[id]` với rate limit
- Thêm rate limit cho `/api/media-workflow` nếu có write operations
- WooCommerce credentials cleanup (còn exposed trong URL query params)
- Input sanitization (strip HTML tags)

**Có đủ điều kiện để chuyển sang P5.4** ✅
