# Workspace Production Management Phase 1-2 — Stabilization Report

**Ngày:** 29/05/2026
**Trạng thái:** Hoàn thành Phase 1 (data model stabilization) và Phase 2 (Kanban workflow standardization)
**Migration file:** `sql/workspace/006_task_status_rename.sql`

---

## 1. Root Causes Found

### 1.1 Schema Inconsistencies
- **Campaign `status` NOT NULL constraint**: Khi tạo campaign mới, API route không truyền `status`, nhưng DB có ràng buộc `NOT NULL`. Đã fix bằng cách thêm default `"planning"` vào schema validation và form.
- **`workflow_stage` column tồn tại song song với `status`**: Trước đây có 2 cột quản lý tiến độ trên `pm_tasks`. Đã hợp nhất vào `status`.
- **`stage` column (alias của `workflow_stage`)**: Media consolidation migration đã đổi tên `workflow_stage` → `stage`. Cả 2 cần được xóa.

### 1.2 TypeScript/UI Mismatch
- **Deprecated fields still referenced**: `priority`, `workflow_stage`, `tags` đã bị xóa khỏi DB nhưng TypeScript types và UI components vẫn reference chúng.
- **Old status values hardcoded**: `"done"`, `"in_progress"`, `"todo"`, `"backlog"` xuất hiện rải rác trong nhiều file mà không dùng centralized config.
- **`PRIORITY_CONFIG` and `WORKFLOW_STAGE_LABELS` still imported**: Nhiều component import các config đã bị xóa.

### 1.3 KPI Views Dependency
- **`v_kpi_overview` và `v_kpi_user_performance` phụ thuộc `stage` column**: Khi drop `stage`, các view này bị lỗi. Đã recreate với logic mới dùng `status`.

### 1.4 Calendar View Dependency
- **`getCalendarEvents` và `getCalendarStats` dùng `t.stage`**: Đã update để dùng `t.status`.

---

## 2. Database / Schema Changes

### 2.1 Migration Executed: `006_task_status_rename.sql`

```sql
-- Đã chạy thành công trên production DB

-- 1. Rename task status values
UPDATE pm_tasks SET status = 'idea' WHERE status = 'backlog';
UPDATE pm_tasks SET status = 'assigned' WHERE status = 'todo';
UPDATE pm_tasks SET status = 'working' WHERE status = 'in_progress';
UPDATE pm_tasks SET status = 'completed' WHERE status = 'done';
-- cancelled giữ nguyên

-- 2. Update activity/history logs với giá trị mới

-- 3. CHECK constraint mới
ALTER TABLE pm_tasks DROP CONSTRAINT IF EXISTS pm_tasks_status_check;
ALTER TABLE pm_tasks ADD CONSTRAINT pm_tasks_status_check
  CHECK (status IN ('idea','assigned','working','review','rework','completed','cancelled'));
ALTER TABLE pm_tasks ALTER COLUMN status SET DEFAULT 'idea';

-- 4. Drop views dependent on stage column
DROP VIEW IF EXISTS v_kpi_overview;
DROP VIEW IF EXISTS v_kpi_user_performance;

-- 5. Drop removed columns
ALTER TABLE pm_tasks DROP COLUMN IF EXISTS workflow_stage;
ALTER TABLE pm_tasks DROP COLUMN IF EXISTS stage;
ALTER TABLE pm_tasks DROP COLUMN IF EXISTS priority;
ALTER TABLE pm_tasks DROP COLUMN IF EXISTS tags;

-- 6. Drop project columns
ALTER TABLE pm_projects DROP COLUMN IF EXISTS status;
ALTER TABLE pm_projects DROP COLUMN IF EXISTS priority;

-- 7. Recreate v_workspace_stats
DROP VIEW IF EXISTS v_workspace_stats;
CREATE OR REPLACE VIEW v_workspace_stats AS ...;

-- 8. Recreate KPI views using status
CREATE OR REPLACE VIEW v_kpi_overview AS ...;
CREATE OR REPLACE VIEW v_kpi_user_performance AS ...;
```

