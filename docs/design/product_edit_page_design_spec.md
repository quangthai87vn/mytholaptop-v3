# Product Edit Page Design Specification - Admin UI

Tài liệu này dùng để Cursor đọc trước khi thiết kế và chỉnh sửa UI trang **Sửa sản phẩm** trong `admin-ui`.

Mục tiêu là xây dựng trang sửa sản phẩm chuyên nghiệp cho hệ thống Mỹ Tho Laptop, dùng với Medusa backend và dữ liệu sản phẩm đã migrate từ WordPress/WooCommerce.

---

## 1. Mục tiêu trang sửa sản phẩm

Trang sửa sản phẩm dùng để:

- Xem và cập nhật thông tin sản phẩm.
- Cập nhật tên, slug/handle, mô tả, trạng thái.
- Cập nhật giá thông thường và giá khuyến mãi.
- Cập nhật danh mục và thẻ sản phẩm.
- Kiểm tra tồn kho hoặc trạng thái kho hàng.
- Xem ảnh sản phẩm, gallery ảnh.
- Kiểm tra dữ liệu SEO và metadata từ WordPress.
- Cập nhật trực tiếp vào Medusa thông qua API server-side an toàn.

Trang này không dùng để migration lại sản phẩm. Không sửa logic migration nếu không cần thiết.

---

## 2. Route

Trang sửa sản phẩm:

```txt
apps/admin-ui/app/(admin)/products/[id]/edit/page.tsx
```

URL:

```txt
/products/[id]/edit
```

Ví dụ:

```txt
/products/prod_01HXXX/edit
```

Từ trang danh sách sản phẩm `/products`, khi click `Sửa sản phẩm` trong action menu, phải điều hướng sang route này.

Không mở dialog lớn để sửa sản phẩm trong trang danh sách.

---

## 3. Luồng điều hướng

Từ `/products`:

```txt
Product card / Action menu / Sửa sản phẩm
→ /products/[id]/edit
```

Trong trang edit:

```txt
Nút Quay lại
→ /products
```

Sau khi bấm `Lưu thay đổi` thành công:

Option đề xuất:

```txt
Ở lại trang edit và hiện toast "Đã cập nhật sản phẩm"
```

Hoặc:

```txt
Redirect về /products sau khi lưu thành công
```

Ưu tiên giai đoạn đầu: **ở lại trang edit** để người dùng kiểm tra dữ liệu.

---

## 4. Bố cục tổng thể

Trang sửa sản phẩm nên có bố cục:

```txt
Page Header
  - Breadcrumb
  - Title: Sửa sản phẩm
  - Description
  - Status Badge
  - Actions: Huỷ, Lưu thay đổi

Main Layout
  - Left/Main column: Form tabs
  - Right sidebar: Preview / Summary / WordPress metadata quick info

Tabs
  1. Thông tin chung
  2. Giá bán
  3. Danh mục & thẻ
  4. Tồn kho
  5. Hình ảnh
  6. SEO & nội dung
  7. Metadata WordPress
```

Desktop:

```txt
Main content: 70%
Right sidebar: 30%
```

Mobile/tablet:

```txt
Stack layout, sidebar nằm dưới form
```

---

## 5. Page Header

Page header cần có:

```txt
Breadcrumb:
Sản phẩm / Quản lý sản phẩm / Sửa sản phẩm

Title:
Sửa sản phẩm

Description:
Cập nhật thông tin sản phẩm, giá bán, danh mục, tồn kho và nội dung hiển thị.
```

Actions:

```txt
Huỷ
Lưu thay đổi
```

Yêu cầu:

- Nút `Lưu thay đổi` nằm bên phải, màu primary đỏ.
- Nút `Huỷ` là secondary/outline.
- Khi đang lưu, nút `Lưu thay đổi` hiển thị loading.
- Nếu form có thay đổi chưa lưu, có thể hiển thị badge `Chưa lưu`.

---

## 6. Component shadcn/ui nên dùng

Ưu tiên dùng:

```txt
Button
Card
CardHeader
CardTitle
CardDescription
CardContent
Input
Textarea
Select
Tabs
Badge
Switch
Checkbox
Separator
Alert
Skeleton
DropdownMenu
Popover
Command
ScrollArea
Tooltip
```

Không dùng:

```txt
MUI
Ant Design
Bootstrap
Component tự chế khi shadcn/ui đã có
```

---

## 7. Component nên tách

Không để `page.tsx` quá dài.

Component đề xuất:

```txt
apps/admin-ui/components/products/edit/product-edit-form.tsx
apps/admin-ui/components/products/edit/product-edit-header.tsx
apps/admin-ui/components/products/edit/product-basic-tab.tsx
apps/admin-ui/components/products/edit/product-pricing-tab.tsx
apps/admin-ui/components/products/edit/product-categories-tab.tsx
apps/admin-ui/components/products/edit/product-inventory-tab.tsx
apps/admin-ui/components/products/edit/product-images-tab.tsx
apps/admin-ui/components/products/edit/product-seo-tab.tsx
apps/admin-ui/components/products/edit/product-wordpress-metadata-tab.tsx
apps/admin-ui/components/products/edit/product-edit-sidebar.tsx
apps/admin-ui/components/products/edit/product-save-bar.tsx
```

Helper/service đề xuất:

```txt
apps/admin-ui/lib/products/product-edit-mappers.ts
apps/admin-ui/lib/products/product-edit-validation.ts
apps/admin-ui/lib/products/product-price-utils.ts
apps/admin-ui/lib/products/product-stock-utils.ts
```

API/service đề xuất:

```txt
apps/admin-ui/lib/medusa/products.ts
apps/admin-ui/app/api/medusa/products/[id]/route.ts
apps/admin-ui/app/api/medusa/categories/route.ts
```

Nếu project đã có file tương tự, tái sử dụng thay vì tạo trùng.

---

## 8. Data loading

Trang edit cần tải dữ liệu sản phẩm theo `id`.

Yêu cầu:

```txt
GET /api/medusa/products/[id]
```

Không gọi Medusa Admin API trực tiếp từ client nếu cần token.

Luồng an toàn:

```txt
Client page
→ API route nội bộ admin-ui
→ server-side gọi Medusa Admin API
→ trả dữ liệu đã map về client
```

Không expose JWT token ra browser.

---

## 9. Product response cần inspect trước khi code

Trước khi map form, Cursor phải kiểm tra response product hiện có có các field nào:

```txt
product.id
product.title
product.handle
product.description
product.status
product.thumbnail
product.images
product.variants
product.categories
product.collection
product.type
product.tags nếu có
product.metadata
```

Đặc biệt kiểm tra:

```txt
product.metadata.wordpress_id
product.metadata.wordpress_regular_price
product.metadata.wordpress_sale_price
product.metadata.wordpress_price
product.metadata.wordpress_stock_status
product.metadata.wordpress_manage_stock
product.metadata.wordpress_categories
product.metadata.wordpress_category_ids
product.metadata.wordpress_category_names
product.metadata.wordpress_tags
product.metadata.wordpress_tag_names
product.metadata.wordpress_tag_slugs
```

Không đoán bừa field. Phải có mapper rõ ràng.

---

## 10. Mapper bắt buộc

Tạo mapper:

```ts
mapMedusaProductToEditForm(product)
mapEditFormToMedusaUpdatePayload(form)
```

Không để logic mapping rải rác trong component UI.

### 10.1 Form model đề xuất

```ts
type ProductEditForm = {
  id: string
  title: string
  handle: string
  sku?: string
  status: "published" | "draft"
  shortDescription?: string
  description?: string

  regularPrice?: number | null
  salePrice?: number | null
  currentPrice?: number | null
  currencyCode: "vnd"

  categoryIds: string[]
  categoryNames: string[]
  tags: string[]

  manageInventory: boolean
  stockQuantity?: number | null
  stockStatus: "instock" | "outofstock" | "onbackorder" | "unknown"

  thumbnail?: string | null
  images: string[]

  seoTitle?: string
  seoDescription?: string

  wordpressMetadata?: Record<string, unknown>
}
```

---

