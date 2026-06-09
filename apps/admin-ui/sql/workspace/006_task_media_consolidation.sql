-- ============================================================
-- Migration: Consolidate Media Workflow into Task
-- Adds task_type, platform, published_at, published_url to pm_tasks
-- Syncs existing pm_media_workflows data into pm_tasks
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/006_task_media_consolidation.sql
-- ============================================================

-- Step 1: Add new columns to pm_tasks
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT NULL;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS published_at TIMESTAMP DEFAULT NULL;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS published_url VARCHAR(1000) DEFAULT NULL;

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_pm_tasks_task_type ON pm_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_platform ON pm_tasks(platform);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_published_at ON pm_tasks(published_at);

-- Step 3: Sync data from pm_media_workflows into pm_tasks
-- Match by title and project_id/campaign_id
UPDATE pm_tasks t
SET
    task_type = mw.content_type,
    platform = mw.platform,
    published_at = mw.published_at,
    published_url = mw.published_url,
    -- Also sync stage/status if task stage is null
    stage = CASE
        WHEN t.stage IS NULL THEN mw.status::VARCHAR
        ELSE t.stage
    END
FROM pm_media_workflows mw
WHERE
    mw.title = t.title
    AND mw.project_id IS NOT DISTINCT FROM t.project_id
    AND mw.campaign_id IS NOT DISTINCT FROM t.campaign_id
    AND t.task_type IS NULL;

-- Step 4: Map old media_workflow stage values to new stage values
-- filming -> shooting (rename in the data)
UPDATE pm_tasks SET stage = 'shooting' WHERE stage = 'filming';

-- Step 5: Create a mapping view for reference
-- (Keep pm_media_workflows for backward compatibility until fully deprecated)

-- Step 6: Rename pm_tasks.stage column to workflow_stage (optional, keeps it clear)
-- Only rename if column exists and no critical dependencies
-- ALTER TABLE pm_tasks RENAME COLUMN stage TO workflow_stage;

-- Step 7: Add comment documenting the new fields
COMMENT ON COLUMN pm_tasks.task_type IS 'Content type: facebook_post, tiktok_video, youtube_video, seo_article, design_image, product_photo, livestream, other';
COMMENT ON COLUMN pm_tasks.platform IS 'Platform: facebook, tiktok, youtube, website, zalo, instagram';
COMMENT ON COLUMN pm_tasks.published_at IS 'Actual publish date of the content';
COMMENT ON COLUMN pm_tasks.published_url IS 'URL where the content was published';

-- Step 8: Migrate pm_ai_suggestions task_id if not already set
-- Some ai_suggestions may reference workflows but not tasks
-- We'll leave pm_ai_suggestions as-is for now (it already has task_id FK)

-- Step 9: Ensure pm_status_history logs project/campaign changes
-- (Already works via pm_status_history entity_type/entity_id)
