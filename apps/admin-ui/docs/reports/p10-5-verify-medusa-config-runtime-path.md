# P10.5: Verify Medusa Config Runtime Path

**Trạng thái:** Hoàn thành
**Ngày:** 28/05/2026
**File báo cáo:** `docs/reports/p10-5-verify-medusa-config-runtime-path.md`

---

## Tóm tắt

Sau P10.4, `/products` vẫn báo "Chưa kết nối Medusa" dù `/settings/app` test connection thành công. Đã trace toàn bộ code path và tìm ra root cause.

---

## Root Cause Chi tiết

### Lỗi 1: `getMedusaSettings()` gọi GET `/api/settings`

**Trước P10.5:**
```
useMedusaConfigured()
  → getMedusaSettings()
    → loadApiSettings()
      → loadSettings()
        → fetch("/api/settings")  ← GET trả __ENCRYPTED__
  → return false (sentinel === null)
  → /products báo "Chưa kết nối"
```

**Sau P10.4 fix:**
- GET `/api/settings` trả `adminApiKey = "__ENCRYPTED__"` khi có token trong DB
- Frontend nhận diện sentinel → không overwrite state
- Nhưng `getMedusaSettings()` vẫn gọi `loadApiSettings()` → gọi API → nhận `__ENCRYPTED__` → return `null`

**Root cause thật sự:**
`getMedusaSettings()` là **server-side function** nhưng được gọi từ client hooks (`use-medusa.ts` — `"use client"`). Nó gọi `loadApiSettings()` → `fetch("/api/settings")` → GET trả `__ENCRYPTED__`. Đây là VERCEL-LEVEL bug: server function gọi client API route.

### Lỗi 2: Build fail — `pg` module leak

Khi thử fix bằng cách gọi `getAppSetting()` trực tiếp từ client:

```
"@/services/medusa-settings" → "@/lib/content/db/app-settings" → "@/lib/db" → "pg"
pg is a Node.js-only module — CANNOT be bundled for browser
```

Fix: `useMedusaConfigured()` phải gọi **fetch API endpoint** (`/api/medusa/status`), không gọi server function trực tiếp.

---

## Trace Code Path Đầy Đủ

### Write path (đúng rồi sau P10.4)

```
/settings/app handleSaveMedusa()
  → adminFetch POST /api/settings
    → POST handler merge với existing DB
      → saveAppSetting("medusa", merged)
        → INSERT ON CONFLICT UPDATE app_settings
  → DB: { backendUrl, adminApiKey: "eyJ...", adminEmail }
```

### Read path (sai trước P10.5)

```
/products page mount
  → useMedusaConfigured()
    → fetch("/api/medusa/status")  ← MỚI: server-side endpoint
      → getAppSetting("medusa")    ← trực tiếp từ DB
        → return { backendUrl, adminApiKey: "eyJ..." }
      → configured = true
    → enabled = true
  → useProducts() chạy
    → listProducts({ backendUrl: "", adminApiKey: "" })
      → medusaRequest("/admin/products", config)
        → fetch("/api/medusa/admin/products?backendUrl=...")
          → proxyRequest() → loadServerCredentials() → DB medusa
            → authToken = "eyJ..." (JWT từ DB)
          → fetch Medusa backend
          → return products
```

---

## Các Thay đổi

### 1. `getMedusaSettings()` — đọc trực tiếp từ DB

**File:** `services/medusa-settings.ts`

```typescript
// KHÔNG còn gọi loadApiSettings() nữa
import { getAppSetting } from "@/lib/content/db/app-settings";

export async function getMedusaSettings(): Promise<MedusaSettings | null> {
  try {
    const medusa = await getAppSetting("medusa");
    if (!medusa) return null;
    const m = medusa as Record<string, unknown>;
    const backendUrl = (m.backendUrl as string) || "";
    if (!backendUrl) return null;
    const adminApiKey = (m.adminApiKey as string) || "";
    if (!adminApiKey || adminApiKey === "__ENCRYPTED__") return null;
    return { backendUrl, adminApiKey };
  } catch {
    return null;
  }
}
```

**Lưu ý:** Chỉ dùng trong API routes server-side (`/api/medusa/status`), không gọi từ client hooks.

### 2. `/api/medusa/status` endpoint

**File:** `app/api/medusa/status/route.ts`

Server-side endpoint đọc trực tiếp từ DB, test connection Medusa, trả status rõ ràng:

```typescript
// GET /api/medusa/status
// Response:
{
  configured: boolean,  // DB có backendUrl + token
  connected: boolean,    // Medusa backend thật sự accessible
  productCount: number,
  error?: string        // Lỗi cụ thể
}
```

### 3. `useMedusaConfigured()` — gọi API endpoint

**File:** `hooks/use-medusa.ts`

```typescript
export function useMedusaConfigured() {
  return useQuery({
    queryKey: QUERY_KEYS.configured(),
    queryFn: async () => {
      const res = await fetch("/api/medusa/status");
      if (!res.ok) return false;
      const data = await res.json() as { configured?: boolean };
      return !!(data?.configured);
    },
    staleTime: 1000 * 60,
  });
}
```

