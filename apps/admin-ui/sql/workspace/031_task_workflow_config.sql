-- Migration 031: Workflow auto-generation for task types
-- Adds:
--   1. metadata JSONB column to pm_master_data for task_type workflow config
--   2. pm_workflows table (new, separate from deprecated pm_media_workflows)
--   3. workflow_id column to pm_tasks (FK, 1:1 with task)
--   4. Seed task_type items with creates_workflow config

-- ── 1. Add metadata column to pm_master_data ─────────────────────────

ALTER TABLE pm_master_data
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN pm_master_data.metadata IS
  'JSONB config for task_type items: { "creates_workflow": true, "workflow_type": "tiktok_video" }';

-- ── 2. Create pm_workflows table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type and identity
  workflow_type VARCHAR(50) NOT NULL,
  -- References the pm_tasks row that owns this workflow (1:1)
  task_id UUID UNIQUE REFERENCES pm_tasks(id) ON DELETE CASCADE,

  -- Workflow content (mirrors task content fields for production tracking)
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content_title VARCHAR(500),
  content_hook TEXT,
  content_goal VARCHAR(100),
  related_product VARCHAR(500),
  content_body TEXT,
  call_to_action VARCHAR(500),
  reference_links TEXT[],

  -- Publishing info
  platform VARCHAR(50),
  published_url VARCHAR(1000),
  published_at TIMESTAMPTZ,

  -- Workflow status (mirrors task status — task is source of truth)
  status VARCHAR(50) NOT NULL DEFAULT 'idea',
  progress INTEGER DEFAULT 0,

  -- Ownership
  project_id UUID, -- kept denormalized for easier queries
  campaign_id UUID,
  assignee_ids UUID[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT pm_workflows_type_unique UNIQUE (task_id, workflow_type)
);

-- Index for fast lookup by task
CREATE INDEX IF NOT EXISTS pm_workflows_task_id_idx ON pm_workflows(task_id)
  WHERE deleted_at IS NULL;

-- Index for campaign-level workflow queries
CREATE INDEX IF NOT EXISTS pm_workflows_campaign_id_idx ON pm_workflows(campaign_id)
  WHERE deleted_at IS NULL AND campaign_id IS NOT NULL;

COMMENT ON TABLE pm_workflows IS
  'Content production workflow records auto-generated from tasks with creates_workflow=true task types.';

-- ── 3. Add workflow_id column to pm_tasks ────────────────────────────

ALTER TABLE pm_tasks
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES pm_workflows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pm_tasks_workflow_id_idx ON pm_tasks(workflow_id)
  WHERE workflow_id IS NOT NULL;

-- ── 4. Seed task_type items with workflow config ───────────────────

INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system, metadata)
VALUES
  -- Media/content production types → creates_workflow = true
  ('task_type', 'facebook_post', 'Bài Facebook',
   'Bài viết cho fanpage Mỹ Tho Laptop',
   '#3b82f6', '#eff6ff', 'Facebook', 10, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "facebook_post"}'),

  ('task_type', 'seo_article', 'Bài SEO',
   'Bài viết SEO website mytholaptop.vn',
   '#22c55e', '#f0fdf4', 'Globe', 11, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "seo_article"}'),

  ('task_type', 'tiktok_video', 'Video TikTok',
   'Video ngắn cho TikTok Mỹ Tho Laptop',
   '#ec4899', '#fdf2f8', 'Video', 12, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "tiktok_video"}'),

  ('task_type', 'youtube_video', 'Video YouTube',
   'Video YouTube (review, unboxing, hướng dẫn)',
   '#ef4444', '#fef2f2', 'Youtube', 13, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "youtube_video"}'),

  ('task_type', 'design_image', 'Thiết kế hình ảnh',
   'Banner, poster, quảng cáo đồ họa',
   '#f97316', '#fff7ed', 'Paintbrush', 14, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "image_design"}'),

  ('task_type', 'product_photo', 'Chụp ảnh sản phẩm',
   'Ảnh chụp sản phẩm laptop, phụ kiện',
   '#eab308', '#fefce8', 'Camera', 15, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "product_photo"}'),

  ('task_type', 'livestream', 'Livestream',
   'Livestream bán hàng, review, Q&A',
   '#a855f7', '#faf5ff', 'Radio', 16, TRUE, FALSE,
   '{"creates_workflow": true, "workflow_type": "livestream"}'),

  ('task_type', 'other', 'Khác',
   'Loại công việc khác',
   '#6b7280', '#f9fafb', 'FileText', 90, TRUE, FALSE,
   '{"creates_workflow": false}'),

  -- Internal/non-media types → creates_workflow = false
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
   '{"creates_workflow": false}')
ON CONFLICT (category, code) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  bg_color = EXCLUDED.bg_color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;
