# P10.2 — App Integration Settings + Product Connection Fix Report

**Ngày:** 28/05/2026  
**Trạng thái:** ✅ Hoàn thành  
**TypeScript:** ✅ Pass  
**Next.js Build:** ✅ Pass  

---

## Tóm tắt điều hành

| Hành động | Kết quả |
|-----------|---------|
| `/settings/app` page mới với 4 tabs | ✅ Tạo thành công |
| Redirect `/settings` → `/settings/app` | ✅ |
| Navigation cập nhật — "Cấu hình ứng dụng" | ✅ |
| Test Connection Medusa API | ✅ Tạo `POST /api/settings/test-connection/medusa` |
| Test Connection WooCommerce API | ✅ Tạo `POST /api/settings/test-connection/woocommerce` |
| WooCommerce credentials mã hóa AES-256 | ✅ |
| `/products` empty state fix | ✅ Banner "Chưa kết nối Medusa" |
| TypeScript + Build | ✅ Pass |

---

## A. Settings Menu — Navigation Update

**File:** `lib/navigation.ts`

Thêm "Cấu hình ứng dụng" vào menu Cài đặt:

```typescript
{
  title: "Cài đặt",
  href: "/settings/app",        // ← đổi từ "/settings"
  icon: Settings,
  children: [
    {
      title: "Cấu hình ứng dụng",  // ← MỚI
      href: "/settings/app",
      icon: Settings,
    },
    {
      title: "AI Engine",
      href: "/settings/ai",
      icon: Brain,
      requiredPermission: "ai_engine.manage",
    },
    {
      title: "Người dùng",
      href: "/settings/users",
      icon: UsersIcon,
      requiredPermission: "users.read",
    },
  ],
},
```

Thêm redirect trong `ROUTE_REDIRECTS`:

```typescript
"/settings": "/settings/app",
```

**Redirect:** `/settings` (file `app/(admin)/settings/page.tsx`) redirect sang `/settings/app`.

---

## B. `/settings/app` Page

**File:** `app/(admin)/settings/app/page.tsx`

Page mới với 4 tabs:

| Tab | Nội dung |
|-----|----------|
| **Công ty** | Tên, website, phone, logo, address |
| **Medusa** | Backend URL, Email, Password, JWT Token + Test Connection |
| **WooCommerce** | WordPress URL, Consumer Key, Consumer Secret + Test Connection |
| **Migration** | Số sản phẩm/danh mục đã map, link tới Migration page |

**Tính năng:**
- **Lưu cấu hình** — Lưu 3 section (company, medusa, wooCommerce) qua `POST /api/settings`
- **Lấy JWT Token** — Gọi `/api/auth/token` với Email + Password → tự điền JWT
- **Test Connection Medusa** — Gọi `/api/settings/test-connection/medusa` → hiển thị badge "Đã kết nối" / "Lỗi kết nối"
- **Test Connection WooCommerce** — Gọi `/api/settings/test-connection/woocommerce` → hiển thị badge
- **Migration tab** — Hiển thị số sản phẩm/danh mục đã map (từ localStorage)
- **Eye toggle** — Hiển thị/ẩn password và secret

---

## C. Test Connection API Routes

### `POST /api/settings/test-connection/medusa`

**File:** `app/api/settings/test-connection/medusa/route.ts`

Logic:
1. Nhận `{ backendUrl, adminApiKey, adminEmail, adminPassword }`
2. Ưu tiên thử JWT Token trước: `GET /admin/products?limit=1`
3. Nếu JWT thất bại với 401 → thử Email/Password qua các auth endpoints
4. Trả về `{ connected: boolean, message: string, details?: { productCount, version } }`

### `POST /api/settings/test-connection/woocommerce`

**File:** `app/api/settings/test-connection/woocommerce/route.ts`

Logic:
1. Nhận `{ wordpressUrl, consumerKey, consumerSecret }`
2. Dùng Basic Auth với Consumer Key/Secret
3. Thử 3 endpoints: `/system_status`, `/products?per_page=1`, `/`
4. Trả về `{ connected: boolean, message: string, details?: { version, productCount } }`

**Bảo mật:** Cả hai route đều yêu cầu `requireAdminAuth` + `settings.manage` permission.

---

## D. WooCommerce Credentials Encryption

**File:** `app/api/settings/route.ts`

### Trước P10.2
```
WooCommerce consumerKey = "ck_xxx..."     ← plain text trong DB
WooCommerce consumerSecret = "cs_xxx..." ← plain text trong DB
```

### Sau P10.2
```
WooCommerce {
  consumerKey: "base64(AES-256-GCM encrypted)",
  _consumerKey_iv: "hex IV",
  consumerSecret: "base64(AES-256-GCM encrypted)",
  _consumerSecret_iv: "hex IV",
  wordpressUrl: "https://..."            ← plain text (không secret)
}
```

### Mã hóa (khi lưu)
```typescript
// POST /api/settings → encryptWooCredentials()
const { encrypted, iv } = encrypt(consumerKey);
result.consumerKey = encrypted;
result._consumerKey_iv = iv;
```

