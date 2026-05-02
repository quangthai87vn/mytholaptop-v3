# Hướng dẫn Migration WooCommerce sang Medusa

## Tổng quan

Tool migration này giúp chuyển dữ liệu từ WooCommerce/WordPress sang Medusa qua **WooCommerce REST API**, bao gồm:
- **Products** với nhiều categories
- **Categories** với hierarchical structure (parent-child)
- **Tags**
- **Product Images**
- **Variants** (nếu có)
- **Product Attributes**

## Luôn dùng WooCommerce REST API

**QUAN TRỌNG: Tool này chỉ kết nối qua WooCommerce REST API (REST API v3). KHÔNG kết nối MySQL WordPress trực tiếp.**

Lý do:
- Không cần quyền truy cập server/hosting
- Không cần cài mysql2 driver
- An toàn hơn — không can thiệp trực tiếp vào database
- WooCommerce REST API cung cấp đầy đủ dữ liệu cần thiết (products, categories, tags, images, variations)

## Cấu trúc file

```
lib/migration/
├── index.ts                      # Export chính
├── woo-types.ts                  # Type definitions cho WooCommerce (REST API)
├── medusa-migration-types.ts     # Type definitions cho Medusa
├── woo-connector.ts              # [DEPRECATED] Kết nối MySQL trực tiếp — KHÔNG DÙNG
├── woo-to-medusa.ts              # Script migration CLI (dùng REST API)
├── cli.ts                        # Command-line interface (dùng REST API)
├── migration.config.ts           # Config template
├── .env.example                  # Environment variables template
└── README.md                     # Hướng dẫn sử dụng
```

## Lấy WooCommerce REST API credentials

### Bước 1: Tạo REST API Key

1. Đăng nhập WordPress Admin
2. Vào **WooCommerce > Settings > Advanced > REST API**
3. Click **"Add key"**
4. Điền thông tin:
   - Description: `Medusa Migration Tool`
   - User: chọn user admin
   - Permissions: **Read/Write**
5. Click **"Generate API Key"**
6. Copy **Consumer Key** (`ck_...`) và **Consumer Secret** (`cs_...`)

### Bước 2: Lấy WordPress URL

URL WordPress phải có `/wp-json`, ví dụ:
- `https://mytholaptop.vn/wp-json`

### Bước 3: Kiểm tra quyền truy cập REST API

Test nhanh bằng trình duyệt:
```
https://mytholaptop.vn/wp-json/wc/v3/products/categories?consumer_key=ck_xxx&consumer_secret=cs_xxx
```

## Cấu hình

### 1. Copy và chỉnh sửa file config

```bash
cp lib/migration/.env.example lib/migration/.env
```

### 2. Điền thông tin trong `.env`

```env
# WooCommerce REST API (bắt buộc)
WOO_API_BASE_URL=https://mytholaptop.vn/wp-json
WOO_CONSUMER_KEY=ck_your_consumer_key_here
WOO_CONSUMER_SECRET=cs_your_consumer_secret_here

# Medusa Backend
MEDUSA_BACKEND_URL=http://localhost:9000
MEDUSA_ADMIN_API_KEY=your_medusa_admin_api_key_here
```

### 3. Lấy Medusa Authentication Credentials

Chọn 1 trong 2 cách:

**Cách 1: API Key (sk_xxx) — Ưu tiên**
```bash
# Qua Medusa Admin Dashboard
# Settings > API Key Management > Create API Key
MEDUSA_ADMIN_API_KEY=sk_your_api_key_here
```

**Cách 2: JWT (email/password) — Dùng khi không có API Key**
```bash
MEDUSA_ADMIN_EMAIL=admin@example.com
MEDUSA_ADMIN_PASSWORD=your_password_here
```

> Tool sẽ tự động authenticate và lấy JWT token nếu dùng cách 2. Token được cache cho đến khi hết hạn.

## Cách sử dụng

### Chạy Migration

```bash
# Di chuyển vào thư mục admin-ui
cd apps/admin-ui

# Chạy migration đầy đủ
npm run migration:migrate

# Chạy thử (dry-run) - không tạo thay đổi thực sự
npm run migration:dry-run

# Chạy với config file tùy chỉnh
npx ts-node lib/migration/cli.ts migrate --config ./my-config.ts

# Chạy với batch size lớn hơn
npx ts-node lib/migration/cli.ts migrate --batch-size 10
```

### Kiểm tra trạng thái

```bash
# Kiểm tra kết nối cả hai hệ thống
npm run migration:status

# Xem thống kê dữ liệu
npm run migration:stats
```

### Tùy chọn nâng cao

```bash
# Chỉ migrate một số sản phẩm nhất định
npx ts-node lib/migration/cli.ts migrate --products "123,456,789"

# Chỉ migrate một số categories
npx ts-node lib/migration/cli.ts migrate --categories "10,20,30"

# Migration tăng dần (chỉ dữ liệu mới)
npx ts-node lib/migration/cli.ts migrate --incremental

# Theo ngày
npx ts-node lib/migration/cli.ts migrate --start-date "2024-01-01" --end-date "2024-12-31"
```

