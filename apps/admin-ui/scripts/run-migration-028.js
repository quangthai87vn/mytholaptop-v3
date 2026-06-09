/**
 * Run migration 028 directly via pg driver
 * Usage: cd apps/admin-ui && node scripts/run-migration-028.js
 */

const { Client } = require("pg");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

const SQL = [
  "ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS updated_by_user_id UUID",
  "ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS content_status VARCHAR(50) DEFAULT 'draft'",
  "ALTER TABLE pm_tasks ADD COLUMN IF NOT EXISTS completion_note TEXT",
  "ALTER TABLE pm_tasks ALTER COLUMN content_status DROP DEFAULT",
];

async function main() {
  console.log("Connecting to database...");
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log("Connected. Running migration 028...");

    for (const stmt of SQL) {
      await client.query(stmt);
      console.log("  OK:", stmt.substring(0, 60));
    }

    const res = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'pm_tasks'
        AND column_name IN ('updated_by_user_id', 'content_status', 'completion_note')
      ORDER BY column_name
    `);

    console.log("\nColumns in pm_tasks after migration:");
    res.rows.forEach((r) => console.log("  OK", r.column_name));

    if (res.rows.length === 3) {
      console.log("\nMigration 028 SUCCESS");
    } else {
      console.log("\nWARNING: Expected 3 columns, got", res.rows.length);
    }
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
