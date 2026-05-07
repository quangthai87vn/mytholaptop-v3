# MTL Next.js Commerce - Tiến Độ Project

> **Cập nhật lần cuối:** 2026-05-07 16:30 (UTC+7)
> **Agent:** c2283fc2-94d8-422d-98ca-91fb159b20c2
> **Task:** Admin UI Header Redesign - Professional 3-column layout

---

## Task 2: Admin UI Header Redesign (7 May 2026)

### Tổng quan

Redesign header admin-ui thành layout 3 cột chuyên nghiệp theo phong cách SaaS dashboard.

---

## 1. Đã Làm Gì

### 1.1 Tạo mới 5 component header

| File | Mô tả |
|------|--------|
| `components/layout/breadcrumbs.tsx` | Breadcrumb tự động từ pathname, nhãn tiếng Việt |
| `components/layout/global-search.tsx` | Command palette (Ctrl+K), 40+ mục tìm kiếm |
| `components/layout/quick-actions.tsx` | Dropdown với 6 hành động nhanh |
| `components/layout/notification-center.tsx` | Type definitions + mock notification data |
| `components/layout/user-menu.tsx` | User profile dropdown với avatar, role |

### 1.2 Redesign hoàn toàn admin-header.tsx

**Layout 3 cột:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ LEFT (auto)    │ CENTER (flex-1)         │ RIGHT (ml-auto)          │
│ Breadcrumb     │ Search bar 440px        │ Quick action │ Notif │ User │
│ + Page title   │ (centered)              │ + badge     │        │       │
└──────────────────────────────────────────────────────────────────────┘
```

**Thay đổi chính:**

1. **Header cao 68px**, border đậm dưới, nền trắng có backdrop-blur
2. **LEFT**: Breadcrumb nhỏ gọn (text-xs) + tên trang đậm (visible trên ≥xl)
3. **CENTER**: Search bar 440px centered, hover đỏ brand, placeholder "Tìm sản phẩm, khách hàng, đơn hàng, SKU...", shortcut `Ctrl K`
4. **RIGHT**: Cân đối:
   - Nút "Tạo nhanh" → đỏ brand `bg-red-600 hover:bg-red-700`
   - Chuông thông báo với badge đỏ
   - Avatar user + tên + vai trò (≥xl)
5. **Search Dialog**: Popup Dialog khi click search, nhóm kết quả theo Sản phẩm / Khách hàng / Đơn hàng / Nội dung, hướng dẫn bàn phím
6. **Quick actions mới**: Tạo đơn hàng, Thêm sản phẩm, Thêm khách hàng, Tạo bài viết AI, Gửi ZNS, Đồng bộ hàng hoá
7. **Notifications mới**: Đơn hàng mới, Sản phẩm sắp hết hàng, ZNS gửi thất bại, Đồng bộ WooCommerce lỗi, Khách hàng cần chăm sóc
8. **User menu đầy đủ**: Hồ sơ cá nhân, Cài đặt tài khoản, Đổi mật khẩu, Đăng xuất
9. **Mobile responsive**: Hamburger + breadcrumb + icon search + avatar nhỏ gọn

### 1.3 Kiến trúc gộp

Các sub-component được inline vào `admin-header.tsx` để:
- Tránh prop drilling
- Tất cả state (notifications, search open) nằm trong 1 file
- Responsive breakpoints dễ kiểm soát

---

## 2. File Đã Sửa / Tạo

| File | Trạng thái | Ghi chú |
|------|-----------|---------|
| `components/layout/admin-header.tsx` | Viết lại hoàn toàn | 3-column layout, tất cả logic inline |
| `components/layout/breadcrumbs.tsx` | Tạo mới | Tái sử dụng được ở chỗ khác |
| `components/layout/global-search.tsx` | Tạo mới | Command palette component |
| `components/layout/quick-actions.tsx` | Tạo mới | DropdownMenu quick actions |
| `components/layout/notification-center.tsx` | Tạo mới | Types + mock data |
| `components/layout/user-menu.tsx` | Tạo mới | User dropdown profile |
| `components/layout/admin-layout.tsx` | Cập nhật nhỏ | Bỏ wrapper div của header |

---

## 3. Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | File `website-ui` có lỗi `beVietnamPro is not defined` | Cao | Pre-existing, không liên quan admin-ui |
| 2 | Dev server chạy `website-ui` (port 3001) thay vì `admin-ui` | Thấp | Terminal 17 đang chạy sai app |

---

## 4. Lệnh Test

### 4.1 Build & TypeScript

```bash
# Build admin-ui (chạy từ root monorepo)
cd d:\AI PROJECT\mytholaptop-v3
pnpm --filter admin-ui build

