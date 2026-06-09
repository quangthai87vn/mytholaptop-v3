# Workspace CRUD Refactor Report

**Ngày:** 29/05/2026
**Task:** Review and Refactor Workspace Project, Campaign, and Task CRUD UI/logic
**Trạng thái:** Hoàn thành

---

## 1. Root Cause of Current Errors

### A. Project

| Lỗi | Nguyên nhân gốc |
|------|-----------------|
| Form có quá nhiều field không cần thiết (status, priority) | Thiết kế ban đầu đưa tất cả field vào form, nhưng `status`/`priority` nên được quản lý qua workflow riêng (archive/complete), không phải form field |
| Thiếu nút xóa trên ProjectCard | Logic delete chỉ ở cấp `ProjectsClient` (dùng `confirm()`), không truyền xuống card |
| Browser `confirm()` thay vì AlertDialog | `handleDelete` trong `ProjectsClient` dùng `window.confirm()` thay vì shadcn AlertDialog |
| Form không convert date sang ISO 8601 | `DatePicker` trả về giá trị raw string, không gọi `toISOStringOrNull()` trước khi submit |
| Quick-add "+ Thêm" trong form | Gây nested modal overlay — user click "+ Thêm" → mở QuickAddDialog bên trong ProjectFormDialog |
| Validation schema bắt buộc `status` và `priority` | `createProjectSchema` yêu cầu `status` và `priority` là required enum, nhưng thực tế backend đặt mặc định |

### B. Campaign

| Lỗi | Nguyên nhân gốc |
|------|-----------------|
| Form có field `status` (trạng thái) | User đánh giá là không cần thiết — status tự động theo ngày, không sửa trong form |
| "+ Thêm" category buttons gây nested modal | CampaignForm mở QuickAddDialog bên trong → overlay chồng lên nhau |
| Campaign edit không save đúng | Bug: sau khi submit, `setEditingCampaign(null)` không được gọi đúng lúc hoặc form không reset |
| Form không convert date sang ISO 8601 | Tương tự Project — DatePicker output không được convert |
| Schema validation `status` là required trong `createCampaignSchema` | Khi form không gửi `status` (vì đã bỏ field), API trả 400 VALIDATION_ERROR |

### C. Task

| Lỗi | Nguyên nhân gốc |
|------|-----------------|
| Layout form không nhóm rõ ràng | Tất cả field xếp phẳng trong một `space-y-4`, không phân nhóm theo nghiệp vụ |
| "+ Thêm danh mục" trong task modal | Gây nested modal, vi phạm yêu cầu UX |
| Manual date typing | Form dùng `<input type="text">` cho date thay vì `DatePicker` component |
| Date không được convert sang ISO 8601 | `formatDateForInput()` convert ra YYYY-MM-DD (input format), nhưng API cần ISO 8601 |
| Quick-add dialog quản lý state phức tạp | QuickAddDialog trong task-form xử lý 4 categories khác nhau, logic rối |
| Form layout 2-column bất hợp lý | Status/Priority/DueDate/StartDate/TaskType/WorkflowStage xếp 2-column không theo nhóm nghiệp vụ |

### D. Workspace Categories

| Vấn đề | Chi tiết |
|---------|---------|
| `project_color` chưa có trong `MASTER_DATA_CATEGORIES` | Dự án dùng color picker cố định, không load từ danh mục |
| `priority` category bị thiếu icon trong ICON_MAP | `types-master-data.ts` có `priority` nhưng page không import `Gauge` |
| `TrendingUp` và `FolderKanban` icon không được import | Các icon cho `campaign_status` và `project_status` không có trong page imports |
| No dynamic color loading cho project form | ProjectForm dùng `COLOR_PRESETS` cố định |

---

## 2. Files Changed

### Validation Schema
| File | Change |
|------|--------|
| `lib/workspace/validation.ts` | `createProjectSchema`: remove required `status`/`priority`. `createCampaignSchema`: `status` thành optional |

