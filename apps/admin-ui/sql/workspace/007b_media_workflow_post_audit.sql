-- ============================================================
-- Audit: Post-Migration Verification
-- Run AFTER 008_media_workflow_merge.sql
-- ============================================================

-- 1. Migration success check
SELECT '=== 1. Migration Success Check ===' AS info;
SELECT
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_tasks' AND column_name = 'task_type'
    ) THEN 'PASS - task_type column exists' ELSE 'FAIL - task_type missing' END AS task_type_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_media_workflows' AND column_name = 'task_id'
    ) THEN 'PASS - task_id column exists' ELSE 'FAIL - task_id missing' END AS task_id_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_tasks' AND column_name = 'platform'
    ) THEN 'PASS - platform column exists' ELSE 'FAIL - platform missing' END AS platform_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_tasks' AND column_name = 'published_at'
    ) THEN 'PASS - published_at column exists' ELSE 'FAIL - published_at missing' END AS published_at_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pm_tasks' AND column_name = 'published_url'
    ) THEN 'PASS - published_url column exists' ELSE 'FAIL - published_url missing' END AS published_url_status;

-- 2. All media workflows now have task_id
SELECT '=== 2. Media Workflows with task_id ===' AS info;
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) AS with_task_id,
    SUM(CASE WHEN task_id IS NULL THEN 1 ELSE 0 END) AS without_task_id,
    CASE WHEN COUNT(*) > 0
         THEN ROUND(SUM(CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
         ELSE 100
    END AS percentage_linked
FROM pm_media_workflows;

-- 3. pm_tasks now has task_type data
SELECT '=== 3. Tasks with task_type ===' AS info;
SELECT
    COUNT(*) AS total_tasks,
    SUM(CASE WHEN task_type IS NOT NULL THEN 1 ELSE 0 END) AS with_task_type,
    SUM(CASE WHEN platform IS NOT NULL THEN 1 ELSE 0 END) AS with_platform,
    SUM(CASE WHEN published_at IS NOT NULL THEN 1 ELSE 0 END) AS with_published_at,
    SUM(CASE WHEN published_url IS NOT NULL AND published_url != '' THEN 1 ELSE 0 END) AS with_published_url
FROM pm_tasks;

-- 4. Tasks by task_type
SELECT '=== 4. Tasks by task_type ===' AS info;
SELECT task_type, COUNT(*) AS count
FROM pm_tasks
WHERE task_type IS NOT NULL
GROUP BY task_type
ORDER BY count DESC;

-- 5. Tasks by workflow_stage (from media workflow)
SELECT '=== 5. Tasks by workflow_stage ===' AS info;
SELECT stage, COUNT(*) AS count
FROM pm_tasks
WHERE stage IS NOT NULL
GROUP BY stage
ORDER BY count DESC;

-- 6. All migrated tasks (with full details)
SELECT '=== 6. Migrated Tasks ===' AS info;
SELECT
    t.id,
    t.title,
    t.task_type,
    t.platform,
    t.workflow_stage,
    t.status,
    t.due_date,
    mw.title AS original_media_title,
    mw.id AS original_media_id
FROM pm_tasks t
JOIN pm_media_workflows mw ON mw.task_id = t.id
ORDER BY t.created_at DESC;

-- 7. pm_workflow_stages still exist
SELECT '=== 7. pm_workflow_stages (unchanged) ===' AS info;
SELECT COUNT(*) AS total_stages FROM pm_workflow_stages;

-- 8. ai_suggestions status
SELECT '=== 8. pm_ai_suggestions ===' AS info;
SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN task_id IS NOT NULL THEN 1 ELSE 0 END) AS with_task_id,
    SUM(CASE WHEN workflow_id IS NOT NULL AND task_id IS NULL THEN 1 ELSE 0 END) AS orphaned
FROM pm_ai_suggestions;

-- 9. Sample tasks with media data (the new migrated ones)
SELECT '=== 9. Sample Migrated Tasks ===' AS info;
SELECT
    id,
    title,
    task_type,
    platform,
    stage,
    status,
    due_date
FROM pm_tasks
WHERE task_type IS NOT NULL
LIMIT 10;

-- 10. Summary
SELECT '=== 10. FINAL SUMMARY ===' AS info;
SELECT
    (SELECT COUNT(*) FROM pm_tasks WHERE task_type IS NOT NULL) AS migrated_tasks,
    (SELECT COUNT(*) FROM pm_media_workflows WHERE task_id IS NOT NULL) AS linked_media_workflows,
    (SELECT COUNT(*) FROM pm_tasks) AS total_tasks,
    (SELECT COUNT(*) FROM pm_media_workflows) AS total_media_workflows,
    (SELECT COUNT(*) FROM pm_workflow_stages) AS total_stages,
    (SELECT COUNT(*) FROM pm_workflow_comments) AS total_comments,
    (SELECT COUNT(*) FROM pm_ai_suggestions) AS total_suggestions;