# Hoặc chạy trực tiếp trong admin-ui
cd apps/admin-ui
pnpm build
```

### 4.2 Development Server

```bash
# Terminal 1: Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Terminal 2: Admin UI (port 3000) - DÙNG PUNPM
cd apps/admin-ui
pnpm dev

# KHÔNG dùng: npm run dev (sẽ chạy website-ui)
```

### 4.3 Test Routes

Mở browser tại `http://localhost:3000` và kiểm tra:

- `/dashboard` - Header hiển thị "Tổng quan"
- `/products` - Header hiển thị "Sản phẩm"
- `/content` - Header hiển thị "Nội dung"
- `/sales` - Header hiển thị "Bán hàng"
- `/customers/activity-log` - Header hiển thị "Nhật ký tương tác"
- `/settings` - Header hiển thị "Cài đặt"

Kiểm tra:
- [ ] Header cân đối, không có khoảng trắng trống lớn bên phải
- [ ] Avatar user không bị trùng lặp
- [ ] Dropdown "Tạo nhanh" mở đúng
- [ ] Dropdown thông báo mở đúng
- [ ] Dropdown user menu mở đúng
- [ ] Click search → Dialog mở đúng
- [ ] Ctrl+K → Dialog search mở đúng
- [ ] Mobile: hamburger + icon search + avatar hiển thị đúng

---

## 5. Commit Message

```
feat(admin-ui): redesign header with professional 3-column SaaS layout

- Redesign admin-header.tsx with LEFT/CENTER/RIGHT layout structure
- Add inline breadcrumbs + page title display in header
- Add centered 440px search bar with Ctrl+K shortcut and search dialog
- Add SearchDialog component with grouped results (Sản phẩm/Khách hàng/Đơn hàng/Nội dung)
- Add quick action dropdown: Tạo đơn hàng, Thêm sản phẩm, Thêm khách hàng, Tạo bài viết AI, Gửi ZNS, Đồng bộ
- Add notification dropdown with 5 new notification types
- Add user profile dropdown: Hồ sơ cá nhân, Cài đặt tài khoản, Đổi mật khẩu, Đăng xuất
- Mobile responsive: hamburger + breadcrumb + icon search + compact avatar
- Create reusable breadcrumbs.tsx, global-search.tsx, quick-actions.tsx, notification-center.tsx, user-menu.tsx
- Header height 68px with backdrop-blur and border-bottom
```

---

## 6. Bước Tiếp Theo

### Ngắn hạn

- [ ] Test header trên các route còn lại
- [ ] Fix website-ui `beVietnamPro` error (pre-existing)
- [ ] Đảm bảo dev server admin-ui chạy đúng port 3000

### Trung hạn

- [ ] Hoàn thiện sidebar collapse/expand animation
- [ ] Thêm page title component cho các trang
- [ ] Cải thiện notification service thực tế (API call)
- [ ] Thêm real-time search với API

---

## 7. Changelog

### 2026-05-07

- **feat:** Admin UI header redesign - professional 3-column SaaS layout
- **feat:** Breadcrumbs component với tên trang
- **feat:** Search bar + SearchDialog với Ctrl+K shortcut
- **feat:** Quick actions dropdown với 6 hành động
- **feat:** Notification dropdown với 5 loại thông báo mới
- **feat:** User menu dropdown với đầy đủ options
- **feat:** Mobile responsive header
- **fix:** Xóa duplicate standalone user avatar

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse everywhere

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Lưu Ý Bảo Mật

**KHÔNG push lên git:**
- File `.env` chứa credentials
- Thư mục `public/wp-content/uploads/`
- Thư mục `public/uploads/`
- File chứa JWT token hoặc API key

**Đã thêm vào `.gitignore`**

---

## 9. Cách Chạy Monorepo

### Khởi động

```bash
# Backend Medusa (port 9000)
cd apps/backend-ui/apps/backend
npm run dev

# Admin UI (port 3000) - DÙNG PUNPM
cd apps/admin-ui
pnpm dev

# Website UI (port 3001) - nếu cần
cd apps/website-ui
npm run dev
```

### Build

```bash
# Admin UI
cd apps/admin-ui
pnpm build

# Toàn bộ monorepo
cd d:\AI PROJECT\mytholaptop-v3
pnpm build
```

---

## Task 1: Migration (3 May 2026) — Lưu trữ

*(Đã hoàn thành - xem commit trước)*

---

## Tổng Quan Task (3 May 2026 - Buổi Chiều)

Task tiếp tục: **Cải thiện WordPress media migration — cấu trúc thư mục, deduplication, overwrite**

---

## 1. Đã Làm Gì

### 1.1 Đổi Cấu Trúc Lưu Ảnh Sang WordPress Format

**Vấn đề:** Ảnh lưu vào `uploads/migration/wordpress/media/{hash}/{filename}` không giữ nguyên URL SEO.

**Giải pháp:** Lưu theo cấu trúc WordPress chuẩn: `wp-content/uploads/{year}/{month}/{filename}`

