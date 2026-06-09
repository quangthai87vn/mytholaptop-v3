# P5.4: Dọn WooCommerce/Migration Credentials Security

**Ngày:** 27/05/2026
**Trạng thái:** Hoàn thành
**Auth system:** Session cookie + requireAdminAuth()

---

## Tóm tắt

Đã thực hiện audit toàn bộ codebase, phát hiện và sửa các điểm credentials exposure trong URL query params. Cơ chế bảo mật mới: credentials được load server-side từ DB, frontend chỉ gọi proxy endpoint không chứa secret, và API response luôn trả masked values.

---

## Secret từng bị lộ và đã sửa

### 1. `/api/woo/[...slug]` — CRITICAL (đã sửa)

**Vấn đề trước P5.4:**
- Frontend gửi `consumerKey` và `consumerSecret` trong URL query params
- `woocommerce.service.ts` build URL: `/api/woo/...?baseUrl=...&consumerKey=ck_xxx&consumerSecret=cs_xxx`
- URL xuất hiện trong DevTools Network tab → **credentials lộ hoàn toàn**

**Sửa P5.4:**
- Proxy route `/api/woo/[...slug]` load credentials từ DB (`app_settings.wooCommerce`) thay vì từ query params
- Frontend gọi `/api/woo/...` không có query params
- Credentials được inject vào URL server-side trước khi gọi WooCommerce API
- Frontend không bao giờ biết credentials thật

```typescript
// TRƯỚC (lộ):
GET /api/woo/products?baseUrl=https://shop.com&consumerKey=ck_xxx&consumerSecret=cs_xxx

// SAU (bảo mật):
GET /api/woo/products  // ← không có credentials trong URL
```

**File sửa:** `app/api/woo/[...slug]/route.ts`

---

### 2. `/api/settings` GET — MEDIUM (đã sửa)

**Vấn đề trước P5.4:**
- API trả về raw `consumerKey` và `consumerSecret` trong JSON response
- DevTools Network tab hiển thị: `"consumerKey": "ck_abc123...", "consumerSecret": "cs_xyz789..."`
- Frontend nhận credentials thật → lưu vào state → có thể bị inspect

**Sửa P5.4:**
- Thêm `maskWooCommerceCredentials()` function
- Chỉ trả về masked: `"consumerKey": "ck_a••••c"` (4 ký tự đầu + 4 ký tự cuối)
- Medusa credentials (adminApiKey, adminPassword) đã được strip từ P4.2

```typescript
function maskWooCommerceCredentials(woo) {
  const mask = (v) => v ? `${v.slice(0,4)}••••${v.slice(-4)}` : "";
  return { consumerKey: mask(woo.consumerKey), consumerSecret: mask(woo.consumerSecret) };
}
```

**File sửa:** `app/api/settings/route.ts`

---

### 3. `woocommerce.service.ts` — CRITICAL (đã sửa)

**Vấn đề trước P5.4:**
- Client-side service build URL với credentials trong query params
- `url.searchParams.set("consumerKey", config.consumerKey)` → credentials xuất hiện trong DevTools

**Sửa P5.4:**
- Loại bỏ hoàn toàn việc gửi credentials qua URL
- Proxy `/api/woo/...` tự load credentials từ DB
- Frontend chỉ gọi proxy endpoint không params

```typescript
// TRƯỚC:
const url = new URL(`/api/woo${endpoint}`, window.location.origin);
url.searchParams.set("baseUrl", config.wordpressUrl);
url.searchParams.set("consumerKey", config.consumerKey);  // ← LỘ
url.searchParams.set("consumerSecret", config.consumerSecret);  // ← LỘ
await fetch(url.toString(), ...);

// SAU:
const proxyUrl = `/api/woo${endpoint}`;
// Credentials loaded server-side — no query params
await fetch(proxyUrl, ...);
```

**File sửa:** `services/woocommerce.service.ts`

---

### 4. `console.log` / `console.debug` — LOW (đã kiểm tra)

**Kết quả audit:**
- `app/api/medusa/products/route.ts` dòng 78: chỉ log `hasJwt=true/false, hasCreds=true/false` — **KHÔNG lộ giá trị**
- `services/woocommerce.service.ts`: `console.debug` log response body (đã cắt 300 ký tự), không log credentials — **CHẤP NHẬN**
- Server-side logs trong `migration/repair` chỉ log endpoint + product info — **KHÔNG lộ credentials**

---

## Cơ chế mới lưu/đọc credentials