## 11. Tab 1 - Thông tin chung

Tab này là phần quan trọng nhất.

Fields:

```txt
Tên sản phẩm
Handle / Slug
SKU
Trạng thái sản phẩm
Mô tả ngắn
Mô tả chi tiết
```

### 11.1 Tên sản phẩm

Field:

```txt
title
```

Yêu cầu:

- Bắt buộc.
- Không được rỗng.
- Hiển thị đúng tên sản phẩm hiện tại.
- Khi title đổi, có thể gợi ý update handle nhưng không tự ép nếu user đã chỉnh handle thủ công.

### 11.2 Handle / Slug

Field:

```txt
handle
```

Yêu cầu:

- Bắt buộc.
- Lowercase.
- Không dấu.
- Dùng dấu `-`.
- Có nút nhỏ `Tạo lại từ tên` nếu dễ làm.

Ví dụ:

```txt
Dell Inspiron 3593
→ dell-inspiron-3593
```

### 11.3 SKU

Field:

```txt
sku
```

Nguồn dữ liệu:

```txt
product.variants[0].sku
metadata.wordpress_sku
```

Yêu cầu:

- Hiển thị SKU hiện tại.
- Cho phép sửa nếu API hỗ trợ update variant.
- Nếu chưa hỗ trợ, disable field và ghi chú.

### 11.4 Trạng thái sản phẩm

Options:

```txt
Hoạt động / Published
Nháp / Draft
```

Mapping:

```txt
Hoạt động → published
Nháp      → draft
```

### 11.5 Mô tả ngắn

Nguồn:

```txt
metadata.short_description
metadata.wordpress_short_description
```

Nếu chưa có field chuẩn, lưu vào metadata.

### 11.6 Mô tả chi tiết

Nguồn:

```txt
product.description
metadata.wordpress_description nếu có
```

Yêu cầu:

- Dùng textarea hoặc editor đơn giản.
- Giai đoạn đầu dùng textarea.
- Nếu HTML từ WordPress còn link ảnh cũ, không rewrite tại đây, chỉ cảnh báo ở tab SEO & nội dung.

---

## 12. Tab 2 - Giá bán

Fields:

```txt
Giá thông thường
Giá khuyến mãi
Giá đang bán
Currency
```

### 12.1 Nguồn dữ liệu giá

Ưu tiên đọc:

```txt
1. Medusa variant price/calculated price
2. metadata.wordpress_sale_price
3. metadata.wordpress_regular_price
4. metadata.wordpress_price
```

### 12.2 Logic hiển thị

Nếu có:

```txt
regularPrice = 11990000
salePrice = 9990000
```

Hiển thị:

```txt
Giá đang bán: 9.990.000đ
Giá thông thường: 11.990.000đ
```

Nếu không có sale price:

```txt
Giá đang bán = regularPrice hoặc currentPrice
```

### 12.3 Validation giá

- Giá thông thường phải là số >= 0.
- Giá khuyến mãi phải là số >= 0.
- Giá khuyến mãi không nên lớn hơn giá thông thường.
- Nếu giá khuyến mãi lớn hơn giá thường, hiển thị warning.

### 12.4 Update giá

Khi lưu:

- Nếu Medusa đang dùng price set/variant price, update đúng variant price.
- Không chỉ update metadata nếu API đã hỗ trợ giá thật.
- Nếu chưa update được price set, lưu fallback vào metadata và ghi rõ trong code/comment.

Payload cần rõ ràng:

```txt
variant_id
regular_price
sale_price
currency_code = vnd
```

---

## 13. Tab 3 - Danh mục & thẻ

Fields:

```txt
Danh mục sản phẩm
Thẻ sản phẩm
```

### 13.1 Danh mục

Yêu cầu UI:

- Hiển thị danh mục dạng cây cha/con.
- Cho phép chọn một hoặc nhiều danh mục nếu hệ thống hỗ trợ.
- Có search category.
- Hiển thị selected categories dạng badge.

Nguồn dữ liệu:

```txt
product.categories
metadata.wordpress_category_ids
metadata.wordpress_category_names
metadata.wordpress_categories
```

