# PRODUCT_DATA_SOURCE_RULES.md

## Overview

The Admin UI supports two product data sources:
1. **Medusa Backend** — via Medusa Admin API
2. **WooCommerce API** — direct REST API integration

Only one source can be active at a time. The active source is stored in the `app_settings` PostgreSQL table under the key `product_data_source`.

---

## Data Source Selection

### Storage

| Key | Value |
|-----|-------|
| `product_data_source` | `"woocommerce"` (default) or `"medusa"` |

Stored in `app_settings` table:
```sql
INSERT INTO app_settings (key, value) VALUES ('product_data_source', '{"source":"woocommerce"}');
```

### API Endpoint

**GET /api/settings** returns `product_data_source`:
```json
{
  "product_data_source": "woocommerce"
}
```

**POST /api/settings** saves `product_data_source`:
```json
{
  "product_data_source": { "source": "medusa" }
}
```

---

## Source Behavior

### Medusa Mode

- Products loaded from `/api/medusa/admin/products` proxy
- Categories loaded from `/api/medusa/admin/product-categories` proxy
- Tags loaded from `/api/medusa/admin/product-tags` proxy
- Collections (brands) loaded from `/api/medusa/admin/collections` proxy
- Proxy loads JWT token from `app_settings.medusa` in PostgreSQL
- Credentials: `backendUrl`, `adminApiKey`, `adminEmail`, `adminPassword`
- Supports full CRUD (create, edit, delete products)
- "Thêm sản phẩm" button visible
- Category tree built from Medusa categories API
- Product status: draft, proposed, published, rejected, archived
- Stock status: derived from variant inventory_quantity

### WooCommerce Mode

- Products loaded from `/api/woo/products?per_page=100` proxy using pagination loop (fetches ALL products, not just first 100)
- Categories loaded from `/api/woo/products/categories` proxy
- Tags loaded from `/api/woo/products/tags` proxy
- Brands/Collections: read-only display (from Medusa, only in Medusa mode)
- Proxy loads credentials from `app_settings.wooCommerce` in PostgreSQL
- Credentials: `wordpressUrl`, `consumerKey` (AES-256 encrypted), `consumerSecret` (AES-256 encrypted)
- Read-only display — no CRUD (products managed in WooCommerce)
- "Thêm sản phẩm" button hidden
- Category tree built from WooCommerce categories API
- Product status: publish (Hoạt động), draft (Bản nháp), pending (Chờ duyệt), private (Riêng tư)
- Stock status: instock (Còn hàng), outofstock (Hết hàng), onbackorder (Đang chờ hàng)
- Sorting: client-side on full product list (WooCommerce API pagination loop fetches all products first)

---

## API Endpoint Routing

### /products

- **WooCommerce**: fetches ALL products via pagination loop from `/api/woo/products` (page=1, per_page=100 loop until last page), then applies client-side sorting/filtering
- **Medusa**: fetches from `/api/medusa/admin/products`
- Categories (for filter): `/api/woo/products/categories` or `/api/medusa/admin/product-categories`
- Uses source-aware `adaptWooProduct` or `adaptProduct` for data normalization

### /products/categories

- **WooCommerce**: fetches from `/api/woo/products/categories?per_page=100&hide_empty=true`
- **Medusa**: fetches from `/api/medusa/admin/product-categories`
- Error messages are source-aware: "Không thể kết nối WooCommerce" vs "Không thể kết nối Medusa"
- Inactive count shows 0 for WooCommerce (no is_active concept in WC)

### /products/tags

- **WooCommerce**: fetches from `/api/woo/products/tags?per_page=100`
- **Medusa**: fetches from `/api/medusa/admin/product-tags`
- Create/Edit/Delete buttons hidden in WooCommerce mode
- Stats: synced = total (all WC tags are "synced"), manual = 0

### /products/brands

- **WooCommerce**: collections are read-only, link to settings
- **Medusa**: fetches from `/api/medusa/admin/collections`
- Create/Edit/Delete available in Medusa mode only

---

## Credentials Independence

Credentials for both sources are stored independently and never overwritten:
- Saving WooCommerce credentials does NOT clear Medusa credentials
- Saving Medusa credentials does NOT clear WooCommerce credentials
- Switching active source does NOT delete stored credentials

---

## Security

### WooCommerce
- `consumerKey` and `consumerSecret` encrypted with AES-256 before storing
- Encryption key loaded from `ENCRYPTION_KEY` environment variable
- Decryption happens server-side only in `/api/woo/[...slug]/route.ts`

### Medusa
- JWT token stored as-is (opaque token, no encryption needed)
- `adminPassword` stored for on-demand re-authentication

---

## Files

