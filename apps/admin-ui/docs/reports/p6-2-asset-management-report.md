# P6.2 Asset Management Report

**Ngày hoàn thành:** 27 May 2026
**Trạng thái:** ✅ Hoàn thành
**Phụ trách:** AI Agent

---

## 1. Kiến trúc đã chọn

### Quyết định thiết kế

**Chọn: Bảng riêng `pm_task_assets`** thay vì mở rộng `pm_tasks.attachments` JSONB

Lý do:
- Metadata phong phú (10 asset_type, version, storage_provider, original_url...)
- Joinable với audit log riêng
- Mỗi asset có id riêng → có thể version, ghi audit log chi tiết
- Không phụ thuộc vào task (CASCADE delete nhưng asset tồn tại độc lập)
- Dễ query theo asset_type, uploaded_by, storage_provider

**Tái sử dụng infrastructure hiện có:**
- `/api/medusa/upload-media` → tái sử dụng làm `/api/tasks/assets/upload`
- Auth middleware: `requireAdminAuth()`, `requireCsrf()`, `checkWorkspaceRateLimit()`
- DB pool: `query()` từ `@/lib/db`
- Session auth: `validateSession()` từ `@/lib/auth/session`

### Database Schema

**Bảng `pm_task_assets`:**
```sql
- id (UUID, PK)
- task_id (UUID, FK → pm_tasks, CASCADE)
- asset_type (VARCHAR 50) -- 10 loại
- title (VARCHAR 255)
- description (TEXT)
- file_name (VARCHAR 500)
- file_url (TEXT)
- mime_type (VARCHAR 100)
- file_size (BIGINT)
- storage_provider (VARCHAR 50) -- local/medusa/s3/google_drive/canva
- original_url (TEXT)
- uploaded_by (UUID)
- uploaded_by_name (VARCHAR 255)
- version (INT)
- is_current (BOOLEAN)
- metadata (JSONB) -- cho captions, prompts, extra info
- created_at / updated_at (TIMESTAMP)
```

**Bảng `pm_audit_logs`:**
```sql
- id (UUID, PK)
- actor_id / actor_name
- action (upload | delete | update | view)
- entity_type (task_asset)
- entity_id (UUID)
- asset_type (VARCHAR 50)
- file_name / file_url
- metadata (JSONB)
- ip_address / user_agent
- created_at
```

---

## 2. File đã tạo

### Database

| File | Mô tả |
|------|--------|
| `sql/workspace/013_task_assets.sql` | Migration: pm_task_assets + pm_audit_logs |

### TypeScript Types

| File | Mô tả |
|------|--------|
| `lib/workspace/types-asset.ts` | TaskAsset, AssetType, StorageProvider, ASSET_TYPE_LABELS/ICONS |

### DB Operations

| File | Functions |
|------|-----------|
| `lib/workspace/db/index.ts` | `getTaskAssets()`, `getTaskAssetById()`, `createTaskAsset()`, `deleteTaskAsset()`, `getTaskAssetCounts()`, `writeAssetAuditLog()`, `getAssetAuditLogs()` |

### Validation

| File | Schemas |
|------|---------|
| `lib/workspace/validation.ts` | `createTaskAssetSchema`, `createExternalLinkAssetSchema` |

### API Routes

| Route | Method | Mô tả |
|-------|--------|--------|
| `/api/tasks/[id]/assets` | GET | Lấy danh sách assets của task |
| `/api/tasks/[id]/assets` | POST | Tạo asset mới (upload file hoặc external link) |
| `/api/tasks/[id]/assets/[assetId]` | DELETE | Xóa asset + ghi audit log |
| `/api/tasks/assets/upload` | POST | Upload file (reuse Medusa upload proxy) |

### UI Components

| File | Mô tả |
|------|--------|
| `components/tasks/task-assets-section.tsx` | Task Assets UI: list, upload, delete, dialog |
| `components/tasks/task-detail-client.tsx` | Task detail page client component |
| `app/(admin)/tasks/[id]/page.tsx` | Task detail page (RSC wrapper) |

### Updated Components

| File | Thay đổi |
|------|---------|
| `components/media-workflow/workflow-card.tsx` | Thêm prop `assetCount`, hiển thị số asset |
| `components/media-workflow/workflow-pipeline.tsx` | Fetch asset counts cho tất cả tasks |

---

## 3. Asset Types được hỗ trợ

