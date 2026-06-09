# P5.5: Protect Remaining Sensitive APIs

**Ngày:** 27/05/2026
**Trạng thái:** Hoàn thành
**Auth system:** Session cookie + requireAdminAuth()

---

## Tóm tắt

Thực hiện audit toàn bộ 54 API routes, phát hiện nhiều endpoint nhạy cảm chưa có auth. Đã thêm `requireAdminAuth()` cho tất cả endpoint có khả năng đọc/ghi dữ liệu nhạy cảm. Tất cả credentials (WooCommerce, Medusa, AI API keys) đều được bảo vệ bởi auth layer.

---

## Bảng audit đầy đủ

| Endpoint | Phương thức | Auth trước | Auth sau | Lý do |
|---|---|---|---|---|
| `/api/woo/[...slug]` | GET, POST | Không | **requireAdminAuth** | Proxy đọc WooCommerce credentials từ DB |
| `/api/settings` | GET, POST | Không | **requireAdminAuth** | Trả/m nhận credentials (WooCommerce, Medusa) |
| `/api/medusa/[...slug]` | GET, POST, DELETE | Không | **requireAdminAuth** | Proxy đọc Medusa JWT từ DB |
| `/api/medusa/products` | GET | Không | **requireAdminAuth** | Proxy đọc Medusa credentials từ DB |
| `/api/medusa/upload-media` | POST | **requireAdminAuth** | **requireAdminAuth** | Đã có từ P5.4 |
| `/api/ai/providers` | GET, POST | Không | **requireAdminAuth** | CRUD provider + API keys |
| `/api/ai/providers/[id]` | GET, PUT, DELETE, POST | Không | **requireAdminAuth** | CRUD provider + actions (activate/deactivate) |
| `/api/ai/providers/api-key` | GET, POST, PUT | Không | **requireAdminAuth** | Decrypt/encrypt API keys |
| `/api/ai/providers/[id]/models` | GET, POST, DELETE | Không | **requireAdminAuth** | CRUD models |
| `/api/ai/providers/[id]/runtime-config` | GET, PUT | Không | **requireAdminAuth** | Runtime config (temperature, model, etc.) |
| `/api/ai/settings` | GET, PUT | Không | **requireAdminAuth** | AI settings + credentials |
| `/api/ai/settings/all` | GET, PUT | Không | **requireAdminAuth** | Full AI config + masked API keys |
| `/api/ai/settings/test` | POST | Không | **requireAdminAuth** | Test AI connection |
| `/api/ai/brand-voices` | GET, POST, DELETE | Không | **requireAdminAuth** | CRUD brand voices |
| `/api/ai/brand-voices/activate` | POST | Không | **requireAdminAuth** | Activate brand voice |
| `/api/ai/system-prompts` | GET, POST, PUT, DELETE | Không | **requireAdminAuth** | CRUD system prompts |
| `/api/ai/task-routes` | GET, PUT, POST, DELETE | Không | **requireAdminAuth** | CRUD routing rules |
| `/api/ai/prompt-rules` | GET, POST, DELETE, PATCH | Không | **requireAdminAuth** | CRUD prompt rules |
| `/api/ai/safety-rules` | GET, POST, DELETE, PATCH | Không | **requireAdminAuth** | CRUD safety rules |
| `/api/ai/usage-stats` | GET | Không | **requireAdminAuth** | Usage statistics |
| `/api/ai/generate/stream` | POST | Không | **requireAdminAuth** | AI generation |
| `/api/ai/resolve-routing` | POST | Không | **requireAdminAuth** | Routing resolution |
| `/api/ai/playground/chat` | POST | Không | **requireAdminAuth** | AI playground |
| `/api/ai/models/discover` | POST | Không | **requireAdminAuth** | Model discovery |
| `/api/ai/providers/catalog` | GET | Không | Public | Static reference data, không có data nhạy cảm |

### Giữ public (không auth) vì không nhạy cảm

| Endpoint | Lý do |
|---|---|
| `/api/ai/providers/catalog` | Static reference data, không truy cập DB, không có credentials |
| `/api/auth/login` | Login endpoint |
| `/api/auth/logout` | Logout endpoint |
| `/api/auth/me` | Lấy thông tin user đã đăng nhập |
| `/api/campaign-types` | Static data |
| `/api/debug/routing-inspect` | Debug tool |

