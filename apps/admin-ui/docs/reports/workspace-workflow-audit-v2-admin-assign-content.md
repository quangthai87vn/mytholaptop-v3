# Workspace Workflow Audit V2: Admin Giao Việc Cho Nhân Sự Content

**Ngày audit:** 29/05/2026  
**Người thực hiện:** Agent Audit  
**Trạng thái:** Hoàn thành phase audit, chưa sửa code

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Luồng hiện tại](#2-luồng-hiện-tại)
3. [Audit chi tiết từng module](#3-audit-chi-tiết-từng-module)
   - 3.1. Tasks
   - 3.2. Projects
   - 3.3. Campaigns
   - 3.4. Content
   - 3.5. Media Workflow
   - 3.6. Calendar
   - 3.7. Staff & RBAC
   - 3.8. Activity & Notifications
4. [Chỗ nào đang đúng](#4-chỗ-nào-đang-đúng)
5. [Chỗ nào đang sai / Cần sửa](#5-chỗ-nào-đang-sai--cần-sửa)
6. [Luồng chuẩn đề xuất](#6-luồng-chuẩn-đề-xuất)
7. [Quy tắc dữ liệu đề xuất](#7-quy-tắc-dữ-liệu-đề-xuất)
8. [RBAC đề xuất](#8-rbac-đề-xuất)
9. [UI cần cải thiện](#9-ui-cần-cải-thiện)
10. [Đề xuất sửa theo thứ tự ưu tiên](#10-đề-xuất-sửa-theo-thứ-tự-ưu-tiên)
11. [Danh sách file cần sửa ở phase tiếp theo](#11-danh-sách-file-cần-sửa-ở-phase-tiếp-theo)

---

## 1. Tổng quan hệ thống

Hệ thống admin-ui có các module chính:

| Module | Trạng thái | Ghi chú |
|--------|-----------|---------|
| Tasks | Active, hoàn chỉnh | Quản lý công việc chính |
| Projects | Active | CRUD đầy đủ |
| Campaigns | Active | CRUD đầy đủ |
| Content | Active | CRUD đầy đủ |
| Media Workflow | Deprecated | Đã migrate sang Tasks |
| Calendar | Active | 3 view modes |
| Staff & RBAC | Active | Engine RBAC hoàn chỉnh |
| Activity Log | Active | Có filters + export |
| Notifications | Active | Typed notification service |

---

## 2. Luồng hiện tại

### Luồng Task hiện tại

```
Admin tạo Task
  → Không bắt buộc project_id
  → Không bắt buộc campaign_id
  → Có assignee_ids (array, default rỗng)
  → Không bắt buộc task_type  ← THIẾU trong form
  → Có status, priority, due_date
  → Không workflow_stage trong form ← THIẾU trong form

Task được gán
  → Nhân sự cập nhật tiến độ (status, progress, checklist)
  → Comment, upload asset
  → Gửi duyệt (submit_review) — editor+
  → Admin/Editor duyệt (approve/reject) — admin+
  → Super Admin xuất bản (publish) — super_admin only

Task hoàn thành
  → Status = done
  → Workflow stage = published/scheduled
  → Published_at, published_url được ghi
```

### Luồng Content hiện tại

```
Content Item tạo từ Task (qua generate API)
  → task_id FK → pm_tasks
  → Content type: facebook / website / video / image
  → Status: draft / published / scheduled / archived
  → KHÔNG có flow idea → draft → review → approved → scheduled → published tự động
  → Generator chỉ tạo content, không theo workflow stage
```

### Luồng Media Workflow hiện tại

```
DEPRECATED - Đã migrate sang Tasks
  → Media workflows được quản lý qua pm_tasks với task_type + workflow_stage
  → UI vẫn còn nhưng backend chuyển sang /api/tasks
```

---

## 3. Audit chi tiết từng module

### 3.1. Tasks

#### 3.1.1 Types (`lib/workspace/types.ts`)

**Task interface** (dòng 119-151):

```typescript
export interface Task {
  id: string;
  project_id?: string;      // ✅ OPTIONAL
  campaign_id?: string;     // ✅ OPTIONAL
  title: string;            // ✅ BẮT BUỘC
  status: TaskStatus;       // ✅ BẮT BUỘC
  priority: TaskPriority;    // ✅ BẮT BUỘC
  workflow_stage?: WorkflowStage;  // ✅ CÓ
  task_type?: TaskType;     // ✅ CÓ
  assignee_ids: string[];   // ✅ CÓ
  due_date?: string;        // ✅ CÓ
  // ... còn lại
}
```

**TaskType** (dòng 101-109):
```typescript
"facebook_post" | "tiktok_video" | "youtube_video" |
"seo_article" | "design_image" | "product_photo" | "livestream" | "other"
```

**TaskStatus** (dòng 80-86):
```typescript
"backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled"
```

**WorkflowStage** (dòng 90-99):
```typescript
"idea" | "writing" | "internal_review" | "revision" | "approved" |
"shooting" | "editing" | "scheduled" | "published"
```

**Đánh giá types:**
- ✅ `project_id` = optional — ĐÚNG theo yêu cầu
- ✅ `campaign_id` = optional — ĐÚNG theo yêu cầu
- ✅ `task_type` có đầy đủ giá trị
- ✅ `workflow_stage` đầy đủ cho content workflow
- ✅ `assignee_ids` array
- ⚠️ **THIẾU:** `task_type` không bắt buộc (type là optional)

#### 3.1.2 Database Schema (`sql/workspace/002_tasks.sql`)

Bảng `pm_tasks` đầy đủ:
- ✅ FK `project_id` → `pm_projects(id)` ON DELETE CASCADE
- ✅ FK `campaign_id` → `pm_campaigns(id)` ON DELETE SET NULL
- ✅ `assignee_ids` UUID[] với GIN index
- ✅ `stage` (DB) → mapped sang `workflow_stage` (TS) — đã xử lý trong `mapTaskRow`
- ✅ Trigger tự động update `updated_at`
- ✅ Indexes đầy đủ: project, status, priority, assignee, due_date, stage
- ✅ Constraint `progress` CHECK (0-100)

#### 3.1.3 API Routes (`app/api/tasks/`)

| Endpoint | RBAC | Activity Log | Ghi chú |
|----------|------|-------------|---------|
| `GET /api/tasks` | ❌ Không check | ❌ | Chỉ check auth |
| `POST /api/tasks` | ✅ `tasks.create` | ✅ | Ghi log |
| `GET /api/tasks/[id]` | ❌ Không check | ❌ | |
| `PUT /api/tasks/[id]` | ✅ `tasks.update` | ✅ | Ghi log khi status/stage đổi |
| `DELETE /api/tasks/[id]` | ✅ `tasks.delete` | ✅ | Ghi status_history |
| `GET /api/tasks/[id]/activity` | ❌ Không check | ❌ | |
| `POST /api/tasks/[id]/comments` | ✅ Role check | ✅ | Ghi notification |
| `GET /api/tasks/[id]/checklist` | ❌ Không check | ❌ | |
| `POST /api/tasks/[id]/checklist` | ❌ Không check | ✅ | |
| `GET /api/tasks/[id]/approvals` | ❌ Không check | ❌ | |
| `POST /api/tasks/[id]/approvals` | ✅ Role-based | ✅ | Ghi notification |
| `POST /api/tasks/[id]/assets` | ❌ Không check | ✅ | Asset audit log |

#### 3.1.4 Task Form (`components/tasks/task-form.tsx`)

| Field | Required | Input | Ghi chú |
|-------|----------|-------|---------|
| title | ✅ | Input | OK |
| description | ❌ | Textarea | OK |
| project_id | ❌ | Select | OK - optional |
| campaign_id | ❌ | Select | OK - disabled khi chưa chọn project |
| status | ❌ | Select | default = todo |
| priority | ❌ | Select | default = medium |
| due_date | ❌ | Date | OK |
| assignee_ids | ❌ | Popover+Checkbox | OK |
| tags | ❌ | Text | OK |
| **task_type** | ❌ | **THIẾU** | ⚠️ **CRITICAL - Không có selector** |
| **workflow_stage** | ❌ | **THIẾU** | ⚠️ **CRITICAL - Không có selector** |

#### 3.1.5 Task List (`components/tasks/tasks-client.tsx`)

| Filter | Có? | Ghi chú |
|--------|------|---------|
| Search (title) | ✅ | |
| Status | ✅ | |
| Priority | ✅ | |
| Assignee | ❌ | ⚠️ THIẾU |
| Task type | ❌ | ⚠️ THIẾU |
| Overdue | ⚠️ | Chỉ hiển thị count trong stats, không filter được |

#### 3.1.6 Task Detail (`components/tasks/task-detail-client.tsx`)

| Feature | Có? | RBAC? |
|---------|------|-------|
| Checklist | ✅ | ✅ Editor+ hoặc assignee |
| Comments | ✅ | ✅ Editor+ tạo, Admin+ sửa/xóa |
| Assets | ✅ | ✅ |
| Approval | ✅ | ✅ Đầy đủ submit/approve/reject/publish |
| Activity Timeline | ✅ | ❌ |
| AI Assistant | ✅ | ❌ |

---

### 3.2. Projects

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| CRUD API | ✅ | Đầy đủ |
| RBAC check | ⚠️ | GET không check permission riêng |
| Activity log | ⚠️ | Chỉ ghi khi xóa |
| Form | ⚠️ | Thiếu owner/team selection |
| Layout guard | ✅ | `PROJECTS_ACCESS` |
| Editor/Intern tạo project | ❌ | **Thiếu `projects.create` permission** |

---

### 3.3. Campaigns

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| CRUD API | ✅ | |
| RBAC check | ⚠️ | GET không check permission |
| Activity log | ⚠️ | Chỉ ghi khi status đổi |
| Auto-complete trigger | ✅ | Tự động complete khi end_date qua |
| Task relationship | ✅ | Task filter theo campaign_id |
| Layout guard | ✅ | `CAMPAIGNS_ACCESS` |
| Admin có quyền delete | ⚠️ | Không có trong preset, cần explicit grant |

---

### 3.4. Content

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| CRUD API | ✅ | Items, templates, schedules |
| RBAC | ✅ | Có permissions đầy đủ |
| Activity log | ❌ | Không có trong bất kỳ content route nào |
| Notification | ❌ | Không có trong content routes |
| Content generator | ⚠️ | `lib/content/ai/generator.ts` đã bị xóa |
| Workflow flow | ❌ | Không có flow tự động idea→approved→scheduled |
| Task link | ✅ | Migration `024_content_items_task_link.sql` |

---

### 3.5. Media Workflow

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| DB Schema | ⚠️ | Deprecated - đã migrate sang pm_tasks |
| API Routes | ⚠️ | Deprecated - 410 response |
| Components | ✅ | Vẫn active - dùng Task type |
| UI Pipeline | ✅ | Kanban view với `MEDIA_PIPELINE_STAGES` |
| Page + Client | ✅ | Có filter toolbar + view toggle |
| RBAC | ✅ | `MEDIA_WORKFLOW_ACCESS` guard |

---

### 3.6. Calendar

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| Types | ✅ | `lib/workspace/types-calendar.ts` đầy đủ |
| API | ✅ | `/api/calendar` - events + stats |
| Page | ✅ | `/workspace/calendar` - 3 view modes (Month/Week/Agenda) |
| Stats bar | ✅ | 4 KPI metrics |
| Widget | ✅ | `content-calendar-widget.tsx` - dashboard |
| RBAC | ✅ | Phụ thuộc workspace permissions |
| Task relationship | ✅ | `due_date` field |

---

### 3.7. Staff & RBAC

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| RBAC Engine | ✅ | Hoàn chỉnh, có cache, bypass super_admin |
| Roles | ✅ | 5 system roles + custom roles |
| Permissions | ✅ | 40+ permissions theo module |
| Helper functions | ✅ | `hasPermission`, `hasMinimumRoleLevel`, etc. |
| Route guards | ✅ | 14 predefined guards |
| Layout checks | ✅ | Tích hợp trong layouts |
| Auth middleware | ✅ | Check session, protected routes |
| Staff API audit | ⚠️ | Thiếu log khi edit/delete |
| Interns API RBAC | ❌ | Không có RBAC check |

---

### 3.8. Activity & Notifications

| Tiêu chí | Status | Ghi chú |
|----------|--------|---------|
| Activity API | ✅ | Filters, pagination, search |
| Activity export | ✅ | CSV export (admin+ only) |
| Task activity | ✅ | Timeline view với 16 action types |
| Notification service | ✅ | `lib/workspace/notifications.ts` - typed helpers |
| Notification types | ✅ | 11 types + comment types (P6.7) |
| Notification API | ✅ | Mark read, mark all read |
| Activity RBAC | ❌ | Không check permission |

---

## 4. Chỗ nào đang đúng

1. **Task types đầy đủ**: `facebook_post`, `tiktok_video`, `youtube_video`, `seo_article`, `design_image`, `product_photo`, `livestream`, `other`

2. **Workflow stages đầy đủ**: `idea` → `writing` → `internal_review` → `revision` → `approved` → `shooting` → `editing` → `scheduled` → `published`

3. **project_id và campaign_id là optional trong Task type** — Đúng theo yêu cầu nghiệp vụ

4. **RBAC engine hoàn chỉnh** — 5 roles, 40+ permissions, helper functions đầy đủ, route guards predefined

5. **Task approval flow** — Đầy đủ submit_review → approve/reject/request_revision → publish với RBAC theo role

6. **Notification service** — Typed notification helpers, deduplication, activity log trong task operations

7. **Calendar** — 3 view modes, event types đầy đủ, stats bar, relationship với task

8. **Activity log** — Timeline view với 16 action types, infinite load, export CSV

9. **Database schema** — Đầy đủ indexes, triggers, GIN index cho assignee_ids, constraints

10. **Content → Task link** — Migration thêm task_id FK vào content_items

---

## 5. Chỗ nào đang sai / Cần sửa

### CRITICAL

| # | Vấn đề | Module | File |
|---|--------|--------|------|
| C1 | Task form THIẾU `task_type` selector — không cho chọn loại công việc | Task | `components/tasks/task-form.tsx` |
| C2 | Task form THIẾU `workflow_stage` selector — không cho chọn stage | Task | `components/tasks/task-form.tsx` |
| C3 | Editor/Intern KHÔNG thể tạo Project — thiếu `projects.create` permission | RBAC | `lib/rbac/index.ts` |
| C4 | `interns/route.ts` KHÔNG có RBAC check | Staff | `app/api/interns/route.ts` |
| C5 | Activity API KHÔNG có RBAC check | Activity | `app/api/activity/route.ts` |

### HIGH

| # | Vấn đề | Module | File |
|---|--------|--------|------|
| H1 | Task list THIẾU filter theo assignee và task_type | Task | `components/tasks/tasks-client.tsx` |
| H2 | Content API KHÔNG có activity log | Content | `app/api/content/items/route.ts` |
| H3 | Content API KHÔNG có notification | Content | `app/api/content/items/route.ts` |
| H4 | `campaigns.delete` KHÔNG có trong admin preset — admin không xóa được campaign | RBAC | `lib/rbac/index.ts` |
| H5 | `campaigns.create` KHÔNG có trong admin preset — admin không tạo được campaign | RBAC | `lib/rbac/index.ts` |
| H6 | `tasks/[id]/activity` GET KHÔNG có RBAC check | Task | `app/api/tasks/[id]/activity/route.ts` |
| H7 | `tasks/[id]/checklist` POST KHÔNG có RBAC check | Task | `app/api/tasks/[id]/checklist/route.ts` |
| H8 | `tasks/[id]/assets` POST KHÔNG có RBAC check | Task | `app/api/tasks/[id]/assets/route.ts` |

### MEDIUM

| # | Vấn đề | Module | File |
|---|--------|--------|------|
| M1 | Task list THIẾU filter overdue — chỉ hiển thị count, không filter được | Task | `components/tasks/tasks-client.tsx` |
| M2 | Task form `assignee_ids` KHÔNG bắt buộc — nên bắt buộc khi giao việc | Task | `components/tasks/task-form.tsx` |
| M3 | `due_date` KHÔNG bắt buộc — nên bắt buộc khi giao việc | Task | `components/tasks/task-form.tsx` |
| M4 | Staff API THIẾU audit log khi edit/delete | Staff | `app/api/staff/route.ts` |
| M5 | `permissions/route.ts` và `roles/route.ts` THIẾU audit log | Staff | `app/api/permissions/route.ts`, `app/api/roles/route.ts` |
| M6 | `task_type` trong Task interface là optional — nên là required khi tạo task | Task | `lib/workspace/types.ts` |
| M7 | Project API GET KHÔNG check `projects.read` permission | Project | `app/api/projects/route.ts` |
| M8 | Campaign API GET KHÔNG check `campaigns.read` permission | Campaign | `app/api/campaigns/route.ts` |

### LOW

| # | Vấn đề | Module | File |
|---|--------|--------|------|
| L1 | Media Workflow API đã deprecated — nên dọn dẹp code cũ | Media | `app/api/media-workflow/` |
| L2 | `lib/content/ai/generator.ts` đã bị xóa — documentation cần cập nhật | Content | docs |
| L3 | RBAC: `campaigns.delete` cần được thêm vào admin preset | RBAC | `lib/rbac/index.ts` |

---

## 6. Luồng chuẩn đề xuất

### 6.1 Luồng nhanh (Công việc độc lập)

```
Admin tạo Task (không cần Project/Campaign)
  ↓ task_type = "facebook_post"
  ↓ assignee_ids = [intern_1]
  ↓ due_date = ngày cụ thể (bắt buộc)
  ↓ priority = high
  ↓ description = yêu cầu cụ thể
  ↓
Intern nhận việc
  ↓ cập nhật checklist
  ↓ upload draft asset
  ↓ gửi duyệt (submit_review)
  ↓
Editor review
  ↓ approve / reject / request_revision
  ↓
Admin xuất bản (publish) hoặc schedule
  ↓
Done / Published
```

### 6.2 Luồng theo chiến dịch

```
Admin tạo Project
  ↓
Admin tạo Campaign (thuộc Project)
  ↓
Campaign có deadline, budget, target_metrics
  ↓
Admin tạo Tasks (thuộc Campaign)
  ↓ mỗi task có campaign_id
  ↓ gán assignee_ids
  ↓
Intern làm → Editor duyệt → Admin xuất bản
  ↓
Campaign stats tự động tổng hợp từ tasks
```

### 6.3 Luồng theo nội dung

```
Task (task_type = "facebook_post")
  ↓
Workflow stage: writing
  ↓ Intern viết content
  ↓
Workflow stage: internal_review
  ↓ Intern gửi duyệt
  ↓
Workflow stage: approved
  ↓ Editor/Admin duyệt
  ↓
Workflow stage: scheduled
  ↓ Schedule ngày đăng
  ↓
Workflow stage: published
  ↓ Auto-set published_at, published_url
  ↓
Content Item được tạo/updated từ task
```

---

## 7. Quy tắc dữ liệu đề xuất

### 7.1 Task

| Field | Quy tắc | Hiện tại |
|-------|---------|----------|
| `id` | UUID, PK | ✅ OK |
| `project_id` | **Optional** FK → pm_projects | ✅ OK (optional) |
| `campaign_id` | **Optional** FK → pm_campaigns | ✅ OK (optional) |
| `title` | Required, max 500 chars | ✅ OK |
| `description` | Optional, TEXT | ✅ OK |
| `status` | Required, enum TaskStatus | ✅ OK |
| `priority` | Required, default = "medium" | ✅ OK |
| `workflow_stage` | Optional, enum WorkflowStage | ✅ OK |
| `task_type` | **Nên required** khi task_type != null | ⚠️ Type là optional |
| `assignee_ids` | **Required** khi status != "backlog" | ⚠️ Default rỗng, không validate |
| `reporter_id` | Optional, UUID → users | ✅ OK |
| `start_date` | Optional | ✅ OK |
| `due_date` | **Nên required** khi assignee_ids not empty | ⚠️ Optional |
| `published_at` | Optional, set auto khi stage = published | ✅ OK |
| `published_url` | Optional | ✅ OK |
| `tags` | Optional, TEXT[] | ✅ OK |
| `progress` | 0-100, auto update từ checklist | ✅ OK |

### 7.2 Validation Rules đề xuất (Zod schemas)

```typescript
// createTaskSchema - bổ sung rules:
const createTaskSchema = z.object({
  // ... existing fields
  task_type: z.enum(["facebook_post", "tiktok_video", ...]).optional(),
  assignee_ids: z.array(z.string().uuid()).min(0), // Nên: .min(1) khi status != backlog
  due_date: z.string().optional(), // Nên: .refine() khi assignee_ids not empty
});

// Nên thêm validation:
// If assignee_ids is not empty and status is not backlog → due_date is required
```

---

## 8. RBAC đề xuất

### 8.1 Role matrix cho Task operations

| Operation | Super Admin | Admin | Editor | Intern | Viewer |
|-----------|-------------|-------|--------|--------|--------|
| Xem task | ✅ | ✅ | ✅ | ✅ (task được gán) | ✅ (readonly) |
| Tạo task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sửa task (task của mình) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Sửa task (task người khác) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xóa task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gán người | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit review | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ | ❌ |
| Publish | ✅ | ❌ | ❌ | ❌ | ❌ |
| Comment | ✅ | ✅ | ✅ | ✅ | ❌ |

### 8.2 RBAC fix cần thiết

```typescript
// lib/rbac/index.ts - bổ sung:

// ADMIN_OPERATIONAL_PERMISSIONS - thêm:
"projects.create",  // Hiện tại thiếu
"campaigns.create",  // Hiện tại thiếu
"campaigns.delete",  // Hiện tại thiếu

// INTERNS_DEFAULT_PERMISSIONS - thêm:
"tasks.create",  // Nếu intern được tạo task độc lập

// API routes - thêm RBAC checks:
POST /api/tasks/[id]/checklist    → tasks.update
POST /api/tasks/[id]/assets       → assets.create
GET  /api/tasks/[id]/activity     → tasks.read
POST /api/interns                 → interns.manage
GET  /api/activity                → permissions.read
```

---

## 9. UI cần cải thiện

### 9.1 Task Form (`components/tasks/task-form.tsx`)

**Cần thêm:**

1. **Task Type selector** — Dropdown chọn loại công việc
   - facebook_post, tiktok_video, youtube_video, seo_article, design_image, product_photo, livestream, other
   - Icon kèm theo mỗi loại
   - Help text: "Chọn loại công việc để hệ thống gợi ý workflow phù hợp"

2. **Workflow Stage selector** — Dropdown hoặc step indicator
   -idea → writing → internal_review → revision → approved → shooting → editing → scheduled → published
   - Chỉ hiển thị khi task_type liên quan đến content/media

3. **Assignee validation** — Khi giao việc (status != backlog):
   - Nên hiển thị warning nếu chưa chọn assignee
   - Có thể override được nhưng phải confirm

4. **Due date validation** — Khi giao việc:
   - Nên bắt buộc nếu assignee_ids not empty
   - Hiển thị warning nếu deadline < hôm nay

5. **Quick templates** — Preset buttons:
   - "Facebook post 1 hình" → prefill task_type = facebook_post
   - "Kịch bản video 1 phút" → prefill task_type = video_script
   - "Thiết kế banner" → prefill task_type = design_image

### 9.2 Task List (`components/tasks/tasks-client.tsx`)

**Cần thêm filters:**

1. **Assignee filter** — Multi-select dropdown với avatar
2. **Task type filter** — Multi-select với icons
3. **Overdue filter** — Toggle: "Chỉ hiển thị quá hạn"
4. **Workflow stage filter** — Multi-select

**Nâng cấp UI:**
- Thêm Kanban columns cho `in_progress` → `review` → `done`
- Drag & drop task giữa columns (stretch goal)
- Bulk actions: gán, đổi status, xóa

### 9.3 Task Detail (`components/tasks/task-detail-client.tsx`)

**Đã OK** — Có đầy đủ:
- Checklist với progress bar
- Comment với mention support
- Asset upload/download
- Approval flow với dialogs
- Activity timeline

**Cần bổ sung:**
- Hiển thị `task_type` badge ở header
- Hiển thị `workflow_stage` indicator
- Deadline countdown nếu sắp đến hạn

### 9.4 Admin Dashboard (`components/dashboard/`)

**Widget mới cần thêm:**

1. **"Ai đang làm gì"** — Top 5 nhân viên active với task count
2. **"Việc trễ"** — Tasks overdue, sort theo deadline
3. **"Việc chờ duyệt"** — Tasks in review, filter by campaign/project
4. **"Việc đã đăng tuần này"** — Tasks published với published_url

**Hiện tại có:**
- `workspace-stats-widget.tsx` — ✅ Có KPI
- `media-stats-widget.tsx` — ✅ Có media stats
- `team-performance-widget.tsx` — ✅ Có team stats
- `approval-metrics-widget.tsx` — ✅ Có approval stats
- `notification-alert-widget.tsx` — ✅ Có alerts
- `campaign-alert-widget.tsx` — ✅ Có campaign alerts

**Cần kiểm tra xem có widget "việc trễ" và "chờ duyệt" riêng không.**

---

## 10. Đề xuất sửa theo thứ tự ưu tiên

### Phase 1: Core Task Fix (1-2 ngày)

1. **Thêm task_type selector vào TaskForm** — CRITICAL
   - File: `components/tasks/task-form.tsx`
   - Thêm state `task_type`, dropdown selector, validation

2. **Thêm workflow_stage selector vào TaskForm** — CRITICAL
   - File: `components/tasks/task-form.tsx`
   - Thêm state `workflow_stage`, dropdown hoặc step indicator

3. **Fix RBAC permissions** — CRITICAL
   - File: `lib/rbac/index.ts`
   - Thêm `projects.create` vào ADMIN_OPERATIONAL_PERMISSIONS
   - Thêm `campaigns.create`, `campaigns.delete` vào ADMIN_OPERATIONAL_PERMISSIONS

4. **Thêm RBAC checks vào các Task API routes** — HIGH
   - `app/api/tasks/[id]/activity/route.ts` — thêm `tasks.read`
   - `app/api/tasks/[id]/checklist/route.ts` — thêm `tasks.update`
   - `app/api/tasks/[id]/assets/route.ts` — thêm `assets.create`

5. **Thêm RBAC check vào interns API** — CRITICAL
   - File: `app/api/interns/route.ts`
   - Thêm `requirePermission("interns.manage")` cho POST

6. **Thêm RBAC check vào activity API** — HIGH
   - File: `app/api/activity/route.ts`
   - Thêm permission check

### Phase 2: UI Improvements (2-3 ngày)

7. **Thêm filters vào Task List** — HIGH
   - File: `components/tasks/tasks-client.tsx`
   - Thêm assignee filter, task_type filter, overdue filter

8. **Thêm validation cho assignee_ids và due_date** — MEDIUM
   - File: `components/tasks/task-form.tsx` + API validation
   - Khi giao việc (status != backlog): assignee_ids required, due_date recommended

9. **Cải thiện Task Detail UI** — MEDIUM
   - File: `components/tasks/task-detail-client.tsx`
   - Thêm task_type badge, workflow_stage indicator, deadline countdown

10. **Dashboard widgets bổ sung** — MEDIUM
    - Kiểm tra `components/dashboard/` có widget "việc trễ" và "chờ duyệt" chưa
    - Nếu chưa, tạo mới

### Phase 3: Data & Content (2 ngày)

11. **Thêm activity log vào Content API** — MEDIUM
    - File: `app/api/content/items/route.ts`
    - Ghi log khi tạo, sửa, xóa content items

12. **Thêm notification vào Content API** — MEDIUM
    - File: `app/api/content/items/route.ts`
    - Notify khi content được tạo/duyệt/đăng

13. **Sửa validation trong Task Zod schema** — MEDIUM
    - File: Validation schemas (tìm trong lib/)
    - Thêm rule: assignee_ids required khi status != backlog
    - Thêm rule: due_date required khi assignee_ids not empty

14. **Sửa task_type thành required trong types** — LOW
    - File: `lib/workspace/types.ts`
    - Nhưng cần discuss: có nên required cho mọi task không?

### Phase 4: Cleanup (1-2 ngày)

15. **Dọn dẹp Media Workflow deprecated code** — LOW
    - File: `app/api/media-workflow/`
    - Giữ lại UI, xóa hoặc redirect deprecated API routes

16. **Thêm audit log cho Staff API** — MEDIUM
    - File: `app/api/staff/route.ts`
    - Ghi log khi edit/delete staff

17. **Thêm audit log cho permissions/roles API** — LOW
    - File: `app/api/permissions/route.ts`, `app/api/roles/route.ts`

---

## 11. Danh sách file cần sửa ở phase tiếp theo

### Files sửa đổi

| # | File | Action | Priority |
|---|------|--------|----------|
| 1 | `components/tasks/task-form.tsx` | Sửa - thêm task_type, workflow_stage selectors | CRITICAL |
| 2 | `lib/rbac/index.ts` | Sửa - thêm permissions | CRITICAL |
| 3 | `app/api/interns/route.ts` | Sửa - thêm RBAC check | CRITICAL |
| 4 | `app/api/activity/route.ts` | Sửa - thêm RBAC check | HIGH |
| 5 | `app/api/tasks/[id]/activity/route.ts` | Sửa - thêm RBAC check | HIGH |
| 6 | `app/api/tasks/[id]/checklist/route.ts` | Sửa - thêm RBAC check | HIGH |
| 7 | `app/api/tasks/[id]/assets/route.ts` | Sửa - thêm RBAC check | HIGH |
| 8 | `components/tasks/tasks-client.tsx` | Sửa - thêm filters | HIGH |
| 9 | `components/tasks/task-detail-client.tsx` | Sửa - cải thiện UI | MEDIUM |
| 10 | `app/api/content/items/route.ts` | Sửa - thêm activity log + notification | MEDIUM |
| 11 | `app/api/staff/route.ts` | Sửa - thêm audit log | MEDIUM |
| 12 | `app/api/projects/route.ts` | Sửa - thêm RBAC check cho GET | MEDIUM |
| 13 | `app/api/campaigns/route.ts` | Sửa - thêm RBAC check cho GET | MEDIUM |

### Files tạo mới

| # | File | Mô tả | Priority |
|---|------|--------|----------|
| 1 | `components/dashboard/task-alerts-widget.tsx` | Widget "việc trễ" + "chờ duyệt" | MEDIUM |
| 2 | `components/dashboard/team-activity-widget.tsx` | Widget "ai đang làm gì" | MEDIUM |
| 3 | `docs/reports/workspace-workflow-fix-phase1-plan.md` | Plan chi tiết Phase 1 | HIGH |

### Files xóa/dọn dẹp

| # | File | Lý do | Priority |
|---|------|--------|----------|
| 1 | `app/api/media-workflow/route.ts` | Deprecated | LOW |
| 2 | `app/api/media-workflow/[id]/route.ts` | Deprecated | LOW |

---

## Phụ lục

### A. TaskStatus enum

```typescript
"backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled"
```

### B. WorkflowStage enum

```typescript
"idea" | "writing" | "internal_review" | "revision" | "approved" | "shooting" | "editing" | "scheduled" | "published"
```

### C. TaskType enum

```typescript
"facebook_post" | "tiktok_video" | "youtube_video" | "seo_article" | "design_image" | "product_photo" | "livestream" | "other"
```

### D. Roles

```typescript
"super_admin" | "admin" | "editor" | "intern" | "viewer"
```

### E. Các index đã có

- `idx_pm_tasks_project` ON project_id
- `idx_pm_tasks_status` ON status
- `idx_pm_tasks_priority` ON priority
- `idx_pm_tasks_assignee` ON assignee_ids (GIN)
- `idx_pm_tasks_due_date` ON due_date
- `idx_pm_tasks_stage` ON stage

---

**Kết luận:** Hệ thống workspace hiện tại đã có nền tảng tốt cho việc giao việc admin-nhân sự. Luồng Task cơ bản đúng nhưng thiếu **task_type selector** và **workflow_stage selector** trong form, thiếu **RBAC checks** ở nhiều API routes, và thiếu **filters** trong task list. Phase 1 cần tập trung vào việc fix những vấn đề này trước khi mở rộng tính năng.
