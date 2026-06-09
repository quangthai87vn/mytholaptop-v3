# PRODUCT_BUG_TRACKING.md

## Fixed Bugs

### BUG-001: Categories page calls Medusa even when WooCommerce is selected

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The `useCategories()` hook was always enabled regardless of the active product data source. When WooCommerce was selected, the categories page still fetched from `/api/medusa/admin/product-categories`, which returned 401 Unauthorized because Medusa was not configured.

**Fix:**
1. Added `__skipMedusa` parameter to `useCategories()` to conditionally disable the hook when WooCommerce is active.
2. Added `enabled: isMedusaSource` condition in the products page to prevent unnecessary Medusa API calls.

**Files Changed:**
- `hooks/use-medusa.ts` - Added `__skipMedusa` support to `useCategories()`
- `app/(admin)/products/categories/page.tsx` - Pass `__skipMedusa: !isWooSource`
- `app/(admin)/products/page.tsx` - Pass `enabled: isMedusaSource` to `useCategories()`

---

### BUG-002: Duplicate `allFlat` useMemo in categories page

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The categories page had two `allFlat` useMemo declarations. The second declaration overwrote the first, causing a TypeScript error and breaking the page.

**Fix:**
Removed duplicate declaration, kept single `allFlat` definition after the mutations.

**Files Changed:**
- `app/(admin)/products/categories/page.tsx`

---

### BUG-003: Error message always says "Medusa" regardless of source

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The categories page had a hardcoded error message "Không thể kết nối Medusa" that didn't check which data source was active.

**Fix:**
Made error messages source-aware:
- If WooCommerce active: "Không thể kết nối WooCommerce"
- If Medusa active: "Không thể kết nối Medusa"

**Files Changed:**
- `app/(admin)/products/categories/page.tsx`
- `app/(admin)/products/tags/page.tsx`

---

### BUG-004: Tags page always calls Medusa tags API

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The tags page only had `useTags()` (Medusa) with no routing to WooCommerce. Tags from WooCommerce were never loaded.

**Fix:**
1. Added `useWooCommerceTags()` hook
2. Added source routing logic
3. Hide create/edit/delete buttons when WooCommerce is active
4. Show product count from WooCommerce tags API

**Files Changed:**
- `hooks/use-medusa.ts` - Added `useWooCommerceTags()`
- `app/(admin)/products/tags/page.tsx` - Full source routing

---

### BUG-005: Brands page always calls Medusa collections API

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The brands page only called `useCollections()` (Medusa). When WooCommerce is active, this causes 401 errors.

**Fix:**
1. Added source-aware loading state to skip Medusa calls when WooCommerce is active
2. Show "Đổi nguồn dữ liệu" link when WooCommerce is active
3. Hide create button when WooCommerce is active

**Files Changed:**
- `app/(admin)/products/brands/page.tsx` - Source-aware loading and UI

---

### BUG-006: Product toolbar missing WooCommerce-specific statuses

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The status filter dropdown only showed Medusa statuses (draft, proposed, published). WooCommerce statuses (pending, private) were missing.

**Fix:**
1. Added `source` prop to `ProductToolbar`
2. Status options are now source-aware:
   - WooCommerce: Hoạt động, Bản nháp, Chờ duyệt, Riêng tư
   - Medusa: Hoạt động, Nháp, Đề xuất, Lưu trữ

**Files Changed:**
- `components/products/product-toolbar.tsx` - Added source prop
- `app/(admin)/products/page.tsx` - Pass activeSource to toolbar

---

### BUG-007: No WooCommerce category tree in products filter

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The products page only built category tree from Medusa categories. When WooCommerce was active, the category filter dropdown was empty.

**Fix:**
1. Added `useWooCommerceCategories()` hook call
2. Added `buildTreeFromWooCommerce()` function to build `CategoryNode[]` from WooCommerce categories
3. Category tree now built from the active source

**Files Changed:**
- `app/(admin)/products/page.tsx`
- `hooks/use-medusa.ts` - Added `useWooCommerceCategories()`
- `lib/products/product-filters.ts` - Added `adaptWooCategory()`

---

### BUG-008: Sorting not passed to WooCommerce products API

**Severity:** Low
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The `useWooCommerceProducts()` hook didn't accept `orderby` and `order` parameters, so server-side sorting wasn't available for WooCommerce.

