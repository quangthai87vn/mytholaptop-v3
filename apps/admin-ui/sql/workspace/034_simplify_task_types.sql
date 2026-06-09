-- ============================================================
-- Migration 034: Simplify Task Types
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/034_simplify_task_types.sql
-- ============================================================
-- Replaces the old granular task types with broad categories.
-- Old types → New types mapping:
--   facebook_post   → article   (creates_workflow=true)
--   seo_article    → article   (creates_workflow=true)
--   tiktok_video   → video     (creates_workflow=true)
--   youtube_video  → video     (creates_workflow=true)
--   design_image  → image     (creates_workflow=true)
--   product_photo → image     (creates_workflow=true)
--   livestream    → livestream(creates_workflow=true)
--   train         → train     (creates_workflow=false)
--   other         → other     (creates_workflow=false)
--   team_meeting  → team_meeting (creates_workflow=false)
--   inventory_check → inventory_check (creates_workflow=false)
--   technical_fix → technical_fix (creates_workflow=false)
--   product_data_entry → product_data_entry (creates_workflow=false)

BEGIN;

-- Step 1: Map existing task_type values in pm_tasks
UPDATE pm_tasks
SET task_type = CASE task_type
    WHEN 'facebook_post'   THEN 'article'
    WHEN 'seo_article'   THEN 'article'
    WHEN 'tiktok_video'  THEN 'video'
    WHEN 'youtube_video'  THEN 'video'
    WHEN 'design_image'  THEN 'image'
    WHEN 'product_photo' THEN 'image'
    ELSE task_type
  END
WHERE task_type IN (
  'facebook_post', 'seo_article',
  'tiktok_video', 'youtube_video',
  'design_image', 'product_photo'
);

-- Step 2: Soft-delete old task_type rows from pm_master_data
UPDATE pm_master_data
SET deleted_at = NOW(), is_active = FALSE
WHERE category = 'task_type'
  AND code IN (
    'facebook_post', 'seo_article',
    'tiktok_video', 'youtube_video',
    'design_image', 'product_photo'
  );

-- Step 3: Insert new simplified task types (only if not already present)
INSERT INTO pm_master_data
  (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system, metadata)
VALUES
  -- Content production types (creates_workflow = true)
  ('task_type', 'article', 'Bài viết',
   'Bài viết Facebook, SEO, blog, website',
   '#3b82f6', '#eff6ff', 'FileText', 10, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "article", "default_platform_ids": ["facebook", "website"]}'),

  ('task_type', 'video', 'Video',
   'Video TikTok, YouTube, video ngắn',
   '#ec4899', '#fdf2f8', 'Video', 11, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "video", "default_platform_ids": ["tiktok", "youtube"]}'),

  ('task_type', 'image', 'Hình ảnh',
   'Thiết kế đồ họa, chụp ảnh sản phẩm',
   '#f97316', '#fff7ed', 'Image', 12, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "image", "default_platform_ids": ["facebook", "website"]}'),

  ('task_type', 'livestream', 'Livestream',
   'Livestream bán hàng, review, Q&A',
   '#a855f7', '#faf5ff', 'Radio', 13, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "livestream", "default_platform_ids": ["facebook", "tiktok"]}'),

  -- Internal types (creates_workflow = false)
  ('task_type', 'train', 'Training',
   'Đào tạo nhân viên, quy trình nội bộ',
   '#8b5cf6', '#f5f3ff', 'GraduationCap', 20, TRUE, FALSE,
   '{"creates_workflow": false, "default_platform_ids": []}'),

  ('task_type', 'team_meeting', 'Họp team',
   'Cuộc họp, standup, planning',
   '#06b6d4', '#ecfeff', 'Users', 21, TRUE, FALSE,
   '{"creates_workflow": false, "default_platform_ids": []}'),

  ('task_type', 'inventory_check', 'Kiểm tra tồn kho',
   'Kiểm tra, đối soát hàng tồn kho',
   '#eab308', '#fefce8', 'ListTodo', 22, TRUE, FALSE,
   '{"creates_workflow": false, "default_platform_ids": []}'),

  ('task_type', 'technical_fix', 'Sửa lỗi website/app',
   'Fix bug, maintain hệ thống',
   '#ef4444', '#fef2f2', 'Server', 23, TRUE, FALSE,
   '{"creates_workflow": false, "default_platform_ids": []}'),

  ('task_type', 'product_data_entry', 'Nhập dữ liệu sản phẩm',
   'Nhập/import sản phẩm vào hệ thống',
   '#22c55e', '#f0fdf4', 'Database', 24, TRUE, FALSE,
   '{"creates_workflow": false, "default_platform_ids": []}'),

  ('task_type', 'other', 'Khác',
   'Loại công việc khác không thuộc danh mục trên',
   '#6b7280', '#f9fafb', 'MoreHorizontal', 99, TRUE, FALSE,
   '{"creates_workflow": false, "default_platform_ids": []}')
ON CONFLICT (category, code) DO UPDATE SET
  deleted_at = NULL,
  is_active = TRUE,
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- Step 4: Ensure all task_type rows have valid metadata
UPDATE pm_master_data
SET metadata = COALESCE(metadata, '{}'::jsonb)
WHERE category = 'task_type' AND (metadata IS NULL OR metadata = 'null'::jsonb);

-- Step 5: Report
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT code, name,
           (metadata->>'creates_workflow')::boolean AS creates_wf,
           metadata->>'default_platform_ids' AS platforms
    FROM pm_master_data
    WHERE category = 'task_type' AND deleted_at IS NULL AND is_active = TRUE
    ORDER BY sort_order
  LOOP
    RAISE NOTICE '[034] task_type=% (%) creates_workflow=% platforms=%',
      r.code, r.name, r.creates_wf, r.platforms;
  END LOOP;
END $$;

COMMIT;
