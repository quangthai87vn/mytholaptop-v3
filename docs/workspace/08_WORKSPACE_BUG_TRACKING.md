# 08_WORKSPACE_BUG_TRACKING.md

## Bug Report Format

For each bug, record:

```
Date: YYYY-MM-DD
Reporter: [name]
Severity: P1 (critical) / P2 (major) / P3 (minor)
Status: Open / In Progress / Fixed / Won't Fix

## Description
[What is broken]

## Steps to Reproduce
1. [step]
2. [step]

## Expected Behavior
[What should happen]

## Actual Behavior
[What happens instead]

## Root Cause
[Code-level explanation]

## Files Affected
- `file1.tsx`
- `file2.tsx`

## Fix Applied
[What was changed]

## Verified By
[Tester name — YYYY-MM-DD]
```

---

## Bug Registry

### Bug #021 — `/tasks` and `/media-workflow` duplicate the same Workspace data model

**Status:** 🟡 Analysis complete

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P2 |
| Module | Workspace |

**Description:** Two separate top-level Workspace pages render the same `pm_tasks` data with overlapping Kanban use cases. `/tasks` is now the canonical task board, while `/media-workflow` is a deprecated redirect.

**Root Cause:** Architecture split by UI behavior instead of by data model. Both pages source the same `pm_tasks` + `pm_master_data`, but the UI surface was duplicated.

**Files Involved:**
- `apps/admin-ui/app/(admin)/tasks/page.tsx`
- `apps/admin-ui/components/tasks/tasks-client.tsx`
- `apps/admin-ui/app/(admin)/media-workflow/page.tsx`
- `apps/admin-ui/app/(admin)/media-workflow/media-workflow-client.tsx`
- `apps/admin-ui/components/media-workflow/workflow-pipeline.tsx`
- `apps/admin-ui/components/media-workflow/workflow-card.tsx`

**Impact:** Medium. No evidence of direct data loss from the split itself, but duplicated UI paths increase regression risk.

---

### Bug #022 — `/tasks` action menu and drawer interaction is fragile

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | Workspace — Tasks Kanban |

**Description:** The task board mixed card-click quick view, menu-driven edit, and modal editing in one interaction layer.

**Root Cause:** The `/tasks` board coupled `TaskQuickView`, `TaskForm`, and card actions through overlapping overlay state.

**Files Involved:**
- `apps/admin-ui/components/tasks/tasks-client.tsx`
- `apps/admin-ui/components/kanban/kanban-board.tsx`
- `apps/admin-ui/components/workspace/tasks/task-kanban-card.tsx`
- `apps/admin-ui/components/workspace/tasks/task-card-actions.tsx`
- `apps/admin-ui/components/tasks/task-quick-view.tsx`
- `apps/admin-ui/components/tasks/task-form.tsx`

**Fix Applied:** The main task board now uses the stable workflow-style Kanban layout and keeps create/edit/copy/archive/delete inside modal/dialog flows. The drawer is no longer part of the primary task interaction.

---

### Bug #023 — Workflow page exists as a parallel top-level surface

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P2 |
| Module | Workspace — Media Workflow |

**Description:** `/media-workflow` was a separate route that rendered a workflow-first pipeline over task data, creating a second top-level Workspace entry with overlapping labels.

**Root Cause:** The workflow view was introduced as a dedicated page rather than a view mode inside Workspace.

**Files Involved:**
- `apps/admin-ui/app/(admin)/media-workflow/page.tsx`
- `apps/admin-ui/app/(admin)/media-workflow/media-workflow-client.tsx`
- `apps/admin-ui/components/media-workflow/workflow-pipeline.tsx`
- `apps/admin-ui/components/media-workflow/workflow-card.tsx`

---

### Bug #024 — Checklist routes: unsafe `!` assertion on `_authUser`

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | API — Tasks Checklist |

**Description:** `api/tasks/[id]/checklist/route.ts` (line 67) and `[itemId]/route.ts` (line 51) used `_authUser!` which crashes the server if `requireAdminAuth` fails to attach `_authUser`.

**Root Cause:** Non-null assertion on a value that can be undefined in edge cases.

**Files Involved:**
- `apps/admin-ui/app/api/tasks/[id]/checklist/route.ts`
- `apps/admin-ui/app/api/tasks/[id]/checklist/[itemId]/route.ts`

**Fix Applied:** Changed to `rawUser?.id ?? "system"` with proper optional chaining.

---

### Bug #025 — GET `/api/tasks/[id]` has no authentication check

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | API — Tasks |

**Description:** `GET /api/tasks/[id]` had no authentication check — anyone with a task ID could read it.

**Root Cause:** Auth middleware was not called before the GET handler.

**Files Involved:**
- `apps/admin-ui/app/api/tasks/[id]/route.ts`

**Fix Applied:** Added `_authUser` existence check before querying task data.

---

### Bug #026 — `assignee_id` (singular) used in SQL filter but column is `assignee_ids` (array)

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | DB — Activity |

**Description:** `getActivities` intern filter used `WHERE assignee_id = $X` but the column is `assignee_ids UUID[]`. Filter never matched any tasks.

**Root Cause:** Column name mismatch between scalar and array columns.

**Files Involved:**
- `apps/admin-ui/lib/workspace/db/index.ts` (getActivities intern filter)

