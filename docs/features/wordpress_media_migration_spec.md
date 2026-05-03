# WordPress to Medusa Media Migration Specification

Tài liệu này dùng để Cursor đọc trước khi thiết kế và chỉnh sửa tính năng **migrate hình ảnh từ WordPress/WooCommerce sang Medusa** trong `admin-ui` và `backend-ui`.

Mục tiêu chính: khi migrate sản phẩm từ WordPress sang Medusa, toàn bộ ảnh phải được tải về hệ thống mới, lưu trong thư mục của Medusa/backend, database chỉ lưu **đường dẫn tương đối**, không phụ thuộc vào domain WordPress cũ.

---

## 1. Bối cảnh

Dự án hiện có:

```txt
apps/admin-ui
apps/backend-ui
```

`admin-ui` là giao diện quản trị.

`backend-ui` là Medusa backend.

Module Migration hiện tại đang lấy dữ liệu từ WordPress/WooCommerce REST API và migrate sang Medusa.

Cần bổ sung/chỉnh sửa phần migrate media để xử lý:

```txt
Ảnh đại diện sản phẩm
Ảnh thư viện/gallery sản phẩm
Ảnh danh mục
Ảnh trong mô tả sản phẩm
Ảnh trong mô tả ngắn
Rewrite HTML description/short_description
Lưu path tương đối vào database
```

---

## 2. Mục tiêu

Khi migrate từ WordPress/WooCommerce sang Medusa:

1. Download ảnh từ WordPress về server Medusa/backend.
2. Lưu ảnh vào thư mục local của backend/Medusa.
3. Database chỉ lưu đường dẫn ảnh tương đối.
4. Không lưu full URL WordPress cũ làm ảnh chính.
5. Không lưu absolute local path vào database.
6. Rewrite nội dung HTML để thay link ảnh cũ bằng path mới.
7. Không để site mới phụ thuộc vào ảnh từ WordPress cũ.
8. Có media mapping để retry/reuse/kiểm tra lỗi.
9. Có chế độ chạy lại chỉ riêng media cho sản phẩm đã migrate.

---

## 3. Phạm vi được phép sửa

Được sửa:

```txt
apps/backend-ui/src/**/migration/**
apps/backend-ui/src/**/wordpress/**
apps/backend-ui/src/**/media/**
apps/backend-ui/src/**/products/**
apps/admin-ui/app/(admin)/migration/**
apps/admin-ui/components/migration/**
apps/admin-ui/lib/migration/**
```

Tuỳ cấu trúc project hiện tại, hãy dùng đúng thư mục đang có.

Không được:

```txt
Sửa Medusa core nếu không cần
Sửa database trực tiếp bằng tay
Xoá sản phẩm/ảnh cũ nếu chưa có xác nhận
Hardcode domain WordPress
Lưu full URL WordPress cũ làm thumbnail/gallery chính
Lưu absolute local path vào database
Expose token/credential ra client
Làm hỏng logic giá, tồn kho, danh mục, tags đang chạy đúng
```

---

## 4. Nguyên tắc lưu ảnh

Ảnh tải từ WordPress phải được lưu vào thư mục `public/uploads/` của admin-ui.

**Lưu ý:** Project không có `backend-ui/static/` — ảnh được lưu vào admin-ui thay vì backend.

Thư mục lưu ảnh:

```txt
apps/admin-ui/public/uploads/migration/wordpress/media/
```

Cấu trúc lưu (hash-based deduplication):

```txt
apps/admin-ui/public/uploads/migration/wordpress/media/
└── {url_hash}/
    └── {filename}
```

Ví dụ file thực tế:

```txt
apps/admin-ui/public/uploads/migration/wordpress/media/abc123def/logo.png
apps/admin-ui/public/uploads/migration/wordpress/media/f4e2a9c1/product-15117-thumb.jpg
```

Database chỉ lưu path tương đối public:

```txt
/uploads/migration/wordpress/media/abc123def/logo.png
/uploads/migration/wordpress/media/f4e2a9c1/product-15117-thumb.jpg
```

