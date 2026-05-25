-- ============================================================
-- Workspace Module Migration: Projects & Campaigns
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/001_projects.sql
-- ============================================================

-- Trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- PROJECTS: Core project entity
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    color VARCHAR(7) DEFAULT '#E60012',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    owner_id UUID,
    team_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);
CREATE INDEX IF NOT EXISTS idx_pm_projects_priority ON pm_projects(priority);
CREATE INDEX IF NOT EXISTS idx_pm_projects_owner ON pm_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_due ON pm_projects(end_date);

DO $$ BEGIN
    CREATE TRIGGER update_pm_projects_updated_at
        BEFORE UPDATE ON pm_projects
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CAMPAIGNS: Marketing campaigns linked to projects
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm_projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    target_metrics JSONB DEFAULT '{}',
    actual_metrics JSONB DEFAULT '{}',
    channels TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_campaigns_project ON pm_campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_campaigns_status ON pm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_pm_campaigns_due ON pm_campaigns(end_date);

DO $$ BEGIN
    CREATE TRIGGER update_pm_campaigns_updated_at
        BEFORE UPDATE ON pm_campaigns
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Seed sample data
-- ============================================================
INSERT INTO pm_projects (id, name, description, status, priority, color, start_date, end_date)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Summer Sale 2026', 'Chiến dịch bán hàng mùa hè 2026 - laptop, phụ kiện', 'active', 'high', '#E60012', '2026-06-01', '2026-08-31'),
    ('22222222-2222-2222-2222-222222222222', 'Back to School 2026', 'Chiến dịch khai giảng năm học mới', 'planning', 'medium', '#2563eb', '2026-07-01', '2026-09-15'),
    ('33333333-3333-3333-3333-333333333333', 'Brand Awareness Q3', 'Nâng cao nhận diện thương hiệu Mỹ Tho Laptop', 'active', 'medium', '#7c3aed', '2026-07-01', '2026-09-30'),
    ('44444444-4444-4444-4444-444444444444', 'Gaming Laptop Launch', 'Ra mắt dòng laptop gaming mới', 'active', 'urgent', '#dc2626', '2026-06-15', '2026-07-15')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pm_campaigns (id, project_id, name, campaign_type, status, start_date, end_date, channels)
VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Facebook Summer Sale', 'social_media', 'active', '2026-06-01', '2026-08-31', ARRAY['facebook', 'tiktok', 'zalo']),
    ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'SEO Content Summer', 'seo', 'active', '2026-06-01', '2026-08-31', ARRAY['website']),
    ('bbbb1111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Gaming Product Launch', 'product_launch', 'active', '2026-06-15', '2026-07-15', ARRAY['facebook', 'youtube', 'tiktok'])
ON CONFLICT (id) DO NOTHING;
