# Task Content Detail Layout — Báo cáo Refactor

**Ngày:** 29/05/2026
**Tác giả:** Claude Code
**Trạng thái:** Hoàn thành

---

## 1. Mục tiêu

Refactor Task Create/Edit modal thành layout chuyên biệt cho content-production workflow. Module Task chủ yếu phục vụ việc giao việc content/media cho staff/interns — cần đơn giản hóa metadata và tập trung vào chi tiết nội dung.

## 2. Thay đổi đã thực hiện

### 2.1 Database Migration — `sql/workspace/005_task_content_fields.sql`

Thêm các cột mới vào bảng `pm_tasks`:

| Cột | Kiểu | Mô tả |
|------|-------|--------|
| `content_title` | TEXT | Tiêu đề nội dung cụ thể |
| `content_hook` | TEXT | Câu mở đầu hấp dẫn (hook) |
| `content_goal` | VARCHAR(50) | Mục tiêu: bán hàng, giáo dục, review... |
| `related_product` | TEXT | Sản phẩm liên quan |
| `content_body` | TEXT | Kịch bản video / bài viết / yêu cầu thiết kế |
| `call_to_action` | TEXT | CTA (mua ngay, đăng ký...) |
| `reference_links` | TEXT[] | Links tham khảo |
| `output_links` | TEXT[] | Links đã xuất bản |

```sql
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_title TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_hook TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_goal VARCHAR(50);
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS related_product TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_body TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS call_to_action TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS reference_links TEXT[] DEFAULT '{}';
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS output_links TEXT[] DEFAULT '{}';
```

### 2.2 Task Type — `lib/workspace/types.ts`

Thêm type và constants mới:

```typescript
export type ContentGoal =
  | "ban_hang"
  | "giao_duc"
  | "review"
  | "huong_dan"
  | "gioi_thieu"
  | "cham_soc";

export const CONTENT_GOAL_LABELS: Record<ContentGoal, string> = {
  ban_hang: "Bán hàng",
  giao_duc: "Giáo dục",
  review: "Review",
  huong_dan: "Hướng dẫn",
  gioi_thieu: "Giới thiệu sản phẩm",
  cham_soc: "Chăm sóc khách hàng",
};
```

Mở rộng interface `Task` với 8 field mới.

### 2.3 Validation Schema — `lib/workspace/validation.ts`

Cập nhật cả `createTaskSchema` và `updateTaskSchema` với 8 field mới, bao gồm:
- `content_title`, `content_hook`, `content_goal`
- `related_product`, `content_body`, `call_to_action`
- `reference_links[]`, `output_links[]`

### 2.4 Database Functions — `lib/workspace/db/index.ts`

- `createTask()`: thêm 8 param mới vào INSERT
- `updateTask()`: thêm 8 field vào danh sách `allowed`

### 2.5 API Routes

- `app/api/tasks/route.ts` (POST): truyền 8 content field mới
- `app/api/tasks/[id]/route.ts` (PUT): đã hỗ trợ qua `updateTask()`

### 2.6 TaskForm — Component chính

**File:** `components/tasks/task-form.tsx`

**Thay đổi cấu trúc:**

- Dialog max-width: `1100px` (trước: `sm:max-w-2xl`)
- Layout: `grid grid-cols-1 md:grid-cols-2` (2 cột trên desktop, stack trên mobile)

**Left column — "Thông tin công việc":**
- title (required)
- description
- project_id + campaign_id
- assignee_ids (multi-select với checkbox)
- start_date + due_date (required)
- task_type (required)
- status (required)
- assignee_note (trong metadata)

**Đã loại bỏ:**
- priority (không còn form field)
- workflow_stage (không còn form field)
- tags (không còn form field)

**Right column — "Chi tiết nội dung":**
- content_title
- content_hook
- platform (Facebook, TikTok, Website, YouTube, Zalo, Instagram)
- content_goal (Bán hàng, Giáo dục, Review, Hướng dẫn, Giới thiệu, Chăm sóc)
- related_product
- content_body (dynamic label theo task_type)
- call_to_action
- reference_links (comma-separated)
- output_links (comma-separated)

**Dynamic label cho content_body:**

| task_type | Label |
|-----------|-------|
| tiktok_video, youtube_video | "Kịch bản video" |
| facebook_post, website, seo_article | "Nội dung bài viết" |
| design_image | "Yêu cầu thiết kế" |
| default | "Nội dung / Kịch bản" |

**Validation:**
- `title` — required
- `due_date` — required
- `status` — required
- `task_type` — required
- assignee — optional nhưng recommended

**Date conversion:** Dùng `toISOStringOrNull()` để đảm bảo ISO 8601 format trước khi gửi API.

### 2.7 Task Detail Page — `components/tasks/task-detail-client.tsx`

**Header badges:** Thêm badge cho `platform` và `content_goal`.

**Tab Chi tiết:**
- Block mới "Chi tiết nội dung" hiển thị tất cả content fields
- `content_body` hiển thị trong `<pre>` block với max-height scrollable
- Reference links hiển thị dạng clickable links
- Output links hiển thị dạng clickable links với màu xanh

**Staff permissions:**
- Intern/staff có thể cập nhật `output_links` inline
- Intern/staff có thể đổi `status` inline với button "Đổi trạng thái"
- Dùng `router.refresh()` để reload data

## 3. File đã tạo / sửa

| File | Hành động |
|------|-----------|
| `sql/workspace/005_task_content_fields.sql` | Tạo mới |
| `lib/workspace/types.ts` | Sửa — thêm ContentGoal type + 8 field |
| `lib/workspace/validation.ts` | Sửa — thêm 8 field vào schemas |
| `lib/workspace/db/index.ts` | Sửa — createTask + updateTask |
| `app/api/tasks/route.ts` | Sửa — truyền content fields |
| `components/tasks/task-form.tsx` | Sửa toàn bộ — 2-column layout |
| `components/tasks/task-detail-client.tsx` | Sửa — content detail section |

## 4. API Behavior

**Tạo task mới:**
```
POST /api/tasks
Body: {
  title, description, status, start_date, due_date, task_type,
  project_id, campaign_id, assignee_ids,
  content_title, content_hook, content_goal, platform,
  related_product, content_body, call_to_action,
  reference_links[], output_links[],
  metadata: { notes }
}
```

**Cập nhật task:**
```
PUT /api/tasks/:id
Body: {
  // Các field muốn cập nhật
  status, output_links, ...
}
```

**Refresh Kanban:** Sau khi save, `setTasks()` trong `tasks-client.tsx` cập nhật state → Kanban board tự động re-render.

## 5. Chạy Migration

```bash
psql -U postgres -d mytholaptop -f apps/admin-ui/sql/workspace/005_task_content_fields.sql
```

## 6. Lưu ý

- Các field `priority`, `workflow_stage`, `tags` vẫn còn trong database (backward compatible) nhưng **không còn hiển thị trong form**. Các task cũ không bị ảnh hưởng.
- Content detail fields được lưu trực tiếp vào bảng `pm_tasks` thay vì qua `metadata` JSONB.
- Task type determines content_body label: video script / article body / design requirements.
- Staff/intern có quyền cập nhật `output_links` và `status` trên Task Detail page.

## 7. Bước tiếp theo đề xuất

1. Chạy migration trên database staging để test.
2. Verify form submit với đầy đủ content fields.
3. Kiểm tra Kanban board refresh sau khi save.
4. Test inline status update từ staff/intern.
5. Xem xét thêm content preview component cho content_body.
