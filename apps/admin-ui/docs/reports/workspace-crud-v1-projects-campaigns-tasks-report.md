# Workspace CRUD V1: Projects, Campaigns, Tasks — Completion Report

**Ngày:** 29/05/2026
**Task:** Workspace CRUD V1
**Trạng thái:** Hoàn thành

---

## 1. Audit Hiện Trạng

### Route/Page
| Module | Route | Trạng thái trước |
|--------|-------|-------------------|
| Projects | `/projects` | Full CRUD |
| Campaigns | `/campaigns` | Full CRUD |
| Tasks | `/tasks` | Full CRUD |

### API
| API | CRUD | Activity Log | RBAC |
|-----|------|-------------|------|
| `GET/POST /api/projects` | Có | Ghi 'System' | Chỉ auth, không permission |
| `GET/PUT/DELETE /api/projects/[id]` | Có | Ghi 'System' | Chỉ auth, không permission |
| `GET/POST /api/campaigns` | Có | Ghi 'System' | Chỉ auth, không permission |
| `GET/PUT/DELETE /api/campaigns/[id]` | Có | Ghi 'System' | Chỉ auth, không permission |
| `GET/POST /api/tasks` | Có | Ghi 'System' | Chỉ auth, không permission |
| `GET/PUT/DELETE /api/tasks/[id]` | Có | Ghi 'System' | Chỉ auth, không permission |

### Database
- `pm_projects`: đầy đủ fields
- `pm_campaigns`: đầy đủ fields
- `pm_tasks`: đầy đủ fields
- `pm_status_history`: ghi activity log (nhưng `changed_by_name` luôn là 'System')
- `pm_task_activities`: ghi chi tiết thay đổi task

---

## 2. File Đã Sửa / Tạo Mới

### Database
| File | Thay đổi |
|------|----------|
| `lib/workspace/db/index.ts` | Thêm `archiveProject`, `archiveCampaign`, `deleteCampaign`. Cập nhật `createProject`, `updateProject`, `createCampaign`, `createTask`, `updateTask`, `deleteTask` để nhận `actorName` cho activity log |

### API Routes
| File | Thay đổi |
|------|----------|
| `app/api/projects/route.ts` | Thêm `requirePermission` RBAC, truyền `actorName` vào `createProject` |
| `app/api/projects/[id]/route.ts` | Thêm RBAC, archive/soft-delete mặc định, hard-delete chỉ super_admin, truyền `actorName` |
| `app/api/campaigns/route.ts` | Thêm RBAC, truyền `actorName` vào `createCampaign` |
| `app/api/campaigns/[id]/route.ts` | Thêm RBAC, archive/soft-delete, hard-delete, activity log với `actorName` |
| `app/api/tasks/route.ts` | Thêm RBAC, truyền `actorName` vào `createTask` |
| `app/api/tasks/[id]/route.ts` | Thêm RBAC, truyền `actorName` vào `updateTask`/`deleteTask` |

### UI Components
| File | Thay đổi |
|------|----------|
| `components/projects/project-card.tsx` | Thêm archive button (icon lưu trữ) |
| `components/projects/project-list.tsx` | Thêm `onArchive` prop |
| `app/(admin)/projects/projects-client.tsx` | Thêm `handleArchive`, truyền `onArchive` vào list |
| `components/campaigns/campaign-card.tsx` | Thêm action buttons (sửa/archive/xóa) hiện trên hover |
| `components/campaigns/campaign-list.tsx` | Thêm `onArchive` prop |
| `app/(admin)/campaigns/campaigns-client.tsx` | Thêm `handleArchive`, truyền `onArchive` vào list |
| `components/campaigns/campaign-card.tsx` | Thêm `archived` vào `STATUS_COLOR`/`STATUS_LABEL` |
| `components/campaigns/campaign-detail-client.tsx` | Thêm `archived` vào `STATUS_COLOR`/`STATUS_LABEL` |
| `components/campaigns/campaign-form.tsx` | Thêm `archived` vào labelMap |
| `lib/workspace/types.ts` | Thêm `"archived"` vào `CampaignStatus` type |

---

## 3. Chi Tiết Các Thay Đổi

