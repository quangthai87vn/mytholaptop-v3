# Product Page Design Specification - Admin UI

Tài liệu này dùng để Cursor đọc trước khi thiết kế và chỉnh sửa trang quản lý sản phẩm trong `admin-ui`.

## 1. Mục tiêu trang Product

Trang Product là màn hình quản trị danh mục sản phẩm chính của hệ thống Mỹ Tho Laptop.

Trang này dùng để:

- Xem danh sách sản phẩm đã migrate từ WordPress/WooCommerce sang Medusa.
- Tìm kiếm sản phẩm theo tên, SKU, slug hoặc tag.
- Lọc sản phẩm theo danh mục.
- Lọc sản phẩm theo trạng thái sản phẩm.
- Lọc sản phẩm theo trạng thái tồn kho.
- Hiển thị sản phẩm dạng grid card chuyên nghiệp.
- Cho phép tuỳ biến số cột hiển thị.
- Cho phép tuỳ biến số sản phẩm mỗi trang.
- Truy cập nhanh các thao tác: xem chi tiết, sửa sản phẩm, nhân bản, ẩn/ngưng bán.

Trang này **không được sửa logic migration**. Chỉ xử lý giao diện, filter, pagination và điều hướng thao tác sản phẩm.

---

## 2. Route chính

Trang danh sách sản phẩm:

```txt
apps/admin-ui/app/(admin)/products/page.tsx
```

Các route liên quan:

```txt
/products
/products/[id]
/products/[id]/edit
/products/categories
/products/tags
```

Khi click `Sửa sản phẩm`, điều hướng sang:

```txt
/products/[id]/edit
```

Không mở dialog sửa sản phẩm lớn trong trang danh sách.

---

## 3. Bố cục tổng thể

Trang Product cần có bố cục:

```txt
Page Header
  - Title
  - Description
  - Button: Thêm sản phẩm

Toolbar / Filter Area
  - Search input
  - Category tree filter
  - Product status filter
  - Stock status filter
  - Refresh button
  - View settings: columns, page size

Active Filter Badges
  - Search keyword
  - Selected category
  - Selected status
  - Selected stock
  - Button: Xoá bộ lọc

Product Grid
  - Product cards

Pagination
  - Tổng sản phẩm
  - Trang hiện tại
  - Trang trước/sau
  - Page size
```

---

## 4. Page Header

Title:

```txt
Quản lý sản phẩm
```

Description:

```txt
Quản lý danh sách sản phẩm trong cửa hàng.
```

Primary action:

```txt
Thêm sản phẩm
```

Yêu cầu:

- Nút `Thêm sản phẩm` nằm bên phải.
- Dùng shadcn/ui `Button`.
- Icon dấu `+` nếu có.
- Không làm layout bị vỡ trên màn hình nhỏ.

---

## 5. Product Toolbar

Toolbar cần có các thành phần chính.

### 5.1 Search Input

Placeholder:

```txt
Tìm kiếm tên, SKU...
```

Search cần hỗ trợ:

- Tên sản phẩm
- SKU
- Handle/slug nếu có
- Tags nếu có
- Metadata WordPress nếu cần

Khi thay đổi search:

- Reset về trang 1.
- Hoạt động cùng category/status/page size.
- Nếu dùng URL query params, cập nhật `q`.

Query param đề xuất:

```txt
q
```

Ví dụ:

```txt
/products?q=dell
```

---

### 5.2 Category Tree Filter

Hiện tại category dropdown không được hiển thị flat list đơn giản. Cần hiển thị danh mục dạng phân cấp cha/con.

Button mặc định:

```txt
Tất cả danh mục
```

Khi mở dropdown, hiển thị ví dụ:

```txt
Tất cả danh mục
▸ Laptop
  ▸ Laptop Dell
  ▸ Laptop HP
  ▸ Laptop Lenovo
▸ Linh kiện Laptop
  ▸ Adapter - Sạc Laptop
  ▸ Pin Laptop
  ▸ RAM Laptop
▸ Màn hình
  ▸ Màn hình HKC
```

Yêu cầu:

- Danh mục cha có icon folder.
- Danh mục cha có expand/collapse nếu có con.
- Danh mục con thụt vào theo level.
- Level càng sâu càng thụt vào.
- Có search trong dropdown nếu số danh mục nhiều.
- Nếu search category, hiển thị path đầy đủ:

