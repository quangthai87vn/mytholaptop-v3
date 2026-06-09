# PRODUCT_SETTINGS_FLOW.md

## Settings > Cấu hình ứng dụng

### Tab: Thông tin công ty

Manages company branding information displayed throughout the app.

| Field | Storage Key | Notes |
|-------|------------|-------|
| Tên công ty | `company.name` | |
| Website | `company.website` | URL validation |
| Số điện thoại | `company.phone` | |
| Logo URL | `company.logoUrl` | URL validation |
| Địa chỉ | `company.address` | |

Saving triggers:
- `POST /api/settings` with `{ company: {...} }`
- localStorage sync: `mtl-company-settings`
- CustomEvent: `company-settings-changed`

---

### Tab: Nguồn dữ liệu sản phẩm

Core feature — selects which source the /products page uses.

**Options:**
- `medusa` — Use Medusa Backend
- `woocommerce` — Use WooCommerce API directly

**Saved as:**
```json
{ "product_data_source": { "source": "woocommerce" } }
```

Key behavior: Switching source does NOT delete credentials of the other source. Both sources retain their credentials in storage.

---

### Tab: Kiểm tra & đồng bộ

**Left column — Medusa Backend:**

Fields:
- Backend URL: `medusa.backendUrl`
- Admin Email: `medusa.adminEmail`
- Admin Password: `medusa.adminPassword` (toggle visibility)
- JWT Token: `medusa.adminApiKey` (toggle visibility, or fetch via "Lấy Token" button)

Actions:
- **Lấy Token** — calls `POST /api/auth/token` with email+password, stores JWT in `adminApiKey`
- **Kiểm tra** — calls `POST /api/settings/test-connection/medusa`
- **Lưu** — saves to `app_settings` table

Status indicators:
- Connected (green)
- Error (red with retry button)
- Unknown (neutral, prompt to test)

**Right column — WooCommerce API:**

Fields:
- WordPress API URL: `wooCommerce.wordpressUrl`
- Consumer Key: `wooCommerce.consumerKey` (toggle visibility, encrypted at rest)
- Consumer Secret: `wooCommerce.consumerSecret` (toggle visibility, encrypted at rest)

Actions:
- **Kiểm tra** — calls `POST /api/settings/test-connection/woocommerce`
- **Lưu** — encrypts keys and saves to `app_settings` table

---

## Products Page Flow

```
User opens /products
    │
    ├─ useProductDataSource() → reads product_data_source from /api/settings
    │
    ├─ If source = medusa:
    │     ├─ useMedusaConfigured() → /api/medusa/status
    │     ├─ useProducts() → /api/medusa/admin/products (proxy → Medusa backend)
    │     ├─ useCategories() → /api/medusa/admin/product-categories (for category tree filter)
    │     └─ adaptProduct() normalizes data
    │
    └─ If source = woocommerce:
          ├─ useWooCommerceConfigured() → /api/woo/products?per_page=1
          ├─ useWooCommerceProducts() → /api/woo/products?per_page=100 (with sort params)
          ├─ useWooCommerceCategories() → /api/woo/products/categories (for category tree filter)
          └─ adaptWooProduct() normalizes data

User opens /products/categories
    │
    ├─ If source = woocommerce:
    │     ├─ useWooCommerceCategories() → /api/woo/products/categories
    │     └─ buildTreeFromWooCommerce() → CategoryNode[]
    │
    └─ If source = medusa:
          ├─ useCategories() → /api/medusa/admin/product-categories
          └─ buildCategoryTree() → CategoryNode[]

User opens /products/tags
    │
    ├─ If source = woocommerce:
    │     └─ useWooCommerceTags() → /api/woo/products/tags (read-only)
    │
    └─ If source = medusa:
          └─ useTags() → /api/medusa/admin/product-tags (full CRUD)

User opens /products/brands
    │
    ├─ If source = woocommerce:
    │     └─ Shows read-only message, links to settings (brands stored in Medusa)
    │
    └─ If source = medusa:
          └─ useCollections() → /api/medusa/admin/collections (full CRUD)
```

---

## API Routes

### /api/settings
- **GET**: Returns `{ product_data_source, wooCommerce, medusa, company }`
- **POST**: Saves partial payload per section

### /api/medusa/[...slug]
- Server-side proxy for Medusa Admin API
- Loads credentials from `app_settings.medusa`
- Auth: JWT token or email/password authentication
- Returns error details for 401/403/connection failures

### /api/woo/[...slug]
- Server-side proxy for WooCommerce REST API
- Loads credentials from `app_settings.wooCommerce`
- Decrypts credentials before use
- Returns WooCommerce API errors with codes

---

## WooCommerce Product Edit Flow

```
User clicks "Sửa" on WooCommerce product card
    │
    └─ router.push(`/products/${id}/woo-edit`)
              │
              ├─ /products/[id]/woo-edit/page.tsx renders
              │     ├─ useWooCommerceProduct(id) → GET /api/woo/products/{id}
              │     ├─ useWooCommerceCategories() → GET /api/woo/products/categories
              │     └─ useWooCommerceTags() → GET /api/woo/products/tags
              │
              └─ <WooProductEditPageForm> renders
                    ├─ Sticky header: breadcrumb, product name, WooCommerce badge, Xem trên web, Quay lại
                    ├─ Page CSS grid: main column (1fr) + sidebar (340px fixed)
                    ├─ Left: 5 tabs (Tổng quan (price+stock), Danh mục & Thẻ, Hình ảnh, Mô tả, Nâng cao)
                    └─ Right sidebar (inside page): Xuất bản, Xem trước, Tồn kho nhanh, Quick links

User clicks "Lưu thay đổi"
    │
    └─ useUpdateWooCommerceProduct()
          └─ PUT /api/woo/products/{id}
               └─ WooCommerce REST API: wp-json/wc/v3/products/{id}
```

**Editable fields:**
| Tab | Fields |
|-----|--------|
| Tổng quan | name, status, catalog_visibility, featured, sku, short_description |
| Giá & Kho | regular_price, sale_price, date_on_sale_from, date_on_sale_to, stock_status, manage_stock, stock_quantity, backorders, sold_individually |
| DM & Thẻ | categories (multi-select tree), tags (existing + new) |
| Hình ảnh | images (featured + gallery, URL-based) |
| Mô tả | short_description, description (HTML) |
| Nâng cao | menu_order, purchase_note, meta_data |

**TODO:**
- WordPress Media Library upload (replace URL input with drag-and-drop media browser)
- Real-time autosave (auto-save draft every 60s)
