# P10.1 — Product Management + API Key Configuration Audit Report

**Ngày:** 28/05/2026  
**Trạng thái:** ✅ Hoàn thành audit  
**Scope:** API Key Config + Product Data Source + Architecture Analysis

---

## Tóm tắt điều hành

| Câu hỏi | Trả lời |
|---------|---------|
| API keys nằm ở đâu? | PostgreSQL `app_settings` table (encrypted at rest) |
| Route cấu hình API keys? | `GET/POST /api/settings` → UI: `app/(admin)/settings/page.tsx` |
| /products lấy data từ đâu? | Medusa Admin API → `/api/medusa/*` proxy → Medusa Backend |
| Sản phẩm đang trống vì sao? | **Root cause: `getMedusaSettings()` trả `null` — Medusa credentials chưa được lưu trong DB** |
| Kiến trúc đúng? | ✅ Đúng: Medusa là source of truth, WooCommerce chỉ dùng cho migration |

---

## A. Audit API Key Configuration

### A1. Nơi lưu trữ

| Key | Storage | Encryption | Đã có UI? |
|-----|---------|------------|-----------|
| WooCommerce URL | PostgreSQL `app_settings` (key: `wooCommerce`) | Không mã hóa | ✅ `/settings` tab WooCommerce |
| WooCommerce Consumer Key | PostgreSQL `app_settings` (key: `wooCommerce`) | Không mã hóa | ✅ `/settings` tab WooCommerce |
| WooCommerce Consumer Secret | PostgreSQL `app_settings` (key: `wooCommerce`) | Không mã hóa | ✅ `/settings` tab WooCommerce |
| Medusa Backend URL | PostgreSQL `app_settings` (key: `medusa`) | Không mã hóa | ✅ `/settings` tab Medusa |
| Medusa Admin API Key (JWT) | PostgreSQL `app_settings` (key: `medusa`) | **Có mã hóa (P5.4)** | ✅ `/settings` tab Medusa |
| Medusa Admin Email | PostgreSQL `app_settings` (key: `medusa`) | Không mã hóa | ✅ `/settings` tab Medusa |
| Medusa Admin Password | PostgreSQL `app_settings` (key: `medusa`) | **Có mã hóa (P5.4)** | ✅ `/settings` tab Medusa |

### A2. Env vars

```
.env (root):
  DATABASE_URL=postgresql://...@postgresql.mtl.vn:7000/mytholaptop
  REDIS_URL=redis://redis:6379
  JWT_SECRET=supersecret_dev_local_2026
  COOKIE_SECRET=supersecret_dev_local_2026
  NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:7003
```

**KHÔNG có** WooCommerce/Medusa credentials trong `.env`.

### A3. DB Table: `app_settings`

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,           -- JSON string
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

3 rows được tạo tự động:
- `app_settings.key = 'wooCommerce'` — lưu WooCommerce config
- `app_settings.key = 'medusa'` — lưu Medusa config
- `app_settings.key = 'company'` — lưu company branding

### A4. API Routes cho Settings

| Route | Method | Chức năng | Auth |
|-------|--------|-----------|------|
| `/api/settings` | GET | Lấy settings (mask WooCommerce secrets, strip Medusa secrets) | `requireAdminAuth` + `settings.manage` |
| `/api/settings` | POST | Lưu settings (validate Zod schema, audit log) | `requireAdminAuth` + CSRF + `settings.manage` |
| `/api/medusa/[...slug]` | GET/POST/DELETE | Proxy đến Medusa backend | `requireAdminAuth` + DB credentials |

### A5. UI Settings Page

**Route:** `app/(admin)/settings/page.tsx`  
**Tabs:**
- **Thông tin công ty** — Company name, website, phone, logo, address
- **WooCommerce** — WordPress URL, Consumer Key, Consumer Secret (masked input)
- **Medusa** — Backend URL, Admin Email, Password, JWT Token (masked input) + "Lấy Token" button

### A6. Security Issues phát hiện

