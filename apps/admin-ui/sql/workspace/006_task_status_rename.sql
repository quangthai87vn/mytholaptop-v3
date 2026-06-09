-- ============================================================
-- Migration: Task Status Rename & Schema Cleanup
-- Phase 1-2 Stabilization
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/006_task_status_rename.sql
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────
-- 1. Rename task status values
-- Old → New:
--   backlog        → idea
--   todo          → assigned
--   in_progress   → working
--   review        → review      (keep)
--   done          → completed
--   cancelled     → cancelled   (keep)
-- ─────────────────────────────────────────

UPDATE pm_tasks SET status = 'idea'       WHERE status = 'backlog';
UPDATE pm_tasks SET status = 'assigned'   WHERE status = 'todo';
UPDATE pm_tasks SET status = 'working'    WHERE status = 'in_progress';
UPDATE pm_tasks SET status = 'completed' WHERE status = 'done';

-- Activity logs
UPDATE pm_task_activities
  SET new_value = 'idea'
  WHERE action = 'status_changed' AND new_value = 'backlog';
UPDATE pm_task_activities
  SET new_value = 'assigned'
  WHERE action = 'status_changed' AND new_value = 'todo';
UPDATE pm_task_activities
  SET new_value = 'working'
  WHERE action = 'status_changed' AND new_value = 'in_progress';
UPDATE pm_task_activities
  SET new_value = 'completed'
  WHERE action = 'status_changed' AND new_value = 'done';

-- Status history
UPDATE pm_status_history
  SET to_status = 'idea'
  WHERE to_status = 'backlog';
UPDATE pm_status_history
  SET to_status = 'assigned'
  WHERE to_status = 'todo';
UPDATE pm_status_history
  SET to_status = 'working'
  WHERE to_status = 'in_progress';
UPDATE pm_status_history
  SET to_status = 'completed'
  WHERE to_status = 'done';

UPDATE pm_status_history
  SET from_status = 'idea'
  WHERE from_status = 'backlog';
UPDATE pm_status_history
  SET from_status = 'assigned'
  WHERE from_status = 'todo';
UPDATE pm_status_history
  SET from_status = 'working'
  WHERE from_status = 'in_progress';
UPDATE pm_status_history
  SET from_status = 'completed'
  WHERE from_status = 'done';

-- ─────────────────────────────────────────
-- 2. Add CHECK constraint for new statuses
-- ─────────────────────────────────────────

ALTER TABLE pm_tasks
  DROP CONSTRAINT IF EXISTS pm_tasks_status_check;

ALTER TABLE pm_tasks
  ADD CONSTRAINT pm_tasks_status_check
  CHECK (status IN ('idea','assigned','working','review','rework','completed','cancelled'));

-- ─────────────────────────────────────────
-- 3. Set default status to 'idea' (new default)
-- ─────────────────────────────────────────

ALTER TABLE pm_tasks
  ALTER COLUMN status SET DEFAULT 'idea';

-- ─────────────────────────────────────────
-- 4. Remove workflow_stage column
--    (content workflow stages now managed via status)
--    Note: column was renamed to 'stage' in media consolidation, so drop both
--    Must recreate KPI views that depend on 'stage' before dropping the column
-- ─────────────────────────────────────────

-- Drop views that depend on 'stage' column
DROP VIEW IF EXISTS v_kpi_overview;
DROP VIEW IF EXISTS v_kpi_user_performance;