**API Upload Handler:** `app/api/medusa/upload-media/route.ts`
```

Không lưu dạng này trong database:

```txt
https://old-wordpress-site.com/wp-content/uploads/...
D:/AI PROJECT/...
/home/server/project/...
```

---

## 5. Phân loại ảnh cần migrate

### 5.1 Ảnh đại diện sản phẩm

Nguồn WooCommerce:

```ts
wooProduct.images[0]
```

Rule:

```txt
wooProduct.images[0] → product thumbnail
```

Lưu vào:

```txt
/uploads/migration/wordpress/products/{wordpress_product_id}/thumbnail/
```

Sau khi download, product Medusa phải dùng path mới làm thumbnail.

Ví dụ:

```ts
thumbnail: "/uploads/migration/wordpress/products/15117/thumbnail/dell-inspiron-3593-main.jpg"
```

---

### 5.2 Ảnh gallery sản phẩm

Nguồn WooCommerce:

```ts
wooProduct.images[1..n]
```

Rule:

```txt
wooProduct.images[1..n] → product gallery
```

Lưu vào:

```txt
/uploads/migration/wordpress/products/{wordpress_product_id}/gallery/
```

Product payload nếu API hỗ trợ:

```ts
images: [
  { url: "/uploads/migration/wordpress/products/15117/gallery/image-01.jpg" },
  { url: "/uploads/migration/wordpress/products/15117/gallery/image-02.jpg" }
]
```

Nếu Medusa API hiện tại chưa update được images đúng format, lưu fallback vào metadata:

```ts
metadata: {
  wordpress_migrated_gallery_images: [
    "/uploads/migration/wordpress/products/15117/gallery/image-01.jpg",
    "/uploads/migration/wordpress/products/15117/gallery/image-02.jpg"
  ],
  wordpress_original_image_urls: [
    "https://old-site.com/wp-content/uploads/image-01.jpg",
    "https://old-site.com/wp-content/uploads/image-02.jpg"
  ]
}
```

Nhưng mục tiêu cuối cùng vẫn là thumbnail/gallery hiển thị bằng path mới.

---

### 5.3 Ảnh trong mô tả sản phẩm

Nguồn:

```ts
wooProduct.description
```

Cần parse HTML và tìm ảnh trong:

```txt
img[src]
img[srcset]
source[srcset]
a[href] nếu href là file ảnh
style background-image url(...)
```

Lưu ảnh vào:

```txt
/uploads/migration/wordpress/content/{wordpress_product_id}/
```

Sau đó rewrite HTML.

Ví dụ trước:

```html
<p>Thông tin sản phẩm</p>
<img src="https://old-site.com/wp-content/uploads/2024/01/dell-config.jpg" />
```

Sau:

```html
<p>Thông tin sản phẩm</p>
<img src="/uploads/migration/wordpress/content/15117/dell-config.jpg" />
```

---

### 5.4 Ảnh trong mô tả ngắn

Nguồn:

```ts
wooProduct.short_description
```

Xử lý giống description.

Lưu ảnh vào:

```txt
/uploads/migration/wordpress/content/{wordpress_product_id}/
```

Rewrite HTML trong short_description.

---

### 5.5 Ảnh danh mục

Nguồn WooCommerce category:

```ts
wooCategory.image.src
```

Lưu vào:

```txt
/uploads/migration/wordpress/categories/{wordpress_category_id}/
```

Lưu vào category image hoặc metadata fallback:

```ts
metadata: {
  wordpress_migrated_category_image: "/uploads/migration/wordpress/categories/123/laptop-dell.jpg",
  wordpress_original_category_image: "https://old-site.com/wp-content/uploads/laptop-dell.jpg"
}
```

---

## 6. Media mapping bắt buộc

Cần có mapping ảnh cũ → ảnh mới để tránh download lại, hỗ trợ retry, debug và validation.

Nếu project đã có bảng mapping thì mở rộng bảng hiện có.

Nếu chưa có, tạo bảng hoặc storage tương đương:

```txt
migration_media_mappings
```

Fields đề xuất:

```txt
id
job_id
wordpress_product_id
wordpress_category_id
source_url
source_media_id
source_type
source_file_name
source_mime_type
source_size
source_checksum
target_relative_path
target_absolute_path
target_public_url
target_file_name
usage_type
status
error_message
created_at
updated_at
```

Trong đó:

```txt
usage_type:
- product_thumbnail
- product_gallery
- category_image
- description_image
- short_description_image