**Fix Applied:** Changed to `$X = ANY(assignee_ids)`.

---

### Bug #027 — `getOverdueCampaigns()` and `getWorkspaceStats()` crash dashboard on missing DB objects

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | DB — Dashboard |

**Description:** Both functions called DB objects (stored procedure / view) without try/catch. If the objects don't exist, the entire `/workspace` page crashes.

**Root Cause:** Missing defensive error handling for optional DB objects.

**Files Involved:**
- `apps/admin-ui/lib/workspace/db/index.ts`

**Fix Applied:** Wrapped both functions with try/catch returning safe empty defaults.

---

### Bug #028 — `mapTaskRow` passthrough cast causes runtime crashes

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | DB — Tasks |

**Description:** `mapTaskRow` returned `row as unknown as Task` without transforming fields. If DB returns `null` for array fields, UI crashes on `.map()` / `.length`.

**Root Cause:** No defensive transformation of nullable DB fields.

**Files Involved:**
- `apps/admin-ui/lib/workspace/db/index.ts`

**Fix Applied:** Replaced with explicit field-by-field mapping with `Array.isArray()` guards.

---

### Bug #029 — `assignee_ids` bị mất khi kéo task sang cột khác trên Kanban

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | Tasks — Kanban Drag/Drop |

**Description:** Khi kéo task sang cột khác, người phụ trách (assignees) bị mất khỏi card hiển thị trên UI.

**Root Cause:** PostgreSQL column `assignee_ids` là kiểu `UUID[]`. Khi `pg` driver trả về giá trị array, nó serialize thành string literal (ví dụ `"{uuid1,uuid2}"`). Trong `mapTaskRow` (`db/index.ts:43`), `Array.isArray()` trả `false` cho string → fallback về `[]`. API trả `assignee_ids: []` về client. Khi `mergeTaskState` xử lý response, `serverTask.assignee_ids` đã là `[]` nên card re-render với danh sách rỗng.

**Files Involved:**
- `apps/admin-ui/lib/workspace/db/index.ts` — `mapTaskRow` (line 43, convert `assignee_ids` và `tags` và `dependencies` sai)
- `apps/admin-ui/components/tasks/tasks-client.tsx` — `mergeTaskState` fallback (line 229)

**Fix Applied:**
1. Thêm helper `normalizePgArray()` trong `mapTaskRow` — parse đúng PostgreSQL array string format `"{val1,val2}"` thành `string[]`. Applies cho `assignee_ids`, `tags`, `dependencies`.
2. Sửa `mergeTaskState` fallback — đổi `return currentTask.assignee_ids` thành `return []` — không cascade corruption.

---

### Bug #028 — `mapTaskRow` passthrough cast causes runtime crashes

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-02 |
| Severity | P1 |
| Module | DB — Tasks |

**Description:** `mapTaskRow` returned `row as unknown as Task` without transforming fields. If DB returns `null` for array fields, UI crashes on `.map()` / `.length`.

**Root Cause:** No defensive transformation of nullable DB fields.

**Files Involved:**
- `apps/admin-ui/lib/workspace/db/index.ts`

**Fix Applied:** Replaced with explicit field-by-field mapping with `Array.isArray()` guards and `normalizePgArray()` for array columns.

---

### Bug #030 — Gán user cho Task bị mất — chuẩn hoá bảng assignees

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-03 |
| Severity | P1 |
| Module | Tasks — Assignees |

**Description:** Khi gán user cho task (create/edit/drag-drop), người phụ trách bị mất khỏi UI.

**Root Cause Investigation:**
- PostgreSQL `pg` driver trả `assignee_ids` (kiểu `UUID[]`) như JavaScript array — **đúng**
- JSON serialize/deserialize giữ nguyên array — **đúng**
- Vấn đề gốc: DB seed có UUID cứng (`11111111-0000-0000-0000-000000000001`) không khớp `admin_users` có UUID thực tế

**Fix Applied — 3 Layer:**

1. **Migration SQL** (`sql/workspace/039_task_assignees_normalized.sql`):
   - Tạo bảng `pm_task_assignees (task_id, user_id, assigned_at, assigned_by)` với unique constraint
   - Trigger `trg_sync_task_assignees_insert/delete` đồng bộ 2 chiều: INSERT/DELETE trên junction tự động cập nhật `assignee_ids[]` trên `pm_tasks`
   - Đảm bảo `assignee_ids[]` luôn consistent

2. **DB Layer** (`lib/workspace/db/index.ts`):
   - Thêm helper `normalizePgArray()` để parse PostgreSQL array string format
   - `updateTask` giờ dùng junction table để sync assignees — INSERT/DELETE rõ ràng, trigger tự động cập nhật `assignee_ids[]`, sau đó fresh SELECT trả về task mới nhất

3. **Frontend** (`tasks-client.tsx`):
   - `mergeTaskState` với `parseAssignees` robust — parse cả array thật lẫn string bị serialize

**Files Involved:**
- `apps/admin-ui/sql/workspace/039_task_assignees_normalized.sql` (migration)
- `apps/admin-ui/lib/workspace/db/index.ts` (normalizePgArray, updateTask, sync functions)
- `apps/admin-ui/components/tasks/tasks-client.tsx` (parseAssignees)

---

## Change Tracking Note

This file reflects the current consolidation state. `/tasks` is the official task surface; `/media-workflow` is deprecated.

