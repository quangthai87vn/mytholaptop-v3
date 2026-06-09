# PRODUCT_CHANGELOG.md

## v1.10.0 — 2026-06-04

### Changed

- **Tags: store name alongside ID** — `tag_ids: number[]` changed to `tag_items: TagItem[]`:
  - Each tag now stores `{ id, name }` from WooCommerce product data
  - Tag chips display tag **name** (not bare ID number)
  - Fallback: unknown names show as `Tag #ID` instead of raw number
  - Save payload unchanged: still sends `{ id }` to WooCommerce
- **Tags: improved add flow** — clicking a tag suggestion adds it with name, no more `toggleTag` confusion
- **Tags: duplicate prevention** — `addNewTag` now checks against both `tag_items` and `new_tags`

### Fixed

- **Tag display UX** — chips no longer show bare number IDs (e.g. "2385", "1906"). Now show real tag names from WooCommerce.
- **HtmlEditor redesign** — 2-mode editor:
  - **Soạn** (Visual): rendered HTML preview, no toolbar clutter, "Xem trước" button opens full preview dialog
  - **HTML** (Code): monospace textarea with formatting toolbar (Bold, Italic, H2, P, lists, Link, Undo/Redo)
  - Preview dialog shows full description in clean prose layout
  - Toolbar only visible in HTML mode — Visual mode is clean and focused

## v1.9.0 — 2026-06-04

### Fixed

- **`(form.field ?? "")` fallbacks** — Fixed `TypeError: Cannot read properties of undefined (reading 'trim')` for all form fields:
  - `name`, `sku`, `regular_price`, `sale_price`, `date_on_sale_from`, `date_on_sale_to`, `stock_quantity`, `short_description`, `description`, `purchase_note`, `menu_order`
  - All Input/Textarea value bindings now use `?? ""` fallback
  - Save handler uses `(form.field ?? "").trim()` instead of `safeString(form.field).trim()`
- **Duplicate fields removed from Tổng quan tab** — Removed status (publish/draft/pending/private) and visibility (catalog/search/hidden) dropdowns from Tổng quan tab. These are now only in the sidebar "Xuất bản" box to avoid duplication.
- **`mapProductToForm` safe helpers** — All field mapping from WooProduct to form state uses `safeString`/`safeNum`/`safeBool` to prevent crash when WooCommerce returns null/undefined fields.

### Changed

- **Images tab 2-column layout** — Featured image (45% left) + Gallery (55% right) displayed side by side:
  - Featured: large square preview, Media ID badge, Chọn/Xoá buttons, zoom on click
  - Gallery: thumbnail grid (3-4 columns), number badges, zoom, set-featured, remove buttons, "Thêm ảnh từ thư viện" + "Upload" buttons
- **Danh mục & Thẻ tab — category search** — Added search input at top of category tree. Filters tree by name, keeps parent/child hierarchy.
- **HtmlEditor 3-mode** — Added "Xem trước" tab alongside "Soạn" and "HTML". Toolbar only shows in HTML mode. Preview renders full HTML safely.
- **Sidebar preview** — Preview card updates immediately when featured image changes.

## v1.8.0 — 2026-06-03

- **Layout stability** — Fixed page jumping when switching tabs:
  - Root cause: `WooProductEditPageForm` returned a fragment `<>` with two divs (main + sidebar), but the page wrapped it in `flex` without grid constraints. The sidebar had no fixed width, causing layout to shift.
  - Fix: page now uses `grid grid-cols-[1fr_340px]` on the content wrapper. Main column takes remaining space, sidebar is fixed 340px. All tab content is inside the main column only.
- **Sidebar width** — Fixed sidebar from `w-[320px]` to `w-[340px]` to match the page grid column exactly.

### Changed

- **`woo-product-edit-page-form.tsx`** — Removed sidebar from form component. Form now only renders the main content area. Page route controls the CSS grid layout.
- **Page skeleton** — Loading skeleton now uses `grid grid-cols-[1fr_340px]` matching the actual layout.

## v1.7.0 — 2026-06-03

### Added

