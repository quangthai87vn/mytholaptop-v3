-- ============================================================
-- Workspace Module Migration: Interns
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/004_interns.sql
-- ============================================================

-- ============================================================
-- INTERNS: Intern profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_interns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    university VARCHAR(255),
    major VARCHAR(255),
    year_of_study INT,

    position VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    mentor_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active',

    skills TEXT[] DEFAULT '{}',
    bio TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_interns_status ON pm_interns(status);
CREATE INDEX IF NOT EXISTS idx_pm_interns_position ON pm_interns(position);
CREATE INDEX IF NOT EXISTS idx_pm_interns_mentor ON pm_interns(mentor_id);

DO $$ BEGIN
    CREATE TRIGGER update_pm_interns_updated_at
        BEFORE UPDATE ON pm_interns
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- INTERN KPIS: Weekly/monthly KPI tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_intern_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES pm_interns(id) ON DELETE CASCADE,

    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    tasks_assigned INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_overdue INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,

    on_time_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    deadline_accuracy DECIMAL(5,2) DEFAULT 0,

    revision_count INT DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0,

    content_created INT DEFAULT 0,
    content_published INT DEFAULT 0,
    avg_engagement DECIMAL(10,2) DEFAULT 0,

    expected_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    attendance_rate DECIMAL(5,2) DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(intern_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_pm_kpis_intern ON pm_intern_kpis(intern_id);
CREATE INDEX IF NOT EXISTS idx_pm_kpis_period ON pm_intern_kpis(period_start, period_end);

DO $$ BEGIN
    CREATE TRIGGER update_pm_kpis_updated_at
        BEFORE UPDATE ON pm_intern_kpis
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- WEEKLY PERFORMANCE: Weekly performance reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_weekly_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES pm_interns(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,

    overall_score DECIMAL(3,2) DEFAULT 0,
    productivity_score DECIMAL(3,2) DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0,
    teamwork_score DECIMAL(3,2) DEFAULT 0,
    initiative_score DECIMAL(3,2) DEFAULT 0,

    accomplishments TEXT,
    areas_for_improvement TEXT,
    mentor_feedback TEXT,
    intern_self_reflection TEXT,

    rating VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(intern_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_pm_weekly_intern ON pm_weekly_performance(intern_id);
CREATE INDEX IF NOT EXISTS idx_pm_weekly_week ON pm_weekly_performance(week_start);

DO $$ BEGIN
    CREATE TRIGGER update_pm_weekly_updated_at
        BEFORE UPDATE ON pm_weekly_performance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- INTERN RANKINGS: Computed rankings
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_intern_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES pm_interns(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    overall_rank INT,
    productivity_rank INT,
    quality_rank INT,
    deadline_rank INT,

    overall_score DECIMAL(5,2),
    productivity_score DECIMAL(5,2),
    quality_score DECIMAL(5,2),
    deadline_score DECIMAL(5,2),

    trend VARCHAR(20),
    trend_change DECIMAL(4,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(intern_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_pm_rankings_intern ON pm_intern_rankings(intern_id);
CREATE INDEX IF NOT EXISTS idx_pm_rankings_period ON pm_intern_rankings(period_start);

-- ============================================================
-- Seed sample intern data
-- ============================================================
INSERT INTO pm_interns (id, full_name, email, phone, university, major, year_of_study, position, start_date, status, skills, bio)
VALUES
    ('i1111111-1111-1111-1111-111111111111', 'Nguyễn Văn An', 'an.nguyen@st.utc.edu.vn', '0901234567', 'ĐH Giao thông Vận tải TP.HCM', 'Marketing', 3, 'content_intern', '2026-01-15', 'active', ARRAY['content_writing', 'social_media', 'ai_content'], 'Thích viết content về công nghệ, đam mê laptop và gaming'),
    ('i2222222-2222-2222-2222-222222222222', 'Trần Thị Minh', 'minh.tran@st.hcmuarc.edu.vn', '0902345678', 'ĐH Khoa học Tự nhiên TP.HCM', 'Truyền thông Đa phương tiện', 4, 'video_intern', '2026-02-01', 'active', ARRAY['video_editing', 'filming', 'after_effects', 'premiere_pro'], 'Chuyên quay và edit video, có kinh nghiệm làm YouTube'),
    ('i3333333-3333-3333-3333-333333333333', 'Hoàng Thị Lan', 'lan.hoang@st.uel.edu.vn', '0903456789', 'ĐH Kinh tế Luật TP.HCM', 'Marketing', 3, 'content_intern', '2026-03-01', 'active', ARRAY['seo_writing', 'wordpress', 'analytics'], 'Giỏi viết bài SEO, thích phân tích dữ liệu'),
    ('i4444444-4444-4444-4444-444444444444', 'Lê Minh Tuấn', 'tuan.le@st.hcmut.edu.vn', '0904567890', 'ĐH Bách Khoa TP.HCM', 'Công nghệ Thông tin', 2, 'design_intern', '2026-04-01', 'active', ARRAY['photoshop', 'figma', 'illustrator', 'motion_graphics'], 'Thiết kế đồ họa, thích làm banner và mockup'),
    ('i5555555-5555-5555-5555-555555555555', 'Phạm Thị Hương', 'huong.pham@st.uit.edu.vn', '0905678901', 'ĐH Công nghệ TP.HCM (UIT)', 'Thiết kế Đồ họa', 4, 'design_intern', '2025-09-01', 'active', ARRAY['photoshop', 'canva', 'brand_design'], 'Thiết kế brand identity, có kinh nghiệm 2 năm')
ON CONFLICT (id) DO NOTHING;

-- Seed KPI data (June 2026)
INSERT INTO pm_intern_kpis (intern_id, period_type, period_start, period_end, tasks_assigned, tasks_completed, tasks_overdue, completion_rate, on_time_count, late_count, deadline_accuracy, revision_count, quality_score, content_created, content_published)
VALUES
    ('i1111111-1111-1111-1111-111111111111', 'weekly', '2026-05-26', '2026-06-01', 5, 5, 0, 100.00, 5, 0, 100.00, 1, 4.50, 5, 4),
    ('i2222222-2222-2222-2222-222222222222', 'weekly', '2026-05-26', '2026-06-01', 4, 3, 1, 75.00, 3, 1, 75.00, 2, 4.20, 3, 3),
    ('i3333333-3333-3333-3333-333333333333', 'weekly', '2026-05-26', '2026-06-01', 6, 4, 2, 66.67, 3, 3, 50.00, 3, 3.80, 4, 3),
    ('i4444444-4444-4444-4444-444444444444', 'weekly', '2026-05-26', '2026-06-01', 3, 3, 0, 100.00, 3, 0, 100.00, 0, 4.70, 3, 3),
    ('i5555555-5555-5555-5555-555555555555', 'weekly', '2026-05-26', '2026-06-01', 4, 4, 0, 100.00, 4, 0, 100.00, 1, 4.60, 4, 4),
    -- May 2026 monthly
    ('i1111111-1111-1111-1111-111111111111', 'monthly', '2026-05-01', '2026-05-31', 22, 20, 2, 90.91, 19, 3, 86.36, 5, 4.30, 20, 18),
    ('i2222222-2222-2222-2222-222222222222', 'monthly', '2026-05-01', '2026-05-31', 18, 15, 3, 83.33, 13, 5, 72.22, 6, 4.10, 15, 14),
    ('i3333333-3333-3333-3333-333333333333', 'monthly', '2026-05-01', '2026-05-31', 20, 16, 4, 80.00, 13, 7, 65.00, 8, 3.90, 16, 14),
    ('i4444444-4444-4444-4444-444444444444', 'monthly', '2026-05-01', '2026-05-31', 14, 14, 0, 100.00, 14, 0, 100.00, 2, 4.60, 14, 14),
    ('i5555555-5555-5555-5555-555555555555', 'monthly', '2026-05-01', '2026-05-31', 16, 15, 1, 93.75, 14, 2, 87.50, 3, 4.50, 15, 15)
ON CONFLICT DO NOTHING;

-- Seed weekly performance
INSERT INTO pm_weekly_performance (intern_id, week_start, overall_score, productivity_score, quality_score, teamwork_score, initiative_score, accomplishments, mentor_feedback, rating)
VALUES
    ('i1111111-1111-1111-1111-111111111111', '2026-05-26', 4.50, 4.80, 4.50, 4.20, 4.50, 'Hoàn thành 5 bài viết, trong đó 1 bài FB post đạt 500+ tương tác', 'An làm việc rất chăm chỉ, chất lượng content ổn định. Cần cải thiện thêm về hashtag.', 'good'),
    ('i2222222-2222-2222-2222-222222222222', '2026-05-26', 4.20, 4.00, 4.50, 4.00, 4.30, 'Hoàn thành 3 video, 1 video YouTube đạt 1000 lượt xem', 'Minh có kỹ năng edit tốt, cần chú ý deadline hơn. Video chất lượng cao nhưng giao hàng chậm.', 'good'),
    ('i3333333-3333-3333-3333-333333333333', '2026-05-26', 3.80, 3.50, 4.00, 4.00, 3.80, 'Viết 4 bài SEO, 1 bài được Google index trong tuần', 'Lan cần cải thiện tốc độ làm việc. deadline accuracy còn thấp. Cần chủ động hơn trong công việc.', 'needs_improvement'),
    ('i4444444-4444-4444-4444-444444444444', '2026-05-26', 4.70, 4.80, 4.80, 4.50, 4.70, 'Thiết kế 3 banner Summer Sale, 1 mockup laptop được duyệt ngay lần đầu', 'Tuấn làm việc xuất sắc, thiết kế đẹp, nhanh, không cần chỉnh sửa nhiều. Rất pro!', 'excellent'),
    ('i5555555-5555-5555-5555-555555555555', '2026-05-26', 4.60, 4.50, 4.80, 4.50, 4.60, 'Hoàn thành brand kit mới, 4 banner cho chiến dịch', 'Hương làm việc rất chuyên nghiệp, sáng tạo. Chất lượng design luôn trên kỳ vọng.', 'excellent')
ON CONFLICT DO NOTHING;

-- Seed rankings
INSERT INTO pm_intern_rankings (intern_id, period_type, period_start, period_end, overall_rank, productivity_rank, quality_rank, deadline_rank, overall_score, productivity_score, quality_score, deadline_score, trend)
VALUES
    ('i1111111-1111-1111-1111-111111111111', 'weekly', '2026-05-26', '2026-06-01', 2, 2, 3, 2, 90.00, 88.00, 90.00, 95.00, 'up'),
    ('i2222222-2222-2222-2222-222222222222', 'weekly', '2026-05-26', '2026-06-01', 3, 4, 4, 3, 82.00, 78.00, 85.00, 88.00, 'stable'),
    ('i3333333-3333-3333-3333-333333333333', 'weekly', '2026-05-26', '2026-06-01', 5, 5, 5, 5, 72.00, 68.00, 75.00, 70.00, 'down'),
    ('i4444444-4444-4444-4444-444444444444', 'weekly', '2026-05-26', '2026-06-01', 1, 1, 1, 1, 95.00, 96.00, 96.00, 100.00, 'up'),
    ('i5555555-5555-5555-5555-555555555555', 'weekly', '2026-05-26', '2026-06-01', 1, 3, 2, 1, 94.00, 90.00, 95.00, 100.00, 'up'),
    ('i1111111-1111-1111-1111-111111111111', 'monthly', '2026-05-01', '2026-05-31', 2, 2, 2, 2, 88.00, 85.00, 86.00, 82.00, 'up'),
    ('i2222222-2222-2222-2222-222222222222', 'monthly', '2026-05-01', '2026-05-31', 3, 3, 3, 3, 80.00, 75.00, 82.00, 78.00, 'stable'),
    ('i3333333-3333-3333-3333-333333333333', 'monthly', '2026-05-01', '2026-05-31', 5, 5, 5, 5, 70.00, 65.00, 78.00, 68.00, 'down'),
    ('i4444444-4444-4444-4444-444444444444', 'monthly', '2026-05-01', '2026-05-31', 1, 1, 1, 1, 92.00, 90.00, 92.00, 95.00, 'up'),
    ('i5555555-5555-5555-5555-555555555555', 'monthly', '2026-05-01', '2026-05-31', 1, 4, 1, 2, 90.00, 82.00, 90.00, 88.00, 'up')
ON CONFLICT DO NOTHING;
