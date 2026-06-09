# Phase 9: Workspace Task & Content Workflow — Architecture Plan

**Phase:** P9 — Workspace Content & Task Workflow
**Date:** 2026-05-28
**Status:** PLANNING

---

## 1. Context

Phase 9 aims to transform the workspace from a dashboard-only system into a full **content production management platform** inspired by Notion/ClickUp. The foundation is already partially built:

| Module | DB | API | UI | Status |
|--------|----|----|----|--------|
| Projects | ✅ pm_projects | ✅ CRUD + search | ✅ List + detail | Working |
| Campaigns | ✅ pm_campaigns | ✅ CRUD + status history | ⚠️ List only (no detail page) | Working |
| Tasks | ✅ pm_tasks | ✅ CRUD + comments + assets + approvals | ✅ Kanban + Grid + Detail | Working |
| Content Items | ✅ content_items | ✅ CRUD + generate | ⚠️ Dashboard widget only | Working |
| Calendar | N/A (computed) | ✅ Calendar API | ✅ Calendar view | Working |
| Activity | N/A (view) | ✅ Activity API + export | ✅ Activity page | Working |
| KPI | N/A (computed) | ✅ KPI API | ✅ Dashboard widgets | Working |
| **Checklist** | ❌ Not in pm_tasks | ❌ | ❌ | **MISSING** |
| **Per-task Activity** | ⚠️ pm_task_activities (per task) | ⚠️ Basic activity | ❌ | **MISSING** |
| **Campaign Detail** | ✅ pm_campaigns | ✅ CRUD | ❌ (no `[id]` page) | **MISSING** |
| **Auth on GET routes** | — | ⚠️ Most GETs have no auth | — | Security gap |

---

## 2. Modules to Implement

### 2.1 Checklist System (NEW)

**Why new:** Phase 9 requires tasks to have sub-tasks/checklist items. The current `pm_tasks` schema has no checklist field. The Kanban UI and task detail UI both lack checklist support.

**Design:**

