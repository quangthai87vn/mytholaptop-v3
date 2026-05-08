# MTL Next.js Commerce - Tiến Độ Project

> **Cập nhật lần cuối:** 2026-05-09 00:15 (UTC+7)
> **Agent:** c2283fc2-94d8-422d-98ca-91fb159b20c2
> **Task:** Admin UI Product Page + Grid/List View + Sidebar/Layout Overhaul

---

## Task 3: Product Page Full Upgrade + Layout Overhaul (9 May 2026)

### Tổng quan

Hoàn thiện trang danh sách sản phẩm với đầy đủ filter, grid/list view, bulk actions, và tái cấu trúc sidebar/header/layout.

---

## 1. Đã Làm Gì

### 1.1 Trang Products Nâng Cấp Toàn Diện

**File chính:** `app/(admin)/products/page.tsx`

Thay đổi cấu trúc page:

1. **Grid/List view toggle** — chuyển đổi giữa card grid và table list, lưu vào localStorage `admin-ui.products.viewMode`
2. **ProductToolbar nâng cấp** — search, category tree filter, status filter, stock filter, sort dropdown, grid settings, view mode toggle, refresh
3. **ProductCardGrid cải thiện** — hỗ trợ responsive column classes cho 3/4/5/6 cột
4. **ProductsTable mới** — hiển thị dạng bảng với checkbox chọn nhiều sản phẩm
5. **ProductBulkActions mới** — bulk delete, bulk sync, bulk export, bulk change status/category/tags
6. **ProductPagination** — phân trang với tổng số sản phẩm / trang
7. **Active Filter Badges** — hiển thị các filter đang áp dụng với nút xóa từng filter hoặc xóa tất cả
8. **ProductFormDialog** — dialog tạo sản phẩm mới
9. **LocalStorage persistence** — grid columns, page size, view mode được lưu lại giữa các lần truy cập

### 1.2 Category Tree Filter

**File:** `components/products/product-category-tree-filter.tsx` (tái sử dụng `components/categories/category-tree.tsx`)

- Dropdown Popover hiển thị danh mục dạng phân cấp cha/con
- Expand/collapse các danh mục cha
- Search bên trong dropdown
- Hiển thị path đầy đủ cho danh mục con
- Support cả flat list từ API lẫn nested tree

### 1.3 Product Edit Page (Skeleton hoàn chỉnh)

**File:** `app/(admin)/products/[id]/edit/page.tsx`

- Load sản phẩm từ Medusa API qua `useProduct(id)` hook
- Breadcrumb: Sản phẩm → [Tên sản phẩm] → Chỉnh sửa
- Loading skeleton khi đang tải
- Error state với Alert
- Nút "Quay lại" về trang products
- Tích hợp `ProductEditForm` component (tabs: Basic, Pricing, Inventory, Images, SEO, WordPress Metadata, Categories)

### 1.4 Product Edit Components

| File | Mô tả |
|------|-------|
| `components/products/product-edit-form.tsx` | Main form với Tabs (7 tabs) |
| `components/products/product-edit-sidebar.tsx` | Sidebar hiển thị tóm tắt sản phẩm |
| `components/products/product-basic-tab.tsx` | Tab thông tin cơ bản |
| `components/products/product-pricing-tab.tsx` | Tab giá bán |
| `components/products/product-inventory-tab.tsx` | Tab kho hàng |
| `components/products/product-images-tab.tsx` | Tab hình ảnh (thumbnail + gallery) |
| `components/products/product-seo-tab.tsx` | Tab SEO |
| `components/products/product-wordpress-metadata-tab.tsx` | Tab metadata WordPress (read-only) |
| `components/products/product-categories-tab.tsx` | Tab danh mục |
| `components/products/product-form-dialog.tsx` | Dialog tạo sản phẩm mới |

### 1.5 Customer Pages (Stubs)

**File:** `app/(admin)/customers/page.tsx`

- Danh sách khách hàng từ Medusa API (`useCustomers` hook)
- Search theo tên/email/phone
- Filter theo trạng thái
- Bảng với tên, email, phone, địa chỉ, số đơn, tổng chi tiêu, ngày tạo
- Actions: Xem chi tiết, Xóa
- Pagination 20 sản phẩm/trang

### 1.6 Sales Page (Mock Data)

**File:** `app/(admin)/sales/page.tsx`

- Dashboard tổng quan bán hàng với 4 stat cards: Đơn hàng hôm nay, Doanh thu hôm nay, Đơn chờ xử lý, Đơn hủy
- Biểu đồ mock đơn giản
- Bảng 5 đơn hàng gần nhất với trạng thái thanh toán/order
- Link đến trang chi tiết orders/payments/shipping

### 1.7 Content Page (Stubs)

**File:** `app/(admin)/content/page.tsx`

- Dashboard AI Content với 4 stat cards: Tổng bài viết, Đã xuất bản, Đang lên lịch, Nháp
- Grid 8 shortcut cards: AI Generator, Facebook Posts, Website Posts, Video Scripts, Image Prompts, Calendar, Templates, Library
- Recent posts table với type, title, status, scheduled date, actions

### 1.8 Header Redesign (Từ Task 2)

**File:** `components/layout/admin-header.tsx` (viết lại hoàn toàn)

- Layout 3 cột: LEFT (breadcrumb + page title) / CENTER (search bar) / RIGHT (quick actions + notifications + user)
- Search dialog với Ctrl+K shortcut, nhóm kết quả theo loại
- Quick actions dropdown: Tạo đơn hàng, Thêm sản phẩm, Thêm khách hàng, Tạo bài viết AI, Gửi ZNS, Đồng bộ
- Notification center với 5 loại thông báo
- User menu với profile, settings, đổi mật khẩu, đăng xuất
- Header 68px với backdrop-blur

### 1.9 Sidebar Redesign

**File:** `components/layout/admin-sidebar.tsx` (tái cấu trúc)

- Dynamic `NAV_ITEMS` từ `lib/navigation.ts`
- Expand/collapse với animation
- Active route highlight đỏ brand
- Company logo từ `CompanySettingsProvider`
- Responsive: collapsed trên desktop, mobile sheet
- Sub-items với indent theo depth

### 1.10 Mobile Sidebar

**File:** `components/layout/admin-mobile-sidebar.tsx`

- Sheet overlay cho mobile
- Expand/collapse parent items
- Active route highlight
- Company branding

### 1.11 Admin Layout Refactor

**File:** `components/layout/admin-layout.tsx`

- Tách `AdminLayout` + `AdminLayoutInner`
- `CompanySettingsProvider` wrapper
- `UISettings` cho sidebar collapse state
- Mobile sidebar trigger

### 1.12 Migration Redirect

**File:** `app/(admin)/migration/page.tsx`

- Redirect sang `/products/sync`

### 1.13 Navigation System

**File:** `lib/navigation.ts` (tái tạo)

```typescript
NAV_ITEMS: [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  {
    title: "Sản phẩm",
    icon: Package,
    children: [
      { title: "Quản lý sản phẩm", href: "/products" },
      { title: "Danh mục", href: "/products/categories" },
      { title: "Thẻ", href: "/products/tags" },
      { title: "Thuộc tính", href: "/products/attributes" },
      { title: "Thương hiệu", href: "/products/brands" },
      { title: "Tồn kho", href: "/products/inventory" },
      { title: "Đồng bộ", href: "/products/sync" },
      { title: "Biến thể", href: "/products/variants" },
    ]
  },
  // ... Sales, Customers, Content, Settings, Staff
]
```

### 1.14 Product Filter Helper Nâng Cấp

**File:** `lib/products/product-filters.ts` (mở rộng)

```typescript
export type StockStatus = "instock" | "outofstock" | "onbackorder" | "unknown" | "all"
export type ProductStatus = "draft" | "published" | "proposed" | "rejected" | "archived" | "all"
export type SortOption = "newest_date" | "oldest_date" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_asc"

export function filterProductsBySearch(products, search)
export function filterProductsByCategoryTree(products, categoryId, categoryMap)
export function filterProductsByStatus(products, status)
export function filterProductsByStock(products, stock)
export function paginateProducts(products, page, pageSize)
export function sortProducts(products, sort)
export function adaptProduct(p: MedusaProduct): AdaptedProduct
export function rewriteDescriptionImages(html): string  // proxy /api/fetch-image
export function getStockBadgeVariant(status): "success" | "warning" | "destructive" | "secondary"
export function getStatusVariant(status): "success" | "default" | "secondary"
```

### 1.15 UI Settings Hook

**File:** `hooks/use-ui-settings.tsx` (mới)

```typescript
interface UISettings {
  sidebarCollapsedDefault: boolean
}
export function loadUISettings(): UISettings
export function saveUISettings(settings: UISettings): void
export function useUISettings()
```

### 1.16 Company Settings Context

**File:** `lib/company-settings.tsx` (mới)

```typescript
interface CompanySettings {
  name: string
  logoUrl: string
  website: string
  phone: string
  address: string
}
export const DEFAULT_COMPANY: CompanySettings
export class CompanySettingsProvider
export function loadCompanySettings(): CompanySettings
export function saveCompanySettings(settings: CompanySettings): void
```

### 1.17 API Routes

| Route | Mô tả |
|-------|-------|
| `api/admin/products/check-sku` | Check SKU trùng lặp |
| `api/content/*` | CRUD content items, schedules, templates |
| `api/ai/*` | AI providers, settings |
| `api/settings` | App settings |

### 1.18 Globals CSS

**File:** `app/globals.css`

- Import Google Fonts (Be Vietnam Pro)
- CSS custom properties cho shadcn/ui
- Custom scrollbar styling
- Smooth transitions

---

