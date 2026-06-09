-- ============================================================
-- Migration 036: Standardize Task Types + Multi-Platform Workflow
-- ============================================================
-- Mục tiêu:
--   1. Thêm cột platform_ids TEXT[] vào pm_workflows (lưu nhiều nền tảng)
--   2. Chuẩn hóa task_type trong pm_master_data từ platform-specific → broad types
--      Trước:  facebook_post, seo_article, tiktok_video, youtube_video,
--               design_image, product_photo
--      Sau:    article (Facebook, SEO), video (TikTok, YouTube),
--              image (thiết kế, chụp ảnh)
--   3. Map old task_type → new broad type trong pm_tasks (giữ nguyên data)
--   4. Gán default_platform_ids cho từng broad type
-- ============================================================
-- Chạy qua API:
--   POST /api/migration/run
--   Body: { "sql": "-- câu lệnh SQL ở đây" }
-- ============================================================
-- Lưu ý: Không dùng BEGIN/COMMIT — API đã tự wrap trong transaction.
-- ============================================================

-- ── 1. Thêm platform_ids vào pm_workflows ────────────────────────────
ALTER TABLE pm_workflows
  ADD COLUMN IF NOT EXISTS platform_ids TEXT[] DEFAULT '{}'::text[];

COMMENT ON COLUMN pm_workflows.platform_ids IS
  'Mảng các platform code từ pm_master_data (channel category) — hỗ trợ nhiều nền tảng.';

-- Sync existing workflows: chuyển platform (string đơn) → platform_ids (mảng)
UPDATE pm_workflows
SET platform_ids = ARRAY[platform]
WHERE platform IS NOT NULL
  AND platform != ''
  AND (platform_ids IS NULL OR array_length(platform_ids, 1) IS NULL);

-- ── 2. Soft-delete task_type cũ (platform-specific) ───────────────────
UPDATE pm_master_data
SET deleted_at = NOW(),
    is_active = FALSE
WHERE category = 'task_type'
  AND code IN (
    'facebook_post', 'seo_article',
    'tiktok_video', 'youtube_video',
    'design_image', 'product_photo'
  );

-- ── 3. Insert broad task_type mới ───────────────────────────────────
INSERT INTO pm_master_data
  (category, code, name, description, color, bg_color, icon, sort_order,
   is_active, is_system, metadata)
VALUES
  -- Content production types → creates_workflow = true
  ('task_type', 'article', 'Bài viết',
   'Bài viết cho Facebook, SEO, website, blog Mỹ Tho Laptop',
   '#3b82f6', '#eff6ff', 'FileText', 10, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "article", "default_platform_ids": ["facebook", "website", "seo"]}'),

  ('task_type', 'video', 'Video',
   'Video cho TikTok, YouTube, video ngắn',
   '#ec4899', '#fdf2f8', 'Video', 20, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "video", "default_platform_ids": ["tiktok", "youtube"]}'),

  ('task_type', 'image', 'Hình ảnh',
   'Thiết kế đồ họa, chụp ảnh sản phẩm',
   '#f97316', '#fff7ed', 'Image', 30, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "image", "default_platform_ids": ["facebook", "instagram"]}'),

  ('task_type', 'livestream', 'Livestream',
   'Livestream bán hàng, review, Q&A',
   '#a855f7', '#faf5ff', 'Radio', 40, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "livestream", "default_platform_ids": ["facebook", "youtube"]}'),

  -- Internal types → creates_workflow = false
  ('task_type', 'train', 'Training',
   'Đào tạo nhân viên, quy trình nội bộ',
   '#8b5cf6', '#f5f3ff', 'GraduationCap', 1, TRUE, FALSE,
   '{"creates_workflow": false}'),

  ('task_type', 'team_meeting', 'Họp team',
   'Cuộc họp, standup, planning',
   '#06b6d4', '#ecfeff', 'Users', 2, TRUE, FALSE,
   '{"creates_workflow": false}'),

  ('task_type', 'inventory_check', 'Kiểm tra tồn kho',
   'Kiểm tra, đối soát hàng tồn kho',
   '#eab308', '#fefce8', 'ListTodo', 3, TRUE, FALSE,
   '{"creates_workflow": false}'),

  ('task_type', 'technical_fix', 'Sửa lỗi website/app',
   'Fix bug, maintain hệ thống',
   '#ef4444', '#fef2f2', 'Server', 4, TRUE, FALSE,
   '{"creates_workflow": false}'),

  ('task_type', 'product_data_entry', 'Nhập dữ liệu sản phẩm',
   'Nhập/import sản phẩm vào hệ thống',
   '#22c55e', '#f0fdf4', 'Database', 5, TRUE, FALSE,
   '{"creates_workflow": false}'),

  ('task_type', 'other', 'Khác',
   'Loại công việc khác',
   '#6b7280', '#f9fafb', 'FileText', 90, TRUE, FALSE,
   '{"creates_workflow": false}')
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

-- ── 4. Map old task_type → broad type trong pm_tasks ────────────────
UPDATE pm_tasks SET task_type = 'article'
WHERE task_type IN ('facebook_post', 'seo_article')
  AND task_type IS NOT NULL;

UPDATE pm_tasks SET task_type = 'video'
WHERE task_type IN ('tiktok_video', 'youtube_video')
  AND task_type IS NOT NULL;

UPDATE pm_tasks SET task_type = 'image'
WHERE task_type IN ('design_image', 'product_photo')
  AND task_type IS NOT NULL;

-- ── 5. Sync platform_ids cho existing tasks ───────────────────────────
-- Gán metadata.platform_ids = ARRAY[platform] cho task đã có platform nhưng chưa có platform_ids
DO $$
BEGIN
  UPDATE pm_tasks
  SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{platform_ids}',
      to_jsonb(ARRAY[platform])
    )
  WHERE platform IS NOT NULL
    AND platform != ''
    AND (
      metadata IS NULL
      OR NOT (metadata ? 'platform_ids')
    );
END $$;
