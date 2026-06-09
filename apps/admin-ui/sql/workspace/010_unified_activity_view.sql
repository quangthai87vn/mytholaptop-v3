-- ============================================================
-- Migration: Unified Activity View + Enhanced Logging (Priority 3)
-- Mục tiêu: Activity Feed là lịch sử hoạt động trung tâm
-- Run: psql -f sql/workspace/010_unified_activity_view.sql
-- ============================================================
BEGIN;

-- ============================================================
-- VIEW: v_workspace_activities
-- Gộp task activities + status history trong 1 view
-- ============================================================
CREATE OR REPLACE VIEW v_workspace_activities AS
SELECT
  ta.id,
  'task' AS entity_type,
  ta.task_id AS entity_id,
  COALESCE(t.title, 'Không rõ') AS entity_name,
  ta.actor_id,
  ta.actor_name,
  ta.action AS action_type,
  ta.field_changed,
  ta.old_value,
  ta.new_value,
  ta.metadata,
  ta.created_at
FROM pm_task_activities ta
LEFT JOIN pm_tasks t ON ta.task_id = t.id

UNION ALL

SELECT
  sh.id,
  sh.entity_type,
  sh.entity_id,
  COALESCE(
    p.name,
    c.name,
    mw.title,
    'Entity ' || sh.entity_id::text
  ) AS entity_name,
  sh.changed_by,
  sh.changed_by_name,
  'status_changed' AS action_type,
  'status' AS field_changed,
  sh.from_status,
  sh.to_status,
  NULL AS metadata,
  sh.created_at
FROM pm_status_history sh
LEFT JOIN pm_projects p ON sh.entity_type = 'project' AND sh.entity_id = p.id
LEFT JOIN pm_campaigns c ON sh.entity_type = 'campaign' AND sh.entity_id = c.id
LEFT JOIN pm_media_workflows mw ON sh.entity_type = 'media_workflow' AND sh.entity_id = mw.id

ORDER BY created_at DESC
LIMIT 200;

-- ============================================================
-- GRANTS
-- ============================================================
-- GRANT SELECT ON v_workspace_activities TO mytholaptop_user;

COMMENT ON VIEW v_workspace_activities IS
  'Unified activity feed: task activities + status history. Entity types: task, project, campaign, media_workflow.';

COMMIT;
