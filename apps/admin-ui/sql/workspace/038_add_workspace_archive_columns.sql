-- ============================================================
-- Migration: 038_add_workspace_archive_columns
-- Run: node lib/migration/run-038.js
--
-- Current DB state:
--   pm_tasks:    NO is_archived column  (migration 032 not applied)
--   pm_campaigns: NO deleted_at column
--   pm_projects: NO status column      (dropped per design; use deleted_at)
--
-- This migration:
--   1. Adds is_archived columns to pm_tasks
--   2. Adds deleted_at to pm_campaigns and pm_projects
--   3. Backfills: tasks with status='cancelled' → is_archived=true
--   4. Creates indexes for archive filtering
-- ============================================================
BEGIN;

-- ─────────────────────────────────────────
-- 1. pm_tasks: add is_archived
-- ─────────────────────────────────────────
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS archived_by_name VARCHAR(255);

-- ─────────────────────────────────────────
-- 2. pm_campaigns: add deleted_at
-- ─────────────────────────────────────────
ALTER TABLE pm_campaigns
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE pm_campaigns
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- 3. pm_projects: add deleted_at (no status column in this DB)
-- ─────────────────────────────────────────
ALTER TABLE pm_projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE pm_projects
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- 4. Backfill: existing 'cancelled' tasks → is_archived=true
-- ─────────────────────────────────────────
UPDATE pm_tasks
SET
  is_archived = TRUE,
  archived_at = COALESCE(archived_at, updated_at),
  archived_by_name = 'System'
WHERE status = 'cancelled' AND is_archived = FALSE;

-- ─────────────────────────────────────────
-- 5. Indexes for fast archive filtering
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_tasks_archived ON pm_tasks(is_archived) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_pm_tasks_archived_all ON pm_tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_pm_campaigns_deleted ON pm_campaigns(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_projects_deleted ON pm_projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- ─────────────────────────────────────────
-- 6. Log migration
-- ─────────────────────────────────────────
INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
  'System',
  'migration',
  'system',
  NULL,
  '{"migration": "038_add_workspace_archive_columns", "description": "Add is_archived to pm_tasks, deleted_at to pm_campaigns and pm_projects. pm_projects has no status column — archive uses deleted_at."}'
);

COMMIT;
