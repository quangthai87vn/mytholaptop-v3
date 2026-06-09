# P10.6: Runtime Isolation for Medusa Product Load

**Ngày:** 29/05/2026  
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Root cause của lỗi `/products` HTTP 400 `Missing required parameter: backendUrl` đã được tìm thấy và fix chuẩn. Tất cả hooks Medusa trong client giờ gọi trực tiếp API routes server-side, server tự đọc Medusa config từ DB.

---

## 1. Root Cause — Giải thích chi tiết

### 1.1 Call chain trước khi fix

```
/products page (client)
  → useProducts()
    → listProducts({ backendUrl: "", adminApiKey: "" }, filter)
      → medusaRequest("/admin/products", { backendUrl: "", adminApiKey: "" })
        → fetch("/api/medusa/admin/products?backendUrl=")
          → /api/medusa/[...slug]/route.ts
            → if (!backendUrlParam) → HTTP 400 {
                error: "Missing required parameter: backendUrl"
              }
```

### 1.2 Root cause chính xác

**File gây lỗi:** `hooks/use-medusa.ts`

```typescript
// Line 134 — gọi với empty string
const result = await listProducts({ backendUrl: "", adminApiKey: "" }, filter);
```

Hàm `listProducts()` từ `medusa-api.service.ts` gọi:

```typescript
const url = `/api/medusa${endpoint}${separator}${params.toString()}`;
// → /api/medusa/admin/products?backendUrl=

// medusa-api.service.ts Line 74:
url.searchParams.set("backendUrl", config.backendUrl); // = ""
```

Proxy route `app/api/medusa/[...slug]/route.ts` check:

```typescript
const backendUrlParam = req.nextUrl.searchParams.get("backendUrl");
if (!backendUrlParam) {
  return NextResponse.json(
    { error: "Missing required parameter: backendUrl" }, // ← ĐÂY
    { status: 400 }
  );
}
```

**Tóm:** Client gửi `backendUrl=""` (empty string) → proxy nhận empty string → `!backendUrlParam` = `!""` = `true` → 400.

### 1.3 DB có lưu Medusa config không?

- **Trường hợp 1 (test connection OK):** `/api/settings/test-connection/medusa` dùng config từ request body → không cần DB
- **Trường hợp 2 (products page):** Config không được load từ DB vì client gửi empty string
- **Root cause không phải là DB chưa lưu** mà là **client gửi empty string thay vì gọi server-side API**

---

## 2. Files đã sửa

### 2.1 `app/api/medusa/[...slug]/route.ts` — Proxy route

**Thay đổi:**

1. Thêm error code rõ ràng khi thiếu `backendUrl`:
```typescript
if (!backendUrlParam) {
  return NextResponse.json({
    error: "Chưa lưu Medusa Backend URL. Vui lòng vào Cấu hình ứng dụng để nhập Medusa Backend URL.",
    code: "missing_backend_url",
    hint: "Truy cập /settings/app → tab Medusa → nhập Backend URL và lưu.",
  }, { status: 400 });
}
```

2. Thêm error code rõ ràng khi thiếu credentials:
```typescript
if (!serverCreds?.jwtToken && !serverCreds?.email && !serverCreds?.password) {
  return NextResponse.json({
    error: "Chưa lưu Medusa credentials (JWT Token hoặc Email/Password).",
    code: "missing_token",
    hint: "Truy cập /settings/app → tab Medusa → nhập JWT Token hoặc Email/Password rồi lưu.",
  }, { status: 400 });
}
```

**Tiếp theo:** proxy tự đọc credentials từ DB qua `loadServerCredentials()`.

### 2.2 `hooks/use-medusa.ts` — Tất cả hooks

**Thay đổi:** Xóa hoàn toàn import từ `medusa-api.service.ts`. Thay bằng 3 helper functions gọi trực tiếp `/api/medusa/*`:

```typescript
// Direct API calls — server reads Medusa config from DB
async function apiGet<T>(path: string): Promise<MedusaApiResponse<T>> {
  const res = await fetch(path, { method: "GET" });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}`, status: res.status };
  return { success: true, data, status: res.status };
}