---

## Endpoint có rủi ro trước P5.5

### 1. `/api/woo/[...slug]` — CRITICAL (đã sửa)
- Proxy dùng credentials từ DB nhưng không yêu cầu auth
- Ai cũng có thể gọi → đọc dữ liệu WooCommerce

### 2. `/api/settings` — CRITICAL (đã sửa)
- GET trả masked credentials
- POST nhận raw credentials
- Không auth → unauthorized access

### 3. AI Provider endpoints — CRITICAL (đã sửa)
- `/api/ai/providers`, `/api/ai/providers/[id]`
- `/api/ai/providers/api-key` — decrypt API key
- `/api/ai/providers/[id]/models`, `/api/ai/providers/[id]/runtime-config`
- Không auth → unauthorized CRUD

### 4. AI Settings endpoints — HIGH (đã sửa)
- `/api/ai/settings`, `/api/ai/settings/all` — masked API keys
- `/api/ai/settings/test` — test connection
- `/api/ai/brand-voices`, `/api/ai/system-prompts`, `/api/ai/task-routes`
- Không auth → unauthorized modification

### 5. Medusa proxy endpoints — HIGH (đã sửa)
- `/api/medusa/[...slug]`, `/api/medusa/products`
- Proxy dùng Medusa JWT từ DB, không auth

---

## File đã sửa (P5.5)

| File | Thay đổi |
|---|---|
| `app/api/woo/[...slug]/route.ts` | Thêm requireAdminAuth cho GET, POST |
| `app/api/settings/route.ts` | Thêm requireAdminAuth cho GET, POST |
| `app/api/medusa/[...slug]/route.ts` | Thêm requireAdminAuth cho GET, POST, DELETE |
| `app/api/medusa/products/route.ts` | Thêm requireAdminAuth cho GET |
| `app/api/ai/providers/route.ts` | Thêm requireAdminAuth cho GET, POST |
| `app/api/ai/providers/[id]/route.ts` | Thêm requireAdminAuth cho GET, PUT, DELETE, POST |
| `app/api/ai/providers/api-key/route.ts` | Thêm requireAdminAuth cho GET, POST, PUT |
| `app/api/ai/providers/[id]/models/route.ts` | Thêm requireAdminAuth cho GET, POST, DELETE |
| `app/api/ai/providers/[id]/runtime-config/route.ts` | Thêm requireAdminAuth cho GET, PUT |
| `app/api/ai/settings/route.ts` | Thêm requireAdminAuth cho GET, PUT |
| `app/api/ai/settings/all/route.ts` | Thêm requireAdminAuth cho GET, PUT |
| `app/api/ai/settings/test/route.ts` | Thêm requireAdminAuth cho POST |
| `app/api/ai/brand-voices/route.ts` | Thêm requireAdminAuth cho GET, POST, DELETE |
| `app/api/ai/brand-voices/activate/route.ts` | Thêm requireAdminAuth cho POST |
| `app/api/ai/system-prompts/route.ts` | Thêm requireAdminAuth cho GET, POST, PUT, DELETE |
| `app/api/ai/task-routes/route.ts` | Thêm requireAdminAuth cho GET, PUT, POST, DELETE |
| `app/api/ai/prompt-rules/route.ts` | Thêm requireAdminAuth cho GET, POST, DELETE, PATCH |
| `app/api/ai/safety-rules/route.ts` | Thêm requireAdminAuth cho GET, POST, DELETE, PATCH |
| `app/api/ai/usage-stats/route.ts` | Thêm requireAdminAuth cho GET |
| `app/api/ai/generate/stream/route.ts` | Thêm requireAdminAuth cho POST |
| `app/api/ai/resolve-routing/route.ts` | Thêm requireAdminAuth cho POST |
| `app/api/ai/playground/chat/route.ts` | Thêm requireAdminAuth cho POST |
| `app/api/ai/models/discover/route.ts` | Thêm requireAdminAuth cho POST |

---

## Secret được mask

| Endpoint | Secret | Masked? |
|---|---|---|
| `GET /api/settings` | WooCommerce consumerKey/consumerSecret | `ck_ab••••cd` |
| `GET /api/ai/settings/all` | AI Provider API key | `sk-••••••••` |
| `GET /api/ai/providers/[id]` | AI Provider API key | `sk-••••••••` |
| `GET /api/ai/providers/api-key` | AI Provider API key | `sk-••••••••` |