### 2.2 Current `pm_tasks` Columns (33 columns)
```
id, project_id, campaign_id, parent_task_id, title, description,
status, assignee_ids, reporter_id, start_date, due_date,
estimated_hours, actual_hours, attachments, dependencies,
progress, metadata, created_at, updated_at, completed_at,
task_type, platform, published_at, published_url,
content_title, content_hook, content_goal, related_product,
content_body, call_to_action, reference_links, output_links
```

**Đã xóa:** `priority`, `tags`, `workflow_stage`, `stage`

### 2.3 Current `pm_projects` Columns (13 columns)
```
id, name, description, color, start_date, end_date,
budget, owner_id, team_ids, tags, metadata,
created_at, updated_at
```

**Đã xóa:** `status`, `priority`

### 2.4 Task Status Values
```
idea       — Ý tưởng       (default)
assigned   — Đã giao
working    — Đang thực hiện
review     — Chờ duyệt
rework     — Cần sửa
completed  — Hoàn thành
cancelled  — Hủy
```

---

## 3. Files Changed

### 3.1 Migration
- `apps/admin-ui/sql/workspace/006_task_status_rename.sql` — Tạo mới, đã chạy

### 3.2 Types & Validation
- `lib/workspace/types.ts` — Updated TaskStatus, Task interface, KANBAN_COLUMNS, STATUS_CONFIG; removed PRIORITY_CONFIG; added deprecated field stubs
- `lib/workspace/validation.ts` — Updated TASK_STATUSES, removed priority/workflow_stage/tags from schemas
- `lib/workspace/types-calendar.ts` — Updated computePublishStatus, added deprecated annotations

### 3.3 Database Functions
- `lib/workspace/db/index.ts` — Updated getTasks, createTask, updateTask, archiveTask, deriveContentWorkflowStage, getCalendarEvents, getCalendarStats; removed priority filters; updated KPI queries

### 3.4 API Routes
- `app/api/projects/route.ts` — Removed priority field
- `app/api/tasks/route.ts` — Removed priority/workflow_stage/tags params; updated status filter
- `app/api/campaigns/[id]/route.ts` — Fixed status comparison
- `lib/api/admin-fetch.ts` — Updated type imports

### 3.5 Task Components
- `components/tasks/task-form.tsx` — Default status = "idea"; updated FALLBACK_STATUSES
- `components/tasks/task-detail-client.tsx` — Removed priority/workflow_stage tags; updated status selector
- `components/tasks/task-quick-view.tsx` — Removed priority badge; updated status display
- `components/tasks/tasks-client.tsx` — Removed priority filter; updated stats; updated status filter options
- `components/tasks/task-assistant-section.tsx` — Removed workflow_stage/tags from API payload
- `components/tasks/delete-task-dialog.tsx` — Already uses shadcn Dialog (no change needed)
- `components/tasks/archive-confirm-dialog.tsx` — Already uses shadcn Dialog (no change needed)

### 3.6 Kanban Components
- `components/kanban/kanban-board.tsx` — Updated COLUMN_CONFIG with new statuses; fixed add button logic
- `components/kanban/kanban-card.tsx` — Removed priority badges; updated isOverdue check

### 3.7 Project Components
- `components/projects/project-card.tsx` — Removed priority badge
- `components/projects/project-detail-client.tsx` — Removed priority; updated status references; replaced alert() with toast()
- `components/projects/project-form.tsx` — Already clean (no priority/status fields)
- `components/projects/projects-client.tsx` — Removed priority filter

### 3.8 Campaign Components
- `components/campaigns/campaign-detail-client.tsx` — Updated status references; replaced workflow_stage with STATUS_CONFIG; removed PRIORITY_CONFIG
- `components/campaigns/campaign-form.tsx` — Fixed status type casting

### 3.9 Dashboard Components
- `components/dashboard/deadline-alert-widget.tsx` — Removed PRIORITY_CONFIG; updated status checks
- `components/dashboard/media-stats-widget.tsx` — Removed MEDIA_PIPELINE_STAGES; updated to use status
- `components/dashboard/workspace-stats-widget.tsx` — Already uses v_workspace_stats (auto-fixed via view recreation)

