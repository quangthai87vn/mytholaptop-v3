-- ============================================================
-- Workspace Module Migration: Tasks
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/002_tasks.sql
-- ============================================================

-- ============================================================
-- TASKS: Core task entity
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm_projects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES pm_campaigns(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'backlog',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    stage VARCHAR(50),

    assignee_ids UUID[] DEFAULT '{}',
    reporter_id UUID,

    start_date DATE,
    due_date DATE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),

    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    dependencies UUID[] DEFAULT '{}',

    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_priority ON pm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_assignee ON pm_tasks USING GIN(assignee_ids);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_due_date ON pm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_stage ON pm_tasks(stage);

DO $$ BEGIN
    CREATE TRIGGER update_pm_tasks_updated_at
        BEFORE UPDATE ON pm_tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TASK COMMENTS: Threaded comments on tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES pm_task_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    author_avatar VARCHAR(500),
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    mentions UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_comments_task ON pm_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_comments_parent ON pm_task_comments(parent_comment_id);

DO $$ BEGIN
    CREATE TRIGGER update_pm_comments_updated_at
        BEFORE UPDATE ON pm_task_comments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TASK ACTIVITY: Audit log for task changes
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_activity_task ON pm_task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_created ON pm_task_activities(created_at);

-- ============================================================
-- STATUS HISTORY: Track status changes over time
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID,
    changed_by_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_status_history_entity ON pm_status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_status_history_created ON pm_status_history(created_at);

-- ============================================================
-- Seed sample tasks
-- ============================================================
INSERT INTO pm_tasks (id, project_id, campaign_id, title, description, status, priority, stage, due_date, progress, assignee_ids)
VALUES
    -- Summer Sale Project
    ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Viết 10 bài Facebook post cho Summer Sale', 'Nội dung về laptop, phụ kiện giảm giá', 'in_progress', 'high', 'writing', '2026-06-05', 60, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[]),
    ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Quay video giới thiệu Summer Sale', 'Video 30s cho Facebook & TikTok', 'review', 'medium', 'review', '2026-06-03', 90, ARRAY['11111111-0000-0000-0000-000000000002']::UUID[]),
    ('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Viết bài SEO về laptop gaming', 'Bài viết 1500 từ, từ khóa laptop gaming giá rẻ', 'done', 'medium', 'published', '2026-05-28', 100, ARRAY['11111111-0000-0000-0000-000000000003']::UUID[]),
    ('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Thiết kế banner Summer Sale', 'Banner web + banner Facebook', 'todo', 'high', NULL, '2026-06-07', 0, ARRAY['11111111-0000-0000-0000-000000000003']::UUID[]),
    ('c5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Chụp ảnh sản phẩm laptop mới', 'Bộ ảnh 5-8 tấm cho content', 'in_progress', 'high', 'filming', '2026-06-04', 40, ARRAY['11111111-0000-0000-0000-000000000002']::UUID[]),
    ('c6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', NULL, 'Lên kế hoạch influencer marketing', 'Tìm kiếm và liên hệ 3 influencer local', 'backlog', 'medium', NULL, '2026-06-20', 0, ARRAY[]::UUID[]),
    ('c7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Tạo prompt AI sinh hình ảnh sản phẩm', 'Dùng AI tạo mockup laptop', 'done', 'low', 'published', '2026-05-25', 100, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[]),
    -- Gaming Launch Project
    ('c8888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Viết kịch bản video ra mắt gaming laptop', 'Script 60s cho video YouTube', 'in_progress', 'urgent', 'writing', '2026-06-02', 50, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[]),
    ('c9999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Quay video unboxing gaming laptop', 'Video unboxing + first impression', 'todo', 'urgent', 'filming', '2026-06-08', 0, ARRAY['11111111-0000-0000-0000-000000000002']::UUID[]),
    ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Viết bài SEO gaming laptop ra mắt', 'Content SEO cho website', 'todo', 'high', NULL, '2026-06-10', 0, ARRAY['11111111-0000-0000-0000-000000000003']::UUID[]),
    -- Back to School Project
    ('cbbbbb01-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NULL, 'Lên chiến dịch Back to School content plan', 'Plan chi tiết 20 bài viết + 10 video', 'in_progress', 'high', NULL, '2026-06-15', 30, ARRAY['e1111111-1111-1111-1111-111111111111']::UUID[])
ON CONFLICT (id) DO NOTHING;

-- Seed task activities
INSERT INTO pm_task_activities (task_id, actor_name, action, new_value, created_at)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Nguyễn Văn An', 'created', 'Viết 10 bài Facebook post cho Summer Sale', '2026-05-25 09:00:00'),
    ('c1111111-1111-1111-1111-111111111111', 'Nguyễn Văn An', 'status_changed', 'in_progress', '2026-05-26 10:00:00'),
    ('c2222222-2222-2222-2222-222222222222', 'Trần Thị Minh', 'created', 'Quay video giới thiệu Summer Sale', '2026-05-26 11:00:00'),
    ('c2222222-2222-2222-2222-222222222222', 'Trần Thị Minh', 'status_changed', 'review', '2026-06-01 15:00:00'),
    ('c3333333-3333-3333-3333-333333333333', 'Hoàng Thị Lan', 'created', 'Viết bài SEO về laptop gaming', '2026-05-20 09:00:00'),
    ('c3333333-3333-3333-3333-333333333333', 'Hoàng Thị Lan', 'status_changed', 'done', '2026-05-28 17:00:00'),
    ('c5555555-5555-5555-5555-555555555555', 'Trần Thị Minh', 'created', 'Chụp ảnh sản phẩm laptop mới', '2026-06-01 08:00:00'),
    ('c8888888-8888-8888-8888-888888888888', 'Nguyễn Văn An', 'created', 'Viết kịch bản video ra mắt gaming laptop', '2026-06-01 09:00:00'),
    ('c7777777-7777-7777-7777-777777777777', 'Nguyễn Văn An', 'created', 'Tạo prompt AI sinh hình ảnh sản phẩm', '2026-05-24 10:00:00'),
    ('c7777777-7777-7777-7777-777777777777', 'Nguyễn Văn An', 'status_changed', 'done', '2026-05-25 16:00:00')
ON CONFLICT DO NOTHING;