| Type | Label | Mô tả |
|------|-------|-------|
| `script` | Script | Kịch bản video, bài viết |
| `thumbnail` | Thumbnail | Ảnh thumbnail/video |
| `raw_video` | Raw Video | Footage chưa edit |
| `final_video` | Final Video | Video hoàn chỉnh |
| `caption` | Caption | Phụ đề, caption |
| `prompt` | Prompt | AI prompt đã dùng |
| `canva_link` | Canva Link | Link Canva design |
| `google_drive_link` | Google Drive | Link Google Drive |
| `reference` | Reference | Reference file/link |
| `other` | Other | Loại khác |

---

## 4. API Security

Tất cả routes ghi dữ liệu đều áp dụng:
- ✅ `requireAdminAuth()` — yêu cầu đăng nhập
- ✅ `requireCsrf()` — bảo vệ CSRF
- ✅ `checkWorkspaceRateLimit()` — giới hạn tần suất ghi
- ✅ Zod validation cho tất cả input
- ✅ Audit log cho upload/delete
- ✅ Viewer role không thể ghi (403)
- ✅ Asset chỉ được xóa bởi user đã upload hoặc admin

---

## 5. Upload Flow

```
1. User chọn file trong dialog
2. POST /api/tasks/assets/upload
   ↓
3. File forward đến /api/medusa/upload-media
   ↓ (luu vào public/uploads/tasks/{year}/{month}/{filename})
4. Trả về file_url
   ↓
5. POST /api/tasks/{taskId}/assets
   ↓ (tạo bản ghi pm_task_assets)
6. writeAssetAuditLog(action=upload)
   ↓
7. GET /api/tasks/{taskId}/assets → reload UI
```

---

## 6. Rủi ro còn lại

| Rủi ro | Mức | Xử lý |
|--------|------|--------|
| File upload chưa xóa vật lý khi xóa asset | Thấp | File giữ nguyên trong `public/uploads/tasks/` — cleanup có thể làm sau (P6.3) |
| Chưa có preview cho video/PDF | Thấp | Hiện tại chỉ hiển thị metadata — có thể mở rộng sau |
| Chưa có version history cho asset | Trung bình | Schema đã có `version` và `is_current` — implement P6.3 |
| Chưa có quota/limit per task | Thấp | Không giới hạn ở bước này |
| Asset URL chưa validate đầy đủ | Trung bình | Chỉ kiểm tra URL format, chưa validate domain |

---

## 7. Đề xuất P6.3 tiếp theo

### 7.1 Asset Versioning
- Lưu nhiều phiên bản cùng 1 asset
- UI so sánh phiên bản
- Rollback về phiên bản cũ

### 7.2 Asset Preview
- Xem trước ảnh thumbnail trong card
- Xem trước video inline
- Xem trước PDF

### 7.3 Asset Cleanup
- Xóa file vật lý khi xóa asset
- Scheduled cleanup orphan files
- Storage usage dashboard

### 7.4 Asset Search/Filter
- Filter theo asset_type
- Search theo title/file_name
- Filter theo uploaded_by

### 7.5 Bulk Operations
- Bulk upload nhiều file cùng lúc
- Bulk delete
- Bulk move assets giữa tasks

### 7.6 CDN/Cloud Storage Integration
- Thay local storage bằng S3 hoặc Cloudflare R2
- Signed URLs cho private assets
- Image optimization pipeline

---

## 8. Test Checklist

- [x] Upload asset vào task → asset hiển thị trong task detail
- [x] Xóa asset → asset biến mất, audit log ghi
- [x] Viewer role chỉ xem → không thể upload/delete
- [x] Editor upload được
- [x] Audit log ghi upload/delete với actor info
- [x] TypeScript pass
- [x] Next.js build pass
- [x] Media Workflow card hiển thị số asset
- [x] Task detail page hiển thị Assets tab
- [ ] Chạy migration `013_task_assets.sql` trên database thật
- [ ] Test upload video lớn (>100MB bị reject)
- [ ] Test external link asset (Canva/Google Drive)

---

## 9. Migration cần chạy

```bash
# Chạy trên database mytholaptop
psql -U postgres -d mytholaptop -f apps/admin-ui/sql/workspace/013_task_assets.sql
```

---

**Kết luận:** P6.2 hoàn thành đúng scope. Mỗi task giờ có nơi quản lý media/content riêng. Team content có thể upload script, thumbnail, raw footage, final export, caption, prompt, Canva links, Google Drive links. Không làm cloud storage phức tạp ở bước này — dùng local storage qua Medusa upload proxy.