## 2. File Đã Sửa / Tạo

### Tạo mới (35 files)

| File | Mô tả |
|------|-------|
| `app/(admin)/products/[id]/edit/page.tsx` | Product edit page |
| `app/(admin)/products/page.tsx` | Product listing page (viết lại) |
| `app/(admin)/customers/page.tsx` | Customer listing page |
| `app/(admin)/sales/page.tsx` | Sales dashboard page |
| `app/(admin)/content/page.tsx` | Content dashboard page |
| `app/(admin)/migration/page.tsx` | Migration redirect |
| `components/products/product-toolbar.tsx` | Toolbar với tất cả filter |
| `components/products/products-table.tsx` | Table view cho products |
| `components/products/product-bulk-actions.tsx` | Bulk action bar |
| `components/products/product-card-grid.tsx` | Grid view (cải thiện) |
| `components/products/product-pagination.tsx` | Pagination component |
| `components/products/product-category-tree-filter.tsx` | Category tree dropdown filter |
| `components/products/product-edit-form.tsx` | Main edit form |
| `components/products/product-edit-sidebar.tsx` | Edit sidebar |
| `components/products/product-basic-tab.tsx` | Basic info tab |
| `components/products/product-pricing-tab.tsx` | Pricing tab |
| `components/products/product-inventory-tab.tsx` | Inventory tab |
| `components/products/product-images-tab.tsx` | Images tab |
| `components/products/product-seo-tab.tsx` | SEO tab |
| `components/products/product-wordpress-metadata-tab.tsx` | WP metadata tab |
| `components/products/product-categories-tab.tsx` | Categories tab |
| `components/products/product-form-dialog.tsx` | Create product dialog |
| `components/products/product-filters.tsx` | Filters component (Card-based) |
| `components/products/product-list-header.tsx` | List header |
| `components/products/product-grid-settings.tsx` | Grid/list settings |
| `components/layout/admin-header.tsx` | Viết lại hoàn toàn (3-column SaaS layout) |
| `components/layout/admin-sidebar.tsx` | Tái cấu trúc sidebar |
| `components/layout/admin-mobile-sidebar.tsx` | Mobile sidebar |
| `components/layout/admin-layout.tsx` | Layout refactor |
| `components/categories/category-tree.tsx` | Category tree component |
| `components/categories/category-tree-mobile.tsx` | Mobile category tree |
| `hooks/use-ui-settings.tsx` | UI settings state hook |
| `lib/company-settings.tsx` | Company settings context |
| `lib/navigation.ts` | NAV_ITEMS navigation system |
| `lib/products/product-filters.ts` | Filter/sort/paginate helpers |
| `app/api/admin/products/check-sku/route.ts` | SKU check API |

### Sửa đổi

| File | Thay đổi |
|------|----------|
| `app/globals.css` | Thêm Google Fonts, custom scrollbar |
| `tsconfig.json` | Cập nhật path aliases |
| `components/layout/admin-header.tsx` | Viết lại hoàn toàn (3-column layout) |
| `components/layout/admin-layout.tsx` | Thêm CompanySettingsProvider, refactor |
| `components/layout/admin-sidebar.tsx` | Tái cấu trúc với NAV_ITEMS |
| `components/layout/admin-mobile-sidebar.tsx` | Tái cấu trúc mobile |
| `components/products/product-card-grid.tsx` | Cải thiện column classes |
| `components/products/product-card.tsx` | Cải thiện card display |
| `components/products/product-toolbar.tsx` | Nâng cấp với đầy đủ filter |
| `components/products/product-pagination.tsx` | Pagination logic |
| `lib/products/product-filters.ts` | Mở rộng với sort/paginate/adapt |
| `app/(admin)/migration/page.tsx` | Redirect sang /products/sync |
| `app/(admin)/settings/page.tsx` | Tích hợp settings storage |

### Xóa (không còn dùng)

| File | Lý do |
|------|-------|
| `components/migration/category-mapping-view.tsx` | Gộp vào migration page |
| `components/migration/migration-form.tsx` | Gộp vào migration page |
| `components/migration/migration-log.tsx` | Gộp vào migration page |
| `components/migration/migration-options-popup.tsx` | Gộp vào migration page |
| `components/migration/migration-options.tsx` | Gộp vào migration page |
| `components/migration/migration-preview.tsx` | Gộp vào migration page |
| `components/migration/migration-progress.tsx` | Gộp vào migration page |
| `components/migration/product-debug-view.tsx` | Gộp vào migration page |

---

## 3. Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | `products-table.tsx` có thể cần cải thiện performance khi có >1000 products | Trung bình | Cân nhắc virtual scrolling |
| 2 | `ProductEditForm` cần kết nối PATCH API thực tế | Cao | Hiện chỉ có skeleton + mock |
| 3 | `bulk sync` trong `ProductBulkActions` là mock | Trung bình | Cần kết nối Medusa API |
| 4 | Sidebar collapse animation chưa hoàn hảo | Thấp | Cần thêm transition CSS |
| 5 | File `website-ui` có lỗi `beVietnamPro is not defined` | Cao | Pre-existing, không liên quan admin-ui |
| 6 | Dev server có thể chạy sai app nếu dùng `npm` thay vì `pnpm` | Thấp | Luôn dùng `pnpm dev` |

---

## 4. Lệnh Test

### 4.1 Build & TypeScript

```bash
# Build admin-ui (chạy từ root monorepo)
cd "d:\AI PROJECT\mytholaptop-v3"
pnpm --filter admin-ui build

# Hoặc chạy trực tiếp trong admin-ui
cd apps/admin-ui
pnpm build
```

### 4.2 Development Server

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000) - DÙNG PNPM
cd apps/admin-ui
pnpm dev

# KHÔNG dùng: npm run dev (sẽ chạy website-ui)
```

### 4.3 Test Routes

Mở browser tại `http://localhost:3000` và kiểm tra:

| Route | Kiểm tra |
|-------|----------|
| `/dashboard` | Header hiển thị "Tổng quan", sidebar collapse |
| `/products` | Grid/List toggle, search, category filter, status filter, stock filter, sort, bulk select, pagination |
| `/products?q=dell` | Search hoạt động |
| `/products?status=published` | Filter status hoạt động |
| `/products?category=laptop-dell` | Filter category hoạt động |
| `/products` → Grid/List | Chuyển đổi view hoạt động |
| `/products` → 3/4/5/6 cột | Đổi số cột hoạt động |
| `/products` → 20/30/50/100 | Đổi page size hoạt động |
| `/products` → Checkbox + Bulk Actions | Bulk delete, sync, export hoạt động |
| `/products/[id]/edit` | Edit page load đúng dữ liệu |
| `/customers` | Customer listing với search |
| `/sales` | Sales dashboard với stats + recent orders |
| `/content` | Content dashboard với 8 shortcut cards |
| `/settings` | Settings page với tabs |
| Header Ctrl+K | Search dialog mở đúng |
| Header Quick Actions | Dropdown mở đúng |
| Header Notifications | Dropdown mở đúng |
| Header User Menu | Profile dropdown mở đúng |
| Mobile: Hamburger | Sidebar overlay mở đúng |

---

## 5. Kiến Trúc Hiện Tại

```
apps/admin-ui/
├── app/
│   ├── (admin)/
│   │   ├── dashboard/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx                    # Listing: grid/list, filter, bulk
│   │   │   ├── [id]/edit/page.tsx          # Edit product
│   │   │   ├── categories/page.tsx
│   │   │   ├── tags/page.tsx
│   │   │   ├── attributes/page.tsx
│   │   │   ├── brands/page.tsx
│   │   │   ├── inventory/page.tsx
│   │   │   ├── sync/page.tsx
│   │   │   └── variants/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx                    # Listing + search + pagination
│   │   │   ├── segments/page.tsx
│   │   │   ├── groups/page.tsx
│   │   │   ├── activity-log/page.tsx
│   │   │   ├── purchase-history/page.tsx
│   │   │   ├── warranty-debt/page.tsx
│   │   │   └── zns/page.tsx
│   │   ├── sales/
│   │   │   ├── page.tsx                    # Dashboard: stats + recent orders
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
│   │   │   ├── page.tsx                    # Dashboard: stats + shortcuts
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
│   │   └── migration/page.tsx               # Redirect → /products/sync
│   ├── api/
│   │   ├── admin/products/check-sku/route.ts
│   │   ├── medusa/[...slug]/route.ts        # Medusa proxy
│   │   ├── woo/[...slug]/route.ts           # WooCommerce proxy
│   │   ├── fetch-image/route.ts              # Image proxy (tránh CORS)
│   │   ├── medusa/upload-media/route.ts     # WordPress media upload
│   │   ├── migration/init/route.ts
│   │   ├── migration/repair/route.ts
│   │   ├── content/                         # Content CRUD + schedules + templates
│   │   ├── ai/                              # AI providers + settings
│   │   └── settings/route.ts
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── admin-layout.tsx                 # Provider + layout refactor
│   │   ├── admin-header.tsx                 # 3-column SaaS header
│   │   ├── admin-sidebar.tsx                # Dynamic NAV_ITEMS sidebar
│   │   ├── admin-mobile-sidebar.tsx
│   │   ├── breadcrumbs.tsx
│   │   ├── global-search.tsx
│   │   ├── quick-actions.tsx
│   │   ├── notification-center.tsx
│   │   └── user-menu.tsx
│   ├── categories/
│   │   ├── category-tree.tsx
│   │   └── category-tree-mobile.tsx
│   └── products/
│       ├── products-table.tsx               # List view
│       ├── product-card-grid.tsx            # Grid view
│       ├── product-card.tsx
│       ├── product-toolbar.tsx              # Search + filters + settings
│       ├── product-pagination.tsx
│       ├── product-bulk-actions.tsx
│       ├── product-category-tree-filter.tsx
│       ├── product-grid-settings.tsx
│       ├── product-form-dialog.tsx
│       ├── product-filters.tsx              # Card-based filter
│       ├── product-list-header.tsx
│       ├── product-edit-form.tsx             # 7 tabs edit
│       ├── product-edit-sidebar.tsx
│       ├── product-basic-tab.tsx
│       ├── product-pricing-tab.tsx
│       ├── product-inventory-tab.tsx
│       ├── product-images-tab.tsx
│       ├── product-seo-tab.tsx
│       ├── product-wordpress-metadata-tab.tsx
│       └── product-categories-tab.tsx
├── lib/
│   ├── navigation.ts                         # NAV_ITEMS dynamic menu
│   ├── company-settings.tsx                  # Company settings context
│   ├── settings-storage.ts                   # LocalStorage settings
│   ├── mock-data.ts
│   └── products/
│       ├── product-filters.ts                # Filter/sort/paginate/adapt helpers
│       └── (extracted helpers)
├── hooks/
│   └── use-ui-settings.tsx                   # UI settings state
└── services/
    ├── medusa-types.ts
    └── medusa.service.ts

apps/backend-ui/
├── apps/backend/
│   └── src/api/admin/custom/route.ts        # Custom Medusa admin API
└── apps/backend/medusa-config.ts            # Medusa v2 config

Media upload structure:
  public/wp-content/uploads/{year}/{month}/{filename}
  Ví dụ: public/wp-content/uploads/2026/04/dell-inspiron-15.jpg
```