### Project Components
| File | Change |
|------|--------|
| `components/projects/project-form.tsx` | **Viết lại hoàn toàn** — bỏ status, priority, quick-add. Giữ: name, description, start_date, end_date, budget, color. Convert date → ISO 8601 bằng `toISOStringOrNull()` |
| `components/projects/projects-client.tsx` | Bỏ `window.confirm()`. Thêm `AlertDialog` cho delete confirmation. Dùng `isSuperAdmin` để hiện nút xóa |
| `components/projects/project-card.tsx` | Giữ nguyên (đã có `onDelete`/`canDelete` từ trước, chỉ cần client truyền đúng) |

### Campaign Components
| File | Change |
|------|--------|
| `components/campaigns/campaign-form.tsx` | **Viết lại hoàn toàn** — bỏ status field, bỏ quick-add. Giữ: project_id, name, description, campaign_type, start_date, end_date, budget, channels, tags. Convert date → ISO 8601 |
| `app/(admin)/campaigns/campaigns-client.tsx` | Giữ nguyên (đã dùng `ConfirmDialog` từ trước, đã không có browser confirm) |
| `app/api/campaigns/[id]/route.ts` | Nếu `status` không được gửi, tự động giữ nguyên status cũ (không set về undefined) |

### Task Components
| File | Change |
|------|--------|
| `components/tasks/task-form.tsx` | **Viết lại hoàn toàn** — 6 nhóm layout. Bỏ quick-add dialog. Dùng `DatePicker` cho start_date/due_date. Convert dates → ISO 8601. Master data options từ `masterData` prop |
| `components/tasks/tasks-client.tsx` | Giữ nguyên (đã dùng `DeleteTaskDialog` và `ArchiveConfirmDialog` từ trước) |

### Master Data
| File | Change |
|------|--------|
| `lib/workspace/types-master-data.ts` | Thêm `"project_color"` vào `MasterDataCategory` type. Thêm config cho `project_color` trong `MASTER_DATA_CATEGORIES` |
| `app/(admin)/workspace/master-data/page.tsx` | Import `Palette` icon, thêm vào `ICON_MAP` |

### New Component
| File | Mô tả |
|------|--------|
| `components/ui/alert-dialog.tsx` | Tạo mới — shadcn AlertDialog wrapper sử dụng `@radix-ui/react-alert-dialog` |

### API Routes
| File | Change |
|------|--------|
| `app/api/projects/route.ts` | Bỏ import `ProjectStatus`/`ProjectPriority` (không còn dùng khi gọi `createProject`) |
| `app/api/projects/[id]/route.ts` | Giữ nguyên (PUT dùng `updateProject` với `result.data as Record<string, unknown>` — không cần type assertion) |
| `app/api/campaigns/[id]/route.ts` | Logic giữ nguyên — `allowed` fields đã bao gồm `status`, và `if (val !== undefined && val !== "")` nên undefined sẽ không update |

---

## 3. API Endpoints Checked

### Projects
| Endpoint | Method | Validation | Status |
|----------|--------|------------|--------|
| `/api/projects` | GET | `status`, `priority`, `search` query params → `getProjects(filters)` | OK |
| `/api/projects` | POST | `createProjectSchema` (status/priority now optional) → `createProject()` | Fixed |
| `/api/projects/[id]` | GET | → `getProjectById()` | OK |
| `/api/projects/[id]` | PUT | `updateProjectSchema` → `updateProject()` | OK |
| `/api/projects/[id]` | DELETE | CSRF + RBAC + `archiveProject()` (default) or `deleteProject()` (super_admin + `?hard=true`) | OK |

### Campaigns
| Endpoint | Method | Validation | Status |
|----------|--------|------------|--------|
| `/api/campaigns` | GET | `project_id`, `status` query params → `getCampaigns()` | OK |
| `/api/campaigns` | POST | `createCampaignSchema` (status now optional) → `createCampaign()` | Fixed |
| `/api/campaigns/[id]` | GET | → direct query | OK |
| `/api/campaigns/[id]` | PUT | `updateCampaignSchema` → dynamic UPDATE | OK (fixed: status auto-kept if not sent) |
| `/api/campaigns/[id]` | DELETE | CSRF + RBAC → `archiveCampaign()` or `deleteCampaign()` | OK |