**Files sửa:**

| File | Thay đổi |
|------|-----------|
| `app/api/medusa/upload-media/route.ts` | Đổi path sang `public/wp-content/uploads/{year}/{month}/{filename}`; Extract year/month từ WordPress URL gốc |
| `lib/media-helpers.ts` | Cập nhật `buildRelativePath()` và `buildStoragePath()` |
| `services/media-migration.service.ts` | Fix mapping để `rewriteHtmlImages()` hoạt động đúng với original URLs |

**Cấu trúc mới:**
```
public/wp-content/uploads/{year}/{month}/{filename}
Ví dụ: public/wp-content/uploads/2026/04/dell-inspiron-15.jpg
```

**Lợi ích:**
- URL giữ nguyên: `/wp-content/uploads/2026/04/image.jpg`
- SEO được bảo toàn
- Khi deploy, chỉ cần copy thư mục `wp-content/uploads/` sang server

### 1.2 Sửa Logic Overwrite Thay Vì Tạo File Mới

**Vấn đề:** Khi trùng filename, code cũ tạo file mới `{basename}-1.jpg`, gây tăng dung lượng.

**Fix:** Khi file đã tồn tại → ghi đè (overwrite)

**File sửa:** `app/api/medusa/upload-media/route.ts`

```typescript
// Trước: Tạo file mới nếu trùng
if (fsSync.existsSync(absolutePath)) {
  const newFileName = `${base}-${counter}${ext}`; // → file-1.jpg
}

// Sau: Ghi đè nếu trùng
fsSync.writeFileSync(absolutePath, buffer); // Luôn overwrite
```

### 1.3 Fix Rewrite HTML Images Mapping

**Vấn đề:** `rewriteHtmlImages()` dùng `normalizeUrl()` để match URLs, nhưng media service truyền hash keys.

**Fix:** Media service build `urlToRelativePath` mapping với original URLs thay vì hashes.

**File sửa:** `services/media-migration.service.ts`

```typescript
// Build URL → relativePath mapping (not hash → relativePath)
// rewriteHtmlImages uses normalizeUrl() internally to match
const urlToRelativePath: Record<string, string> = {};
for (const url of allSourceUrls) {
  const hash = this.hashSync(url);
  const relPath = urlHashToRelativePath[hash];
  if (relPath) {
    urlToRelativePath[url] = relPath;
  }
}
```

### 1.4 Deduplication Logic (Đã Có Từ Trước)

**Logic hoạt động:**
1. Mỗi URL được hash → lưu vào global pool (`localStorage`)
2. Khi xử lý product, check pool trước:
   - `status === "downloaded"` → reuse, không tải lại
   - `status === "pending"` → download mới
3. Thumbnail + gallery + description cùng 1 URL → chỉ tải 1 lần

---

## 2. Các Vấn Đề Đã Phát Hiện và Fix

### 2.1 Bug Fixes

| # | Bug | Fix |
|---|-----|-----|
| 1 | Media lưu vào `uploads/migration/wordpress/media/{hash}/` | Đổi sang `wp-content/uploads/{year}/{month}/{filename}` |
| 2 | Trùng filename tạo file mới `-1`, `-2` | Ghi đè (overwrite) thay vì tạo mới |
| 3 | `rewriteHtmlImages()` không match được URLs | Build mapping với original URLs thay vì hashes |
| 4 | Dev server chạy code cũ sau khi edit | Kill + restart dev server |

---

## 3. Các Vấn Đề Còn Tồn Tại