Nếu relation category chưa attach được, UI vẫn nên hiển thị fallback từ metadata để debug.

Component có thể dùng:

```txt
ProductCategorySelector
CategoryTreeSelect
```

### 13.2 Thẻ sản phẩm

Nguồn dữ liệu:

```txt
product.tags nếu có
metadata.wordpress_tag_names
metadata.wordpress_tags
metadata.wordpress_tag_slugs
```

Yêu cầu:

- Hiển thị tags dạng badge.
- Cho phép thêm tag mới nếu backend hỗ trợ.
- Nếu backend chưa hỗ trợ tag thật, cho phép sửa danh sách tags lưu trong metadata.
- Không làm mất tags migrate từ WordPress.

### 13.3 SEO cũ

Tags từ WordPress giúp giữ SEO/filter cũ. Không được bỏ qua.

---

## 14. Tab 4 - Tồn kho

Fields:

```txt
Quản lý tồn kho
Trạng thái kho hàng
Số lượng tồn kho
Ghi chú kho
```

### 14.1 Logic đặc biệt từ WooCommerce

WooCommerce có thể không quản lý số lượng tồn kho.

Các field metadata quan trọng:

```txt
wordpress_manage_stock
wordpress_stock_status
wordpress_stock_quantity
```

Mapping:

```txt
wordpress_stock_status = instock
→ Còn hàng

wordpress_stock_status = outofstock
→ Hết hàng

wordpress_stock_status = onbackorder
→ Đang chờ hàng
```

Nếu:

```txt
wordpress_manage_stock = false
wordpress_stock_status = instock
```

UI phải hiển thị:

```txt
Không quản lý số lượng - Còn hàng
```

Không được ép thành `Hết hàng`.

### 14.2 Manage Inventory

Switch:

```txt
Quản lý số lượng tồn kho
```

Nếu bật:

```txt
Hiển thị input số lượng tồn kho
```

Nếu tắt:

```txt
Ẩn/disable input số lượng
Chỉ dùng trạng thái kho hàng
```

### 14.3 Validation tồn kho

- Quantity phải là số >= 0.
- Nếu manageInventory = true và quantity = 0, có thể hiển thị Hết hàng.
- Nếu manageInventory = false, không được dùng quantity null/0 để kết luận hết hàng.

---

## 15. Tab 5 - Hình ảnh

Fields:

```txt
Ảnh đại diện
Gallery ảnh
URL ảnh
Nguồn ảnh WordPress nếu có
```

Yêu cầu:

- Hiển thị thumbnail hiện tại.
- Hiển thị gallery ảnh hiện tại.
- Nếu chưa có upload API, nút `Thay ảnh` hoặc `Thêm ảnh` có thể disabled.
- Nếu ảnh migrate từ WordPress, hiển thị source URL nếu metadata có.
- Không tự xoá ảnh.

### 15.1 UI đề xuất

```txt
Card: Ảnh đại diện
Card: Gallery
Card: Nguồn ảnh migrate
```

### 15.2 Cảnh báo ảnh cũ

Nếu image URL còn domain WordPress cũ, hiển thị warning:

```txt
Ảnh này vẫn đang dùng URL từ WordPress cũ.
```

---

## 16. Tab 6 - SEO & nội dung

Fields:

```txt
SEO title
SEO description
Handle/Slug
Kiểm tra link ảnh trong mô tả
```

### 16.1 SEO title/description

Nếu project chưa có SEO field chuẩn, lưu vào metadata:

```txt
seo_title
seo_description
```

### 16.2 Kiểm tra link ảnh cũ trong description

Nếu description chứa:

```txt
wp-content/uploads
old WordPress domain
```

hiển thị Alert:

```txt
Mô tả sản phẩm vẫn còn link ảnh từ WordPress cũ. Nên chạy công cụ rewrite ảnh trong Migration.
```

Không tự rewrite tại trang edit nếu chưa có API riêng.

### 16.3 Preview snippet

Có thể hiển thị preview đơn giản:

```txt
SEO Title
SEO Description
/products/handle
```

---

## 17. Tab 7 - Metadata WordPress

