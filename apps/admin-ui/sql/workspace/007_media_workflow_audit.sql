-- ============================================================
-- Audit: MediaWorkflow Data Analysis (Pre-Migration)
-- Safe: handles missing columns gracefully
-- ============================================================

-- 1. Total records
SELECT '=== 1. Summary ===' AS info;
SELECT
    (SELECT COUNT(*) FROM pm_media_workflows) AS media_workflows,
    (SELECT COUNT(*) FROM pm_tasks) AS tasks,
    (SELECT COUNT(*) FROM pm_projects) AS projects,
    (SELECT COUNT(*) FROM pm_campaigns) AS campaigns,
    (SELECT COUNT(*) FROM pm_workflow_stages) AS workflow_stages,
    (SELECT COUNT(*) FROM pm_ai_suggestions) AS ai_suggestions;

-- 2. Content type distribution
SELECT '=== 2. Content type distribution ===' AS info;
SELECT content_type, COUNT(*) AS count
FROM pm_media_workflows
GROUP BY content_type
ORDER BY count DESC;

-- 3. Status distribution
SELECT '=== 3. Status distribution ===' AS info;
SELECT status, COUNT(*) AS count
FROM pm_media_workflows
GROUP BY status
ORDER BY count DESC;

-- 4. Check if task_id column exists in pm_media_workflows
SELECT '=== 4. Migration readiness check ===' AS info;
SELECT
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_media_workflows' AND column_name = 'task_id'
    ) THEN 'YES - task_id exists' ELSE 'NO - task_id missing, run migration' END AS task_id_column_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_tasks' AND column_name = 'task_type'
    ) THEN 'YES - task_type exists' ELSE 'NO - task_type missing, run migration' END AS task_type_column_status;

-- 5. Sample media workflows (full data)
SELECT '=== 5. All media workflows ===' AS info;
SELECT
    mw.id,
    mw.title,
    mw.content_type,
    mw.status,
    mw.platform,
    mw.due_date,
    mw.project_id,
    mw.campaign_id,
    mw.published_at IS NOT NULL AS has_published_at,
    COALESCE(mw.published_url, '') != '' AS has_published_url,
    array_length(mw.assignee_ids, 1) AS assignee_count
FROM pm_media_workflows mw
ORDER BY mw.created_at;

-- 6. Workflow stages detail
SELECT '=== 6. Workflow stages ===' AS info;
SELECT
    ws.id,
    ws.workflow_id,
    ws.stage,
    ws.content,
    ws.approved_at,
    ws.order_index
FROM pm_workflow_stages ws
ORDER BY ws.workflow_id, ws.order_index;

-- 7. pm_tasks summary (for reference)
SELECT '=== 7. pm_tasks summary ===' AS info;
SELECT
    status,
    COUNT(*) AS count
FROM pm_tasks
GROUP BY status
ORDER BY count DESC;