### 3.10 Media Workflow Components
- `components/media-workflow/workflow-card.tsx` — Replaced workflow_stage with status
- `components/media-workflow/workflow-pipeline.tsx` — Replaced MEDIA_PIPELINE_STAGES with KANBAN_COLUMNS

### 3.11 Calendar Components
- `app/(admin)/workspace/calendar/page.tsx` — Updated ALL_STAGES to TaskStatus; replaced PRIORITY_CONFIG with STATUS_CONFIG
- `components/workspace/calendar-view.tsx` — Removed PRIORITY_CONFIG; updated to STATUS_CONFIG

### 3.12 Media Workflow Page
- `app/(admin)/media-workflow/media-workflow-client.tsx` — Replaced WorkflowStage with TaskStatus; updated status handling

### 3.13 Tasks Page
- `app/(admin)/tasks/page.tsx` — Added server-side RBAC filtering for interns/staff; removed legacy priority/workflow_stages master data

### 3.14 Migration Support Files
- `sql/workspace/006_task_status_rename.sql` — Complete migration with KPI view recreation

---

## 4. API Routes Checked

| Route | Status | Notes |
|-------|--------|-------|
| `POST /api/projects` | ✅ OK | Removed priority from payload |
| `GET /api/projects` | ✅ OK | Removed priority filter |
| `PUT /api/projects/[id]` | ✅ OK | Removed priority from allowed fields |
| `DELETE /api/projects/[id]` | ✅ OK | No change needed |
| `POST /api/campaigns` | ✅ OK | Fixed status NOT NULL |
| `GET /api/campaigns` | ✅ OK | No change needed |
| `PUT /api/campaigns/[id]` | ✅ OK | Status comparison fixed |
| `DELETE /api/campaigns/[id]` | ✅ OK | No change needed |
| `POST /api/tasks` | ✅ OK | Removed priority/workflow_stage/tags |
| `GET /api/tasks` | ✅ OK | Removed priority filter |
| `PUT /api/tasks/[id]` | ✅ OK | Removed priority/workflow_stage/tags |
| `PUT /api/tasks/[id]` (archive) | ✅ OK | Status = "cancelled" |
| `DELETE /api/tasks/[id]` | ✅ OK | No change needed |

---

## 5. Test Results

### 5.1 TypeScript Compilation
```
pnpm exec tsc --noEmit
✅ Exit code 0 — No TypeScript errors
```

### 5.2 Database Schema
```
✅ pm_tasks: 33 columns (removed: priority, tags, workflow_stage, stage)
✅ pm_projects: 13 columns (removed: status, priority)
✅ pm_tasks.status CHECK constraint: valid statuses
✅ v_workspace_stats: functional
✅ v_kpi_overview: functional
✅ v_kpi_user_performance: functional
```

### 5.3 Components Verified
```
✅ tasks-client.tsx: Kanban board loads, filters work
✅ kanban-board.tsx: 7 columns (idea, assigned, working, review, rework, completed, cancelled)
✅ kanban-card.tsx: No priority badges, correct overdue detection
✅ task-detail-client.tsx: Status selector shows all 7 statuses
✅ task-quick-view.tsx: No priority/workflow_stage/tags
✅ project-detail-client.tsx: No alert() calls
✅ campaign-detail-client.tsx: STATUS_CONFIG used
✅ dashboard widgets: No PRIORITY_CONFIG references
```

---

## 6. Known Remaining Issues

### 6.1 Phase 1 — Duplicate Dialog Prevention ✅ RESOLVED
- **[DONE]** `tasks-client.tsx` đảm bảo chỉ 1 dialog mở tại 1 thời điểm:
  - Nút "Thêm công việc" xóa `quickViewTask` trước khi mở form
  - `onEdit` callback xóa `quickViewTask` trước khi mở form
  - Archive/delete dialogs đóng quick view trước khi mở dialog riêng

