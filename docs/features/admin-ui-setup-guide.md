# Admin UI Setup Guide

> **Cập nhật:** 2026-05-09
> **App:** `apps/admin-ui`
> **Framework:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt](#2-cài-đặt)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Các bảng Database](#4-các-bảng-database)
5. [Script thực thi](#5-script-thực-thi)
6. [API Routes](#6-api-routes)
7. [Môi trường](#7-môi-trường)
8. [Cấu trúc Media Upload](#8-cấu-trúc-media-upload)
9. [Lưu ý bảo mật](#9-lưu-ý-bảo-mật)

---

## 1. Yêu cầu hệ thống

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20.x |
| pnpm | >= 9.x |
| PostgreSQL | >= 15 (via Medusa backend) |
| Redis | (optional, via Medusa backend) |

---

## 2. Cài đặt

### 2.1 Cài đặt từ đầu

```bash
# Clone repo
cd "d:\AI PROJECT\mytholaptop-v3"

# Cài đặt dependencies cho toàn monorepo
pnpm install

# Cài shadcn/ui (nếu cần thêm component)
cd apps/admin-ui
pnpm dlx shadcn@latest add [component-name]
```

### 2.2 Build

```bash
# Build admin-ui
pnpm --filter admin-ui build

# Hoặc build toàn monorepo
pnpm build
```

### 2.3 Development

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000) - DÙNG PNPM
cd apps/admin-ui
pnpm dev
```

---

## 3. Cấu trúc thư mục

```
apps/admin-ui/
├── app/
│   ├── (admin)/                    # Route group cho admin pages
│   │   ├── dashboard/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx           # Listing: grid/list, filter, bulk actions
│   │   │   ├── [id]/edit/page.tsx # Edit product
│   │   │   ├── categories/page.tsx
│   │   │   ├── tags/page.tsx
│   │   │   ├── attributes/page.tsx
│   │   │   ├── brands/page.tsx
│   │   │   ├── inventory/page.tsx
│   │   │   ├── sync/page.tsx
│   │   │   └── variants/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── segments/page.tsx
│   │   │   ├── groups/page.tsx
│   │   │   ├── activity-log/page.tsx
│   │   │   ├── purchase-history/page.tsx
│   │   │   ├── warranty-debt/page.tsx
│   │   │   └── zns/page.tsx
│   │   ├── sales/
│   │   │   ├── page.tsx           # Dashboard: stats + recent orders
│   │   │   ├── orders/page.tsx
│   │   │   ├── carts/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── shipping/page.tsx
│   │   │   ├── quotes/page.tsx
│   │   │   ├── refunds/page.tsx
│   │   │   ├── logs/page.tsx
│   │   │   ├── promotions/page.tsx
│   │   │   └── pos/page.tsx
│   │   ├── content/
│   │   │   ├── page.tsx           # AI Content dashboard
│   │   │   ├── ai-generator/page.tsx
│   │   │   ├── facebook-posts/page.tsx
│   │   │   ├── website-posts/page.tsx
│   │   │   ├── video-scripts/page.tsx
│   │   │   ├── image-prompts/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── library/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── staff/
│   │   │   ├── page.tsx
│   │   │   ├── permissions/page.tsx
│   │   │   └── roles/page.tsx
│   │   ├── layout.tsx
│   │   └── migration/page.tsx      # Redirect → /products/sync
│   ├── api/                        # API Routes
│   │   ├── admin/products/check-sku/route.ts
│   │   ├── medusa/[...slug]/route.ts      # Medusa proxy
│   │   ├── woo/[...slug]/route.ts         # WooCommerce proxy
│   │   ├── fetch-image/route.ts            # Image proxy (tránh CORS)
│   │   ├── medusa/upload-media/route.ts    # WordPress media upload
│   │   ├── migration/init/route.ts
│   │   ├── migration/repair/route.ts
│   │   ├── content/
│   │   │   ├── items/route.ts              # Content CRUD
│   │   │   ├── items/[id]/route.ts
│   │   │   ├── schedules/route.ts
│   │   │   ├── schedules/[id]/route.ts
│   │   │   ├── templates/route.ts
│   │   │   ├── templates/[id]/route.ts
│   │   │   ├── stats/route.ts
│   │   │   └── generate/route.ts
│   │   ├── ai/
│   │   │   ├── providers/route.ts
│   │   │   ├── providers/[id]/route.ts
│   │   │   └── settings/route.ts
│   │   └── settings/route.ts
│   ├── layout.tsx
│   ├── page.tsx                    # Redirect → /dashboard
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── admin-layout.tsx       # Layout với CompanySettingsProvider
│   │   ├── admin-header.tsx        # 3-column SaaS header
│   │   ├── admin-sidebar.tsx       # Dynamic NAV_ITEMS sidebar
│   │   ├── admin-mobile-sidebar.tsx
│   │   ├── breadcrumbs.tsx
│   │   ├── global-search.tsx        # Ctrl+K search dialog
│   │   ├── quick-actions.tsx
│   │   ├── notification-center.tsx
│   │   └── user-menu.tsx
│   ├── categories/
│   │   ├── category-tree.tsx       # Category tree với expand/collapse
│   │   └── category-tree-mobile.tsx
│   └── products/
│       ├── products-table.tsx      # List view với multi-select
│       ├── product-card-grid.tsx    # Grid view 3/4/5/6 columns
│       ├── product-card.tsx
│       ├── product-toolbar.tsx      # Search + filters + settings
│       ├── product-pagination.tsx
│       ├── product-bulk-actions.tsx # Bulk delete/sync/export
│       ├── product-category-tree-filter.tsx
│       ├── product-grid-settings.tsx
│       ├── product-form-dialog.tsx
│       ├── product-filters.tsx
│       ├── product-list-header.tsx
│       ├── product-edit-form.tsx     # 7 tabs edit form
│       ├── product-edit-sidebar.tsx
│       ├── product-basic-tab.tsx
│       ├── product-pricing-tab.tsx
│       ├── product-inventory-tab.tsx
│       ├── product-images-tab.tsx
│       ├── product-seo-tab.tsx
│       ├── product-wordpress-metadata-tab.tsx
│       └── product-categories-tab.tsx
├── lib/
│   ├── navigation.ts                # NAV_ITEMS - dynamic menu system
│   ├── company-settings.tsx         # CompanySettingsProvider context
│   ├── settings-storage.ts          # LocalStorage settings
│   ├── utils.ts                    # Utility functions (formatCurrency, etc.)
│   ├── mock-data.ts
│   └── products/
│       └── product-filters.ts      # Filter/sort/paginate helpers
├── hooks/
│   └── use-ui-settings.tsx        # UI settings state (sidebar collapse)
├── services/
│   ├── medusa-types.ts            # TypeScript types for Medusa API
│   └── medusa.service.ts          # Medusa API calls
├── public/
│   └── wp-content/
│       └── uploads/               # WordPress media upload directory
│           └── {year}/{month}/   # Ví dụ: 2026/04/dell-inspiron-15.jpg
└── .env.example                   # Environment variables template
```

---

## 4. Các bảng Database

Admin UI kết nối với **Medusa v2** backend (`apps/backend-ui/apps/backend`) qua REST API.

### 4.1 Các bảng chính (Medusa v2 / PostgreSQL)

| Bảng | Mô tả | Nguồn |
|------|--------|--------|
| `public.product` | Sản phẩm | WooCommerce → Medusa |
| `public.product_category` | Danh mục sản phẩm | WooCommerce → Medusa |
| `public.product_tag` | Thẻ sản phẩm | WooCommerce → Medusa |
| `public.product_image` | Hình ảnh sản phẩm | WooCommerce → Medusa |
| `public/product_variant` | Biến thể sản phẩm | WooCommerce → Medusa |
| `public/price` | Giá sản phẩm | WooCommerce → Medusa |
| `public/inventory_item` | Tồn kho (Medusa Inventory Module) | WooCommerce → Medusa |
| `public/customer` | Khách hàng | WooCommerce → Medusa |
| `public/order` | Đơn hàng | WooCommerce → Medusa |
| `public/address` | Địa chỉ | WooCommerce → Medusa |

### 4.2 Metadata WordPress (trong `public.product`)

Các trường metadata được lưu trong `product.metadata`:

```sql
-- Ví dụ metadata.product
{
  "wordpress_id": "1234",
  "wordpress_slug": "dell-inspiron-15-5530",
  "wordpress_source_url": "https://mytholaptop.vn/san-pham/dell-inspiron-15-5530",
  "wordpress_regular_price": "22500000",
  "wordpress_sale_price": "19900000",
  "wordpress_price": "19900000",
  "wordpress_stock_status": "instock",
  "wordpress_category_ids": ["10", "12"],
  "wordpress_categories": [
    { "id": "10", "name": "Laptop Dell" },
    { "id": "12", "name": "Laptop Gaming" }
  ],
  "wordpress_tag_names": ["Dell", "Inspiron", "Gaming"],
  "migration_status": "completed",
  "last_synced_at": "2026-05-03T10:30:00Z"
}
```

### 4.3 Các bảng nội bộ (admin-ui)

Admin-ui sử dụng **localStorage** cho:

| Key | Mô tả |
|-----|--------|
| `admin-ui.products.gridColumns` | Số cột grid (3/4/5/6) |
| `admin-ui.products.pageSize` | Số sản phẩm/trang (20/30/50/100) |
| `admin-ui.products.viewMode` | Chế độ xem (grid/list) |
| `mtl-ui-settings` | UI settings (sidebar collapsed) |
| `mtl-company-settings` | Company branding (name, logo, phone, address) |
| `mtl-admin-settings` | App settings (WooCommerce URL, Medusa URL, etc.) |

### 4.4 Content Tables (admin-ui API)

| Bảng | Mô tả |
|------|--------|
| `content_items` | Bài viết AI (Facebook, Website, Video, Image) |
| `content_schedules` | Lịch xuất bản |
| `content_templates` | Template bài viết |

---

## 5. Script thực thi

### 5.1 Development

```bash
# Backend Medusa - port 9000
cd apps/backend-ui/apps/backend
npm run dev

# Admin UI - port 3000
cd apps/admin-ui
pnpm dev
```

### 5.2 Build

```bash
# Admin UI
cd apps/admin-ui
pnpm build

# Toàn bộ monorepo
cd "d:\AI PROJECT\mytholaptop-v3"
pnpm build
```

### 5.3 Lint

```bash
cd apps/admin-ui
pnpm lint
```

### 5.4 Type check

```bash
cd apps/admin-ui
pnpm type-check
```

### 5.5 Test

```bash
cd apps/admin-ui
pnpm test
```

### 5.6 Scripts trong `package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 6. API Routes

### 6.1 Medusa Proxy

```
GET/POST/PATCH/DELETE /api/medusa/{path}
→ Proxy đến Medusa backend (port 9000)
→ Tự động thêm JWT token từ cookie/server session
```

### 6.2 WooCommerce Proxy

```
GET/POST/PATCH/DELETE /api/woo/{path}
→ Proxy đến WooCommerce REST API
→ Xử lý CORS
→ Thêm auth credentials
```

### 6.3 Image Proxy

```
GET /api/fetch-image?url={encoded_url}
→ Fetch ảnh từ WordPress/WooCommerce
→ Trả về ảnh để hiển thị trong Next.js
→ Tránh CORS issues
```

### 6.4 Media Upload

```
POST /api/medusa/upload-media
Body: { imageUrl, productId?, year?, month? }
→ Download ảnh từ WordPress
→ Lưu vào public/wp-content/uploads/{year}/{month}/{filename}
→ Trả về relative path
```

### 6.5 Migration

```
POST /api/migration/init
→ Khởi tạo migration session

POST /api/migration/repair
→ Repair image mapping cho products đã migrate
```

### 6.6 Content API

```
GET/POST   /api/content/items
GET/PATCH/DELETE /api/content/items/[id]

GET/POST   /api/content/schedules
GET/PATCH/DELETE /api/content/schedules/[id]

GET/POST   /api/content/templates
GET/PATCH/DELETE /api/content/templates/[id]

GET        /api/content/stats

POST       /api/content/generate
```

### 6.7 AI API

```
GET/POST    /api/ai/providers
GET/PATCH/DELETE /api/ai/providers/[id]

GET/PATCH   /api/ai/settings
POST        /api/ai/settings/test
```

### 6.8 Settings

```
GET/PATCH /api/settings
```

---

## 7. Môi trường

### 7.1 File `.env.example`

```bash
# Medusa Backend
MEDUSA_BACKEND_URL=http://localhost:9000

# WooCommerce
WOOCOMMERCE_STORE_URL=https://mytholaptop.vn
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx

# JWT (được lưu trong cookie, không hardcode)
# JWT_SECRET=your-secret-key

# WordPress
WP_PUBLIC_BASE_URL=https://mytholaptop.vn

# AI Providers (tuỳ chọn)
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Upload
UPLOAD_MAX_SIZE_MB=10
```

### 7.2 Security Notes

- KHÔNG bao giờ commit file `.env` lên git
- File `.env.example` là template, không chứa credentials thật
- JWT token được lưu trong HTTP-only cookie
- API keys được lưu ở phía server (API routes)

---

## 8. Cấu trúc Media Upload

```
Source: WordPress/WooCommerce
Ví dụ: https://mytholaptop.vn/wp-content/uploads/2026/04/dell-inspiron-15.jpg
                                    ↓ (download via /api/medusa/upload-media)
Destination: apps/admin-ui/public/wp-content/uploads/{year}/{month}/{filename}
Ví dụ: apps/admin-ui/public/wp-content/uploads/2026/04/dell-inspiron-15.jpg
                                    ↓ (access via)
URL: http://localhost:3000/wp-content/uploads/2026/04/dell-inspiron-15.jpg
```

### 8.1 Đặc điểm

- **Giữ nguyên cấu trúc URL WordPress** để bảo toàn SEO
- **Deduplication theo source URL** — cùng URL chỉ tải 1 lần
- **Overwrite khi trùng filename** — không tạo file `-1`, `-2`
- **Proxy ảnh** — `/api/fetch-image` để tránh CORS

### 8.2 Rewrite HTML Images

Ảnh trong mô tả HTML được rewrite qua proxy:

```typescript
// lib/products/product-filters.ts
export function rewriteDescriptionImages(html: string): string {
  // <img src="https://mytholaptop.vn/..."> → <img src="/api/fetch-image?url=...">
  // Relative path → /api/fetch-image?url=...
}
```

---

## 9. Lưu ý bảo mật

### 9.1 KHÔNG push lên git

| File/Folder | Lý do |
|-------------|--------|
| `.env` | Chứa JWT secret, database URLs, API keys |
| `public/wp-content/uploads/` | Chứa ảnh sản phẩm |
| `public/uploads/` | Upload files |
| File chứa hardcoded credentials | Bảo mật |

### 9.2 Đã thêm vào `.gitignore`

```
# Environment
.env
.env.local
.env.*.local

# Uploads
public/wp-content/uploads/*
!public/wp-content/uploads/.gitkeep

# Build
.next/
out/

# Cache
.node_modules/
.turbo/
```

### 9.3 Best Practices

- JWT token chỉ được xử lý ở server-side (API routes)
- Không expose API keys ra client
- Validate tất cả input từ client
- Sanitize HTML khi hiển thị user content