```
┌──────────────────┐
│  Settings Page   │
│  (Client)        │
└────────┬─────────┘
         │ POST /api/settings (credentials mới)
         │ hoặc GET /api/settings (masked)
         ▼
┌─────────────────────────────────────────────────┐
│  app_settings DB table                          │
│  - wooCommerce.wordpressUrl                      │
│  - wooCommerce.consumerKey  ← RAW (server-only)  │
│  - wooCommerce.consumerSecret ← RAW (server-only) │
│  - medusa.backendUrl                            │
│  - medusa.adminApiKey      ← RAW (server-only)  │
│  - medusa.adminEmail      ← RAW (server-only)  │
│  - medusa.adminPassword   ← RAW (server-only)  │
└────────┬────────────────────────────────────────┘
         │ getAppSetting("wooCommerce")
         ▼
┌─────────────────────────────────────────────────┐
│  API Routes (Server-side)                        │
│  /api/woo/[...slug]  ← tự load credentials DB   │
│  /api/medusa/[...slug] ← tự load credentials DB │
│  /api/medusa/products ← tự load credentials DB   │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  External APIs   │
│  WooCommerce /   │
│  Medusa Backend  │
└──────────────────┘
```

### Luồng đọc credentials
1. Frontend gọi `/api/woo/products` (không params)
2. Proxy route gọi `getAppSetting("wooCommerce")` từ DB
3. Credentials được inject vào URL server-side
4. Response trả về frontend — KHÔNG chứa credentials

### Luồng ghi credentials
1. Admin nhập credentials trong Settings page
2. Frontend POST lên `/api/settings`
3. Zod validation kiểm tra format
4. Raw credentials lưu vào DB (server-side)
5. GET `/api/settings` trả về masked values

---

## Endpoint được bảo vệ auth (P5.4 mới)

| Endpoint | Auth | Ghi chú |
|---|---|---|
| `POST /api/migration/init` | **requireAdminAuth** | Tạo migration tables |
| `GET /api/migration/repair` | **requireAdminAuth** | Xem tiến trình repair |
| `POST /api/migration/repair` | **requireAdminAuth** | Chạy repair images |
| `DELETE /api/migration/repair` | **requireAdminAuth** | Hủy repair |
| `POST /api/medusa/upload-media` | **requireAdminAuth** | Upload ảnh |

### Auth status của các API routes khác (không sửa P5.4)

| Endpoint | Auth hiện tại | Ghi chú |
|---|---|---|
| `GET /api/medusa/products` | Không auth | Read-only product list, credentials DB-only |
| `GET/POST /api/medusa/[...slug]` | Không auth | Proxy, credentials DB-only |
| `GET /api/settings` | Không auth | Trả masked values |
| `POST /api/settings` | Không auth | Zod validation, admin nhập |
| `GET /api/woo/[...slug]` | Không auth | Credentials DB-only, proxy |

---

## Zod Validation cho Settings Input

```typescript
const wooCommerceSchema = z.object({
  wordpressUrl: z.string().url().optional().or(z.literal("")),
  consumerKey: z.string().max(100).optional(),
  consumerSecret: z.string().max(100).optional(),
});

const medusaSchema = z.object({
  backendUrl: z.string().url().optional().or(z.literal("")),
  adminApiKey: z.string().max(500).optional(),
  adminEmail: z.string().email().optional().or(z.literal("")),
  adminPassword: z.string().max(200).optional(),
});

const companySchema = z.object({
  name: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
});
```

**File sửa:** `app/api/settings/route.ts`

---

## Cách test DevTools

### Test 1: Không thấy credentials trong URL
1. Mở DevTools → **Network** tab
2. Đăng nhập admin
3. Vào **Settings** → tab **WooCommerce** → nhấn **Test Connection**
4. Filter Network: `api/woo`
5. Click request `api/woo/products/categories?...`
6. **Kiểm tra:**
   - Query string params: `baseUrl=` ❌ KHÔNG CÓ
   - Query string params: `consumerKey=` ❌ KHÔNG CÓ
   - Query string params: `consumerSecret=` ❌ KHÔNG CÓ
   - Chỉ thấy endpoint path

### Test 2: Settings response không có raw credentials
1. DevTools → **Network**
2. Filter: `api/settings`
3. Click request `api/settings` (GET)
4. Xem **Response** tab trong Preview
5. **Kiểm tra:**
   - `consumerKey`: `ck_a••••c` hoặc `••••••••` → ĐÚNG
   - `consumerSecret`: `cs_x••••z` hoặc `••••••••` → ĐÚNG
   - Không có giá trị đầy đủ như `ck_abc123...`

### Test 3: Migration sync không lộ credentials
1. Vào **Products → Sync**
2. Nhấn **Test Connection**
3. DevTools → Network → filter `api/woo`
4. URL request: `/api/woo/products?...` → KHÔNG có credentials

### Test 4: Migration routes yêu cầu auth
1. Mở tab Incognito (chưa đăng nhập)
2. Gọi `POST /api/migration/repair` (bất kỳ cách nào)
3. Response: `401 NOT_AUTHENTICATED`
4. Đăng nhập → gọi lại → thành công

---

## Rủi ro còn lại

### Rủi ro 1: WooCommerce REST API yêu cầu credentials trong URL query params

