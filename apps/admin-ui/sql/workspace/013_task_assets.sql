-- ============================================================
-- Workspace Module Migration: Task Assets
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/013_task_assets.sql
-- ============================================================

-- ============================================================
-- TASK ASSETS: Media/content asset management per task
-- P6.2: Asset Management cho Content/Media Workflow
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_task_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Asset metadata
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'other',
    title VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT,

    -- File info
    file_name VARCHAR(500) NOT NULL DEFAULT '',
    file_url TEXT,
    mime_type VARCHAR(100),
    file_size BIGINT,

    -- Storage
    storage_provider VARCHAR(50) DEFAULT 'local',
    original_url TEXT,

    -- Authorship
    uploaded_by UUID,
    uploaded_by_name VARCHAR(255),

    -- Versioning
    version INT DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,

    -- Extra metadata (for captions, prompts, canva links, etc.)
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pm_task_assets_task ON pm_task_assets(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_assets_type ON pm_task_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_pm_task_assets_uploaded_by ON pm_task_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pm_task_assets_created ON pm_task_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_task_assets_current ON pm_task_assets(task_id, is_current) WHERE is_current = TRUE;

DO $$ BEGIN
    CREATE TRIGGER update_pm_task_assets_updated_at
        BEFORE UPDATE ON pm_task_assets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- AUDIT LOG: Track asset upload/delete actions
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    asset_type VARCHAR(50),
    file_name VARCHAR(500),
    file_url TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_audit_logs_entity ON pm_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_audit_logs_actor ON pm_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_pm_audit_logs_created ON pm_audit_logs(created_at DESC);
