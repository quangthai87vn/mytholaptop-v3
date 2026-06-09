-- ============================================================
-- P6.3.1 Patch: Migrate legacy 'review' stage → 'internal_review'
-- Run: psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f sql/workspace/015_review_to_internal_review.sql
-- ============================================================
BEGIN;

-- Migrate any tasks with old 'review' stage to 'internal_review'
-- This ensures all legacy data uses the new approval workflow stages
UPDATE pm_tasks
SET stage = 'internal_review',
    updated_at = CURRENT_TIMESTAMP
WHERE stage = 'review';

-- Verify
DO $$
DECLARE
  remaining_review INTEGER;
  migrated_count INTEGER;
BEGIN
  -- Count how many were migrated
  -- (we can't directly see the UPDATE count in PostgreSQL without a CTE)
  SELECT COUNT(*) INTO migrated_count FROM pm_tasks WHERE stage = 'internal_review';
  RAISE NOTICE 'Tasks now in internal_review stage: %', migrated_count;

  -- Check for any remaining old 'review' stage
  SELECT COUNT(*) INTO remaining_review FROM pm_tasks WHERE stage = 'review';
  IF remaining_review > 0 THEN
    RAISE WARNING 'Still % tasks with old review stage!', remaining_review;
  ELSE
    RAISE NOTICE 'All legacy review stages migrated successfully.';
  END IF;
END $$;

COMMIT;
