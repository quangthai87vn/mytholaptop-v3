-- ============================================================
-- Migration: Task Content Detail Fields
-- Add content production fields to pm_tasks table
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/005_task_content_fields.sql
-- ============================================================

BEGIN;

-- 1. Add content detail columns to pm_tasks
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_title TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_hook TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_goal VARCHAR(50);
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS related_product TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_body TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS call_to_action TEXT;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS reference_links TEXT[] DEFAULT '{}';
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS output_links TEXT[] DEFAULT '{}';

-- 2. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_pm_tasks_content_goal ON pm_tasks(content_goal);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_content_title ON pm_tasks USING GIN(to_tsvector('english', content_title));

-- 3. Add comment to table for documentation
COMMENT ON COLUMN pm_tasks.content_title IS 'Tieu de noi dung cu the (VD: Summer Sale 2026)';
COMMENT ON COLUMN pm_tasks.content_hook IS 'Cau mo dau hap dan (hook/cu-li)';
COMMENT ON COLUMN pm_tasks.content_goal IS 'Muc tieu noi dung: ban_hang, giao_duc, review, huong_dan, gioi_thieu, cham_soc';
COMMENT ON COLUMN pm_tasks.related_product IS 'San pham lien quan (ten/ID)';
COMMENT ON COLUMN pm_tasks.content_body IS 'Kich ban video / noi dung bai viet / yeu cau thiet ke';
COMMENT ON COLUMN pm_tasks.call_to_action IS 'Call to action (mua ngay, dang ky ngay,...)';
COMMENT ON COLUMN pm_tasks.reference_links IS 'Mang xa hoi tham chieu (URL)';
COMMENT ON COLUMN pm_tasks.output_links IS 'Link bai da xuat ban tren cac nentang';

COMMIT;