### Giải mã (khi đọc)
```typescript
// GET /api/settings → decryptWooCredentials()
// Thử giải mã trước, fallback sang plain text (legacy)
```

**Thuật toán:** AES-256-GCM (cùng cơ chế với Medusa credentials — P5.4)

---

## E. `/products` Empty State Fix

**File:** `app/(admin)/products/page.tsx`

### Logic phân biệt 3 trạng thái

```typescript
const { data: isConfigured } = useMedusaConfigured();

// 1. Chưa cấu hình Medusa → hiện banner xanh
{isConfigured === false && (
  <Card className="border-blue-200 bg-blue-50">
    <p>Chưa kết nối Medusa</p>
    <Button asChild><Link href="/settings/app">Cấu hình ứng dụng</Link></Button>
  </Card>
)}

// 2. Loading
{isLoading && <Skeleton />}

// 3. Lỗi kết nối
{isError && <AlertCard />}

// 4. Trống: phân biệt rõ
{filteredProducts.length === 0 && (
  isConfigured === true ? (
    // Medusa đã kết nối nhưng không có sản phẩm
    <EmptyState withAddButton />
  ) : (
    // Không có kết nối (isConfigured === undefined — đang loading)
    <EmptyState noProducts />
  )
)}
```

### Trước P10.2
- `/products` → `isLoading = true` → Loading skeleton
- `isConfigured === null` → `useProducts.enabled = false` → Không hiển thị gì
- → Hiển thị "Không tìm thấy sản phẩm" gây hiểu lầm

### Sau P10.2
- Nếu Medusa chưa cấu hình → Banner xanh rõ ràng "Chưa kết nối Medusa"
- Có nút "Cấu hình ứng dụng" → vào settings ngay
- Nếu Medusa đã cấu hình nhưng không có sản phẩm → "Chưa có sản phẩm trong Medusa" + nút Migration

---

## F. Security Summary

| Điểm | Trạng thái |
|-------|-----------|
| WooCommerce credentials mã hóa AES-256 | ✅ |
| Medusa credentials đã mã hóa (P5.4) | ✅ |
| `/api/settings` GET trả masked credentials | ✅ |
| Test Connection yêu cầu auth + permission | ✅ |
| Encryption key từ `CONTENT_ENCRYPTION_KEY` env | ✅ |
| JWT secrets không gửi qua URL params | ✅ |
| CSRF protection trên settings POST | ✅ |

---

## G. Files Created / Modified

### Tạo mới

| File | Mô tả |
|------|--------|
| `app/(admin)/settings/app/page.tsx` | Settings page mới với 4 tabs |
| `app/api/settings/test-connection/medusa/route.ts` | Test Medusa connection API |
| `app/api/settings/test-connection/woocommerce/route.ts` | Test WooCommerce connection API |

### Sửa

| File | Thay đổi |
|------|-----------|
| `app/(admin)/settings/page.tsx` | Chuyển thành redirect → `/settings/app` |
| `app/api/settings/route.ts` | Thêm `encryptWooCredentials()`, `decryptWooCredentials()`, hỗ trợ legacy plain text |
| `app/(admin)/products/page.tsx` | Thêm banner "Chưa kết nối Medusa", phân biệt empty state |
| `lib/navigation.ts` | Thêm "Cấu hình ứng dụng" vào menu Cài đặt + redirect `/settings` |

---

## H. Test Cases

| # | Test | Kết quả |
|---|------|---------|
| 1 | Menu Settings hiện "Cấu hình ứng dụng" | ✅ |
| 2 | `/settings` redirect sang `/settings/app` | ✅ |
| 3 | Lưu Medusa config (Backend URL + JWT) | ✅ |
| 4 | Test Connection Medusa → hiện badge | ✅ |
| 5 | Lưu WooCommerce config (Consumer Key/Secret) | ✅ |
| 6 | Test Connection WooCommerce → hiện badge | ✅ |
| 7 | `/products` chưa cấu hình Medusa → banner xanh | ✅ |
| 8 | `/products` đã cấu hình + không có sản phẩm → text rõ | ✅ |
| 9 | Encryption: credentials đã mã hóa trong DB | ✅ |
| 10 | TypeScript pass | ✅ |
| 11 | Next.js build pass | ✅ |

---

## I. Next Steps (P10.3)

1. **Fix empty state trên `/products/categories`, `/products/tags`** — same pattern
2. **Thêm "Product Detail" page** — edit sản phẩm trực tiếp từ Medusa API
3. **Thêm stock management UI** — hiển thị inventory levels từ Medusa Inventory Module
4. **Tạo migration_logs DB table** — thay localStorage
5. **Tạo id_mapping DB table** — WooCommerce → Medusa ID mapping
6. **Fix `/products` layout guard** — `app/(admin)/products/layout.tsx` check permission
7. **Cải thiện `/products/sync` page** — sync status từ DB thay vì localStorage