status:
- pending
- downloaded
- reused
- failed
- skipped
```

Nguyên tắc:

```txt
Nếu source_url đã có mapping downloaded/reused → dùng lại target_relative_path.
Nếu download lỗi → lưu failed + error_message, không fail toàn bộ migration.
Nếu source_url trùng → không download lại.
Nếu có checksum → dùng checksum để phát hiện duplicate tốt hơn.
```

---

## 7. Service/hàm cần tạo

Không nhét toàn bộ logic media vào migration function chính.

Tạo service/helper riêng, ví dụ:

```txt
apps/backend-ui/src/modules/migration/services/wordpress-media.service.ts
```

Nếu cấu trúc project khác, đặt vào nơi tương đương.

Các hàm cần có:

```ts
downloadWordPressImage(sourceUrl, options)
saveImageToLocalStorage(buffer, targetPath)
getOrCreateMediaMapping(sourceUrl, usageType, context)
migrateProductThumbnail(wooProduct, jobId)
migrateProductGallery(wooProduct, jobId)
migrateCategoryImage(wooCategory, jobId)
extractImageUrlsFromHtml(html, baseUrl)
rewriteHtmlImageUrls(html, urlMapping)
migrateDescriptionImages(wooProduct, jobId)
buildPublicRelativePath(...)
sanitizeImageFileName(...)
resolveWordPressImageUrl(...)
```

---

## 8. Download image requirements

Khi download ảnh:

```txt
Hỗ trợ absolute URL
Hỗ trợ relative URL kiểu /wp-content/uploads/...
Hỗ trợ CDN URL khác domain
Follow redirect
Có timeout
Validate content-type là image
Giới hạn file size
Sanitize filename
Tránh ghi đè file trùng tên
Giữ extension nếu có
Nếu không có extension, suy ra từ content-type
Nếu ảnh lỗi 404/timeout, chỉ ghi issue/log, không fail toàn bộ migration
```

Content type hợp lệ:

```txt
image/jpeg
image/png
image/webp
image/gif
```

---

## 9. Filename rule

Tên file phải an toàn.

Ví dụ source:

```txt
https://old-site.com/wp-content/uploads/2024/01/Dell Inspiron 3593 (1).jpg
```

Target:

```txt
dell-inspiron-3593-1.jpg
```

Nếu trùng:

```txt
dell-inspiron-3593-1.jpg
dell-inspiron-3593-1-2.jpg
dell-inspiron-3593-1-3.jpg
```

Không để ký tự lạ trong filename.

---

## 10. Relative path rule

Database/product payload chỉ được lưu relative public path:

```txt
/uploads/migration/wordpress/products/15117/thumbnail/dell-inspiron-3593.jpg
```

Không lưu absolute local path:

```txt
D:/AI PROJECT/mytholaptop-v3/apps/backend-ui/static/uploads/...
/home/server/mytholaptop-v3/apps/backend-ui/static/uploads/...
```

Không lưu WordPress URL cũ làm ảnh chính:

```txt
https://old-site.com/wp-content/uploads/...
```

---

## 11. Rewrite HTML description/short_description

Cần rewrite trong:

```txt
description
short_description
```

Các vị trí cần xử lý:

```txt
img[src]
img[srcset]
source[srcset]
a[href] nếu href là file ảnh
style background-image url(...)
```

Ví dụ `srcset`.

Trước:

```html
<img src="https://old.com/a.jpg" srcset="https://old.com/a-300.jpg 300w, https://old.com/a-768.jpg 768w">
```

Sau:

```html
<img src="/uploads/migration/wordpress/content/15117/a.jpg" srcset="/uploads/migration/wordpress/content/15117/a-300.jpg 300w, /uploads/migration/wordpress/content/15117/a-768.jpg 768w">
```

Yêu cầu:

```txt
Giữ nguyên alt/title/class/width/height
Không phá HTML
Nếu ảnh download lỗi, giữ URL cũ hoặc dùng placeholder theo setting, nhưng phải ghi log
Sau rewrite, kiểm tra còn domain WordPress cũ trong content không
Lưu HTML đã rewrite vào product description hoặc metadata phù hợp
```

Không được replace string domain đơn giản kiểu:

```txt
old-domain.com → new-domain.com
```

Phải parse HTML và map từng URL ảnh.

---

## 12. Product payload khi migrate media

### 12.1 Thumbnail

```ts
thumbnail: "/uploads/migration/wordpress/products/15117/thumbnail/dell-inspiron-3593.jpg"
```

### 12.2 Gallery

```ts
images: [
  {
    url: "/uploads/migration/wordpress/products/15117/gallery/image-01.jpg"
  },
  {
    url: "/uploads/migration/wordpress/products/15117/gallery/image-02.jpg"
  }
]
```

### 12.3 Description đã rewrite

```ts
description: rewrittenDescriptionHtml
```

### 12.4 Metadata fallback

Nếu API chưa hỗ trợ một số field:

```ts
metadata: {
  wordpress_migrated_thumbnail: "/uploads/migration/wordpress/products/15117/thumbnail/...",
  wordpress_migrated_gallery_images: [
    "/uploads/migration/wordpress/products/15117/gallery/..."
  ],
  wordpress_original_image_urls: [
    "https://old-site.com/wp-content/uploads/..."
  ],
  wordpress_description_image_mappings: [
    {
      old_url: "https://old-site.com/wp-content/uploads/old.jpg",
      new_path: "/uploads/migration/wordpress/content/15117/old.jpg"
    }
  ],
  wordpress_media_migrated: true
}
```

---

## 13. Migration options UI

Trong `admin-ui` trang Migration, thêm hoặc đảm bảo có các option:

```txt
☑ Tải ảnh đại diện sản phẩm về Medusa
☑ Tải ảnh thư viện sản phẩm về Medusa
☑ Tải ảnh danh mục về Medusa
☑ Tải ảnh trong mô tả sản phẩm về Medusa
☑ Tải ảnh trong mô tả ngắn về Medusa
☑ Rewrite link ảnh WordPress trong HTML
☑ Lưu database bằng đường dẫn tương đối
☑ Bỏ qua ảnh đã tải trước đó
```

Nếu chưa làm backend cho toàn bộ option, UI có thể hiển thị nhưng phải ghi rõ option nào đã hoạt động thật.

---

## 14. Migration progress/log

Trong migration log cần có:

```txt
[Media] Download thumbnail: product=15117, source=..., target=/uploads/...
[Media] Download gallery image: product=15117, index=1, source=..., target=/uploads/...
[Media] Rewrite description image: product=15117, old=..., new=/uploads/...
[Media] Reuse existing image mapping: source=..., target=/uploads/...
[Media] Failed image download: source=..., reason=404
```

Summary sau migration:

```txt
Product thumbnails downloaded
Gallery images downloaded
Category images downloaded
Description images downloaded
Short description images downloaded
Images reused
Images failed
Products with old WordPress image URLs remaining
```

---

## 15. Validation sau migration

Sau migration, validate:

```txt
Sản phẩm có thumbnail path mới chưa?
Gallery có path mới chưa?
Description còn chứa domain WordPress cũ không?
Short description còn chứa domain WordPress cũ không?
File ảnh có tồn tại trong thư mục local không?
Database có lưu relative path không?
Media mapping có đủ không?
```

Cảnh báo:

```txt
Nếu hơn 10% sản phẩm còn ảnh WordPress cũ trong description → MEDIA_REWRITE_WARNING
Nếu hơn 10% ảnh download fail → MEDIA_DOWNLOAD_WARNING
Nếu thumbnail vẫn là WordPress URL cũ → MEDIA_THUMBNAIL_NOT_MIGRATED
Nếu database lưu absolute local path → MEDIA_PATH_STORAGE_ERROR
```

---

## 16. Chế độ chạy lại media-only

Vì sản phẩm có thể đã migrate trước đó, cần hỗ trợ mode:

```txt
Update existing products media only
```

Khi bật mode này:

```txt
Match product theo metadata.wordpress_id
Nếu không có thì match theo SKU
Không tạo sản phẩm mới
Chỉ update thumbnail
Chỉ update gallery images
Chỉ update description đã rewrite
Chỉ update short_description đã rewrite
Chỉ update media metadata
Không làm mất giá, tồn kho, category, tags đã đúng
```

---

## 17. Admin UI hiển thị ảnh sau migration

Trang `/products` phải hiển thị ảnh từ path mới.

Ưu tiên ảnh:

```txt
1. product.thumbnail nếu là relative path mới
2. product.images[0].url nếu là relative path mới
3. metadata.wordpress_migrated_thumbnail
4. fallback placeholder
```

Nếu ảnh là relative path, browser phải load được qua backend public URL.

Ví dụ:

```txt
http://localhost:9000/uploads/migration/wordpress/products/15117/thumbnail/image.jpg
```

Nếu cần helper:

```ts
function buildMediaUrl(path: string) {
  if (!path) return ""
  if (path.startsWith("http")) return path
  return `${MEDUSA_BACKEND_PUBLIC_URL}${path}`
}
```

Không dùng secret/token cho ảnh public.

---

## 18. Không được làm sai

Không được:

```ts
thumbnail: wooProduct.images[0].src
```

nếu `src` là WordPress URL cũ.

Không được:

```txt
Lưu full URL WordPress cũ làm ảnh chính
Lưu absolute local path vào database
Bỏ qua ảnh trong description
Replace domain bằng string đơn giản
Fail toàn bộ migration vì 1 ảnh lỗi
Tạo trùng sản phẩm khi chỉ chạy media-only
Làm mất giá/tồn kho/category/tags đã đúng
Expose token ra client
```

---

## 19. Acceptance Criteria

Tính năng đạt yêu cầu khi:

```txt
Ảnh đại diện được download về backend
Ảnh gallery được download về backend
Ảnh trong description được download về backend
Ảnh trong short_description được download về backend nếu có
Ảnh danh mục được download nếu có
Database/product payload lưu relative path
HTML description được rewrite sang relative path mới
Không còn phụ thuộc WordPress URL cũ cho thumbnail/gallery
Có media mapping old_url → new_path
Có log chi tiết cho media migration
Có validation media sau migration
Có mode update existing products media only
Trang /products hiển thị ảnh từ backend mới
```

---

## 20. Prompt lệnh cho Cursor

Dùng prompt này để bắt Cursor đọc và làm theo tài liệu:

```md
Trước khi code, hãy đọc kỹ file:

`apps/admin-ui/docs/features/wordpress-media-migration.md`

Mục tiêu:
- Bổ sung/chỉnh sửa tính năng migrate ảnh từ WordPress/WooCommerce sang Medusa.
- Download ảnh về backend/Medusa.
- Lưu file vào thư mục local.
- Database chỉ lưu relative path.
- Xử lý ảnh đại diện, gallery, ảnh danh mục, ảnh trong description và short_description.
- Rewrite HTML để thay link WordPress cũ bằng path mới.
- Không làm hỏng logic giá, tồn kho, danh mục, tags đang hoạt động đúng.

Phạm vi:
- Chỉ sửa phần media migration và UI migration options/log/validation nếu cần.
- Không sửa Medusa core.
- Không sửa database bằng tay.
- Không expose token ra client.
- Không tạo trùng sản phẩm.

Trước khi code, hãy báo:
1. Hiện tại ảnh sản phẩm đang lưu bằng field nào.
2. Thumbnail/gallery hiện đang lấy từ WordPress URL hay path mới.
3. File nào đang xử lý migration product images.
4. File nào đang xử lý description mapping.
5. Có media mapping hiện tại chưa.
6. File sẽ sửa/tạo.
7. Cách đảm bảo database chỉ lưu relative path.

Sau khi code, hãy báo:
1. File đã sửa/tạo.
2. Thư mục ảnh sẽ được lưu ở đâu.
3. Field nào lưu relative path.
4. Cách migrate thumbnail.
5. Cách migrate gallery.
6. Cách migrate ảnh trong description.
7. Cách rewrite HTML.
8. Cách chạy lại media-only migration cho sản phẩm đã migrate.
9. Cách kiểm tra 3 sản phẩm mẫu.
```

---

## 21. Câu khóa cho Cursor

```txt
Chỉ tập trung sửa media migration: thumbnail, gallery, category image, image trong description/short_description, relative path storage. Không sửa logic giá, tồn kho, category, tags nếu các phần đó đang hoạt động đúng.
```