Tab này chỉ đọc, phục vụ debug migration.

Hiển thị:

```txt
WordPress product ID
WordPress SKU
WordPress regular price
WordPress sale price
WordPress current price
WordPress manage stock
WordPress stock status
WordPress stock quantity
WordPress categories
WordPress tags
WordPress image URLs
WordPress original URL nếu có
```

Yêu cầu:

- Không cho sửa trực tiếp ở tab này.
- Dùng Card hoặc table key-value.
- Có nút copy JSON metadata nếu dễ làm.
- Không hiển thị dữ liệu quá rối trong main form.

---

## 18. Right Sidebar - Product Summary

Sidebar bên phải nên có:

```txt
Product preview card
Trạng thái sản phẩm
Trạng thái tồn kho
Giá hiện tại
SKU
Danh mục
Tags
WordPress ID
Ngày cập nhật nếu có
```

### 18.1 Product Preview Card

Hiển thị:

- Ảnh thumbnail.
- Tên sản phẩm.
- Giá đang bán.
- Giá thường gạch ngang nếu có.
- Badge tồn kho.
- Badge trạng thái.

### 18.2 Quick Diagnostics

Hiển thị cảnh báo nhỏ nếu có:

```txt
Thiếu danh mục
Thiếu giá
Chưa có ảnh
Còn link ảnh WordPress cũ
Tồn kho chưa đồng bộ
```

---

## 19. Save bar

Có thể có sticky save bar ở cuối hoặc dùng actions ở header.

Save bar gồm:

```txt
Huỷ
Lưu thay đổi
```

Nếu form dirty:

```txt
Bạn có thay đổi chưa lưu
```

Nếu save thành công:

```txt
Toast: Đã cập nhật sản phẩm
```

Nếu save thất bại:

```txt
Alert: Không thể cập nhật sản phẩm
```

Không làm mất dữ liệu form khi update lỗi.

---

## 20. API update

Trang edit cần update thông qua API nội bộ.

Đề xuất:

```txt
GET   /api/medusa/products/[id]
PATCH /api/medusa/products/[id]
GET   /api/medusa/categories
```

Nếu cần tags:

```txt
GET   /api/medusa/tags
```

Hoặc tags từ metadata.

### 20.1 Không expose token

Không được:

```txt
Gọi Medusa Admin API trực tiếp từ client kèm JWT
Lưu JWT trong localStorage
Trả JWT về response client
```

Phải:

```txt
Client gọi API route nội bộ
API route server-side gọi Medusa
Token nằm server-side
```

---

## 21. Update payload đề xuất

Payload từ form gửi về API nội bộ:

```ts
type UpdateProductPayload = {
  title: string
  handle: string
  description?: string
  status: "published" | "draft"

  variant?: {
    id?: string
    sku?: string
    regular_price?: number | null
    sale_price?: number | null
    currency_code: "vnd"
    manage_inventory?: boolean
    inventory_quantity?: number | null
    stock_status?: "instock" | "outofstock" | "onbackorder"
  }

  category_ids?: string[]

  metadata?: {
    short_description?: string
    seo_title?: string
    seo_description?: string
    wordpress_tag_names?: string[]
    wordpress_tag_slugs?: string[]
    wordpress_stock_status?: string
    wordpress_manage_stock?: boolean
  }
}
```

Server-side API route chịu trách nhiệm map payload này sang Medusa API/service đúng format.

---

## 22. Loading state

Khi đang tải product:

- Hiển thị skeleton cho page header.
- Hiển thị skeleton card cho form.
- Hiển thị skeleton sidebar.

Không để trang trắng.

---

## 23. Error state

Nếu product không tồn tại:

```txt
Không tìm thấy sản phẩm
```

Có nút:

```txt
Quay lại danh sách sản phẩm
```

Nếu API lỗi:

```txt
Không thể tải dữ liệu sản phẩm
```

Có nút:

```txt
Thử lại
```

---

## 24. Validation

Validation tối thiểu:

```txt
Tên sản phẩm bắt buộc
Handle bắt buộc
Giá phải là số >= 0
Giá khuyến mãi không nên lớn hơn giá thông thường
SKU không được rỗng nếu đang update variant SKU
Stock quantity phải là số >= 0
Status phải hợp lệ
```

Nếu validation lỗi:

- Hiển thị lỗi dưới input.
- Không submit API.

---

## 25. Dialog accessibility

Nếu trang edit vẫn dùng Dialog cho một số thao tác nhỏ như chọn ảnh, chọn danh mục, xác nhận rời trang, thì mọi `DialogContent` bắt buộc phải có:

```tsx
<DialogHeader>
  <DialogTitle>...</DialogTitle>
</DialogHeader>
```

Nếu không muốn hiện title:

```tsx
<DialogTitle className="sr-only">...</DialogTitle>
```

Không được để lỗi:

```txt
DialogContent requires a DialogTitle
```

---

## 26. Không được làm

Không được:

- Sửa Medusa core.
- Sửa database trực tiếp.
- Sửa migration logic nếu không liên quan.
- Xoá sản phẩm.
- Tạo duplicate product.
- Expose JWT token ra client.
- Hardcode product/category/tag.
- Đưa toàn bộ logic vào `page.tsx`.
- Làm mất logic giá/tồn kho/tags/category đang hoạt động ở trang list.
- Dùng modal lớn thay cho trang edit.

---

## 27. Acceptance Criteria

Sau khi hoàn thành, trang edit phải đạt:

- Từ `/products` click `Sửa sản phẩm` vào được `/products/[id]/edit`.
- Trang edit load đúng dữ liệu sản phẩm.
- Hiển thị đúng tên, SKU, handle, status.
- Hiển thị đúng giá thường và giá khuyến mãi.
- Hiển thị đúng tồn kho theo logic WooCommerce/Medusa.
- Hiển thị đúng danh mục và tags nếu có.
- Hiển thị ảnh thumbnail/gallery.
- Có tab Metadata WordPress để debug dữ liệu migrate.
- Lưu thay đổi không expose JWT token.
- Có loading/error state.
- Không còn lỗi DialogTitle.
- Code được tách component rõ ràng.

---

## 28. Prompt gợi ý cho Cursor

Khi cần triển khai, dùng prompt:

```md
Trước khi code, hãy đọc kỹ file:

`apps/admin-ui/docs/design/product-edit-page-design-spec.md`

Sau đó kiểm tra:

`apps/admin-ui/app/(admin)/products/page.tsx`

và xây dựng route:

`apps/admin-ui/app/(admin)/products/[id]/edit/page.tsx`

Yêu cầu:
- Refactor action `Sửa sản phẩm` ở trang `/products` để điều hướng sang `/products/[id]/edit`.
- Không mở dialog sửa sản phẩm lớn.
- Sửa mọi lỗi `DialogContent requires a DialogTitle` nếu còn.
- Dựng UI trang sửa sản phẩm theo đúng design spec.
- Tách component vào `components/products/edit`.
- Không sửa migration logic.
- Không sửa Medusa backend.
- Không expose JWT token ra client.

Trước khi code:
1. Tóm tắt yêu cầu chính trong file design spec.
2. Liệt kê file sẽ sửa/tạo.
3. Kiểm tra shape dữ liệu product hiện tại.
4. Nêu mapper sẽ tạo.
5. Nêu API route/service cần dùng.

Sau khi code:
1. Liệt kê file đã sửa/tạo.
2. Nêu field nào update thật vào Medusa.
3. Nêu field nào đang dùng metadata fallback.
4. Hướng dẫn test từ `/products` sang `/products/[id]/edit`.
```

---

## 29. Ghi chú cho Cursor

Đây là trang edit dữ liệu quan trọng. Ưu tiên:

```txt
An toàn dữ liệu
Không expose token
Không phá mapping migrate
Không tạo trùng sản phẩm
Không sửa backend bừa bãi
UI rõ ràng, chia tab dễ hiểu
```

Nếu field nào chưa update thật được do thiếu API, hãy:

```txt
Disable field
Hiển thị ghi chú
Không gửi payload sai
Ghi vào TODO hoặc backend-change-request nếu cần
```
