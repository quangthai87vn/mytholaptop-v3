-- ============================================================
-- Workspace KPI Views — P6.6 KPI & Performance Analytics
-- Run: psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f sql/workspace/017_kpi_views.sql
-- ============================================================
BEGIN;

-- ============================================================
-- VIEW: v_kpi_overview
-- KPI tổng quan cho workspace
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_overview AS
SELECT
  -- Task counts
  (SELECT COUNT(*) FROM pm_tasks WHERE stage != 'published' AND stage != 'archived') AS tasks_in_progress,
  (SELECT COUNT(*) FROM pm_tasks WHERE stage = 'published') AS tasks_published,
  (SELECT COUNT(*) FROM pm_tasks WHERE due_date < CURRENT_DATE AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_overdue,
  (SELECT COUNT(*) FROM pm_tasks WHERE due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_due_this_week,
  -- Approval metrics
  (SELECT COUNT(*) FROM pm_task_approvals WHERE action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_approved_30d,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE action IN ('reject', 'request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_rejected_30d,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE action = 'submit_review' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_submitted_30d,
  -- Content by platform
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'facebook' AND stage = 'published') AS published_facebook,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'website' AND stage = 'published') AS published_website,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'tiktok' AND stage = 'published') AS published_tiktok,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'youtube' AND stage = 'published') AS published_youtube,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'zalo' AND stage = 'published') AS published_zalo,
  -- Approved not published
  (SELECT COUNT(*) FROM pm_tasks WHERE stage = 'approved') AS approved_not_published,
  -- Published this month
  (SELECT COUNT(*) FROM pm_tasks
   WHERE stage = 'published'
     AND published_at IS NOT NULL
     AND published_at >= DATE_TRUNC('month', CURRENT_DATE)
     AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS published_this_month,
  -- Published this week
  (SELECT COUNT(*) FROM pm_tasks
   WHERE stage = 'published'
     AND published_at IS NOT NULL
     AND published_at >= DATE_TRUNC('week', CURRENT_DATE)
     AND published_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week') AS published_this_week,
  -- Campaign metrics
  (SELECT COUNT(*) FROM pm_campaigns WHERE status = 'active') AS active_campaigns,
  (SELECT COUNT(*) FROM pm_campaigns WHERE end_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) AS overdue_campaigns,
  -- Interns
  (SELECT COUNT(*) FROM pm_interns WHERE status = 'active') AS active_interns,
  -- Weekly trend (last 4 weeks: published per week)
  (SELECT json_agg(w.week_count ORDER BY w.week_start)
   FROM (
     SELECT
       DATE_TRUNC('week', published_at) AS week_start,
       COUNT(*) AS week_count
     FROM pm_tasks
     WHERE stage = 'published'
       AND published_at IS NOT NULL
       AND published_at >= CURRENT_DATE - INTERVAL '4 weeks'
     GROUP BY 1
     ORDER BY 1
   ) AS w) AS weekly_published_trend;

-- ============================================================
-- VIEW: v_kpi_user_performance
-- KPI cho từng user (theo assignee)
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_user_performance AS
SELECT
  u.id AS user_id,
  COALESCE(u.full_name, 'Unknown') AS user_name,
  COALESCE(u.role, 'viewer') AS role,
  -- Assigned tasks (user là assignee)
  (SELECT COUNT(*) FROM pm_tasks WHERE $1 = ANY(assignee_ids)) AS tasks_assigned,
  -- Completed tasks
  (SELECT COUNT(*) FROM pm_tasks WHERE $1 = ANY(assignee_ids) AND stage = 'published') AS tasks_completed,
  -- In progress
  (SELECT COUNT(*) FROM pm_tasks WHERE $1 = ANY(assignee_ids) AND stage NOT IN ('published', 'archived')) AS tasks_in_progress,
  -- Overdue
  (SELECT COUNT(*) FROM pm_tasks
   WHERE $1 = ANY(assignee_ids)
     AND due_date < CURRENT_DATE
     AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_overdue,
  -- Due this week
  (SELECT COUNT(*) FROM pm_tasks
   WHERE $1 = ANY(assignee_ids)
     AND due_date >= CURRENT_DATE
     AND due_date < CURRENT_DATE + INTERVAL '7 days'
     AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_due_this_week,
  -- Approval approved by this user (as reviewer)
  (SELECT COUNT(*) FROM pm_task_approvals WHERE reviewer_id = $1 AND action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_approved_30d,
  -- Approval rejected by this user
  (SELECT COUNT(*) FROM pm_task_approvals WHERE reviewer_id = $1 AND action IN ('reject', 'request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_rejected_30d,
  -- Published by this user
  (SELECT COUNT(*) FROM pm_tasks
   WHERE $1 = ANY(assignee_ids) AND stage = 'published'
     AND published_at IS NOT NULL
     AND published_at >= CURRENT_DATE - INTERVAL '30 days') AS published_30d,
  -- Average completion days
  (
    SELECT COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400),
      0
    )::INTEGER
    FROM pm_tasks
    WHERE $1 = ANY(assignee_ids)
      AND stage = 'published'
      AND completed_at IS NOT NULL
      AND completed_at >= CURRENT_DATE - INTERVAL '90 days'
  ) AS avg_completion_days
FROM admin_users u
WHERE u.status = 'active';

-- ============================================================
-- FUNCTION: get_user_kpi(user_id UUID)
-- Trả về KPI chi tiết cho 1 user
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_kpi(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tasks_assigned', (
      SELECT COUNT(*) FROM pm_tasks WHERE target_user_id = ANY(assignee_ids)
    ),
    'tasks_completed', (
      SELECT COUNT(*) FROM pm_tasks WHERE target_user_id = ANY(assignee_ids) AND stage = 'published'
    ),
    'tasks_in_progress', (
      SELECT COUNT(*) FROM pm_tasks WHERE target_user_id = ANY(assignee_ids) AND stage NOT IN ('published', 'archived')
    ),
    'tasks_overdue', (
      SELECT COUNT(*) FROM pm_tasks
      WHERE target_user_id = ANY(assignee_ids)
        AND due_date < CURRENT_DATE
        AND stage NOT IN ('approved', 'scheduled', 'published')
    ),
    'approvals_approved', (
      SELECT COUNT(*) FROM pm_task_approvals
      WHERE reviewer_id = target_user_id AND action = 'approve'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    'approvals_rejected', (
      SELECT COUNT(*) FROM pm_task_approvals
      WHERE reviewer_id = target_user_id AND action IN ('reject', 'request_revision')
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    'published_30d', (
      SELECT COUNT(*) FROM pm_tasks
      WHERE target_user_id = ANY(assignee_ids)
        AND stage = 'published'
        AND published_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    'avg_completion_days', COALESCE((
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)::INTEGER
      FROM pm_tasks
      WHERE target_user_id = ANY(assignee_ids)
        AND stage = 'published'
        AND completed_at IS NOT NULL
        AND completed_at >= CURRENT_DATE - INTERVAL '90 days'
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: get_weekly_completion_trend(weeks INTEGER)
-- Trả về số task completed theo tuần
-- ============================================================
CREATE OR REPLACE FUNCTION get_weekly_completion_trend(weeks_count INTEGER DEFAULT 8)
RETURNS TABLE(week_start DATE, completed INTEGER, approved INTEGER, published INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.week_start,
    COALESCE((
      SELECT COUNT(*) FROM pm_tasks
      WHERE completed_at IS NOT NULL
        AND DATE_TRUNC('week', completed_at) = w.week_start
    ), 0)::INTEGER AS completed,
    COALESCE((
      SELECT COUNT(*) FROM pm_task_approvals
      WHERE action = 'approve'
        AND DATE_TRUNC('week', created_at) = w.week_start
    ), 0)::INTEGER AS approved,
    COALESCE((
      SELECT COUNT(*) FROM pm_tasks
      WHERE stage = 'published'
        AND published_at IS NOT NULL
        AND DATE_TRUNC('week', published_at) = w.week_start
    ), 0)::INTEGER AS published
  FROM generate_series(
    DATE_TRUNC('week', CURRENT_DATE) - (weeks_count - 1) * INTERVAL '1 week',
    DATE_TRUNC('week', CURRENT_DATE),
    INTERVAL '1 week'
  ) AS w(week_start)
  ORDER BY w.week_start;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Grants
-- ============================================================
-- GRANT SELECT ON v_kpi_overview TO mytholaptop_user;
-- GRANT SELECT ON v_kpi_user_performance TO mytholaptop_user;
-- GRANT EXECUTE ON FUNCTION get_user_kpi TO mytholaptop_user;
-- GRANT EXECUTE ON FUNCTION get_weekly_completion_trend TO mytholaptop_user;

COMMENT ON VIEW v_kpi_overview IS 'Tổng quan KPI workspace: tasks, approvals, content, campaigns';
COMMENT ON VIEW v_kpi_user_performance IS 'KPI performance cho từng user theo assignee';
COMMENT ON FUNCTION get_user_kpi IS 'Trả về KPI JSONB cho 1 user theo assignee_id';
COMMENT ON FUNCTION get_weekly_completion_trend IS 'Trend số task completed/approved/published theo tuần';

COMMIT;
