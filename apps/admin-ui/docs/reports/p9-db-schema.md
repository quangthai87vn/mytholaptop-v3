# Phase 9: Database Schema — Task Checklist & Activity Timeline

**Phase:** P9.1 — Database Schema
**Date:** 2026-05-28
**Status:** IMPLEMENTED

---

## 1. Overview

This document defines the database schema additions for Phase 9. Two migrations are required:

| Migration | Purpose | Risk |
|-----------|---------|------|
| `023_task_checklist.sql` | Add `pm_task_checklist_items` table | LOW — new table, no existing data |
| `024_content_items_task_link.sql` | Link `content_items` to `pm_tasks` | LOW — nullable FK, no data loss |

---

## 2. Migration 023: Task Checklist

### 2.1 Schema

```sql
-- ============================================================
-- Migration: 023_task_checklist.sql
-- Purpose: Add checklist/sub-task support to pm_tasks
-- Author: Phase 9 Workspace Content Workflow
-- Date: 2026-05-28
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/023_task_checklist.sql
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- CHECKLIST ITEMS TABLE
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_task_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    sort_order INT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT checklist_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT checklist_title_length CHECK (LENGTH(title) <= 500)
);

-- ──────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_checklist_task_id ON pm_task_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completed ON pm_task_checklist_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_checklist_sort ON pm_task_checklist_items(task_id, sort_order);

-- ──────────────────────────────────────────────────────────
-- AUTO-UPDATE TRIGGER
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER update_pm_task_checklist_items_updated_at
        BEFORE UPDATE ON pm_task_checklist_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- VERIFICATION
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables WHERE tablename = 'pm_task_checklist_items'
    ) THEN
        RAISE NOTICE 'OK: pm_task_checklist_items created successfully';
    ELSE
        RAISE EXCEPTION 'FAIL: pm_task_checklist_items not created';
    END IF;
END $$;

COMMIT;
```

### 2.2 Table: `pm_task_checklist_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default gen_random_uuid() | Unique identifier |
| `task_id` | UUID | FK → pm_tasks(id), ON DELETE CASCADE | Parent task |
| `title` | VARCHAR(500) | NOT NULL, CHECK length > 0 | Checklist item text |
| `is_completed` | BOOLEAN | NOT NULL, DEFAULT FALSE | Completion status |
| `completed_by` | UUID | FK → admin_users(id), nullable | Who completed it |
| `completed_at` | TIMESTAMP | nullable | When it was completed |
| `sort_order` | INT | NOT NULL, DEFAULT 0 | Display order |
| `created_by` | UUID | FK → admin_users(id) | Who created it |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Indexes:**
- `idx_checklist_task_id` — fast lookup by task
- `idx_checklist_completed` — filter by completion status
- `idx_checklist_sort` — ordered retrieval per task

**Constraints:**
- `checklist_title_not_empty` — title must be non-empty after trim
- `checklist_title_length` — title max 500 chars

**Cascade delete:** When a task is deleted, all its checklist items are automatically deleted.

---

## 3. Migration 024: Content Items Task Link

### 3.1 Schema

```sql
-- ============================================================
-- Migration: 024_content_items_task_link.sql
-- Purpose: Link content_items to pm_tasks for Phase 9 workflow
-- Author: Phase 9 Workspace Content Workflow
-- Date: 2026-05-28
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/024_content_items_task_link.sql
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- ADD TASK_ID COLUMN TO CONTENT_ITEMS
-- ──────────────────────────────────────────────────────────

-- Add nullable task_id column if not exists
DO $$ BEGIN
    ALTER TABLE content_items ADD COLUMN task_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add FK constraint if not exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'content_items_task_id_fkey'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        ALTER TABLE content_items
            ADD CONSTRAINT content_items_task_id_fkey
            FOREIGN KEY (task_id) REFERENCES pm_tasks(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_content_items_task_id ON content_items(task_id);

-- ──────────────────────────────────────────────────────────
-- VERIFICATION
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content_items' AND column_name = 'task_id'
    ) THEN
        RAISE NOTICE 'OK: content_items.task_id column added';
    ELSE
        RAISE EXCEPTION 'FAIL: content_items.task_id column not added';
    END IF;
END $$;

COMMIT;
```

