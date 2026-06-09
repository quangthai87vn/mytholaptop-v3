# P10.3 — App Settings CSRF Fix + UI Redesign Report

**Ngày:** 28/05/2026  
**Trạng thái:** ✅ Hoàn thành  
**TypeScript:** ✅ Pass  
**Next.js Build:** ✅ Pass  

---

## Tóm tắt điều hành

| Hành động | Kết quả |
|-----------|---------|
| Fix CSRF — `/settings/app` dùng `adminFetch` | ✅ |
| Fix CSRF — `/api/auth/token` thêm CSRF check | ✅ |
| Fix CSRF — Test connection routes thêm CSRF check | ✅ |
| Redesign UI — per-tab save buttons thay vì 1 nút chung | ✅ |
| Card trạng thái kết nối ở đầu Medusa/WooCommerce tabs | ✅ |
| URL param `?tab=medusa` để deep-link tab | ✅ |
| Error handler với mã lỗi rõ ràng | ✅ |
| TypeScript + Build | ✅ Pass |

---

## A. Root Cause — CSRF Issue

### Nguyên nhân gốc

P10.2 tạo `/settings/app` dùng `fetch()` thường:

```typescript
// ❌ LỖI — không gửi CSRF token
const res = await fetch("/api/settings", {
  method: "POST",
  body: JSON.stringify(settings),
});

// ✅ ĐÚNG — adminFetch tự gắn X-CSRF-Token header
const res = await adminFetch("/api/settings", {
  method: "POST",
  body: JSON.stringify(settings),
});
```

`adminFetch()` đọc `csrf_token` cookie và gắn `X-CSRF-Token` header cho POST requests.

### CSRF Architecture

```
Browser                           Server
  │
  │ POST /api/settings           requireCsrf()
  │   X-CSRF-Token: <token>    validateCsrfToken()
  │   Cookie: csrf_token=...   cookie === header → OK
  │
  │ POST /api/settings          requireCsrf()
  │   (không có token)          → 403 CSRF_INVALID
  │                             "Yêu cầu không hợp lệ (CSRF)"
```

### Tất cả endpoints đã fix

| Route | Method | CSRF Fix |
|-------|--------|----------|
| `/api/settings` | POST | ✅ Đã có CSRF check |
| `/api/auth/token` | POST | ✅ **MỚI** thêm CSRF |
| `/api/settings/test-connection/medusa` | POST | ✅ **MỚI** thêm CSRF |
| `/api/settings/test-connection/woocommerce` | POST | ✅ **MỚI** thêm CSRF |

---

## B. UI Redesign — `/settings/app`

### Trước P10.3

- Một nút "Lưu thay đổi" ở header — gây nhầm lẫn
- Không có card trạng thái kết nối
- Tất cả 3 tabs dùng cùng 1 save handler
- Không phân biệt lỗi CSRF / quyền / validation

### Sau P10.3

**Layout:**
```
┌─ Page header ─────────────────────────────────────┐
│ Cấu hình ứng dụng                              │
│ Kết nối Medusa, WooCommerce...                  │
└─────────────────────────────────────────────────┘
┌─ Tabs ──────────────────────────────────────────┐
│ [Công ty] [Medusa] [WooCommerce] [Migration]   │
└─────────────────────────────────────────────────┘
┌─ Tab content ───────────────────────────────────┐
│ (card với nút save riêng)                      │
└─────────────────────────────────────────────────┘
```

**Per-tab save:**
- Tab Công ty → nút **"Lưu Công ty"**
- Tab Medusa → nút **"Lưu Medusa"**
- Tab WooCommerce → nút **"Lưu WooCommerce"**

**Card trạng thái kết nối:**

```
┌─────────────────────────────────────────────────┐
│ 🔴 Lỗi kết nối Medusa                        │
│ Token JWT không hợp lệ. Vui lòng kiểm tra...   │
│                        [Thử lại]                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🟢 Đã kết nối Medusa                         │
│ Kết nối thành công qua JWT Token (50+ sản phẩm)│
│                        [Quản lý sản phẩm →]   │
└─────────────────────────────────────────────────┘
```

**Error handling rõ ràng:**
```typescript
async function handleSaveError(res: Response, fallback: string): Promise<string> {
  const code = data.code as string | undefined;
  if (code === "CSRF_INVALID") return "CSRF token hết hạn. Trang sẽ được tải lại.";
  if (code === "FORBIDDEN") return "Bạn không có quyền lưu cấu hình này.";
  return data.error || fallback;
}
```

---

## C. Security

| Điểm | Trạng thái |
|-------|-----------|
| `adminFetch()` gửi CSRF token cho tất cả write requests | ✅ |
| CSRF check trên tất cả POST endpoints | ✅ |
| WooCommerce credentials mã hóa AES-256 (P10.2) | ✅ |
| Medusa credentials đã mã hóa (P5.4) | ✅ |
| `settings.manage` permission trên settings POST | ✅ |
| CSRF token tự refresh (sameSite=lax, maxAge=7d) | ✅ |

---

## D. Product Connection Flow

### Flow đúng sau khi lưu Medusa config

```
1. Admin vào /settings/app?tab=medusa
2. Nhập Backend URL + JWT Token
3. Bấm "Kiểm tra kết nối" → card hiện 🟢 Đã kết nối
4. Bấm "Lưu Medusa" → adminFetch() → CSRF token auto
5. Toast: "Đã lưu cấu hình Medusa!"
6. Vào /products
7. useMedusaConfigured() → getMedusaSettings() → credentials đã có trong DB
8. useProducts.enabled = true → query chạy → sản phẩm hiển thị
```

### `/products` banner link tới tab đúng

```typescript
<Button asChild>
  <Link href="/settings/app?tab=medusa">
    Cấu hình ứng dụng
  </Link>
</Button>
```

---

## E. Files Modified

| File | Thay đổi |
|------|-----------|
| `app/(admin)/settings/app/page.tsx` | Viết lại hoàn toàn — adminFetch, per-tab saves, card trạng thái, URL tab param |
| `app/api/auth/token/route.ts` | Thêm `requireCsrf()` |
| `app/api/settings/test-connection/medusa/route.ts` | Thêm `requireCsrf()` |
| `app/api/settings/test-connection/woocommerce/route.ts` | Thêm `requireCsrf()` |

---

## F. Test Cases

| # | Test | Kết quả |
|---|------|---------|
| 1 | Lấy JWT Token Medusa thành công | ✅ |
| 2 | Lưu Medusa — không còn lỗi CSRF | ✅ |
| 3 | Reload trang — config đã lưu vẫn hiển thị (masked) | ✅ |
| 4 | Test connection sau reload — badge hiện đúng | ✅ |
| 5 | `/products` sau khi lưu Medusa config — load sản phẩm | ✅ |
| 6 | Banner /products → `/settings/app?tab=medusa` | ✅ |
| 7 | Phân biệt lỗi CSRF / FORBIDDEN / validation | ✅ |
| 8 | TypeScript pass | ✅ |
| 9 | Next.js build pass | ✅ |

---

## G. Next Steps (P10.4)

1. **Product Detail/Edit page** — inline edit từ Medusa API
2. **Stock management UI** — inventory levels từ Medusa Inventory Module
3. **Tạo `migration_logs` DB table** — thay localStorage
4. **Tạo `id_mapping` DB table** — WooCommerce → Medusa mapping
5. **Fix `/products/categories`, `/products/tags` empty state** — cùng pattern banner
6. **Add "Product Sync" button** trên `/products` toolbar — sync từ WooCommerce
