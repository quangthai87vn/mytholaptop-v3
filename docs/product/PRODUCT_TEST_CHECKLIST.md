# PRODUCT_TEST_CHECKLIST.md

## Product Data Source Feature

---

## Settings > Nguồn dữ liệu sản phẩm

### Source Selection

- [ ] Selecting "Dùng Medusa Backend" and saving → banner on Products page shows Medusa connection
- [ ] Selecting "Dùng WooCommerce API trực tiếp" and saving → Products page shows WooCommerce products
- [ ] Switching source does NOT clear credentials of the other source
- [ ] Saving source shows toast: "Đã chọn nguồn dữ liệu: ..."
- [ ] "Đang dùng" badge appears on the selected source option
- [ ] "Chế độ chờ" badge appears on the non-selected source option

---

## Settings > Kiểm tra & đồng bộ

### Medusa Configuration

- [ ] Entering Backend URL, Email, Password → "Lấy Token" → JWT token auto-filled
- [ ] "Kiểm tra" with valid credentials → green "connected" status
- [ ] "Kiểm tra" with invalid token → red error with specific message (not generic)
- [ ] "Kiểm tra" with no backend URL → button disabled
- [ ] "Lưu" → toast "Đã lưu cấu hình Medusa!"
- [ ] After save, reload page → credentials still present (not wiped)
- [ ] Credentials panel shows masked values (••••••••••••)

### WooCommerce Configuration

- [ ] Entering WordPress URL, Consumer Key, Consumer Secret → "Kiểm tra" → green "connected"
- [ ] "Kiểm tra" with invalid credentials → red error with WooCommerce-specific message
- [ ] "Lưu" → credentials encrypted in DB (verified by reading app_settings table)
- [ ] After save, reload → credentials still present
- [ ] Credentials panel shows masked values (••••••••••••)

---

## Settings > Thông tin công ty

- [ ] Saving company name → persisted
- [ ] Saving logo URL → persisted
- [ ] Saving all fields → no error
- [ ] Reload → values still present

---

## /products Page

### Medusa Source Active

- [ ] Products load from Medusa API
- [ ] "Thêm sản phẩm" button visible
- [ ] Product cards show correct data (name, price, stock, image)
- [ ] "Edit" action works on product cards
- [ ] Product detail modal shows full info
- [ ] Filtering (search, category, status, stock) works
- [ ] Toolbar refresh button works

### WooCommerce Source Active

- [ ] Products load from WooCommerce API directly
- [ ] "Thêm sản phẩm" button hidden
- [ ] Product cards display WooCommerce products correctly
- [ ] Products show WooCommerce price, stock, images
- [ ] Sorting works (Ngày mới nhất, Ngày cũ nhất, Tên A-Z, Tên Z-A, Giá thấp đến cao, Giá cao đến thấp)
- [ ] Category filter uses WooCommerce categories
- [ ] Status filter shows: Hoạt động, Bản nháp, Chờ duyệt, Riêng tư
- [ ] Stock filter shows: Còn hàng, Hết hàng, Đang chờ hàng
- [ ] Product detail modal shows WooCommerce info
- [ ] Toolbar refresh button works
- [ ] Page header shows "... từ WooCommerce"
- [ ] No Medusa API calls made when WooCommerce is active

### Source-Specific Errors

- [ ] Medusa: invalid token → error message mentions Medusa, links to settings
- [ ] WooCommerce: invalid key → error message mentions WooCommerce, links to settings
- [ ] Medusa: backend offline → network error with specific URL mentioned
- [ ] WooCommerce: site offline → connection error with hint

### Banner States

- [ ] Medusa: not configured → blue banner with "Chưa kết nối Medusa Backend"
- [ ] WooCommerce: not configured → green banner with "Chưa kết nối WooCommerce API"
- [ ] Configured → no banner, products display normally

---

## /products — WooCommerce Edit Flow

### WooCommerce Product Card

- [ ] Product cards show correct stock badge: "Còn hàng" (green), "Hết hàng" (red), "Đang chờ hàng" (orange)
- [ ] Stock badge matches `/products/sync` preview styling
- [ ] Status badge shows correct Vietnamese label: "Hoạt động", "Bản nháp", "Chờ duyệt", "Riêng tư"
- [ ] "Sửa nâng cao" menu item hidden in WooCommerce mode

### WooCommerce Product Detail Modal