---

## 2026-06-03 — Assignee Data Persistence Fixes

### Root Causes Fixed

**Bug: Menu button disappears after dragging task to "Hoàn Thành" or "Chờ duyệt" columns**

- **Date:** 2026-06-03
- **Severity:** P1
- **Symptom:** After dragging a task into certain columns, the (...) menu button disappears from the card.
- **Root Cause:** `mergeTaskState` in `tasks-client.tsx` used spread operator `...serverTask` which overwrote `assignee_ids = undefined` when server returned partial response `{ status: "completed" }`. The `assignee_ids` getter then evaluated to `undefined`, causing `task.assignee_ids.length > 0` to fail, triggering React re-renders that unmounted the menu button.
- **Fix:** `mergeTaskState` now only applies fields the server explicitly returned. Missing/undefined fields are preserved from the current task state.
- **Files:** `components/tasks/tasks-client.tsx`

**Bug: Junction table INSERT had wrong placeholder indices**

- **Date:** 2026-06-03
- **Severity:** P1
- **Symptom:** `INSERT has more target columns than expressions` when saving tasks with assignees.
- **Root Cause:** Placeholder generation for multi-row INSERT used `($2, $3), ($4, $5), ...` missing `$1` (task_id) in each row. The `task_id` column was in the INSERT target list but not in each row's VALUES.
- **Fix:** Changed to `($1, $2, $3), ($1, $4, $5), ...` — task_id ($1) now appears in every row.
- **Files:** `lib/workspace/db/index.ts` (createTask, duplicateTask, updateTask junction inserts)

**Bug: DB triggers not attached to pm_task_assignees table**

- **Date:** 2026-06-03
- **Severity:** P1
- **Symptom:** Junction table INSERT/DELETE did not sync `pm_tasks.assignee_ids[]` column.
- **Root Cause:** Migration script created function and table but triggers were not created (count = 0).
- **Fix:** Recreated triggers `trg_sync_insert` and `trg_sync_delete` directly in the database. Verified with live test: INSERT into junction → `pm_tasks.assignee_ids[]` updates correctly.

**Bug: Zod schema default([]) for assignee_ids caused silent data wipe**

- **Date:** 2026-06-03
- **Severity:** P1
- **Symptom:** Dragging a task to a new column wiped all assignees.
- **Root Cause:** `updateTaskSchema` has `assignee_ids: z.array(z.string()).default([])`. When body only contained `{ status }`, Zod filled `assignee_ids: []` automatically. API route received `[]`, interpreted as "clear all assignees", and deleted junction table rows.
- **Fix:** Track original request body keys before Zod parsing. If `assignee_ids` was not in the original payload, delete it from the data object before passing to `updateTask`.

**Bug: updateTask returned early with stale data**

- **Date:** 2026-06-03
- **Severity:** P1
- **Symptom:** Server returned task with old `assignee_ids` after drag operation.
- **Root Cause:** `UPDATE ... RETURNING *` returned `rows[0]` which had `assignee_ids` as of before trigger ran. Early return at line 599 prevented fresh SELECT.
- **Fix:** Removed RETURNING from UPDATE. Junction table sync runs, then a fresh `SELECT * FROM pm_tasks WHERE id = $1` returns the true current state.

**Bug: createTask and duplicateTask did not populate junction table**

- **Date:** 2026-06-03
- **Severity:** P2
- **Symptom:** New tasks or duplicated tasks lost assignees after creation.
- **Root Cause:** Both functions set `pm_tasks.assignee_ids` column directly but did not INSERT into `pm_task_assignees` junction table.
- **Fix:** Added junction table INSERT after INSERT into `pm_tasks` in both functions.

---

### Bug: Task card action menu always visible (not hover-only)

- **Date:** 2026-06-04
- **Severity:** P3
- **Symptom:** "..." button on task cards always visible, cluttering the UI. Should only show on hover.
- **Root Cause:** `KanbanCardBase` had no group-hover mechanism to hide/show the action area. The action wrapper had no `opacity-0` by default.
- **Fix:**
  - `KanbanCardBase`: wrapped action div in `opacity-0 group-hover:opacity-100 transition-opacity` with `pointer-events-none/group-hover:pointer-events-auto`
  - `TaskCardActions`: removed dev-only `console.debug` + `_debug` property hack that caused TypeScript errors (`Conversion of type '...' to type 'Record<string, unknown>'`)
- **Files Changed:**
  - `components/kanban/kanban-card-base.tsx`
  - `components/workspace/tasks/task-card-actions.tsx`

---

### Bug: Task card action button disappears or is clipped when title is long (FINAL — action popup instead)

- **Date:** 2026-06-04
- **Severity:** P2
- **Symptom:** Action button missing on task cards with long titles, drag/drop, or overflow clipping.
- **Root Cause:** Previous approaches (top-right overlay, bottom footer with opacity) were inherently fragile — any card with overflowing content could push/clip the action area.
- **Final Fix (click-to-popup — no action buttons in card):**
  - Removed ALL action buttons from inside the card (no footer "Thao tác", no top-right "...")
  - Card only displays information (type, title, deadline, assignees, platforms, status)
  - Click anywhere on card body → opens centered `TaskActionPopup` Dialog
  - Popup shows: task title, type, status, assignees + 4 action buttons (Sửa / Sao chép / Lưu trữ / Xóa)
  - Popup uses `DialogPortal` — always renders at root, never clipped by column overflow
  - Each action button closes popup then calls the corresponding handler
  - Card title: `line-clamp-2` with `break-words`, no overflow issues
  - No `overflow-hidden` on card, no flex hacks needed