---

## 6. Bước Tiếp Theo

### Ngắn hạn

- [ ] Kết nối `ProductEditForm` với PATCH API thực tế (Medusa)
- [ ] Kết nối bulk sync với Medusa API
- [ ] Test grid/list toggle trên nhiều products
- [ ] Test category tree filter với dữ liệu thực
- [ ] Fix website-ui `beVietnamPro` error (pre-existing)

### Trung hạn

- [ ] Virtual scrolling cho products-table khi >1000 items
- [ ] Real-time search với Medusa API
- [ ] Real-time notifications với API
- [ ] Thêm product detail page (`/products/[id]`)
- [ ] Sidebar collapse animation hoàn chỉnh
- [ ] Thêm keyboard shortcuts (Ctrl+N: new product, etc.)

---

## 7. Changelog

### 2026-05-09

- **feat:** Product listing page — grid/list view toggle, search, category tree filter, status/stock filters, sort, bulk actions, pagination
- **feat:** Product edit page — full skeleton với 7 tabs (Basic, Pricing, Inventory, Images, SEO, WordPress Metadata, Categories)
- **feat:** ProductsTable — list view với checkbox multi-select
- **feat:** ProductBulkActions — bulk delete, sync, export, change status/category/tags
- **feat:** ProductCategoryTreeFilter — dropdown Popover với expand/collapse + search
- **feat:** ProductPagination component
- **feat:** ProductGridSettings — columns 3/4/5/6, page size 20/30/50/100, view mode
- **feat:** Active Filter Badges với clear filters
- **feat:** Customer listing page — search, filter, pagination, actions
- **feat:** Sales dashboard — stats cards, recent orders table
- **feat:** Content dashboard — stats + 8 AI content shortcuts
- **feat:** Navigation system — `NAV_ITEMS` dynamic menu từ `lib/navigation.ts`
- **feat:** Sidebar redesign — dynamic menu, expand/collapse, active route highlight
- **feat:** Mobile sidebar — Sheet overlay với full menu
- **feat:** Admin layout refactor — CompanySettingsProvider + UISettings
- **feat:** Migration redirect — `/migration` → `/products/sync`
- **feat:** UI settings hook — `useUISettings()` cho sidebar collapse state
- **feat:** Company settings context — `CompanySettingsProvider` cho logo/name/contact
- **feat:** Product filter helpers — sort, paginate, adapt, rewriteDescriptionImages
- **refactor:** Xóa 8 migration components cũ (gộp vào page)
- **fix:** Grid column responsive classes

### 2026-05-07

- **feat:** Admin UI header redesign - professional 3-column SaaS layout
- **feat:** Breadcrumbs component với tên trang
- **feat:** Search bar + SearchDialog với Ctrl+K shortcut
- **feat:** Quick actions dropdown với 6 hành động
- **feat:** Notification dropdown với 5 loại thông báo mới
- **feat:** User menu dropdown với đầy đủ options
- **feat:** Mobile responsive header
- **fix:** Xóa duplicate standalone user avatar

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse everywhere

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Lưu Ý Bảo Mật

**KHÔNG push lên git:**

- File `.env` chứa credentials (JWT, database URLs, API keys)
- Thư mục `public/wp-content/uploads/`
- Thư mục `public/uploads/`
- File chứa JWT token hoặc API key trong code
- File `apps/admin-ui/.env.example` (template, đã safe để push)

**Đã thêm vào `.gitignore`**

---

## 9. Cách Chạy Monorepo

### Khởi động

```bash
# Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Admin UI (port 3000) - DÙNG PNPM
cd apps/admin-ui
pnpm dev

# KHÔNG dùng: npm run dev (sẽ chạy website-ui)
```

### Build

```bash
# Admin UI
cd apps/admin-ui
pnpm build

# Toàn bộ monorepo
cd "d:\AI PROJECT\mytholaptop-v3"
pnpm build
```

### Media Upload Path

```
Source: WordPress/WooCommerce (e.g., mytholaptop.vn/wp-content/uploads/2026/04/image.jpg)
↓ Download via /api/medusa/upload-media
↓ Save to: apps/admin-ui/public/wp-content/uploads/{year}/{month}/{filename}
↓ Access via: http://localhost:3000/wp-content/uploads/2026/04/image.jpg
```

---

## Task 2: Admin UI Header Redesign (7 May 2026) — Lưu trữ

*(Đã hoàn thành - xem changelog 2026-05-07)*

---

## Task 1: Migration (3 May 2026) — Lưu trữ

*(Đã hoàn thành - xem changelog 2026-05-03)*

---

## Tổng Quan Task (9 May 2026)

Task tiếp tục: **Nâng cấp toàn diện trang Products + Tái cấu trúc Layout/Sidebar/Header**

---

## 1. Đã Làm Gì (Chi Tiết)

### 1.1 Trang Products Nâng Cấp Toàn Diện

**File chính:** `app/(admin)/products/page.tsx`

Thay đổi cấu trúc page:

1. **Grid/List view toggle** — chuyển đổi giữa card grid và table list, lưu vào localStorage `admin-ui.products.viewMode`
2. **ProductToolbar nâng cấp** — search, category tree filter, status filter, stock filter, sort dropdown, grid settings, view mode toggle, refresh
3. **ProductCardGrid cải thiện** — hỗ trợ responsive column classes cho 3/4/5/6 cột
4. **ProductsTable mới** — hiển thị dạng bảng với checkbox chọn nhiều sản phẩm
5. **ProductBulkActions mới** — bulk delete, bulk sync, bulk export, bulk change status/category/tags
6. **ProductPagination** — phân trang với tổng số sản phẩm / trang
7. **Active Filter Badges** — hiển thị các filter đang áp dụng với nút xóa từng filter hoặc xóa tất cả
8. **ProductFormDialog** — dialog tạo sản phẩm mới
9. **LocalStorage persistence** — grid columns, page size, view mode được lưu lại giữa các lần truy cập

### 1.2 Category Tree Filter

**File:** `components/products/product-category-tree-filter.tsx` (tái sử dụng `components/categories/category-tree.tsx`)

- Dropdown Popover hiển thị danh mục dạng phân cấp cha/con
- Expand/collapse các danh mục cha
- Search bên trong dropdown
- Hiển thị path đầy đủ cho danh mục con
- Support cả flat list từ API lẫn nested tree

### 1.3 Product Edit Page (Skeleton hoàn chỉnh)

**File:** `app/(admin)/products/[id]/edit/page.tsx`

- Load sản phẩm từ Medusa API qua `useProduct(id)` hook
- Breadcrumb: Sản phẩm → [Tên sản phẩm] → Chỉnh sửa
- Loading skeleton khi đang tải
- Error state với Alert
- Nút "Quay lại" về trang products
- Tích hợp `ProductEditForm` component (tabs: Basic, Pricing, Inventory, Images, SEO, WordPress Metadata, Categories)

### 1.4 Product Edit Components

| File | Mô tả |
|------|-------|
| `components/products/product-edit-form.tsx` | Main form với Tabs (7 tabs) |
| `components/products/product-edit-sidebar.tsx` | Sidebar hiển thị tóm tắt sản phẩm |
| `components/products/product-basic-tab.tsx` | Tab thông tin cơ bản |
| `components/products/product-pricing-tab.tsx` | Tab giá bán |
| `components/products/product-inventory-tab.tsx` | Tab kho hàng |
| `components/products/product-images-tab.tsx` | Tab hình ảnh (thumbnail + gallery) |
| `components/products/product-seo-tab.tsx` | Tab SEO |
| `components/products/product-wordpress-metadata-tab.tsx` | Tab metadata WordPress (read-only) |
| `components/products/product-categories-tab.tsx` | Tab danh mục |
| `components/products/product-form-dialog.tsx` | Dialog tạo sản phẩm mới |

### 1.5 Customer Pages (Stubs)

**File:** `app/(admin)/customers/page.tsx`

- Danh sách khách hàng từ Medusa API (`useCustomers` hook)
- Search theo tên/email/phone
- Filter theo trạng thái
- Bảng với tên, email, phone, địa chỉ, số đơ, tổng chi tiêu, ngày tạo
- Actions: Xem chi tiết, Xóa
- Pagination 20 sản phẩm/trang