| Issue | Mức độ | Mô tả |
|-------|---------|---------|
| WooCommerce secrets không mã hóa | ⚠️ Medium | Consumer Key/Secret lưu plain text trong DB. Nên mã hóa trước khi lưu. |
| Medusa secrets có mã hóa | ✅ OK | `adminApiKey` và `adminPassword` có mã hóa (P5.4). |
| `/api/settings` GET mask credentials | ✅ OK | WooCommerce credentials bị mask (chỉ hiện 4 ký tự đầu + 4 cuối). Medusa secrets bị strip hoàn toàn. |
| `/api/settings` POST validate credentials | ✅ OK | Zod schema validation, audit log ghi nhận thay đổi. |

### A7. Migration config

**Route:** `app/(admin)/migration/page.tsx` — sử dụng `loadApiSettings()` từ `lib/settings-storage.ts` để lấy WooCommerce + Medusa credentials khi chạy migration.

---

## B. Audit Product Data Source

### B1. Data Flow hiện tại

```
/products (page.tsx)
  └── useProducts(filter)
        ├── useMedusaConfigured()
        │     └── getMedusaSettings() → app_settings DB
        └── listProducts(config, filter)
              ├── medusaRequest()
              │     └── fetch("/api/medusa/admin/products?...")
              │           (client-side proxy)
              └── /api/medusa/[...slug]/route.ts (server-side)
                    ├── loadServerCredentials()
                    │     └── getAppSetting("medusa")
                    └── fetch(medusaBackendUrl/admin/products)
                          └── Medusa Backend
```

### B2. Chi tiết các file

| File | Role |
|------|------|
| `app/(admin)/products/page.tsx` | Page component — hiển thị products với filter, search, grid/list view |
| `hooks/use-medusa.ts` | TanStack Query hooks — `useProducts()`, `useMedusaConfigured()` |
| `services/medusa-settings.ts` | `getMedusaSettings()` — đọc `app_settings.medusa` từ DB → trả `MedusaConfig` |
| `services/medusa-api.service.ts` | `listProducts()` — gọi `/api/medusa/admin/products` |
| `app/api/medusa/[...slug]/route.ts` | Server-side proxy — load credentials từ DB → forward đến Medusa backend |
| `lib/content/db/app-settings.ts` | `getAppSetting("medusa")` — đọc `app_settings` table |

### B3. Root Cause: Tại sao /products trống?

```
useMedusaConfigured():
  getMedusaSettings()
    loadApiSettings()
      loadSettings()
        /api/settings (GET)
          ├── medusa: { backendUrl: "http://localhost:9000", adminApiKey: "", ... }
          └── return { medusaBackendUrl: "...", medusaAdminKey: "" }
    if (!settings.medusaBackendUrl || !settings.medusaAdminKey):
      return null

useProducts():
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    ...
    enabled: !!configured,  ← FALSE nếu credentials rỗng
  });
  → Query KHÔNG CHẠY
  → isLoading = true → loading skeleton
  → products = []
```

**Nguyên nhân gốc:** Credentials Medusa chưa được lưu vào `app_settings` table. Khi Super Admin vào `/settings` → tab Medusa → nhấn "Lưu thay đổi" → credentials được gửi POST `/api/settings` → lưu vào `app_settings` → `/products` sẽ hoạt động.

### B4. Proxy credentials flow

```
medusa-api.service.ts → medusaRequest()
  fetch("/api/medusa/admin/products?backendUrl=http://localhost:9000")

app/api/medusa/[...slug]/route.ts (server)
  const backendUrlParam = req.nextUrl.searchParams.get("backendUrl");
  const serverCreds = await loadServerCredentials();  ← load from DB
  if (serverCreds.jwtToken):
    authToken = serverCreds.jwtToken
  else if (serverCreds.email && serverCreds.password):
    authToken = await authenticateWithMedusa(email, password)
  fetch(actualBackendUrl/admin/products, { Authorization: Bearer <token> })
```

### B5. Migration Architecture

```
WooCommerce API
  → lib/migration/woo-connector.ts (gọi WC REST API)
  → lib/transform.ts (transform Woo → Medusa format)
  → services/medusa.service.ts (batchCreateProducts → Medusa Admin API)
  → Medusa Backend (products, categories, tags lưu ở đây)
```