- [ ] Click product card "Xem" → detail modal opens
- [ ] Modal shows source badge: "WooCommerce"
- [ ] Modal shows WooCommerce product ID
- [ ] Modal shows stock badge with correct Vietnamese label
- [ ] Modal shows status badge with correct Vietnamese label
- [ ] Modal shows short description
- [ ] "Sửa sản phẩm" button opens WooCommerce edit dialog

### WooCommerce Product Edit Dialog

- [ ] Edit dialog opens with product data pre-filled
- [ ] Name field is editable
- [ ] Status dropdown shows: Hoạt động, Bản nháp, Chờ duyệt, Riêng tư
- [ ] Regular price editable
- [ ] Sale price editable
- [ ] Stock status dropdown works: Còn hàng, Hết hàng, Đang chờ hàng
- [ ] Manage stock toggle works
- [ ] Stock quantity field appears when manage_stock is on
- [ ] Short description field editable
- [ ] "Lưu lên WooCommerce" button calls PUT /api/woo/products/{id}
- [ ] Success: toast "Đã cập nhật sản phẩm trên WooCommerce!"
- [ ] Success: product list refreshes
- [ ] Error: toast shows WooCommerce error message
- [ ] After save: dialog closes
- [ ] Read-only fields shown for SKU, categories, tags, images

### WooCommerce Edit — No Medusa Calls

- [ ] No Medusa API calls made during WooCommerce edit flow
- [ ] Edit dialog uses WooCommerce API (PUT /api/woo/products/{id})
- [ ] Error messages mention WooCommerce, not Medusa

---

## /products/categories Page

### WooCommerce Source Active

- [ ] Categories load from WooCommerce API
- [ ] No Medusa API calls made
- [ ] Error message shows "Không thể kết nối WooCommerce"
- [ ] Inactive count shows 0 (WooCommerce has no is_active concept)
- [ ] "Thêm danh mục" button hidden
- [ ] "Đổi nguồn dữ liệu" link shown

### Medusa Source Active

- [ ] Categories load from Medusa API
- [ ] Active/Inactive counts display correctly
- [ ] "Thêm danh mục" button visible
- [ ] Error message shows "Không thể kết nối Medusa"

---

## /products/tags Page

### WooCommerce Source Active

- [ ] Tags load from WooCommerce API
- [ ] No Medusa API calls made
- [ ] Error message shows "Không thể kết nối WooCommerce"
- [ ] Create/Edit/Delete buttons hidden
- [ ] Read-only display with product count per tag
- [ ] Stats show: synced = total, manual = 0

### Medusa Source Active

- [ ] Tags load from Medusa API
- [ ] Create/Edit/Delete buttons visible
- [ ] Error message shows "Không thể kết nối Medusa"

---

## /products/brands Page

### WooCommerce Source Active

- [ ] Shows read-only Medusa collections with info message
- [ ] No Medusa API calls made for brands
- [ ] "Đổi nguồn dữ liệu" link shown
- [ ] Create button hidden

### Medusa Source Active

- [ ] Brands load from Medusa collections API
- [ ] Create/Edit/Delete buttons visible

---

## Source Switching

- [ ] Switch WooCommerce → Medusa → Products immediately loads from Medusa
- [ ] Switch Medusa → WooCommerce → Products immediately loads from WooCommerce
- [ ] Both credentials remain stored after switching
- [ ] Switching back to first source → previous credentials still work

---

## WooCommerce Pagination

- [ ] /products loads more than 100 products if WooCommerce has > 100
- [ ] Product count in header matches WooCommerce total (not capped at 100)
- [ ] Pagination controls show correct total pages based on loaded products
- [ ] Sorting works on full loaded product list (not just first 100)
- [ ] Search works on full loaded product list
- [ ] Category filter works on full loaded product list
- [ ] Status filter works on full loaded product list
- [ ] Stock filter works on full loaded product list

---

## WooCommerce Image Display

- [ ] `instock` products show normal (color) images
- [ ] `outofstock` products show grayscale (black & white) images
- [ ] `onbackorder` products show normal (color) images (not grayscale)
- [ ] Image aspect ratio is square (1:1)

---

## WooCommerce Edit — Full-Page Editor (`/products/[id]/woo-edit`)