**Điểm mấu chốt:** Chỉ gọi `fetch()` — browser-safe, không import server modules. Đây là cách duy nhất để client hooks kiểm tra config mà không bị `pg` leak.

### 4. Data hooks dùng `medusaRequest()` — pass empty config

**File:** `hooks/use-medusa.ts`

```typescript
export function useProducts(filter?: ProductFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.products(filter),
    queryFn: async () => {
      const result = await listProducts(
        { backendUrl: "", adminApiKey: "" },  // ← empty, proxy tự lấy từ DB
        filter
      );
      if (!result.success) throw new Error(result.error);
      return result;  // ← return full MedusaApiResponse (backward compatible)
    },
    enabled: !!configured,
  });
}
```

Proxy `/api/medusa/[...slug]` nhận empty `backendUrl` từ query param, nhưng **không dùng** nó — tự load credentials từ DB. `adminApiKey` KHÔNG được gửi qua URL (bảo mật P4.2).

---

## Danh sách file đã sửa

| File | Thay đổi |
|------|---------|
| `services/medusa-settings.ts` | Đọc trực tiếp từ DB, không qua `/api/settings` |
| `app/api/medusa/status/route.ts` | **MỚI** — server-side status endpoint |
| `hooks/use-medusa.ts` | `useMedusaConfigured()` gọi `/api/medusa/status` |

---

## Kiến trúc Đúng

```
┌─────────────────────────────────────────────────────────────┐
│ Client Browser                                              │
│                                                             │
│  useMedusaConfigured()                                      │
│    → fetch("/api/medusa/status")  ✓ browser-safe            │
│    → return configured: true/false                          │
│                                                             │
│  useProducts()                                               │
│    → medusaRequest("/admin/products", { backendUrl:"", adminApiKey:"" }) │
│      → fetch("/api/medusa/admin/products?backendUrl=")       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ API Routes (Server)                                         │
│                                                             │
│  GET /api/medusa/status                                     │
│    → getAppSetting("medusa")  ✓ server-only, đọc DB         │
│    → test Medusa connection                                │
│    → return { configured, connected, productCount, error }     │
│                                                             │
│  GET /api/medusa/[...slug]                                  │
│    → loadServerCredentials()                                │
│      → getAppSetting("medusa")  ✓ server-only              │
│      → jwtToken = "eyJ..." (từ DB)                         │
│    → fetch Medusa backend với JWT                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                         │
│                                                             │
│  app_settings WHERE key = 'medusa'                          │
│    { backendUrl, adminApiKey: "eyJ...", adminEmail }        │
└─────────────────────────────────────────────────────────────┘
```

**Nguyên tắc:**
1. Client hooks CHỈ gọi `fetch()` → API routes
2. API routes server-side đọc DB trực tiếp
3. Credentials không bao giờ gửi từ client → server (trừ `/api/medusa/status` không cần credentials)
4. Proxy `/api/medusa/[...slug]` tự load credentials từ DB

---

## Kết quả kiểm tra

| Test | Kết quả |
|------|---------|
| TypeScript `tsc --noEmit` | Pass |
| Next.js `next build` | Pass |
| `GET /api/medusa/status` khi chưa config | `{ configured: false }` |
| `GET /api/medusa/status` khi đã config | `{ configured: true, connected: true, productCount: N }` |
| `/products` khi configured | Hiển thị sản phẩm |
| `/products` khi chưa config | Banner "Chưa kết nối Medusa" |

---

## Luồng runtime sau fix

### 1. User lưu Medusa config
```
/settings/app → Lấy Token → nhập email/password
  → POST /api/auth/token → JWT token
  → state.adminApiKey = "eyJ..."
  → Lưu Medusa → POST /api/settings
    → Backend merge với DB → save
    → DB: { backendUrl, adminApiKey: "eyJ...", adminEmail }
  → toast "Đã lưu cấu hình Medusa!"
```

### 2. User vào /products
```
/products mount
  → useMedusaConfigured()
    → GET /api/medusa/status
      → Server: getAppSetting("medusa") → { backendUrl, adminApiKey: "eyJ..." }
      → Test Medusa: fetch /admin/products với JWT → 200 OK
      → return { configured: true, connected: true, productCount: 1942 }
    → configured = true
  → useProducts.enabled = true
  → listProducts() → /api/medusa/admin/products
    → Proxy: loadServerCredentials() → JWT từ DB
    → Gọi Medusa backend → 200 OK → return 1942 sản phẩm
  → UI: Hiển thị product grid/list
```

### 3. Token hết hạn
```
/api/medusa/status
  → Test Medusa → 401 Unauthorized
  → return { configured: true, connected: false, error: "Token Medusa hết hạn..." }
/products
  → isConfigured = true → vẫn gọi Medusa
  → Proxy → 401 → clear token cache
  → Error displayed in UI
```

---

## Lưu ý quan trọng

- **`medusa-settings.ts`** giờ là pure server-side module — chỉ dùng trong API routes
- **`use-medusa.ts`** chỉ dùng `fetch()` và `medusaRequest()` — browser-safe
- **`pg` module không bị leak** vào client bundle
- **Backward compatible** — data hooks vẫn trả `MedusaApiResponse<T>` như cũ
- **Proxy không dùng** `backendUrl` từ query param — tự load từ DB
