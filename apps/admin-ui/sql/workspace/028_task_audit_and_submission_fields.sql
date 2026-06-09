-- ============================================================
-- Migration: 028_task_audit_and_submission_fields.sql
-- Phase: Fix Task Edit UX and Save Behavior
-- Date: 2026-05-30
-- Purpose:
--   1. Add updated_by_user_id column for audit trail
--   2. Add content_status column for Phase 3 content workflow
--   3. Add completion_note column for employee submission results
-- Safe: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- Forward-only: No rollback of existing data
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- 1. updated_by_user_id — track who last updated each task
-- ──────────────────────────────────────────────────────────
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

COMMENT ON COLUMN pm_tasks.updated_by_user_id IS
  'UUID of the user who last updated this task. Used for audit trail.';

-- FK is optional — avoids circular reference issues if admin_users references pm_tasks
-- CREATE INDEX IF NOT EXISTS idx_pm_tasks_updated_by ON pm_tasks(updated_by_user_id);

-- ──────────────────────────────────────────────────────────
-- 2. content_status — independent content workflow status
-- ──────────────────────────────────────────────────────────
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS content_status VARCHAR(50)
  DEFAULT 'draft';

COMMENT ON COLUMN pm_tasks.content_status IS
  'Content production workflow status: draft, writing, internal_review, revision, approved, published';

ALTER TABLE pm_tasks
  ALTER COLUMN content_status
  DROP DEFAULT;

-- ──────────────────────────────────────────────────────────
-- 3. completion_note — employee submission results
-- ──────────────────────────────────────────────────────────
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS completion_note TEXT;

COMMENT ON COLUMN pm_tasks.completion_note IS
  'Employee submission note describing completed work, deviations from requirements, or drive links for original files';

-- ──────────────────────────────────────────────────────────
-- 4. Verify columns added
-- ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_col_updated_by BOOLEAN;
  v_col_content_status BOOLEAN;
  v_col_completion_note BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_tasks' AND column_name = 'updated_by_user_id'
  ) INTO v_col_updated_by;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_tasks' AND column_name = 'content_status'
  ) INTO v_col_content_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_tasks' AND column_name = 'completion_note'
  ) INTO v_col_completion_note;

  RAISE NOTICE 'Migration 028 complete:';
  RAISE NOTICE '  updated_by_user_id: %', v_col_updated_by;
  RAISE NOTICE '  content_status: %', v_col_content_status;
  RAISE NOTICE '  completion_note: %', v_col_completion_note;

  IF NOT (v_col_updated_by AND v_col_content_status AND v_col_completion_note) THEN
    RAISE WARNING 'Some columns were not added. Check for duplicates.';
  END IF;
END $$;

-- Log migration
INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
  'System',
  'migration',
  'system',
  NULL,
  '{"migration": "028_task_audit_and_submission_fields", "description": "Add updated_by_user_id, content_status, and completion_note columns to pm_tasks for Phase 3 UX fix."}'
)
ON CONFLICT DO NOTHING;

COMMIT;