### 1.6 Sales Page (Mock Data)

**File:** `app/(admin)/sales/page.tsx`

- Dashboard tổng quan bán hàng với 4 stat cards: Đơn hàng hôm nay, Doanh thu hôm nay, Đơn chờ xử lý, Đơn hủy
- Biểu đồ mock đơn giản
- Bảng 5 đơn hàng gần nhất với trạng thái thanh toán/order
- Link đến trang chi tiết orders/payments/shipping

### 1.7 Content Page (Stubs)

**File:** `app/(admin)/content/page.tsx`

- Dashboard AI Content với 4 stat cards: Tổng bài viết, Đã xuất bản, Đang lên lịch, Nháp
- Grid 8 shortcut cards: AI Generator, Facebook Posts, Website Posts, Video Scripts, Image Prompts, Calendar, Templates, Library
- Recent posts table với type, title, status, scheduled date, actions

### 1.8 Header Redesign (Từ Task 2)

**File:** `components/layout/admin-header.tsx` (viết lại hoàn toàn)

- Layout 3 cột: LEFT (breadcrumb + page title) / CENTER (search bar) / RIGHT (quick actions + notifications + user)
- Search dialog với Ctrl+K shortcut, nhóm kết quả theo loại
- Quick actions dropdown: Tạo đơn hàng, Thêm sản phẩm, Thêm khách hàng, Tạo bài viết AI, Gửi ZNS, Đồng bộ
- Notification center với 5 loại thông báo
- User menu với profile, settings, đổi mật khẩu, đăng xuất
- Header 68px với backdrop-blur

### 1.9 Sidebar Redesign

**File:** `components/layout/admin-sidebar.tsx` (tái cấu trúc)

- Dynamic `NAV_ITEMS` từ `lib/navigation.ts`
- Expand/collapse với animation
- Active route highlight đỏ brand
- Company logo từ `CompanySettingsProvider`
- Responsive: collapsed trên desktop, mobile sheet
- Sub-items với indent theo depth

### 1.10 Mobile Sidebar

**File:** `components/layout/admin-mobile-sidebar.tsx`

- Sheet overlay cho mobile
- Expand/collapse parent items
- Active route highlight
- Company branding

### 1.11 Admin Layout Refactor

**File:** `components/layout/admin-layout.tsx`

- Tách `AdminLayout` + `AdminLayoutInner`
- `CompanySettingsProvider` wrapper
- `UISettings` cho sidebar collapse state
- Mobile sidebar trigger

### 1.12 Migration Redirect

**File:** `app/(admin)/migration/page.tsx`

- Redirect sang `/products/sync`

### 1.13 Navigation System

**File:** `lib/navigation.ts` (tái tạo)

```typescript
NAV_ITEMS: [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  {
    title: "Sản phẩm",
    icon: Package,
    children: [
      { title: "Quản lý sản phẩm", href: "/products" },
      { title: "Danh mục", href: "/products/categories" },
      { title: "Thẻ", href: "/products/tags" },
      { title: "Thuộc tính", href: "/products/attributes" },
      { title: "Thương hiệu", href: "/products/brands" },
      { title: "Tồn kho", href: "/products/inventory" },
      { title: "Đồng bộ", href: "/products/sync" },
      { title: "Biến thể", href: "/products/variants" },
    ]
  },
  // ... Sales, Customers, Content, Settings, Staff
]
```

### 1.14 Product Filter Helper Nâng Cấp

**File:** `lib/products/product-filters.ts` (mở rộng)

```typescript
export type StockStatus = "instock" | "outofstock" | "onbackorder" | "unknown" | "all"
export type ProductStatus = "draft" | "published" | "proposed" | "rejected" | "archived" | "all"
export type SortOption = "newest_date" | "oldest_date" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_asc"

export function filterProductsBySearch(products, search)
export function filterProductsByCategoryTree(products, categoryId, categoryMap)
export function filterProductsByStatus(products, status)
export function filterProductsByStock(products, stock)
export function paginateProducts(products, page, pageSize)
export function sortProducts(products, sort)
export function adaptProduct(p: MedusaProduct): AdaptedProduct
export function rewriteDescriptionImages(html): string  // proxy /api/fetch-image
export function getStockBadgeVariant(status): "success" | "warning" | "destructive" | "secondary"
export function getStatusVariant(status): "success" | "default" | "secondary"
```

### 1.15 UI Settings Hook

**File:** `hooks/use-ui-settings.tsx` (mới)

```typescript
interface UISettings {
  sidebarCollapsedDefault: boolean
}
export function loadUISettings(): UISettings
export function saveUISettings(settings: UISettings): void
export function useUISettings()
```

### 1.16 Company Settings Context

**File:** `lib/company-settings.tsx` (mới)

```typescript
interface CompanySettings {
  name: string
  logoUrl: string
  website: string
  phone: string
  address: string
}
export const DEFAULT_COMPANY: CompanySettings
export class CompanySettingsProvider
export function loadCompanySettings(): CompanySettings
export function saveCompanySettings(settings: CompanySettings): void
```

### 1.17 API Routes

| Route | Mô tả |
|-------|-------|
| `api/admin/products/check-sku` | Check SKU trùng lặp |
| `api/content/*` | CRUD content items, schedules, templates |
| `api/ai/*` | AI providers, settings |
| `api/settings` | App settings |

### 1.18 Globals CSS

**File:** `app/globals.css`

- Import Google Fonts (Be Vietnam Pro)
- CSS custom properties cho shadcn/ui
- Custom scrollbar styling
- Smooth transitions

---

## 2. File Đã Sửa / Tạo

### Tạo mới (35 files)

| File | Mô tả |
|------|-------|
| `app/(admin)/products/[id]/edit/page.tsx` | Product edit page |
| `app/(admin)/products/page.tsx` | Product listing page (viết lại) |
| `app/(admin)/customers/page.tsx` | Customer listing page |
| `app/(admin)/sales/page.tsx` | Sales dashboard page |
| `app/(admin)/content/page.tsx` | Content dashboard page |
| `app/(admin)/migration/page.tsx` | Migration redirect |
| `components/products/product-toolbar.tsx` | Toolbar với tất cả filter |
| `components/products/products-table.tsx` | Table view cho products |
| `components/products/product-bulk-actions.tsx` | Bulk action bar |
| `components/products/product-card-grid.tsx` | Grid view (cải thiện) |
| `components/products/product-pagination.tsx` | Pagination component |
| `components/products/product-category-tree-filter.tsx` | Category tree dropdown filter |
| `components/products/product-edit-form.tsx` | Main edit form |
| `components/products/product-edit-sidebar.tsx` | Edit sidebar |
| `components/products/product-basic-tab.tsx` | Basic info tab |
| `components/products/product-pricing-tab.tsx` | Pricing tab |
| `components/products/product-inventory-tab.tsx` | Inventory tab |
| `components/products/product-images-tab.tsx` | Images tab |
| `components/products/product-seo-tab.tsx` | SEO tab |
| `components/products/product-wordpress-metadata-tab.tsx` | WP metadata tab |
| `components/products/product-categories-tab.tsx` | Categories tab |
| `components/products/product-form-dialog.tsx` | Create product dialog |
| `components/products/product-filters.tsx` | Filters component (Card-based) |
| `components/products/product-list-header.tsx` | List header |
| `components/products/product-grid-settings.tsx` | Grid/list settings |
| `components/layout/admin-header.tsx` | Viết lại hoàn toàn (3-column SaaS layout) |
| `components/layout/admin-sidebar.tsx` | Tái cấu trúc sidebar |
| `components/layout/admin-mobile-sidebar.tsx` | Mobile sidebar |
| `components/layout/admin-layout.tsx` | Layout refactor |
| `components/categories/category-tree.tsx` | Category tree component |
| `components/categories/category-tree-mobile.tsx` | Mobile category tree |
| `hooks/use-ui-settings.tsx` | UI settings state hook |
| `lib/company-settings.tsx` | Company settings context |
| `lib/navigation.ts` | NAV_ITEMS navigation system |
| `lib/products/product-filters.ts` | Filter/sort/paginate helpers |
| `app/api/admin/products/check-sku/route.ts` | SKU check API |

### Sửa đổi

| File | Thay đổi |
|------|----------|
| `app/globals.css` | Thêm Google Fonts, custom scrollbar |
| `tsconfig.json` | Cập nhật path aliases |
| `components/layout/admin-header.tsx` | Viết lại hoàn toàn (3-column layout) |
| `components/layout/admin-layout.tsx` | Thêm CompanySettingsProvider, refactor |
| `components/layout/admin-sidebar.tsx` | Tái cấu trúc với NAV_ITEMS |
| `components/layout/admin-mobile-sidebar.tsx` | Tái cấu trúc mobile |
| `components/products/product-card-grid.tsx` | Cải thiện column classes |
| `components/products/product-card.tsx` | Cải thiện card display |
| `components/products/product-toolbar.tsx` | Nâng cấp với đầy đủ filter |
| `components/products/product-pagination.tsx` | Pagination logic |
| `lib/products/product-filters.ts` | Mở rộng với sort/paginate/adapt |
| `app/(admin)/migration/page.tsx` | Redirect sang /products/sync |
| `app/(admin)/settings/page.tsx` | Tích hợp settings storage |

### Xóa (không còn dùng)

