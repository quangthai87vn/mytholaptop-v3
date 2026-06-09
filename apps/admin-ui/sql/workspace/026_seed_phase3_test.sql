-- ============================================================
-- Seed: Workspace Phase 3 QA Test Data
-- Creates: 1 project, 1 campaign, 3 tasks with content
-- Date: 2026-05-30
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- PROJECT (pm_projects: no status/owner_id after 006 migration)
-- ──────────────────────────────────────────────────────────

INSERT INTO pm_projects (id, name, description, color, start_date, end_date, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111101',
    'Summer Sale 2026 Campaign',
    'Chiến dịch marketing Summer Sale 2026 cho Mỹ Tho Laptop',
    '#E60012',
    '2026-05-01',
    '2026-08-31',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- CAMPAIGN (pm_campaigns: no owner_id after 006 migration)
-- ──────────────────────────────────────────────────────────

INSERT INTO pm_campaigns (id, project_id, name, description, campaign_type, status, start_date, end_date, created_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Social Media Summer 2026',
    'Chiến dịch social media cho Summer Sale 2026',
    'social_media',
    'active',
    '2026-05-15',
    '2026-07-31',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- TASK 1: TikTok Video
-- ──────────────────────────────────────────────────────────

INSERT INTO pm_tasks (id, project_id, campaign_id, title, description, status, task_type, platform, assignee_ids, reporter_id, due_date, content_title, content_hook, content_goal, related_product, content_body, call_to_action, reference_links, output_links, content_status, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    'Tạo video TikTok giới thiệu Laptop Gaming',
    'Tạo video TikTok 30-60s giới thiệu dòng laptop gaming giảm giá Summer Sale',
    'working',
    'tiktok_video',
    'tiktok',
    ARRAY['5840ee12-7fd8-4060-8ed8-770535194c9c'::uuid],
    '0c06b1be-b682-4b8d-90f7-748df62d0ffa',
    '2026-06-15',
    'Summer Sale 2026 - Laptop Gaming Giá Sốc!',
    'Bạn có đang tìm laptop gaming giá hời không?',
    'ban_hang',
    'Laptop ASUS ROG Strix G16',
    E'0:00-0:05 - Mở đầu: "Đây là laptop gaming mà 90% gamer đều THÈM!"\n' ||
    E'0:05-0:15 - Giới thiệu: ASUS ROG Strix G16, RTX 4060, i7 13th\n' ||
    E'0:15-0:30 - Demo: chơi Genshin, Valorant mượt mà\n' ||
    E'0:30-0:45 - Highlight: Giảm 3 triệu + tặng chuột gaming\n' ||
    E'0:45-1:00 - CTA: "Mua ngay tại mietholaptop.vn!"',
    'Mua ngay tại mietholaptop.vn | Hotline: 0901 234 567',
    ARRAY['https://tiktok.com/@mitolaptop'],
    ARRAY[]::text[],
    'writing',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- pm_task_contents for TikTok task
INSERT INTO pm_task_contents (task_id, content_type, content_title, content_body, content_status, script, notes, created_by, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333301',
    'tiktok_video',
    'Summer Sale 2026 - Laptop Gaming Giá Sốc!',
    E'0:00-0:05 - Mở đầu: "Đây là laptop gaming mà 90% gamer đều THÈM!"\n' ||
    E'0:05-0:15 - Giới thiệu: ASUS ROG Strix G16, RTX 4060, i7 13th\n' ||
    E'0:15-0:30 - Demo: chơi Genshin, Valorant mượt mà\n' ||
    E'0:30-0:45 - Highlight: Giảm 3 triệu + tặng chuột gaming\n' ||
    E'0:45-1:00 - CTA: "Mua ngay tại mietholaptop.vn!"',
    'writing',
    E'0:00-0:05 - Mở đầu: "Đây là laptop gaming mà 90% gamer đều THÈM!"\n' ||
    E'0:05-0:15 - Giới thiệu: ASUS ROG Strix G16, RTX 4060, i7 13th\n' ||
    E'0:15-0:30 - Demo: chơi Genshin, Valorant mượt mà\n' ||
    E'0:30-0:45 - Highlight: Giảm 3 triệu + tặng chuột gaming\n' ||
    E'0:45-1:00 - CTA: "Mua ngay tại mietholaptop.vn!"',
    'Video TikTok 30-60s. Nhấn mạnh giá và tính năng gaming.',
    '0c06b1be-b682-4b8d-90f7-748df62d0ffa',
    NOW(),
    NOW()
) ON CONFLICT (task_id) DO NOTHING;

-- Checklist items for TikTok task
INSERT INTO pm_task_checklist_items (task_id, title, is_completed, completed_by, completed_at, sort_order, created_by, created_at, updated_at)
VALUES
    ('33333333-3333-3333-3333-333333333301', 'Viết kịch bản video', true, '5840ee12-7fd8-4060-8ed8-770535194c9c', NOW(), 1, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333301', 'Quay video sản phẩm', false, NULL, NULL, 2, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333301', 'Edit video và thêm nhạc', false, NULL, NULL, 3, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333301', 'Upload lên TikTok', false, NULL, NULL, 4, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- TASK 2: Facebook Post
-- ──────────────────────────────────────────────────────────

INSERT INTO pm_tasks (id, project_id, campaign_id, title, description, status, task_type, platform, assignee_ids, reporter_id, due_date, content_title, content_hook, content_goal, related_product, content_body, call_to_action, reference_links, output_links, content_status, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333302',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    'Viết bài Facebook về Summer Sale',
    'Viết bài Facebook post giới thiệu khuyến mãi Summer Sale 2026',
    'review',
    'facebook_post',
    'facebook',
    ARRAY['5840ee12-7fd8-4060-8ed8-770535194c9c'::uuid],
    '0c06b1be-b682-4b8d-90f7-748df62d0ffa',
    '2026-06-10',
    'MỪNG HÈ 2026 - GIẢM ĐẾN 5 TRIỆU CHO LAPTOP MỚI!',
    'Bạn đã sẵn sàng đón hè với laptop mới chưa?',
    'ban_hang',
    'Dell XPS 15, MacBook Air M3, ASUS ZenBook',
    E'🔥 SUMMER SALE 2026 ĐÃ CHÍNH THỨC CÓ MẶT TẠI MỸ THỌ LAPTOP!\n\n' ||
    E'🎁 Ưu đãi cực khủng:\n' ||
    E'• Laptop Gaming: Giảm đến 5 triệu\n' ||
    E'• Laptop văn phòng: Giảm đến 3 triệu\n' ||
    E'• Máy Mac: Giảm đến 4 triệu + quà tặng\n' ||
    E'• Phụ kiện: Giảm 20% toàn bộ\n\n' ||
    E'⏰ Đến 31/07/2026\n' ||
    E'🏪 Mỹ Tho Laptop - Địa chỉ tin cậy',
    'Mua ngay tại Mỹ Tho Laptop | Hotline: 0901 234 567 | Địa chỉ: 123 Nguyễn Trãi, TP. Mỹ Tho',
    ARRAY['https://facebook.com/mitholaptop'],
    ARRAY[]::text[],
    'internal_review',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- pm_task_contents for Facebook task
INSERT INTO pm_task_contents (task_id, content_type, content_title, content_body, content_status, rich_text, notes, created_by, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333302',
    'facebook_post',
    'MỪNG HÈ 2026 - GIẢM ĐẾN 5 TRIỆU CHO LAPTOP MỚI!',
    E'🔥 SUMMER SALE 2026 ĐÃ CHÍNH THỨC CÓ MẶT TẠI MỸ THỌ LAPTOP!\n\n' ||
    E'🎁 Ưu đãi cực khủng:\n' ||
    E'• Laptop Gaming: Giảm đến 5 triệu\n' ||
    E'• Laptop văn phòng: Giảm đến 3 triệu',
    'internal_review',
    E'🔥 SUMMER SALE 2026 ĐÃ CHÍNH THỨC CÓ MẶT TẠI MỸ THỌ LAPTOP!\n\n' ||
    E'🎁 Ưu đãi cực khủng:\n' ||
    E'• Laptop Gaming: Giảm đến 5 triệu',
    'Bài Facebook post đang chờ admin duyệt.',
    '0c06b1be-b682-4b8d-90f7-748df62d0ffa',
    NOW(),
    NOW()
) ON CONFLICT (task_id) DO NOTHING;

-- Checklist items for Facebook task
INSERT INTO pm_task_checklist_items (task_id, title, is_completed, completed_by, completed_at, sort_order, created_by, created_at, updated_at)
VALUES
    ('33333333-3333-3333-3333-333333333302', 'Viết nội dung bài post', true, '5840ee12-7fd8-4060-8ed8-770535194c9c', NOW(), 1, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333302', 'Thiết kế hình ảnh', true, '5840ee12-7fd8-4060-8ed8-770535194c9c', NOW(), 2, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333302', 'Gửi duyệt nội bộ', true, '5840ee12-7fd8-4060-8ed8-770535194c9c', NOW(), 3, '0c06b1be-b682-4b8d-90f7-748df62d0ffa', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- TASK 3: Website SEO Article
-- ──────────────────────────────────────────────────────────

INSERT INTO pm_tasks (id, project_id, campaign_id, title, description, status, task_type, platform, assignee_ids, reporter_id, due_date, content_title, content_hook, content_goal, related_product, content_body, call_to_action, reference_links, output_links, content_status, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333303',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    'Viết bài SEO về Laptop Gaming 2026',
    'Viết bài SEO article giới thiệu top laptop gaming 2026 cho website Mỹ Tho Laptop',
    'idea',
    'seo_article',
    'website',
    ARRAY['5840ee12-7fd8-4060-8ed8-770535194c9c'::uuid],
    '0c06b1be-b682-4b8d-90f7-748df62d0ffa',
    '2026-06-30',
    'Top 10 Laptop Gaming 2026 Giá Dưới 25 Triệu - Mua Ngay!',
    'Không biết chọn laptop gaming nào cho phù hợp với túi tiền?',
    'huong_dan',
    'ASUS ROG, MSI Katana, Acer Nitro',
    E'## Top 10 Laptop Gaming 2026 Giá Dưới 25 Triệu\n\n' ||
    E'### 1. ASUS ROG Strix G16 (2026)\n' ||
    E'- CPU: Intel Core i7-13700H | GPU: NVIDIA RTX 4060 8GB\n' ||
    E'- RAM: 16GB DDR5 | SSD: 512GB NVMe\n' ||
    E'- Giá: 22.990.000đ (đang giảm 3 triệu)\n\n' ||
    E'### 2. MSI Katana 15 B13V\n' ||
    E'- CPU: Intel Core i5-13500H | GPU: NVIDIA RTX 4050 6GB\n' ||
    E'- Giá: 18.990.000đ\n\n' ||
    E'### Mua laptop gaming ở đâu uy tín?\n' ||
    E'Mỹ Tho Laptop - Bảo hành 24 tháng - Trả góp 0%',
    'Xem chi tiết tại mietholaptop.vn | Hotline: 0901 234 567',
    ARRAY['https://example.com/laptop-gaming-2026'],
    ARRAY[]::text[],
    'draft',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- pm_task_contents for SEO task
INSERT INTO pm_task_contents (task_id, content_type, content_title, content_body, content_status, rich_text, notes, created_by, created_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333303',
    'seo_article',
    'Top 10 Laptop Gaming 2026 Giá Dưới 25 Triệu - Mua Ngay!',
    E'## Top 10 Laptop Gaming 2026 Giá Dưới 25 Triệu\n\n' ||
    E'### 1. ASUS ROG Strix G16 (2026)\n' ||
    E'- CPU: Intel Core i7-13700H | GPU: NVIDIA RTX 4060 8GB\n' ||
    E'- RAM: 16GB DDR5 | SSD: 512GB NVMe\n' ||
    E'- Giá: 22.990.000đ',
    'draft',
    E'## Top 10 Laptop Gaming 2026 Giá Dưới 25 Triệu\n\n' ||
    E'### 1. ASUS ROG Strix G16 (2026)',
    'Bài viết SEO cần tối ưu từ khóa: laptop gaming 2026, laptop gaming giá rẻ.',
    '0c06b1be-b682-4b8d-90f7-748df62d0ffa',
    NOW(),
    NOW()
) ON CONFLICT (task_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────
-- VERIFICATION
-- ──────────────────────────────────────────────────────────

DO $$
DECLARE
    v_project_count INTEGER;
    v_campaign_count INTEGER;
    v_task_count INTEGER;
    v_content_count INTEGER;
    v_checklist_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_project_count FROM pm_projects WHERE id = '11111111-1111-1111-1111-111111111101';
    SELECT COUNT(*) INTO v_campaign_count FROM pm_campaigns WHERE id = '22222222-2222-2222-2222-222222222201';
    SELECT COUNT(*) INTO v_task_count FROM pm_tasks WHERE id LIKE '33333333-3333-3333-3333-3333333333%';
    SELECT COUNT(*) INTO v_content_count FROM pm_task_contents WHERE task_id LIKE '33333333-3333-3333-3333-3333333333%';
    SELECT COUNT(*) INTO v_checklist_count FROM pm_task_checklist_items WHERE task_id LIKE '33333333-3333-3333-3333-3333333333%';

    RAISE NOTICE '=== SEED VERIFICATION ===';
    RAISE NOTICE 'Projects: %', v_project_count;
    RAISE NOTICE 'Campaigns: %', v_campaign_count;
    RAISE NOTICE 'Tasks: %', v_task_count;
    RAISE NOTICE 'Task Contents: %', v_content_count;
    RAISE NOTICE 'Checklist Items: %', v_checklist_count;

    IF v_project_count = 1 AND v_campaign_count = 1 AND v_task_count = 3 AND v_content_count = 3 THEN
        RAISE NOTICE 'OK: All seed data created successfully';
    ELSE
        RAISE EXCEPTION 'FAIL: Seed data mismatch';
    END IF;
END $$;

COMMIT;
