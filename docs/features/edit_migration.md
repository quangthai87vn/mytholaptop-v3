Hãy sửa toàn bộ hệ thống migrate ảnh từ WooCommerce/WordPress → Medusa trong admin-ui Next.js.

========================
🎯 MỤC TIÊU CUỐI
================

1. Download đầy đủ tất cả ảnh (thumbnail + gallery) của từng product.
2. Không còn lỗi chỉ tải 1 ảnh.
3. Không còn lỗi nhiều product dùng chung sai 1 thumbnail.
4. Không update sai hàng loạt.
5. Giữ nguyên cấu trúc URL WordPress để tối ưu SEO:
   /wp-content/uploads/YYYY/MM/filename.ext
6. Không đổi tên file ảnh (vì có thể nhiều product dùng chung ảnh).
7. Deduplicate đúng theo source_url.
8. Update chính xác vào backend Medusa:

   * product.thumbnail
   * image.url
   * gallery relation

========================
❗ NGUYÊN TẮC QUAN TRỌNG NHẤT
============================

* KHÔNG rename file ảnh tùy ý.
* Một source_url = một file local.
* Nhiều product có thể dùng chung ảnh.
* Không được update sai thumbnail giữa các product.
* Không được dùng 1 ảnh cho nhiều product nếu source khác nhau.

========================
📂 CẤU TRÚC LƯU ẢNH (SEO CHUẨN)
===============================

File thật:
public/wp-content/uploads/YYYY/MM/filename.ext

Database:
/wp-content/uploads/YYYY/MM/filename.ext

❌ KHÔNG dùng:

* /uploads/medusa/products
* URL tuyệt đối (https://...)
* đường dẫn OS (C:, /home/...)

========================
🌐 XỬ LÝ URL NGUỒN
==================

1. URL chuẩn:
   https://mytholaptop.vn/wp-content/uploads/2026/05/a.webp → dùng trực tiếp

2. URL relative:
   /wp-content/uploads/... → ghép WP_PUBLIC_BASE_URL

3. URL localhost:
   http://localhost:3000/wp-content/uploads/...
   → replace domain bằng WP_PUBLIC_BASE_URL

========================
📥 LOGIC DOWNLOAD ẢNH ĐÚNG
==========================

for each wooProduct:
images = wooProduct.images

if empty → skip

thumbnail = images[0]

xử lý thumbnail riêng

for each image:
normalize URL
kiểm tra mapping
nếu chưa có → download
nếu có → reuse
lưu local path
update DB

❌ KHÔNG được:

* chỉ tải images[0]
* bỏ gallery
* dùng biến global/shared
* dùng ảnh product trước

========================
🧠 DEDUPLICATE ẢNH (CỰC QUAN TRỌNG)
===================================

Tạo mapping:
source_url → local_relative_path

Logic:
if source_url đã tồn tại:
→ không download
→ reuse file
else:
→ download
→ lưu mapping

========================
🚫 BUG HIỆN TẠI CẦN FIX
=======================

Hiện tại đang bị:

* chỉ tải 1 ảnh
* tất cả product dùng chung 1 thumbnail
* update sai hàng loạt
* dùng /uploads/medusa/products

Phải fix:

* scope theo từng product
* không reuse thumbnailPath
* không updateMany
* mọi update phải có WHERE product.id

========================
🧱 UPDATE MEDUSA ĐÚNG
=====================

Với mỗi product:

UPDATE public.product
SET thumbnail = đúng local path
WHERE id = medusaProduct.id

Gallery:

* attach đúng image cho đúng product

Image:

* url = relative path

========================
🛠 REPAIR DỮ LIỆU CŨ
====================

Tạo chức năng:
Repair Image Migration

Chức năng:

1. Không tạo lại product
2. Không tạo lại category/tag
3. Lấy lại wooProduct.images[]
4. Download/reuse ảnh đúng
5. Update lại:

   * product.thumbnail
   * image.url
   * gallery
6. Fix product bị dùng sai ảnh

UI:

* Nút: “Repair ảnh sản phẩm”
* chọn batch size
* test 5 sản phẩm

========================
⚙️ POPUP CẤU HÌNH ẢNH
=====================

Thêm config:

* enableImageMigration
* uploadRootDir = public/wp-content/uploads
* uploadPublicPath = /wp-content/uploads
* imageFolderMode = wordpress_year_month
* imageConflictStrategy = overwrite
* imageSaveMode = relative_path

Validate:

* path phải bắt đầu bằng /
* cảnh báo nếu dùng absolute URL

========================
📊 LOG REALTIME
===============

Log mỗi product:

* PRODUCT_IMAGE_START
* PRODUCT_IMAGE_COUNT
* IMAGE_DOWNLOAD
* IMAGE_REUSE
* PRODUCT_THUMBNAIL_UPDATED
* PRODUCT_GALLERY_UPDATED
* PRODUCT_IMAGE_DONE
* PRODUCT_IMAGE_FAILED

========================
🧪 TEST BẮT BUỘC
================

1. Test 5 sản phẩm:
   → mỗi product có ảnh đúng

2. Query:
   SELECT thumbnail, COUNT(*)
   FROM public.product
   GROUP BY thumbnail
   HAVING COUNT(*) > 1;

→ nếu trùng phải hợp lý (cùng source)

3. Kiểm tra folder:
   public/wp-content/uploads/YYYY/MM
   → có nhiều file

4. DB không còn:
   /uploads/medusa/products

5. Chạy lại lần 2:

* không duplicate
* không sai mapping

========================
🔍 AUDIT TRƯỚC KHI CODE
=======================

Phải tìm:

1. chỗ chỉ tải 1 ảnh
2. chỗ reuse thumbnailPath
3. chỗ update hàng loạt
4. chỗ mapping sai (theo filename)
5. chỗ bỏ qua gallery
6. chỗ dùng path sai

Sau đó mới sửa.

========================
🔥 NGUYÊN TẮC CUỐI
==================

* Không đổi tên file
* Deduplicate theo source_url
* Migrate theo từng product (product-scope)
* Update đúng product.id
* Lưu WordPress-style path
* DB chỉ lưu relative path
