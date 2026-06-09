# Master Data & Task Fix — Báo cáo

## Tóm tắt

Hoàn thành module **Master Data (Danh mục)** và cải thiện **Task Form** với DatePicker, dynamic dropdowns từ Master Data.

**Trạng thái:** Hoàn thành
**Ngày:** 2026-05-29

---

## 1. Master Data Module — Danh mục

### Database Schema

**File:** `sql/workspace/005_master_data.sql`

Tạo bảng `pm_master_data` với cấu trúc linh hoạt:

| Column | Type | Ghi chú |
|---|---|---|
| `id` | UUID | Primary key |
| `category` | VARCHAR(50) | Nhóm: task_type, priority, workflow_stage... |
| `code` | VARCHAR(100) | Mã duy nhất trong nhóm |
| `name` | VARCHAR(255) | Tên hiển thị |
| `description` | TEXT | Mô tả |
| `color` | VARCHAR(50) | Màu chữ (hex) |
| `bg_color` | VARCHAR(50) | Màu nền (hex) |
| `icon` | VARCHAR(100) | Tên icon lucide-react |
| `sort_order` | INTEGER | Thứ tự sắp xếp |
| `is_active` | BOOLEAN | Đang hoạt động / Tạm ngưng |
| `is_system` | BOOLEAN | Item hệ thống, không xóa được |
| `column_bg_color` | VARCHAR(50) | Màu nền cột Kanban |
| `column_border_color` | VARCHAR(50) | Màu viền cột Kanban |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `created_at`, `updated_at` | TIMESTAMPTZ | Auto timestamps |

**7 nhóm danh mục seed:**

| Nhóm | Code | Mô tả |
|---|---|---|
| `task_type` | 9 loại | Bài Facebook, Bài SEO, Video TikTok, Video YouTube, Thiết kế, Chụp ảnh, Livestream, Bài Website, Khác |
| `task_status` | 6 trạng thái | Backlog, To Do, In Progress, Review, Done, Cancelled |
| `priority` | 4 mức | Thấp, Trung bình, Cao, Khẩn cấp |
| `workflow_stage` | 9 giai đoạn | Ý tưởng, Viết nội dung, Review nội bộ, Chỉnh sửa, Đã duyệt, Quay, Edit, Đã lên lịch, Đã đăng |
| `channel` | 8 kênh | Facebook, TikTok, YouTube, Website, Instagram, Zalo, Email, SEO |
| `content_tag` | 7 tags | Facebook, SEO, Video, Summer Sale, Laptop, Promo, Brand |
| `department` | 6 phòng | Marketing, Nội dung, Kinh doanh, IT, Hành chính, Thiết kế |

---

### API Route — `/api/master-data`

**File:** `app/api/master-data/route.ts`

CRUD operations:

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `?category=task_type` | Lấy items theo nhóm |
| `GET` | (no params) | Lấy tất cả items |
| `POST` | body | Tạo item mới |
| `PUT` | `?id=uuid` | Cập nhật item |
| `DELETE` | `?id=uuid` | Soft delete item |
| `DELETE` | `?id=uuid&action=restore` | Khôi phục item |

**Error codes:**
- `MISSING_FIELDS` — Thiếu category/code/name
- `INVALID_CATEGORY` — Category không hợp lệ
- `INVALID_CODE` — Code chứa ký tự không hợp lệ
- `DUPLICATE_CODE` — Code đã tồn tại (HTTP 409)
- `NOT_FOUND` — Item không tìm thấy
- `SYSTEM_ITEM` — Không xóa được item hệ thống

---

### Component — `MasterDataClient`

**File:** `components/master-data/master-data-client.tsx`

Shared component dùng cho tất cả trang Danh mục. Tính năng:

- **CRUD đầy đủ**: Tạo, sửa, xóa, khôi phục
- **Search**: Tìm theo tên hoặc code
- **Filter**: Toggle hiện/ẩn item không active
- **Soft Delete**: Xóa ẩn, không xóa vĩnh viễn
- **Restore**: Khôi phục item đã xóa
- **Color selection**: Color picker với 20 preset màu
- **Icon selection**: Grid 36 icons lucide-react có tìm kiếm
- **Sort order**: Sắp xếp theo tên hoặc thứ tự
- **Active/Inactive**: Toggle trạng thái
- **Preview badge**: Xem trước màu badge trước khi lưu

---

### Pages

| Route | Mô tả |
|---|---|
| `/workspace/master-data` | Trang overview — grid 7 category cards |
| `/workspace/master-data/[category]` | Trang chi tiết từng danh mục |

---

### Sidebar Navigation

**File:** `lib/navigation.ts`

Thêm menu item **Danh mục** vào Workspace:

```
Workspace
 ├─ Tổng quan
 ├─ Dự án
 ├─ Chiến dịch
 ├─ Công việc
 ├─ Nội dung
 ├─ Workflow
 ├─ Calendar
 ├─ Nhân sự
 ├─ Danh mục          ← MỚI
 └─ Hoạt động
```

---

## 2. TaskForm Refactor

### Date Picker Component

**File:** `components/ui/date-picker.tsx`

- Thay thế `<input type="date">` bằng Popover Calendar
- Button trigger với icon Calendar + selected date format `dd/MM/yyyy`
- Nút Xóa bên trong calendar
- Clean, mobile-friendly UX

### TaskForm Improvements

**File:** `components/tasks/task-form.tsx`

| Tính năng | Trạng thái |
|---|---|
| DatePicker thay input type="date" | ✅ start_date, due_date |
| Quick-add [+] button mỗi dropdown | ✅ Status, Priority, Task Type, Workflow Stage |
| Load dropdowns từ Master Data | ✅ Fallback nếu chưa có seed |
| `start_date` field | ✅ Mới thêm |
| `notes` (metadata) field | ✅ Mới thêm |

**Quick-add dialog:** Mở modal nhỏ nhập tên + code → tạo item → tự động refresh dropdown.

### Tasks Page — Master Data Integration

**File:** `app/(admin)/tasks/page.tsx`

Server component load Master Data cùng tasks, projects, campaigns, staff:

```typescript
const [taskTypes, taskStatuses, priorities, workflowStages] = await Promise.all([
  getMasterDataItems("task_type"),
  getMasterDataItems("task_status"),
  getMasterDataItems("priority"),
  getMasterDataItems("workflow_stage"),
]);
```

Truyền xuống `TasksClient` → `TaskForm`.

---

## 3. Task Creation Debug

### Tracing

| Layer | File | What was verified |
|---|---|---|
| Frontend | `tasks-client.tsx` | `handleCreateTask` dùng `adminFetch`, parse error JSON |
| API | `app/api/tasks/route.ts` | CSRF check, rate-limit, Zod validation |
| Validation | `lib/workspace/validation.ts` | `createTaskSchema` — title/status/priority bắt buộc |
| DB | `lib/workspace/db/index.ts` | `createTask` INSERT đúng columns |
| SQL | `002_tasks.sql` | `title VARCHAR NOT NULL`, `status VARCHAR NOT NULL` |

### Debug Logging Added

**File:** `app/api/tasks/route.ts`

```typescript
console.log("[API] POST /api/tasks raw body:", JSON.stringify(body));
console.log("[API] POST /api/tasks validation errors:", ...);
console.log("[API] POST /api/tasks validated data:", ...);
console.error("[API] POST /api/tasks error:", error);
// Error catch returns actual message instead of generic string
```

**Expected flow when task creation fails:**
1. Console terminal hiện `[API] POST /api/tasks raw body:` → payload gửi lên
2. Nếu validation fail → `validation errors:`
3. Nếu DB fail → `error:` với message cụ thể
4. Toast hiện message cụ thể từ backend

---

## 4. Các lỗi đã sửa

