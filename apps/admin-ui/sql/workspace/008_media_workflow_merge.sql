-- ============================================================
-- Migration: Media Workflow Merge (Full Package)
-- Combines: migration 006 (add columns) + task_id column + merge logic
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT
-- Run AFTER: 007_media_workflow_audit.sql
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/008_media_workflow_merge.sql
-- ============================================================
BEGIN;

-- ============================================================
-- PHASE 1: Add missing columns to pm_tasks
-- (Migration 006 - already documented but not yet applied on this DB)
-- ============================================================

DO $$ BEGIN
    ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS published_at TIMESTAMP DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS published_url VARCHAR(1000) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pm_tasks_task_type ON pm_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_platform ON pm_tasks(platform);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_published_at ON pm_tasks(published_at);

-- ============================================================
-- PHASE 2: Add task_id column to pm_media_workflows
-- (Link media workflows back to tasks after merge)
-- ============================================================

DO $$ BEGIN
    ALTER TABLE pm_media_workflows ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES pm_tasks(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pm_media_task_id ON pm_media_workflows(task_id);

-- ============================================================
-- PHASE 3: Helper function to merge one media workflow
-- ============================================================

CREATE OR REPLACE FUNCTION merge_media_workflow_to_task(p_workflow_id UUID)
RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
    v_workflow_record RECORD;
    v_status VARCHAR;
    v_stage VARCHAR;
BEGIN
    -- Get the media workflow record
    SELECT * INTO v_workflow_record
    FROM pm_media_workflows
    WHERE id = p_workflow_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Already merged?
    IF v_workflow_record.task_id IS NOT NULL THEN
        RETURN v_workflow_record.task_id;
    END IF;

    -- Determine stage mapping
    CASE v_workflow_record.status
        WHEN 'idea' THEN v_stage := 'idea';
        WHEN 'writing' THEN v_stage := 'writing';
        WHEN 'review' THEN v_stage := 'review';
        WHEN 'filming' THEN v_stage := 'shooting';
        WHEN 'shooting' THEN v_stage := 'shooting';
        WHEN 'editing' THEN v_stage := 'editing';
        WHEN 'scheduled' THEN v_stage := 'scheduled';
        WHEN 'published' THEN v_stage := 'published';
        WHEN 'archived' THEN v_stage := 'published';
        ELSE v_stage := v_workflow_record.status;
    END CASE;

    -- Determine Kanban status mapping
    IF v_workflow_record.status IN ('published', 'archived') THEN
        v_status := 'done';
    ELSIF v_workflow_record.status IN ('idea', 'writing', 'review', 'shooting', 'editing', 'filming', 'scheduled') THEN
        v_status := 'in_progress';
    ELSE
        v_status := 'todo';
    END IF;

    -- Try to find matching task by title + project_id + campaign_id
    SELECT t.id INTO v_task_id
    FROM pm_tasks t
    WHERE t.title = v_workflow_record.title
      AND t.project_id IS NOT DISTINCT FROM v_workflow_record.project_id
      AND t.campaign_id IS NOT DISTINCT FROM v_workflow_record.campaign_id
    LIMIT 1;

    IF v_task_id IS NOT NULL THEN
        -- Update existing task with media workflow data
        UPDATE pm_tasks SET
            task_type = v_workflow_record.content_type,
            platform = v_workflow_record.platform,
            published_at = v_workflow_record.published_at,
            published_url = v_workflow_record.published_url,
            stage = v_stage,
            status = CASE WHEN pm_tasks.status = 'backlog' THEN v_status ELSE pm_tasks.status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_task_id
          AND task_type IS NULL;

        UPDATE pm_media_workflows SET task_id = v_task_id WHERE id = p_workflow_id;
        RETURN v_task_id;
    ELSE
        -- Create new task
        INSERT INTO pm_tasks (
            project_id, campaign_id, title, description,
            status, priority, stage,
            task_type, platform,
            assignee_ids, due_date,
            tags, attachments, metadata,
            published_at, published_url
        ) VALUES (
            v_workflow_record.project_id,
            v_workflow_record.campaign_id,
            v_workflow_record.title,
            v_workflow_record.description,
            v_status,
            'medium',
            v_stage,
            v_workflow_record.content_type,
            v_workflow_record.platform,
            v_workflow_record.assignee_ids,
            v_workflow_record.due_date,
            v_workflow_record.tags,
            v_workflow_record.attachments,
            v_workflow_record.metadata,
            v_workflow_record.published_at,
            v_workflow_record.published_url
        )
        RETURNING id INTO v_task_id;

        UPDATE pm_media_workflows SET task_id = v_task_id WHERE id = p_workflow_id;
        RETURN v_task_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 4: Sync existing tasks (from migration 006) that have task_type
-- Map filming -> shooting for existing tasks
-- ============================================================

UPDATE pm_tasks SET stage = 'shooting' WHERE stage = 'filming';

-- Sync task_type, platform, published_at, published_url from matching media workflows
UPDATE pm_tasks t SET
    task_type = mw.content_type,
    platform = mw.platform,
    published_at = mw.published_at,
    published_url = mw.published_url,
    stage = CASE
        WHEN mw.status = 'filming' THEN 'shooting'
        WHEN mw.status = 'archived' THEN 'published'
        ELSE mw.status
    END,
    updated_at = CURRENT_TIMESTAMP
FROM pm_media_workflows mw
WHERE mw.title = t.title
  AND mw.project_id IS NOT DISTINCT FROM t.project_id
  AND mw.campaign_id IS NOT DISTINCT FROM t.campaign_id
  AND t.task_type IS NULL;

-- ============================================================
-- PHASE 5: Merge ALL media workflows without task_id
-- ============================================================

DO $$
DECLARE
    mw RECORD;
    merged_count INT := 0;
BEGIN
    FOR mw IN SELECT id FROM pm_media_workflows WHERE task_id IS NULL LOOP
        PERFORM merge_media_workflow_to_task(mw.id);
        merged_count := merged_count + 1;
    END LOOP;
    RAISE NOTICE 'Merged % media workflows into tasks', merged_count;
END $$;

-- ============================================================
-- PHASE 6: Update pm_ai_suggestions.task_id from workflow_id
-- ============================================================

UPDATE pm_ai_suggestions s SET
    task_id = mw.task_id
FROM pm_media_workflows mw
WHERE s.workflow_id = mw.id
  AND s.task_id IS NULL
  AND mw.task_id IS NOT NULL;

-- ============================================================
-- PHASE 7: Documentation comments
-- ============================================================

COMMENT ON COLUMN pm_tasks.task_type IS
    'Content type for media tasks: facebook_post, tiktok_video, youtube_video, seo_article, design_image, product_photo, livestream, other. Migrated from pm_media_workflows.';
COMMENT ON COLUMN pm_tasks.platform IS
    'Platform: facebook, tiktok, youtube, website, zalo, instagram. Migrated from pm_media_workflows.';
COMMENT ON COLUMN pm_tasks.published_at IS
    'Actual publish date. Migrated from pm_media_workflows.';
COMMENT ON COLUMN pm_tasks.published_url IS
    'URL where content was published. Migrated from pm_media_workflows.';
COMMENT ON COLUMN pm_media_workflows.task_id IS
    'Links to pm_tasks.id. Set during migration 008. DO NOT DELETE after migration.';
COMMENT ON COLUMN pm_tasks.stage IS
    'Media workflow stage: idea, writing, review, shooting, editing, scheduled, published.';

COMMIT;
