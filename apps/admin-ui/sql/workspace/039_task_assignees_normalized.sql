-- ============================================================
-- Migration: Task Assignees Normalization
-- Date: 2026-06-03
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/039_task_assignees_normalized.sql
-- ============================================================
-- Purpose: Replace pm_tasks.assignee_ids (UUID[] array) with a
-- normalized pm_task_assignees junction table for reliable N:M
-- task-user assignment. Keeps assignee_ids[] as a computed
-- backward-compatible column via triggers.
-- ============================================================

-- ── Step 1: Create the normalized junction table ─────────────────

CREATE TABLE IF NOT EXISTS pm_task_assignees (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID, -- who made the assignment
    UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_task_assignees_task ON pm_task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_assignees_user ON pm_task_assignees(user_id);

-- ── Step 2: Migrate existing assignee_ids[] → pm_task_assignees ──

-- Backfill from existing pm_tasks.assignee_ids
INSERT INTO pm_task_assignees (task_id, user_id, assigned_at, assigned_by)
SELECT
    t.id AS task_id,
    u.id AS user_id,
    t.created_at AS assigned_at,
    NULL::UUID AS assigned_by
FROM pm_tasks t
CROSS JOIN LATERAL unnest(t.assignee_ids) WITH ORDINALITY AS a(assignee_uuid, ord)
JOIN admin_users u ON u.id = a.assignee_uuid::UUID
ON CONFLICT (task_id, user_id) DO NOTHING;

-- ── Step 3: Keep assignee_ids[] in sync with pm_task_assignees ──

-- Function: recompute assignee_ids[] from pm_task_assignees
CREATE OR REPLACE FUNCTION sync_task_assignee_ids()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pm_tasks
        SET assignee_ids = (
            SELECT COALESCE(ARRAY_AGG(user_id ORDER BY assigned_at), '{}'::UUID[])
            FROM pm_task_assignees
            WHERE task_id = NEW.task_id
        )
        WHERE id = NEW.task_id;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pm_tasks
        SET assignee_ids = (
            SELECT COALESCE(ARRAY_AGG(user_id ORDER BY assigned_at), '{}'::UUID[])
            FROM pm_task_assignees
            WHERE task_id = OLD.task_id
        )
        WHERE id = OLD.task_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: after INSERT on pm_task_assignees → update pm_tasks.assignee_ids
DROP TRIGGER IF EXISTS trg_sync_task_assignees_insert ON pm_task_assignees;
CREATE TRIGGER trg_sync_task_assignees_insert
    AFTER INSERT ON pm_task_assignees
    FOR EACH ROW EXECUTE FUNCTION sync_task_assignee_ids();

-- Trigger: after DELETE on pm_task_assignees → update pm_tasks.assignee_ids
DROP TRIGGER IF EXISTS trg_sync_task_assignees_delete ON pm_task_assignees;
CREATE TRIGGER trg_sync_task_assignees_delete
    AFTER DELETE ON pm_task_assignees
    FOR EACH ROW EXECUTE FUNCTION sync_task_assignee_ids();

-- Trigger: after UPDATE on pm_task_assignees (unlikely but handled)
DROP TRIGGER IF EXISTS trg_sync_task_assignees_update ON pm_task_assignees;
CREATE TRIGGER trg_sync_task_assignees_update
    AFTER UPDATE ON pm_task_assignees
    FOR EACH ROW EXECUTE FUNCTION sync_task_assignee_ids();

-- ── Step 4: Drop GIN index on assignee_ids (no longer the primary lookup) ──
-- Keep the column for backward-compat; index is still useful for filtering
-- CREATE INDEX IF NOT EXISTS idx_pm_tasks_assignee ON pm_tasks USING GIN(assignee_ids);

-- ── Step 5: Verify migration ──
DO $$
DECLARE
    total_tasks   INT;
    migrated_rows INT;
    orphaned      INT;
BEGIN
    SELECT COUNT(*) INTO total_tasks FROM pm_tasks WHERE assignee_ids != '{}';
    SELECT COUNT(*) INTO migrated_rows FROM pm_task_assignees;
    SELECT COUNT(*) INTO orphaned
    FROM pm_tasks t
    CROSS JOIN LATERAL unnest(t.assignee_ids) a(u)
    WHERE NOT EXISTS (
        SELECT 1 FROM pm_task_assignees ta
        WHERE ta.task_id = t.id AND ta.user_id = a.u::UUID
    );

    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  Tasks with assignees: %', total_tasks;
    RAISE NOTICE '  pm_task_assignees rows: %', migrated_rows;
    RAISE NOTICE '  Orphaned assignments (not migrated): %', orphaned;
END $$;