| File | Purpose |
|------|---------|
| `app/api/settings/route.ts` | GET/POST `product_data_source` setting |
| `app/api/medusa/[...slug]/route.ts` | Medusa API proxy (server-side auth) |
| `app/api/woo/[...slug]/route.ts` | WooCommerce API proxy (server-side auth, decryption, supports GET/POST/PUT) |
| `hooks/use-medusa.ts` | `useProductDataSource()`, `useWooCommerceProductsAll()`, `useWooCommerceProducts()`, `useWooCommerceCategories()`, `useWooCommerceTags()`, `useUpdateWooCommerceProduct()` |
| `lib/products/product-filters.ts` | `adaptWooProduct()`, `adaptWooCategory()`, `adaptProduct()`, `WOO_STATUS_LABELS`, `MEDUSA_STATUS_LABELS`, `getSourceStatusLabel()`, `getSourceStockLabel()`, `AdaptedProduct` with `source`/`sourceId`/`categoryIds` fields |
| `components/products/product-toolbar.tsx` | Source-aware status filter options |
| `components/products/product-card.tsx` | Source-aware stock and status badge display |
| `components/products/products-table.tsx` | Source-aware stock and status badge display |
| `components/products/woo-product-edit-dialog.tsx` | WooCommerce product edit modal (name, price, stock, status) |
| `app/(admin)/products/page.tsx` | Unified product list with source routing, detail modal, edit flow |

---

## Status Mapping

### WooCommerce → UI Labels

| WooCommerce Status | Internal | UI Label |
|-------------------|---------|----------|
| `publish` | `published` | Hoạt động |
| `draft` | `draft` | Bản nháp |
| `pending` | `pending` | Chờ duyệt |
| `private` | `private` | Riêng tư |

### WooCommerce → Stock Status UI

| WooCommerce Stock Status | UI Label |
|-------------------------|---------|
| `instock` | Còn hàng |
| `outofstock` | Hết hàng |
| `onbackorder` | Đang chờ hàng |

---

## Sorting (WooCommerce Mode)

| SortOption | WooCommerce orderby | WooCommerce order |
|------------|---------------------|------------------|
| `newest_date` | `date` | `desc` |
| `oldest_date` | `date` | `asc` |
| `name_asc` | `title` | `asc` |
| `name_desc` | `title` | `desc` |
| `price_asc` | `price` | `asc` |
| `price_desc` | `price` | `desc` |
| `stock_asc` | `stock_quantity` | `asc` |

---

## AdaptedProduct Normalized Shape

All products are normalized to `AdaptedProduct` regardless of source using `adaptWooProduct()` or `adaptProduct()`:

```typescript
interface AdaptedProduct {
  id: string;                              // Normalized ID (always string)
  source: "medusa" | "woocommerce";        // Source indicator
  sourceId: string;                        // Original ID from source
  name: string;
  sku: string;
  category: string;                        // Display string, may include "Parent / Child"
  categoryId?: string;                     // Primary category ID
  categoryIds?: string[];                  // All WooCommerce category IDs for this product
  price: number;
  compareAtPrice?: number;
  stock: number;
  stockStatus: StockStatus;                // "instock" | "outofstock" | "onbackorder" | "unknown"
  status: string;                          // Source-specific status string
  image: string;
  tags: string[];
  description?: string;
  metadata?: Record<string, string>;
  rawProduct?: MedusaProduct;              // Original Medusa product (null for WooCommerce products)
  createdAt?: string;
  syncStatus?: "synced" | "pending" | "failed" | "manual";
}
```

### Key Differences from Raw WooCommerce

| Field | WooCommerce Raw | AdaptedProduct |
|-------|-----------------|---------------|
| `id` | `number` | `string` |
| `source` | N/A | `"woocommerce"` |
| `sourceId` | N/A | Same as `id` |
| `status` | `"publish"` | `"published"` (mapped) |
| `stockStatus` | `"instock"` | `"instock"` (mapped) |
| `price` | `"9.99"` (string) | `9.99` (number) |

---

## WooCommerce Product Edit (WooCommerce Mode)

When `product_data_source = woocommerce`, clicking "Sửa" on a product card navigates to the full-page editor at `/products/[id]/woo-edit`.

### Route

| URL | Component | Description |
|-----|-----------|-------------|
| `/products/[id]/woo-edit` | `woo-product-edit-page-form.tsx` + `woo-edit/page.tsx` | Full-page WordPress-style editor |

### Layout