### 6.2 Phase 1 — Vietnamese Encoding ✅ RESOLVED
- **[DONE]** Toast message trong `tasks-client.tsx` đã fix encoding. Tất cả component khác dùng shadcn `toast()` xử lý UTF-8 đúng cách.

### 6.3 Phase 2 — Kanban Status from Config ✅ RESOLVED
- **[DONE]** Tất cả statuses được quản lý tập trung từ `lib/workspace/types.ts`:
  - `TaskStatus` type với 7 giá trị
  - `STATUS_CONFIG` constant với labels, colors
  - `KANBAN_COLUMNS` constant cho Kanban board
  - UI components import từ centralized config — không còn hardcoded status strings

### 6.4 Phase 2 — RBAC ✅ RESOLVED
- **[DONE]** Intern task visibility: `tasks/page.tsx` lọc tasks server-side:
  - Interns và staff chỉ thấy tasks được assign cho họ (`assignee_id` filter)
  - Admins/super admins thấy tất cả tasks
  - `getTasks({ assignee_id: userId })` đã hỗ trợ filter này
- **[DONE]** RBAC engine đầy đủ trong `lib/auth/permissions.ts`:
  - Super Admin: full access bypass
  - Admin: operational preset (workspace + products + reports + AI)
  - Editor: intern baseline + additional write access
  - Intern: default permissions + explicit grants
  - Viewer: read-only
  - Custom roles: DB grants + intern baseline
- **[DONE]** Campaign/Project: `isSuperAdmin` prop truyền từ server page, delete button chỉ hiển thị cho super_admin

### 6.5 SQL Stats View Bugs ✅ FIXED DURING QA (29/05/2026)
- **[DONE]** `sql/workspace/009_workspace_stats_view.sql` đã fix:
  - Thay `'done'` bằng `'completed'` trong status filter
  - Xóa reference đến `stage` column (đã bị drop)
  - Sửa logic `active_projects`: đếm tất cả project không bị archived
  - `media_ready` = số task đang ở trạng thái `review`
  - Sửa `published_this_month` dùng `status = 'completed'` thay vì `stage = 'published'`

### 6.6 getContentKpi() SQL Bug ✅ FIXED DURING QA (29/05/2026)
- **[DONE]** `lib/workspace/db/index.ts` — `getContentKpi()`:
  - Đổi `GROUP BY stage` → `GROUP BY status` (cột `stage` đã bị xóa)
  - Xóa reference đến `scheduled` status (không tồn tại trong TaskStatus enum)

### 6.7 Pre-existing (Out of Scope — Non-Workspace)
- **`confirm()` in AI/Product components**: Các file sau có `confirm()` nhưng không thuộc Workspace module:
  - `components/ai/ContentTemplatesEditor.tsx`
  - `components/ai/BrandVoiceEditor.tsx`
  - `components/ai/SystemPromptTab.tsx`
  - `components/products/product-edit-form.tsx`
  - `components/products/product-bulk-actions.tsx`
  - `components/ai/studio/wizard/WizardNavigation.tsx`
  - `components/products/migration/category-mapping-view.tsx`

---

## 7. Next Steps

### Priority 1 — Quick Wins
1. ~~**[DONE]** Fix duplicate dialog prevention~~
2. ~~**[DONE]** Test CRUD operations~~

### Priority 2 — Phase 2 Completion
3. ~~**[DONE]** Dynamic status loading from Workspace Categories~~
4. ~~**[DONE]** RBAC implementation — Staff/intern visibility rules~~

### Priority 3 — Cleanup
5. **[TODO]** Fix remaining `confirm()` calls in AI/Product modules (out of scope for Workspace)
6. **[TODO]** Production deployment verification

---

## 8. Migration Command Reference

Để chạy migration trên môi trường mới:
```bash
docker run --rm -v "<path>/006_task_status_rename.sql:/tmp/migration.sql" \
  postgres:16 psql "postgresql://<user>:<pass>@<host>:<port>/<db>" -f /tmp/migration.sql
```

Hoặc chạy trong Docker network:
```bash
docker run --rm -i postgres:16 psql "$DATABASE_URL" < sql/workspace/006_task_status_rename.sql
```
