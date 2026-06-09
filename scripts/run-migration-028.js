/**
 * Run migration 028 directly via pg driver
 * Usage: node scripts/run-migration-028.js
 */

const { Client } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

const SQL = `
-- Migration: 028_task_audit_and_submission_fields.sql
-- Adds updated_by_user_id, content_status, completion_note to pm_tasks

BEGIN;

ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS completion_note TEXT;

ALTER TABLE pm_tasks ALTER COLUMN content_status DROP DEFAULT;

DO $$
BEGIN
  RAISE NOTICE 'Migration 028 complete.';
  RAISE NOTICE 'Columns added: updated_by_user_id, content_status, completion_note';
END $$;

COMMIT;
`;

async function main() {
  console.log("Connecting to database...");
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log("Connected. Running migration 028...");

    await client.query(SQL);

    // Verify
    const res = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'pm_tasks'
        AND column_name IN ('updated_by_user_id', 'content_status', 'completion_note')
      ORDER BY column_name;
    `);

    console.log("\nColumns in pm_tasks after migration:");
    res.rows.forEach((r) => console.log("  ✓", r.column_name));

    if (res.rows.length === 3) {
      console.log("\n Migration 028 SUCCESS ✓");
    } else {
      console.log("\n WARNING: Expected 3 columns, got", res.rows.length);
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
