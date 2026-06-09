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
