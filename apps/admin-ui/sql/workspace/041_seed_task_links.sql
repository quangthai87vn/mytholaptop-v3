-- ============================================================
-- Workspace Module: Seed data with platform link fields
-- Date: 2026-06-04
-- Purpose: Add YouTube/website/social links to existing tasks for UI testing
-- Run: npx tsx scripts/run-sql-migration.ts sql/workspace/041_seed_task_links.sql
-- ============================================================

-- Facebook link for PC Gaming content task
UPDATE pm_tasks SET facebook_url = 'https://www.facebook.com/mytholaptop.vn/posts/pc-gaming-15-tr'
WHERE id = '1db97814-ffcf-4aba-86f4-d697a7fac673';

-- YouTube link for laptop review task
UPDATE pm_tasks SET youtube_url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
WHERE id = '195bf0f3-946d-48b4-aaa7-9263a58dde34';

-- TikTok link for monitor product
UPDATE pm_tasks SET tiktok_url = 'https://www.tiktok.com/@mytholaptop/video/7512345678901'
WHERE id = '1f6d3e56-d2b0-4649-b3a3-9ab8e6e71cf2';

-- Website link for SSD product
UPDATE pm_tasks SET website_url = 'https://mytholaptop.vn/ssd-dahua-c900-plus-nvme'
WHERE id = 'ea30d8bb-627c-44ca-acb5-dec35100a1b9';

-- YouTube link for graphics card explainer
UPDATE pm_tasks SET youtube_url = 'https://youtu.be/dQw4w9WgXcQ'
WHERE id = '569f0802-7c59-4512-8ea5-4fa5050c69e9';

-- Website link for Windows installation guide
UPDATE pm_tasks SET website_url = 'https://mytholaptop.vn/cai-dat-windows-cho-laptop'
WHERE id = 'b09b6422-223b-43aa-b078-51fd8f989523';

-- YouTube + Website for AI image research task (multi-link)
UPDATE pm_tasks SET
  youtube_url = 'https://youtube.com/shorts/dQw4w9WgXcQ',
  website_url = 'https://mytholaptop.vn/nghien-cuu-chat-gpt-image'
WHERE id = '2ccbc5f9-ecf6-4e95-bbf4-f1a5bca79fdd';

-- Facebook link for computer basics task
UPDATE pm_tasks SET facebook_url = 'https://www.facebook.com/mytholaptop.vn/videos/may-tinh-co-ban'
WHERE id = 'd06cb553-4f11-4bb3-800a-6e0a34900a64';
