# MTL Next.js Commerce - Tiến Độ Project

> **Cập nhật lần cuối:** 2026-05-02 15:30 (UTC+7)
> **Agent:** c2283fc2-94d8-422d-98ca-91fb159b20c2

---

## Tổng Quan Task (2 May 2026)

Task hiện tại tập trung vào: **Tích hợp Medusa Admin API cho Products page và Migration page** — kết nối admin-ui với backend Medusa.

---

## 1. Đã Làm Gì

### 1.1 Research (Agent: Researcher)

**Phân tích hiện trạng:**

- Đọc và phân tích 4 file chính:
  - `apps/admin-ui/app/(admin)/products/page.tsx` — Product listing
  - `apps/admin-ui/app/(admin)/categories/page.tsx` — Category listing
  - `apps/admin-ui/app/api/medusa/[...slug]/route.ts` — Proxy API
  - `apps/admin-ui/services/medusa.service.ts` — Medusa service

**Phát hiện gap quan trọng:**

| Gap | Mô tả |
|-----|--------|
| Product listing | Chưa gọi Medusa API, chỉ dùng mock data |
| Category listing | Chưa gọi Medusa API, chỉ dùng mock data |
| Medusa proxy | Route có sẵn nhưng cần test chi tiết |
| Migration service | Đã gọi Medusa nhưng có bug category assignment |

### 1.2 UI Design (Agent: UI Designer)

**Thiết kế 3-tab Product Form Dialog:**

1. **Tab Thông Tin Chung** — title, mô tả, danh mục, thẻ, hình ảnh, trạng thái
2. **Tab Giá & Kho** — variant pricing (regular/sale), tồn kho, manage stock
3. **Tab Nâng Cao** — weight, dimensions, SEO handle, metadata

### 1.3 Implementation

**Các file đã tạo mới:**

| File | Mô tả |
|------|--------|
| `components/products/product-form-dialog.tsx` | 3-tab product edit dialog với Medusa integration |
| `components/products/quick-actions.tsx` | Quick action buttons (view, edit, delete, sync) |
| `components/products/product-stats.tsx` | Stats bar (tổng, published, draft, outofstock) |
| `components/products/product-filters.tsx` | Filter bar (search, category, status, stock) |
| `components/categories/category-tree.tsx` | Tree view với expand/collapse |
| `components/categories/category-stats.tsx` | Category stats (total, parent, child, active) |
| `components/categories/category-filters.tsx` | Category filter bar |
| `app/api/woo/[...slug]/route.ts` | WooCommerce proxy API |
| `app/api/medusa/[...slug]/route.ts` | Medusa proxy API (cải thiện) |
| `lib/transform/index.ts` | Re-export transform utilities |

**Các file đã sửa:**

| File | Thay đổi |
|------|----------|
| `services/medusa.service.ts` | 16 fixes cho Medusa API response parsing, JWT auth, variant-level options |
| `services/migration.service.ts` | Category assignment logic, product logging chi tiết, batchCreate API integration |
| `lib/transform.ts` | Product & category transform, metadata builder |
| `types/migration.ts` | Medusa types với categoryIds field |
| `app/(admin)/products/page.tsx` | Gọi Medusa API, tích hợp ProductFormDialog |
| `app/(admin)/categories/page.tsx` | Gọi Medusa API, category tree, parent-child sync |
| `app/(admin)/migration/page.tsx` | Migration UI với feedback chi tiết |

**Tổng số:** ~12 file tạo mới, ~8 file sửa đổi

### 1.4 QA

- `next build` — **Passed** (0 errors)
- `next lint` — **Passed** (0 errors)
- Admin UI chạy tại http://localhost:3000
- Backend Medusa chạy tại http://localhost:9000

---

## 2. Các Vấn Đề Đã Phát Hiện và Fix

### 2.1 Bug Fixes trong Medusa API

