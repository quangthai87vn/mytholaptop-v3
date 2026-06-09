-- ============================================================
-- Migration: 027b_sync_pm_task_contents.sql
-- Phase: Workspace Phase 3 Final QA
-- Date: 2026-05-30
-- Purpose: Backfill pm_task_contents from existing pm_tasks content fields
-- Safe: Uses ON CONFLICT DO NOTHING to avoid duplicates
-- Idempotent: Can be run multiple times safely
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- STEP 1: Count before
-- ──────────────────────────────────────────────────────────

DO $$
DECLARE
    v_total_tasks INTEGER;
    v_with_content INTEGER;
    v_in_contents INTEGER;
    v_orphan INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_tasks FROM pm_tasks;
    SELECT COUNT(*) INTO v_with_content FROM pm_tasks
        WHERE content_title IS NOT NULL
           OR content_body IS NOT NULL
           OR content_status IS NOT NULL;
    SELECT COUNT(*) INTO v_in_contents FROM pm_task_contents;
    v_orphan := v_with_content - v_in_contents;

    RAISE NOTICE 'BEFORE: pm_tasks total=%', v_total_tasks;
    RAISE NOTICE 'BEFORE: pm_tasks with content fields=%', v_with_content;
    RAISE NOTICE 'BEFORE: pm_task_contents rows=%', v_in_contents;
    RAISE NOTICE 'BEFORE: Orphan tasks (need backfill)=%', v_orphan;
END $$;

-- ──────────────────────────────────────────────────────────
-- STEP 2: Backfill - Create pm_task_contents from pm_tasks
-- ──────────────────────────────────────────────────────────
--
-- Strategy:
-- 1. Tasks that have content fields but no pm_task_contents row
--    → INSERT ... ON CONFLICT(task_id) DO NOTHING (safe)
-- 2. Tasks that have both pm_tasks content AND pm_task_contents row
--    → Update pm_task_contents from pm_tasks (sync latest values)
--
-- Fields mapped:
--   pm_tasks.content_title   → pm_task_contents.content_title
--   pm_tasks.content_body    → pm_task_contents.content_body
--   pm_tasks.content_status  → pm_task_contents.content_status
--   pm_tasks.description     → pm_task_contents.notes
--   pm_tasks.content_hook    → (not in pm_task_contents schema, skipped)
--   pm_tasks.content_goal    → (not in pm_task_contents schema, skipped)
--   pm_tasks.platform        → (not in pm_task_contents schema, skipped)
--   pm_tasks.call_to_action → (not in pm_task_contents schema, skipped)
--   pm_tasks.reference_links → (not in pm_task_contents schema, skipped)
--   pm_tasks.output_links    → (not in pm_task_contents schema, skipped)
--   pm_tasks.related_product → (not in pm_task_contents schema, skipped)
--

-- Insert missing rows (no conflict = no existing row)
INSERT INTO pm_task_contents (
    id,
    task_id,
    content_type,
    content_title,
    content_body,
    content_status,
    notes,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    t.id,
    COALESCE(t.task_type, 'article'),
    t.content_title,
    t.content_body,
    COALESCE(t.content_status, 'draft'),
    t.description,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM pm_tasks t
WHERE
    -- Task has at least one content field populated
    (t.content_title IS NOT NULL OR t.content_body IS NOT NULL)
    -- Task does NOT already have a pm_task_contents row
    AND NOT EXISTS (
        SELECT 1 FROM pm_task_contents c WHERE c.task_id = t.id
    )
ON CONFLICT (task_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- STEP 3: Sync existing pm_task_contents from pm_tasks
-- Update pm_task_contents where pm_tasks has newer/updated values
-- ──────────────────────────────────────────────────────────

UPDATE pm_task_contents c
SET
    content_title = t.content_title,
    content_body = t.content_body,
    content_status = COALESCE(t.content_status, c.content_status),
    notes = COALESCE(t.description, c.notes),
    updated_at = CURRENT_TIMESTAMP
FROM pm_tasks t
WHERE
    t.id = c.task_id
    AND (
        t.content_title IS DISTINCT FROM c.content_title
        OR t.content_body IS DISTINCT FROM c.content_body
        OR COALESCE(t.content_status, 'draft') IS DISTINCT FROM c.content_status
        OR t.description IS DISTINCT FROM c.notes
    );

-- ──────────────────────────────────────────────────────────
-- STEP 4: Verify counts after
-- ──────────────────────────────────────────────────────────

DO $$
DECLARE
    v_total_tasks INTEGER;
    v_with_content INTEGER;
    v_in_contents INTEGER;
    v_orphan INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_tasks FROM pm_tasks;
    SELECT COUNT(*) INTO v_with_content FROM pm_tasks
        WHERE content_title IS NOT NULL
           OR content_body IS NOT NULL
           OR content_status IS NOT NULL;
    SELECT COUNT(*) INTO v_in_contents FROM pm_task_contents;
    v_orphan := v_with_content - v_in_contents;

    RAISE NOTICE 'AFTER: pm_tasks total=%', v_total_tasks;
    RAISE NOTICE 'AFTER: pm_tasks with content fields=%', v_with_content;
    RAISE NOTICE 'AFTER: pm_task_contents rows=%', v_in_contents;
    RAISE NOTICE 'AFTER: Orphan tasks (should be 0)=%', v_orphan;

    IF v_orphan = 0 THEN
        RAISE NOTICE 'OK: All tasks with content have pm_task_contents rows';
    ELSE
        RAISE WARNING 'WARNING: % tasks still missing pm_task_contents rows', v_orphan;
    END IF;
END $$;

-- Log migration
INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
    'System',
    'migration',
    'system',
    NULL,
    '{"migration": "027b_sync_pm_task_contents", "description": "Backfill pm_task_contents from pm_tasks content fields. Creates missing rows and syncs existing rows."}'
);

COMMIT;
