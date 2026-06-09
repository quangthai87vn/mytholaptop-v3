-- ============================================================
-- Workspace Module Migration: Media Workflow
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/003_media_workflow.sql
-- ============================================================

-- ============================================================
-- MEDIA_WORKFLOWS: Content production pipeline
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_media_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm_projects(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES pm_campaigns(id) ON DELETE SET NULL,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    platform VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'idea',

    ai_prompt TEXT,
    ai_generated_content TEXT,
    ai_model_used VARCHAR(100),
    ai_generated_at TIMESTAMP,

    published_at TIMESTAMP,
    published_url VARCHAR(1000),
    engagement_metrics JSONB DEFAULT '{}',

    assignee_ids UUID[] DEFAULT '{}',
    due_date DATE,

    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_media_project ON pm_media_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_media_campaign ON pm_media_workflows(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pm_media_status ON pm_media_workflows(status);
CREATE INDEX IF NOT EXISTS idx_pm_media_platform ON pm_media_workflows(platform);
CREATE INDEX IF NOT EXISTS idx_pm_media_type ON pm_media_workflows(content_type);
CREATE INDEX IF NOT EXISTS idx_pm_media_due ON pm_media_workflows(due_date);

DO $$ BEGIN
    CREATE TRIGGER update_pm_media_workflows_updated_at
        BEFORE UPDATE ON pm_media_workflows
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- MEDIA WORKFLOW STAGES: Stage-specific content and approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    content TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    reviewer_notes TEXT,
    order_index INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_wf_stages_workflow ON pm_workflow_stages(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pm_wf_stages_stage ON pm_workflow_stages(stage);

DO $$ BEGIN
    CREATE TRIGGER update_pm_wf_stages_updated_at
        BEFORE UPDATE ON pm_workflow_stages
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- MEDIA WORKFLOW COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_workflow_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    stage VARCHAR(50),
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_wf_comments_workflow ON pm_workflow_comments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pm_wf_comments_stage ON pm_workflow_comments(stage);

-- ============================================================
-- AI SUGGESTIONS: AI-generated suggestions for workflows
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    used BOOLEAN DEFAULT FALSE,
    ai_model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_workflow ON pm_ai_suggestions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_task ON pm_ai_suggestions(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_type ON pm_ai_suggestions(suggestion_type);

-- ============================================================
-- Seed sample media workflows
-- ============================================================
INSERT INTO pm_media_workflows (id, project_id, campaign_id, title, content_type, platform, status, due_date, assignee_ids, ai_generated_content)
VALUES
    -- Summer Sale content
    ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'FB Post: Laptop Gaming giảm 30% Summer Sale', 'facebook_post', 'facebook', 'writing', '2026-06-05', ARRAY['11111111-0000-0000-0000-000000000001']::UUID[], '🔥 MÙA HÈ RỰC RỠ - GIẢM ĐẾN 30%! 🔥\n\nMáy laptop gaming chỉ từ 15.9 triệu. Đồng thời, game thủ sẽ được tặng ngay chuột gaming và tai nghe khi mua bất kỳ laptop gaming nào.\n\n👉 Xem ngay: mytholaptop.vn'),
    ('d2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'FB Post: 5 lý do nên mua laptop mùa hè', 'facebook_post', 'facebook', 'idea', '2026-06-10', ARRAY['11111111-0000-0000-0000-000000000001']::UUID[], NULL),
    ('d3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'SEO: Top 10 laptop cho sinh viên 2026', 'seo_article', 'website', 'review', '2026-06-08', ARRAY['11111111-0000-0000-0000-000000000003']::UUID[], NULL),
    ('d4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'TikTok: Mở hộp laptop gaming mới nhất', 'tiktok_video', 'tiktok', 'filming', '2026-06-06', ARRAY['11111111-0000-0000-0000-000000000002']::UUID[], NULL),
    ('d5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'YouTube: Review laptop văn phòng tầm trung', 'youtube_video', 'youtube', 'published', '2026-05-30', ARRAY['11111111-0000-0000-0000-000000000002']::UUID[], NULL),
    ('d6666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'FB Post: Gaming laptop RA MẮT', 'facebook_post', 'facebook', 'idea', '2026-06-10', ARRAY['11111111-0000-0000-0000-000000000001']::UUID[], NULL),
    ('d7777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Kịch bản video unboxing gaming laptop', 'video_script', 'youtube', 'writing', '2026-06-04', ARRAY['11111111-0000-0000-0000-000000000001']::UUID[], NULL),
    ('d8888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Image Prompt: Mockup laptop Summer Sale', 'image_prompt', 'website', 'published', '2026-05-28', ARRAY['11111111-0000-0000-0000-000000000003']::UUID[], 'A sleek modern laptop on a minimalist desk, summer vibes with orange and yellow background, product photography style, 4K, professional lighting'),
    ('d9999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', NULL, 'Zalo OA: Tin nhắn chăm sóc khách hàng', 'zalo_message', 'zalo', 'published', '2026-05-25', ARRAY['11111111-0000-0000-0000-000000000001']::UUID[], NULL),
    ('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'SEO: Hướng dẫn chọn laptop theo ngành học', 'seo_article', 'website', 'editing', '2026-06-12', ARRAY['11111111-0000-0000-0000-000000000003']::UUID[], NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed workflow stages
INSERT INTO pm_workflow_stages (workflow_id, stage, content, order_index, approved_at, metadata)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'idea', 'Ý tưởng: Đăng bài về laptop gaming giảm giá mùa hè, kèm CTA mua ngay', 0, '2026-05-28 10:00:00', '{"approved_by_name": "Admin"}'),
    ('d1111111-1111-1111-1111-111111111111', 'writing', '🔥 MÙA HÈ RỰC RỠ - GIẢM ĐẾN 30%! 🔥\n\nMáy laptop gaming chỉ từ 15.9 triệu. Đồng thời, game thủ sẽ được tặng ngay chuột gaming và tai nghe khi mua bất kỳ laptop gaming nào.\n\n👉 Xem ngay: mytholaptop.vn', 1, '2026-05-29 14:00:00', '{"approved_by_name": "Admin", "reviewer_notes": "Nội dung tốt, thêm emoji cho bắt mắt"}'),
    ('d3333333-3333-3333-3333-333333333333', 'idea', 'Bài viết SEO về top 10 laptop cho sinh viên năm 2026', 0, '2026-05-30 09:00:00', '{"approved_by_name": "Admin"}'),
    ('d3333333-3333-3333-3333-333333333333', 'writing', 'Bài viết đang chờ review từ content lead', 1, NULL, '{}'),
    ('d5555555-5555-5555-5555-555555555555', 'idea', 'Review laptop văn phòng tầm trung, đăng YouTube', 0, '2026-05-25 10:00:00', '{"approved_by_name": "Admin"}'),
    ('d5555555-5555-5555-5555-555555555555', 'writing', 'Script video đã hoàn thành', 1, '2026-05-26 11:00:00', '{"approved_by_name": "Admin"}'),
    ('d5555555-5555-5555-5555-555555555555', 'filming', 'Video đã quay xong', 2, '2026-05-28 16:00:00', '{"approved_by_name": "Admin"}'),
    ('d5555555-5555-5555-5555-555555555555', 'editing', 'Video đã edit xong', 3, '2026-05-29 17:00:00', '{"approved_by_name": "Admin"}'),
    ('d5555555-5555-5555-5555-555555555555', 'published', 'Đã xuất bản lên YouTube', 4, '2026-05-30 10:00:00', '{"approved_by_name": "Admin", "published_url": "https://youtube.com/watch?v=xxx"}')
ON CONFLICT DO NOTHING;