**Fix:**
1. Extended `useWooCommerceProducts()` to accept `orderby`, `order`, `category`, `search`, `status` params
2. Mapped `SortOption` to WooCommerce API params in `products/page.tsx`

**Files Changed:**
- `hooks/use-medusa.ts`
- `app/(admin)/products/page.tsx`

---

### BUG-009: `openEditDialog` references undefined `data` variable

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The `openEditDialog` function referenced `data?.data?.product_categories` but the `data` variable was never defined in the component. This would cause runtime errors when editing a WooCommerce category.

**Fix:**
Changed to use `medusaData?.data?.product_categories` with a guard for `isWooSource`.

**Files Changed:**
- `app/(admin)/products/categories/page.tsx`

---

### BUG-010: getStockBadgeVariant returns destructive for onbackorder instead of warning

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The `getStockBadgeVariant()` function checked `stock === 0` before `stockStatus === "onbackorder"`. For WooCommerce products with `stock_quantity = null` and `stock_status = onbackorder`, the stock defaulted to 0, triggering the `destructive` variant. The function also had the order wrong — `onbackorder` should be `warning`, not `destructive`.

**Fix:**
1. Reordered checks: `onbackorder` now returns `warning` first
2. `outofstock` check moved after `onbackorder`
3. `stock === 0` check moved after both status checks

**Files Changed:**
- `lib/products/product-filters.ts` - `getStockBadgeVariant()`

---

### BUG-011: Status badges on product cards always used MEDUSA_STATUS_LABELS

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
`ProductCard` and `ProductsTable` hardcoded `MEDUSA_STATUS_LABELS` for the status badge, so WooCommerce `publish` status showed as empty/English instead of "Hoạt động".

**Fix:**
1. Added `source` and `sourceId` fields to `AdaptedProduct`
2. Added `getSourceStatusLabel()` helper for source-aware label lookup
3. Updated `adaptWooProduct()` and `adaptProduct()` to include `source`/`sourceId`
4. Updated `ProductCard` and `ProductsTable` to use `getSourceStatusLabel(product.status, product.source)`
5. Updated `getStatusVariant()` to recognize `publish` as `"success"` variant
6. Added `activeSource` prop to `ProductCard` and `ProductsTable`

**Files Changed:**
- `lib/products/product-filters.ts` - `AdaptedProduct`, `adaptWooProduct()`, `adaptProduct()`, `getStatusVariant()`, `getSourceStatusLabel()`, `getSourceStockLabel()`
- `components/products/product-card.tsx` - source-aware status label
- `components/products/product-card-grid.tsx` - pass `activeSource` prop
- `components/products/products-table.tsx` - source-aware status label, `useRouter` for advanced edit link

---

### BUG-012: WooCommerce products had no edit flow

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
When WooCommerce was active, clicking "Sửa" on a product card triggered `_p => {}` (no-op). There was no mechanism to edit WooCommerce products directly from the admin UI.

**Fix:**
1. Added PUT handler to `/api/woo/[...slug]/route.ts` (WooCommerce proxy)
2. Added `useUpdateWooCommerceProduct()` mutation hook
3. Created `WooProductEditDialog` component with editable fields: name, status, regular_price, sale_price, stock_status, manage_stock, stock_quantity, short_description
4. Added `editWooProduct`/`wooEditDialogOpen` state to products page
5. Wired up edit buttons in `ProductCardGrid` and `ProductsTable` to open `WooProductEditDialog`
6. Updated product detail modal to show source badge and source ID

**Files Changed:**
- `app/api/woo/[...slug]/route.ts` - Added PUT handler
- `hooks/use-medusa.ts` - Added `useUpdateWooCommerceProduct()`
- `components/products/woo-product-edit-dialog.tsx` - New file
- `app/(admin)/products/page.tsx` - WooCommerce edit state and dialog

---

### BUG-013: Product detail modal showed "Sửa" button but didn't open edit

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The detail modal's "Sửa sản phẩm" button only closed the modal (`setViewProduct(null)`) without opening the edit dialog.

**Fix:**
Updated detail modal "Sửa sản phẩm" button to:
- For Medusa: open `ProductFormDialog` with `rawProduct`
- For WooCommerce: open `WooProductEditDialog` with `AdaptedProduct`

