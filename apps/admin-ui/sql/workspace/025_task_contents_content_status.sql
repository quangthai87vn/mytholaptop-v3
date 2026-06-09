-- ============================================================
-- Migration: 025_task_contents_content_status.sql
-- Phase 3: Content Production Workflow
-- Date: 2026-05-29
-- Run: docker run --rm -v "d:/AI PROJECT/mytholaptop-v3:/data" postgres:16 \
--        psql "postgresql://mytholaptop_user:PASSWORD@postgresql.mtl.vn:7000/mytholaptop" \
--        -f "/data/apps/admin-ui/sql/workspace/025_task_contents_content_status.sql"
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- 1. ADD CONTENT_STATUS COLUMN TO pm_tasks
-- Content workflow độc lập với task workflow:
-- Phase 3: draft → writing → internal_review → revision → approved → published
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
    ALTER TABLE pm_tasks ADD COLUMN content_status VARCHAR(20) DEFAULT 'draft';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add CHECK constraint if not exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pm_tasks_content_status_check'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        ALTER TABLE pm_tasks
            ADD CONSTRAINT pm_tasks_content_status_check
            CHECK (content_status IN ('draft', 'writing', 'internal_review', 'revision', 'approved', 'published'));
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Add NOT NULL after setting default
DO $$
BEGIN
    ALTER TABLE pm_tasks ALTER COLUMN content_status SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 2. ADD APPROVED_BY AND APPROVED_AT TO pm_tasks
-- Ai duyệt content
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
    ALTER TABLE pm_tasks ADD COLUMN approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE pm_tasks ADD COLUMN approved_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 3. CREATE pm_task_contents TABLE
-- Lưu trữ content body chi tiết cho mỗi task
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_task_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Liên kết task
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,

    -- Content metadata
    content_type VARCHAR(50) DEFAULT 'article',
    content_title VARCHAR(500),
    content_body TEXT,

    -- Content status độc lập với task status
    content_status VARCHAR(20) NOT NULL DEFAULT 'draft',

    -- Rich text / script / notes
    rich_text TEXT,
    script TEXT,
    notes TEXT,

    -- Authorship
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- UNIQUE: mỗi task chỉ có 1 content record
    UNIQUE(task_id)
);

-- Add CHECK constraint for content_status
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pm_task_contents_content_status_check'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        ALTER TABLE pm_task_contents
            ADD CONSTRAINT pm_task_contents_content_status_check
            CHECK (content_status IN ('draft', 'writing', 'internal_review', 'revision', 'approved', 'published'));
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pm_task_contents_task_id ON pm_task_contents(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_contents_content_status ON pm_task_contents(content_status);

-- Trigger cho updated_at
DO $$ BEGIN
    CREATE TRIGGER update_pm_task_contents_updated_at
        BEFORE UPDATE ON pm_task_contents
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 4. BACKFILL: tạo content record cho tasks hiện có
-- ──────────────────────────────────────────────────────────

DO $$
DECLARE
    task_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count FROM pm_tasks;
    IF task_count > 0 THEN
        INSERT INTO pm_task_contents
            (task_id, content_type, content_title, content_body, content_status, rich_text, notes, created_by, created_at, updated_at)
        SELECT
            t.id,
            COALESCE(t.task_type, 'article'),
            COALESCE(t.content_title, t.title),
            t.content_body,
            COALESCE(t.content_status, 'draft'),
            t.content_body,
            t.description,
            t.reporter_id,
            t.created_at,
            t.updated_at
        FROM pm_tasks t
        ON CONFLICT (task_id) DO NOTHING;
        RAISE NOTICE 'Backfilled % task contents records', task_count;
    ELSE
        RAISE NOTICE 'No tasks to backfill - skipping';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 5. UPDATE pm_task_checklist_items: ensure completed tracking
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
    ALTER TABLE pm_task_checklist_items ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────
-- 6. VERIFICATION
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_tasks' AND column_name = 'content_status'
    ) THEN
        RAISE NOTICE 'OK: pm_tasks.content_status column added';
    ELSE
        RAISE EXCEPTION 'FAIL: pm_tasks.content_status column not added';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE tablename = 'pm_task_contents'
    ) THEN
        RAISE NOTICE 'OK: pm_task_contents table created';
    ELSE
        RAISE EXCEPTION 'FAIL: pm_task_contents table not created';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pm_task_contents_task_id_key'
    ) THEN
        RAISE NOTICE 'OK: pm_task_contents task_id UNIQUE constraint';
    ELSE
        RAISE EXCEPTION 'FAIL: pm_task_contents task_id UNIQUE constraint missing';
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- 7. LOG MIGRATION
-- ──────────────────────────────────────────────────────────

INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
    'System',
    'migration',
    'system',
    NULL,
    '{"migration": "025_task_contents_content_status", "description": "Add content_status to pm_tasks; create pm_task_contents table; add approved_by/approved_at; Phase 3 Content Production Workflow"}'
);

COMMIT;