### 3.2 Column: `content_items.task_id`

| Property | Value |
|----------|-------|
| Type | UUID |
| Nullable | YES (backward compatible) |
| FK | `pm_tasks(id)` ON DELETE SET NULL |
| Index | `idx_content_items_task_id` |
| Migration | 024_content_items_task_link.sql |

---

## 4. TypeScript Type Definitions

### 4.1 Checklist Types

```typescript
// lib/workspace/types.ts

export interface TaskChecklistItem {
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

export interface TaskChecklistProgress {
  completed: number;
  total: number;
  percentage: number;
}
```

### 4.2 Extended Task Type

```typescript
// lib/workspace/types.ts — extend Task interface

export interface Task {
  // ... existing fields from pm_tasks
  id: string;
  title: string;
  description?: string;
  project_id?: string;
  campaign_id?: string;
  status: TaskStatus;
  priority: TaskPriority;
  stage?: string;
  task_type?: string;
  platform?: string;
  assignee_ids: string[];
  due_date?: string;
  tags: string[];
  attachments: TaskAttachment[];
  created_at: string;
  updated_at: string;

  // NEW: Checklist support
  checklist_items?: TaskChecklistItem[];
  checklist_progress?: TaskChecklistProgress;

  // NEW: Computed workflow stage label
  content_workflow_stage?: ContentWorkflowStage;
}

export type ContentWorkflowStage =
  | "draft"       // status=backlog + stage=idea
  | "review"      // status=in_progress + stage=review
  | "approved"    // status=in_progress + stage=scheduled + no published_at
  | "scheduled"   // status=in_progress + stage=scheduled + published_at set
  | "published";  // status=done + stage=published
```

### 4.3 Activity Types

```typescript
// lib/workspace/types.ts

export type TaskActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "stage_changed"
  | "assigned"
  | "unassigned"
  | "checklist_added"
  | "checklist_completed"
  | "checklist_uncompleted"
  | "checklist_deleted"
  | "commented"
  | "asset_added"
  | "asset_deleted"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "published";

export interface TaskActivityEntry {
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
```

---

## 5. Service Layer Functions

### 5.1 Checklist Functions

```typescript
// lib/workspace/db/index.ts additions

export interface CreateChecklistItemInput {
  title: string;
  sort_order?: number;
}

export interface UpdateChecklistItemInput {
  title?: string;
  is_completed?: boolean;
  sort_order?: number;
}

/**
 * Get all checklist items for a task, ordered by sort_order.
 */
export async function getTaskChecklist(
  taskId: string
): Promise<TaskChecklistItem[]> {
  const { rows } = await query<TaskChecklistItem>(
    `SELECT * FROM pm_task_checklist_items
     WHERE task_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [taskId]
  );
  return rows;
}

/**
 * Create a new checklist item.
 * Auto-assigns sort_order as max + 1 if not provided.
 */
