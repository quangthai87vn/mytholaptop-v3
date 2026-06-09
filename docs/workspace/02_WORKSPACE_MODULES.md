# 02_WORKSPACE_MODULES.md

## Module Overview

### 1. Projects

**Path:** `app/(admin)/projects/`, `components/projects/`

**Database table:** `pm_projects`

**Operations:**
- Create, Read, Update, Archive, Delete
- Archive is soft-delete (`deleted_at`)

**UI Components:**
- Project list (`ProjectList.tsx`)
- Project card (`ProjectCard.tsx`)
- Project form dialog (`ProjectForm.tsx`)
- Project detail page (`projects/[id]/page.tsx`)

**Key fields:** `id`, `name`, `description`, `status`, `start_date`, `end_date`, `created_by`, `created_at`

---

### 2. Campaigns

**Path:** `app/(admin)/campaigns/`, `components/campaigns/`

**Database table:** `pm_campaigns`

**Operations:**
- Create, Read, Update, Archive, Delete
- Joined with `pm_projects` for project name

**UI Components:**
- Campaign list (`CampaignList.tsx`, `CampaignGrid.tsx`)
- Campaign card (`CampaignCard.tsx`)
- Campaign form dialog (`CampaignForm.tsx`)

**Key fields:** `id`, `project_id`, `name`, `campaign_type`, `status`, `start_date`, `end_date`, `created_by`

---

### 3. Tasks / Workspace Board

**Path:** `app/(admin)/tasks/`, `components/tasks/`, `components/kanban/`

**Database table:** `pm_tasks`

**Canonical page:** `/tasks` is the official Workspace > Công việc page.

**Operations:**
- Create, Read, Update, Archive, Restore, Copy, Delete
- Status update via Kanban drag/drop
- Checklist management (Phase 9)

**Kanban Board:** `components/kanban/kanban-board.tsx`
- Single Kanban board implementation shared by Workspace views
- `KanbanColumn` renders a column with scroll area
- `TaskKanbanCard` renders the actionable card for tasks
- `WorkflowCard` remains available only as a deprecated view style reference

**Key fields:**
```
id, title, description, project_id, campaign_id,
task_type, status, priority,
due_date, published_at,
assignee_ids (array), platform (single - DEPRECATED),
metadata (JSONB) — contains platform_ids array, tags array
is_archived, created_by, created_at, updated_at
```

**Task detail page:** `tasks/[id]/page.tsx`
- Shows full task info
- Sections: checklist, comments, approvals, assets, activity

**UI Components:**
- Tasks Kanban (`tasks-client.tsx` → `KanbanBoard`)
- Task form dialog (`TaskForm.tsx`)
- Task detail page (`TaskDetailClient.tsx`)
- Kanban cards and menu components in `components/workspace/tasks/`

---

### 4. Calendar

**Path:** `app/(admin)/workspace/calendar/`, `app/(admin)/calendar/`

**API:** `app/api/calendar/route.ts`

**Database functions:** `getCalendarEvents()`, `getCalendarStats()`

**Views:** Month, Week, Agenda (custom CSS grid — no external library)

**Stats:**
- Công việc tuần này: tasks due/publish this week
- Chờ duyệt: tasks in review status, not published
- Quá hạn: overdue (past due_date, not completed)
- Lên lịch tháng này: tasks with publish_date in current month

**Events:**
- Production deadline (from `due_date`)
- Publish schedule (from `published_at`)
- Campaign deadline (from `end_date`)

---

### 5. Master Data

**Path:** `app/(admin)/workspace/master-data/`

**Database table:** `pm_master_data`

**Categories:** `task_status`, `task_type`, `channel`, `campaign_type`, `campaign_status`, `workflow_stage`

**Operations:**
- Create, Read, Update, Soft-delete, Restore
- System items (status values) cannot be deleted
- Sort order management

**UI:** Master data CRUD page with category tabs

---

### 6. Activity Log

**Path:** `app/(admin)/workspace/activity/`, `app/api/activity/`

**Database table/view:** `pm_task_activities`, `v_workspace_activities`

**Operations:**
- Read (paginated, filtered by date, actor, action type)
- Export to CSV

**Tracked actions:** task_create, task_update, task_archive, task_delete, comment_add, status_change

---

### 7. Interns & Workspace Members

**Path:** `app/(admin)/workspace/members/`, `app/(admin)/staff/`

**Database tables:** `pm_interns`, `pm_intern_kpis`, `admin_users`

**Operations:**
- List interns with KPI data
- Weekly performance tracking
- Rankings

---

### 8. Media Workflow

**Path:** `app/(admin)/media-workflow/`

**Status:** Deprecated.

**Notes:**
- `/media-workflow` is no longer the main task surface.
- Use `/tasks` as the canonical Workspace board.
- Keep the route only as a temporary redirect during transition.

---

### Module Dependencies

```
Projects ─────────────┐
                     ├── Campaigns ── Tasks ── Checklist
Master Data ──────────┼── Kanban ─── Calendar
                     │
Interns ─────────────┘── Activity Log
```
