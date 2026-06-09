# Phase 9: Workspace Task & Content Workflow — Completion Report

**Phase:** P9 — Workspace Content & Task Workflow
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## Tổng quan

Phase 9 đã triển khai hệ thống **Task Checklist** và **Per-Task Activity Timeline**, đồng thời:
- Cải thiện bảo mật API (auth trên GET routes)
- Sửa các lỗi runtime trong CommentSection và ApprovalSection
- Tái cấu trúc layout tab của Task Detail

---

## Các bước đã thực hiện

### Phase 9.1 — Báo cáo kiến trúc (✅)

**Đã tạo:**
- `docs/reports/p9-workspace-content-workflow-plan.md` — Kế hoạch kiến trúc đầy đủ với:
  - Gap analysis (checklist, activity timeline, broken ReplyForm, campaign detail, auth)
  - RBAC matrix cho Intern/Editor/Viewer/Admin/Super Admin
  - Thứ tự thực hiện 8 phases
  - Risk assessment
- `docs/reports/p9-db-schema.md` — Schema chi tiết cho checklist + content task link

### Phase 9.2 — Database Migrations (✅)

**Đã tạo và chạy:**
- `sql/workspace/023_task_checklist.sql` — Tạo bảng `pm_task_checklist_items`
  - id (UUID, PK), task_id (FK → pm_tasks, CASCADE), title (VARCHAR 500), is_completed, completed_by, completed_at, sort_order, created_by, created_at, updated_at
  - Indexes: `idx_checklist_task_id`, `idx_checklist_completed`, `idx_checklist_sort`
  - Trigger: auto-update `updated_at`
  - Verify: table exists after migration
- `sql/workspace/024_content_items_task_link.sql` — Thêm cột `task_id` vào `content_items`
  - Nullable FK → pm_tasks(id) ON DELETE SET NULL
  - Index: `idx_content_items_task_id`

**Kết quả:**
```
✅ Migration 023 completed — pm_task_checklist_items created
✅ Migration 024 completed — content_items.task_id added
```

### Phase 9.3 — TypeScript Types + DB Functions (✅)

**Đã thêm vào `lib/workspace/types.ts`:**
- `TaskChecklistItem` — interface cho checklist item
- `TaskChecklistProgress` — { completed, total, percentage }
- `ContentWorkflowStage` — "draft" | "review" | "approved" | "scheduled" | "published"
- `TaskActivityEntry` — interface cho activity timeline entry
- `TaskActivityAction` — union type cho 18 loại action
- `PaginatedResult<T>` — generic pagination wrapper
- Extended `Task` interface với `checklist_items` và `checklist_progress`

**Đã thêm vào `lib/workspace/db/index.ts`:**
- `getTaskChecklist(taskId)` — lấy checklist items theo sort_order
- `createChecklistItem(taskId, userId, input)` — tạo item, auto-assign sort_order
- `updateChecklistItem(itemId, userId, input)` — update title/completion/order
- `deleteChecklistItem(itemId)` — xóa item
- `reorderChecklistItems(taskId, orderedItemIds)` — reorder với transaction
- `getTaskChecklistProgress(taskId)` — computed progress
- `getTaskActivityEntries(taskId, page, pageSize)` — paginated activity với actor_name JOIN
- `logTaskActivity(taskId, actorId, action, details)` — ghi activity log
- `deriveContentWorkflowStage(task)` — map status+stage → workflow stage label

### Phase 9.4 — API Routes (✅)

**Đã tạo:**
- `GET/POST /api/tasks/[id]/checklist` — list và create checklist items
- `PUT/DELETE /api/tasks/[id]/checklist/[itemId]` — update và delete items
- `GET /api/tasks/[id]/activity` — paginated per-task activity timeline

**Đặc điểm:**
- Auth: `requireAdminAuth()` trên tất cả routes
- CSRF + Rate limit trên POST/PUT/DELETE
- Zod validation cho input
- Activity logging khi checklist thay đổi
- Trả về `{ data, progress, total }` cho checklist, paginated cho activity

### Phase 9.5 — Bảo mật API — Auth trên GET Routes (✅)

**Đã thêm `requireAdminAuth()` vào 12 GET routes:**

| Route | Trước | Sau |
|-------|--------|-----|
| `GET /api/tasks` | No auth | ✅ Auth |
| `GET /api/tasks/[id]` | No auth | ✅ Auth |
| `GET /api/projects` | No auth | ✅ Auth |
| `GET /api/projects/[id]` | No auth | ✅ Auth |
| `GET /api/campaigns` | No auth | ✅ Auth |
| `GET /api/campaigns/[id]` | No auth | ✅ Auth |
| `GET /api/content/items` | No auth | ✅ Auth |
| `GET /api/content/items/[id]` | No auth | ✅ Auth |
| `GET /api/content/templates` | No auth | ✅ Auth |
| `GET /api/content/schedules` | No auth | ✅ Auth |
| `GET /api/content/stats` | No auth | ✅ Auth |
| `GET /api/tasks/[id]/checklist` | ✅ New, has auth | — |
| `GET /api/tasks/[id]/activity` | ✅ New, has auth | — |

### Phase 9.6 — Checklist UI (✅)

**Đã tạo `components/tasks/checklist-section.tsx`:**
- Notion-style checklist với checkbox icon
- Add item với Input + Button
- Toggle completion với loading state
- Delete item với confirm dialog
- Progress bar với percentage
- "Tất cả mục đã hoàn thành" state
- RBAC: `canManage` prop — intern có thể manage checklist trên task của mình