-- Recreate v_kpi_overview using status instead of stage
-- Stage mapping: published→completed, approved→review, rest→working/assigned
CREATE OR REPLACE VIEW v_kpi_overview AS
SELECT
  (SELECT COUNT(*)::int FROM pm_tasks WHERE status NOT IN ('completed','cancelled')) AS tasks_in_progress,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE status = 'completed') AS tasks_published,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS tasks_overdue,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed','cancelled')) AS tasks_due_this_week,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_approved_30d,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE action IN ('reject','request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_rejected_30d,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE action = 'submit_review' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_submitted_30d,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE platform = 'facebook' AND status = 'completed') AS published_facebook,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE platform = 'website' AND status = 'completed') AS published_website,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE platform = 'tiktok' AND status = 'completed') AS published_tiktok,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE platform = 'youtube' AND status = 'completed') AS published_youtube,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE platform = 'zalo' AND status = 'completed') AS published_zalo,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE status = 'review') AS approved_not_published,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE status = 'completed' AND published_at IS NOT NULL AND published_at >= DATE_TRUNC('month', CURRENT_DATE) AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS published_this_month,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE status = 'completed' AND published_at IS NOT NULL AND published_at >= DATE_TRUNC('week', CURRENT_DATE) AND published_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days') AS published_this_week,
  (SELECT COUNT(*)::int FROM pm_campaigns WHERE status = 'active') AS active_campaigns,
  (SELECT COUNT(*)::int FROM pm_campaigns WHERE end_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS overdue_campaigns,
  (SELECT COUNT(*)::int FROM pm_interns WHERE status = 'active') AS active_interns;

-- Recreate v_kpi_user_performance using status instead of stage
CREATE OR REPLACE VIEW v_kpi_user_performance AS
SELECT
  u.id AS user_id,
  COALESCE(full_name, 'Unknown') AS user_name,
  COALESCE(role, 'viewer') AS role,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids)) AS tasks_assigned,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND status = 'completed') AS tasks_completed,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND status NOT IN ('completed','cancelled')) AS tasks_in_progress,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS tasks_overdue,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed','cancelled')) AS tasks_due_this_week,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE reviewer_id = u.id AND action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_approved_30d,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE reviewer_id = u.id AND action IN ('reject','request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_rejected_30d,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND status = 'completed' AND published_at IS NOT NULL AND published_at >= CURRENT_DATE - INTERVAL '30 days') AS published_30d,
  COALESCE((SELECT AVG(EXTRACT(EPOCH FROM completed_at - created_at) / 86400)::int FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND status = 'completed' AND completed_at IS NOT NULL AND completed_at >= CURRENT_DATE - INTERVAL '90 days'), 0) AS avg_completion_days
FROM admin_users u
WHERE u.status = 'active';

-- Now drop the column (views no longer depend on it)
ALTER TABLE pm_tasks DROP COLUMN IF EXISTS workflow_stage;
ALTER TABLE pm_tasks DROP COLUMN IF EXISTS stage;
DROP INDEX IF EXISTS idx_pm_tasks_stage;
DROP INDEX IF EXISTS idx_pm_tasks_workflow_stage;

-- ─────────────────────────────────────────
-- 5. Remove priority column
-- ─────────────────────────────────────────

ALTER TABLE pm_tasks DROP COLUMN IF EXISTS priority;
DROP INDEX IF EXISTS idx_pm_tasks_priority;

-- ─────────────────────────────────────────
-- 6. Remove tags column
-- ─────────────────────────────────────────

ALTER TABLE pm_tasks DROP COLUMN IF EXISTS tags;

-- ─────────────────────────────────────────
-- 7. Remove Campaign status column
--    (campaigns managed without explicit status field;
--     derived from tasks completion or just "planning")
-- ─────────────────────────────────────────

-- Actually, keep campaign status — it IS needed per design spec.
-- Campaigns have: planning/active/paused/completed/cancelled.
-- We do NOT remove it.

-- Step 0: Handle view dependencies on pm_projects.status
-- Drop view first, recreate after removing column
DROP VIEW IF EXISTS v_workspace_stats CASCADE;

-- ─────────────────────────────────────────
-- 8. Remove Project status/priority columns
-- ─────────────────────────────────────────

ALTER TABLE pm_projects DROP COLUMN IF EXISTS status;
ALTER TABLE pm_projects DROP COLUMN IF EXISTS priority;

-- Recreate view without status (active_projects = all non-archived projects)
-- archived is determined by checking for archived status or using a simpler count
CREATE OR REPLACE VIEW v_workspace_stats AS
SELECT
  (SELECT COUNT(*)::int FROM pm_projects) AS active_projects,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed','cancelled')) AS due_this_week,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS overdue_tasks,
  (SELECT COUNT(*)::int FROM pm_campaigns WHERE end_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) AS overdue_campaigns,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE status = 'review') AS media_ready,
  (SELECT COUNT(*)::int FROM pm_interns WHERE status = 'active') AS total_interns,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE published_at >= DATE_TRUNC('month', CURRENT_DATE) AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS published_this_month;

-- ─────────────────────────────────────────
-- 9. Log migration record
-- ─────────────────────────────────────────

INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
  'System',
  'migration',
  'system',
  NULL,
  '{"migration": "006_task_status_rename", "description": "Task status rename (backlog->idea, todo->assigned, in_progress->working, done->completed); remove stage, workflow_stage, priority, tags; remove project status/priority; recreate KPI views using status"}'
);

COMMIT;
