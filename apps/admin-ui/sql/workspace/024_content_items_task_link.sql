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

DO $$ BEGIN
    ALTER TABLE content_items ADD COLUMN task_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

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