- **Files Changed:**
  - `components/tasks/task-action-popup.tsx` — NEW: centered Dialog with task info + action buttons
  - `components/workspace/tasks/task-kanban-card.tsx` — simplified: no actionMenu, card click → onView callback
  - `components/kanban/kanban-card-base.tsx` — removed actionMenu prop, footer slot, simplified layout
  - `components/kanban/kanban-board.tsx` — passes onView to TaskKanbanCard, no action callbacks to cards
  - `components/tasks/tasks-client.tsx` — added popup state, wired TaskActionPopup, passed onView to KanbanBoard
- **Backward Compatibility:**
  - `KanbanCard` (kanban-card.tsx) — still exists, unused, for future reference
  - `KanbanCardMenu` (kanban-card-menu.tsx) — still exists, unused
  - `TaskCardActions` (task-card-actions.tsx) — still exists, unused

### Feature: Calendar v2 — 4 Views + Filter Panel + Excel Export

- **Date:** 2026-06-04
- **Severity:** Enhancement
- **Changes:**
  - Added Grid view alongside Month/Week/Agenda (4 views total)
  - Created collapsible filter panel (`CalendarFilterPanel`) with all filters in one popover
  - Added filter chips showing active filters with individual remove buttons
  - Added quick filters: Quá hạn, Chờ duyệt, Hoàn thành
  - Added date range filter (from/to date inputs)
  - Added filter by: Nhân viên, Trạng thái, Loại công việc, Nền tảng, Dự án, Chiến dịch
  - GridView supports group-by: Ngày, Loại công việc, Nền tảng, Nhân viên, Trạng thái
  - Each task card in GridView shows: title, type, status, project/campaign, deadline, assignees, overdue badge
  - Added "Xuất Excel" button → downloads XLSX with 16 columns
  - Excel filename: workspace-calendar-tasks-YYYY-MM-DD.xlsx
  - Click event in any view → quick view dialog (not TaskActionPopup — calendar uses CalendarEvent type)
- **Files Changed:**
  - `components/workspace/calendar/calendar-filter-panel.tsx` — NEW: collapsible filter panel
  - `components/workspace/calendar/calendar-grid-view.tsx` — NEW: Grid view with group-by
  - `app/(admin)/workspace/calendar/calendar-client.tsx` — full rewrite: 4 views, filter panel, export
  - `app/(admin)/workspace/calendar/page.tsx` — pass projects, campaigns, staff in masterData
  - `lib/workspace/types-calendar.ts` — added `grid` to CalendarViewMode, GridGroupBy, extended CalendarFilters
  - `app/api/calendar/route.ts` — parse new filter params (taskTypes, dateFrom, dateTo, overdue, pendingApproval, completed)

### Feature: P10 — Task Platform Link Fields + YouTube Thumbnail

- **Date:** 2026-06-04
- **Severity:** Enhancement
- **Changes:**
  - Added 4 new database columns to `pm_tasks`: `website_url`, `youtube_url`, `tiktok_url`, `facebook_url`
  - Added `website_url`, `youtube_url`, `tiktok_url`, `facebook_url` to `Task` interface in `types.ts`
  - Updated `createTask` / `updateTask` in `db/index.ts` to handle 4 new fields
  - Updated `mapTaskRow` in `db/index.ts` to map 4 new fields from DB rows
  - Updated `createTaskSchema` / `updateTaskSchema` in `validation.ts` with URL validation
  - Updated API POST `/api/tasks` to pass 4 URL fields to `createTask`
  - Updated API PUT `/api/tasks/[id]` — Zod schema now includes 4 URL fields (works automatically via `result.data`)
  - Updated `TaskForm` to include 4 URL inputs in "Link nền tảng" section with basic URL validation
  - TaskForm loads existing URL values when editing
  - TaskForm shows saved link values as clickable links below inputs
  - KanbanCardBase shows YouTube thumbnail if `youtube_url` is set (supports watch/shorts/youtu.be formats)
  - Thumbnail uses `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`
  - Thumbnail falls back gracefully if image fails to load
  - CalendarEvent now includes `websiteUrl`, `youtubeUrl`, `tiktokUrl`, `facebookUrl`
  - `getCalendarEvents` in `db/index.ts` populates 4 URL fields for each event
  - Excel export includes all 4 link columns + full 17-column spec (21 columns total)
  - Deduplicates events by taskId in Excel export
  - Calendar month view compact chips now show: task type + title + assignee + platform
- **Migration Files:**
  - `sql/workspace/040_task_link_fields.sql` — adds 4 URL columns + indexes
  - `sql/workspace/041_seed_task_links.sql` — seeds test data with YouTube/social links