```txt
Linh kiện Laptop / Adapter - Sạc Laptop
```

Nếu API trả danh mục dạng flat:

```ts
type Category = {
  id: string
  name: string
  handle?: string
  parent_category_id?: string | null
  parent_id?: string | null
}
```

thì phải build thành tree trước khi render.

Nếu API trả nested:

```ts
category_children
```

thì có thể dùng trực tiếp.

Component đề xuất:

```txt
apps/admin-ui/components/products/product-category-tree-filter.tsx
apps/admin-ui/components/categories/category-tree.tsx
```

Query param đề xuất:

```txt
category
```

Ví dụ:

```txt
/products?category=laptop-dell
```

Nếu chọn danh mục cha:

- Ưu tiên lọc cả sản phẩm thuộc danh mục cha và danh mục con.
- Nếu dữ liệu chưa hỗ trợ, phải ghi chú rõ trong code.

---

### 5.3 Product Status Filter

Thêm filter trạng thái sản phẩm.

Options:

```txt
Tất cả trạng thái
Hoạt động
Nháp
```

Mapping:

```txt
Hoạt động → product.status = "published"
Nháp      → product.status = "draft"
```

Nếu hệ thống đang dùng status khác thì tạo mapper riêng, không hardcode lung tung trong UI.

Query param đề xuất:

```txt
status
```

Ví dụ:

```txt
/products?status=published
```

---

### 5.4 Stock Status Filter

Thêm filter trạng thái tồn kho.

Options:

```txt
Tất cả tồn kho
Còn hàng
Hết hàng
Đang chờ hàng
Chưa đồng bộ tồn kho
```

Mapping cần hỗ trợ nhiều nguồn dữ liệu:

```txt
Còn hàng:
- metadata.wordpress_stock_status = "instock"
- hoặc stock_status = "instock"
- hoặc computed stock status = "in_stock"

Hết hàng:
- metadata.wordpress_stock_status = "outofstock"
- hoặc stock_status = "outofstock"
- hoặc computed stock status = "out_of_stock"

Đang chờ hàng:
- metadata.wordpress_stock_status = "onbackorder"
- hoặc computed stock status = "backorder"
```

Không được chỉ dựa vào `inventory_quantity === 0`, vì WooCommerce có thể không quản lý số lượng tồn kho.

Query param đề xuất:

```txt
stock
```

Ví dụ:

```txt
/products?stock=instock
```

---

### 5.5 Refresh Button

Button:

```txt
Làm mới
```

Yêu cầu:

- Refresh lại danh sách sản phẩm.
- Giữ nguyên filter hiện tại.
- Không reset search/category/status trừ khi user bấm `Xoá bộ lọc`.

---

## 6. Active Filter Badges

Khi có filter đang được áp dụng, hiển thị badge bên dưới toolbar.

Ví dụ:

```txt
Search: Dell
Danh mục: Laptop Dell
Trạng thái: Hoạt động
Tồn kho: Còn hàng
[Xoá bộ lọc]
```

Yêu cầu:

- Dùng shadcn/ui `Badge` hoặc button nhỏ.
- Có nút xoá từng filter nếu dễ làm.
- Tối thiểu phải có nút `Xoá bộ lọc`.
- Khi xoá filter, reset về trang 1.

---

## 7. Product Grid

Trang đang hiển thị sản phẩm dạng grid card. Giữ hướng này.

Mỗi product card cần hiển thị:

- Ảnh sản phẩm
- Badge tồn kho ở góc trên ảnh
- Tên sản phẩm
- Tags ngắn bên dưới tên nếu có
- Giá bán chính
- Giá thông thường gạch ngang nếu có sale price
- Badge trạng thái tồn kho
- Menu hành động dấu ba chấm

### 7.1 Product Card Fields

Dữ liệu ưu tiên:

```txt
Ảnh:
1. product.thumbnail
2. product.images[0].url
3. placeholder image

Tên:
product.title

SKU:
product.variants[0].sku hoặc metadata.wordpress_sku

Giá:
1. variant calculated price / Medusa price
2. metadata.wordpress_sale_price
3. metadata.wordpress_regular_price
4. metadata.wordpress_price

Tồn kho:
1. computed inventory status
2. metadata.wordpress_stock_status

Tags:
1. product.tags nếu có
2. metadata.wordpress_tag_names
3. metadata.wordpress_tags[].name
```