| File | Lý do |
|------|-------|
| `components/migration/category-mapping-view.tsx` | Gộp vào migration page |
| `components/migration/migration-form.tsx` | Gộp vào migration page |
| `components/migration/migration-log.tsx` | Gộp vào migration page |
| `components/migration/migration-options-popup.tsx` | Gộp vào migration page |
| `components/migration/migration-options.tsx` | Gộp vào migration page |
| `components/migration/migration-preview.tsx` | Gộp vào migration page |
| `components/migration/migration-progress.tsx` | Gộp vào migration page |
| `components/migration/product-debug-view.tsx` | Gộp vào migration page |

---

## 3. Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | `products-table.tsx` có thể cần cải thiện performance khi có >1000 products | Trung bình | Cân nhắc virtual scrolling |
| 2 | `ProductEditForm` cần kết nối PATCH API thực tế | Cao | Hiện chỉ có skeleton + mock |
| 3 | `bulk sync` trong `ProductBulkActions` là mock | Trung bình | Cần kết nối Medusa API |
| 4 | Sidebar collapse animation chưa hoàn hảo | Thấp | Cần thêm transition CSS |
| 5 | File `website-ui` có lỗi `beVietnamPro is not defined` | Cao | Pre-existing, không liên quan admin-ui |
| 6 | Dev server có thể chạy sai app nếu dùng `npm` thay vì `pnpm` | Thấp | Luôn dùng `pnpm dev` |

---

## 4. Lệnh Test

### 4.1 Build & TypeScript

```bash
# Build admin-ui (chạy từ root monorepo)
cd "d:\AI PROJECT\mytholaptop-v3"
pnpm --filter admin-ui build

# Hoặc chạy trực tiếp trong admin-ui
cd apps/admin-ui
pnpm build
```

### 4.2 Development Server

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000) - DÙNG PNPM
cd apps/admin-ui
pnpm dev

# KHÔNG dùng: npm run dev (sẽ chạy website-ui)
```

### 4.3 Test Routes

Mở browser tại `http://localhost:3000` và kiểm tra:

| Route | Kiểm tra |
|-------|----------|
| `/dashboard` | Header hiển thị "Tổng quan", sidebar collapse |
| `/products` | Grid/List toggle, search, category filter, status filter, stock filter, sort, bulk select, pagination |
| `/products?q=dell` | Search hoạt động |
| `/products?status=published` | Filter status hoạt động |
| `/products?category=laptop-dell` | Filter category hoạt động |
| `/products` → Grid/List | Chuyển đổi view hoạt động |
| `/products` → 3/4/5/6 cột | Đổi số cột hoạt động |
| `/products` → 20/30/50/100 | Đổi page size hoạt động |
| `/products` → Checkbox + Bulk Actions | Bulk delete, sync, export hoạt động |
| `/products/[id]/edit` | Edit page load đúng dữ liệu |
| `/customers` | Customer listing với search |
| `/sales` | Sales dashboard với stats + recent orders |
| `/content` | Content dashboard với 8 shortcut cards |
| `/settings` | Settings page với tabs |
| Header Ctrl+K | Search dialog mở đúng |
| Header Quick Actions | Dropdown mở đúng |
| Header Notifications | Dropdown mở đúng |
| Header User Menu | Profile dropdown mở đúng |
| Mobile: Hamburger | Sidebar overlay mở đúng |

---

## 5. Kiến Trúc Hiện Tại

```
apps/admin-ui/
├── app/
│   ├── (admin)/
│   │   ├── dashboard/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx                    # Listing: grid/list, filter, bulk
│   │   │   ├── [id]/edit/page.tsx          # Edit product
│   │   │   ├── categories/page.tsx
│   │   │   ├── tags/page.tsx
│   │   │   ├── attributes/page.tsx
│   │   │   ├── brands/page.tsx
│   │   │   ├── inventory/page.tsx
│   │   │   ├── sync/page.tsx
│   │   │   └── variants/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx                    # Listing + search + pagination
│   │   │   ├── segments/page.tsx
│   │   │   ├── groups/page.tsx
│   │   │   ├── activity-log/page.tsx
│   │   │   ├── purchase-history/page.tsx
│   │   │   ├── warranty-debt/page.tsx
│   │   │   └── zns/page.tsx
│   │   ├── sales/
│   │   │   ├── page.tsx                    # Dashboard: stats + recent orders
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
│   │   │   ├── page.tsx                    # Dashboard: stats + shortcuts
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
│   │   └── migration/page.tsx               # Redirect → /products/sync
│   ├── api/
│   │   ├── admin/products/check-sku/route.ts
│   │   ├── medusa/[...slug]/route.ts        # Medusa proxy
│   │   ├── woo/[...slug]/route.ts           # WooCommerce proxy
│   │   ├── fetch-image/route.ts              # Image proxy (tránh CORS)
│   │   ├── medusa/upload-media/route.ts     # WordPress media upload
│   │   ├── migration/init/route.ts
│   │   ├── migration/repair/route.ts
│   │   ├── content/                         # Content CRUD + schedules + templates
│   │   ├── ai/                              # AI providers + settings
│   │   └── settings/route.ts
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── admin-layout.tsx                 # Provider + layout refactor
│   │   ├── admin-header.tsx                 # 3-column SaaS header
│   │   ├── admin-sidebar.tsx                # Dynamic NAV_ITEMS sidebar
│   │   ├── admin-mobile-sidebar.tsx
│   │   ├── breadcrumbs.tsx
│   │   ├── global-search.tsx
│   │   ├── quick-actions.tsx
│   │   ├── notification-center.tsx
│   │   └── user-menu.tsx
│   ├── categories/
│   │   ├── category-tree.tsx
│   │   └── category-tree-mobile.tsx
│   └── products/
│       ├── products-table.tsx               # List view
│       ├── product-card-grid.tsx            # Grid view
│       ├── product-card.tsx
│       ├── product-toolbar.tsx              # Search + filters + settings
│       ├── product-pagination.tsx
│       ├── product-bulk-actions.tsx
│       ├── product-category-tree-filter.tsx
│       ├── product-grid-settings.tsx
│       ├── product-form-dialog.tsx
│       ├── product-filters.tsx              # Card-based filter
│       ├── product-list-header.tsx
│       ├── product-edit-form.tsx             # 7 tabs edit
│       ├── product-edit-sidebar.tsx
│       ├── product-basic-tab.tsx
│       ├── product-pricing-tab.tsx
│       ├── product-inventory-tab.tsx
│       ├── product-images-tab.tsx
│       ├── product-seo-tab.tsx
│       ├── product-wordpress-metadata-tab.tsx
│       └── product-categories-tab.tsx
├── lib/
│   ├── navigation.ts                         # NAV_ITEMS dynamic menu
│   ├── company-settings.tsx                  # Company settings context
│   ├── settings-storage.ts                   # LocalStorage settings
│   ├── mock-data.ts
│   └── products/
│       ├── product-filters.ts                # Filter/sort/paginate/adapt helpers
│       └── (extracted helpers)
├── hooks/
│   └── use-ui-settings.tsx                   # UI settings state
└── services/
    ├── medusa-types.ts
    └── medusa.service.ts

apps/backend-ui/
├── apps/backend/
│   └── src/api/admin/custom/route.ts        # Custom Medusa admin API
└── apps/backend/medusa-config.ts            # Medusa v2 config

Media upload structure:
  public/wp-content/uploads/{year}/{month}/{filename}
  Ví dụ: public/wp-content/uploads/2026/04/dell-inspiron-15.jpg
```

---

## 6. Bước Tiếp Theo

### Ngắn hạn

- [ ] Kết nối `ProductEditForm` với PATCH API thực tế (Medusa)
- [ ] Kết nối bulk sync với Medusa API
- [ ] Test grid/list toggle trên nhiều products
- [ ] Test category tree filter với dữ liệu thực
- [ ] Fix website-ui `beVietnamPro` error (pre-existing)

### Trung hạn

- [ ] Virtual scrolling cho products-table khi >1000 items
- [ ] Real-time search với Medusa API
- [ ] Real-time notifications với API
- [ ] Thêm product detail page (`/products/[id]`)
- [ ] Sidebar collapse animation hoàn chỉnh
- [ ] Thêm keyboard shortcuts (Ctrl+N: new product, etc.)

---

## 7. Changelog

### 2026-05-09

- **feat:** Product listing page — grid/list view toggle, search, category tree filter, status/stock filters, sort, bulk actions, pagination
- **feat:** Product edit page — full skeleton với 7 tabs (Basic, Pricing, Inventory, Images, SEO, WordPress Metadata, Categories)
- **feat:** ProductsTable — list view với checkbox multi-select
- **feat:** ProductBulkActions — bulk delete, sync, export, change status/category/tags
- **feat:** ProductCategoryTreeFilter — dropdown Popover với expand/collapse + search
- **feat:** ProductPagination component
- **feat:** ProductGridSettings — columns 3/4/5/6, page size 20/30/50/100, view mode
- **feat:** Active Filter Badges với clear filters
- **feat:** Customer listing page — search, filter, pagination, actions
- **feat:** Sales dashboard — stats cards, recent orders table
- **feat:** Content dashboard — stats + 8 AI content shortcuts
- **feat:** Navigation system — `NAV_ITEMS` dynamic menu từ `lib/navigation.ts`
- **feat:** Sidebar redesign — dynamic menu, expand/collapse, active route highlight
- **feat:** Mobile sidebar — Sheet overlay với full menu
- **feat:** Admin layout refactor — CompanySettingsProvider + UISettings
- **feat:** Migration redirect — `/migration` → `/products/sync`
- **feat:** UI settings hook — `useUISettings()` cho sidebar collapse state
- **feat:** Company settings context — `CompanySettingsProvider` cho logo/name/contact
- **feat:** Product filter helpers — sort, paginate, adapt, rewriteDescriptionImages
- **refactor:** Xóa 8 migration components cũ (gộp vào page)
- **fix:** Grid column responsive classes