| # | Bug | Fix |
|---|-----|-----|
| 1 | `batchCreateProducts` trả về `{ product: ... }` nhưng code expect key khác | Sửa response parsing: check `"product" in result.data` |
| 2 | `updateProduct` gửi `variants` trong payload — Medusa v2 reject | Strip variants từ update payload |
| 3 | `batchCreateCategories` lỗi 404 endpoint sai | Đổi sang `/admin/product-categories` |
| 4 | `findProductBySku` dùng `q=sku` — không đáng tin cậy | Đổi sang `findProductByVariantSku` với filter variant.sku |
| 5 | JWT token tạo từ admin/token route không được dùng đúng cách | Sửa proxy để extract và pass JWT token |
| 6 | `variant.options` gửi dạng `Array<{title, value}>` — Medusa v2 không accept | Chỉ gửi `variant.options = Record<string, string>` |
| 7 | `inventory_quantity`, `manage_inventory`, `allow_backorder` gửi trong variant payload gây 400 | Strip khỏi API payload |
| 8 | Error response parsing không handle nested error formats | Thêm support cho 5 Medusa error formats |
| 9 | `batchCreateCategories` không update `parentIdMap` sau khi tạo category | Fix để children reference parents đúng |
| 10 | `batchCreateCategories` không resolve `parent_category_id` cho child categories | Thêm logic resolve parent ID từ mapping |
| 11 | `batchCreateCategories` gọi `findCategoryByOriginalId` cho mỗi category — rất chậm | Cache kết quả, chỉ query 1 lần |
| 12 | `listAllCategories` không sort theo hierarchy | Sort parents trước children |
| 13 | Product không có category sau khi migrate — endpoint `/products/{id}/categories` không tồn tại Medusa v2 | Chuyển sang gán categories trong product payload thay vì gọi riêng |
| 14 | `assignProductCategories` function vẫn còn gọi endpoint không đúng | Giữ lại function cho reference, categories được gán qua product payload |
| 15 | `deleteInventoryItemsBySku` dùng custom endpoint không tồn tại | Chuyển sang dùng `deleteInventoryItems` với `skus` param |
| 16 | `transformVariants` gửi `options` sai format | Medusa v2: `options = Record<string, string>` |

### 2.2 Bug Fixes trong Migration Logic

| # | Bug | Fix |
|---|-----|-----|
| 1 | Migration UI không hiển thị feedback chi tiết | Viết lại toàn bộ rollback feedback: progress bar, phase indicator, stats, status banner |
| 2 | Sản phẩm không được gán danh mục sau khi tạo | Chuyển sang gán categories trong `batchCreateProducts` payload |
| 3 | `findProductBySku` được gọi ngay cả khi `strategy="create"` — thừa | Chỉ gọi khi `strategy !== "create"` |
| 4 | Luồng update không gán categories | Thêm `categories` vào update payload |
| 5 | `forEach` với async không chờ Promise | Đổi sang `for...of` loop |

---

## 3. Các Vấn Đề Còn Tồn Tại

### 3.1 Cần Kiểm Tra Thêm

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | **Category sync Parent-Child** | Cao | Categories được sync, nhưng cần verify parent relationship đúng trên Medusa |
| 2 | **Inventory assignment** | Cao | Variants được tạo nhưng inventory chưa được gán (Medusa v2 tách inventory module) |
| 3 | **Product variant options** | Trung bình | Medusa v2 auto-links variants to options qua title matching — cần verify |
| 4 | **WooCommerce categories không map đúng** | Cao | Nếu categories chưa được migrate trước, sản phẩm sẽ không có category |
| 5 | **Product không hiển thị sau migrate** | Cao | Cần reload Products page sau migration |

### 3.2 Các File Chứa Thông Tin Bảo Mật (Không Push Git)

```
apps/admin-ui/lib/migration/.env          # Database credentials
apps/admin-ui/lib/migration/.env.example  # Template (OK to push)
```

**Lưu ý:** Không push các file `.env` lên git. File `.env.example` đã có template để reference.

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
# Build admin-ui
cd apps/admin-ui
npm run build

# Lint
npm run lint

# Migration CLI (dry-run)
npm run migration:dry-run
```

### 4.3 Test Migration Flow

1. Mở http://localhost:3000/migration
2. Điền config (WooCommerce URL, credentials, Medusa backend URL)
3. Chọn **Categories + Products** để sync
4. Chọn conflict strategy: **Create** (xoá dữ liệu cũ trước)
5. Click **Start Migration**
6. Quan sát logs chi tiết từng sản phẩm

---

## 5. Kiến Trúc Hiện Tại

```
apps/
├── admin-ui/                          # Next.js 15 + App Router
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── products/page.tsx       # Product listing (Medusa API)
│   │   │   ├── categories/page.tsx    # Category listing (Medusa API)
│   │   │   └── migration/page.tsx      # Migration UI
│   │   └── api/
│   │       ├── medusa/[...slug]/       # Medusa proxy
│   │       └── woo/[...slug]/          # WooCommerce proxy
│   ├── components/
│   │   ├── products/                   # Product components
│   │   └── categories/                 # Category components
│   ├── services/
│   │   ├── migration.service.ts        # Migration orchestration
│   │   ├── medusa.service.ts           # Medusa API client
│   │   └── woocommerce.service.ts      # WooCommerce API client
│   ├── lib/
│   │   ├── transform.ts               # WooCommerce → Medusa transform
│   │   └── transform/index.ts         # Re-export
│   └── types/
│       └── migration.ts               # Type definitions
│
└── backend-ui/                         # Medusa v2
    └── apps/backend/
        └── medusa-config.ts           # Port 9000