- **Files Changed:**
  - `sql/workspace/040_task_link_fields.sql` — NEW: migration
  - `sql/workspace/041_seed_task_links.sql` — NEW: seed data
  - `lib/workspace/types.ts` — added 4 URL fields to Task interface
  - `lib/workspace/db/index.ts` — createTask, updateTask, mapTaskRow, getCalendarEvents
  - `lib/workspace/validation.ts` — added 4 URL fields to both schemas
  - `lib/workspace/types-calendar.ts` — added 4 URL fields to CalendarEvent
  - `app/api/tasks/route.ts` — pass 4 URL fields to createTask
  - `app/(admin)/workspace/calendar/calendar-client.tsx` — enhanced EventCard compact + Excel export
  - `components/tasks/task-form.tsx` — 4 URL inputs + saved link display
  - `components/kanban/kanban-card-base.tsx` — YouTube thumbnail component
- **Test Cases:**
  - [ ] Create task with all 4 links filled → saved correctly
  - [ ] Edit task with existing links → links still present after reload
  - [ ] Task with YouTube link shows thumbnail on Kanban card
  - [ ] Task without YouTube link shows regular card (no broken image)
  - [ ] Calendar month view shows type + title + assignee + platform
  - [ ] Click task in calendar → quick view popup opens
  - [ ] Export Excel → 4 link columns present in file

### Bug #031 — TaskForm deadline display shows negative days "(-3d)"

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-04 |
| Severity | P1 |
| Module | Tasks — Kanban / Deadline |

**Description:** Kanban card deadline row showed negative numbers like `(-3d)` when tasks were overdue. The `getDaysLeftStr` function in `task-action-popup.tsx` returned `quá X ngày` but the UI was still displaying `(daysLeft)d` format from the old calculation. Also, completed tasks with past due dates still showed overdue badges.

**Root Cause:** Two issues:
1. `KanbanCardBase` used `Math.abs(daysLeft)` for overdue display, resulting in positive numbers like `(-3d)` — the minus sign from the CSS class was stripped
2. `getDaysLeftStr` didn't check task status before returning overdue labels

**Fix Applied:**
- Created `getTaskDeadlineLabel(dueDate, taskStatus, today)` helper in `lib/workspace/date-utils.ts`
- Helper returns `{ label, overdue, urgent }` — never negative
- Logic: completed/cancelled tasks → `null` (no deadline shown), overdue → `quá X ngày`, today → `hôm nay`, tomorrow → `ngày mai`, ≤3 days → `còn X ngày`, else → `còn X ngày`
- Rewrote `KanbanCardBase` deadline row using new helper
- Fixed `getDaysLeftStr` in `task-action-popup.tsx` to accept `taskStatus` and return empty string for completed tasks
- TaskActionPopup now shows "Hoàn thành" label for completed tasks instead of overdue badge

**Files Changed:**
- `lib/workspace/date-utils.ts` — added `getTaskDeadlineLabel` helper
- `components/kanban/kanban-card-base.tsx` — full rewrite, uses helper for deadline display
- `components/tasks/task-action-popup.tsx` — fixed `getDaysLeftStr`, added `isCompleted` guard, shows completion label for done tasks

---

### Bug #032 — Calendar month view only showed 1 assignee name

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-04 |
| Severity | P2 |
| Module | Calendar |

**Description:** In calendar month view compact chips, each task only displayed the first assignee name (`assigneeNames[0]`). Multiple assignees were not visible.

**Root Cause:** `EventCard` compact mode hardcoded `event.assigneeNames[0]` instead of iterating through all names.

**Fix Applied:**
- `EventCard` compact mode now shows up to 2 assignee names
- Format: `"Name1, Name2 +N"` when more than 2
- Uses `min-w-0` on container to prevent text overflow
- Assignee line is wrapped in a flex container with `gap-1`

**Files Changed:**
- `app/(admin)/workspace/calendar/calendar-client.tsx` — `EventCard` compact mode logic

---

### Bug #033 — TaskForm contained removed content fields (Hook, CTA, etc.)

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-04 |
| Severity | P2 |
| Module | Tasks — TaskForm |

**Description:** TaskForm included deprecated fields (content_hook, content_goal, related_product, call_to_action, reference_links) in the form even though these were removed from the UI design.

**Root Cause:** Fields were still defined in the Task interface and `mapTaskRow` in the DB layer, but the form never rendered them. The fields existed in the type system but weren't visible to users.

**Fix Applied:**
- TaskForm UI stays the same (already correct with 2-tab, 2-column layout)
- Kept all fields in `Task` interface for DB/API backward compatibility
- Verified TaskForm only submits: title, description, project_id, campaign_id, status, start_date, due_date, task_type, assignee_ids, assignee_note, platforms, content_body, website_url, youtube_url, tiktok_url, facebook_url, output_links, completion_note

**Files Changed:**
- `lib/workspace/types.ts` — Task interface unchanged (fields kept for backward compat)
- No UI changes — TaskForm already correct

---

### Bug #034 — mapTaskRow null/undefined type mismatches

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-04 |
| Severity | P1 |
| Module | DB — Tasks |

**Description:** `mapTaskRow` returned DB values typed as `string | null` for many fields, but `Task` interface uses `string | undefined`. TypeScript errors across multiple API routes.

**Root Cause:** DB returns `null` for empty columns, but Task interface defines optional fields as `undefined`.

