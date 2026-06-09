-- ============================================================
-- Migration: Fix KPI Views for Archive Field
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/037_fix_kpi_views_archive.sql
--
-- Bug: v_kpi_overview and v_kpi_user_performance do NOT filter
--       is_archived = FALSE, causing archived tasks to be counted
--       in dashboard stats (overdue, in-progress, published, etc.)
--
-- Fix: Add is_archived = FALSE to ALL pm_tasks queries in both views
--
-- NOTE: pm_campaigns uses deleted_at for archiving
-- ============================================================
BEGIN;

-- ============================================================
-- VIEW: v_kpi_overview
-- Fix: add is_archived = FALSE to all pm_tasks subqueries
-- ============================================================
DROP VIEW IF EXISTS v_kpi_overview CASCADE;

CREATE OR REPLACE VIEW v_kpi_overview AS
SELECT
  -- in-progress: active non-archived tasks
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status NOT IN ('completed','cancelled'))                                                                                         AS tasks_in_progress,
  -- published: completed non-archived tasks
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed')                                                                                                            AS tasks_published,
  -- overdue: past due_date, not archived, not completed/cancelled
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled'))                                                           AS tasks_overdue,
  -- due this week: due within 7 days, not archived, not completed/cancelled
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed','cancelled'))      AS tasks_due_this_week,
  -- approvals in last 30 days
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days')                                                                       AS approvals_approved_30d,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE action IN ('reject','request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days')                                                AS approvals_rejected_30d,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE action = 'submit_review' AND created_at >= CURRENT_DATE - INTERVAL '30 days')                                                                AS approvals_submitted_30d,
  -- published by platform (from metadata.platform_ids — simple lookup)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND metadata->'platform_ids' ? 'facebook')                                                                 AS published_facebook,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND metadata->'platform_ids' ? 'website')                                                                   AS published_website,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND metadata->'platform_ids' ? 'tiktok')                                                                  AS published_tiktok,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND metadata->'platform_ids' ? 'youtube')                                                                 AS published_youtube,
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND metadata->'platform_ids' ? 'zalo')                                                                    AS published_zalo,
  -- review: awaiting approval (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'review')                                                                                                           AS approved_not_published,
  -- published this month (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND published_at IS NOT NULL AND published_at >= DATE_TRUNC('month', CURRENT_DATE) AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')  AS published_this_month,
  -- published this week (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND status = 'completed' AND published_at IS NOT NULL AND published_at >= DATE_TRUNC('week', CURRENT_DATE) AND published_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days') AS published_this_week,
  -- active campaigns (not archived)
  (SELECT COUNT(*)::int FROM pm_campaigns WHERE deleted_at IS NULL AND status = 'active')                                                                                                         AS active_campaigns,
  -- overdue campaigns (not archived)
  (SELECT COUNT(*)::int FROM pm_campaigns WHERE deleted_at IS NULL AND end_date < CURRENT_DATE AND status NOT IN ('completed','cancelled'))                                                       AS overdue_campaigns,
  -- active interns
  (SELECT COUNT(*)::int FROM pm_interns WHERE status = 'active')                                                                                                                                  AS active_interns;

-- ============================================================
-- VIEW: v_kpi_user_performance
-- Fix: add is_archived = FALSE to all pm_tasks subqueries
-- ============================================================
DROP VIEW IF EXISTS v_kpi_user_performance CASCADE;

CREATE OR REPLACE VIEW v_kpi_user_performance AS
SELECT
  u.id AS user_id,
  COALESCE(full_name, 'Unknown') AS user_name,
  COALESCE(role, 'viewer') AS role,
  -- tasks assigned (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids))                                                                                                      AS tasks_assigned,
  -- tasks completed (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids) AND status = 'completed')                                                                              AS tasks_completed,
  -- tasks in progress (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids) AND status NOT IN ('completed','cancelled'))                                                           AS tasks_in_progress,
  -- overdue tasks (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids) AND due_date < CURRENT_DATE AND status NOT IN ('completed','cancelled'))                                   AS tasks_overdue,
  -- due this week (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids) AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed','cancelled')) AS tasks_due_this_week,
  -- approvals given in last 30 days
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE reviewer_id = u.id AND action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days')                                                 AS approvals_approved_30d,
  (SELECT COUNT(*)::int FROM pm_task_approvals WHERE reviewer_id = u.id AND action IN ('reject','request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days')                              AS approvals_rejected_30d,
  -- content published (not archived)
  (SELECT COUNT(*)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids) AND status = 'completed' AND published_at IS NOT NULL AND published_at >= CURRENT_DATE - INTERVAL '30 days') AS published_30d,
  -- avg completion days (not archived)
  COALESCE((SELECT AVG(EXTRACT(EPOCH FROM completed_at - created_at) / 86400)::int FROM pm_tasks WHERE is_archived = FALSE AND u.id = ANY(assignee_ids) AND status = 'completed' AND completed_at IS NOT NULL AND completed_at >= CURRENT_DATE - INTERVAL '90 days'), 0) AS avg_completion_days
FROM admin_users u
WHERE u.status = 'active';

-- ============================================================
-- Log migration
-- ============================================================
INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
  'System',
  'migration',
  'system',
  NULL,
  '{"migration": "037_fix_kpi_views_archive", "description": "Fix v_kpi_overview and v_kpi_user_performance to filter is_archived = FALSE for all pm_tasks queries. Archived tasks were being counted in dashboard stats."}'
);

COMMIT;