- **Fullscreen sticky header** — `woo-edit/page.tsx` now uses a sticky header bar:
  - Breadcrumb navigation (Sản phẩm > Product name)
  - Product name + WooCommerce badge (truncated)
  - "Xem trên web" button (if permalink exists)
  - "Quay lại" button
- **`HtmlEditor` component** — built-in HTML editor with:
  - Soạn / HTML toggle mode
  - HTML toolbar: bold, italic, heading, ul/ol lists, link, undo/redo
  - Visual preview renders HTML safely
  - Undo/redo stack (up to 20 steps)
- **`LightboxDialog` component** — popup for image zoom:
  - Large image preview with black background
  - Media ID display
  - Buttons: "Đặt làm đại diện", "Xoá", "Đóng"
  - Shows image URL in footer

### Changed

- **Layout redesigned** — 5-tab layout with sidebar:
  - Left: flexible main content area
  - Right: 320px fixed sidebar
  - No more centered max-width container
- **Tabs merged** — reduced from 6 to 5 tabs:
  - Tổng quan (now includes all price + stock fields)
  - Danh mục & Thẻ (combined category + tag management)
  - Hình ảnh (images with lightbox)
  - Mô tả (HTML editor)
  - Nâng cao (metadata, purchase_note only)
- **"Giá & Kho" tab removed** — all pricing and inventory fields moved into "Tổng quan"
- **Right sidebar cleaned up** — removed duplicate fields, now only contains:
  - Xuất bản (status, visibility, featured, ID, dates, save button)
  - Xem trước (product preview card)
  - Tồn kho nhanh (quick stock selector)
  - Quick links
- **Tag management improved**:
  - Smart tag suggestions based on product name + category keywords
  - Tag search with autocomplete
  - Selected tags shown as chips, removable
  - New tags shown with dashed border and "(mới)" label
- **Gallery redesigned** — list view with up/down arrow buttons for reordering (cleaner than drag-only)
- **Images tab** — click any image thumbnail to open lightbox

### Fixed

- **`WpMediaItem.name` type error** — tag suggestion function now uses `WooTag` type instead of `WpMediaItem`
- **Duplicate `sale_price` assignment** — fixed in save payload

## v1.6.0 — 2026-06-03

### Added

- **WordPress Media API route** — `app/api/wordpress-media/route.ts`:
  - `GET /api/wordpress-media` — list WordPress media library (with pagination, search)
  - `POST /api/wordpress-media` — upload image to WordPress Media Library (multipart/form-data)
  - Uses same WooCommerce/WordPress credentials from `app_settings` table
- **`useWordPressMediaLibrary` hook** — fetches media items from WordPress REST API with React Query
- **`useWordPressMediaUpload` hook** — uploads image files to WordPress Media Library
- **`MediaPicker` dialog component** — full WordPress-style media picker:
  - **Library tab**: grid view of WordPress media, search, pagination, single/multi select
  - **Upload tab**: drag-and-drop or click-to-select file upload, preview uploaded image
  - Check mark on selected images, selected border highlight
- **WordPress-style Images tab** — rebuilt completely:
  - Featured image section with "Chọn từ thư viện" + "Xoá ảnh đại diện" buttons
  - Media ID badge for images from WordPress Library
  - Yellow warning badge for URL-only images (no media ID)
  - Gallery with drag-and-drop reorder (HTML5 DnD), per-item remove + set-as-featured
  - Gallery item shows: thumbnail, title/name, media ID badge (green) or "URL only" (yellow)

### Changed

- **Image save format** — WooCommerce product save now uses `id` when available, falls back to `src`. Format: `images: [{ id: n }, { id: n }, ...]` instead of always using URL
- **`WooImg` interface** — added `title?: string` field to store media title
- **`MediaPicker` integration** — Images tab now uses `MediaPicker` dialog instead of raw URL input
- **Sidebar product preview** — updates immediately when featured image changes

### Fixed

- **Gallery reorder** — `moveGalleryItem` now correctly converts between gallery-relative indices and actual array indices

## v1.5.0 — 2026-06-03

### Added

- **`/products/[id]/woo-edit` full-page route** — Standalone page replacing the modal dialog for WooCommerce product editing:
  - URL: `/products/[id]/woo-edit`
  - Self-contained layout (breadcrumb, header, content) matching Medusa `/products/[id]/edit` pattern
  - WordPress WooCommerce-style layout: 70% main area + 30% right sidebar
  - Header includes WooCommerce badge, "View on web" button (if permalink exists), and back button