```
pm_task_checklist_items
├── id (PK, UUID)
├── task_id (FK → pm_tasks, ON DELETE CASCADE)
├── title (VARCHAR 500)
├── is_completed (BOOLEAN, default false)
├── completed_by (UUID → admin_users, nullable)
├── completed_at (TIMESTAMP, nullable)
├── sort_order (INT, default 0)
├── created_by (UUID → admin_users)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**API routes:**
- `GET /api/tasks/[id]/checklist` — list checklist items
- `POST /api/tasks/[id]/checklist` — add item
- `PUT /api/tasks/[id]/checklist/[itemId]` — update (title, is_completed, sort_order)
- `DELETE /api/tasks/[id]/checklist/[itemId]` — remove item
- `PATCH /api/tasks/[id]/checklist/reorder` — reorder items (bulk)

**Permissions:**
- `tasks.read` → view checklist
- `tasks.update` → add/edit/complete items
- Assignee can complete items on their own tasks

**UI locations:**
- `TaskDetailClient.tsx` — new "Checklist" tab or inline checklist below description
- `KanbanCard.tsx` — show checklist progress bar (X/Y completed)
- `TaskForm.tsx` — add checklist item when creating/editing task

---

### 2.2 Per-Task Activity Timeline (NEW)

**Why new:** `pm_task_activities` table exists and stores per-task audit events. But there is no UI to display it per-task. Activity is only visible in the global `/workspace/activity` page.

**Design:**

```typescript
interface TaskActivityEntry {
  id: string;
  task_id: string;
  actor_id: string;
  actor_name: string;
  action: "created" | "updated" | "status_changed" | "assigned" | "commented" | "approved" | "rejected" | "published" | "checklist_updated";
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}
```

**API route:**
- `GET /api/tasks/[id]/activity` — paginated activity timeline

**UI location:**
- `TaskDetailClient.tsx` — new "Hoạt động" (Activity) tab or collapsible timeline below task details
- Replace `window.location.reload()` in `ApprovalSection` with `router.refresh()` + appending new activity entry

**Audit log integration:**
- `writeAuditLog()` is already in `lib/workspace/db/index.ts` — use it for all mutations
- Activity entries should be written to `pm_task_activities` automatically via DB triggers or service-layer hooks

---

### 2.3 Campaign Detail Page (NEW)

**Why new:** `campaigns/[id]/route.ts` exists but `app/(admin)/campaigns/[id]/page.tsx` does not. Users can view campaign list but cannot drill into a campaign to see its tasks, content, and performance.

**UI structure:**
```
/campaigns/[id]
├── Header: name, type, status badge, dates, budget
├── Tabs:
│   ├── Tổng quan: description, target metrics, actual metrics, tags
│   ├── Công việc: task list filtered by campaign_id (Kanban or table)
│   ├── Nội dung: content items filtered by campaign
│   ├── Calendar: tasks + content for this campaign
│   └── Hoạt động: activity for this campaign's tasks
└── Stats bar: tasks by status, published content, engagement metrics
```

**API:** Reuse existing `getCampaigns({ campaign_id })` and `getTasks({ campaign_id })` from `lib/workspace/db`.

**Permissions:** `campaigns.read` (layout guard already exists).

---

### 2.4 Task Detail — Inline Edit (NEW)

**Why new:** Currently users can only edit tasks from the Kanban board (via modal). The task detail page has no edit capability.

**Implementation:** Add an "Edit" button to `TaskDetailClient.tsx` that opens the same `TaskForm` as a dialog. Or build a dedicated inline edit view in the "Chi tiết" tab.

**Permissions:** `tasks.update` required. Assignee can update checklist/completion on their own tasks.

---

### 2.5 Fix Broken ReplyForm in CommentSection

**Why:** `ReplyForm` in `comment-section.tsx` renders almost nothing — just a cancel button. Users cannot reply to comments.

**Fix:** Complete the `ReplyForm` component with textarea, submit/cancel buttons, and proper state management.

---

### 2.6 Fix Shared Dialog State in ApprovalSection

**Why:** `rejectReason` state is shared between reject and revision dialogs.

**Fix:** Separate state variables: `rejectReason` and `revisionNote`. Each dialog gets its own.

---

### 2.7 Replace window.location with router.refresh()

**Why:** `ApprovalSection` uses `window.location.reload()` after approval actions — blunt force refresh.

**Fix:** Use Next.js `router.refresh()` + optimistic state update to append the new activity entry.

---

## 3. Content Workflow Implementation

### 3.1 Content Pipeline

The existing `pm_tasks.status` uses:
- `backlog` → `todo` → `in_progress` → `done`

The existing `pm_tasks.workflow_stage` uses:
- `idea` → `writing` → `review` → `shooting` → `editing` → `scheduled` → `published`

**Phase 9 target content workflow:**
```
Draft → Review → Approved → Scheduled → Published
```

This maps to:
- `Draft` = `pm_tasks.status = backlog` + `workflow_stage = idea`
- `Review` = `pm_tasks.status = in_progress` + `workflow_stage = review`
- `Approved` = `pm_tasks.status = in_progress` + `workflow_stage = scheduled` (approved, waiting for publish)
- `Scheduled` = `pm_tasks.status = in_progress` + `workflow_stage = scheduled` + `published_at` set
- `Published` = `pm_tasks.status = done` + `workflow_stage = published`

**Action:** No DB schema change needed. Map the Phase 9 workflow labels to existing DB columns in the UI layer. Add `content_workflow_stage` computed field in `lib/workspace/types.ts` that derives the human-readable workflow stage from `status` + `workflow_stage` + `published_at`.

---

### 3.2 Content Item Integration

`content_items` table is separate from `pm_tasks`. For Phase 9, content items should be linked to tasks:

**Option A (recommended):** Add `task_id (FK → pm_tasks)` to `content_items` table.
**Option B:** Use `metadata.task_id` JSON field in `content_items.metadata`.

Recommendation: Option A (add `task_id` column) for proper relational integrity and easy queries.

```sql
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES pm_tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_content_items_task ON content_items(task_id);
```

---

## 4. RBAC Implementation Plan

### 4.1 Current Permission State

```typescript
// lib/auth/permissions.ts — current state
INTERN_DEFAULT_PERMISSIONS: [
  "projects.read", "campaigns.read", "tasks.read", "tasks.update",
  "content.read", "comments.read", "comments.create",
  "assets.read", "assets.create",
  "notifications.read", "ai_generate",
]
```

### 4.2 Phase 9 Required Permissions

| Permission | Intern | Editor | Viewer | Admin | Super Admin |
|------------|--------|--------|--------|-------|-------------|
| `projects.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `projects.create` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `projects.update` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `projects.delete` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `campaigns.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `campaigns.create` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `campaigns.update` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `campaigns.delete` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `tasks.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tasks.create` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `tasks.update` | ✅* | ✅ | ❌ | ✅ | ✅ |
| `tasks.delete` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `comments.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comments.create` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `comments.update` | ✅* | ✅ | ❌ | ✅ | ✅ |
| `comments.delete` | ✅* | ✅ | ❌ | ✅ | ✅ |
| `assets.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `assets.create` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `assets.delete` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `approvals.submit` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `approvals.approve` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `approvals.publish` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `content.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `content.create` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `content.update` | ✅* | ✅ | ❌ | ✅ | ✅ |
| `content.delete` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `checklist.manage` | ✅* | ✅ | ❌ | ✅ | ✅ |

*Assignee of the task can perform this action on their own tasks

### 4.3 Permission Enforcement Points

**API routes:**
- `POST /api/tasks/[id]/checklist` — `tasks.update`
- `PUT /api/tasks/[id]/checklist/[itemId]` — `tasks.update` OR assignee
- `DELETE /api/tasks/[id]/checklist/[itemId]` — `tasks.update` OR assignee
- `GET /api/tasks/[id]/activity` — `tasks.read`
- `POST /api/tasks/[id]/activity` — write-only, via other mutations
- `GET /api/campaigns/[id]` — `campaigns.read`
- `GET /api/campaigns/[id]/tasks` — `campaigns.read` + `tasks.read`

**UI:**
- `KanbanCard` — show checklist progress badge
- `TaskDetailClient` — edit button requires `tasks.update`; checklist tab requires `tasks.update`; activity tab requires `tasks.read`
- `TaskForm` — create button requires `tasks.create`; save requires `tasks.update`
- `ApprovalSection` — actions gated by role already
- `CommentSection` — edit/delete gated by role already
- `CampaignDetailPage` — read-only for `campaigns.read`; edit/delete for `campaigns.update`/`campaigns.delete`

---

## 5. API Auth Fix Plan

### 5.1 Critical Security Gap

Most LIST/GET endpoints lack authentication. Fix by adding `requireAdminAuth()` to all GET routes.

| Route | Current | Fix |
|-------|---------|-----|
| `GET /api/tasks` | No auth | Add `requireAdminAuth()` |
| `GET /api/tasks/[id]` | No auth | Add `requireAdminAuth()` |
| `GET /api/projects` | No auth | Add `requireAdminAuth()` |
| `GET /api/projects/[id]` | No auth | Add `requireAdminAuth()` |
| `GET /api/campaigns` | No auth | Add `requireAdminAuth()` |
| `GET /api/campaigns/[id]` | No auth | Add `requireAdminAuth()` |
| `GET /api/content/items` | No auth | Add `requireAdminAuth()` |
| `GET /api/content/items/[id]` | No auth | Add `requireAdminAuth()` |
| `GET /api/content/templates` | No auth | Add `requireAdminAuth()` |
| `GET /api/content/schedules` | No auth | Add `requireAdminAuth()` |
| `GET /api/content/stats` | No auth | Add `requireAdminAuth()` |

**Note:** Since the admin area is already protected by layout guards (session check), the practical risk is lower. But for defense in depth, all API routes should require authentication.

---

## 6. Database Schema Additions

### 6.1 New Tables

| Table | Purpose | Migration |
|-------|---------|-----------|
| `pm_task_checklist_items` | Sub-task/checklist items per task | `023_task_checklist.sql` |
| `content_items.task_id` (column) | Link content items to tasks | `023_content_items_task_link.sql` |

### 6.2 TypeScript Types

```typescript
// lib/workspace/types.ts additions
interface TaskChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Extend Task type
interface Task {
  // ... existing fields
  checklist_items?: TaskChecklistItem[];
  checklist_progress?: { completed: number; total: number };
}

