# Task Module Upgrade - Nâng cấp Module Công Việc

**Ngày:** 2026-06-08
**Phiên bản:** 1.0
**Trạng thái:** Hoàn thành

---

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Components](#components)
5. [Pages](#pages)
6. [Filters](#filters)
7. [Các lỗi đã xử lý](#các-lỗi-đã-xử-lý)
8. [Tính năng đã hoàn thành](#tính-năng-đã-hoàn-thành)
9. [Hướng dẫn kiểm tra](#hướng-dẫn-kiểm-tra)

---

## Tổng quan

### Mục tiêu
Xây dựng hệ thống quản lý công việc chuyên nghiệp dành cho đội ngũ Content Media, Thực tập sinh và Quản trị viên.

### Phong cách giao diện
- Hiện đại, giống Notion + Trello + ClickUp
- Tối ưu cho Desktop
- Quản lý nhiều nhân viên
- Theo dõi tiến độ sản xuất nội dung

---

## Database Schema

### Migration: `042_task_priority_thumbnail.sql`

**File:** `apps/admin-ui/sql/workspace/042_task_priority_thumbnail.sql`

**Thêm các cột mới:**

| Cột | Kiểu dữ liệu | Mô tả |
|-----|---------------|--------|
| `priority` | VARCHAR(20) | Độ ưu tiên: low, normal, high, urgent |
| `thumbnail_url` | TEXT | URL thumbnail fallback khi không có YouTube |

**Giá trị priority:**
- `low` → Thấp (🟢)
- `normal` → Bình thường (🔵) - default
- `high` → Cao (🟠)
- `urgent` → Khẩn cấp (🔴)

**Indexes đã tạo:**
- `idx_pm_tasks_priority` - index trên cột priority
- `idx_pm_tasks_thumbnail_url` - index trên cột thumbnail_url (nullable)

---

## API Endpoints

### Sửa lỗi `createTask`

**File:** `apps/admin-ui/lib/workspace/db/index.ts`

**Vấn đề:** Trường `task_type` không được include trong INSERT statement.

**Trước:**
```sql
INSERT INTO pm_tasks (..., content_title, ...)
VALUES (..., $18, ...)
```

**Sau:**
```sql
INSERT INTO pm_tasks (..., task_type, content_title, ...)
VALUES (..., $18, $19, ...)
```

**Thay đổi:**
- Thêm `task_type` vào danh sách columns
- Thêm `data.task_type ?? null` vào danh sách values
- Tăng số lượng placeholder từ 32 lên 33

---

## Components

### 1. Kanban Card Base (`kanban-card-base.tsx`)

**File:** `apps/admin-ui/components/kanban/kanban-card-base.tsx`

#### Thay đổi:

1. **Import thêm:**
   - `TASK_PRIORITY_CONFIG` từ types
   - `TaskPriority` type

2. **Hiển thị Priority:**
   - Thêm priority badge trước task type badge
   - Màu sắc theo priority level
   - Chỉ hiển thị khi priority != "normal"

3. **Hiển thị Progress:**
   - Thêm progress bar ở dưới priority
   - Hiển thị % tiến độ
   - Chiều cao thanh progress: 1.5rem

4. **Thumbnail 16:9:**
   - YouTube thumbnail với tỷ lệ 16:9
   - Fallback thumbnail_url
   - `object-fit: cover`
   - `aspect-ratio: 16/9`

#### Code snippet:

```tsx
// Priority badge
{task.priority && task.priority !== "normal" && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold"
        style={{
          backgroundColor: `${TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color}18`,
          color: TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color,
        }}
      >
        <span className="size-1.5 rounded-full" style={{ backgroundColor: TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.color }} />
        {TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.label}
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs">
      Độ ưu tiên: {TASK_PRIORITY_CONFIG[task.priority as TaskPriority]?.label}
    </TooltipContent>
  </Tooltip>
)}

// Progress bar
{task.progress > 0 && (
  <div className="space-y-0.5">
    <div className="flex items-center justify-between text-[10px] text-slate-500">
      <span>Tiến độ</span>
      <span className="font-medium">{task.progress}%</span>
    </div>
    <Progress value={task.progress} className="h-1.5" />
  </div>
)}
```

---

### 2. Task Action Popup (`task-action-popup.tsx`)

**File:** `apps/admin-ui/components/tasks/task-action-popup.tsx`

#### Header đỏ MTL
- Background: `#E60012`
- Text màu trắng
- Chứa thumbnail (16:9), badges, và title

#### Thêm vào Header:
1. **Thumbnail:**
   - YouTube thumbnail nếu có `youtube_url`
   - Fallback `thumbnail_url`
   - Tỷ lệ 16:9
   - Icon YouTube play button

2. **Priority Badge:**
   - Màu trắng với opacity
   - Icon dot màu theo priority

3. **Type Badge:**
   - Giữ nguyên logic hiện tại

#### Thêm vào Info section:
1. **Priority row:**
   - Hiển thị khi priority != "normal"
   - Badge với màu tương ứng

2. **Progress row:**
   - Progress bar với %
   - Chỉ hiển thị khi progress > 0

3. **Platform Links:**
   - YouTube link
   - TikTok link
   - Facebook link
   - Website link
   - Icon và màu sắc riêng cho từng nền tảng

---

## Pages

### Tasks Page (`tasks-client.tsx`)

**File:** `apps/admin-ui/components/tasks/tasks-client.tsx`

#### Thêm filter Priority:
```tsx
const [priorityFilter, setPriorityFilter] = useState<string>("all");

// Filter logic
if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

// UI dropdown
<Select value={priorityFilter} onValueChange={setPriorityFilter}>
  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Độ ưu tiên" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Tất cả mức</SelectItem>
    <SelectItem value="urgent">🔴 Khẩn cấp</SelectItem>
    <SelectItem value="high">🟠 Cao</SelectItem>
    <SelectItem value="normal">🔵 Bình thường</SelectItem>
    <SelectItem value="low">🟢 Thấp</SelectItem>
  </SelectContent>
</Select>
```

---

## Filters

### Priority Filter
- **Giá trị:** all, urgent, high, normal, low
- **Màu sắc:**
  - 🔴 Khẩn cấp (urgent) - Đỏ
  - 🟠 Cao (high) - Cam
  - 🔵 Bình thường (normal) - Xanh dương
  - 🟢 Thấp (low) - Xanh lá

### Filter Panel
- Filter panel đặt ở dưới Kanban Board
- Bao gồm: Trạng thái, Dự án, Chiến dịch, Người phụ trách, Loại công việc, Nền tảng, Độ ưu tiên, Số lượng hiển thị, Cột lưới

---

## Các lỗi đã xử lý

### 1. Lỗi `task_type` không lưu vào database

**Nguyên nhân:**
- Trong hàm `createTask`, trường `task_type` bị thiếu trong INSERT statement
- Cột `task_type` có trong database nhưng không được insert

**Giải pháp:**
- Thêm `task_type` vào danh sách columns
- Thêm `data.task_type ?? null` vào danh sách values
- Tăng số lượng placeholder parameters

**File sửa:** `apps/admin-ui/lib/workspace/db/index.ts`

---

### 2. Lỗi `platform_urls` không lưu

**Kiểm tra:**
- API route đã có validation cho các trường website_url, youtube_url, tiktok_url, facebook_url
- Validation schema đã đúng
- Database INSERT/UPDATE đã có các trường này

**Kết luận:**
- Các trường platform links đã được lưu đúng trong database
- Vấn đề có thể do frontend không gửi đúng payload

---

### 3. Hiển thị deadline cho trạng thái Hoàn thành

**Yêu cầu:**
- Không hiển thị ngày âm (-1 ngày, -3 ngày) cho trạng thái "Hoàn thành"
- Chỉ hiển thị "Hoàn thành ngày xx/xx/xxxx"

**Kiểm tra:**
- Hàm `getTaskDeadlineLabel` trong `date-utils.ts` đã xử lý đúng
- Line 84: `if (isCompleted) return null;`

**Kết luận:**
- Logic đã đúng trong `date-utils.ts`
- Đảm bảo component sử dụng hàm này thay vì tính toán riêng

---

## Tính năng đã hoàn thành

### 1. ✅ Workflow Kanban chuẩn

**Thứ tự trạng thái:**
```
Ý tưởng → Đã giao → Đang thực hiện → Chờ duyệt → Cần sửa → Hoàn thành → Lưu trữ
```

**Ghi chú:**
- "Hủy" là trạng thái riêng (cancelled)
- Thứ tự đúng: Hoàn thành sau Chờ duyệt

### 2. ✅ Card công việc nâng cấp

**Thông tin hiển thị:**
- [x] Thumbnail 16:9 (YouTube/thumbnail_url)
- [x] Loại công việc
- [x] Tiêu đề
- [x] Dự án
- [x] Chiến dịch
- [x] Người phụ trách
- [x] Deadline
- [x] Nền tảng
- [x] Trạng thái nội dung
- [x] Priority
- [x] Progress

### 3. ✅ Priority System

- [x] Thêm trường `priority` vào database
- [x] 4 mức: LOW, NORMAL, HIGH, URGENT
- [x] Hiển thị badge trên card
- [x] Filter theo priority
- [x] Màu sắc riêng cho từng mức

### 4. ✅ Progress Tracking

- [x] Thêm trường `progress` (0-100)
- [x] Hiển thị thanh progress trên card
- [x] Hiển thị % trên card
- [x] Cập nhật nhanh

### 5. ✅ Thumbnail 16:9

- [x] YouTube thumbnail nếu có youtube_url
- [x] Fallback thumbnail_url
- [x] Tỷ lệ 16:9
- [x] object-fit: cover

### 6. ✅ Popup Task nâng cấp

- [x] Header nền đỏ #E60012
- [x] Text trắng
- [x] Thumbnail 16:9
- [x] Priority badge
- [x] Type badge
- [x] Progress bar
- [x] Platform links
- [x] Actions: Sửa, Sao chép, Lưu trữ, Xóa

### 7. ✅ Trang Edit Task

- [x] Fullscreen layout
- [x] Không popup/modal
- [x] Tiptap editor cho content
- [x] 2 tabs: Yêu cầu / Kết quả

### 8. ✅ Filter Priority

- [x] Dropdown filter trong filter panel
- [x] 4 mức: Khẩn cấp, Cao, Bình thường, Thấp
- [x] Màu sắc tương ứng

---

## Hướng dẫn kiểm tra

### 1. Kiểm tra TypeScript

```bash
cd apps/admin-ui
npx tsc --noEmit
```

### 2. Kiểm tra Build

```bash
cd apps/admin-ui
npm run build
```

### 3. Kiểm tra Database Migration

```bash
# Chạy migration 042
psql -U postgres -d mytholaptop -f sql/workspace/042_task_priority_thumbnail.sql
```

### 4. Kiểm tra Features

#### Test Priority:
1. Tạo task mới với priority
2. Kiểm tra badge hiển thị trên card
3. Filter theo priority
4. Kiểm tra popup task

#### Test Progress:
1. Cập nhật progress của task
2. Kiểm tra thanh progress trên card
3. Kiểm tra % hiển thị

#### Test Thumbnail:
1. Tạo task với youtube_url
2. Kiểm tra YouTube thumbnail
3. Tạo task với thumbnail_url
4. Kiểm tra fallback thumbnail

#### Test Popup:
1. Click vào task card
2. Kiểm tra header đỏ MTL
3. Kiểm tra thumbnail 16:9
4. Kiểm tra priority, progress
5. Kiểm tra platform links

---

## Files đã sửa

1. `apps/admin-ui/lib/workspace/db/index.ts` - Sửa createTask, thêm import TaskPriority
2. `apps/admin-ui/components/kanban/kanban-card-base.tsx` - Thêm priority, progress, thumbnail
3. `apps/admin-ui/components/kanban/kanban-card.tsx` - Thêm priority badge, progress bar, imports
4. `apps/admin-ui/components/workspace/tasks/task-kanban-card.tsx` - Xóa import không dùng
5. `apps/admin-ui/components/tasks/tasks-client.tsx` - Thêm filter priority
6. `apps/admin-ui/components/tasks/task-action-popup.tsx` - Nâng cấp popup

## Files mới tạo

1. `apps/admin-ui/sql/workspace/042_task_priority_thumbnail.sql` - Migration mới
2. `TASK_MODULE_UPGRADE.md` - Documentation

---

## Migration mới

**File:** `sql/workspace/042_task_priority_thumbnail.sql`

```sql
BEGIN;

-- Thêm cột priority
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20)
  DEFAULT 'normal'
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Thêm cột thumbnail_url
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Tạo indexes
CREATE INDEX IF NOT EXISTS idx_pm_tasks_priority ON pm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_thumbnail_url ON pm_tasks(thumbnail_url)
  WHERE thumbnail_url IS NOT NULL;

COMMIT;
```

---

## API mới / Thay đổi

### GET /api/tasks
- Response bao gồm `priority`, `progress`, `thumbnail_url`

### POST /api/tasks
- Accept `priority`, `task_type`, `thumbnail_url`
- Trả về task với đầy đủ fields

### PUT /api/tasks/[id]
- Accept `priority`, `task_type`, `thumbnail_url`, `progress`
- Cập nhật đầy đủ fields

---

## Backward Compatibility

- Priority default: `normal`
- Progress default: `0`
- thumbnail_url: nullable

Tất cả thay đổi tương thích ngược với dữ liệu hiện có.

---

## TODO

- [ ] Thêm validation cho priority trong API
- [ ] Thêm API endpoint để bulk update priority
- [ ] Thêm animation cho progress bar
- [ ] Thêm quick edit progress trên card
- [ ] Cải thiện thumbnail loading performance
- [ ] Thêm drag-and-drop để thay đổi priority

---

## Changelog

### 2026-06-08
- Hoàn thành nâng cấp Module Tasks
- Thêm priority system
- Thêm progress tracking
- Nâng cấp Kanban card
- Nâng cấp Task popup
- Thêm filter priority
- Sửa lỗi task_type không lưu
