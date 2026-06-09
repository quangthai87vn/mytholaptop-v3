-- ============================================================
-- Seed missing master data categories
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/030_seed_missing_master_data.sql
-- ============================================================

BEGIN;

-- ── 1. content_goal ─────────────────────────────────────────
-- Used in task content workflow: mục tiêu nội dung
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('content_goal', 'ban_hang',   'Bán hàng',     'Nội dung hướng đến mục tiêu bán hàng',         '#16a34a', '#f0fdf4', 'ShoppingCart', 1, TRUE, TRUE),
    ('content_goal', 'giao_duc',   'Giáo dục',     'Nội dung giáo dục / hướng dẫn khách hàng',       '#7c3aed', '#f5f3ff', 'GraduationCap', 2, TRUE, TRUE),
    ('content_goal', 'review',      'Review / Đánh giá', 'Nội dung review sản phẩm / đánh giá',       '#d97706', '#fffbeb', 'Star', 3, TRUE, TRUE),
    ('content_goal', 'huong_dan',   'Hướng dẫn',     'Nội dung hướng dẫn sử dụng sản phẩm / dịch vụ', '#0891b2', '#ecfeff', 'BookOpen', 4, TRUE, TRUE),
    ('content_goal', 'gioi_thieu',  'Giới thiệu',    'Nội dung giới thiệu sản phẩm / thương hiệu',   '#3b82f6', '#eff6ff', 'Info', 5, TRUE, TRUE),
    ('content_goal', 'cham_soc',    'Chăm sóc',      'Nội dung chăm sóc khách hàng / follow-up',       '#ec4899', '#fdf2f8', 'Heart', 6, TRUE, TRUE)
ON CONFLICT (category, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    bg_color = EXCLUDED.bg_color,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- ── 2. content_status ───────────────────────────────────────
-- Used in task content workflow: trạng thái nội dung
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('content_status', 'draft',           'Bản nháp',      'Nội dung đang được soạn thảo',           '#6b7280', '#f9fafb', 'FileText',  1, TRUE, TRUE),
    ('content_status', 'writing',         'Đang viết',     'Đang trong quá trình viết nội dung',     '#7c3aed', '#f5f3ff', 'Pencil',    2, TRUE, TRUE),
    ('content_status', 'internal_review','Review nội bộ', 'Chờ review nội bộ trước khi gửi duyệt', '#d97706', '#fffbeb', 'Eye',       3, TRUE, TRUE),
    ('content_status', 'revision',       'Cần sửa',       'Cần chỉnh sửa theo feedback',            '#dc2626', '#fef2f2', 'Pencil',    4, TRUE, TRUE),
    ('content_status', 'approved',        'Đã duyệt',     'Đã được duyệt, sẵn sàng đăng',          '#16a34a', '#f0fdf4', 'Check',     5, TRUE, TRUE),
    ('content_status', 'published',       'Đã đăng',      'Nội dung đã được xuất bản',              '#0891b2', '#ecfeff', 'Globe',     6, TRUE, TRUE)
ON CONFLICT (category, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    bg_color = EXCLUDED.bg_color,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- ── 3. Fix task_type: add train ────────────────────────────
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES ('task_type', 'train', 'Đào tạo', 'Công việc đào tạo nội bộ', '#0d948c', '#f0fdfa', 'GraduationCap', 10, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- ── 4. Fix campaign_status: add archived ────────────────────
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES ('campaign_status', 'archived', 'Lưu trữ', 'Chiến dịch đã lưu trữ', '#9ca3af', '#f9fafb', 'Archive', 99, FALSE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- ── 5. Sync channel: ensure email and seo exist ────────────
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('channel', 'email', 'Email',    'Email marketing',  '#3b82f6', '#eff6ff', 'Mail',   7, TRUE, TRUE),
    ('channel', 'seo',   'SEO',     'Tối ưu SEO',       '#16a34a', '#f0fdf4', 'Search', 8, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

COMMIT;
