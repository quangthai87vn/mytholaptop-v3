# WORKSPACE_TASK_ROADMAP.md

Development phases for the Workspace module of admin-ui.

---

## Phase 1: Stabilize Task Module

**Goal:** Fix all broken task management features.

### 1.1 Kanban Board
- [x] Fix action menu (...) always visible on every card in every column
- [x] Fix drag/drop: status update persists to DB, full task object preserved
- [x] Fix archive/delete/copy confirmation dialogs
- [x] Fix multi-platform display (platform badges from `metadata.platform_ids`)
- [x] Fix assignee display (names from `assignee_ids` + `admin_users` lookup)
- [x] Fix deadline display: no negative days, completed tasks don't show overdue

### 1.2 Task Create/Edit/Save
- [x] Create task: saves to `pm_tasks`, creates `pm_workflows` with `platform_ids`
- [x] Edit task: updates `pm_tasks` and syncs `pm_workflows.platform_ids`
- [x] Fix date timezone: store as ISO string, display in local time (Vietnam: UTC+7)
- [x] Fix task type: save `task_type` code to `pm_tasks`, display from master data
- [x] TaskForm: fullscreen 2-tab layout (Yêu cầu / Kết quả), removed deprecated fields

### 1.3 Task Filtering
- [ ] Status filter uses master data `task_status` codes
- [ ] Platform filter uses `metadata.platform_ids` from tasks
- [ ] Assignee filter uses `assignee_ids` array
- [ ] Project/Campaign filter uses foreign keys
- [ ] "My tasks" filter: only tasks where `assignee_ids` includes current user ID

### 1.4 Task Actions
- [ ] Copy task: creates new task via `/api/tasks` POST, duplicates workflow
- [ ] Archive task: sets `is_archived = true` on `pm_tasks`
- [ ] Restore task: sets `is_archived = false`
- [ ] Delete task: only `super_admin` can delete; uses `AlertDialog` confirmation

---

## Phase 2: Role-Based Permissions

**Goal:** Enforce access control across all workspace modules.

### 2.1 Role Implementation
- [ ] `super_admin`: full access — bypasses all permission checks
- [ ] `admin`: operational access preset — workspace, projects, campaigns, tasks, AI, reports
- [ ] `intern`: restricted — only assigned/self-created tasks; no delete/archive
- [ ] `editor`: content management — can create/edit content, no system config
- [ ] `viewer`: read-only

### 2.2 Task-Level Permissions
- [ ] Intern can view: tasks where `assignee_ids` includes intern ID
- [ ] Intern can edit: own assigned tasks that are NOT completed/approved
- [ ] Intern CANNOT delete or archive any task
- [ ] Intern CANNOT edit completed/approved tasks
- [ ] Admin can edit any task including completed/approved

### 2.3 Activity Visibility
- [ ] Activity log filters by `actor_id` for intern role
- [ ] Activity log shows all activities for admin/super_admin
- [ ] Activity types: task_create, task_update, task_archive, task_delete, comment_add

### 2.4 UI Enforcement
- [ ] Hide "Tạo" button for intern on Projects, Campaigns, Master Data pages
- [ ] Hide Edit/Delete/Archive buttons for intern on cards
- [ ] Show disabled state (not hidden) for actions intern cannot perform
- [ ] API routes return 403 for unauthorized actions

---

## Phase 3: Approval Workflow

**Goal:** Employee submits result → Admin reviews → Admin approves or requests revision.

### 3.1 Submission Flow
- [ ] Employee marks task as "Chờ duyệt" (review status)
- [ ] Employee attaches result URL or file via task detail page
- [ ] `submitted_at` timestamp recorded when status changes to review
- [ ] Notification sent to admin (or shown in notification bell)

### 3.2 Admin Review
- [ ] Admin sees all tasks in "Chờ duyệt" status
- [ ] Admin can approve: status → completed
- [ ] Admin can reject: status → "Cần sửa" (rework), with comment required
- [ ] Admin can add revision notes

### 3.3 Task Locking
- [ ] Completed/Approved tasks: edit button hidden, API rejects updates
- [ ] Exception: Super Admin can unlock and re-edit
- [ ] Lock enforcement on both API (`PUT /api/tasks/[id]`) and UI

### 3.4 Completion Validation
- [ ] Drag-to-complete on Kanban: show confirmation if no result attached
- [ ] Require at minimum one of: `published_url`, `output_links`, `content_body`, `submitted_at`

---

## Phase 4: Content Calendar

**Goal:** Real task calendar with full data integration.

### 4.1 Calendar Views
- [x] Default to current month (`new Date()` — no hardcoded month)
- [x] Month view: 6-row grid, events by date
- [x] Week view: 7-day grid centered on current date
- [x] Agenda/List view: chronological event list

### 4.2 Event Data
- [x] Load events from `getCalendarEvents()` — `pm_tasks` + `pm_campaigns`
- [x] Show `due_date` as production deadline event
- [x] Show `published_at` as publish schedule event
- [x] Show campaign `end_date` as campaign deadline event
- [x] Resolve assignee names from `admin_users` table
- [x] Show task type badge on event card

### 4.3 Event UI
- [x] Event card: task title, type badge, platform badge, assignee names (up to 2), status indicator
- [x] Overdue events: red highlight/border
- [x] Completed events: green highlight
- [x] Click event → TaskDetailDialog with "Mở task" link to `/tasks/[id]`

### 4.4 Calendar Filters
- [x] Event type toggles: Deadline / Đăng bài / Campaign deadline
- [x] Status filter from master data `task_status`
- [x] Platform filter from master data `channel`
- [ ] Assignee filter from `admin_users`
- [ ] Project filter from `pm_projects`
- [ ] Campaign filter from `pm_campaigns`

### 4.5 Summary Cards
- [x] Công việc tuần này — tasks with due/publish in current week
- [x] Chờ duyệt — tasks in review status, not yet published
- [x] Quá hạn — overdue tasks (past due_date, not completed)
- [x] Lên lịch tháng này — tasks with publish_date in current month

### 4.6 Month View Overflow
- [ ] Show max 3 events per day
- [ ] "+N thêm" button opens day detail drawer/modal
- [ ] Day detail shows all events for that date

---

## Phase 5: Media Workflow

**Goal:** Workflow generation tied to task type config, not duplicated.

### 5.1 Workflow Triggering
- [ ] Only task types with `createWorkflow = true` in `pm_master_data.metadata` generate `pm_workflows`
- [ ] Task type "Article" (createWorkflow=true) → generates workflow steps
- [ ] Task type "Idea" (createWorkflow=false) → no workflow created

### 5.2 Workflow ↔ Task Sync
- [ ] When task status changes → workflow status auto-updates
- [ ] When task is archived → workflow is archived
- [ ] When task is deleted → workflow is deleted (cascade)
- [ ] Workflow `platform_ids` synced from task `metadata.platform_ids`

### 5.3 Task/Workflow Counting
- [ ] Dashboard metrics count tasks only (not workflows)
- [ ] Media Workflow page shows workflows separately from tasks
- [ ] Avoid double-counting in stats widgets

### 5.4 Workflow Board
- [ ] Media Workflow Kanban board uses separate workflow data
- [ ] Filter by task type, platform, assignee
- [ ] Click workflow card → links to parent task `/tasks/[id]`

---

## Dependency Order

```
Phase 1 (Stabilize)  →  Phase 2 (Permissions)  →  Phase 3 (Approval)  →  Phase 4 (Calendar)  →  Phase 5 (Workflow)
       ↑                         ↑
       └─────────────────────────┘
         (both depend on Phase 1)
```
