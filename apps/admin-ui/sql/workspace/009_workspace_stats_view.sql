-- ============================================================
-- Migration: Workspace Stats View — Fixed for Archive
-- Tối ưu getWorkspaceStats() — gộp 6 queries thành 1 view
-- Run: psql -f sql/workspace/009_workspace_stats_view.sql
--
-- NOTE: Cột trong pm_tasks là 'status', KHÔNG PHẢI 'stage'
--       Task archive: is_archived = TRUE (soft-delete, hidden from active board)
--       Task cancelled: status = 'cancelled' (still in active board, visible in Huỷ column)
--       Campaign archive: deleted_at IS NOT NULL
--       Project archive: status = 'archived'
-- ============================================================
BEGIN;

-- ============================================================
-- VIEW: v_workspace_stats
-- Trả về tất cả stats trong 1 query duy nhất
-- ============================================================
CREATE OR REPLACE VIEW v_workspace_stats AS
SELECT
  -- active_projects: non-archived projects only
  (SELECT COUNT(*)::INTEGER FROM pm_projects WHERE status != 'archived')                                                           AS active_projects,
  -- due_this_week: task có due_date trong 7 ngày tới, không tính archived/completed/cancelled
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE is_archived = FALSE
     AND due_date IS NOT NULL
     AND due_date <= CURRENT_DATE + INTERVAL '7 days'
     AND status NOT IN ('completed', 'cancelled'))                                                                              AS due_this_week,
  -- overdue_tasks: task có due_date trước hôm nay, chưa archived/completed/cancelled
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE is_archived = FALSE
     AND due_date < CURRENT_DATE
     AND status NOT IN ('completed', 'cancelled'))                                                                              AS overdue_tasks,
  -- overdue_campaigns: chiến dịch đã hết hạn, chưa archived/completed/cancelled
  (SELECT COUNT(*)::INTEGER FROM pm_campaigns
   WHERE deleted_at IS NULL
     AND end_date < CURRENT_DATE
     AND status NOT IN ('completed', 'cancelled'))                                                                             AS overdue_campaigns,
  -- media_ready: task đang ở trạng thái review (chờ duyệt), không tính archived
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE is_archived = FALSE
     AND status = 'review')                                                                                                   AS media_ready,
  -- total_interns: tất cả intern đang active
  (SELECT COUNT(*)::INTEGER FROM pm_interns WHERE status = 'active')                                                             AS total_interns,
  -- published_this_month: task có published_at trong tháng này, không tính archived
  (SELECT COUNT(*)::INTEGER FROM pm_tasks
   WHERE is_archived = FALSE
     AND published_at IS NOT NULL
     AND published_at >= DATE_TRUNC('month', CURRENT_DATE)
     AND published_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')                                                  AS published_this_month;

-- ============================================================
-- FUNCTION: get_workspace_stats()
-- Wrapper function để tương thích với code gọi
-- ============================================================
CREATE OR REPLACE FUNCTION get_workspace_stats()
RETURNS TABLE (
  active_projects    BIGINT,
  due_this_week     BIGINT,
  overdue_tasks      BIGINT,
  overdue_campaigns  BIGINT,
  media_ready        BIGINT,
  total_interns      BIGINT,
  published_this_month BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT
    v.active_projects::BIGINT,
    v.due_this_week::BIGINT,
    v.overdue_tasks::BIGINT,
    v.overdue_campaigns::BIGINT,
    v.media_ready::BIGINT,
    v.total_interns::BIGINT,
    v.published_this_month::BIGINT
  FROM v_workspace_stats v;
END;
$$;

COMMENT ON VIEW v_workspace_stats IS
  'Workspace dashboard stats — 1 query thay thế 6 queries riêng lẻ. Tối ưu performance.';
COMMENT ON FUNCTION get_workspace_stats() IS
  'Wrapper function cho v_workspace_stats, trả về 7 metrics cho dashboard.';

COMMIT;
