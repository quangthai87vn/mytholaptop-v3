const { Client } = require("pg");

const connStr = process.env.DATABASE_URL || "postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop";

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();
  console.log("Connected to database.");

  const sql = require("fs").readFileSync("sql/workspace/016_notifications.sql", "utf8");
  console.log("Running migration 016...");
  await client.query(sql);
  console.log("Migration 016 OK.");

  // Verify table
  const r = await client.query(`SELECT COUNT(*) as c FROM pm_notifications`);
  console.log(`pm_notifications rows: ${r.rows[0].c}`);

  await client.end();
  console.log("Done.");
}

main().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