### 2026-05-07

- **feat:** Admin UI header redesign - professional 3-column SaaS layout
- **feat:** Breadcrumbs component với tên trang
- **feat:** Search bar + SearchDialog với Ctrl+K shortcut
- **feat:** Quick actions dropdown với 6 hành động
- **feat:** Notification dropdown với 5 loại thông báo mới
- **feat:** User menu dropdown với đầy đủ options
- **feat:** Mobile responsive header
- **fix:** Xóa duplicate standalone user avatar

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse everywhere

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Lưu Ý Bảo Mật

**KHÔNG push lên git:**

- File `.env` chứa credentials (JWT, database URLs, API keys)
- Thư mục `public/wp-content/uploads/`
- Thư mục `public/uploads/`
- File chứa JWT token hoặc API key trong code
- File `apps/admin-ui/.env.example` (template, đã safe để push)

**Đã thêm vào `.gitignore`**

---

## 9. Cách Chạy Monorepo

### Khởi động

```bash
# Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Admin UI (port 3000) - DÙNG PNPM
cd apps/admin-ui
pnpm dev

# KHÔNG dùng: npm run dev (sẽ chạy website-ui)
```

### Build

```bash
# Admin UI
cd apps/admin-ui
pnpm build

# Toàn bộ monorepo
cd "d:\AI PROJECT\mytholaptop-v3"
pnpm build
```

### Media Upload Path

```
Source: WordPress/WooCommerce (e.g., mytholaptop.vn/wp-content/uploads/2026/04/image.jpg)
↓ Download via /api/medusa/upload-media
↓ Save to: apps/admin-ui/public/wp-content/uploads/{year}/{month}/{filename}
↓ Access via: http://localhost:3000/wp-content/uploads/2026/04/image.jpg
```

---

## Task 2: Admin UI Header Redesign (7 May 2026) — Lưu trữ

*(Đã hoàn thành - xem changelog 2026-05-07)*

---

## Task 1: Migration (3 May 2026) — Lưu trữ

*(Đã hoàn thành - xem changelog 2026-05-03)*

---

## Tổng Quan Task (3 May 2026 - Buổi Chiều)

Task tiếp tục: **Cải thiện WordPress media migration — cấu trúc thư mục, deduplication, overwrite**

---

## 1. Đã Làm Gì

### 1.1 Đổi Cấu Trúc Lưu Ảnh Sang WordPress Format

**Vấn đề:** Ảnh lưu vào `uploads/migration/wordpress/media/{hash}/{filename}` không giữ nguyên URL SEO.

**Giải pháp:** Lưu theo cấu trúc WordPress chuẩn: `wp-content/uploads/{year}/{month}/{filename}`

**Files sửa:**

| File | Thay đổi |
|------|-----------|
| `app/api/medusa/upload-media/route.ts` | Đổi path sang `public/wp-content/uploads/{year}/{month}/{filename}`; Extract year/month từ WordPress URL gốc |
| `lib/media-helpers.ts` | Cập nhật `buildRelativePath()` và `buildStoragePath()` |
| `services/media-migration.service.ts` | Fix mapping để `rewriteHtmlImages()` hoạt động đúng với original URLs |

**Cấu trúc mới:**
```
public/wp-content/uploads/{year}/{month}/{filename}
Ví dụ: public/wp-content/uploads/2026/04/dell-inspiron-15.jpg
```

**Lợi ích:**
- URL giữ nguyên: `/wp-content/uploads/2026/04/image.jpg`
- SEO được bảo toàn
- Khi deploy, chỉ cần copy thư mục `wp-content/uploads/` sang server

### 1.2 Sửa Logic Overwrite Thay Vì Tạo File Mới

**Vấn đề:** Khi trùng filename, code cũ tạo file mới `{basename}-1.jpg`, gây tăng dung lượng.

**Fix:** Khi file đã tồn tại → ghi đè (overwrite)

**File sửa:** `app/api/medusa/upload-media/route.ts`

```typescript
// Trước: Tạo file mới nếu trùng
if (fsSync.existsSync(absolutePath)) {
  const newFileName = `${base}-${counter}${ext}`; // → file-1.jpg
}

// Sau: Ghi đè nếu trùng
fsSync.writeFileSync(absolutePath, buffer); // Luôn overwrite
```

### 1.3 Fix Rewrite HTML Images Mapping

**Vấn đề:** `rewriteHtmlImages()` dùng `normalizeUrl()` để match URLs, nhưng media service truyền hash keys.

**Fix:** Media service build `urlToRelativePath` mapping với original URLs thay vì hashes.

**File sửa:** `services/media-migration.service.ts`

```typescript
// Build URL → relativePath mapping (not hash → relativePath)
// rewriteHtmlImages uses normalizeUrl() internally to match
const urlToRelativePath: Record<string, string> = {};
for (const url of allSourceUrls) {
  const hash = this.hashSync(url);
  const relPath = urlHashToRelativePath[hash];
  if (relPath) {
    urlToRelativePath[url] = relPath;
  }
}
```

### 1.4 Deduplication Logic (Đã Có Từ Trước)

**Logic hoạt động:**
1. Mỗi URL được hash → lưu vào global pool (`localStorage`)
2. Khi xử lý product, check pool trước:
   - `status === "downloaded"` → reuse, không tải lại
   - `status === "pending"` → download mới
3. Thumbnail + gallery + description cùng 1 URL → chỉ tải 1 lần

---

## 2. Các Vấn Đề Đã Phát Hiện và Fix

### 2.1 Bug Fixes

| # | Bug | Fix |
|---|-----|-----|
| 1 | Media lưu vào `uploads/migration/wordpress/media/{hash}/` | Đổi sang `wp-content/uploads/{year}/{month}/{filename}` |
| 2 | Trùng filename tạo file mới `-1`, `-2` | Ghi đè (overwrite) thay vì tạo mới |
| 3 | `rewriteHtmlImages()` không match được URLs | Build mapping với original URLs thay vì hashes |
| 4 | Dev server chạy code cũ sau khi edit | Kill + restart dev server |

---

## 3. Các Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | **Cần verify media migration thực tế** | Cao | Chạy migration với nhiều ảnh để test deduplication |
| 2 | **Verify HTML rewrite** cho description images | Trung bình | Kiểm tra ảnh trong mô tả được rewrite đúng |
| 3 | **LocalStorage pool** cần persist qua sessions | Trung bình | Pool nên được backup/restore nếu user clear browser |
| 4 | **Progress UI** cho media download | Thấp | Hiển thị progress khi tải nhiều ảnh |

---

## 4. Lệnh Test

### 4.1 Chạy Development Servers

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000)
cd apps/admin-ui
npm run dev
```

### 4.2 Build & Lint

```bash
cd apps/admin-ui
npm run build
npm run lint
```

### 4.3 Test Media Migration Flow

1. Mở http://localhost:3000/migration
2. Điền config (WooCommerce URL, credentials, Medusa backend URL)
3. Chọn **Sản phẩm**
4. Click **Start Migration**
5. Quan sát:
   - Ảnh được tải về `public/wp-content/uploads/{year}/{month}/`
   - Trùng URL → log "Reuse existing" (không tải lại)
   - Trùng filename → ghi đè (không tạo file mới)

### 4.4 Verify Deduplication

1. Migration product A có 5 ảnh
2. Migration product B có 3 ảnh (2 trùng với A)
3. Kiểm tra:
   - Chỉ 6 files trong uploads (5 + 1 mới)
   - Log có "Reuse existing" cho 2 ảnh trùng

---

## 5. Kiến Trúc Hiện Tại

```
apps/
├── admin-ui/                          # Next.js 15 + App Router
│   ├── public/
│   │   └── wp-content/
│   │       └── uploads/               # Media upload destination (WordPress structure)
│   │           └── {year}/{month}/   # Ví dụ: 2026/04/image.jpg
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── migration/page.tsx     # Migration UI
│   │   │   ├── products/page.tsx      # Product listing
│   │   │   └── categories/page.tsx    # Category listing
│   │   └── api/
│   │       ├── medusa/
│   │       │   ├── upload-media/      # Media upload handler (WordPress structure)
│   │       │   └── [...slug]/         # Medusa proxy
│   │       ├── fetch-image/           # Proxy để fetch ảnh từ WordPress (tránh CORS)
│   │       └── woo/[...slug]/         # WooCommerce proxy
│   ├── components/migration/
│   │   ├── migration-options-popup.tsx
│   │   └── migration-progress.tsx
│   ├── services/
│   │   ├── migration.service.ts        # Main migration flow
│   │   ├── medusa.service.ts          # Medusa API calls + inventory update
│   │   └── media-migration.service.ts  # Media deduplication pool
│   └── lib/
│       ├── media-helpers.ts           # URL normalize, rewrite HTML, sanitize
│       └── products/product-filters.ts
│
└── backend-ui/                         # Medusa v2
    └── apps/backend/                   # Port 9000
```

---

## 6. Bước Tiếp Theo

### 6.1 Ngắn Hạn (Hôm Nay)

- [ ] **Verify media deduplication** — Chạy migration với products có ảnh trùng
- [ ] **Verify HTML rewrite** — Kiểm tra ảnh trong description được rewrite đúng URL mới
- [ ] **Verify overwrite** — Kiểm tra trùng filename không tạo file mới

### 6.2 Trung Hạn

- [ ] **Backup/restore media pool** — Export/import localStorage pool
- [ ] **Media progress UI** — Progress bar khi tải nhiều ảnh
- [ ] **Retry failed images** — Thêm tuỳ chọn retry cho ảnh fail
- [ ] **Image CDN integration** — Hỗ trợ upload lên Cloudflare R2/S3

---

## 7. Changelog

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse từ pool

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Commit Message Đề Xuất

### Conventional Commits

```
feat(migration): WordPress media structure with deduplication