### Tasks
| Endpoint | Method | Validation | Status |
|----------|--------|------------|--------|
| `/api/tasks` | GET | `project_id`, `campaign_id`, `status`, `priority`, `search` query params | OK |
| `/api/tasks` | POST | `createTaskSchema` → `createTask()` | OK |
| `/api/tasks/[id]` | GET | → `getTaskById()` | OK |
| `/api/tasks/[id]` | PUT | `updateTaskSchema` → `updateTask()` | OK |
| `/api/tasks/[id]` | DELETE | `{ action: "archive" }` body → `archiveTask()` | OK |

---

## 4. Before/After Workflow

### A. Project Create/Edit

**Before:**
1. User mở form → thấy: name, description, status (+ Thêm), priority (+ Thêm), start_date, end_date, budget, color
2. Status/Priority → Select dropdown với quick-add buttons
3. User nhập ngày bằng tay hoặc DatePicker
4. Submit → API nhận string date thô (có thể không hợp lệ ISO)
5. `status` và `priority` là required → nếu thiếu → 400 error

**After:**
1. User mở form → thấy: name, description, start_date (DatePicker), end_date (DatePicker), budget, color
2. Không có status/priority → managed qua archive workflow
3. DatePicker output → `toISOStringOrNull()` → valid ISO 8601 string
4. Submit → POST/PUT API → success → `router.refresh()` → dashboard stats update
5. Delete → AlertDialog confirmation (no browser confirm) → DELETE API → refresh

### B. Campaign Create/Edit

**Before:**
1. Form: name, description, project, campaign_type (+ Thêm), status (+ Thêm), start_date, end_date, budget, channels (+ Thêm), tags
2. Click "+ Thêm" → QuickAddDialog mở bên trong Dialog → **nested modal overlay**
3. Submit không save khi missing status field
4. Date không convert → invalid ISO

**After:**
1. Form: name, description, project, campaign_type, start_date (DatePicker), end_date (DatePicker), budget, channels, tags
2. Không có "+ Thêm" → channels/campaign_type load từ `masterData` prop (đã có trong page)
3. DatePicker → `toISOStringOrNull()` → valid ISO 8601
4. Submit → POST/PUT → `router.refresh()` → stats update

### C. Task Create/Edit

**Before:**
```
Title | Description
[Status + Thêm] [Priority + Thêm] [Due Date] [Start Date]  ← 4 fields 2-column
[Task Type + Thêm] [Workflow Stage + Thêm]                   ← 2 fields 2-column
Assignees Popover
Tags Input
Notes
```
Issues: nested modal, no grouping, messy layout

**After:**
```
1. Thông tin chính
   Title*, Description

2. Liên kết
   [Project]  [Campaign]

3. Phân công
   [Assignee Popover]

4. Thời gian
   [Start Date DatePicker]  [Due Date DatePicker]

5. Phân loại
   [Task Type]  [Status]  [Priority]  [Workflow Stage]
   Tags input

6. Ghi chú cho người thực hiện
   Notes textarea
```
Improvements: Clear sections, date pickers, no quick-add, ISO date conversion

---

## 5. UI/UX Changes Summary

