# MTL Next.js Commerce - Tiến Độ Project

> **Cập nhật lần cuối:** 2026-05-03 16:00 (UTC+7)
> **Agent:** c2283fc2-94d8-422d-98ca-91fb159b20c2
> **Task:** Migration — WordPress media structure, deduplication, overwrite on duplicate

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
