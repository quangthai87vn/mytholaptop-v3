-- ============================================================
-- Task Comments Enhancement — P6.7 Task Comments & Discussion
-- Run: psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f sql/workspace/018_task_comments_enhancement.sql
-- ============================================================
BEGIN;

-- Verify pm_task_comments exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'pm_task_comments'
  ) THEN
    RAISE NOTICE 'Table pm_task_comments does not exist — creating it';
    CREATE TABLE pm_task_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL,
      parent_comment_id UUID,
      author_id UUID NOT NULL,
      author_name VARCHAR(255),
      author_avatar VARCHAR(500),
      content TEXT NOT NULL,
      is_ai_generated BOOLEAN DEFAULT false,
      mentions UUID[] DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      CONSTRAINT fk_parent_comment FOREIGN KEY (parent_comment_id)
        REFERENCES pm_task_comments(id) ON DELETE SET NULL,
      CONSTRAINT fk_task FOREIGN KEY (task_id)
        REFERENCES pm_tasks(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_pm_task_comments_task_id ON pm_task_comments(task_id);
    CREATE INDEX idx_pm_task_comments_parent_id ON pm_task_comments(parent_comment_id);
    CREATE INDEX idx_pm_task_comments_author_id ON pm_task_comments(author_id);
  ELSE
    RAISE NOTICE 'Table pm_task_comments already exists — skipping creation';
  END IF;
END;
$$;

-- Add missing columns if they don't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_task_comments' AND column_name = 'mentions'
  ) THEN
    ALTER TABLE pm_task_comments ADD COLUMN mentions UUID[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_task_comments' AND column_name = 'is_ai_generated'
  ) THEN
    ALTER TABLE pm_task_comments ADD COLUMN is_ai_generated BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pm_task_comments' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE pm_task_comments ADD COLUMN deleted_at TIMESTAMP;
  END IF;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS pm_task_comments_updated_at ON pm_task_comments;
CREATE TRIGGER pm_task_comments_updated_at
  BEFORE UPDATE ON pm_task_comments
  FOR EACH ROW EXECUTE FUNCTION (updated_at = CURRENT_TIMESTAMP);

COMMENT ON TABLE pm_task_comments IS 'Task comments — supports threads, mentions, soft delete';
COMMENT ON COLUMN pm_task_comments.mentions IS 'Array of user IDs mentioned in this comment';
COMMENT ON COLUMN pm_task_comments.deleted_at IS 'Soft delete — not null means deleted';

COMMIT;