### Page Navigation
- [ ] Click "Sửa" on WooCommerce product card navigates to `/products/[id]/woo-edit`
- [ ] Click "Sửa sản phẩm" in detail modal navigates to `/products/[id]/woo-edit`
- [ ] Breadcrumb: Sản phẩm > [Product Name]
- [ ] Header shows WooCommerce badge and "Xem trên web" button (if permalink exists)
- [ ] "Quay lại" button navigates back to `/products`
- [ ] Page uses full-screen layout (not a modal)
- [ ] Header sticky with product name, WooCommerce badge, View on web, Back, Save
- [ ] Left content area flexible, right sidebar 340px fixed width
- [ ] Layout stable — switching tabs does not change content width or sidebar position
- [ ] Grid: main column (1fr) + sidebar (340px), sidebar below main on small screens

### Regression: Layout Stability
- [ ] Switch every tab 3 times — content width stays the same
- [ ] Sidebar position stays fixed during tab switching
- [ ] Tab header does not jump or shift
- [ ] Tab content area height is stable (no jarring growth/shrink)
- [ ] Skeleton and loaded state have matching layout

### Tab Navigation
- [ ] 5 tabs displayed: Tổng quan, Danh mục & Thẻ, Hình ảnh, Mô tả, Nâng cao
- [ ] "Giá & Kho" tab no longer exists (merged into Tổng quan)
- [ ] Tabs are centered, wide, and clearly active-styled

### Tab: Tổng quan
- [ ] Product name pre-populates from product data
- [ ] SKU pre-populates from product
- [ ] Status and visibility controls NOT shown in this tab (they are in sidebar)
- [ ] Regular price pre-populates and saves
- [ ] Sale price pre-populates and saves
- [ ] Discount percentage displays correctly when sale < regular
- [ ] Sale date range fields work
- [ ] Stock status dropdown shows instock/outofstock/onbackorder
- [ ] Manage stock toggle enables/disables stock quantity field
- [ ] Stock quantity saves correctly
- [ ] Backorders dropdown shows no/notify/yes
- [ ] Sold individually toggle works