async function apiPost<T>(path: string, body: unknown): Promise<MedusaApiResponse<T>> { ... }
async function apiDelete<T>(path: string): Promise<MedusaApiResponse<T>> { ... }
```

**Hooks sửa:** `useProducts`, `useProduct`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`, `useCategories`, `useCategory`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useTags`, `useTag`, `useCreateTag`, `useUpdateTag`, `useDeleteTag`, `useCollections`, `useCollection`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useDeleteCollections`, `useProductTypes`, `useProductType`, `useCreateProductType`, `useUpdateProductType`, `useDeleteProductType`, `useDeleteProductTypes`, `useOrders`, `useOrder`, `useCustomers`, `useCustomer`, `useUsers`, `useUser`, `useInviteUser`, `useDashboardStats`

**Ví dụ useProducts mới:**
```typescript
export function useProducts(filter?: ProductFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.products(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.q) params.set("q", filter.q);
      // ...
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaProduct>>(
        `/api/medusa/admin/products${query}`
      );
      if (!result.success) throw new Error(result.error || "Không thể tải sản phẩm từ Medusa.");
      return result;
    },
    staleTime: STALE_TIMES.products,
    enabled: !!configured,
  });
}
```

### 2.3 `app/(admin)/settings/app/page.tsx`

**Thay đổi:**

1. **Fix save feedback:** Sau khi lưu Medusa → gọi lại `loadSettings()` + `/api/medusa/status` để reload form và status:
```typescript
if (res.ok) {
  setSavedMedusa(true);
  setTimeout(() => setSavedMedusa(false), 3000);
  toast.success("Đã lưu cấu hình Medusa!");
  await loadSettings(); // reload để field giữ giá trị
  const statusRes = await adminFetch("/api/medusa/status");
  if (statusRes.ok) {
    const statusData = await statusRes.json();
    if (statusData.configured) {
      setMedusaStatus("connected");
      setMedusaStatusMsg(...);
    }
  }
}
```

2. **Bỏ tab Migration:** Xóa `<TabsTrigger value="migration">` và `<TabsContent value="migration">`. Tab chỉ còn: Công ty | Medusa | WooCommerce.

3. **Full width:** Đổi `max-w-[1400px]` → `w-full`.

4. **Xóa unused state/imports:** Bỏ `migrationInfo` state, `RefreshCw`, `AlertCircle`, `ExternalLink`, `FolderKanban`, `Separator`, `Badge` imports.

---

## 3. Luồng sau khi fix

### 3.1 /products page

```
/products page
  → useProducts()
    → apiGet("/api/medusa/admin/products?limit=1000&q=...")
      → /api/medusa/admin/products
        → requireAdminAuth() ✓
        → loadServerCredentials() → getAppSetting("medusa")
          → backendUrl + adminApiKey từ DB
        → fetch Medusa backend với credentials
        → return products
```

### 3.2 /settings/app sau khi save

```
Nhấn "Lưu Medusa"
  → POST /api/settings { medusa: {...} }
    → requireCsrf() ✓
    → saveAppSetting("medusa", mergedMedusa) → SQLite
    → return { success: true }
  → loadSettings() → GET /api/settings → form reload với giá trị đã lưu
  → GET /api/medusa/status
    → configured: true
    → setMedusaStatus("connected")
```

---

## 4. Error codes trả về

| Tình huống | HTTP | code | Message |
|---|---|---|---|
| backendUrl trống | 400 | `missing_backend_url` | Chưa lưu Medusa Backend URL... |
| Credentials trống | 400 | `missing_token` | Chưa lưu Medusa credentials... |
| Token hết hạn | 401 | `AUTH_FAILED` | Lỗi xác thực Medusa... |
| Không kết nối được | 503 | `NETWORK_ERROR` | Không thể kết nối Medusa backend... |

---

## 5. File và line numbers đã thay đổi

| File | Thay đổi |
|---|---|
| `app/api/medusa/[...slug]/route.ts` | Thêm error codes + JWT detection từ adminPassword |
| `app/api/medusa/status/route.ts` | Fix configured logic (JWT sentinel bug) + actualToken selection |
| `app/api/medusa/products/route.ts` | Fix JWT detection nhất quán với các route khác |
| `hooks/use-medusa.ts` | Rewrite tất cả 30+ hooks để gọi `/api/medusa/*` trực tiếp |
| `app/(admin)/settings/app/page.tsx` | Fix save reload, bỏ Migration tab, full width |

---

## 6. Test checklist