Migration mapping và sync logs được lưu trong localStorage (client-side):
- `mtl_migration_mapping` — WooCommerce ID → Medusa ID
- `mtl_migration_history` — migration logs + stats

---

## C. Architecture Assessment

### C1. Đánh giá kiến trúc hiện tại

| Component | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| Medusa là source of truth | ✅ Đúng | Products được tạo/update trong Medusa DB |
| WooCommerce chỉ dùng cho migration | ✅ Đúng | Không query WooCommerce sau migration |
| Proxy Medusa credentials | ✅ Đúng | Server-side proxy load credentials từ DB, không expose client-side |
| Settings stored in DB | ✅ Đúng | `app_settings` table, supports Docker |
| Credentials mask/security | ✅ Đúng | WooCommerce masked, Medusa stripped |

### C2. Điểm yếu

| Issue | Mô tả |
|-------|--------|
| WooCommerce credentials không mã hóa | Nên mã hóa Consumer Key/Secret |
| Migration mapping không lưu DB | Mất khi clear localStorage |
| Sync logs không lưu DB | Không xem lịch sử sync |
| Medusa credentials có thể trống | Gây /products trống — cần UX warning rõ ràng |
| Migration chạy client-side | Có thể timeout nếu browser tab đóng |

---

## D. Root Cause Summary

### D1. Tại sao sản phẩm trống?

**Chuỗi sự kiện:**

1. Admin vào `/products` → `useProducts()` được gọi
2. `useMedusaConfigured()` → `getMedusaSettings()` → gọi `/api/settings`
3. API trả `medusa: { backendUrl: "...", adminApiKey: "" }`
4. `getMedusaSettings()` check: `!settings.medusaBackendUrl || !settings.medusaAdminKey`
5. → `return null`
6. `useProducts()` có `enabled: !!configured` → query không chạy
7. → Empty state

**Fix đơn giản:** Vào `/settings` → Tab Medusa → Nhập Backend URL + API Key hoặc Email/Password → Lưu → `/products` sẽ hiển thị.

### D2. Cấu hình Medusa đúng cách

```
GET /api/settings
Response medusa section:
  backendUrl: "http://localhost:9000"
  adminApiKey: ""      ← CHƯA CẤU HÌNH
  adminEmail: "admin@example.com"
  adminPassword: ""     ← CHƯA CẤU HÌNH

→ getMedusaSettings() return null
→ useProducts.enabled = false
→ Products page shows empty state
```

---

## E. Kiến trúc đề xuất (P10.2)

### E1. Sau migration, luồng đúng

```
WooCommerce          Medusa Backend         Admin UI
     │                    │                    │
     │                    │                    │
     │ ←── migrate ───────│                    │
     │                    │                    │
     │                    │ ←── CRUD products ─│
     │                    │                    │
     │                    │                    │
     │                    │ ←── read only ────┘
     │
     └── NOT USED ──────────────────────────→
```

### E2. PostgreSQL usage đúng sau migration

```
app_settings           MIGRATION_LOGS (cần tạo)
├── wooCommerce        ├── id, started_at, status, stats
├── medusa             ├── products_created, categories_created
├── company            └── logs (JSONB)

ID_MAPPING (cần tạo)
├── woo_product_id
├── medusa_product_id
└── mapped_at
```

### E3. Product Management module (P10.2)

Module `/products` cần cải thiện:

| Tính năng | Hiện tại | Cần thêm |
|-----------|---------|---------|
| Danh sách sản phẩm | ✅ Grid/List view | ✅ |
| Tìm kiếm | ✅ | ✅ |
| Lọc danh mục | ✅ Tree filter | ✅ |
| Lọc trạng thái | ✅ | ✅ |
| Xem tồn kho | ⚠️ Chưa rõ | Thêm stock widget |
| Ảnh đại diện | ✅ | ✅ |
| Giá bán | ✅ | ✅ |
| Giá khuyến mãi | ⚠️ Cần kiểm tra | |
| Trạng thái publish | ✅ | ✅ |
| Sync từ WooCommerce | ❌ Không cần | Nút "Re-sync" nếu cần |
| Refresh từ Medusa | ✅ TanStack Query auto-refetch | |

---