- Change upload path to wp-content/uploads/{year}/{month}/{filename}
  preserving original WordPress URLs for SEO
- Extract year/month from source WordPress URL
- Overwrite existing files instead of creating -1, -2 copies
- Fix rewriteHtmlImages() to use original URLs instead of hashes
- Media deduplication pool: same URL = download once, reuse everywhere
- Add wp-content/uploads/ to .gitignore
```

---

## 9. Cách Chạy Monorepo

### Cấu trúc hiện tại

- Root: pnpm workspace (pnpm-workspace.yaml)
- admin-ui: standalone Next.js 15 app với TypeScript
- backend-ui: Medusa v2 standalone app

### Khởi động

```bash
# Backend Medusa
cd apps/backend-ui/apps/backend
npm run dev  # Port 9000

# Admin UI (terminal khác)
cd apps/admin-ui
npm run dev  # Port 3000
```

### Media Upload Path

```
Source: WordPress/WooCommerce (e.g., mytholaptop.vn/wp-content/uploads/2026/04/image.jpg)
↓ Download via /api/medusa/upload-media
↓ Save to: apps/admin-ui/public/wp-content/uploads/{year}/{month}/{filename}
↓ Access via: http://localhost:3000/wp-content/uploads/2026/04/image.jpg
```

**Lưu ý bảo mật:**
- Không push các file `.env` lên git
- Không push thư mục `public/wp-content/uploads/` và `public/uploads/` lên git
- Đã thêm vào `.gitignore`

---

## Task 2: Admin UI Header Redesign (7 May 2026)

### Tổng quan

Redesign header admin-ui thành layout 3 cột chuyên nghiệp theo phong cách SaaS dashboard.

---

## 1. Đã Làm Gì

### 1.1 Tạo mới 5 component header

| File | Mô tả |
|------|--------|
| `components/layout/breadcrumbs.tsx` | Breadcrumb tự động từ pathname, nhãn tiếng Việt |
| `components/layout/global-search.tsx` | Command palette (Ctrl+K), 40+ mục tìm kiếm |
| `components/layout/quick-actions.tsx` | Dropdown với 6 hành động nhanh |
| `components/layout/notification-center.tsx` | Type definitions + mock notification data |
| `components/layout/user-menu.tsx` | User profile dropdown với avatar, role |

### 1.2 Redesign hoàn toàn admin-header.tsx

**Layout 3 cột:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ LEFT (auto)    │ CENTER (flex-1)         │ RIGHT (ml-auto)          │
│ Breadcrumb     │ Search bar 440px        │ Quick action │ Notif │ User │
│ + Page title   │ (centered)              │ + badge     │        │       │
└──────────────────────────────────────────────────────────────────────┘
```

**Thay đổi chính:**

1. **Header cao 68px**, border đậm dưới, nền trắng có backdrop-blur
2. **LEFT**: Breadcrumb nhỏ gọn (text-xs) + tên trang đậm (visible trên ≥xl)
3. **CENTER**: Search bar 440px centered, hover đỏ brand, placeholder "Tìm sản phẩm, khách hàng, đơn hàng, SKU...", shortcut `Ctrl K`
4. **RIGHT**: Cân đối:
   - Nút "Tạo nhanh" → đỏ brand `bg-red-600 hover:bg-red-700`
   - Chuông thông báo với badge đỏ
   - Avatar user + tên + vai trò (≥xl)
5. **Search Dialog**: Popup Dialog khi click search, nhóm kết quả theo Sản phẩm / Khách hàng / Đơn hàng / Nội dung, hướng dẫn bàn phím
6. **Quick actions mới**: Tạo đơn hàng, Thêm sản phẩm, Thêm khách hàng, Tạo bài viết AI, Gửi ZNS, Đồng bộ hàng hoá
7. **Notifications mới**: Đơn hàng mới, Sản phẩm sắp hết hàng, ZNS gửi thất bại, Đồng bộ WooCommerce lỗi, Khách hàng cần chăm sóc
8. **User menu đầy đủ**: Hồ sơ cá nhân, Cài đặt tài khoản, Đổi mật khẩu, Đăng xuất
9. **Mobile responsive**: Hamburger + breadcrumb + icon search + avatar nhỏ gọn

### 1.3 Kiến trúc gộp

Các sub-component được inline vào `admin-header.tsx` để:
- Tránh prop drilling
- Tất cả state (notifications, search open) nằm trong 1 file
- Responsive breakpoints dễ kiểm soát

---

## 2. File Đã Sửa / Tạo

| File | Trạng thái | Ghi chú |
|------|-----------|---------|
| `components/layout/admin-header.tsx` | Viết lại hoàn toàn | 3-column layout, tất cả logic inline |
| `components/layout/breadcrumbs.tsx` | Tạo mới | Tái sử dụng được ở chỗ khác |
| `components/layout/global-search.tsx` | Tạo mới | Command palette component |
| `components/layout/quick-actions.tsx` | Tạo mới | DropdownMenu quick actions |
| `components/layout/notification-center.tsx` | Tạo mới | Types + mock data |
| `components/layout/user-menu.tsx` | Tạo mới | User dropdown profile |
| `components/layout/admin-layout.tsx` | Cập nhật nhỏ | Bỏ wrapper div của header |

---

## 3. Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | File `website-ui` có lỗi `beVietnamPro is not defined` | Cao | Pre-existing, không liên quan admin-ui |
| 2 | Dev server chạy `website-ui` (port 3001) thay vì `admin-ui` | Thấp | Terminal 17 đang chạy sai app |

---

## 4. Lệnh Test

### 4.1 Build & TypeScript

```bash
# Build admin-ui (chạy từ root monorepo)
cd d:\AI PROJECT\mytholaptop-v3
pnpm --filter admin-ui build

# Hoặc chạy trực tiếp trong admin-ui
cd apps/admin-ui
pnpm build
```

### 4.2 Development Server

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000) - DÙNG PUNPM
cd apps/admin-ui
pnpm dev

# KHÔNG dùng: npm run dev (sẽ chạy website-ui)
```

### 4.3 Test Routes

Mở browser tại `http://localhost:3000` và kiểm tra:

- `/dashboard` - Header hiển thị "Tổng quan"
- `/products` - Header hiển thị "Sản phẩm"
- `/content` - Header hiển thị "Nội dung"
- `/sales` - Header hiển thị "Bán hàng"
- `/customers/activity-log` - Header hiển thị "Nhật ký tương tác"
- `/settings` - Header hiển thị "Cài đặt"

Kiểm tra:
- [ ] Header cân đối, không có khoảng trắng trống lớn bên phải
- [ ] Avatar user không bị trùng lặp
- [ ] Dropdown "Tạo nhanh" mở đúng
- [ ] Dropdown thông báo mở đúng
- [ ] Dropdown user menu mở đúng
- [ ] Click search → Dialog mở đúng
- [ ] Ctrl+K → Dialog search mở đúng
- [ ] Mobile: hamburger + icon search + avatar hiển thị đúng

---

## 5. Commit Message

```
feat(admin-ui): redesign header with professional 3-column SaaS layout

- Redesign admin-header.tsx with LEFT/CENTER/RIGHT layout structure
- Add inline breadcrumbs + page title display in header
- Add centered 440px search bar with Ctrl+K shortcut and search dialog
- Add SearchDialog component with grouped results (Sản phẩm/Khách hàng/Đơn hàng/Nội dung)
- Add quick action dropdown: Tạo đơn hàng, Thêm sản phẩm, Thêm khách hàng, Tạo bài viết AI, Gửi ZNS, Đồng bộ
- Add notification dropdown with 5 new notification types
- Add user profile dropdown: Hồ sơ cá nhân, Cài đặt tài khoản, Đổi mật khẩu, Đăng xuất
- Mobile responsive: hamburger + breadcrumb + icon search + compact avatar
- Create reusable breadcrumbs.tsx, global-search.tsx, quick-actions.tsx, notification-center.tsx, user-menu.tsx
- Header height 68px with backdrop-blur and border-bottom
```

---

## 6. Bước Tiếp Theo

### Ngắn hạn

- [ ] Test header trên các route còn lại
- [ ] Fix website-ui `beVietnamPro` error (pre-existing)
- [ ] Đảm bảo dev server admin-ui chạy đúng port 3000

### Trung hạn

- [ ] Hoàn thiện sidebar collapse/expand animation
- [ ] Thêm page title component cho các trang
- [ ] Cải thiện notification service thực tế (API call)
- [ ] Thêm real-time search với API

---

## 7. Changelog

### 2026-05-07

- **feat:** Admin UI header redesign - professional 3-column SaaS layout
- **feat:** Breadcrumbs component với tên trang
- **feat:** Search bar + SearchDialog với Ctrl+K shortcut
- **feat:** Quick actions dropdown với 6 hành động
- **feat:** Notification dropdown với 5 loại thông báo mới
- **feat:** User menu dropdown với đầy đủ options
- **feat:** Mobile responsive header
- **fix:** Xóa duplicate standalone user avatar

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse everywhere

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Lưu Ý Bảo Mật

**KHÔNG push lên git:**
- File `.env` chứa credentials
- Thư mục `public/wp-content/uploads/`
- Thư mục `public/uploads/`
- File chứa JWT token hoặc API key

**Đã thêm vào `.gitignore`**

---

## 9. Cách Chạy Monorepo

### Khởi động

