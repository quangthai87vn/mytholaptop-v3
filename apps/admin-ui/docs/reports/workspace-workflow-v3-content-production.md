# Workspace Workflow V3: Content Production Workflow

**Ngày:** 29/05/2026  
**Người thực hiện:** Agent Implementation  
**Trạng thái:** Hoàn thành Phase 1 — Content Production Workflow

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Luồng nghiệp vụ chuẩn](#2-luồng-nghiệp-vụ-chuẩn)
3. [File đã tạo / sửa](#3-file-đã-tạo--sửa)
4. [Yêu cầu 1 — Task Form](#4-yêu-cầu-1--task-form)
5. [Yêu cầu 2 — Task Detail](#5-yêu-cầu-2--task-detail)
6. [Yêu cầu 3 — Dashboard](#6-yêu-cầu-3--dashboard)
7. [Yêu cầu 4 — Content Link](#7-yêu-cầu-4--content-link)
8. [Yêu cầu 5 — Notifications](#8-yêu-cầu-5--notifications)
9. [Yêu cầu 6 — Activity Log](#9-yêu-cầu-6--activity-log)
10. [RBAC Matrix](#10-rbac-matrix)
11. [Database Changes](#11-database-changes)
12. [Những gì đã đúng từ trước](#12-những-gì-đã-đúng-từ-trước)
13. [Chưa làm / Phase tiếp theo](#13-chưa-làm--phase-tiếp-theo)

---

## 1. Tổng quan

Workflow V3 hoàn thiện luồng **Content Production** cho đội ngũ Content/Media:
- Admin giao việc → Nhân sự thực hiện → Cập nhật tiến độ → Gửi duyệt → Duyệt → Đăng
- **Không tạo module mới** — chỉ bổ sung fields, components, notifications, và integrations

---

## 2. Luồng nghiệp vụ chuẩn

### Luồng nhanh (Công việc độc lập)

```
Admin tạo Task
  → task_type = "facebook_post" (bắt buộc)
  → workflow_stage = "writing"
  → assignee_ids = [intern_1]
  → due_date = ngày cụ thể
  → priority = high
  → description = yêu cầu cụ thể
  → NOTIFICATION: "Bạn được giao việc mới" → intern_1

Intern nhận việc
  → Cập nhật checklist
  → Upload draft asset
  → Cập nhật workflow_stage = "internal_review"
  → Gửi duyệt (submit_review)
  → NOTIFICATION: "Cần duyệt nội dung" → admin

Editor/Admin duyệt
  → APPROVE: workflow_stage = "approved"
    → NOTIFICATION: "Nội dung đã được duyệt" → intern_1
  → REJECT: workflow_stage = "revision"
    → NOTIFICATION: "Yêu cầu chỉnh sửa" → intern_1

Admin xuất bản
  → workflow_stage = "published"
  → published_at = NOW()
  → activity log: "xuất bản"
  → task status = done
```

### Luồng theo chiến dịch

```
Project → Campaign → Tasks → Content → Workflow → Calendar
```

- Project/Campaign **optional** với Task
- Campaign có deadline, budget, target_metrics
- Tasks thuộc Campaign → Campaign stats tự động tổng hợp

### Luồng theo nội dung

```
Task (task_type = content)
  → Idea → Writing → Internal Review → Approved → Scheduled → Published
  → Content Item được tạo từ task
  → Content Item hiển thị task cha
  → Task hiển thị Content Item liên kết
```

---

## 3. File đã tạo / sửa

### File tạo mới

| File | Mô tả |
|------|--------|
| `components/tasks/task-content-section.tsx` | Tab Nội dung trong Task Detail, tạo/link content items |

### File sửa đổi

| File | Thay đổi |
|------|---------|
| `components/tasks/task-form.tsx` | Thêm `task_type` selector + `workflow_stage` selector |
| `components/tasks/task-detail-client.tsx` | Thêm tab Nội dung, thêm task_type + workflow_stage badges trong header |
| `lib/workspace/types.ts` | Thêm `WORKFLOW_STAGE_CONFIG` (array có color) |
| `lib/content/types.ts` | Thêm `task_id` vào `ContentItem` + `ContentItemInput` |
| `lib/content/db/content.ts` | Thêm `task_id` filter vào `getContentItems`, thêm `task_id` vào `createContentItem` |
| `app/api/content/items/route.ts` | Thêm `task_id` filter param (GET), thêm `task_id` khi tạo (POST) |
| `app/api/tasks/route.ts` | Thêm notification khi giao việc (notifyTaskAssigned) |
| `app/api/tasks/[id]/route.ts` | Thêm notification khi thêm assignee mới |

---

## 4. Yêu cầu 1 — Task Form

### Đã hoàn thành

**Task Type selector** — đã thêm vào form (giữa hàng Status/Priority và Assignees):

```
Row: [Status] [Priority] [Due Date] [Task Type]
```

**Options cho Task Type:**
| Value | Label |
|-------|-------|
| `facebook_post` | Bài Facebook |
| `seo_article` | Bài SEO |
| `tiktok_video` | Video TikTok |
| `youtube_video` | Video YouTube |
| `design_image` | Thiết kế hình ảnh |
| `product_photo` | Ảnh sản phẩm |
| `livestream` | Livestream |
| `other` | Khác |

**Workflow Stage selector** — đã thêm vào form (hàng riêng bên dưới):

```
[ Workflow Stage: Select... ]
```

Hiển thị với color dot + label từ `WORKFLOW_STAGE_CONFIG`:
- Idea, Viết nội dung, Review nội bộ, Chỉnh sửa, Đã duyệt, Quay, Edit, Đã lên lịch, Đã đăng

**Validation:**
- API validation schema đã có `task_type` và `workflow_stage`
- Backend nhận và lưu đúng vào DB

**Chưa làm:**
- Quick templates (preset buttons) — Phase tiếp theo
- Validation: `assignee_ids` required khi `status != backlog` — Phase tiếp theo

---

## 5. Yêu cầu 2 — Task Detail

### Đã hoàn thành

**Header** — thêm badges:
- Task type badge (màu xanh dương)
- Workflow stage badge (màu tím)

**Tab Chi tiết** — thêm fields:
- Loại công việc (task_type với label)
- Giai đoạn (workflow_stage với label)

**Tab Phê duyệt** — đã có từ trước:
| Nút | Role | Stage |
|-----|------|-------|
| Gửi duyệt | editor+ | writing |
| Duyệt | admin+ | internal_review |
| Yêu cầu chỉnh sửa | admin+ | internal_review |
| Từ chối | admin+ | internal_review |
| Xuất bản | **super_admin only** | approved |

**RBAC đã đúng:**

```typescript
canSubmitReview: role !== "viewer"  // editor, admin, super_admin
canApprove: role === "admin" || role === "super_admin"
canReject: role === "admin" || role === "super_admin"
canPublish: role === "super_admin"  // CHỈ super_admin
```

**Checklist, Comments, Assets, Activity** — đã có từ trước.

---

## 6. Yêu cầu 3 — Dashboard

### Đã có sẵn

| Widget | File | Mô tả |
|--------|------|--------|
| Chờ duyệt | `content-pipeline-widget.tsx` | `approvedNotPublished` count |
| Đang thực hiện | `content-pipeline-widget.tsx` | `tasksInProgress` count |
| Quá hạn | `content-pipeline-widget.tsx` + `deadline-alert-widget.tsx` | `tasksOverdue` + overdue task list |
| Đã xuất bản hôm nay | `publish-metrics-widget.tsx` | `publishedThisWeek` |
| Top nhân sự | `workspace/page.tsx` | Intern ranking top 3 |

**Workspace page** (`app/(admin)/workspace/page.tsx`) bao gồm:
- `WorkspaceStatsWidget` — 6 stats: active projects, due this week, overdue tasks, overdue campaigns, published this month, total interns
- `ContentPipelineWidget` — 4 KPIs: in progress, chờ đăng, đã đăng tháng này, quá hạn
- `ApprovalMetricsWidget` — Approval funnel: đã gửi, đã duyệt, bị từ chối, tỷ lệ
- `PublishMetricsWidget` — Publish theo platform + weekly/monthly
- `DeadlineAlertWidget` — Tasks sắp đến hạn / quá hạn
- `TeamActivityWidget` — Hoạt động gần đây
- `CampaignAlertWidget` — Campaigns quá hạn

**Chưa làm:**
- Widget "AI đang làm gì" (top 5 nhân viên active) — đã có skeleton trong code
- KPI chi tiết per-user (tasks count, overdue rate, completion rate) — đã có type trong `types-kpi.ts`

---

## 7. Yêu cầu 4 — Content Link

### Đã hoàn thành

**Database:**
- Migration `024_content_items_task_link.sql` đã thêm `task_id` FK vào `content_items`

**TypeScript:**
- `ContentItem.task_id: string | null`
- `ContentItemInput.task_id?: string`

**DB Layer:**
- `getContentItems({ task_id })` — filter theo task_id
- `createContentItem({ task_id })` — insert task_id

**API:**
- GET `/api/content/items?task_id=xxx` — lọc content theo task
- POST `/api/content/items` — tạo content với task_id

**UI — Task Content Section:**
- Tab mới trong Task Detail (tab thứ 3 sau Checklist)
- Hiển thị danh sách content items liên kết
- Trạng thái: Bản nháp / Đã đăng / Đã lên lịch / Lưu trữ
- Nút tạo content mới (editor+)
- Nút xem link đã đăng (Globe icon)

---

## 8. Yêu cầu 5 — Notifications

### Đã có sẵn

Notification service (`lib/workspace/notifications.ts`) đã đầy đủ:

| Trigger | Notification | Được gọi từ |
|---------|-------------|------------|
| Giao việc (tạo task) | `notifyTaskAssigned` | `app/api/tasks/route.ts` ← **ĐÃ THÊM** |
| Giao việc (thêm assignee) | `notifyTaskAssigned` | `app/api/tasks/[id]/route.ts` ← **ĐÃ THÊM** |
| Gửi duyệt | `notifyTaskSubmitReview` | `app/api/tasks/[id]/approvals/route.ts` |
| Duyệt | `notifyTaskApproved` | `app/api/tasks/[id]/approvals/route.ts` |
| Từ chối/Yêu cầu sửa | `notifyTaskRejected` | `app/api/tasks/[id]/approvals/route.ts` |
| Bình luận | `notifyTaskComment` | `app/api/tasks/[id]/comments/route.ts` |
| Mention | `notifyTaskCommentMention` | `app/api/tasks/[id]/comments/route.ts` |

### Còn thiếu

- **Đổi status** (không phải approval action) → không có notification riêng. Tuy nhiên activity log ghi lại rồi.
- **Notification khi task quá hạn** — `notifyTaskOverdue` có sẵn trong service nhưng cần cron job gọi (chưa implement cron).

---

## 9. Yêu cầu 6 — Activity Log

### Đã có sẵn

**Bảng `pm_task_activities`** ghi đầy đủ:

| Action | Trigger | Ghi vào |
|--------|---------|---------|
| `created` | Tạo task | `createTask()` |
| `status_changed` | Đổi status task | `updateTask()` |
| `stage_changed` | Đổi workflow_stage | `updateTask()` |
| `gửi duyệt` | submit_review | `performApprovalAction()` |
| `duyệt` | approve | `performApprovalAction()` |
| `từ chối` | reject | `performApprovalAction()` |
| `yêu cầu chỉnh sửa` | request_revision | `performApprovalAction()` |
| `xuất bản` | publish | `performApprovalAction()` |
| `comment` | Thêm comment | `logTaskComment()` |

**Component** (`task-activity-section.tsx`):
- Timeline view với 16 action types
- Infinite load
- Actor avatar + name
- Field changed + old/new values

---

## 10. RBAC Matrix

### Content Production Workflow

| Operation | Super Admin | Admin | Editor | Intern | Viewer |
|-----------|-------------|-------|--------|--------|--------|
| Tạo task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Sửa task (task của mình) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Sửa task (task người khác) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Gán assignee | ✅ | ✅ | ✅ | ❌ | ❌ |
| Submit review | ✅ | ✅ | ✅ | ✅ | ❌ |
| Duyệt/Từ chối | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xuất bản | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tạo content item | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xóa task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comment | ✅ | ✅ | ✅ | ✅ | ❌ |
| Xem task | ✅ | ✅ | ✅ | ✅ (task được gán) | ✅ |

---

## 11. Database Changes

### Đã có từ trước (Migration 024)

```sql
ALTER TABLE content_items ADD COLUMN task_id UUID;
ALTER TABLE content_items ADD CONSTRAINT content_items_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_content_items_task_id ON content_items(task_id);
```

### Bảng `pm_tasks` (đã có)

| Column | Type | Ghi chú |
|--------|------|---------|
| `id` | UUID | PK |
| `project_id` | UUID | FK → pm_projects (optional) |
| `campaign_id` | UUID | FK → pm_campaigns (optional) |
| `title` | VARCHAR(500) | NOT NULL |
| `task_type` | VARCHAR(50) | optional |
| `stage` | VARCHAR(50) | workflow_stage |
| `status` | VARCHAR(50) | NOT NULL |
| `priority` | VARCHAR(20) | NOT NULL |
| `assignee_ids` | UUID[] | GIN index |
| `due_date` | DATE | |
| `published_at` | TIMESTAMP | |
| `published_url` | VARCHAR(1000) | |

---

## 12. Những gì đã đúng từ trước

1. **Task type enum** — 8 loại đầy đủ
2. **Workflow stage enum** — 9 stages cho content/media
3. **Approval API** — RBAC đầy đủ: submit → approve/reject → publish
4. **Notification service** — Typed helpers với deduplication
5. **Activity log** — Đầy đủ tất cả action types
6. **Dashboard widgets** — Content pipeline, approval metrics, publish metrics
7. **RBAC engine** — 5 roles, 40+ permissions, predefined guards
8. **Validation schema** — Zod schemas với task_type + workflow_stage
9. **Calendar** — 3 view modes, event types đầy đủ

---

## 13. Chưa làm / Phase tiếp theo

### Priority 1 — Giao diện

1. **Task list filters** — Thêm filter theo assignee và task_type vào `tasks-client.tsx`
2. **Quick templates** — Preset buttons trong TaskForm cho quick task creation
3. **Validation nâng cao** — Assignee required khi status != backlog, due_date required khi có assignee

### Priority 2 — KPI Dashboard

4. **Widget "AI đang làm gì"** — Top 5 nhân viên active với task count
5. **KPI per-user detailed view** — Trang chi tiết KPI cho từng nhân viên
6. **Campaign progress bar** — Hiển thị % hoàn thành campaign

### Priority 3 — Cron Jobs

7. **Overdue notification cron** — Chạy mỗi ngày, gửi notification cho task quá hạn
8. **Due soon notification cron** — Chạy mỗi ngày, gửi reminder trước 3 ngày

### Priority 4 — Nâng cao

9. **Drag & drop Kanban** — Di chuyển task giữa columns trong Task list
10. **Bulk actions** — Gán/đổi status/xóa nhiều task cùng lúc
11. **Content auto-create from task** — Khi task có workflow_stage = approved → tự động tạo ContentItem
12. **Media upload integration** — Tích hợp upload lên S3/Cloudinary

---

## File tổng hợp

| File | Mô tả |
|------|--------|
| `components/tasks/task-form.tsx` | Form tạo/sửa task — V3: task_type + workflow_stage |
| `components/tasks/task-detail-client.tsx` | Task detail — V3: content tab, badges |
| `components/tasks/task-content-section.tsx` | **MỚI** — Tab nội dung trong task detail |
| `lib/workspace/types.ts` | Types + WORKFLOW_STAGE_CONFIG |
| `lib/content/types.ts` | ContentItem + task_id field |
| `lib/content/db/content.ts` | DB layer + task_id support |
| `app/api/content/items/route.ts` | API content items + task_id |
| `app/api/tasks/route.ts` | POST: thêm notifyTaskAssigned |
| `app/api/tasks/[id]/route.ts` | PUT: thêm notifyTaskAssigned khi thêm assignee |
| `app/api/tasks/[id]/approvals/route.ts` | Đã có đầy đủ notifications |
| `lib/workspace/notifications.ts` | Notification service — đầy đủ |
| `lib/workspace/db/index.ts` | Activity log — đầy đủ |
| `lib/rbac/index.ts` | RBAC engine — đầy đủ |
| `docs/reports/workspace-workflow-audit-v2-admin-assign-content.md` | Audit report (V2) |