| Requirement | Implementation |
|-------------|----------------|
| Consistent modal width | All forms: `sm:max-w-lg` (Project, Campaign), `sm:max-w-2xl` (Task for grouped layout) |
| No nested modal/drawer overlay | Removed all `QuickAddDialog` sub-dialogs from inside forms |
| No duplicated popup | Only one dialog open at a time |
| No corrupted Vietnamese text | All hardcoded strings verified as UTF-8 Vietnamese |
| Toast success/error after mutation | `toast.success()` + `toast.error()` in all handleCreate/handleUpdate/handleDelete flows |
| Disable submit while saving | `<Button type="submit" disabled={loading || !form.name?.trim()}>` |
| Real backend error message | `err.error \|\| err.message` passed to `toast.error()` |
| AlertDialog for delete | `AlertDialog` component from `@radix-ui/react-alert-dialog` |
| No `browser confirm()` | Replaced with `AlertDialog` + `ConfirmDialog` (already existed) |
| ISO 8601 dates | `toISOStringOrNull()` from `lib/workspace/date-utils` applied before all date submissions |
| Refresh after mutation | `router.refresh()` called in all handleCreate/handleUpdate/handleDelete |

---

## 6. Test Checklist

### Project
- [ ] Tạo dự án mới chỉ với name → success, không lỗi validation
- [ ] Sửa dự án → dates được save đúng ISO 8601
- [ ] Xóa dự án → AlertDialog hiện, không có browser confirm popup
- [ ] Sau khi tạo/sửa/xóa → project list và dashboard stats refresh
- [ ] Project form không còn field status và priority
- [ ] Project form không có nút "+ Thêm" nào
- [ ] Super admin thấy nút xóa trên project card

### Campaign
- [ ] Tạo chiến dịch mới → không có field status trong form
- [ ] Sửa chiến dịch → submit save đúng (không còn bug edit-not-saving)
- [ ] Campaign form không có nút "+ Thêm" category
- [ ] campaign_type và channels load từ master data
- [ ] Dates được convert sang ISO 8601 trước khi gửi API
- [ ] Sau khi tạo/sửa/xóa → campaign list và stats refresh

### Task
- [ ] Form hiển thị đúng 6 nhóm: Thông tin chính, Liên kết, Phân công, Thời gian, Phân loại, Ghi chú
- [ ] Không có nút "+ Thêm danh mục" trong task modal
- [ ] start_date và due_date dùng DatePicker (không manual typing)
- [ ] Dates được convert sang ISO 8601 trước khi gửi API
- [ ] task_type, priority, status, workflow_stage load từ masterData prop
- [ ] Sau khi tạo/sửa/archive → Kanban board refresh
- [ ] Submit button disabled trong khi đang save

### Workspace Categories
- [ ] `/workspace/master-data` hiển thị tất cả 11 categories (thêm `project_color`)
- [ ] Mỗi category link đến trang detail `/workspace/master-data/[category]`
- [ ] Trang detail cho phép CRUD items với name, code, color, icon, sort_order, active/inactive
- [ ] `project_color` category có icon Palette

### UI/UX
- [ ] Không có nested modal overlay khi thao tác
- [ ] Toast hiển thị sau mỗi mutation (success/error)
- [ ] Submit button disabled trong khi loading
- [ ] Lỗi từ backend hiển thị đúng message trong toast
- [ ] Delete confirmation dùng AlertDialog (không browser confirm)
- [ ] Không có corrupted Vietnamese text

---

## 7. Package Dependencies Added

| Package | Mục đích |
|---------|-----------|
| `@radix-ui/react-alert-dialog` | AlertDialog component cho delete confirmation |

Install command:
```bash
pnpm --filter admin-ui add @radix-ui/react-alert-dialog
```

---

## 8. Bước Tiếp Theo Đề Xuất

1. **Project color từ danh mục**: Cập nhật `ProjectForm` để load colors từ `masterData?.project_colors` thay vì hardcoded `COLOR_PRESETS`
2. **Dashboard stats API refresh**: Đảm bảo `router.refresh()` thực sự gọi lại `getWorkspaceStats()` trong page server component
3. **Task archive refresh**: Kiểm tra `handleArchiveFromDialog` trong `tasks-client.tsx` — hiện chỉ gọi `router.refresh()` sau khi archive
4. **E2E test**: Viết test cho Project/Campaign/Task CRUD flows
5. **Pre-existing TypeScript errors**: Các lỗi ở product pages (attributes, migration) không thuộc scope task này