```bash
# Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Admin UI (port 3000) - DÙNG PUNPM
cd apps/admin-ui
pnpm dev

# Website UI (port 3001) - nếu cần
cd apps/website-ui
npm run dev
```

### Build

```bash
# Admin UI
cd apps/admin-ui
pnpm build

# Toàn bộ monorepo
cd d:\AI PROJECT\mytholaptop-v3
pnpm build
```

---

## Task 1: Migration (3 May 2026) — Lưu trữ

*(Đã hoàn thành - xem commit trước)*

---

## Tổng Quan Task (3 May 2026 - Buổi Chiều)

Task tiếp tục: **Cải thiện WordPress media migration — cấu trúc thư mục, deduplication, overwrite**

---

## 1. Đã Làm Gì

### 1.1 Đổi Cấu Trúc Lưu Ảnh Sang WordPress Format

**Vấn đề:** Ảnh lưu vào `uploads/migration/wordpress/media/{hash}/{filename}` không giữ nguyên URL SEO.

**Giải pháp:** Lưu theo cấu trúc WordPress chuẩn: `wp-content/uploads/{year}/{month}/{filename}`

**Files sửa:**

| File | Thay đổi |
|------|-----------|
| `app/api/medusa/upload-media/route.ts` | Đổi path sang `public/wp-content/uploads/{year}/{month}/{filename}`; Extract year/month từ WordPress URL gốc |
| `lib/media-helpers.ts` | Cập nhật `buildRelativePath()` và `buildStoragePath()` |
| `services/media-migration.service.ts` | Fix mapping để `rewriteHtmlImages()` hoạt động đúng với original URLs |

**Cấu trúc mới:**
```
public/wp-content/uploads/{year}/{month}/{filename}
Ví dụ: public/wp-content/uploads/2026/04/dell-inspiron-15.jpg
```

**Lợi ích:**
- URL giữ nguyên: `/wp-content/uploads/2026/04/image.jpg`
- SEO được bảo toàn
- Khi deploy, chỉ cần copy thư mục `wp-content/uploads/` sang server

### 1.2 Sửa Logic Overwrite Thay Vì Tạo File Mới

**Vấn đề:** Khi trùng filename, code cũ tạo file mới `{basename}-1.jpg`, gây tăng dung lượng.

**Fix:** Khi file đã tồn tại → ghi đè (overwrite)

**File sửa:** `app/api/medusa/upload-media/route.ts`

```typescript
// Trước: Tạo file mới nếu trùng
if (fsSync.existsSync(absolutePath)) {
  const newFileName = `${base}-${counter}${ext}`; // → file-1.jpg
}

// Sau: Ghi đè nếu trùng
fsSync.writeFileSync(absolutePath, buffer); // Luôn overwrite
```

### 1.3 Fix Rewrite HTML Images Mapping

**Vấn đề:** `rewriteHtmlImages()` dùng `normalizeUrl()` để match URLs, nhưng media service truyền hash keys.

**Fix:** Media service build `urlToRelativePath` mapping với original URLs thay vì hashes.

**File sửa:** `services/media-migration.service.ts`

```typescript
// Build URL → relativePath mapping (not hash → relativePath)
// rewriteHtmlImages uses normalizeUrl() internally to match
const urlToRelativePath: Record<string, string> = {};
for (const url of allSourceUrls) {
  const hash = this.hashSync(url);
  const relPath = urlHashToRelativePath[hash];
  if (relPath) {
    urlToRelativePath[url] = relPath;
  }
}
```

### 1.4 Deduplication Logic (Đã Có Từ Trước)

**Logic hoạt động:**
1. Mỗi URL được hash → lưu vào global pool (`localStorage`)
2. Khi xử lý product, check pool trước:
   - `status === "downloaded"` → reuse, không tải lại
   - `status === "pending"` → download mới
3. Thumbnail + gallery + description cùng 1 URL → chỉ tải 1 lần

---

## 2. Các Vấn Đề Đã Phát Hiện và Fix

### 2.1 Bug Fixes

| # | Bug | Fix |
|---|-----|-----|
| 1 | Media lưu vào `uploads/migration/wordpress/media/{hash}/` | Đổi sang `wp-content/uploads/{year}/{month}/{filename}` |
| 2 | Trùng filename tạo file mới `-1`, `-2` | Ghi đè (overwrite) thay vì tạo mới |
| 3 | `rewriteHtmlImages()` không match được URLs | Build mapping với original URLs thay vì hashes |
| 4 | Dev server chạy code cũ sau khi edit | Kill + restart dev server |

---

## 3. Các Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | **Cần verify media migration thực tế** | Cao | Chạy migration với nhiều ảnh để test deduplication |
| 2 | **Verify HTML rewrite** cho description images | Trung bình | Kiểm tra ảnh trong mô tả được rewrite đúng |
| 3 | **LocalStorage pool** cần persist qua sessions | Trung bình | Pool nên được backup/restore nếu user clear browser |
| 4 | **Progress UI** cho media download | Thấp | Hiển thị progress khi tải nhiều ảnh |

---

## 4. Lệnh Test

### 4.1 Chạy Development Servers

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000)
cd apps/admin-ui
npm run dev
```

### 4.2 Build & Lint

```bash
cd apps/admin-ui
npm run build
npm run lint
```

### 4.3 Test Media Migration Flow

1. Mở http://localhost:3000/migration
2. Điền config (WooCommerce URL, credentials, Medusa backend URL)
3. Chọn **Sản phẩm**
4. Click **Start Migration**
5. Quan sát:
   - Ảnh được tải về `public/wp-content/uploads/{year}/{month}/`
   - Trùng URL → log "Reuse existing" (không tải lại)
   - Trùng filename → ghi đè (không tạo file mới)

### 4.4 Verify Deduplication

1. Migration product A có 5 ảnh
2. Migration product B có 3 ảnh (2 trùng với A)
3. Kiểm tra:
   - Chỉ 6 files trong uploads (5 + 1 mới)
   - Log có "Reuse existing" cho 2 ảnh trùng

---

## 5. Kiến Trúc Hiện Tại

```
apps/
├── admin-ui/                          # Next.js 15 + App Router
│   ├── public/
│   │   └── wp-content/
│   │       └── uploads/               # Media upload destination (WordPress structure)
│   │           └── {year}/{month}/   # Ví dụ: 2026/04/image.jpg
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── migration/page.tsx     # Migration UI
│   │   │   ├── products/page.tsx      # Product listing
│   │   │   └── categories/page.tsx    # Category listing
│   │   └── api/
│   │       ├── medusa/
│   │       │   ├── upload-media/      # Media upload handler (WordPress structure)
│   │       │   └── [...slug]/         # Medusa proxy
│   │       ├── fetch-image/           # Proxy để fetch ảnh từ WordPress (tránh CORS)
│   │       └── woo/[...slug]/         # WooCommerce proxy
│   ├── components/migration/
│   │   ├── migration-options-popup.tsx
│   │   └── migration-progress.tsx
│   ├── services/
│   │   ├── migration.service.ts        # Main migration flow
│   │   ├── medusa.service.ts          # Medusa API calls + inventory update
│   │   └── media-migration.service.ts  # Media deduplication pool
│   └── lib/
│       ├── media-helpers.ts           # URL normalize, rewrite HTML, sanitize
│       └── products/product-filters.ts
│
└── backend-ui/                         # Medusa v2
    └── apps/backend/                   # Port 9000
```

---

## 6. Bước Tiếp Theo

### 6.1 Ngắn Hạn (Hôm Nay)

- [ ] **Verify media deduplication** — Chạy migration với products có ảnh trùng
- [ ] **Verify HTML rewrite** — Kiểm tra ảnh trong description được rewrite đúng URL mới
- [ ] **Verify overwrite** — Kiểm tra trùng filename không tạo file mới

### 6.2 Trung Hạn

- [ ] **Backup/restore media pool** — Export/import localStorage pool
- [ ] **Media progress UI** — Progress bar khi tải nhiều ảnh
- [ ] **Retry failed images** — Thêm tuỳ chọn retry cho ảnh fail
- [ ] **Image CDN integration** — Hỗ trợ upload lên Cloudflare R2/S3

---

## 7. Changelog

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse từ pool

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Commit Message Đề Xuất

### Conventional Commits

```
feat(migration): WordPress media structure with deduplication

- Change upload path to wp-content/uploads/{year}/{month}/{filename}
  preserving original WordPress URLs for SEO
- Extract year/month from source WordPress URL
- Overwrite existing files instead of creating -1, -2 copies
- Fix rewriteHtmlImages() to use original URLs instead of hashes
- Media deduplication pool: same URL = download once, reuse everywhere
- Add wp-content/uploads/ to .gitignore
```

---

## 9. Cách Chạy Monorepo

### Cấu trúc hiện tại

- Root: pnpm workspace (pnpm-workspace.yaml)
- admin-ui: standalone Next.js 15 app với TypeScript
- backend-ui: Medusa v2 standalone app

### Khởi động

```bash
# Backend Medusa
cd apps/backend-ui/apps/backend
npm run dev  # Port 9000

# Admin UI (terminal khác)
cd apps/admin-ui
npm run dev  # Port 3000
```

### Media Upload Path

```
Source: WordPress/WooCommerce (e.g., mytholaptop.vn/wp-content/uploads/2026/04/image.jpg)
↓ Download via /api/medusa/upload-media
↓ Save to: apps/admin-ui/public/wp-content/uploads/{year}/{month}/{filename}
↓ Access via: http://localhost:3000/wp-content/uploads/2026/04/image.jpg
```

**Lưu ý bảo mật:**
- Không push các file `.env` lên git
- Không push thư mục `public/wp-content/uploads/` và `public/uploads/` lên git
- Đã thêm vào `.gitignore`
