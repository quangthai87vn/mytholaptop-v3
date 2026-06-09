-- ============================================================
-- Workspace Module Migration: Task Link Fields
-- Date: 2026-06-04
-- Adds 4 platform-specific link fields to pm_tasks
-- ============================================================

ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS facebook_url TEXT;

COMMENT ON COLUMN pm_tasks.website_url IS 'Link to published content on website';
COMMENT ON COLUMN pm_tasks.youtube_url IS 'Link to YouTube video or channel';
COMMENT ON COLUMN pm_tasks.tiktok_url IS 'Link to TikTok video or profile';
COMMENT ON COLUMN pm_tasks.facebook_url IS 'Link to Facebook post, page, or group';

CREATE INDEX IF NOT EXISTS idx_pm_tasks_website_url ON pm_tasks(website_url) WHERE website_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_tasks_youtube_url ON pm_tasks(youtube_url) WHERE youtube_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_tasks_tiktok_url ON pm_tasks(tiktok_url) WHERE tiktok_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_tasks_facebook_url ON pm_tasks(facebook_url) WHERE facebook_url IS NOT NULL;