**Đã thêm vào `KanbanCard`:**
- Checklist progress bar (green khi 100%)
- Hiển thị `X/Y` format

**Đã thêm vào `TaskDetailClient`:**
- Tab "Checklist" mới (grid-cols-7 tabs)
- Checklist tab với RBAC: intern chỉ manage checklist trên task được gán

### Phase 9.7 — Activity Timeline UI (✅)

**Đã tạo `components/tasks/task-activity-section.tsx`:**
- Timeline display với vertical line
- Avatar initials với color based on name
- Action labels: đã tạo, đã cập nhật, checklist_added, checklist_completed, etc.
- Action badges với color coding theo loại action
- Pagination (Load more)
- Empty state
- Skeleton loading

**Đã thêm tab "Hoạt động" vào TaskDetailClient (7-tab layout)**

### Phase 9.8 — Sửa lỗi Components (✅)

**ApprovalSection:**
- ✅ Tách `rejectReason` và `revisionNote` thành 2 state riêng biệt (trước đây dùng chung `rejectReason`)
- ✅ Revision dialog giờ dùng `revisionNote` riêng

**CommentSection:**
- ✅ Sửa `ReplyForm` — trước đây chỉ có nút Cancel, giờ có đầy đủ textarea + submit + cancel
- ✅ Thêm `handleSubmitReply` — gọi API POST /tasks/[id]/comments với parentCommentId
- ✅ Sửa `canAuthor` — trước đây chỉ admin mới edit comment, giờ author có thể edit comment của chính mình
- ✅ Thêm `intern` vào `canComment` (theo Phase 9 RBAC plan)

### Phase 9.9 — Campaign Detail (✅ Already existed)

`/campaigns/[id]` đã có sẵn với đầy đủ UI:
- Tabs: Tổng quan, Công việc, Media Content, Calendar
- Stats: tasks by status, published content, engagement metrics
- Edit/Delete campaign
- Layout guard với `campaigns.read` permission

---

## Test Results

### TypeScript
```
pnpm exec tsc --noEmit
✅ Exit code 0 — No errors
```

### Next.js Build
```
pnpm next build
✅ Exit code 0 — All routes compiled
```

**Routes verified:**
- `/tasks/[id]` — ✅ với 7 tabs (Chi tiết, Checklist, Assets, Phê duyệt, AI Assistant, Thảo luận, Hoạt động)
- `/campaigns/[id]` — ✅ campaign detail với 4 tabs
- `/workspace/activity` — ✅ activity log page
- `/workspace/calendar` — ✅ calendar view
- `/settings/users` — ✅ consolidated user management

---

## Files đã tạo

| File | Mô tả |
|------|--------|
| `docs/reports/p9-workspace-content-workflow-plan.md` | Báo cáo kế hoạch kiến trúc |
| `docs/reports/p9-db-schema.md` | Chi tiết DB schema + migrations |
| `sql/workspace/023_task_checklist.sql` | Migration checklist table |
| `sql/workspace/024_content_items_task_link.sql` | Migration content.task_id |
| `scripts/run-migration-023-024.js` | Migration runner script |
| `app/api/tasks/[id]/checklist/route.ts` | Checklist GET/POST API |
| `app/api/tasks/[id]/checklist/[itemId]/route.ts` | Checklist PUT/DELETE API |
| `app/api/tasks/[id]/activity/route.ts` | Activity timeline API |
| `components/tasks/checklist-section.tsx` | Checklist UI component |
| `components/tasks/task-activity-section.tsx` | Activity timeline UI |

## Files đã sửa

| File | Thay đổi |
|------|----------|
| `lib/workspace/types.ts` | Thêm Checklist, Activity, PaginatedResult types |
| `lib/workspace/db/index.ts` | Thêm 8 checklist + activity DB functions |
| `lib/workspace/db/index.ts` | Fix `getClient` import, `Number()` cast |
| `components/tasks/task-detail-client.tsx` | Thêm Checklist + Hoạt động tabs |
| `components/tasks/comment-section.tsx` | Fix ReplyForm, canAuthor, intern permission |
| `components/tasks/approval-section.tsx` | Tách rejectReason/revisionNote |
| `components/kanban/kanban-card.tsx` | Thêm checklist progress bar |
| `app/api/tasks/route.ts` | + requireAdminAuth on GET |
| `app/api/projects/route.ts` | + requireAdminAuth on GET |
| `app/api/campaigns/route.ts` | + requireAdminAuth on GET |
| `app/api/content/items/route.ts` | + requireAdminAuth on GET |
| `app/api/content/templates/route.ts` | + requireAdminAuth on GET |
| `app/api/content/schedules/route.ts` | + requireAdminAuth on GET |
| `app/api/content/stats/route.ts` | + requireAdminAuth + import |
| `app/api/projects/[id]/route.ts` | + requireAdminAuth on GET |
| `app/api/campaigns/[id]/route.ts` | + requireAdminAuth on GET |
| `app/api/content/items/[id]/route.ts` | + requireAdminAuth on GET |

---

## Còn lại để làm (Recommendation)

1. **Seed data** — Tạo demo data cho checklist và activity (projects, campaigns, tasks với checklist items)
2. **auto-logging** — Gắn `logTaskActivity()` vào các mutation functions trong `lib/workspace/db/index.ts` để tự động ghi activity khi task được tạo/cập nhật
3. **AI results persistence** — `TaskAssistantSection` results hiện chỉ lưu trong state, nên persist vào DB
4. **Campaign type filter** — Thêm `campaign_types` filter vào campaign list
5. **Content workflow mapping** — Triển khai `deriveContentWorkflowStage()` trong UI để hiển thị workflow stage labels
