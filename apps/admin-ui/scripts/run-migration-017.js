/**
 * Run KPI Views Migration — P6.6
 * Execute: node scripts/run-migration-017.js
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const dbConfig = parseDatabaseUrl(dbUrl);

const client = new Client({
  ...dbConfig,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const sql = `
BEGIN;

-- ============================================================
-- VIEW: v_kpi_overview
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_overview AS
SELECT
  (SELECT COUNT(*) FROM pm_tasks WHERE stage != 'published' AND stage != 'archived') AS tasks_in_progress,
  (SELECT COUNT(*) FROM pm_tasks WHERE stage = 'published') AS tasks_published,
  (SELECT COUNT(*) FROM pm_tasks WHERE due_date < CURRENT_DATE AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_overdue,
  (SELECT COUNT(*) FROM pm_tasks WHERE due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_due_this_week,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_approved_30d,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE action IN ('reject', 'request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_rejected_30d,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE action = 'submit_review' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_submitted_30d,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'facebook' AND stage = 'published') AS published_facebook,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'website' AND stage = 'published') AS published_website,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'tiktok' AND stage = 'published') AS published_tiktok,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'youtube' AND stage = 'published') AS published_youtube,
  (SELECT COUNT(*) FROM pm_tasks WHERE platform = 'zalo' AND stage = 'published') AS published_zalo,
  (SELECT COUNT(*) FROM pm_tasks WHERE stage = 'approved') AS approved_not_published,
  (SELECT COUNT(*) FROM pm_tasks WHERE stage = 'published' AND published_at IS NOT NULL AND published_at >= DATE_TRUNC('month', CURRENT_DATE) AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS published_this_month,
  (SELECT COUNT(*) FROM pm_tasks WHERE stage = 'published' AND published_at IS NOT NULL AND published_at >= DATE_TRUNC('week', CURRENT_DATE) AND published_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week') AS published_this_week,
  (SELECT COUNT(*) FROM pm_campaigns WHERE status = 'active') AS active_campaigns,
  (SELECT COUNT(*) FROM pm_campaigns WHERE end_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) AS overdue_campaigns,
  (SELECT COUNT(*) FROM pm_interns WHERE status = 'active') AS active_interns;

-- ============================================================
-- VIEW: v_kpi_user_performance
-- ============================================================
CREATE OR REPLACE VIEW v_kpi_user_performance AS
SELECT
  u.id AS user_id,
  COALESCE(u.full_name, 'Unknown') AS user_name,
  COALESCE(u.role, 'viewer') AS role,
  (SELECT COUNT(*) FROM pm_tasks WHERE u.id = ANY(assignee_ids)) AS tasks_assigned,
  (SELECT COUNT(*) FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND stage = 'published') AS tasks_completed,
  (SELECT COUNT(*) FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND stage NOT IN ('published', 'archived')) AS tasks_in_progress,
  (SELECT COUNT(*) FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND due_date < CURRENT_DATE AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_overdue,
  (SELECT COUNT(*) FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND stage NOT IN ('approved', 'scheduled', 'published')) AS tasks_due_this_week,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE reviewer_id = u.id AND action = 'approve' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_approved_30d,
  (SELECT COUNT(*) FROM pm_task_approvals WHERE reviewer_id = u.id AND action IN ('reject', 'request_revision') AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS approvals_rejected_30d,
  (SELECT COUNT(*) FROM pm_tasks WHERE u.id = ANY(assignee_ids) AND stage = 'published' AND published_at IS NOT NULL AND published_at >= CURRENT_DATE - INTERVAL '30 days') AS published_30d,
  COALESCE((
    SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)::INTEGER
    FROM pm_tasks
    WHERE u.id = ANY(assignee_ids)
      AND stage = 'published'
      AND completed_at IS NOT NULL
      AND completed_at >= CURRENT_DATE - INTERVAL '90 days'
  ), 0) AS avg_completion_days
FROM admin_users u
WHERE u.status = 'active';

-- ============================================================
-- FUNCTION: get_weekly_completion_trend
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

COMMIT;
  `.trim();

  try {
    await client.connect();
    console.log('[P6.6] Connected to database');
    await client.query(sql);
    console.log('[P6.6] KPI views created successfully');
  } catch (err) {
    console.error('[P6.6] Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