**Files Changed:**
- `app/(admin)/products/page.tsx` - Detail modal edit button logic

---

### BUG-014: WooCommerce only showed first 100 products

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
`useWooCommerceProducts()` fetched only a single page (`per_page=100, page=1`). WooCommerce API returns max 100 items per page, so stores with more than 100 products showed incomplete lists.

**Fix:**
Created `useWooCommerceProductsAll()` hook that implements a pagination loop:
- Fetches `per_page=100` pages sequentially
- Continues until returned items < `per_page` (last page) or error
- Safety limit of 100 pages (10,000 products)
- All products combined and returned as a single array
- Client-side sorting/filtering applied after loading all products

**Files Changed:**
- `hooks/use-medusa.ts` - Added `useWooCommerceProductsAll()`
- `app/(admin)/products/page.tsx` - Switched from `useWooCommerceProducts` to `useWooCommerceProductsAll()`

---

### BUG-015: `onbackorder` products showed grayscale images

**Severity:** Low
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The `isOutOfStock` check in `ProductCard` used `product.stockStatus === "outofstock" || product.stock === 0`, which caused `onbackorder` products with `stock=0` to also appear grayscale.

**Fix:**
Changed `isOutOfStock` to only check `product.stockStatus === "outofstock"`. Now `onbackorder` products display images normally.

**Files Changed:**
- `components/products/product-card.tsx` - `isOutOfStock` check

---

### BUG-016: `WooProductEditDialog` crashed with `.trim()` on undefined values

**Severity:** High
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
`handleSave()` called `form.name.trim()` directly. When the form initialized from a product with undefined/null fields, `form.name` could be undefined, causing "Cannot read properties of undefined (reading 'trim')". The component also had an early `return null` after a `useEffect` that referenced `form`, which could crash on first render before `product` was set.

**Fix:**
1. Added `safeString()` helper that converts possibly-undefined values to strings safely
2. Replaced all `.trim()` calls with `safeString(value).trim()`
3. Moved `if (!product) return null` before any `form` references
4. Added `isNameEmpty` computed before JSX to avoid repeated `.trim()` calls
5. Initial form state now safely initialized via `mapProductToForm()` with `safeString()`

**Files Changed:**
- `components/products/woo-product-edit-dialog.tsx` - Added `safeString()`, fixed `mapProductToForm()`, fixed `handleSave()`, added `isNameEmpty`

---

### BUG-017: WooCommerce edit dialog too simple

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
`WooProductEditDialog` only supported basic fields (name, status, prices, stock status, short description). Categories, tags, images, full descriptions, inventory options, and advanced fields were not editable.

**Fix:**
1. Created new `WooProductEditForm` component with 6 tabs: Thông tin chung, Giá, Tồn kho, Hình ảnh, Danh mục & Thẻ, Nâng cao.
2. Each tab includes all WooCommerce product fields for that category.
3. Category multi-select loads WooCommerce categories with parent/child tree.
4. Tags include existing WooCommerce tags + ability to create new tags.
5. Images support URL-based management (add/remove/featured).
6. Advanced tab includes menu_order, purchase_note, and custom metadata editor.
7. `WooProductEditDialog` now wraps `WooProductEditForm` in a large modal (`max-w-6xl`).
8. Sidebar preview shows live product preview.

**Files Changed:**
- `components/products/woo-product-edit-form.tsx` - New full tabbed form component
- `components/products/woo-product-edit-dialog.tsx` - Replaced simple form with tabbed form wrapper

---

### BUG-018: WooCommerce edit modal cramped and not WordPress-like

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
`WooProductEditDialog` used a modal (`max-w-6xl`) that felt cramped. It lacked a proper WordPress-style sidebar layout with a 70/30 split, clear centered tabs, and a publish/status sidebar.

**Fix:**
1. Created new dedicated route `/products/[id]/woo-edit` as a full-page (not modal).
2. Built `WooProductEditPageForm` with WordPress WooCommerce-style layout:
   - Left 70%: main tabbed form area with centered wide tabs (Tổng quan, Giá & Kho, DM & Thẻ, Hình ảnh, Mô tả, Nâng cao)
   - Right 30%: sidebar cards (Xuất bản, Product preview, Tồn kho nhanh, Quick links)