- **`WooProductEditPageForm` component** — The main WordPress-style editor:
  - 6 centered, wide tabs: Tổng quan | Giá & Kho | DM & Thẻ | Hình ảnh | Mô tả | Nâng cao
  - **Tổng quan**: name, status, catalog_visibility, SKU, featured toggle, short_description
  - **Giá & Kho**: regular_price, sale_price, date_on_sale_from/to, stock_status, manage_stock, stock_quantity, backorders, sold_individually
  - **DM & Thẻ**: parent/child category tree (multi-select), existing + new tag management
  - **Hình ảnh**: featured image URL + gallery management (add/remove/set featured)
  - **Mô tả**: short_description, full description with HTML source + preview toggle
  - **Nâng cao**: menu_order, purchase_note, custom meta_data key/value editor
- **`useWooCommerceProduct(id)` hook** — Fetches a single WooCommerce product by ID for the edit page
- **Sidebar cards**: Xuất bản (publish status), Product preview, Tồn kho nhanh (quick stock edit), Quick links

### Changed

- **WooCommerce edit navigation** — Clicking "Sửa" on any WooCommerce product now navigates to `/products/[id]/woo-edit` (full-page) instead of opening a modal dialog
- **`products/page.tsx`** — WooCommerce edit flows now use `router.push()` to the full-page route instead of `WooProductEditDialog`
- **Removed `WooProductEditDialog` from products page** — Dialog import, state (`editWooProduct`, `wooEditDialogOpen`), and JSX removed from page component
- **`product-card.tsx`** — Menu item "Sửa nâng cao" is shown only for Medusa; WooCommerce uses the full-page editor

### Fixed

- **Switch `size` prop** — Removed unsupported `size="sm"` from sidebar Switch component in the form

## v1.4.0 — 2026-06-03

### Added

- **Full WooCommerce Product Editor** — `WooProductEditForm` component with 6 tabs replacing the simple dialog:
  - **Thông tin chung**: name, status, catalog_visibility, featured, short_description, description (HTML)
  - **Giá**: regular_price, sale_price, date_on_sale_from, date_on_sale_to, discount calculation display
  - **Tồn kho**: stock_status, manage_stock, stock_quantity, backorders, sold_individually
  - **Hình ảnh**: featured image URL, gallery URL management (add/remove/set as featured)
  - **Danh mục & Thẻ**: category tree multi-select from WooCommerce, tag multi-select + create new tags
  - **Nâng cao**: menu_order, purchase_note, custom meta_data key/value editor
- **`WooProductEditDialog`** — Dialog wrapper for the full tabbed form
- **Image URL mode** for WooCommerce products — change featured and gallery images via URL input
- **Category multi-select** from WooCommerce category tree with parent/child tree rendering
- **Tag management** — select existing WooCommerce tags and create new tags by name
- **Custom metadata editor** — key/value editor for custom WooCommerce meta_data
- **`WooProductEditFormData` interface** — complete type for all editable WooCommerce fields
- **Sidebar preview** — live preview card in the editor sidebar showing product image, name, price, badges

### Changed

- **`WooProductEditDialog`** — Now uses the full tabbed `WooProductEditForm` instead of inline simple form
- **`mapWooProductToForm`** — Now reads categories from `p.categoryIds` array (in addition to metadata) and includes all WooCommerce metadata fields

### Fixed

- **Safe helpers in editor** — All form field reads use `safeString()` and `safeNum()` to prevent crashes on missing fields
- **Sale price validation** — Shows error if sale price > regular price
- **Dirty state tracking** — Save button shows dirty indicator and is disabled when name is empty

### Documentation

- Updated `PRODUCT_DATA_SOURCE_RULES.md` — Full field table for all 6 editor tabs
- Updated `PRODUCT_BUG_TRACKING.md` — Added BUG-017 (full editor)
- Updated `PRODUCT_TEST_CHECKLIST.md` — Added full editor tests

---

## v1.3.0 — 2026-06-03

### Added