**Fix Applied:**
- Changed all `as string | null` casts to `((row.field as string) ?? undefined)` pattern
- Added explicit type casts: `as TaskStatus`, `as MediaPlatform`, `as ContentGoal`
- Added `progress` field (required in Task)
- Added `content_title`, `content_hook`, `content_goal`, `related_product`, `call_to_action`, `reference_links`, `output_links`, `content_status`, `approved_by`, `approved_at`, `submitted_at`, `submitted_by`, `completion_note`, `updated_by_user_id`, `completed_at` — all fields from DB
- Removed `content_type` — not a column in `pm_tasks`
- Removed duplicate `checklist_items`/`checklist_progress` definitions

**Files Changed:**
- `lib/workspace/db/index.ts` — `mapTaskRow` full rewrite

---

### Bug #035 — TeamActivityWidget `action` vs `action_type` mismatch

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-04 |
| Severity | P2 |
| Module | Workspace — Dashboard |

**Description:** `workspace/page.tsx` fetched activities with `action_type` from `v_workspace_activities` but `TeamActivityWidget` expected `action` field.

**Fix Applied:**
- `workspace/page.tsx` now maps `{ ...r, action: r.action_type }` to match widget interface

**Files Changed:**
- `app/(admin)/workspace/page.tsx`

---

### Bug #036 — TaskForm validation: `contentBody` type mismatch in API routes

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-04 |
| Severity | P2 |
| Module | API — Tasks |

**Description:** `createWorkflow` expected `contentBody: string | undefined` but `mapTaskRow` returned `content_body: string | null`.

**Fix Applied:**
- Changed `contentBody: task.content_body` to `contentBody: task.content_body ?? undefined` in all three API routes

