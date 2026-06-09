-- ============================================================
-- Workspace Module Migration: Master Data (Danh mục)
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/005_master_data.sql
-- ============================================================

-- ============================================================
-- MASTER DATA: Flexible key-value store for dropdown config
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_master_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Category discriminator: which list this item belongs to
    category VARCHAR(50) NOT NULL,
    -- Within a category, this code must be unique
    code VARCHAR(100) NOT NULL,
    -- Display name
    name VARCHAR(255) NOT NULL,
    -- Optional description
    description TEXT,

    -- Color config (hex or CSS color)
    color VARCHAR(50) DEFAULT '#6b7280',
    -- Optional bg color for column/row backgrounds
    bg_color VARCHAR(50) DEFAULT '#f3f4f6',
    -- Icon name (lucide-react icon key, e.g. "FileText", "Users")
    icon VARCHAR(100),

    -- Sort order within category
    sort_order INTEGER DEFAULT 0,
    -- Is this item available for selection?
    is_active BOOLEAN DEFAULT TRUE,
    -- Is this a system item that cannot be deleted?
    is_system BOOLEAN DEFAULT FALSE,

    -- For statuses: which Kanban column bg color
    column_bg_color VARCHAR(50),
    -- For statuses: which Kanban column border color
    column_border_color VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Unique constraint: code + category (soft deleted items excluded via query)
    CONSTRAINT pm_master_data_code_category_unique UNIQUE (category, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS pm_master_data_category_idx ON pm_master_data(category);
CREATE INDEX IF NOT EXISTS pm_master_data_category_active_idx ON pm_master_data(category, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS pm_master_data_sort_idx ON pm_master_data(category, sort_order) WHERE deleted_at IS NULL;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pm_master_data_updated_at ON pm_master_data;
CREATE TRIGGER pm_master_data_updated_at
    BEFORE UPDATE ON pm_master_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA: Initial values for each category
-- ============================================================

-- TASK TYPES
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('task_type', 'facebook_post', 'Bài Facebook', 'Bài viết quảng cáo hoặc bài viết thường trên Facebook', '#1d4ed8', '#eff6ff', 'Facebook', 1, TRUE, TRUE),
    ('task_type', 'seo_article', 'Bài SEO', 'Bài viết tối ưu SEO cho website', '#16a34a', '#f0fdf4', 'Search', 2, TRUE, TRUE),
    ('task_type', 'tiktok_video', 'Video TikTok', 'Video ngắn cho TikTok', '#7c3aed', '#f5f3ff', 'Video', 3, TRUE, TRUE),
    ('task_type', 'youtube_video', 'Video YouTube', 'Video dài cho YouTube', '#dc2626', '#fef2f2', 'Youtube', 4, TRUE, TRUE),
    ('task_type', 'design_image', 'Thiết kế hình ảnh', 'Thiết kế banner, poster, ảnh quảng cáo', '#db2777', '#fdf2f8', 'Paintbrush', 5, TRUE, TRUE),
    ('task_type', 'product_photo', 'Chụp ảnh sản phẩm', 'Chụp ảnh sản phẩm để bán', '#ea580c', '#fff7ed', 'Camera', 6, TRUE, TRUE),
    ('task_type', 'livestream', 'Livestream', 'Buổi phát trực tiếp', '#7c3aed', '#f5f3ff', 'Radio', 7, TRUE, TRUE),
    ('task_type', 'website_copy', 'Bài Website', 'Nội dung cho website (giới thiệu, blog, tin tức)', '#16a34a', '#f0fdf4', 'Globe', 8, TRUE, TRUE),
    ('task_type', 'other', 'Khác', 'Loại công việc khác', '#6b7280', '#f9fafb', 'CircleDot', 99, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- TASK STATUSES (Kanban columns)
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, column_bg_color, column_border_color, icon, sort_order, is_active, is_system)
VALUES
    ('task_status', 'backlog', 'Backlog', 'Công việc chưa được lên kế hoạch', '#64748b', '#f8fafc', '#f8fafc', 'hsl(220 14% 70%)', 'Archive', 1, TRUE, TRUE),
    ('task_status', 'todo', 'To Do', 'Công việc đã được xác nhận, sẵn sàng làm', '#3b82f6', '#eff6ff', '#eff6ff', 'hsl(220 14% 60%)', 'ListTodo', 2, TRUE, TRUE),
    ('task_status', 'in_progress', 'In Progress', 'Công việc đang được thực hiện', '#0891b2', '#ecfeff', '#ecfeff', 'hsl(199 89% 48%)', 'Loader', 3, TRUE, TRUE),
    ('task_status', 'review', 'Review', 'Công việc chờ được duyệt', '#d97706', '#fffbeb', '#fffbeb', 'hsl(38 92% 50%)', 'Eye', 4, TRUE, TRUE),
    ('task_status', 'done', 'Done', 'Công việc đã hoàn thành', '#16a34a', '#f0fdf4', '#f0fdf4', 'hsl(142 70% 45%)', 'CheckCircle2', 5, TRUE, TRUE),
    ('task_status', 'cancelled', 'Cancelled', 'Công việc đã bị hủy', '#dc2626', '#fef2f2', '#fef2f2', 'hsl(0 70% 55%)', 'XCircle', 6, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- PRIORITIES
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('priority', 'low', 'Thấp', 'Công việc có mức ưu tiên thấp, làm khi rảnh', '#475569', '#f1f5f9', 'ArrowDown', 1, TRUE, TRUE),
    ('priority', 'medium', 'Trung bình', 'Công việc bình thường, theo tiến độ', '#2563eb', '#eff6ff', 'Minus', 2, TRUE, TRUE),
    ('priority', 'high', 'Cao', 'Công việc quan trọng, cần ưu tiên', '#ea580c', '#fff7ed', 'ArrowUp', 3, TRUE, TRUE),
    ('priority', 'urgent', 'Khẩn cấp', 'Cần xử lý ngay lập tức', '#dc2626', '#fef2f2', 'AlertTriangle', 4, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- WORKFLOW STAGES
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('workflow_stage', 'idea', 'Ý tưởng', 'Giai đoạn ý tưởng ban đầu', '#7c3aed', '#f5f3ff', 'Lightbulb', 1, TRUE, TRUE),
    ('workflow_stage', 'writing', 'Viết nội dung', 'Đang viết nội dung', '#2563eb', '#eff6ff', 'PenLine', 2, TRUE, TRUE),
    ('workflow_stage', 'internal_review', 'Review nội bộ', 'Nội dung đang được review nội bộ', '#d97706', '#fffbeb', 'Users', 3, TRUE, TRUE),
    ('workflow_stage', 'revision', 'Chỉnh sửa', 'Cần chỉnh sửa theo feedback', '#ea580c', '#fff7ed', 'Pencil', 4, TRUE, TRUE),
    ('workflow_stage', 'approved', 'Đã duyệt', 'Nội dung đã được duyệt', '#16a34a', '#f0fdf4', 'CheckCircle2', 5, TRUE, TRUE),
    ('workflow_stage', 'shooting', 'Quay', 'Đang quay video', '#7c3aed', '#f5f3ff', 'Video', 6, TRUE, TRUE),
    ('workflow_stage', 'editing', 'Edit', 'Đang chỉnh sửa video/hình ảnh', '#0891b2', '#ecfeff', 'Scissors', 7, TRUE, TRUE),
    ('workflow_stage', 'scheduled', 'Đã lên lịch', 'Đã lên lịch đăng bài', '#2563eb', '#eff6ff', 'CalendarCheck', 8, TRUE, TRUE),
    ('workflow_stage', 'published', 'Đã đăng', 'Đã đăng lên nền tảng', '#16a34a', '#f0fdf4', 'Globe', 9, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- DISTRIBUTION CHANNELS
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('channel', 'facebook', 'Facebook', 'Mạng xã hội Facebook', '#1d4ed8', '#eff6ff', 'Facebook', 1, TRUE, TRUE),
    ('channel', 'tiktok', 'TikTok', 'Nền tảng video ngắn TikTok', '#7c3aed', '#f5f3ff', 'Video', 2, TRUE, TRUE),
    ('channel', 'youtube', 'YouTube', 'Nền tảng video YouTube', '#dc2626', '#fef2f2', 'Youtube', 3, TRUE, TRUE),
    ('channel', 'website', 'Website', 'Website của doanh nghiệp', '#16a34a', '#f0fdf4', 'Globe', 4, TRUE, TRUE),
    ('channel', 'instagram', 'Instagram', 'Mạng xã hội Instagram', '#db2777', '#fdf2f8', 'Instagram', 5, TRUE, TRUE),
    ('channel', 'zalo', 'Zalo', 'Nền tảng Zalo OA', '#0068ff', '#eff6ff', 'MessageCircle', 6, TRUE, TRUE),
    ('channel', 'email', 'Email', 'Email marketing', '#6b7280', '#f9fafb', 'Mail', 7, TRUE, TRUE),
    ('channel', 'seo', 'SEO', 'Tối ưu công cụ tìm kiếm', '#16a34a', '#f0fdf4', 'Search', 8, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- CONTENT TAGS (sample)
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, sort_order, is_active, is_system)
VALUES
    ('content_tag', 'facebook', 'Facebook', 'Tag cho nội dung Facebook', '#1d4ed8', '#eff6ff', 1, TRUE, TRUE),
    ('content_tag', 'seo', 'SEO', 'Tag cho bài SEO', '#16a34a', '#f0fdf4', 2, TRUE, TRUE),
    ('content_tag', 'video', 'Video', 'Tag cho video content', '#7c3aed', '#f5f3ff', 3, TRUE, TRUE),
    ('content_tag', 'summer-sale', 'Summer Sale', 'Tag cho chiến dịch Summer Sale', '#ea580c', '#fff7ed', 4, TRUE, TRUE),
    ('content_tag', 'laptop', 'Laptop', 'Tag cho sản phẩm laptop', '#2563eb', '#eff6ff', 5, TRUE, TRUE),
    ('content_tag', 'promo', 'Khuyến mãi', 'Tag cho nội dung khuyến mãi', '#dc2626', '#fef2f2', 6, TRUE, TRUE),
    ('content_tag', 'brand', 'Thương hiệu', 'Tag cho nội dung thương hiệu', '#7c3aed', '#f5f3ff', 7, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- DEPARTMENTS
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('department', 'marketing', 'Marketing', 'Phòng Marketing - tạo nội dung, quảng cáo', '#1d4ed8', '#eff6ff', 'Megaphone', 1, TRUE, TRUE),
    ('department', 'content', 'Nội dung', 'Phòng Nội dung - viết bài, thiết kế', '#7c3aed', '#f5f3ff', 'FileText', 2, TRUE, TRUE),
    ('department', 'sales', 'Kinh doanh', 'Phòng Kinh doanh - bán hàng, tư vấn', '#16a34a', '#f0fdf4', 'ShoppingCart', 3, TRUE, TRUE),
    ('department', 'it', 'IT', 'Phòng IT - vận hành hệ thống', '#0891b2', '#ecfeff', 'Server', 4, TRUE, TRUE),
    ('department', 'admin', 'Hành chính', 'Phòng Hành chính - nhân sự, kế toán', '#6b7280', '#f9fafb', 'Building2', 5, TRUE, TRUE),
    ('department', 'design', 'Thiết kế', 'Phòng Thiết kế - đồ họa, UI/UX', '#db2777', '#fdf2f8', 'Paintbrush', 6, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- CAMPAIGN TYPES
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('campaign_type', 'product_launch', 'Khai trương sản phẩm', 'Chiến dịch ra mắt sản phẩm mới', '#16a34a', '#f0fdf4', 'Rocket', 1, TRUE, TRUE),
    ('campaign_type', 'seasonal', 'Theo mùa', 'Chiến dịch theo dịp lễ, mùa (Summer, Black Friday...)', '#ea580c', '#fff7ed', 'Calendar', 2, TRUE, TRUE),
    ('campaign_type', 'social_media', 'Mạng xã hội', 'Chiến dịch trên mạng xã hội', '#1d4ed8', '#eff6ff', 'Share2', 3, TRUE, TRUE),
    ('campaign_type', 'seo', 'SEO', 'Chiến dịch tối ưu công cụ tìm kiếm', '#16a34a', '#f0fdf4', 'Search', 4, TRUE, TRUE),
    ('campaign_type', 'advertising', 'Quảng cáo', 'Chiến dịch quảng cáo (Facebook Ads, Google Ads...)', '#dc2626', '#fef2f2', 'Zap', 5, TRUE, TRUE),
    ('campaign_type', 'email_marketing', 'Email Marketing', 'Chiến dịch email', '#7c3aed', '#f5f3ff', 'Mail', 6, TRUE, TRUE),
    ('campaign_type', 'influencer', 'Influencer', 'Chiến dịch hợp tác influencer/KOL', '#db2777', '#fdf2f8', 'Star', 7, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- CAMPAIGN STATUSES
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('campaign_status', 'planning', 'Lên kế hoạch', 'Chiến dịch đang được lên kế hoạch', '#64748b', '#f8fafc', 'ClipboardList', 1, TRUE, TRUE),
    ('campaign_status', 'active', 'Đang chạy', 'Chiến dịch đang được triển khai', '#16a34a', '#f0fdf4', 'Play', 2, TRUE, TRUE),
    ('campaign_status', 'paused', 'Tạm dừng', 'Chiến dịch tạm dừng', '#ea580c', '#fff7ed', 'Pause', 3, TRUE, TRUE),
    ('campaign_status', 'completed', 'Hoàn thành', 'Chiến dịch đã hoàn thành', '#2563eb', '#eff6ff', 'CheckCircle2', 4, TRUE, TRUE),
    ('campaign_status', 'cancelled', 'Đã hủy', 'Chiến dịch đã bị hủy', '#dc2626', '#fef2f2', 'XCircle', 5, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;

-- PROJECT STATUSES
INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, is_system)
VALUES
    ('project_status', 'planning', 'Lên kế hoạch', 'Dự án đang trong giai đoạn lên kế hoạch', '#64748b', '#f8fafc', 'ClipboardList', 1, TRUE, TRUE),
    ('project_status', 'active', 'Đang hoạt động', 'Dự án đang được triển khai', '#16a34a', '#f0fdf4', 'Play', 2, TRUE, TRUE),
    ('project_status', 'on_hold', 'Tạm dừng', 'Dự án bị tạm dừng', '#ea580c', '#fff7ed', 'Pause', 3, TRUE, TRUE),
    ('project_status', 'completed', 'Hoàn thành', 'Dự án đã hoàn thành', '#2563eb', '#eff6ff', 'CheckCircle2', 4, TRUE, TRUE),
    ('project_status', 'archived', 'Lưu trữ', 'Dự án đã được lưu trữ', '#6b7280', '#f9fafb', 'Archive', 5, TRUE, TRUE)
ON CONFLICT (category, code) DO NOTHING;
