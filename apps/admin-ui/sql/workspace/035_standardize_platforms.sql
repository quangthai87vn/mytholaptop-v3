-- ============================================================
-- Migration 035: Standardize Platform Master Data
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/035_standardize_platforms.sql
-- ============================================================
-- Standardizes platform data in pm_master_data (channel category).
-- Platforms are the RELEASABLE CHANNELS where content is published.
-- NOT to be confused with task types (which define what KIND of content is created).
--
-- Platform list:
--   facebook   — Facebook / Fanpage
--   tiktok     — TikTok
--   youtube    — YouTube
--   website    — Website mytholaptop.vn
--   zalo       — Zalo OA
--   instagram  — Instagram
--   seo        — SEO content (no native channel, tracked separately)
-- ============================================================

BEGIN;

-- Step 1: Soft-delete old channel/platform rows
UPDATE pm_master_data
SET deleted_at = NOW(), is_active = FALSE
WHERE category = 'channel';

-- Step 2: Insert standardized platforms
INSERT INTO pm_master_data
  (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system, metadata)
VALUES
  ('channel', 'facebook', 'Facebook',
   'Bài viết, quảng cáo trên fanpage Mỹ Tho Laptop',
   '#1877f2', '#eff6ff', 'Facebook', 10, TRUE, FALSE,
   '{"platform_type": "social", "icon_url": null}'),

  ('channel', 'tiktok', 'TikTok',
   'Video ngắn TikTok Mỹ Tho Laptop',
   '#010101', '#f0f0f0', 'Video', 20, TRUE, FALSE,
   '{"platform_type": "video", "icon_url": null}'),

  ('channel', 'youtube', 'YouTube',
   'Video YouTube: review, unboxing, hướng dẫn',
   '#ff0000', '#fef2f2', 'Youtube', 30, TRUE, FALSE,
   '{"platform_type": "video", "icon_url": null}'),

  ('channel', 'website', 'Website',
   'Nội dung trên website mytholaptop.vn',
   '#22c55e', '#f0fdf4', 'Globe', 40, TRUE, FALSE,
   '{"platform_type": "web", "icon_url": null}'),

  ('channel', 'zalo', 'Zalo OA',
   'Tin nhắn, bài viết Zalo Official Account',
   '#0068ff', '#eff6ff', 'MessageSquare', 50, TRUE, FALSE,
   '{"platform_type": "social", "icon_url": null}'),

  ('channel', 'instagram', 'Instagram',
   'Bài viết, story, reel Instagram',
   '#e4405f', '#fdf2f8', 'Instagram', 60, TRUE, FALSE,
   '{"platform_type": "social", "icon_url": null}'),

  ('channel', 'seo', 'SEO',
   'Nội dung SEO (tracked separately, no native posting)',
   '#6b7280', '#f9fafb', 'Search', 70, TRUE, FALSE,
   '{"platform_type": "web", "icon_url": null}')
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

-- Step 3: Report
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT code, name, color,
           metadata->>'platform_type' AS platform_type
    FROM pm_master_data
    WHERE category = 'channel'
      AND deleted_at IS NULL
      AND is_active = TRUE
    ORDER BY sort_order
  LOOP
    RAISE NOTICE '[035] platform=% (%) color=% platform_type=%',
      r.code, r.name, r.color, r.platform_type;
  END LOOP;
END $$;

COMMIT;