**Files Changed:**
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/api/tasks/[id]/duplicate/route.ts`

---

## Change Tracking Note

---

### Bug #037 — TaskForm popup UI too narrow (UI bị bó hẹp)

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-05 |
| Severity | P1 |
| Module | Tasks — UI |

**Description:** TaskForm được render trong `Dialog` nhỏ, không fullscreen. Trên màn hình 1366px, form bị bó giữa màn hình, không tận dụng không gian rộng.

**Root Cause:** `TaskForm` dùng `<Dialog>` (popup nhỏ) thay vì full-page layout.

**Fix Applied:**
- Tạo route `/tasks/[id]/edit` — fullscreen page giống product edit
- Tạo `TaskEditClient` component với layout full-width
- Layout: sticky header với breadcrumb + nút Quay lại/Lưu, tab navigation ngang, nội dung rộng toàn màn hình
- `handleEditTask` trong `TasksClient` navigate đến `/tasks/${task.id}/edit` thay vì mở Dialog
- TaskForm gốc vẫn giữ nguyên cho tạo task mới

**Files Changed:**
- `app/(admin)/tasks/[id]/edit/page.tsx` — NEW: fullscreen edit server page
- `components/tasks/task-edit-client.tsx` — NEW: fullscreen edit client component
- `components/tasks/tasks-client.tsx` — `handleEditTask` now navigates to fullscreen route

---

### Bug #038 — Fanpage/Facebook field uses wrong type cast

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-05 |
| Severity | P2 |
| Module | Tasks — Form |

**Description:** Link fields được đọc bằng cast kiểu rườmà: `(task as unknown as Record<string, unknown>)?.facebook_url`. Task interface đã có field `facebook_url` đúng kiểu, không cần cast.

**Root Cause:** Developer dùng cast kiểu không cần thiết thay vì truy cập trực tiếp `task?.facebook_url`.

**Fix Applied:**
- Đổi từ `((task as unknown as Record<string, unknown>)?.facebook_url as string) ?? ""` thành `task?.facebook_url ?? ""`

**Files Changed:**
- `components/tasks/task-form.tsx` — simplified result state initialization

---

### Bug #039 — TabsContent outside Tabs in TaskForm

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-05 |
| Severity | P1 |
| Module | Tasks — UI |

**Description:** `TabsContent` nằm ngoài `Tabs` component gây React error: `TabsContent must be used within Tabs`.

**Root Cause:** `</Tabs>` đóng ở header (sau `TabsList`) nhưng `TabsContent` nằm trong `form` (khác div cha).

**Fix Applied:**
- Wrap cả header div và form div bằng `<Tabs className="contents">`
- `className="contents"` không tạo DOM node nên không phá vỡ layout flex

**Files Changed:**
- `components/tasks/task-form.tsx` — restructured Tabs hierarchy

---

### Bug #040 — Dialog missing aria-describedby in multiple components

**Status:** ✅ Fixed

| Field | Value |
|--------|--------|
| Date | 2026-06-05 |
| Severity | P2 |
| Module | Global — Accessibility |

**Description:** Nhiều `DialogContent` thiếu `aria-describedby` gây warning browser: `Missing Description or aria-describedby`.

**Fix Applied:**
- Thêm `aria-describedby` và `<span id="..." className="sr-only">` cho Dialog không có DialogDescription
- Sửa: `task-action-popup.tsx`, `woo-product-edit-dialog.tsx`, `woo-product-edit-page-form.tsx` (2 Dialog)

**Files Changed:**
- `components/tasks/task-action-popup.tsx`
- `components/products/woo-product-edit-dialog.tsx`
- `components/products/woo-product-edit-page-form.tsx`

---

### Feature/Refactor #F011 — Fullscreen Task Edit layout

**Status:** ✅ Implemented

| Field | Value |
|--------|--------|
| Date | 2026-06-05 |
| Severity | Enhancement |
| Module | Tasks — UI |

**Layout Design:**
- **Header sticky:** breadcrumb Công việc > [task title] > Sửa, nút Quay lại + Lưu thay đổi
- **Tab navigation:** 2 tabs ngang lớn — Yêu cầu, Kết quả (border-bottom style)
- **Tab Yêu cầu:** Grid 3 cột: 2 cột trái (Thông tin + Kịch bản) + 1 cột phải (sidebar trạng thái nhanh). Editor kịch bản rộng với 2 chế độ: Soạn thảo / HTML, `min-h-[280px]`
- **Tab Kết quả:** Card Link nền tảng (4 field có icon), Card File/Asset, Card Ghi chú hoàn thành. Không có giá trị mặc định cho Fanpage. Load đúng dữ liệu từ database.
- **Post-save:** Toast thành công → `router.push(/tasks/${id})` → `router.refresh()` (revalidate → Kanban reload)

**Payload khi lưu:**
```typescript
{
  title, description, project_id, campaign_id, status,
  start_date, due_date, task_type, assignee_ids,
  metadata: { notes?, platform_ids? },
  content_body,
  output_links: string[], // comma-split
  completion_note,
  website_url, youtube_url, tiktok_url, facebook_url,
}
```

**Test Cases:**
- [ ] Mở task có sẵn link Facebook → thấy đúng link
- [ ] Sửa link Facebook → Lưu → Mở lại → vẫn đúng
- [ ] Xoá link Facebook → Lưu → Mở lại → trống
- [ ] Sửa đồng thời 4 link → đều lưu đúng
- [ ] Không có giá trị mặc định tự sinh ở Fanpage
- [ ] Kanban card reload đúng sau khi lưu
- [ ] YouTube thumbnail hiển thị nếu có link
- [ ] Form fullscreen hiển thị tốt ở 1366px và full HD
- [ ] Không còn `TabsContent outside Tabs` error
- [ ] Không còn Dialog aria-describedby warning
- [ ] Layout 2 cột (trái 40% info + phải 60% editor) hiển thị đúng
- [ ] Tiptap editor: Bold, Italic, H1/H2/H3, lists, align, link, color lưu đúng HTML
- [ ] Reload trang edit, nội dung HTML vẫn còn
- [ ] Quay lại Kanban rồi mở lại task, nội dung vẫn đúng
- [ ] Tab Kết quả + 4 link nền tảng không bị ảnh hưởng

## Bug #B019 — Save redirect sang trang detail (sau P13)

**Status:** ✅ Fixed 2026-06-05

| Field | Value |
|-------|-------|
| Date | 2026-06-05 |
| Severity | P2 |
| Module | Tasks — Edit Page |

**Mô tả:** Sau khi bấm "Lưu thay đổi", trang tự động nhảy sang `/tasks/[id]` (trang detail). Yêu cầu: stay tại trang edit, chỉ show toast.

**Root Cause:** `handleSave` có `router.push(/tasks/${task.id})` + `router.refresh()`.

**Fix:**
- Bỏ `router.push(/tasks/${task.id})` — không redirect nữa
- Giữ `router.refresh()` — để Next.js revalidate trang edit
- Đổi nút "Quay lại" từ `/tasks/${id}` → `/tasks`

**Files:**
- `components/tasks/task-edit-client.tsx`

---

## Bug #B020 — Loại công việc không lưu được / Kanban không reload

**Status:** ✅ Fixed 2026-06-05

| Field | Value |
|-------|-------|
| Date | 2026-06-05 |
| Severity | P2 |
| Module | Tasks — Edit Page + Kanban |

**Mô tả:** Khi chọn loại công việc (task_type) trong form edit và bấm lưu, Kanban board không hiển thị đúng badge loại mới. Sau reload trang edit, Select hiển thị "Chọn loại" thay vì loại đã lưu.

**Root Cause (Phase 1 — Pre-2026-06-05):** `mapTaskRow` không map `task_type` từ DB row → `task.task_type` luôn là `undefined` → form Select luôn hiển thị "Chọn loại". API validation cũng reject inactive types nhưng form không hiển thị lỗi.

**Fix (Phase 2 — 2026-06-05):**
1. **`lib/workspace/db/index.ts`**: Thêm `task_type: (row.task_type as unknown as string | undefined) ?? undefined` vào `mapTaskRow`.
2. **`lib/workspace/types.ts`**: Widen `TaskType` từ union 9 giá trị sang `string` để compatible với arbitrary codes.
3. **`app/api/tasks/[id]/route.ts`**: Cho phép `task_type` inactive nếu đã tồn tại trên task. Cải thiện error message. Di chuyển `oldTask` fetch lên trước validation.
4. **`components/tasks/task-edit-client.tsx`**: Thêm fallback `<SelectItem>` hiển thị đúng `task_type` kể cả inactive — label màu vàng "code (không hoạt động)".

**Files:**
- `lib/workspace/db/index.ts` (mapTaskRow)
- `lib/workspace/types.ts` (TaskType widening)
- `app/api/tasks/[id]/route.ts` (validation + error message)
- `components/tasks/task-edit-client.tsx` (Select fallback option)

**Test Cases:**
- [x] Bấm "Lưu thay đổi" → Stay tại trang edit, toast hiện
- [ ] Đổi loại công việc → Lưu → Reload trang edit → loại vẫn đúng
- [ ] Quay về Kanban → Card hiển thị đúng badge loại công việc mới
- [ ] Task có type inactive → Select hiển thị code + "(không hoạt động)"
- [ ] Save task với type inactive → thành công, không lỗi INVALID_TASK_TYPE
- [ ] Console không có lỗi

---

## Enhancement #E005 — YouTube Thumbnail trên Kanban Card

**Status:** ✅ Implemented 2026-06-05

| Field | Value |
|-------|-------|
| Date | 2026-06-05 |
| Severity | Enhancement |
| Module | Tasks — Kanban Board |

**Mô tả:** Kanban card hiện không hiển thị thumbnail. Khi có `youtube_url`, cần hiển thị ảnh thumbnail 16:9.

**Implementation:**
- `extractYouTubeId()` helper: parse YouTube URL patterns → video ID
- Thumbnail `aspect-ratio: 16/9`, `Image` với `fill` + `object-cover` → không crop
- Play button overlay → click mở video trong tab mới
- Title nằm dưới thumbnail, không overlay
- Bỏ `max-h-[200px]` constraint → card tự grow
- Không có `youtube_url` → layout không thay đổi

**Files:**
- `components/kanban/kanban-card.tsx`

---

**Test Cases (P14):**
- [x] Bấm "Lưu thay đổi" → Stay tại trang edit, toast hiện
- [ ] Đổi loại công việc → Lưu → Reload trang edit → loại vẫn đúng
- [ ] Quay về Kanban → Card hiển thị đúng badge loại công việc mới
- [ ] Task có YouTube URL → Card hiển thị thumbnail 16:9 đầy đủ
- [ ] Task không có thumbnail → Layout không thay đổi, không khoảng trống
- [ ] Click thumbnail → Mở video YouTube trong tab mới
- [ ] Click card (không phải thumbnail) → Mở popup hành động
- [ ] Nút "Quay lại" → Về trang `/tasks`
- [ ] Console không có lỗi

---

## Bug #B021 — Layout Task Edit chưa thật sự fullscreen (P15)

**Status:** ✅ Fixed 2026-06-05

| Field | Value |
|-------|-------|
| Date | 2026-06-05 |
| Severity | P2 |
| Module | Tasks — Edit Page |

**Mô tả:** Layout Task Edit dùng `max-w-[1600px]` và grid 5-col cố định, form bị bó hẹp. Tab Yêu cầu và Kết quả dùng conditional rendering `{activeTab === "..." && (...)}` thay vì toggle `className="hidden"`.

**Fix:**
- Container dùng `w-full px-4 sm:px-6 lg:px-8` — tận dụng toàn bộ chiều ngang
- Bỏ page title riêng, gộp vào tab navigation
- Tab toggle bằng `className="hidden"` thay vì conditional rendering
- Tab Yêu cầu: 2 cột — trái 40% (Thông tin) + phải 60% (Rich text editor)
- Tab Kết quả: 3 cột equal width (Links + Assets + Completion)

**Files:**
- `components/tasks/task-edit-client.tsx`

---

## Bug #B022 — Popup click task sơ sài, chưa đủ nội dung (P15)

**Status:** ✅ Fixed 2026-06-05

| Field | Value |
|-------|-------|
| Date | 2026-06-05 |
| Severity | P2 |
| Module | Tasks — Kanban Board |

**Mô tả:** Popup click task chỉ có title + type badge + vài field cơ bản, nút hành động xám nhạt.

**Fix:**
- Header nền đỏ `#E60012` MTL, title trắng to, bold
- Badge "Chưa phân loại" khi không có task_type
- Thông tin đầy đủ: Trạng thái, Deadline (số ngày), Dự án, Chiến dịch, Phụ trách (avatars), Nền tảng, Checklist
- Nút hành động grid 2 cột với màu sắc rõ: Sửa (đỏ MTL), Sao chép (xám), Lưu trữ (cam), Khôi phục (xanh), Xóa (đỏ full-width)
- Icon rõ ràng trên mỗi nút

