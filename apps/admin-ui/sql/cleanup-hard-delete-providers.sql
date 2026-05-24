/**
 * Database Cleanup: Remove soft-deleted providers and orphan routing rules
 *
 * Run once to clean up data left over from soft-delete era.
 *
 * SQL to run in pgAdmin or psql:
 *
 *   -- 1. Hard-delete providers that are soft-deleted
 *   DELETE FROM ai_providers WHERE is_deleted = true;
 *
 *   -- 2. Clear routing rules that reference non-existent providers
 *   --    (these would have null provider_id after step 1 if we cascaded,
 *   --     but we use explicit UPDATE to keep routing rules visible)
 *   UPDATE ai_task_routes
 *   SET primary_provider_id = NULL, primary_model_override = NULL, updated_at = NOW()
 *   WHERE primary_provider_id IS NOT NULL
 *     AND primary_provider_id NOT IN (SELECT id FROM ai_providers WHERE is_deleted = false);
 *
 *   UPDATE ai_task_routes
 *   SET fallback_provider_id = NULL, fallback_model_override = NULL, updated_at = NOW()
 *   WHERE fallback_provider_id IS NOT NULL
 *     AND fallback_provider_id NOT IN (SELECT id FROM ai_providers WHERE is_deleted = false);
 *
 *   -- 3. Delete orphan provider models (if provider no longer exists)
 *   DELETE FROM ai_provider_models
 *   WHERE provider_id NOT IN (SELECT id FROM ai_providers WHERE is_deleted = false);
 *
 *   -- 4. Delete orphan runtime configs (if provider no longer exists)
 *   DELETE FROM ai_provider_runtime_configs
 *   WHERE provider_id NOT IN (SELECT id FROM ai_providers WHERE is_deleted = false);
 *
 *   -- 5. Verify cleanup
 *   SELECT 'providers_remaining' as item, COUNT(*) as count FROM ai_providers WHERE is_deleted = true
 *   UNION ALL
 *   SELECT 'routing_with_null_primary', COUNT(*) FROM ai_task_routes WHERE primary_provider_id IS NULL AND task_type IS NOT NULL
 *   UNION ALL
 *   SELECT 'routing_with_null_fallback', COUNT(*) FROM ai_task_routes WHERE fallback_provider_id IS NULL AND fallback_provider_id IS NOT NULL;
 */

-- Step 1: Hard-delete soft-deleted providers
-- Run this first so FK constraints don't block cascade
DELETE FROM ai_providers WHERE is_deleted = true;

-- Step 2: Clear primary provider FK in routing rules
UPDATE ai_task_routes
SET primary_provider_id = NULL, primary_model_override = NULL, updated_at = NOW()
WHERE primary_provider_id IS NOT NULL
  AND primary_provider_id NOT IN (SELECT id FROM ai_providers);

-- Step 3: Clear fallback provider FK in routing rules
UPDATE ai_task_routes
SET fallback_provider_id = NULL, fallback_model_override = NULL, updated_at = NOW()
WHERE fallback_provider_id IS NOT NULL
  AND fallback_provider_id NOT IN (SELECT id FROM ai_providers);

-- Step 4: Delete orphan provider models
DELETE FROM ai_provider_models
WHERE provider_id NOT IN (SELECT id FROM ai_providers);

-- Step 5: Delete orphan runtime configs
DELETE FROM ai_provider_runtime_configs
WHERE provider_id NOT IN (SELECT id FROM ai_providers);

-- Step 6: Verify
SELECT
  'Soft-deleted providers removed' AS action,
  COUNT(*) AS rows_affected
FROM ai_providers WHERE is_deleted = true;
