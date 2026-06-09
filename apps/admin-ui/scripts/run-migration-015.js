const { Client } = require("pg");

const connStr = process.env.DATABASE_URL || "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();
  console.log("Connected to database.");

  // Run migration 015
  const sql = require("fs").readFileSync("sql/workspace/015_review_to_internal_review.sql", "utf8");
  console.log("\nRunning migration 015...");
  await client.query(sql);
  console.log("Migration 015 OK.");

  // Verify stage distribution
  const r = await client.query("SELECT stage, COUNT(*) as c FROM pm_tasks GROUP BY stage ORDER BY stage");
  console.log("\nStage distribution after migration:");
  r.rows.forEach(x => console.log(`  ${x.stage || "(null)"}: ${x.c}`));

  // Check for any remaining old 'review' stage
  const oldReview = await client.query("SELECT COUNT(*) as c FROM pm_tasks WHERE stage = 'review'");
  if (parseInt(oldReview.rows[0].c) > 0) {
    console.error("\nWARNING: Still tasks with old 'review' stage!");
  } else {
    console.log("\nNo legacy 'review' stage found. Migration successful.");
  }

  await client.end();
  console.log("Done.");
}

main().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
