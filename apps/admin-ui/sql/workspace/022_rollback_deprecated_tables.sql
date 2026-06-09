-- ============================================================
-- Rollback: 022_rollback_deprecated_tables.sql
-- Date: 2026-05-28
-- Purpose: Restore pm_workflow_comments and pm_ai_suggestions
--
-- RESTORE pm_workflow_comments
--  → Data: 0 rows (table was empty)
--  → Schema from sql/workspace/003_media_workflow.sql
--
-- RESTORE pm_ai_suggestions
--  → Data: 0 rows (table was empty)
--  → Schema from sql/workspace/003_media_workflow.sql
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- Restore pm_workflow_comments schema (was empty, no data to restore)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_workflow_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    stage VARCHAR(50),
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_wf_comments_workflow ON pm_workflow_comments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pm_wf_comments_stage ON pm_workflow_comments(stage);

-- Restore data (was 0 rows)
INSERT INTO pm_workflow_comments
SELECT * FROM _backup_pm_workflow_comments
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- Restore pm_ai_suggestions schema (was empty, no data to restore)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    used BOOLEAN DEFAULT FALSE,
    ai_model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_workflow ON pm_ai_suggestions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_task ON pm_ai_suggestions(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_type ON pm_ai_suggestions(suggestion_type);

-- Restore data (was 0 rows)
INSERT INTO pm_ai_suggestions
SELECT * FROM _backup_pm_ai_suggestions
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- Verify restore
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'pm_workflow_comments'
  ) THEN
    RAISE EXCEPTION 'FAIL: pm_workflow_comments not restored';
  END IF;
  RAISE NOTICE 'OK: pm_workflow_comments restored';

  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE tablename = 'pm_ai_suggestions'
  ) THEN
    RAISE EXCEPTION 'FAIL: pm_ai_suggestions not restored';
  END IF;
  RAISE NOTICE 'OK: pm_ai_suggestions restored';
END $$;

COMMIT;
