-- ============================================================
-- Workspace Module Migration: Task Approval Workflow
-- Run: psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f sql/workspace/014_task_approvals.sql
-- P6.3: Approval Workflow cho Content/Media Production
-- ============================================================

-- ============================================================
-- TASK APPROVALS: Approval audit trail cho Content/Media
-- Lưu lịch sử approve/reject/revision của từng task
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_task_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Liên kết task
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,

    -- Reviewer
    reviewer_id UUID,
    reviewer_name VARCHAR(255),

    -- Action taken
    action VARCHAR(50) NOT NULL, -- submit_review | approve | reject | request_revision | publish

    -- Review comment (bắt buộc khi reject/request_revision)
    comment TEXT,

    -- Stage transitions
    from_stage VARCHAR(50),
    to_stage VARCHAR(50),

    -- Metadata extra
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pm_task_approvals_task ON pm_task_approvals(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_approvals_reviewer ON pm_task_approvals(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_pm_task_approvals_action ON pm_task_approvals(action);
CREATE INDEX IF NOT EXISTS idx_pm_task_approvals_created ON pm_task_approvals(created_at DESC);

-- ============================================================
-- CẬP NHẬT trigger cho update_updated_at_column
-- Bảng pm_tasks đã có trigger — không cần thêm gì ở đây
-- ============================================================