## Luồng Migration

### 1. Kết nối & Phân tích
```
[WooCommerce REST API] ──> [Phân tích dữ liệu] ──> [Kiểm tra trùng lặp]
                                                       │
                                                       v
                                                    [Medusa]
```

### 2. Migrate Categories
```
[WooCommerce Categories via REST API]
    │
    ├─ Kiểm tra tồn tại trong Medusa (theo handle/slug)
    │
    ├─ Tạo mới hoặc skip
    │
    └─ Giữ nguyên hierarchical structure (parent-child)
```

### 3. Migrate Tags
```
[WooCommerce Tags via REST API]
    │
    ├─ Kiểm tra tồn tại trong Medusa (theo value)
    │
    └─ Tạo mới hoặc skip
```

### 4. Migrate Products
```
[WooCommerce Products via REST API]
    │
    ├─ Lấy category IDs từ WooCommerce
    │
    ├─ Map sang Medusa category IDs (many-to-many)
    │
    ├─ Transform data format
    │
    └─ Tạo products với nhiều categories
```

## WooCommerce REST API Endpoints

Tool này sử dụng các endpoints sau (REST API v3):

```
GET /wp-json/wc/v3/products/categories     # Lấy categories
GET /wp-json/wc/v3/products                # Lấy products
GET /wp-json/wc/v3/products/:id           # Lấy chi tiết product
GET /wp-json/wc/v3/products/:id/variations # Lấy variations
```

## Troubleshooting

### Lỗi kết nối WooCommerce API

```bash
# Kiểm tra URL WordPress có đúng /wp-json không
# Kiểm tra Consumer Key/Secret còn hiệu lực
# Kiểm tra user có quyền Read/Write

# Test nhanh bằng curl:
curl -s "https://mytholaptop.vn/wp-json/wc/v3/products/categories?per_page=1&consumer_key=ck_xxx&consumer_secret=cs_xxx"
```

### Lỗi CORS

WooCommerce REST API có thể chặn cross-origin requests. Nếu gặp lỗi CORS:
- Dùng Next.js API proxy (`/api/woo/...`) thay vì gọi trực tiếp
- Hoặc cấu hình WordPress cho phép CORS

### Lỗi Medusa API

```bash
# Kiểm tra Medusa đang chạy
curl http://localhost:9000/health

# Kiểm tra API key
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:9000/admin/products
```

### Lỗi Image URL

Nếu image URLs bị lỗi:
- WooCommerce REST API trả về URLs đầy đủ
- URLs nằm trong trường `images[].src`

### Memory Issues

Với database lớn, giảm batch size:

```bash
npx ts-node lib/migration/cli.ts migrate --batch-size 2
```

## Ví dụ Config File

```typescript
// migration.config.ts
export default {
  woo: {
    // WooCommerce REST API base URL
    baseUrl: "https://mytholaptop.vn/wp-json",
    // Consumer Key từ WooCommerce Admin
    consumerKey: process.env.WOO_CONSUMER_KEY,
    // Consumer Secret từ WooCommerce Admin
    consumerSecret: process.env.WOO_CONSUMER_SECRET,
  },

  medusa: {
    backendUrl: "https://api.yourstore.com",
    adminApiKey: process.env.MEDUSA_ADMIN_API_KEY,   // API Key (sk_xxx)
    adminEmail: process.env.MEDUSA_ADMIN_EMAIL,     // JWT auth email
    adminPassword: process.env.MEDUSA_ADMIN_PASSWORD, // JWT auth password
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 5,
    dryRun: false,
  },

  options: {
    source: "woocommerce",
    mode: "full",
    preserveSourceIds: true,
    mapSourceImages: true,
    createMissingCategories: true,
    createMissingTags: true,
    setProductsPublished: true,
  },
};
```

## Sau Migration

### Kiểm tra kết thái

1. Truy cập Medusa Admin Dashboard
2. Kiểm tra Products > xem products đã migrate
3. Kiểm tra Products > Categories > xem category tree
4. Kiểm tra một sản phẩm cụ thể, xem có thuộc nhiều categories không

### Cleanup (tùy chọn)

```bash
# Xóa metadata migration trong Medusa
# (Tùy chỉnh theo nhu cầu)
```

## Lưu ý quan trọng

1. **Backup trước**: Luôn backup Medusa database trước khi chạy migration
2. **Dry-run trước**: Chạy `--dry-run` trước để xem có vấn đề gì không
3. **Batch size**: Với server yếu, giảm batch size xuống 2-3
4. **Images**: WooCommerce REST API trả URLs đầy đủ — không cần xử lý thêm
5. **Incremental**: Nếu muốn chạy nhiều lần, dùng `--incremental`
6. **QUAN TRỌNG**: Chỉ dùng WooCommerce REST API — không kết nối MySQL trực tiếp

## License

MIT - Sử dụng tự do cho dự án của Mỹ Tho Laptop.
