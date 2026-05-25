-- ============================================================
-- Seed data for Workspace Module (pm_* tables)
-- Run AFTER migrations
-- ============================================================

-- Seed projects (using valid UUIDs)
INSERT INTO pm_projects (id, name, description, status, priority, color, start_date, end_date)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Summer Sale 2026', 'Chiến dịch bán hàng mùa hè 2026 - laptop, phụ kiện', 'active', 'high', '#E60012', '2026-06-01', '2026-08-31'),
    ('22222222-2222-2222-2222-222222222222', 'Back to School 2026', 'Chiến dịch khai giảng năm học mới', 'planning', 'medium', '#2563eb', '2026-07-01', '2026-09-15'),
    ('33333333-3333-3333-3333-333333333333', 'Brand Awareness Q3', 'Nâng cao nhận diện thương hiệu Mỹ Tho Laptop', 'active', 'medium', '#7c3aed', '2026-07-01', '2026-09-30'),
    ('44444444-4444-4444-4444-444444444444', 'Gaming Laptop Launch', 'Ra mắt dòng laptop gaming mới', 'active', 'urgent', '#dc2626', '2026-06-15', '2026-07-15')
ON CONFLICT (id) DO NOTHING;

-- Seed campaigns
INSERT INTO pm_campaigns (id, project_id, name, campaign_type, status, start_date, end_date, channels)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Facebook Summer Sale', 'social_media', 'active', '2026-06-01', '2026-08-31', ARRAY['facebook', 'tiktok', 'zalo']),
    ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'SEO Content Summer', 'seo', 'active', '2026-06-01', '2026-08-31', ARRAY['website']),
    ('bbbb1111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Gaming Product Launch', 'product_launch', 'active', '2026-06-15', '2026-07-15', ARRAY['facebook', 'youtube', 'tiktok'])
ON CONFLICT (id) DO NOTHING;