### Tab: Hình ảnh
- [ ] Featured image and gallery displayed side by side (2-column layout, not stacked)
- [ ] Featured image shows large square preview
- [ ] Media ID badge shows green for WordPress Media, yellow for URL
- [ ] Click on featured image opens lightbox zoom
- [ ] "Chọn từ thư viện" opens MediaPicker
- [ ] "Xoá" removes featured image
- [ ] Gallery shows as thumbnail grid (3-4 columns), not vertical list
- [ ] Gallery images show number badges (#1, #2...)
- [ ] Click gallery thumbnail opens lightbox zoom
- [ ] Hover on gallery thumbnail shows zoom icon + set-featured + remove buttons
- [ ] "Thêm ảnh từ thư viện" opens MediaPicker
- [ ] "Upload" opens MediaPicker
- [ ] Gallery reorder works (move up/down)

### Tab: Danh mục & Thẻ
- [ ] Category search box filters tree by name
- [ ] Search preserves parent/child hierarchy in results
- [ ] No results shows "Không tìm thấy danh mục phù hợp"
- [ ] Selected categories shown as removable chips below tree
- [ ] Tag chips display tag **name** (not raw number ID)
- [ ] Tag with unknown name shows "Tag #ID" (not bare number)
- [ ] Tag suggestions appear based on product name + category (sorted by relevance)
- [ ] Tag search filters WooCommerce tags
- [ ] Clicking suggestion tag adds it (not toggle)
- [ ] New tags shown with "(mới)" label and dashed border
- [ ] Adding tag with existing name shows error toast
- [ ] Save sends correct tag payload to WooCommerce (existing tags: {id}, new tags: {name})

### Tab: Mô tả
- [ ] HtmlEditor shows 2 tabs: Soạn (Visual) and HTML (Code)
- [ ] Soạn mode: rendered HTML preview, clean view, no toolbar
- [ ] Soạn mode: "Xem trước" button opens preview dialog
- [ ] Preview dialog shows full prose layout, no toolbar
- [ ] Preview dialog "Chỉnh sửa HTML" button switches to HTML mode
- [ ] HTML mode: monospace textarea with full formatting toolbar
- [ ] HTML toolbar: Bold, Italic, H2, P, Bullet list, Numbered list, Link, Undo/Redo
- [ ] Toolbar only visible in HTML mode (not in Soạn mode)
- [ ] Undo/redo work correctly
- [ ] Full description field pre-populates with existing HTML
- [ ] Short description field pre-populates
- [ ] Existing HTML preserved when switching modes
- [ ] Save sends correct `short_description` and `description` to WooCommerce

### Tab: Nâng cao
- [ ] Menu order field works
- [ ] Purchase note field works
- [ ] Add metadata key/value pair works
- [ ] Remove metadata pair works
- [ ] Empty metadata shows placeholder message

### Save & Validation
- [ ] Save button disabled when name is empty
- [ ] Sale price > regular price shows error toast
- [ ] Save button shows loading spinner during save
- [ ] Success toast "Đã cập nhật sản phẩm trên WooCommerce!" appears
- [ ] After save, page stays on `/products/[id]/woo-edit` and refreshes product data
- [ ] Dirty indicator (yellow dot) shows when form has unsaved changes
- [ ] Cancel / "Quay lại" button works without saving
- [ ] Error toast shows WooCommerce error message (not Medusa)

### Edge Cases
- [ ] Open edit for product with missing SKU → form opens without crash
- [ ] Open edit for product with missing price → form opens without crash
- [ ] Open edit with no short_description → shows empty without crash
- [ ] Open edit with no description → shows empty without crash
- [ ] Open edit with no images → featured shows empty state
- [ ] Open edit with no categories → category tree empty, no crash
- [ ] Open edit with no tags → tag section empty, no crash
- [ ] Open edit with no purchase_note → shows empty without crash
- [ ] Open edit with no menu_order → shows empty without crash
- [ ] Open edit with HTML description → HTML preserved in editor

---

## WooCommerce Category Display

- [ ] Products with single category show that category name
- [ ] Products with parent/child categories show "Parent / Child" format
- [ ] Category names are not duplicated
- [ ] Products with no categories show empty category field
- [ ] Category filter dropdown shows all WooCommerce categories

---

## WordPress Media API

### Media Library (GET /api/wordpress-media)
- [ ] GET /api/wordpress-media returns media items from WordPress REST API
- [ ] Pagination works (X-WP-TotalPages, X-WP-Total headers)
- [ ] Search query filters media items
- [ ] Returns error if WooCommerce not configured
- [ ] Returns error with clear message on API failure

### Media Upload (POST /api/wordpress-media)
- [ ] POST with multipart/form-data uploads to WordPress Media Library
- [ ] Uploaded media returns id, source_url, title, alt
- [ ] Returns error if file is missing
- [ ] Returns error with clear message on upload failure
- [ ] Supports common image formats (jpg, png, gif, webp, svg)

---

## MediaPicker Component

### Dialog
- [ ] Dialog opens from Images tab
- [ ] Dialog has Library and Upload tabs
- [ ] Dialog closes on cancel or confirm

### Library Tab
- [ ] Media grid loads from WordPress Media Library
- [ ] Grid shows image thumbnails
- [ ] Search filters media items
- [ ] Pagination navigation works
- [ ] Single-select mode (featured): clicking image selects it, clicking again deselects
- [ ] Multi-select mode (gallery): clicking toggles selection, check mark shows
- [ ] Selected images show blue border and checkmark

### Upload Tab
- [ ] Drag-and-drop zone accepts image files
- [ ] Click on zone opens file picker
- [ ] Non-image files show error toast
- [ ] Upload shows loading spinner
- [ ] Uploaded image preview shows
- [ ] Uploaded image auto-selected
- [ ] Upload error shows clear error message

### Confirm
- [ ] "Xác nhận" button confirms selection
- [ ] In single mode, only first selected item is returned
- [ ] In multi mode, all selected items are returned
- [ ] Dialog closes after confirm

---

## Status and Stock Display

### WooCommerce Status

- [ ] `publish` displays as "Hoạt động" (green badge)
- [ ] `draft` displays as "Bản nháp" (secondary badge)
- [ ] `pending` displays as "Chờ duyệt" (outline badge)
- [ ] `private` displays as "Riêng tư" (outline badge)

### WooCommerce Stock

- [ ] `instock` displays as "Còn hàng" with stock quantity when available
- [ ] `outofstock` displays as "Hết hàng" (red badge)
- [ ] `onbackorder` displays as "Đang chờ hàng" (warning badge)
- [ ] When manage_stock=true, stock_quantity shown
- [ ] When manage_stock=false, stock_status used

---

## Security

- [ ] Consumer Key/Secret masked after save (••••••••••••)
- [ ] JWT Token masked after save
- [ ] Raw credentials never appear in API response body (GET /api/settings)
- [ ] WooCommerce credentials decrypted correctly in /api/woo proxy
- [ ] Medusa token used correctly in /api/medusa proxy

---

## Integration with other modules

- [ ] /migration page still works (needs raw WooCommerce credentials)
- [ ] /workspace dashboard (if it uses products) loads correctly
- [ ] Company logo from settings updates correctly (if feature exists)