| # | Issue | Mức độ | Ghi chú |
|---|-------|---------|---------|
| 1 | **Cần verify media migration thực tế** | Cao | Chạy migration với nhiều ảnh để test deduplication |
| 2 | **Verify HTML rewrite** cho description images | Trung bình | Kiểm tra ảnh trong mô tả được rewrite đúng |
| 3 | **LocalStorage pool** cần persist qua sessions | Trung bình | Pool nên được backup/restore nếu user clear browser |
| 4 | **Progress UI** cho media download | Thấp | Hiển thị progress khi tải nhiều ảnh |

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
cd apps/admin-ui
npm run build
npm run lint
```

### 4.3 Test Media Migration Flow

1. Mở http://localhost:3000/migration
2. Điền config (WooCommerce URL, credentials, Medusa backend URL)
3. Chọn **Sản phẩm**
4. Click **Start Migration**
5. Quan sát:
   - Ảnh được tải về `public/wp-content/uploads/{year}/{month}/`
   - Trùng URL → log "Reuse existing" (không tải lại)
   - Trùng filename → ghi đè (không tạo file mới)

### 4.4 Verify Deduplication

1. Migration product A có 5 ảnh
2. Migration product B có 3 ảnh (2 trùng với A)
3. Kiểm tra:
   - Chỉ 6 files trong uploads (5 + 1 mới)
   - Log có "Reuse existing" cho 2 ảnh trùng

---

## 5. Kiến Trúc Hiện Tại

```
apps/
├── admin-ui/                          # Next.js 15 + App Router
│   ├── public/
│   │   └── wp-content/
│   │       └── uploads/               # Media upload destination (WordPress structure)
│   │           └── {year}/{month}/   # Ví dụ: 2026/04/image.jpg
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── migration/page.tsx     # Migration UI
│   │   │   ├── products/page.tsx      # Product listing
│   │   │   └── categories/page.tsx    # Category listing
│   │   └── api/
│   │       ├── medusa/
│   │       │   ├── upload-media/      # Media upload handler (WordPress structure)
│   │       │   └── [...slug]/         # Medusa proxy
│   │       ├── fetch-image/           # Proxy để fetch ảnh từ WordPress (tránh CORS)
│   │       └── woo/[...slug]/         # WooCommerce proxy
│   ├── components/migration/
│   │   ├── migration-options-popup.tsx
│   │   └── migration-progress.tsx
│   ├── services/
│   │   ├── migration.service.ts        # Main migration flow
│   │   ├── medusa.service.ts          # Medusa API calls + inventory update
│   │   └── media-migration.service.ts  # Media deduplication pool
│   └── lib/
│       ├── media-helpers.ts           # URL normalize, rewrite HTML, sanitize
│       └── products/product-filters.ts
│
└── backend-ui/                         # Medusa v2
    └── apps/backend/                   # Port 9000
```

---

## 6. Bước Tiếp Theo

### 6.1 Ngắn Hạn (Hôm Nay)

- [ ] **Verify media deduplication** — Chạy migration với products có ảnh trùng
- [ ] **Verify HTML rewrite** — Kiểm tra ảnh trong description được rewrite đúng URL mới
- [ ] **Verify overwrite** — Kiểm tra trùng filename không tạo file mới

### 6.2 Trung Hạn

- [ ] **Backup/restore media pool** — Export/import localStorage pool
- [ ] **Media progress UI** — Progress bar khi tải nhiều ảnh
- [ ] **Retry failed images** — Thêm tuỳ chọn retry cho ảnh fail
- [ ] **Image CDN integration** — Hỗ trợ upload lên Cloudflare R2/S3

---

## 7. Changelog

### 2026-05-03 (Chiều)

- **feat:** WordPress media structure — lưu vào `wp-content/uploads/{year}/{month}/{filename}`
- **feat:** Extract year/month từ WordPress URL gốc
- **fix:** Overwrite thay vì tạo file mới khi trùng filename
- **fix:** `rewriteHtmlImages()` mapping với original URLs thay vì hashes
- **perf:** Deduplication — trùng URL chỉ tải 1 lần, reuse từ pool

### 2026-05-03 (Sáng)

- **fix:** Stock/inventory — Medusa v2 Inventory Module integration
- **fix:** `getStockStatus()` fallback check `outofstock`/`onbackorder`
- **refactor:** Migration UI simplified — chỉ 2 tuỳ chọn dữ liệu
- **perf:** Default selectedTypes = `["categories", "products"]`

---

## 8. Commit Message Đề Xuất

### Conventional Commits

```
feat(migration): WordPress media structure with deduplication

- Change upload path to wp-content/uploads/{year}/{month}/{filename}
  preserving original WordPress URLs for SEO
- Extract year/month from source WordPress URL
- Overwrite existing files instead of creating -1, -2 copies
- Fix rewriteHtmlImages() to use original URLs instead of hashes
- Media deduplication pool: same URL = download once, reuse everywhere
- Add wp-content/uploads/ to .gitignore
```

---

## 9. Cách Chạy Monorepo

### Cấu trúc hiện tại

- Root: pnpm workspace (pnpm-workspace.yaml)
- admin-ui: standalone Next.js 15 app với TypeScript
- backend-ui: Medusa v2 standalone app

### Khởi động

```bash
# Backend Medusa
cd apps/backend-ui/apps/backend
npm run dev  # Port 9000

# Admin UI (terminal khác)
cd apps/admin-ui
npm run dev  # Port 3000
```

### Media Upload Path

```
Source: WordPress/WooCommerce (e.g., mytholaptop.vn/wp-content/uploads/2026/04/image.jpg)
↓ Download via /api/medusa/upload-media
↓ Save to: apps/admin-ui/public/wp-content/uploads/{year}/{month}/{filename}
↓ Access via: http://localhost:3000/wp-content/uploads/2026/04/image.jpg
```

**Lưu ý bảo mật:**
- Không push các file `.env` lên git
- Không push thư mục `public/wp-content/uploads/` và `public/uploads/` lên git
- Đã thêm vào `.gitignore`