```

---

## 6. Bước Tiếp Theo Đề Xuất

### 6.1 Ngắn Hạn (1-2 ngày)

- [ ] **Verify Category Parent-Child** — Kiểm tra categories hiển thị đúng hierarchy trên Medusa
- [ ] **Fix Inventory Assignment** — Variants được tạo nhưng cần gán inventory qua Medusa Inventory Module
- [ ] **Product Edit** — Hoàn thiện ProductFormDialog để edit sản phẩm
- [ ] **Product Delete** — Thêm delete functionality với confirmation
- [ ] **Image Upload** — Hỗ trợ upload ảnh lên Medusa media library

### 6.2 Trung Hạn (1 tuần)

- [ ] **Orders page** — Hiển thị orders từ Medusa
- [ ] **Customers page** — Hiển thị customers
- [ ] **Dashboard** — Thống kê tổng quan
- [ ] **Inventory management** — Quản lý tồn kho riêng
- [ ] **Tags management** — Sync tags từ WooCommerce

### 6.3 Dài Hạn (Phase 2+)

- [ ] **Storefront** — Next.js storefront kết nối Medusa storefront API
- [ ] **AI Marketing** — Marketing automation
- [ ] **ML Intelligence** — Machine learning recommendations

---

## 7. Changelog

### 2026-05-02

- **feat:** Product listing gọi Medusa API với filters (search, category, status, stock)
- **feat:** Category listing với tree view và parent-child sync
- **feat:** Migration UI hoàn toàn mới với logs chi tiết từng sản phẩm
- **feat:** ProductFormDialog với 3-tab layout
- **fix:** 16 Medusa API response parsing bugs
- **fix:** Category parent-child hierarchy resolution
- **fix:** Product không được gán category sau khi migrate
- **perf:** Bỏ `findProductBySku` khi strategy="create" (tiết kiệm hàng ngàn requests)
- **perf:** Cache category lookup trong batchCreateCategories
- **docs:** Cập nhật kiến trúc project trong progress.md

### 2026-05-01

- **feat:** Backend-ui cố định port 9000
- **fix:** Syntax error trong migration.service.ts (duplicate import line)
- **feat:** Migration page bổ sung rollback feedback
- **fix:** Lỗi không đồng bộ sản phẩm (thiếu file transform/index.ts)

---

## 8. Commit Message Đề Xuất

### Conventional Commits

```
feat(migration): integrate Medusa v2 Admin API with category assignment

- Product listing now fetches from Medusa API with filters
- Category listing displays tree view with parent-child hierarchy
- Migration flow resolves Medusa category IDs from WooCommerce mapping
- ProductFormDialog: 3-tab layout for edit/view product details
- Quick actions: view, edit, delete, sync buttons
- Product stats bar: total, published, draft, outofstock counts
- 16 Medusa API response parsing fixes for v2 endpoints
- Strip variants from product update payload (Medusa v2 restriction)
- Skip findProductBySku for strategy="create" (perf optimization)
- Migration UI: detailed per-product logs with pricing & stock info
- Add rollback progress bar with phase indicators and stats
- WooCommerce proxy API route for client-side fetching
- Medusa proxy: improved JWT auth and error handling
- Fix category parent-child resolution in batch creation
```

---

## 9. Cách Chạy Monorepo

### Cấu trúc hiện tại

- Root: pnpm workspace (pnpm-workspace.yaml)
- admin-ui: standalone Next.js 15 app với TypeScript
- backend-ui: Medusa v2 standalone app

### Lưu ý về workspace

- Hiện tại `apps/backend-ui` có workspace riêng (`package.json` có `"private": true` và `"workspaces"`)
- Cấu hình này đang conflict với root workspace
- Cần cân nhắc flatten về root workspace hoặc giữ nguyên 2 workspace riêng

### Khởi động

```bash
# Backend Medusa
cd apps/backend-ui/apps/backend
npm run dev  # Port 9000

# Admin UI (terminal khác)
cd apps/admin-ui
npm run dev  # Port 3000
```