3. Removed `WooProductEditDialog` from `products/page.tsx` — WooCommerce edit now navigates via `router.push()`.
4. Added `useWooCommerceProduct(id)` hook for single-product fetch.

**Files Changed:**
- `hooks/use-medusa.ts` - Added `useWooCommerceProduct(id)` hook
- `app/(admin)/products/[id]/woo-edit/page.tsx` - New full-page route
- `components/products/woo-product-edit-page-form.tsx` - New WordPress-style form component
- `app/(admin)/products/page.tsx` - Removed `WooProductEditDialog`, added `router.push()` for WooCommerce edit

---

### BUG-019: WooCommerce Images tab had no WordPress Media Library integration

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The Images tab only supported raw URL input for featured and gallery images. There was no way to upload images to WordPress Media Library or browse existing media.

**Fix:**
1. Created `app/api/wordpress-media/route.ts` — WordPress Media API proxy:
   - `GET /api/wordpress-media` — list media with pagination and search
   - `POST /api/wordpress-media` — upload image via multipart/form-data
2. Created `useWordPressMediaLibrary` and `useWordPressMediaUpload` hooks.
3. Created `components/media/media-picker.tsx` — full media picker dialog:
   - Library tab: WordPress media grid, search, pagination, single/multi select
   - Upload tab: drag-and-drop file upload with preview
4. Rebuilt Images tab:
   - Featured: "Chọn từ thư viện" button + Media ID badge (green) or "URL only" warning (yellow)
   - Gallery: drag-and-drop reorder list, per-item set-as-featured + remove
5. Updated save payload: prefers `id` over `src` for images.

**Files Changed:**
- `app/api/wordpress-media/route.ts` - New WordPress Media API route
- `hooks/use-medusa.ts` - Added `useWordPressMediaLibrary` and `useWordPressMediaUpload`
- `components/media/media-picker.tsx` - New MediaPicker dialog component
- `components/products/woo-product-edit-page-form.tsx` - Rebuilt Images tab with media picker integration

---

### BUG-020: WooCommerce edit page UX/UI redesign

**Severity:** Medium
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
The WooCommerce edit page had 6 tabs (Tổng quan, Giá & Kho, DM & Thẻ, Hình ảnh, Mô tả, Nâng cao) with a narrow centered layout, cramped fields, duplicate controls in the sidebar, no lightbox for images, basic URL-only image input, no HTML editor, no tag suggestions, and a confusing tab structure that split pricing from product basics.

**Fix:**
1. Fullscreen sticky header with product name + WooCommerce badge + actions
2. Merged tabs: Tổng quan (includes price + stock), Danh mục & Thẻ, Hình ảnh, Mô tả, Nâng cao
3. Right sidebar cleaned: only publish box + preview + quick stock
4. Built HtmlEditor with Soạn/HTML toggle, toolbar (bold, italic, heading, lists, link, undo/redo)
5. Built LightboxDialog for image zoom preview
6. Gallery redesigned as list with up/down arrow reorder
7. Tag management: smart suggestions based on product name + categories
8. Fullscreen layout: left flexible content, right 320px sidebar

**Files Changed:**
- `app/(admin)/products/[id]/woo-edit/page.tsx` - Fullscreen sticky header, removed centered container
- `components/products/woo-product-edit-page-form.tsx` - Complete redesign: 5 tabs, HtmlEditor, LightboxDialog, clean sidebar

---

### BUG-021: WooCommerce edit page layout jumps when switching tabs

**Severity:** Low
**Date Fixed:** 2026-06-03
**Status:** Fixed

**Root Cause:**
`WooProductEditPageForm` returned a React fragment `<>` containing two sibling `<div>` elements: one for the main content and one for the sidebar. The page wrapper used `flex gap-6` without grid constraints. Since the sidebar had `w-[320px]` but was inside a flex child, it didn't constrain the column — the layout shifted when tab content changed or on load.

**Fix:**
1. Page now uses `grid grid-cols-[1fr_340px] gap-6` on the content wrapper — `1fr` for main, `340px` for sidebar.
2. Form component only renders the main (left) column. Sidebar is rendered inside the page.
3. Skeleton matches the same grid structure.

