-- ============================================================
-- Seed task_type default_platform_ids metadata
-- Run AFTER 031_task_workflow_config.sql
-- Run: psql -U postgres -d mytholaptop -f sql/workspace/033_task_type_platforms.sql
-- ============================================================
-- Updates pm_master_data.metadata for ALL task_type items with default platform IDs.
-- Safe to re-run: preserves existing metadata fields, only overwrites default_platform_ids.

BEGIN;

-- Step 1: Ensure every task_type row has a non-null metadata column
UPDATE pm_master_data
SET metadata = '{}'::jsonb
WHERE category = 'task_type' AND (metadata IS NULL OR metadata = 'null'::jsonb);

-- Step 2: Sync creates_workflow where missing (for rows created by 005_master_data before 031)
UPDATE pm_master_data
SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), ARRAY['creates_workflow'], 'false'::jsonb)
WHERE category = 'task_type'
  AND (metadata IS NULL OR NOT (metadata ? 'creates_workflow'));

-- Step 3: Set default_platform_ids for each task_type
-- Preserves existing creates_workflow and workflow_type values
UPDATE pm_master_data
SET metadata = (
    SELECT jsonb_build_object(
      'creates_workflow',
      COALESCE((m.metadata->>'creates_workflow')::boolean, false),
      'workflow_type',
      m.metadata->>'workflow_type',
      'default_platform_ids',
      CASE m.code
        -- Content production types
        WHEN 'facebook_post'    THEN '["facebook"]'::jsonb
        WHEN 'seo_article'     THEN '["website", "seo"]'::jsonb
        WHEN 'tiktok_video'   THEN '["tiktok"]'::jsonb
        WHEN 'youtube_video'  THEN '["youtube"]'::jsonb
        WHEN 'design_image'   THEN '["facebook", "website"]'::jsonb
        WHEN 'product_photo'  THEN '["website", "facebook"]'::jsonb
        WHEN 'livestream'     THEN '["facebook", "tiktok"]'::jsonb
        WHEN 'website_copy'   THEN '["website"]'::jsonb
        -- Non-content types — no default platforms
        WHEN 'train'           THEN '[]'::jsonb
        WHEN 'team_meeting'    THEN '[]'::jsonb
        WHEN 'inventory_check' THEN '[]'::jsonb
        WHEN 'technical_fix'   THEN '[]'::jsonb
        WHEN 'product_data_entry' THEN '[]'::jsonb
        WHEN 'other'          THEN '[]'::jsonb
        -- Fallback: keep existing value or empty
        ELSE COALESCE(m.metadata->'default_platform_ids', '[]'::jsonb)
      END
    )
    FROM (SELECT metadata, code FROM pm_master_data WHERE id = pm_master_data.id) AS m
  )
WHERE category = 'task_type';

-- Step 4: Validate — report what was set
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT code, name,
           metadata->>'default_platform_ids' AS platforms,
           metadata->>'creates_workflow' AS creates_wf
    FROM pm_master_data
    WHERE category = 'task_type'
    ORDER BY sort_order
  LOOP
    RAISE NOTICE '[033] task_type=% (%)
      creates_workflow=%
      default_platform_ids=%',
      r.code, r.name, r.creates_wf, r.platforms;
  END LOOP;
END $$;

COMMIT;