// New types
interface TaskActivityEntry {
  id: string;
  task_id: string;
  actor_id: string;
  actor_name: string;
  action: TaskActivityAction;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

type TaskActivityAction =
  | "created" | "updated" | "status_changed"
  | "stage_changed" | "assigned" | "unassigned"
  | "checklist_added" | "checklist_completed" | "checklist_deleted"
  | "commented" | "approved" | "rejected" | "published";
```

---

## 7. Service Layer Additions

### 7.1 `lib/workspace/db/index.ts` additions

```typescript
// Checklist CRUD
export async function getTaskChecklist(taskId: string): Promise<TaskChecklistItem[]>
export async function createChecklistItem(taskId: string, data: CreateChecklistItemInput): Promise<TaskChecklistItem>
export async function updateChecklistItem(itemId: string, data: UpdateChecklistItemInput): Promise<TaskChecklistItem>
export async function deleteChecklistItem(itemId: string): Promise<void>
export async function reorderChecklistItems(taskId: string, itemIds: string[]): Promise<void>

// Per-task activity
export async function getTaskActivity(taskId: string, page?: number, pageSize?: number): Promise<PaginatedResult<TaskActivityEntry>>
export async function logTaskActivity(taskId: string, actorId: string, action: TaskActivityAction, data?: Record<string, unknown>): Promise<void>

// Activity auto-logging hooks (called from mutation functions)
function emitTaskActivity(taskId: string, actorId: string, action: TaskActivityAction, details?: { field?: string; old?: string; new?: string }): void
```

---

## 8. UI Implementation Plan

### 8.1 New UI Files

| File | Purpose |
|------|---------|
| `components/tasks/checklist-section.tsx` | Checklist display + CRUD |
| `components/tasks/task-activity-section.tsx` | Per-task activity timeline |
| `components/campaigns/campaign-detail-client.tsx` | Campaign detail tabs |
| `app/(admin)/campaigns/[id]/page.tsx` | Campaign detail page (server) |
| `app/(admin)/campaigns/[id]/layout.tsx` | Layout guard for campaigns |
| `components/tasks/task-edit-dialog.tsx` | Inline edit dialog for task detail |

### 8.2 Modified UI Files

| File | Changes |
|------|---------|
| `components/tasks/task-detail-client.tsx` | Add Checklist + Activity tabs |
| `components/kanban/kanban-card.tsx` | Add checklist progress bar |
| `components/tasks/comment-section.tsx` | Fix broken ReplyForm |
| `components/tasks/approval-section.tsx` | Separate dialog states, use router.refresh() |
| `components/tasks/task-form.tsx` | Add checklist item input |
| `components/projects/project-detail-client.tsx` | Fix unused `setEditing` state |

### 8.3 UI Design Direction

- **Checklist:** Notion-style bullet list with checkbox, progress bar in card header
- **Activity Timeline:** GitHub/Linear-style timeline with avatar, action description, timestamp
- **Campaign Detail:** ClickUp-style tabs with stats sidebar
- **Color palette:** Keep current Mỹ Tho Laptop brand colors (red primary, white, dark gray, tech blue accents)
- **Typography:** Keep current font stack (Inter/VN)

---

## 9. Seed Data Plan

### 9.1 Projects (2-3)

```json
[
  { "name": "Summer Sale 2026", "status": "active", "priority": "high", "color": "#e11d48" },
  { "name": "Tech Review Series", "status": "active", "priority": "medium", "color": "#2563eb" },
  { "name": "Back to School 2026", "status": "planning", "priority": "medium", "color": "#16a34a" }
]
```

### 9.2 Campaigns (3-4 per project)

```json
[
  { "name": "Laptop Gaming Summer", "type": "social_media", "status": "active" },
  { "name": "FB + TikTok Bundle", "type": "social_media", "status": "active" },
  { "name": "SEO Content Push", "type": "content", "status": "in_progress" }
]
```

### 9.3 Tasks (15-20 total, distributed across projects/campaigns)

```
backlog:     3 tasks
todo:        4 tasks
in_progress: 5 tasks (with various workflow_stages)
done:        5 tasks
```

Include tasks with:
- Checklist items (3-5 per task)
- Assignees (1-2 per task)
- Due dates (some overdue, some upcoming)
- Attachments (some with 1-2 assets)
- Comments (2-4 comments per task)

### 9.4 Content Items (10-15)

Linked to tasks, various statuses:
- 5 draft
- 3 in review
- 4 approved/scheduled
- 3 published

### 9.5 Sample Users

```json
[
  { "email": "admin@mtl.vn", "role": "super_admin", "full_name": "MTL Admin" },
  { "email": "bqt.001@mtl.vn", "role": "admin", "full_name": "Bùi Quang Thái" },
  { "email": "editor.001@mtl.vn", "role": "editor", "full_name": "Nguyễn Văn Minh" },
  { "email": "viewer.001@mtl.vn", "role": "viewer", "full_name": "Trần Thị Lan" },
  { "email": "intern.001@mtl.vn", "role": "intern", "full_name": "Lê Hoàng Nam" }
]
```

---

## 10. Execution Order

### Phase 9.1: DB Schema + Types
1. Create `023_task_checklist.sql`
2. Create `023_content_items_task_link.sql`
3. Add types to `lib/workspace/types.ts`
4. Add checklist + activity functions to `lib/workspace/db/index.ts`
5. TypeScript check

### Phase 9.2: API Routes
1. `GET/POST /api/tasks/[id]/checklist`
2. `PUT/DELETE /api/tasks/[id]/checklist/[itemId]`
3. `GET /api/tasks/[id]/activity`
4. Add auth to unprotected GET routes
5. TypeScript check

### Phase 9.3: UI — Checklist
1. `checklist-section.tsx`
2. Add to `TaskDetailClient.tsx`
3. Add checklist progress to `KanbanCard.tsx`
4. Add checklist input to `TaskForm.tsx`

### Phase 9.4: UI — Activity Timeline
1. `task-activity-section.tsx`
2. Add to `TaskDetailClient.tsx`
3. Fix `ApprovalSection` dialogs + router.refresh()
4. Fix broken `ReplyForm` in `CommentSection`

### Phase 9.5: Campaign Detail
1. `app/(admin)/campaigns/[id]/page.tsx`
2. `campaign-detail-client.tsx`
3. Tasks tab (filtered Kanban)
4. Content tab
5. Calendar tab

### Phase 9.6: Security + RBAC
1. Add `requireAdminAuth()` to all GET routes
2. Add permission checks to checklist API
3. Add permission checks to activity API
4. UI button visibility based on permissions

### Phase 9.7: Seed Data
1. Create `seed-workspace.js`
2. Run seed
3. Verify in UI

### Phase 9.8: Final Verification
1. TypeScript pass
2. Next.js Build pass
3. UI smoke test
4. Create reports

---

## 11. Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|-----------|
| Checklist schema change affects existing task UI | MEDIUM | Test with existing tasks; checklist is optional field |
| Activity log growth rate | LOW | Index on `task_id`, paginate, prune old entries |
| Breaking changes to task mutations | MEDIUM | Keep `pm_tasks` schema stable; only add columns |
| Duplicate workflow_stage vs status confusion | MEDIUM | Define clear mapping in types.ts; document in UI |
| GET routes breaking if auth added | LOW | These are admin-only routes; adding auth is safe |
