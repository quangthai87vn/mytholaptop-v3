-- ============================================================
-- Migration: 022_drop_deprecated_tables.sql
-- Date: 2026-05-28
-- Context: P8.2.3 — Drop confirmed deprecated workspace tables
--
-- SAFE TO DROP (verified):
--   - pm_workflow_comments: 0 rows, no code refs
--   - pm_ai_suggestions: 0 rows, no code refs
--
-- NOT DROPPING (has data or active code):
--   - pm_workflow_stages: 18 rows + FK from pm_media_workflows
--   - pm_media_workflows: 10 rows + active CRUD functions in lib/workspace/db
--
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/022_drop_deprecated_tables.sql
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- Step 1: Backup (save to JSON for rollback)
-- ──────────────────────────────────────────────────────────

-- pm_workflow_comments backup
CREATE TABLE IF NOT EXISTS _backup_pm_workflow_comments AS
SELECT * FROM pm_workflow_comments;

-- pm_ai_suggestions backup
CREATE TABLE IF NOT EXISTS _backup_pm_ai_suggestions AS
SELECT * FROM pm_ai_suggestions;

-- ──────────────────────────────────────────────────────────
-- Step 2: Drop tables
-- ──────────────────────────────────────────────────────────

-- Drop pm_workflow_comments (0 rows, no code refs, FK only from itself)
DROP TABLE IF EXISTS pm_workflow_comments;

-- Drop pm_ai_suggestions (0 rows, no code refs)
-- Note: has FK to pm_media_workflows and pm_tasks
DROP TABLE IF EXISTS pm_ai_suggestions;

-- ──────────────────────────────────────────────────────────
-- Step 3: Verify
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Confirm pm_workflow_comments is gone
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'pm_workflow_comments'
  ) THEN
    RAISE NOTICE 'OK: pm_workflow_comments dropped successfully';
  ELSE
    RAISE EXCEPTION 'FAIL: pm_workflow_comments still exists';
  END IF;

  -- Confirm pm_ai_suggestions is gone
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'pm_ai_suggestions'
  ) THEN
    RAISE NOTICE 'OK: pm_ai_suggestions dropped successfully';
  ELSE
    RAISE EXCEPTION 'FAIL: pm_ai_suggestions still exists';
  END IF;

  -- Confirm backup tables exist
  IF EXISTS (
    SELECT FROM pg_tables WHERE tablename = '_backup_pm_workflow_comments'
  ) THEN
    RAISE NOTICE 'OK: Backup table _backup_pm_workflow_comments created';
  ELSE
    RAISE EXCEPTION 'FAIL: Backup table _backup_pm_workflow_comments not created';
  END IF;

  IF EXISTS (
    SELECT FROM pg_tables WHERE tablename = '_backup_pm_ai_suggestions'
  ) THEN
    RAISE NOTICE 'OK: Backup table _backup_pm_ai_suggestions created';
  ELSE
    RAISE EXCEPTION 'FAIL: Backup table _backup_pm_ai_suggestions not created';
  END IF;
END $$;

COMMIT;