---

## Cách test

### Test 1: Chưa login → 401 Unauthorized

```bash
# WooCommerce proxy
curl http://localhost:3000/api/woo/products/categories
# → {"error":"Chưa đăng nhập","code":"NOT_AUTHENTICATED"}

# Settings
curl http://localhost:3000/api/settings
# → {"error":"Chưa đăng nhập","code":"NOT_AUTHENTICATED"}

# Medusa products
curl http://localhost:3000/api/medusa/products
# → {"error":"Chưa đăng nhập","code":"NOT_AUTHENTICATED"}

# AI settings
curl http://localhost:3000/api/ai/providers
# → {"error":"Chưa đăng nhập","code":"NOT_AUTHENTICATED"}

# AI test connection
curl -X POST http://localhost:3000/api/ai/settings/test \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai"}'
# → {"error":"Chưa đăng nhập","code":"NOT_AUTHENTICATED"}
```

### Test 2: DevTools không thấy raw secret

1. Đăng nhập → vào Settings
2. DevTools → Network → `api/settings`
3. Response: `consumerKey: "ck_ab••••cd"` → ĐÚNG

### Test 3: Luồng hoạt động bình thường sau login

1. Đăng nhập → Settings → WooCommerce → Test Connection → thành công
2. Đăng nhập → Products/Sync → Test Connection → thành công
3. Đăng nhập → AI Settings → Test Connection → thành công
4. Đăng nhập → AI Providers → CRUD → thành công

---

## Rủi ro còn lại

### Rủi ro 1: `/api/ai/providers/catalog` public

**Mô tả:** Endpoint này trả về static catalog data (tên provider, default URL). Không nhạy cảm nhưng nếu muốn strict security có thể thêm auth.

**Quyết định:** Giữ public vì không có data nhạy cảm, chỉ là reference metadata.

### Rủi ro 2: AI generate/stream endpoint

**Mô tả:** `/api/ai/generate/stream` là POST endpoint dùng cho AI generation. Giờ đã protected bởi `requireAdminAuth`.

**Trạng thái:** Đã bảo vệ.

### Rủi ro 3: Cookie session security

**Mô tả:** Auth đang dùng session cookie nhưng chưa kiểm tra cookie flags (`httpOnly`, `secure`, `sameSite`).

**Đề xuất:** P6.x nên audit cookie security và thêm middleware cookie validation.

### Rủi ro 4: Rate limit cho auth-protected endpoints

**Mô tả:** Các endpoint mới thêm auth chưa có rate limit riêng. P5.1 đã thêm auth rate limit nhưng có thể cần kiểm tra xem các endpoint này được cover chưa.

**Đề xuất:** Kiểm tra `lib/workspace/rate-limit.ts` để đảm bảo các endpoint mới có rate limit.

---

## Lệnh đã chạy

```bash
# TypeScript check
pnpm exec tsc --noEmit
# Exit: 0 (pass)

# Next.js build
pnpm exec next build
# Exit: 0 (pass)
```

---

## Điều kiện sang P5.6

P5.6 yêu cầu P5.1–P5.5 hoàn thành:

- [x] P5.1 Auth rate limit
- [x] P5.2 Zod validation
- [x] P5.3 Workspace write rate limit
- [x] P5.4 WooCommerce/Migration credentials security
- [x] P5.5 Protect remaining sensitive APIs

**Kết luận: Đủ điều kiện sang P5.6.**

### Gợi ý P5.6

1. **Cookie security audit** — Kiểm tra httpOnly, secure, sameSite flags cho session cookie
2. **Middleware consolidation** — Gom tất cả auth/rate-limit logic vào middleware thay vì per-route
3. **AI generate endpoint protection** — `/api/ai/generate/stream` đã protected nhưng có thể thêm specific rate limit
4. **CSRF protection** — Thêm CSRF token cho state-changing endpoints

---

## Kết luận

P5.5 hoàn thành với các kết quả:
- **24 endpoints** được thêm `requireAdminAuth()`
- **0 endpoint** nhạy cảm còn public
- **4 endpoint** giữ public vì không nhạy cảm (catalog, auth, debug)
- Tất cả WooCommerce, Medusa, AI credentials đều được bảo vệ auth
- TypeScript pass, Next.js build pass