export async function createChecklistItem(
  taskId: string,
  createdBy: string,
  input: CreateChecklistItemInput
): Promise<TaskChecklistItem> {
  // Get max sort_order if not provided
  let sortOrder = input.sort_order ?? 0;
  if (input.sort_order === undefined) {
    const res = await query<{ max: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM pm_task_checklist_items WHERE task_id = $1",
      [taskId]
    );
    sortOrder = res.rows[0].max;
  }

  const { rows } = await query<TaskChecklistItem>(
    `INSERT INTO pm_task_checklist_items (task_id, title, sort_order, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [taskId, input.title.trim(), sortOrder, createdBy]
  );
  return rows[0];
}

/**
 * Update a checklist item. Handles completion tracking.
 */
export async function updateChecklistItem(
  itemId: string,
  userId: string,
  input: UpdateChecklistItemInput
): Promise<TaskChecklistItem> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIdx++}`);
    params.push(input.title.trim());
  }
  if (input.is_completed !== undefined) {
    updates.push(`is_completed = $${paramIdx++}`);
    params.push(input.is_completed);
    if (input.is_completed) {
      updates.push(`completed_by = $${paramIdx++}`);
      params.push(userId);
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else {
      updates.push(`completed_by = NULL`);
      updates.push(`completed_at = NULL`);
    }
  }
  if (input.sort_order !== undefined) {
    updates.push(`sort_order = $${paramIdx++}`);
    params.push(input.sort_order);
  }

  params.push(itemId);
  const { rows } = await query<TaskChecklistItem>(
    `UPDATE pm_task_checklist_items
     SET ${updates.join(", ")}
     WHERE id = $${paramIdx}
     RETURNING *`,
    params
  );
  return rows[0];
}

/**
 * Delete a checklist item.
 */
export async function deleteChecklistItem(itemId: string): Promise<void> {
  await query("DELETE FROM pm_task_checklist_items WHERE id = $1", [itemId]);
}

/**
 * Bulk reorder checklist items. Updates sort_order for all items.
 */
export async function reorderChecklistItems(
  taskId: string,
  orderedItemIds: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedItemIds.length; i++) {
      await client.query(
        "UPDATE pm_task_checklist_items SET sort_order = $1 WHERE id = $2 AND task_id = $3",
        [i, orderedItemIds[i], taskId]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get checklist progress for a task (for Kanban card display).
 */
export async function getTaskChecklistProgress(
  taskId: string
): Promise<TaskChecklistProgress> {
  const { rows } = await query<{ total: string; completed: string }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_completed = TRUE)::int AS completed
     FROM pm_task_checklist_items
     WHERE task_id = $1`,
    [taskId]
  );
  const total = rows[0]?.total ?? 0;
  const completed = rows[0]?.completed ?? 0;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
```

### 5.2 Activity Log Functions

```typescript
// lib/workspace/db/index.ts additions

/**
 * Get per-task activity timeline (paginated).
 */
export async function getTaskActivity(
  taskId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<TaskActivityEntry>> {
  const offset = (page - 1) * pageSize;
  const countRes = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM pm_task_activities WHERE task_id = $1",
    [taskId]
  );
  const total = countRes.rows[0]?.count ?? 0;

  const { rows } = await pool.query<TaskActivityEntry>(
    `SELECT ta.*,
            COALESCE(au.full_name, ta.actor_id::text) AS actor_name
     FROM pm_task_activities ta
     LEFT JOIN admin_users au ON ta.actor_id = au.id
     WHERE ta.task_id = $1
     ORDER BY ta.created_at DESC
     LIMIT $2 OFFSET $3`,
    [taskId, pageSize, offset]
  );

  return { data: rows, total, page, pageSize };
}

/**
 * Write an activity entry. Call this inside mutation functions.
 */
export async function logTaskActivity(
  taskId: string,
  actorId: string,
  action: TaskActivityAction,
  details?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await query(
    `INSERT INTO pm_task_activities
       (task_id, actor_id, action, field_changed, old_value, new_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      taskId,
      actorId,
      action,
      details?.field ?? null,
      details?.oldValue ?? null,
      details?.newValue ?? null,
      details?.metadata ? JSON.stringify(details.metadata) : null,
    ]
  );
}
```

---

## 6. API Routes

### 6.1 Checklist API

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/tasks/[id]/checklist` | ✅ | `tasks.read` | List checklist items |
| POST | `/api/tasks/[id]/checklist` | ✅ | `tasks.update` | Add item |
| PUT | `/api/tasks/[id]/checklist/[itemId]` | ✅ | `tasks.update` | Update item |
| DELETE | `/api/tasks/[id]/checklist/[itemId]` | ✅ | `tasks.update` | Delete item |
| PATCH | `/api/tasks/[id]/checklist/reorder` | ✅ | `tasks.update` | Reorder items |

