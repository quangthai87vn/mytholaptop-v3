-- ============================================================
-- Sync pm_master_data task_status codes with Kanban frontend codes
-- Seed the standard Kanban statuses matching what the frontend expects
-- Run after 005_master_data.sql
-- ============================================================

-- First: seed the standard Kanban statuses
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, column_bg_color, column_border_color, icon, sort_order, is_active, is_system)
VALUES
    ('task_status', 'idea',       'Ý tưởng',       'Công việc mới, ý tưởng cần thực hiện', '#7c3aed', '#f5f3ff', '#f5f3ff', '#7c3aed', 'Lightbulb',    1, TRUE, TRUE),
    ('task_status', 'assigned',   'Đã giao',         'Đã được phân công cho người thực hiện', '#3b82f6', '#eff6ff', '#eff6ff', '#3b82f6', 'UserCheck',   2, TRUE, TRUE),
    ('task_status', 'working',    'Đang thực hiện', 'Đang trong quá trình thực hiện',          '#0891b2', '#ecfeff', '#ecfeff', '#0891b2', 'Loader',      3, TRUE, TRUE),
    ('task_status', 'review',     'Chờ duyệt',       'Chờ được duyệt nội dung hoặc kết quả',      '#d97706', '#fffbeb', '#fffbeb', '#d97706', 'Eye',          4, TRUE, TRUE),
    ('task_status', 'rework',     'Cần sửa',         'Cần chỉnh sửa theo feedback',               '#dc2626', '#fef2f2', '#fef2f2', '#dc2626', 'Pencil',       5, TRUE, TRUE),
    ('task_status', 'completed',  'Hoàn thành',      'Đã hoàn thành công việc',                   '#16a34a', '#f0fdf4', '#f0fdf4', '#16a34a', 'CheckCircle2', 6, TRUE, TRUE),
    ('task_status', 'cancelled',  'Hủy',             'Công việc đã bị hủy hoặc lưu trữ',           '#64748b', '#f3f4f6', '#f3f4f6', '#64748b', 'XCircle',     99, FALSE, TRUE)
ON CONFLICT (category, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    bg_color = EXCLUDED.bg_color,
    column_bg_color = EXCLUDED.column_bg_color,
    column_border_color = EXCLUDED.column_border_color,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;