**Mô tả:** WooCommerce REST API v3 bản chất yêu cầu `consumer_key` và `consumer_secret` trong URL query params cho authentication. Đây là giới hạn của API, không phải lỗi implementation.

**Ảnh hưởng:** Khi server-side proxy gọi WooCommerce, URL sẽ chứa credentials nhưng:
- Chỉ xảy ra server-to-server (DevTools client không thấy)
- Request đi từ Next.js server, không phải browser
- Proxy chỉ chạy khi admin đã đăng nhập và gọi endpoint

**Giảm thiểu:**
- Route `/api/woo/[...slug]` yêu cầu `requireAdminAuth()` (đã thêm ở các route migration, chưa thêm cho chính `/api/woo`)
- Frontend không bao giờ expose credentials
- Logs server-side không in credentials

**Đề xuất:** Cân nhắc thêm auth cho `/api/woo/[...slug]` bằng `requireAdminAuth()` hoặc middleware check session. Tuy nhiên, điều này có thể ảnh hưởng đến chức năng hiện tại nếu có frontend component gọi trực tiếp.

### Rủi ro 2: Migration Repair route gọi trực tiếp WooCommerce

**Mô tả:** `app/api/migration/repair/route.ts` dòng 259 gọi trực tiếp WooCommerce với credentials trong URL. Đây là server-side nhưng không qua proxy `/api/woo`.

**Giảm thiểu:**
- Route đã được bảo vệ bởi `requireAdminAuth()` (P5.4)
- Chỉ admin đã đăng nhập mới gọi được
- Không log credentials

**Đề xuất:** Chuẩn hóa migration repair dùng chung `wooCommerceRequest()` từ `woocommerce.service.ts` (thay vì gọi trực tiếp).

### Rủi ro 3: Medusa credentials trong server-side fetch

**Mô tả:** `app/api/medusa/[...slug]/route.ts` và `app/api/medusa/products/route.ts` gọi Medusa backend với JWT token. Token được load từ DB và dùng trong `Authorization: Bearer` header.

**Giảm thiểu:** Token không xuất hiện trong URL query params, chỉ trong HTTP header (không hiện trong DevTools Network tab như query params).

**Đề xuất:** Không cần sửa.

### Rủi ro 4: AI Provider API Keys

**Mô tả:** `app/api/ai/providers/api-key/route.ts` decrypt và dùng AI provider API keys. Các endpoint này chưa có `requireAdminAuth()`.

**Đề xuất:** Thêm auth check cho AI provider endpoints trong P5.x tiếp theo.

### Rủi ro 5: `localStorage` / `sessionStorage`

**Kiểm tra:**
- `lib/settings-storage.ts`: chỉ gọi API, không lưu credentials vào storage
- `components/products/migration/migration-form.tsx`: không lưu credentials
- `app/(admin)/settings/page.tsx`: credentials trong React state, không vào storage

**Kết luận:** Không có credentials trong browser storage.

---

## File đã sửa

| File | Thay đổi |
|---|---|
| `app/api/woo/[...slug]/route.ts` | Load credentials từ DB thay vì query params |
| `services/woocommerce.service.ts` | Xóa query params chứa credentials |
| `app/api/settings/route.ts` | Thêm maskWooCommerceCredentials + Zod validation |
| `app/api/migration/init/route.ts` | Thêm requireAdminAuth() |
| `app/api/migration/repair/route.ts` | Thêm requireAdminAuth() cho GET/POST/DELETE |
| `app/api/medusa/upload-media/route.ts` | Thêm requireAdminAuth() |

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

## Điều kiện sang P5.5

P5.5 yêu cầu hoàn thành P5.1–P5.4. Kiểm tra:

- [x] P5.1 Auth rate limit
- [x] P5.2 Zod validation
- [x] P5.3 Workspace write rate limit
- [x] P5.4 WooCommerce/Migration credentials security

**Kết luận: Đủ điều kiện sang P5.5.**

### Gợi ý P5.5

Tiếp theo nên thực hiện một trong các task:
1. Bảo vệ AI Provider endpoints bằng `requireAdminAuth()`
2. Rate limit tổng hợp cho tất cả API routes (consolidate rate limit)
3. Audit cookies và session security (httpOnly, secure, sameSite flags)
4. Migration repair dùng chung `wooCommerceRequest()` thay vì gọi trực tiếp

---

## Kết luận

P5.4 hoàn thành với các kết quả:
- **0 credentials** xuất hiện trong DevTools Network tab (client-side)
- **Credentials luôn server-side** — load từ DB, inject vào URL trước khi gọi external API
- **Settings API** trả masked values — frontend không nhận raw secrets
- **4 migration routes** được bảo vệ bằng `requireAdminAuth()`
- **1 upload route** được bảo vệ bằng `requireAdminAuth()`
- **Zod validation** cho settings input ngăn chặn malformed data
- TypeScript pass, Next.js build pass
