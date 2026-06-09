/**
 * Deactivate legacy task_status codes that are superseded by new Kanban codes.
 * Run: npx tsx apps/admin-ui/lib/workspace/seed-task-status.ts --deactivate-old
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

async function deactivateOld(pool: Pool) {
  if (!DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL not set");
    process.exit(1);
  }

  const client = await pool.connect();
  console.log("=== Deactivate Legacy Task Status Codes ===");

  const legacyCodes = ["backlog", "todo", "in_progress", "done"];

  try {
    for (const code of legacyCodes) {
      const result = await client.query(
        `UPDATE pm_master_data SET is_active = FALSE, deleted_at = NOW()
         WHERE category = 'task_status' AND code = $1`,
        [code]
      );
      console.log(`  [${code}] deactivated (${result.rowCount} rows)`);
    }

    // Show final state
    const { rows } = await client.query(
      `SELECT code, name, sort_order, is_active, deleted_at
       FROM pm_master_data WHERE category = 'task_status'
       ORDER BY sort_order ASC, name ASC`
    );

    console.log("\nFinal pm_master_data task_status:");
    for (const r of rows) {
      const status = r.deleted_at ? `DELETED` : r.is_active ? "active" : "inactive";
      console.log(`  ${r.sort_order}. ${r.code} — ${r.name} [${status}]`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  if (process.argv.includes("--deactivate-old")) {
    const pool = new Pool({ connectionString: DATABASE_URL });
    await deactivateOld(pool);
    return;
  }

  // Default: seed new statuses (as defined in seed())
  console.log("Run with --deactivate-old to deactivate legacy statuses.");
  console.log("Run: npx tsx lib/workspace/seed-task-status.ts --deactivate-old");
}

main();