## F. Bước tiếp theo (P10.2)

### P10.2: Product Management Module Enhancement

1. **Fix /products trống** — thêm clear error state khi Medusa chưa configured
2. **Thêm sync status indicator** — show "Chưa kết nối Medusa" banner trên /products page
3. **Thêm stock management UI** — hiển thị inventory levels từ Medusa Inventory Module
4. **Tạo migration_logs DB table** — lưu sync history thay vì localStorage
5. **Tạo ID_MAPPING table** — lưu WooCommerce → Medusa ID mapping
6. **Mã hóa WooCommerce credentials** — extend P5.4 encryption cho Consumer Key/Secret
7. **Thêm "Test Connection" button** trên /settings Medusa tab
8. **Product detail page** — edit product inline từ Medusa API

---

## G. File Inventory

### G1. API Key Storage

| File | Mô tả |
|------|--------|
| `lib/content/db/app-settings.ts` | `getAppSetting()` / `saveAppSetting()` → PostgreSQL `app_settings` |
| `lib/settings-storage.ts` | `loadApiSettings()` → gọi `/api/settings` |
| `app/api/settings/route.ts` | GET/POST settings với mask + Zod validation + audit log |
| `app/api/medusa/[...slug]/route.ts` | Proxy: load Medusa credentials từ DB → forward đến Medusa |
| `services/medusa-settings.ts` | `getMedusaSettings()` → đọc `app_settings.medusa` |

### G2. Product Data Flow

| File | Mô tả |
|------|--------|
| `app/(admin)/products/page.tsx` | Product page — grid/list view, filters, search |
| `hooks/use-medusa.ts` | `useProducts()`, `useMedusaConfigured()` — TanStack Query |
| `services/medusa-api.service.ts` | `listProducts()`, `getProduct()`, `createProduct()` → Medusa API |
| `services/medusa.service.ts` | Migration helpers — `batchCreateProducts()`, `batchCreateCategories()` |

### G3. Settings UI

| File | Mô tả |
|------|--------|
| `app/(admin)/settings/page.tsx` | Settings page — 3 tabs (Company, WooCommerce, Medusa) |

### G4. Migration

| File | Mô tả |
|------|--------|
| `lib/migration/woo-connector.ts` | WooCommerce REST API client |
| `lib/migration/woo-to-medusa.ts` | Transform Woo → Medusa format |
| `lib/migration/medusa-api-client.ts` | Medusa migration client |
| `lib/transform.ts` | Data transformation helpers |

---

## H. Checkpoint Questions

### H1. "Sản phẩm trống" — đã rõ root cause?

**Có.** `getMedusaSettings()` trả `null` vì `app_settings.medusa` chưa được lưu. Fix: vào `/settings` → tab Medusa → nhập credentials → Lưu.

### H2. Nên dùng Medusa API hay DB trực tiếp?

**Medusa API là đúng.** Vì:
- Medusa là product source of truth sau migration
- Proxy server-side bảo mật credentials
- Medusa có validation và business logic
- Admin UI nên tách biệt với DB

**DB trực tiếp chỉ dùng cho:**
- Migration logs
- ID mapping
- App-specific metadata (không có trong Medusa schema)

### H3. API keys có bị ẩn khỏi menu?

**Không.** Route `/settings` có trong navigation và accessible với `products.read` permission.

### H4. WooCommerce credentials cần mã hóa?

**Có, nên làm trong P10.2.** Consumer Key/Secret không được mã hóa hiện tại. Khuyến nghị dùng cùng cơ chế encryption với Medusa secrets (P5.4).

---

## I. Recommendation Summary

| # | Hành động | Ưu tiên |
|---|-----------|---------|
| 1 | Fix `/products` empty state — thêm banner "Chưa kết nối Medusa" | P0 — immediate |
| 2 | Mã hóa WooCommerce Consumer Key/Secret | P1 |
| 3 | Tạo `migration_logs` DB table | P1 |
| 4 | Tạo `id_mapping` DB table | P2 |
| 5 | Thêm "Test Connection" button | P2 |
| 6 | Cải thiện Product detail/edit page | P3 |
| 7 | Thêm stock management UI | P3 |