### 6.2 Activity API

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/tasks/[id]/activity` | ✅ | `tasks.read` | Get activity timeline |

---

## 7. Content Workflow Stage Mapping

The Phase 9 content workflow: `Draft → Review → Approved → Scheduled → Published`

This maps to existing `pm_tasks` columns:

| Human Stage | `pm_tasks.status` | `pm_tasks.workflow_stage` | `pm_tasks.published_at` | Notes |
|-------------|-------------------|--------------------------|------------------------|-------|
| Draft | `backlog` | `idea` | NULL | Initial state |
| Review | `in_progress` | `review` | NULL | Submitted for review |
| Approved | `in_progress` | `scheduled` | NULL | Approved, awaiting schedule |
| Scheduled | `in_progress` | `scheduled` | SET | Has publish date |
| Published | `done` | `published` | SET | Live |

This mapping is **computed in the TypeScript layer** — no DB changes needed.

```typescript
export function deriveContentWorkflowStage(task: Task): ContentWorkflowStage {
  if (task.status === "done" && task.stage === "published") {
    return "published";
  }
  if (task.stage === "scheduled" && task.published_at) {
    return "scheduled";
  }
  if (task.stage === "scheduled") {
    return "approved";
  }
  if (task.stage === "review") {
    return "review";
  }
  return "draft";
}
```

---

## 8. Index Strategy

### 8.1 New Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_checklist_task_id` | `pm_task_checklist_items` | `task_id` | Fast lookup by task |
| `idx_checklist_completed` | `pm_task_checklist_items` | `is_completed` | Filter by status |
| `idx_checklist_sort` | `pm_task_checklist_items` | `(task_id, sort_order)` | Ordered retrieval |
| `idx_content_items_task_id` | `content_items` | `task_id` | Link content to tasks |

### 8.2 Existing Indexes (verified)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_pm_tasks_project` | `pm_tasks` | `project_id` | Filter by project |
| `idx_pm_tasks_campaign` | `pm_tasks` | `campaign_id` | Filter by campaign |
| `idx_pm_tasks_assignees` | `pm_tasks` | `assignee_ids` | Unnest for assignee filter |
| `idx_pm_tasks_status` | `pm_tasks` | `status` | Kanban columns |
| `idx_pm_tasks_due_date` | `pm_tasks` | `due_date` | Calendar + overdue |
| `idx_pm_tasks_task_type` | `pm_tasks` | `task_type` | Content type filter |
| `idx_pm_media_task_id` | `pm_media_workflows` | `task_id` | Media → task link |
| `idx_activity_task_id` | `pm_task_activities` | `task_id` | Per-task activity |

---

## 9. Data Migration Notes

### 9.1 Checklist — Existing Tasks

All existing `pm_tasks` rows are unaffected by the new checklist table. The relationship is:
- `pm_tasks` → `pm_task_checklist_items` (1:N, optional)
- No existing task needs to be modified
- New checklist items can be added at any time

### 9.2 Content Items — Existing Records

All existing `content_items` rows have `task_id = NULL` initially. They can be linked:
- Manually via edit form
- Automatically if task title matches content item title (optional batch migration)
- No data loss on migration

---

## 10. Rollback Plan

### 10.1 Rollback 023 (Checklist)

```sql
-- Drop checklist table
DROP TABLE IF EXISTS pm_task_checklist_items;

-- Verify
SELECT COUNT(*) FROM pm_task_checklist_items;  -- should fail: relation does not exist
```

### 10.2 Rollback 024 (Content Link)

```sql
-- Remove FK constraint first
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_task_id_fkey;

-- Remove column
ALTER TABLE content_items DROP COLUMN IF EXISTS task_id;

-- Remove index
DROP INDEX IF EXISTS idx_content_items_task_id;

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'content_items' AND column_name = 'task_id';
-- should return 0 rows
```