-- Seed tasks
INSERT INTO pm_tasks (id, project_id, campaign_id, title, description, status, priority, stage, due_date, progress, assignee_ids)
VALUES
    ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Viết 10 bài Facebook post cho Summer Sale', 'Nội dung về laptop, phụ kiện giảm giá', 'in_progress', 'high', 'writing', '2026-06-05', 60, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[]),
    ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Quay video giới thiệu Summer Sale', 'Video 30s cho Facebook & TikTok', 'review', 'medium', 'review', '2026-06-03', 90, ARRAY['11111111-0000-0000-0000-000000000002']::UUID[]),
    ('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'Viết bài SEO về laptop gaming', 'Bài viết 1500 từ, từ khóa laptop gaming giá rẻ', 'done', 'medium', 'published', '2026-05-28', 100, ARRAY['11111111-0000-0000-0000-000000000003']::UUID[]),
    ('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Thiết kế banner Summer Sale', 'Banner web + banner Facebook', 'todo', 'high', NULL, '2026-06-07', 0, ARRAY['11111111-0000-0000-0000-000000000003']::UUID[]),
    ('c5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Chụp ảnh sản phẩm laptop mới', 'Bộ ảnh 5-8 tấm cho content', 'in_progress', 'high', 'filming', '2026-06-04', 40, ARRAY['11111111-0000-0000-0000-000000000002']::UUID[]),
    ('c6666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', NULL, 'Lên kế hoạch influencer marketing', 'Tìm kiếm và liên hệ 3 influencer local', 'backlog', 'medium', NULL, '2026-06-20', 0, ARRAY[]::UUID[]),
    ('c7777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Tạo prompt AI sinh hình ảnh sản phẩm', 'Dùng AI tạo mockup laptop', 'done', 'low', 'published', '2026-05-25', 100, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[]),
    ('c8888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Viết kịch bản video ra mắt gaming laptop', 'Script 60s cho video YouTube', 'in_progress', 'urgent', 'writing', '2026-06-02', 50, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[]),
    ('c9999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Quay video unboxing gaming laptop', 'Video unboxing + first impression', 'todo', 'urgent', 'filming', '2026-06-08', 0, ARRAY['11111111-0000-0000-0000-000000000002']::UUID[]),
    ('caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'bbbb1111-1111-1111-1111-111111111111', 'Viết bài SEO gaming laptop ra mắt', 'Content SEO cho website', 'todo', 'high', NULL, '2026-06-10', 0, ARRAY['11111111-0000-0000-0000-000000000003']::UUID[]),
    ('cbbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', NULL, 'Lên chiến dịch Back to School content plan', 'Plan chi tiết 20 bài viết + 10 video', 'in_progress', 'high', NULL, '2026-06-15', 30, ARRAY['11111111-0000-0000-0000-000000000001']::UUID[])
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

-- Seed media workflows
INSERT INTO pm_media_workflows (id, project_id, campaign_id, title, content_type, platform, status, due_date, assignee_ids, ai_generated_content)
VALUES
    ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'FB Post: Laptop Gaming giảm 30% Summer Sale', 'facebook_post', 'facebook', 'writing', '2026-06-05', ARRAY['11111111-0000-0000-0000-000000000001']::UUID[], '🔥 MÙA HÈ RỰC RỠ - GIẢM ĐẾN 30%! 🔥 Máy laptop gaming chỉ từ 15.9 triệu. Đồng thời, game thủ sẽ được tặng ngay chuột gaming và tai nghe khi mua bất kỳ laptop gaming nào. 👉 Xem ngay: mytholaptop.vn'),
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

-- Seed interns
INSERT INTO pm_interns (id, full_name, email, phone, university, major, year_of_study, position, start_date, status, skills, bio)
VALUES
    ('11111111-0000-0000-0000-000000000001', 'Nguyễn Văn An', 'an.nguyen@st.utc.edu.vn', '0901234567', 'ĐH Giao thông Vận tải TP.HCM', 'Marketing', 3, 'content_intern', '2026-01-15', 'active', ARRAY['content_writing', 'social_media', 'ai_content'], 'Thích viết content về công nghệ, đam mê laptop và gaming'),
    ('11111111-0000-0000-0000-000000000002', 'Trần Thị Minh', 'minh.tran@st.hcmuarc.edu.vn', '0902345678', 'ĐH Khoa học Tự nhiên TP.HCM', 'Truyền thông Đa phương tiện', 4, 'video_intern', '2026-02-01', 'active', ARRAY['video_editing', 'filming', 'after_effects', 'premiere_pro'], 'Chuyên quay và edit video, có kinh nghiệm làm YouTube'),
    ('11111111-0000-0000-0000-000000000003', 'Hoàng Thị Lan', 'lan.hoang@st.uel.edu.vn', '0903456789', 'ĐH Kinh tế Luật TP.HCM', 'Marketing', 3, 'content_intern', '2026-03-01', 'active', ARRAY['seo_writing', 'wordpress', 'analytics'], 'Giỏi viết bài SEO, thích phân tích dữ liệu'),
    ('11111111-0000-0000-0000-000000000004', 'Lê Minh Tuấn', 'tuan.le@st.hcmut.edu.vn', '0904567890', 'ĐH Bách Khoa TP.HCM', 'Công nghệ Thông tin', 2, 'design_intern', '2026-04-01', 'active', ARRAY['photoshop', 'figma', 'illustrator', 'motion_graphics'], 'Thiết kế đồ họa, thích làm banner và mockup'),
    ('11111111-0000-0000-0000-000000000005', 'Phạm Thị Hương', 'huong.pham@st.uit.edu.vn', '0905678901', 'ĐH Công nghệ TP.HCM (UIT)', 'Thiết kế Đồ họa', 4, 'design_intern', '2025-09-01', 'active', ARRAY['photoshop', 'canva', 'brand_design'], 'Thiết kế brand identity, có kinh nghiệm 2 năm')
ON CONFLICT (id) DO NOTHING;

-- Seed intern KPIs
INSERT INTO pm_intern_kpis (intern_id, period_type, period_start, period_end, tasks_assigned, tasks_completed, tasks_overdue, completion_rate, on_time_count, late_count, deadline_accuracy, revision_count, quality_score, content_created, content_published)
VALUES
    ('11111111-0000-0000-0000-000000000001', 'weekly', '2026-05-26', '2026-06-01', 5, 5, 0, 100.00, 5, 0, 100.00, 1, 4.50, 5, 4),
    ('11111111-0000-0000-0000-000000000002', 'weekly', '2026-05-26', '2026-06-01', 4, 3, 1, 75.00, 3, 1, 75.00, 2, 4.20, 3, 3),
    ('11111111-0000-0000-0000-000000000003', 'weekly', '2026-05-26', '2026-06-01', 6, 4, 2, 66.67, 3, 3, 50.00, 3, 3.80, 4, 3),
    ('11111111-0000-0000-0000-000000000004', 'weekly', '2026-05-26', '2026-06-01', 3, 3, 0, 100.00, 3, 0, 100.00, 0, 4.70, 3, 3),
    ('11111111-0000-0000-0000-000000000005', 'weekly', '2026-05-26', '2026-06-01', 4, 4, 0, 100.00, 4, 0, 100.00, 1, 4.60, 4, 4)
ON CONFLICT DO NOTHING;

-- Seed weekly performance
INSERT INTO pm_weekly_performance (intern_id, week_start, overall_score, productivity_score, quality_score, teamwork_score, initiative_score, accomplishments, mentor_feedback, rating)
VALUES
    ('11111111-0000-0000-0000-000000000001', '2026-05-26', 4.50, 4.80, 4.50, 4.20, 4.50, 'Hoàn thành 5 bài viết, trong đó 1 bài FB post đạt 500+ tương tác', 'An làm việc rất chăm chỉ, chất lượng content ổn định. Cần cải thiện thêm về hashtag.', 'good'),
    ('11111111-0000-0000-0000-000000000002', '2026-05-26', 4.20, 4.00, 4.50, 4.00, 4.30, 'Hoàn thành 3 video, 1 video YouTube đạt 1000 lượt xem', 'Minh có kỹ năng edit tốt, cần chú ý deadline hơn. Video chất lượng cao nhưng giao hàng chậm.', 'good'),
    ('11111111-0000-0000-0000-000000000003', '2026-05-26', 3.80, 3.50, 4.00, 4.00, 3.80, 'Viết 4 bài SEO, 1 bài được Google index trong tuần', 'Lan cần cải thiện tốc độ làm việc. deadline accuracy còn thấp. Cần chủ động hơn trong công việc.', 'needs_improvement'),
    ('11111111-0000-0000-0000-000000000004', '2026-05-26', 4.70, 4.80, 4.80, 4.50, 4.70, 'Thiết kế 3 banner Summer Sale, 1 mockup laptop được duyệt ngay lần đầu', 'Tuấn làm việc xuất sắc, thiết kế đẹp, nhanh, không cần chỉnh sửa nhiều. Rất pro!', 'excellent'),
    ('11111111-0000-0000-0000-000000000005', '2026-05-26', 4.60, 4.50, 4.80, 4.50, 4.60, 'Hoàn thành brand kit mới, 4 banner cho chiến dịch', 'Hương làm việc rất chuyên nghiệp, sáng tạo. Chất lượng design luôn trên kỳ vọng.', 'excellent')
ON CONFLICT DO NOTHING;

-- Seed intern rankings
INSERT INTO pm_intern_rankings (intern_id, period_type, period_start, period_end, overall_rank, productivity_rank, quality_rank, deadline_rank, overall_score, productivity_score, quality_score, deadline_score, trend)
VALUES
    ('11111111-0000-0000-0000-000000000001', 'weekly', '2026-05-26', '2026-06-01', 2, 2, 3, 2, 90.00, 88.00, 90.00, 95.00, 'up'),
    ('11111111-0000-0000-0000-000000000002', 'weekly', '2026-05-26', '2026-06-01', 3, 4, 4, 3, 82.00, 78.00, 85.00, 88.00, 'stable'),
    ('11111111-0000-0000-0000-000000000003', 'weekly', '2026-05-26', '2026-06-01', 5, 5, 5, 5, 72.00, 68.00, 75.00, 70.00, 'down'),
    ('11111111-0000-0000-0000-000000000004', 'weekly', '2026-05-26', '2026-06-01', 1, 1, 1, 1, 95.00, 96.00, 96.00, 100.00, 'up'),
    ('11111111-0000-0000-0000-000000000005', 'weekly', '2026-05-26', '2026-06-01', 1, 3, 2, 1, 94.00, 90.00, 95.00, 100.00, 'up')
ON CONFLICT DO NOTHING;
