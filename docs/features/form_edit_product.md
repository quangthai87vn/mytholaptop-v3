Hãy xây dựng trang chỉnh sửa chi tiết sản phẩm cho admin-ui Next.js tại:

apps/admin-ui/app/(admin)/products/[id]/edit/page.tsx

Bối cảnh:
- Danh sách sản phẩm đã hiển thị tại /products.
- Sản phẩm đã được migrate từ WooCommerce sang Medusa/PostgreSQL.
- Cần click vào một sản phẩm trong danh sách để mở trang edit chi tiết.
- Giao diện dùng shadcn/ui, responsive, theme đỏ Mỹ Tho Laptop.

Yêu cầu route:
1. Tại trang /products, khi click vào card sản phẩm hoặc bấm "Chỉnh sửa”, điều hướng đến:
   /products/{product_id}/edit

2. Trang edit phải load dữ liệu sản phẩm từ Medusa backend/API theo product_id.

Yêu cầu giao diện edit:
Chia thành các section:

1. Thông tin cơ bản
- Tên sản phẩm
- Handle/slug
- Subtitle nếu có
- Mô tả ngắn
- Mô tả chi tiết HTML
- Trạng thái: draft / proposed / published / rejected
- Bật/tắt hiển thị

2. Giá bán
- Giá thường
- Giá khuyến mãi nếu có
- Currency VND
- Hiển thị preview giá

3. Kho hàng
- SKU
- Barcode nếu có
- Tồn kho
- Cho phép bán khi hết hàng
- Quản lý tồn kho bật/tắt

4. Danh mục
- Chọn danh mục dạng tree cha/con
- Có thể chọn nhiều danh mục nếu schema hỗ trợ
- Hiển thị danh mục hiện tại

5. Thẻ tag
- Hiển thị tag đã migrate từ WordPress
- Có thể thêm/xóa tag

6. Hình ảnh sản phẩm
- Thumbnail hiện tại
- Gallery images
- Hiển thị ảnh từ relative path:
  /wp-content/uploads/YYYY/MM/filename.ext
- Cho phép đổi thumbnail bằng ảnh trong gallery
- Cho phép xóa ảnh khỏi gallery
- Cho phép thêm ảnh bằng URL hoặc upload local nếu đã có API
- Không phá mapping ảnh cũ

7. SEO
- SEO title
- Meta description
- Slug preview
- Canonical URL nếu có
- Open Graph image nếu có

8. Metadata migration
- wp_product_id
- wp_slug
- wp_source_url
- last_synced_at
- migration_status
- Chỉ đọc, không cho sửa trực tiếp

Yêu cầu backend/API:
Tạo hoặc kiểm tra các endpoint:

GET /api/admin/products/[id]
- Lấy chi tiết sản phẩm
- Bao gồm variants, prices, inventory, categories, tags, images, metadata

PATCH /api/admin/products/[id]
- Update thông tin sản phẩm
- Ưu tiên dùng Medusa Admin API/JWT nếu đã có service
- Nếu project đang dùng service riêng thì dùng medusa-service.ts hiện tại
- Không ghi trực tiếp DB nếu có API phù hợp

PATCH /api/admin/products/[id]/images
- Update thumbnail/gallery nếu cần

Yêu cầu update Medusa:
Khi bấm “Lưu thay đổi”:
- Update đúng product hiện tại theo id
- Không update hàng loạt
- Không tạo product mới
- Không làm mất mapping WooCommerce
- Không làm mất ảnh gallery
- Không đổi URL ảnh từ relative path sang absolute URL

Yêu cầu UI/UX:
1. Có breadcrumb:
   Sản phẩm / Quản lý sản phẩm / Chỉnh sửa

2. Header:
- Tên sản phẩm
- Trạng thái
- Nút “Lưu”
- Nút “Hủy”
- Nút “Xem trước”

3. Có trạng thái loading/skeleton.
4. Có toast khi lưu thành công/thất bại.
5. Có cảnh báo nếu rời trang khi chưa lưu.
6. Có validation form:
- Tên sản phẩm không rỗng
- Handle không rỗng
- Giá phải là số
- SKU không trùng nếu kiểm tra được
- Thumbnail phải là relative path hoặc URL hợp lệ

Yêu cầu kỹ thuật:
- Dùng React Hook Form + Zod nếu project đã có.
- Dùng shadcn/ui components:
  Card, Input, Textarea, Button, Select, Tabs, Badge, Switch, Dialog, Separator
- Tách component:
  ProductBasicForm
  ProductPricingForm
  ProductInventoryForm
  ProductCategorySelector
  ProductTagSelector
  ProductImageManager
  ProductSeoForm
  ProductMigrationInfo

Yêu cầu ảnh:
- Ảnh hiển thị phải resolve đúng relative path:
  /wp-content/uploads/YYYY/MM/filename.ext
- Nếu product.thumbnail đã là relative path thì render trực tiếp.
- Không tự động đổi sang /uploads/medusa/products.
- Không tự động rename ảnh.

Yêu cầu test:
1. Click sản phẩm từ /products mở đúng trang edit.
2. Load đúng dữ liệu product.
3. Sửa tên sản phẩm và lưu.
4. Sửa giá và lưu.
5. Sửa trạng thái published/draft.
6. Đổi thumbnail trong gallery.
7. Reload lại trang, dữ liệu vẫn đúng.
8. Kiểm tra DB chỉ product đó thay đổi.
9. Không làm mất ảnh, tag, category đã migrate.

Trước khi code:
- Audit cấu trúc hiện tại của /products.
- Tìm service đang dùng để lấy danh sách sản phẩm.
- Tìm API route hiện có.
- Tìm cách project đang gọi Medusa API/JWT.
- Sau đó liệt kê file cần tạo/sửa rồi mới implement.

Cấu trúc file nên có
apps/admin-ui/app/(admin)/products/[id]/edit/page.tsx
apps/admin-ui/app/api/admin/products/[id]/route.ts
apps/admin-ui/components/products/product-basic-form.tsx
apps/admin-ui/components/products/product-pricing-form.tsx
apps/admin-ui/components/products/product-inventory-form.tsx
apps/admin-ui/components/products/product-image-manager.tsx
apps/admin-ui/components/products/product-seo-form.tsx
apps/admin-ui/components/products/product-category-selector.tsx
apps/admin-ui/components/products/product-tag-selector.tsx