Không được phá logic giá/tồn kho đang chạy đúng.

---

## 8. Tuỳ biến số cột hiển thị

Thêm control:

```txt
Số cột: 3 / 4 / 5 / 6
```

Yêu cầu:

- Dùng shadcn/ui `Select` hoặc `DropdownMenu`.
- Mặc định desktop: 5 hoặc 6 cột tuỳ màn hình.
- Mobile/tablet vẫn responsive.
- Không ép 6 cột trên mobile.
- Lưu lựa chọn vào localStorage.

LocalStorage key:

```txt
admin-ui.products.gridColumns
```

Gợi ý grid:

```txt
columns = 3 → xl:grid-cols-3
columns = 4 → xl:grid-cols-4
columns = 5 → 2xl:grid-cols-5
columns = 6 → 2xl:grid-cols-6
```

Cần xử lý responsive an toàn:

```txt
grid-cols-1
sm:grid-cols-2
lg:grid-cols-3
```

Sau đó mới áp dụng số cột lớn ở desktop.

---

## 9. Tuỳ biến số sản phẩm mỗi trang

Thêm control:

```txt
Hiển thị: 20 / 30 / 50 / 100 sản phẩm mỗi trang
```

Yêu cầu:

- Khi đổi page size, reset về page 1.
- Lưu lựa chọn vào localStorage.
- Nếu dùng API pagination, truyền `limit` hoặc `pageSize`.
- Nếu lọc client-side, apply page size sau khi filter.
- Text thống kê phải cập nhật đúng.

LocalStorage key:

```txt
admin-ui.products.pageSize
```

Text ví dụ:

```txt
Hiển thị 30 / 1751 sản phẩm (Trang 1 / 59)
```

---

## 10. Pagination

Pagination cần có:

- Trang trước
- Trang sau
- Trang đầu nếu dễ làm
- Trang cuối nếu dễ làm
- Trang hiện tại
- Tổng số trang

Khi thay đổi các filter sau, phải reset về page 1:

- Search
- Category
- Product status
- Stock status
- Page size

Không để pagination sai khi filter.

---

## 11. View Mode tùy chọn

Có thể bổ sung sau, không bắt buộc ngay:

```txt
Grid view
List view
```

Nếu làm:

- Grid view là mặc định.
- List view hiển thị bảng gọn.
- Lưu view mode vào localStorage.

LocalStorage key:

```txt
admin-ui.products.viewMode
```

---

## 12. Helper Filter Logic

Không để toàn bộ filter logic nằm rải rác trong component UI.

Tạo helper nếu cần:

```txt
apps/admin-ui/lib/products/product-filters.ts
```

Các hàm đề xuất:

```ts
filterProductsBySearch(products, search)
filterProductsByCategory(products, categoryId)
filterProductsByProductStatus(products, status)
filterProductsByStockStatus(products, stockStatus)
paginateProducts(products, page, pageSize)
getProductStockStatus(product)
getProductCategoryIds(product)
getProductTagNames(product)
getProductDisplayPrice(product)
```

Category filter phải hỗ trợ:

```txt
1. product.categories
2. product.category_ids nếu có
3. product.metadata.wordpress_category_ids
4. product.metadata.wordpress_categories
```

Stock filter phải hỗ trợ:

```txt
1. product computed stock
2. product.metadata.wordpress_stock_status
3. variant.manage_inventory / inventory quantity nếu có
```

Price display phải hỗ trợ:

```txt
1. Medusa variant price
2. metadata.wordpress_sale_price
3. metadata.wordpress_regular_price
4. metadata.wordpress_price
```

---

## 13. URL Query Params

Ưu tiên đồng bộ filter vào URL nếu project đang dùng router/searchParams.

Params đề xuất:

```txt
q
category
status
stock
page
pageSize
columns
```

Ví dụ:

```txt
/products?q=dell&category=laptop-dell&stock=instock&page=1&pageSize=30&columns=5
```

Nếu đồng bộ URL gây quá phức tạp ở bước đầu, có thể dùng local state trước. Nhưng code phải sạch để nâng cấp sau.

---

## 14. Component nên tách

Không để `page.tsx` quá dài.

Tạo/refactor các component sau nếu chưa có:

```txt
apps/admin-ui/components/products/product-toolbar.tsx
apps/admin-ui/components/products/product-category-tree-filter.tsx
apps/admin-ui/components/products/product-status-filter.tsx
apps/admin-ui/components/products/product-stock-filter.tsx
apps/admin-ui/components/products/product-grid-settings.tsx
apps/admin-ui/components/products/product-pagination.tsx
apps/admin-ui/components/products/product-card-grid.tsx
apps/admin-ui/components/products/product-card.tsx
```

Nếu component hiện có đã tương tự, tái sử dụng và chỉnh sửa, không tạo trùng.

---

## 15. Empty State

Khi filter không có kết quả:

```txt
Không tìm thấy sản phẩm phù hợp
```

Có nút:

```txt
Xoá bộ lọc
```

Không được để grid trống không có thông báo.

---

## 16. Loading State

Khi đang tải dữ liệu:

- Hiển thị skeleton card.
- Không nhấp nháy layout mạnh.
- Giữ toolbar ổn định.

---

## 17. Error State

Khi API lỗi:

- Hiển thị Alert.
- Có nút `Thử lại`.
- Không crash toàn trang.

---

## 18. Sidebar và điều hướng

Giữ sidebar hiện có.

Không sửa logic sidebar nếu task chỉ liên quan Product page, trừ khi cần sửa active route nhẹ.

Menu product nên giữ:

```txt
Sản phẩm
  - Quản lý sản phẩm
  - Quản lý danh mục
  - Quản lý thẻ
```

---

## 19. Không được làm

Không được:

- Sửa migration logic.
- Sửa Medusa backend.
- Sửa database trực tiếp.
- Làm mất logic giá/tồn kho đang đúng.
- Hardcode danh mục.
- Hardcode sản phẩm.
- Chỉ render category dạng flat nếu đã có parent/child.
- Expose JWT token ra client.
- Dùng MUI, Ant Design, Bootstrap.
- Viết toàn bộ logic trong `page.tsx`.

---

## 20. shadcn/ui Components

Ưu tiên dùng:

```txt
Button
Input
Select
DropdownMenu
Popover
Command
Badge
Card
Skeleton
Alert
Separator
Pagination nếu đã có
```

Không tự chế component nếu shadcn/ui đã có.

---

## 21. Acceptance Criteria

Sau khi hoàn thành:

- Có thể search sản phẩm.
- Có thể lọc theo danh mục dạng cây cha/con.
- Có thể lọc theo trạng thái sản phẩm.
- Có thể lọc theo trạng thái tồn kho.
- Có thể đổi số cột 3/4/5/6.
- Có thể đổi số sản phẩm mỗi trang 20/30/50/100.
- Pagination đúng sau khi filter.
- Có active filter badges.
- Có nút xoá bộ lọc.
- UI không bị vỡ trên desktop.
- Mobile/tablet vẫn xem được.
- Giá/tồn kho/trạng thái/ảnh hiện tại không bị hỏng.

---

## 22. Yêu cầu trước khi code

Trước khi code, Cursor phải báo:

1. File sẽ sửa/tạo.
2. Product data hiện tại có các field category/status/stock nào.
3. Category hiện tại là flat hay nested.
4. Cách build category tree.
5. Cách tính stock status.
6. Cách lưu grid columns/page size.
7. Cam kết không sửa migration và backend.

---

## 23. Yêu cầu sau khi code

Sau khi code, Cursor phải báo:

1. File đã sửa/tạo.
2. Cách lọc theo trạng thái sản phẩm.
3. Cách lọc theo tồn kho.
4. Cách hiển thị category tree.
5. Cách đổi số cột.
6. Cách đổi số sản phẩm/trang.
7. Cách test chi tiết:

```txt
- Mở /products
- Search từ khoá Dell
- Chọn danh mục cha
- Chọn danh mục con
- Lọc Còn hàng
- Lọc Hết hàng
- Đổi 3/4/5/6 cột
- Đổi 20/30/50/100 sản phẩm mỗi trang
- Xoá bộ lọc
```

---

## 24. Ghi chú quan trọng

Trang Product hiện tại đang hiển thị tốt:

- Ảnh sản phẩm
- Giá bán
- Giá thông thường
- Tồn kho
- Trạng thái hoạt động
- Tags dưới tên sản phẩm
- Action menu

Không được phá các phần này.

Nhiệm vụ chính là nâng cấp:

```txt
Toolbar
Category tree filter
Status filter
Stock filter
Grid columns
Page size
Pagination
Active filter badges
```