- **`useWooCommerceProductsAll()` hook** — Fetches ALL WooCommerce products via pagination loop (page=1..100, per_page=100), then applies client-side sorting/filtering. Previously only returned first 100 products.
- **`categoryIds` field in `AdaptedProduct`** — Array of all WooCommerce category IDs for a product, used for filtering and parent/child category display.
- **Parent/child category display** — WooCommerce products now show categories as "Parent / Child" when both parent and child categories exist in the product's category list.
- **`safeString()` helper** — Safely converts possibly-undefined values to strings before calling `.trim()`, preventing runtime crashes.

### Fixed

- **WooCommerce pagination** — Previously stopped at 100 products. Now fetches all pages until WooCommerce returns fewer than `per_page` items (BUG-014).
- **`onbackorder` image NOT grayscale** — Only `outofstock` products show grayscale images. `onbackorder` products display normally (BUG-015).
- **`WooProductEditDialog` `.trim()` crash** — Modal crashed with "Cannot read properties of undefined (reading 'trim')" for products with undefined/null fields. All `.trim()` calls now use `safeString()` (BUG-016).
- **`adaptWooProduct` category display** — Now correctly builds "Parent / Child" category string using the WooCommerce category list with parent info.
- **`filterProductsByCategoryTree`** — Now checks `categoryIds` array in addition to `categoryId` for WooCommerce products.
- **`filterProductsByCategory`** — Now checks `categoryIds` array for WooCommerce products.

### Changed

- **`/products` WooCommerce sorting** — Sort dropdown now applies client-side on the full loaded product list (fetched via pagination loop), instead of passing to WooCommerce API.
- **`ProductCard` layout** — Category, product name, and price are now centered for cleaner visual balance. SKU moved below price. Tags centered. Removed sync status badge (WooCommerce products always "manual"). `onbackorder` no longer triggers grayscale.
- **`useWooCommerceProducts`** — Marked `@deprecated`, replaced by `useWooCommerceProductsAll()`.
- **`adaptWooProduct` signature** — Now accepts optional `categoryMap` parameter for parent/child category resolution.

### Documentation

- Updated `PRODUCT_DATA_SOURCE_RULES.md` — Added `categoryIds` field, pagination loop behavior, updated `AdaptedProduct` shape.
- Updated `PRODUCT_BUG_TRACKING.md` — Added BUG-014, BUG-015, BUG-016.
- Updated `PRODUCT_TEST_CHECKLIST.md` — Added tests for >100 products, grayscale images, edit modal for missing fields.

---

## v1.2.0 — 2026-06-03

### Added

- **`source` / `sourceId` fields in `AdaptedProduct`** — All normalized products now carry `source` (`"medusa"` | `"woocommerce"`) and `sourceId` for identification
- **`getSourceStatusLabel()` helper** — Source-aware status label lookup (uses `WOO_STATUS_LABELS` for WooCommerce, `MEDUSA_STATUS_LABELS` for Medusa)
- **`getSourceStockLabel()` helper** — Stock status label lookup
- **`useUpdateWooCommerceProduct()` hook** — Mutation hook for updating WooCommerce products via PUT `/api/woo/products/{id}`
- **`WooProductEditDialog` component** — Modal for editing WooCommerce products directly (name, price, stock, status)
- **WooCommerce edit flow on `/products`** — Clicking "Sửa" on a WooCommerce product card opens `WooProductEditDialog` with editable fields

### Fixed

- **Stock badge for `onbackorder`** — Fixed `getStockBadgeVariant()` to return `warning` (orange) for `onbackorder`, not `destructive` (red)
- **WooCommerce status label** — Product cards and tables now show correct Vietnamese labels: "Hoạt động" (publish), "Bản nháp" (draft), "Chờ duyệt" (pending), "Riêng tư" (private)
- **`publish` variant** — `getStatusVariant()` now returns `"success"` for both `published` (Medusa) and `publish` (WooCommerce)
- **Product detail modal edit button** — "Sửa sản phẩm" button now actually opens the edit dialog for both Medusa and WooCommerce products
- **"Sửa nâng cao" hidden in WooCommerce mode** — Advanced edit link hidden when using WooCommerce source

### Changed