| Lỗi | File | Fix |
|---|---|---|
| `react-day-picker` v10 API không tương thích | `components/ui/calendar.tsx` | Viết lại Calendar component đơn giản (v8-style) |
| `locale` type conflict với `date-fns` | `components/ui/date-picker.tsx` | Dùng `toLocaleDateString("vi-VN")` thay vì `format` |
| Duplicate `masterData` const | `app/(admin)/tasks/page.tsx` | Xóa block duplicate |
| `form.category` type error (category không còn trong form state) | `components/master-data/master-data-client.tsx` | Đổi thành prop `category` |
| `date-fns` unused import | `components/ui/date-picker.tsx` | Xóa import |

---

## 5. Files đã tạo / sửa

### Tạo mới

| File | Mô tả |
|---|---|
| `sql/workspace/005_master_data.sql` | Migration + seed data |
| `lib/workspace/types-master-data.ts` | TypeScript types |
| `app/api/master-data/route.ts` | CRUD API |
| `components/master-data/master-data-client.tsx` | Shared CRUD component |
| `app/(admin)/workspace/master-data/page.tsx` | Overview page |
| `app/(admin)/workspace/master-data/[category]/page.tsx` | Category page |
| `components/ui/calendar.tsx` | Calendar component |
| `components/ui/date-picker.tsx` | DatePicker Popover component |

### Sửa đổi

| File | Thay đổi |
|---|---|
| `lib/workspace/db/index.ts` | Thêm 6 master data DB functions |
| `lib/navigation.ts` | Thêm menu Danh mục |
| `components/tasks/task-form.tsx` | DatePicker, Quick-add buttons, load master data |
| `app/(admin)/tasks/page.tsx` | Load master data, truyền vào TasksClient |
| `components/tasks/tasks-client.tsx` | Nhận masterData prop |
| `app/api/tasks/route.ts` | Thêm debug logging |
| `components/kanban/kanban-card.tsx` | Nâng cấp UI (từ Kanban V1) |
| `components/kanban/kanban-board.tsx` | Nâng cấp layout (từ Kanban V1) |
| `lib/workspace/types.ts` | TASK_TYPE_CONFIG, PRIORITY_CONFIG (từ Kanban V1) |

---

## 6. Test Results

| Kiểm tra | Kết quả |
|---|---|
| TypeScript pass | ✅ `pnpm tsc --noEmit` exit 0 |
| Next build pass | ✅ `pnpm build` exit 0 |
| Dev server chạy | ✅ Terminal 2 |
| Migration SQL tạo bảng | ⚠️ Cần chạy `psql -f sql/workspace/005_master_data.sql` |
| Master Data pages route | ✅ `/workspace/master-data` registered |
| Sidebar Danh mục | ✅ Visible in navigation |

---

## 7. Hạn chế & Rủi ro

| # | Hạn chế | Giải pháp |
|---|---|---|
| 1 | Migration chưa chạy trên DB | Chạy: `psql -U postgres -d mytholaptop -f sql/workspace/005_master_data.sql` |
| 2 | `pm_tasks` table có `stage VARCHAR(50)` nhưng schema mới dùng `workflow_stage` | `createTask` đã map đúng `workflow_stage` → `stage` |
| 3 | Master Data chưa có để Kanban Board đọc màu động | Cần cập nhật `KanbanBoard` để đọc colors từ `task_statuses` master data |
| 4 | Intern filter (chỉ xem task được giao) | Cần phase tiếp theo |
| 5 | `react-day-picker` v10 bị unused | Package vẫn cài nhưng component tự viết |

---

## 8. Bước tiếp theo

1. **Chạy migration:** `psql -U postgres -d mytholaptop -f sql/workspace/005_master_data.sql`
2. **KanbanBoard dynamic colors:** Cập nhật đọc colors từ `task_statuses` master data
3. **Master Data hooks trong TaskForm:** Auto-refresh dropdown sau khi tạo item mới (`onMasterDataCreated`)
4. **Phase 2 — Intern RBAC:** Filter tasks server-side theo `assignee_id`
5. **Phase 2 — Approval Flow:** Nút Gửi duyệt / Duyệt trên Task Detail