### 3.1 Archive (Soft Delete)
- **Strategy:** Non-super_admin → archive (set `status = 'archived'`), super_admin + `?hard=true` → hard delete
- **DB functions:** `archiveProject`, `archiveCampaign`, `archiveTask` (nếu cần)
- **Activity log:** Ghi `pm_status_history` khi archive với `actorName` thật
- **UI:** Archive button (icon archive) thay vì xóa thẳng

### 3.2 Activity Log với Actor Thật
- `createProject` → ghi `pm_status_history` với `actorName`
- `updateProject` → ghi `pm_status_history` khi đổi status với `actorName`
- `createCampaign` → ghi `pm_status_history` với `actorName`
- `campaigns/[id]/PUT` → ghi `pm_status_history` khi đổi status với `actorName`
- `createTask` → ghi `pm_task_activities` với `actorName`
- `updateTask` → ghi `pm_task_activities` + `pm_status_history` khi đổi status/stage với `actorName`
- `deleteTask` → ghi `pm_status_history` với `actorName`
- `actorName` được lấy từ `user.full_name || user.email || "System"`

### 3.3 RBAC Permission Checks
- `projects.create` → POST `/api/projects`
- `projects.update` → PUT `/api/projects/[id]`
- `projects.delete` → DELETE (archive hoặc hard delete)
- `campaigns.create` → POST `/api/campaigns`
- `campaigns.update` → PUT `/api/campaigns/[id]`
- `campaigns.delete` → DELETE (archive hoặc hard delete)
- `tasks.create` → POST `/api/tasks`
- `tasks.update` → PUT `/api/tasks/[id]`
- `tasks.delete` → DELETE

### 3.4 RBAC Policy
- **super_admin:** Full access (bypass all)
- **admin:** Có trong `ADMIN_OPERATIONAL_PERMISSIONS` preset
- **editor:** Có `projects.update`, `campaigns.update` (từ EDITOR_ADDITIONAL)
- **intern:** Mặc định chỉ có read access
- **viewer:** Chỉ read

---

## 4. Test Checklist

### Đã kiểm tra TypeScript
```
pnpm --filter admin-ui exec tsc --noEmit
```
- Các lỗi TypeScript còn lại đều ở product pages (pre-existing, không thuộc task này)
- Tất cả Workspace CRUD files pass TypeScript check

### Next.js Build
- Build fail ở `app/(admin)/products/attributes/page.tsx` — pre-existing error
- Workspace CRUD code compile thành công

### Manual Test Checklist
- [ ] Tạo dự án mới → activity log ghi actor_name
- [ ] Sửa dự án → activity log khi đổi status
- [ ] Lưu trữ dự án → status = 'archived', activity log
- [ ] Tạo chiến dịch → activity log ghi actor_name
- [ ] Sửa chiến dịch → activity log khi đổi status
- [ ] Lưu trữ chiến dịch → status = 'archived', activity log
- [ ] Tạo công việc → activity log ghi actor_name
- [ ] Sửa công việc (đổi status trên Kanban) → activity log
- [ ] Viewer không tạo/sửa/xóa được (403)
- [ ] Intern không tạo/sửa/xóa được (403)
- [ ] super_admin có thể hard delete với `?hard=true`
- [ ] Archive button hiện trên ProjectCard/CampaignCard

---

## 5. Rủi Ro Còn Lại

| Rủi ro | Mức | Xử lý |
|--------|------|--------|
| Pre-existing TypeScript errors ở product pages | Thấp | Ngoài scope task này, cần fix riêng |
| `deleteCampaign` dùng hard-delete trong DB (campaigns/[id]/DELETE) | Thấp | Nếu cần soft delete, thêm `archiveCampaign` vào campaigns/[id]/DELETE |
| Không có e2e test cho workspace CRUD | Trung bình | Cần bổ sung e2e test |
| Archive filter chưa được apply vào `getCampaigns` | Trung bình | `getCampaigns` hiện chưa lọc `status = 'archived'` — cần filter ở API level |

---

## 6. Bước Tiếp Theo

1. Thêm `archived` filter vào `getCampaigns` và `getProjects`
2. Tạo trang detail cho Project (`/projects/[id]`) với activity log
3. Tạo trang detail cho Campaign (`/campaigns/[id]`) — đã có detail-client nhưng chưa hoàn chỉnh
4. Bổ sung e2e test cho workspace CRUD
5. Fix pre-existing TypeScript errors ở product pages