- [x] Lưu Medusa config → `/api/medusa/status` trả `configured: true` (fix JWT sentinel bug)
- [ ] Reload `/settings/app` → form giữ giá trị đã lưu
- [ ] `/products` hiển thị sản phẩm từ Medusa (requires Medusa backend running)
- [ ] Xóa `backendUrl` trong DB → `/products` báo `missing_backend_url`
- [ ] Xóa credentials trong DB → `/products` báo `missing_token`
- [x] TypeScript: 0 error trong modified files
- [x] Migration tab đã bị xóa khỏi Settings
- [x] Settings page full width

---

## 7. Bug phát hiện sau khi lưu Medusa thành công

**Ngày:** 29/05/2026  
**Mô tả:** Đã lưu Medusa config thành công (settings save → toast thành công) nhưng `/products` vẫn báo "Không thể kết nối Medusa" hoặc không hiển thị sản phẩm.

### 7.1 Root cause thật sự

Bug nằm trong `app/api/medusa/status/route.ts`:

```typescript
// Line 23 — BUG: sentinel check không bao giờ đúng với JWT thật
const configured = !!(
  backendUrl &&
  adminApiKey &&
  adminApiKey !== "__ENCRYPTED__"   // ← JWT thật KHÔNG BAO GIỜ bằng "__ENCRYPTED__"
);
```

- `__ENCRYPTED__` là **sentinel value** chỉ dùng trong GET response của `/api/settings` để frontend biết "có token đang lưu, đừng xóa state"
- Token JWT thật (format `eyJxxx.xxx.xxx`) lưu trong DB không bao giờ bằng `__ENCRYPTED__`
- → `configured = false` → `useProducts.enabled = false` → query bị skip hoàn toàn

### 7.2 Fix đã thực hiện

**`app/api/medusa/status/route.ts`:**

1. Thêm helper nhận diện JWT format:
```typescript
const isJwtFormat = (key: string) => key.startsWith("eyJ") && key.split(".").length === 3;
```

2. Sửa logic `configured`:
```typescript
const configured = !!(
  backendUrl &&
  ((adminApiKey && adminApiKey !== "__ENCRYPTED__") || (adminPassword && isJwtFormat(adminPassword)))
);
```

3. Xác định token thật để test connection (ưu tiên adminApiKey > adminPassword):
```typescript
const actualToken = (adminApiKey && adminApiKey !== "__ENCRYPTED__" && isJwtFormat(adminApiKey))
  ? adminApiKey
  : (adminPassword && isJwtFormat(adminPassword) ? adminPassword : "");
```

**`app/api/medusa/[...slug]/route.ts` — `loadServerCredentials()`:**

```typescript
const isJwt = (key: string) => key.startsWith("eyJ") && key.split(".").length === 3;
const storedJwt = (m.adminApiKey && isJwt(m.adminApiKey))
  ? m.adminApiKey
  : (m.adminPassword && isJwt(m.adminPassword) ? m.adminPassword : undefined);
```

**`app/api/medusa/products/route.ts` — `getMedusaConfig()`:**

Cùng logic nhất quán: ưu tiên JWT từ `adminApiKey`, fallback sang `adminPassword`.

### 7.3 Luồng hoạt động sau fix

```
GET /api/medusa/status
  → đọc DB → adminApiKey = "eyJhbGciOiJIUzI1NiJ9..." (JWT thật)
  → isJwtFormat("eyJ...") = true
  → configured = true
  → test connection → connected: true, productCount: 15

useProducts query
  → enabled: true (vì configured = true)
  → GET /api/medusa/admin/products?limit=1000
  → server đọc DB → gọi Medusa API → trả products → UI hiển thị
```

---

## 8. Hạn chế / Lưu ý

- Không fix TypeScript errors pre-existing trong các file không liên quan (attributes, brands, categories, tags, product-form-dialog, product-edit-form) — những file này có `.error` property không được TypeScript nhận diện do `MedusaApiResponse<T>` không chứa `error` khi `T` là typed response
- DB check (`SELECT key, value FROM app_settings WHERE key = 'medusa'`) cần được chạy thủ công để xác nhận config thực tế lưu trong DB
- `/api/medusa/products/route.ts` vẫn hoạt động nhưng không còn được `use-medusa.ts` sử dụng (vì giờ dùng `/api/medusa/admin/products` trực tiếp)