```
┌─ Sticky header (breadcrumb, product name, WooCommerce badge, View on web, Quay lại) ─┐
│ Page grid: grid-cols-[1fr_340px]                                                            │
│  ┌─ Main column (1fr) ────────────────┐  ┌─ Sidebar (340px) ─────────────────┐       │
│  │  Tabs: Tổng quan | DM&Thẻ | HA | Mô tả | NC  │  │  Xuất bản                     │       │
│  │  Tab content (stable, no jump)    │  │  Xem trước                    │       │
│  └────────────────────────────────────┘  │  Tồn kho nhanh               │       │
│                                          │  Quick links                  │       │
│                                          └───────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Layout notes:**
- Page uses `grid grid-cols-[1fr_340px]` — main takes remaining space, sidebar fixed 340px
- Form component renders main column only. Sidebar is in the page route.
- `items-start` on grid prevents sidebar from stretching to match main height
- Responsive: sidebar drops below main on small screens (grid default behavior)

### Editable Fields (Full WooCommerce Editor)

#### Tab: Tổng quan (includes price + inventory)
| Field | WooCommerce API | Notes |
|-------|-----------------|-------|
| Tên sản phẩm | `name` | Required |
| Trạng thái | `status` | publish, draft, pending, private |
| Hiển thị | `catalog_visibility` | visible, catalog, search, hidden |
| SKU | `sku` | String |
| Sản phẩm nổi bật | `featured` | Boolean toggle |
| Giá gốc | `regular_price` | String, VND |
| Giá khuyến mãi | `sale_price` | String, empty clears sale |
| Giảm giá từ/đến | `date_on_sale_from/to` | datetime-local |
| Trạng thái tồn kho | `stock_status` | instock, outofstock, onbackorder |
| Quản lý tồn kho | `manage_stock` | Boolean toggle |
| Số lượng tồn | `stock_quantity` | Integer, only when manage_stock=true |
| Cho phép đặt hàng trước | `backorders` | no, notify, yes |
| Bán riêng lẻ | `sold_individually` | Boolean toggle |

#### Tab: Danh mục & Thẻ
| Feature | WooCommerce API | Notes |
|---------|-----------------|-------|
| Category multi-select | `categories: [{id}]` | Parent/child tree, checkbox UI |
| Existing tag select | `tags: [{id}]` | From WooCommerce tags |
| Create new tag | `tags: [{name}]` | Creates new tag on save |
| Smart tag suggestions | — | Based on product name + category keywords |
| Tag search | — | Filters WooCommerce tags |

#### Tab: Hình ảnh
| Feature | Status | Notes |
|---------|--------|-------|
| Featured image | Supported | Select from MediaPicker, lightbox zoom |
| Gallery images | Supported | Thumbnail list with up/down reorder |
| Lightbox zoom | Supported | Click thumbnail to open LightboxDialog |
| WordPress Media Library | Supported | Upload + select via MediaPicker |
| Media ID-based save | Supported | Uses `id` instead of `src` when available |

#### Tab: Mô tả
| Field | WooCommerce API | Notes |
|-------|-----------------|-------|
| Mô tả ngắn | `short_description` | HTML via HtmlEditor |
| Mô tả đầy đủ | `description` | HTML via HtmlEditor with visual/HTML toggle |

#### Tab: Nâng cao
| Field | WooCommerce API | Notes |
|-------|-----------------|-------|
| Thứ tự menu | `menu_order` | Integer |
| Ghi chú mua hàng | `purchase_note` | Text |
| Metadata tùy chỉnh | `meta_data: [{key, value}]` | Key/value editor |

### Read-Only Fields (must be edited in WooCommerce)
- Images upload (WordPress Media Library)
- Product variations (not yet supported)
- Shipping settings
- Linked products
- SEO plugin fields (Yoast, RankMath, etc.)

### API Endpoint

PUT `/api/woo/products/{product_id}` → WooCommerce REST API v3

### Sidebar Cards
| Card | Contents |
|------|----------|
| Xuất bản | status, visibility, featured, ID, dates, save button |
| Product Preview | image, name, price, badges |
| Tồn kho nhanh | stock status + quantity quick edit |
| Quick links | "Xem trên web" button |

### WordPress Media API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wordpress-media` | GET | List WordPress media (pagination, search) |
| `/api/wordpress-media` | POST | Upload image (multipart/form-data) |

**GET /api/wordpress-media** — List media:
- Query params: `page`, `per_page`, `search`
- Response: `{ items: WpMediaItem[], totalPages: number, totalItems: number }`
- Uses WooCommerce credentials from `app_settings`

**POST /api/wordpress-media** — Upload media:
- Body: `FormData` with `file` (Blob) and optional `title`
- Response: `{ id, source_url, title, alt, mime_type }`
- Uploads to WordPress REST API: `POST /wp-json/wp/v2/media`

### Image Save Format

WooCommerce image payload uses `id` when available:
```json
{
  "images": [
    { "id": 123 },           // featured — uses Media ID
    { "id": 456 },           // gallery
    { "src": "https://..." } // fallback if no ID
  ]
}
```

### Files

`app/(admin)/products/[id]/woo-edit/page.tsx` — Full-page route
`components/products/woo-product-edit-page-form.tsx` — Main form (WordPress-style layout)
`components/media/media-picker.tsx` — WordPress MediaPicker dialog
`app/api/wordpress-media/route.ts` — WordPress Media API proxy
`hooks/use-medusa.ts` — `useWooCommerceProduct`, `useWordPressMediaLibrary`, `useWordPressMediaUpload`

---

## Bug Fixes Applied

### Categories page (/products/categories)
- Fixed duplicate `allFlat` useMemo causing TypeScript error
- Fixed error message always showing "Không thể kết nối Medusa" regardless of source
- Fixed `openEditDialog` referencing undefined `data` variable
- Added source-aware inactive count (0 for WooCommerce)
- Added `__skipMedusa` to prevent Medusa API calls when WooCommerce is active