**Files:**
- `components/tasks/task-action-popup.tsx`

---

## Enhancement #E006 — Kanban Card hiển thị "Chưa phân loại" khi không có loại

**Status:** ✅ Implemented 2026-06-05

**Mô tả:** Task không có loại công việc thì card không hiển thị badge gì → giao diện trống.

**Fix:**
- Khi `taskTypeCfg` null → hiển thị Badge "Chưa phân loại" màu xám nhạt
- Luôn có badge trên card, không để trống

**Files:**
- `components/kanban/kanban-card.tsx`

---

**Test Cases (P15):**
- [ ] Mở `/tasks/[id]/edit` → layout full width, 2 cột tab Yêu cầu
- [ ] Chuyển tab → Tab Kết quả hiển thị 3 cột, không re-mount
- [ ] Click card task → Popup header đỏ, title trắng, đủ thông tin
- [ ] Popup có đủ nút: Sửa, Sao chép, Lưu trữ, Xóa
- [ ] Task không có loại → Badge "Chưa phân loại" hiện trên card
- [ ] Chọn loại + lưu → reload vẫn còn
- [ ] Nhập link Website/YouTube/TikTok/Facebook → lưu + reload vẫn còn
- [ ] Task có YouTube → thumbnail 16:9 hiện đúng
- [ ] Console không lỗi