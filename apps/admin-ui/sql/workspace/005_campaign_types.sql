-- ============================================================
-- Migration 005: Campaign Types & Auto Status Transition
-- ============================================================

-- Campaign Types (danh mục loại chiến dịch)
CREATE TABLE IF NOT EXISTS pm_campaign_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#64748b',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_campaign_types_active ON pm_campaign_types(is_active);
CREATE INDEX IF NOT EXISTS idx_pm_campaign_types_sort ON pm_campaign_types(sort_order);

DO $$ BEGIN
    CREATE TRIGGER update_pm_campaign_types_updated_at
        BEFORE UPDATE ON pm_campaign_types
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed campaign types
INSERT INTO pm_campaign_types (code, name, description, icon, color, sort_order) VALUES
    ('product_launch', 'Khai trương sản phẩm', 'Chiến dịch ra mắt sản phẩm mới hoặc dòng sản phẩm mới', 'rocket', '#e60012', 1),
    ('seasonal', 'Theo mùa', 'Chiến dịch theo mùa, ngày lễ, sự kiện định kỳ', 'calendar', '#2563eb', 2),
    ('social_media', 'Mạng xã hội', 'Chiến dịch tập trung vào nội dung mạng xã hội (Facebook, TikTok, Zalo)', 'share-2', '#7c3aed', 3),
    ('seo', 'SEO', 'Chiến dịch tối ưu công cụ tìm kiếm, nội dung blog, website', 'search', '#059669', 4),
    ('advertising', 'Quảng cáo', 'Chiến dịch quảng cáo paid media (Google Ads, Facebook Ads)', 'megaphone', '#d97706', 5),
    ('email_marketing', 'Email Marketing', 'Chiến dịch gửi email chăm sóc, khuyến mãi khách hàng', 'mail', '#0891b2', 6),
    ('influencer', 'Influencer', 'Chiến dịch hợp tác với influencer, KOLs', 'users', '#db2777', 7)
ON CONFLICT (code) DO NOTHING;

-- Trigger: tự động chuyển campaign.active → completed khi hết hạn
CREATE OR REPLACE FUNCTION auto_complete_expired_campaigns()
RETURNS TRIGGER AS $$
BEGIN
    -- Khi end_date thay đổi thành giá trị trong quá khứ
    -- và trạng thái vẫn là active, tự động chuyển sang completed
    IF NEW.end_date < CURRENT_DATE
       AND OLD.status = 'active'
       AND NEW.status = 'active'
       AND NEW.end_date < OLD.end_date THEN
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_complete_campaigns ON pm_campaigns;
CREATE TRIGGER trg_auto_complete_campaigns
    BEFORE UPDATE ON pm_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION auto_complete_expired_campaigns();

-- Function: đánh dấu campaigns quá hạn (active nhưng end_date < hôm nay)
CREATE OR REPLACE FUNCTION get_overdue_campaigns()
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    status VARCHAR(50),
    end_date DATE,
    days_overdue INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.status,
        c.end_date,
        (CURRENT_DATE - c.end_date)::INT AS days_overdue
    FROM pm_campaigns c
    WHERE c.status = 'active'
      AND c.end_date < CURRENT_DATE
    ORDER BY (CURRENT_DATE - c.end_date) DESC;
END;
$$ LANGUAGE plpgsql;

-- View: thống kê campaigns với trạng thái auto-computed
CREATE OR REPLACE VIEW v_campaign_stats AS
SELECT
    c.id,
    c.name,
    c.status,
    c.campaign_type,
    c.start_date,
    c.end_date,
    c.project_id,
    CASE
        WHEN c.end_date < CURRENT_DATE AND c.status = 'active'
            THEN 'overdue'
        WHEN c.start_date > CURRENT_DATE AND c.status = 'planning'
            THEN 'upcoming'
        WHEN c.end_date >= CURRENT_DATE AND c.status = 'active'
            THEN 'running'
        ELSE c.status
    END AS effective_status,
    (SELECT COUNT(*) FROM pm_media_workflows mw WHERE mw.campaign_id = c.id) AS workflow_count,
    (SELECT COUNT(*) FROM pm_tasks t WHERE t.campaign_id = c.id) AS task_count,
    COALESCE(c.budget, 0) AS budget
FROM pm_campaigns c;
