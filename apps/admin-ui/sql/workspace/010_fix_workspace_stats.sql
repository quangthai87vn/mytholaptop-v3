-- ============================================================
-- Migration: Fix v_workspace_stats View
-- Adapt to current production schema (pm_projects does NOT have status column)
-- pm_tasks uses 'status' column (not 'stage')
--
-- IMPORTANT: pm_projects.status column was planned to be removed in migration 006
-- but migration 006 has NOT been run on production yet.
-- This file is a HOTFIX — only updates the view logic.
-- After migration 006 is fully deployed to production, this file should
-- be replaced with the version that uses pm_projects.status.
--
-- Run:
--   docker run --rm -v "d:/AI PROJECT/mytholaptop-v3:/data" postgres:16 \
--     psql "postgresql://..." -f "/data/apps/admin-ui/sql/workspace/010_fix_workspace_stats.sql"
-- ============================================================
BEGIN;

DROP VIEW IF EXISTS v_workspace_stats CASCADE;

CREATE OR REPLACE VIEW v_workspace_stats AS
SELECT
  -- active_projects: all projects (pm_projects.status column not yet removed in production)
  (SELECT COUNT(*)::INTEGER FROM pm_projects) AS active_projects,
  -- due_this_week: task due within 7 days, not completed/cancelled
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE due_date IS NOT NULL
     AND due_date <= CURRENT_DATE + INTERVAL '7 days'
     AND status NOT IN ('completed', 'cancelled')) AS due_this_week,
  -- overdue_tasks: past due_date, not completed/cancelled
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE due_date < CURRENT_DATE
     AND status NOT IN ('completed', 'cancelled')) AS overdue_tasks,
  -- overdue_campaigns: campaign past end_date, not completed/cancelled
  (SELECT COUNT(*)::INTEGER FROM pm_campaigns
   WHERE end_date < CURRENT_DATE
     AND status NOT IN ('completed', 'cancelled')) AS overdue_campaigns,
  -- media_ready: tasks in review status (awaiting approval)
  (SELECT COUNT(*)::INTEGER FROM pm_tasks WHERE status = 'review') AS media_ready,
  -- total_interns: active interns
  (SELECT COUNT(*)::INTEGER FROM pm_interns WHERE status = 'active') AS total_interns,
  -- published_this_month: completed tasks with published_at this month
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE status = 'completed'
     AND published_at IS NOT NULL
     AND published_at >= DATE_TRUNC('month', CURRENT_DATE)
     AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS published_this_month;

COMMIT;