- **`ProductCard`** — Now accepts `activeSource` prop, shows source-aware status labels
- **`ProductCardGrid`** — Passes `activeSource` to `ProductCard`
- **`ProductsTable`** — Now accepts `activeSource` prop, shows source-aware status labels, `useRouter` for "Sửa nâng cao" link
- **`adaptWooProduct()`** — Now sets `source: "woocommerce"` and `sourceId: String(p.id)`
- **`adaptProduct()`** — Now sets `source: "medusa"` and `sourceId: p.id`
- **`/products` detail modal** — Now shows source badge, WooCommerce/Medusa ID, and full description
- **`/api/woo/[...slug]`** — Now supports PUT method for WooCommerce product updates

### Documentation

- Updated `PRODUCT_DATA_SOURCE_RULES.md` — Added AdaptedProduct shape, WooCommerce edit documentation
- Updated `PRODUCT_TEST_CHECKLIST.md` — Added WooCommerce edit flow tests
- Updated `PRODUCT_BUG_TRACKING.md` — Added BUG-010 through BUG-013

---

## v1.1.0 — 2026-06-03

### Added

- **`useWooCommerceTags()` hook** — Fetches product tags directly from WooCommerce API at `/api/woo/products/tags`
- **`adaptWooCategory()` function** — Converts WooCommerce categories to `CategoryNode[]` shape for consistent tree rendering
- **`WOO_STATUS_LABELS`** — Vietnamese labels for WooCommerce statuses (publish→Hoạt động, draft→Bản nháp, pending→Chờ duyệt, private→Riêng tư)
- **Source-aware status filter** in toolbar — Different status options shown based on active source
- **`__skipMedusa` parameter** in all Medusa hooks — Prevents unnecessary API calls when WooCommerce is active
- **WooCommerce sorting support** — Sorting dropdown now maps to `orderby`/`order` params for WooCommerce API
- **WooCommerce search support** — Search input maps to WooCommerce API `search` param
- **WooCommerce category filter support** — Category dropdown maps to WooCommerce API `category` param

### Fixed

- **Categories page Medusa calls** — Now conditionally skips Medusa API when WooCommerce is active (BUG-001)
- **Duplicate `allFlat` declaration** — Removed duplicate causing TypeScript error (BUG-002)
- **Hardcoded Medusa error message** — Error messages now source-aware (BUG-003)
- **Tags page WooCommerce support** — Tags now load from WooCommerce when WooCommerce is active (BUG-004)
- **Brands page Medusa calls** — Now conditionally skips Medusa API when WooCommerce is active (BUG-005)
- **Missing WooCommerce statuses** — Toolbar now shows pending/private for WooCommerce mode (BUG-006)
- **Empty category filter** — Products page now builds category tree from WooCommerce categories (BUG-007)
- **Sorting not passed to WooCommerce** — Sorting now sent as API params to WooCommerce (BUG-008)
- **Undefined `data` reference** — `openEditDialog` now uses correct `medusaData` variable (BUG-009)

### Changed

- **`useWooCommerceProducts()` signature** — Now accepts `orderby`, `order`, `category`, `search`, `status` params
- **`ProductToolbar` interface** — Added optional `source` prop for source-aware filter options
- **Products page** — Category tree built from active source (WooCommerce or Medusa)
- **Tags page** — Stats show synced=total for WooCommerce, create/edit/delete hidden
- **Brands page** — Read-only message shown for WooCommerce mode

### Documentation

- Updated `PRODUCT_DATA_SOURCE_RULES.md` — Full routing table, status mapping, sorting mapping
- Updated `PRODUCT_SETTINGS_FLOW.md` — Updated flow diagrams for all product pages
- Updated `PRODUCT_TEST_CHECKLIST.md` — Comprehensive tests for all pages and sources
- Created `PRODUCT_BUG_TRACKING.md` — Tracks all bugs found and fixed

---

## v1.0.0 — 2026-06-02

### Added

- Initial product data source selection (Medusa vs WooCommerce)
- `useProductDataSource()` hook
- `adaptWooProduct()` for normalizing WooCommerce products
- Products page with unified Medusa/WooCommerce routing
- Product toolbar with search, category, status, stock filters
- Product card grid and table views
- Product form dialog for create/edit
