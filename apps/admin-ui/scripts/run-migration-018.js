/**
 * Run Task Comments Enhancement Migration — P6.7
 * Execute: node scripts/run-migration-018.js
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return { user: match[1], password: match[2], host: match[3], port: parseInt(match[4]), database: match[5] };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const client = new Client(parseDatabaseUrl(dbUrl));

const sql = `
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_task_comments'
  ) THEN
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
    RAISE NOTICE 'Created pm_task_comments table';
  ELSE
    RAISE NOTICE 'Table pm_task_comments already exists — skipping creation';
  END IF;
END;
$$;

-- Add missing columns (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_task_comments' AND column_name = 'mentions') THEN
    ALTER TABLE pm_task_comments ADD COLUMN mentions UUID[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_task_comments' AND column_name = 'is_ai_generated') THEN
    ALTER TABLE pm_task_comments ADD COLUMN is_ai_generated BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pm_task_comments' AND column_name = 'deleted_at') THEN
    ALTER TABLE pm_task_comments ADD COLUMN deleted_at TIMESTAMP;
  END IF;
END;
$$;

COMMIT;
`.trim();

async function main() {
  try {
    await client.connect();
    console.log('[P6.7] Connected to database');
    await client.query(sql);
    console.log('[P6.7] Task comments schema ready');
  } catch (err) {
    console.error('[P6.7] Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main();
