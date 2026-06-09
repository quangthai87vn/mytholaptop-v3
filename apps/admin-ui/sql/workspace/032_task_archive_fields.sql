-- ============================================================
-- Workspace Module Migration: Task Archive Fields
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/032_task_archive_fields.sql
-- ============================================================
-- Adds dedicated archive fields so "Huỷ" status and archive are SEPARATE concepts.
-- Previously: archive = status = 'cancelled'
-- Now: archive = is_archived = true (task hidden from active board but kept in DB)
--       cancelled = task was dragged to Huỷ column (still visible in active board)
-- ============================================================

-- 1. Add archive fields to pm_tasks
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_by_name VARCHAR(255);

-- 2. Backfill: set is_archived=true for all tasks currently marked as cancelled
-- This makes existing archived tasks still accessible via the "Đã lưu trữ" filter
UPDATE pm_tasks
SET
  is_archived = TRUE,
  archived_at = COALESCE(archived_at, updated_at),
  archived_by_name = 'System'
WHERE status = 'cancelled' AND is_archived = FALSE;

-- 3. Index for fast archive filter queries
CREATE INDEX IF NOT EXISTS idx_pm_tasks_archived ON pm_tasks(is_archived) WHERE is_archived = TRUE;

-- 4. Ensure pm_task_activities captures archive/restore actions
-- (table already exists; add columns if missing)
ALTER TABLE pm_task_activities
  ADD COLUMN IF NOT EXISTS is_archived_action BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN pm_tasks.is_archived IS 'TRUE = task is archived (hidden from active board, accessible via Đã lưu trữ filter)';
COMMENT ON COLUMN pm_tasks.archived_at IS 'Timestamp when the task was archived';
COMMENT ON COLUMN pm_tasks.archived_by IS 'User UUID who archived this task';
COMMENT ON COLUMN pm_tasks.archived_by_name IS 'User full name who archived this task';