**Files Changed:**
- `app/(admin)/products/[id]/woo-edit/page.tsx` - Uses `grid grid-cols-[1fr_340px]` on content wrapper
- `components/products/woo-product-edit-page-form.tsx` - Removed sidebar from form return, only renders main column

---

### BUG-022: Runtime TypeError on undefined form fields

**Severity:** Medium
**Date Fixed:** 2026-06-04
**Status:** Fixed

**Root Cause:**
`form.sku.trim()` called on `undefined` when WooCommerce returned a product without `sku`. Same for other optional fields. This caused `TypeError: Cannot read properties of undefined (reading 'trim')`.

**Fix:**
1. All `Input`/`Textarea` value bindings use `?? ""` fallback: `value={form.field ?? ""}`
2. Save handler uses `(form.field ?? "").trim()` instead of `safeString(form.field).trim()`
3. `mapProductToForm` uses `safeString`/`safeNum`/`safeBool` for all field extractions

**Files Changed:**
- `components/products/woo-product-edit-page-form.tsx` — all value bindings + save handler

---

### BUG-023: Duplicate status/visibility fields in Tổng quan tab and sidebar

**Severity:** Low
**Date Fixed:** 2026-06-04
**Status:** Fixed

**Root Cause:**
Tổng quan tab had Trạng thái (publish/draft) and Hiển thị (visible/catalog) dropdowns, but the sidebar "Xuất bản" box also had these same controls. Non-technical staff could be confused by seeing the same controls in two places.

**Fix:**
Removed Trạng thái and Hiển thị dropdowns from Tổng quan tab. These now only exist in the sidebar "Xuất bản" box. Tổng quan tab keeps only: Tên sản phẩm, SKU.

**Files Changed:**
- `components/products/woo-product-edit-page-form.tsx` — removed status/visibility from Tổng quan tab

---

### BUG-024: Images tab used stacked layout instead of side-by-side

**Severity:** Low
**Date Fixed:** 2026-06-04
**Status:** Fixed

**Root Cause:**
Featured image and gallery were two separate stacked cards, wasting horizontal space. Gallery used a vertical list instead of a visual grid.

**Fix:**
- 2-column layout: Featured (45%) | Gallery (55%)
- Featured: large square preview with zoom, Media ID badge, action buttons
- Gallery: thumbnail grid (3-4 columns) with number badges, zoom on click, set-featured and remove on hover
- Upload button opens MediaPicker

**Files Changed:**
- `components/products/woo-product-edit-page-form.tsx` — Images tab redesigned

---

### BUG-025: Tag chips displayed bare number IDs instead of tag names

**Severity:** Medium
**Date Fixed:** 2026-06-04
**Status:** Fixed

**Root Cause:**
`form.tag_ids` was `number[]` — only IDs were stored. The `getTagName` function tried to map IDs to names from the WooCommerce tags hook, but the hook might not have been populated, causing raw numbers like "2385", "1906" to appear as chip text.

**Fix:**
1. Changed `tag_ids: number[]` to `tag_items: TagItem[]` where `TagItem = { id: number; name: string }`
2. `mapProductToForm` now extracts tags from WooCommerce product with both `id` and `name`
3. Tag chips display `{tag.name || \`Tag #${tag.id}\`}` — name if available, fallback to readable "Tag #ID"
4. Save payload unchanged — still sends `{ id }` to WooCommerce

**Files Changed:**
- `components/products/woo-product-edit-page-form.tsx` — tag data model refactored

---

### BUG-026: HtmlEditor had confusing 3-mode layout

**Severity:** Low
**Date Fixed:** 2026-06-04
**Status:** Fixed

**Root Cause:**
Editor had Soạn / Xem trước / HTML with toolbar showing in HTML+Preview modes. This was confusing — "Xem trước" and "Soạn" both showed the same rendered preview, and the toolbar cluttered the preview mode.

**Fix:**
- Simplified to 2 modes: **Soạn** (Visual) and **HTML** (Code)
- **Soạn** mode: clean rendered HTML preview, no toolbar, "Xem trước" button opens a full preview dialog
- **HTML** mode: monospace textarea with full formatting toolbar (Bold, Italic, H2, P, lists, Link, Undo/Redo)
- Preview dialog shows full description in prose layout with a button to jump to HTML mode

**Files Changed:**
- `components/products/woo-product-edit-page-form.tsx` — HtmlEditor redesign
