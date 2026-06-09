/**
 * Verify migration: check new columns and seed data exist
 */
import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function getConnStr(): Promise<string> {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t.startsWith("DATABASE_URL=")) {
      return t.slice("DATABASE_URL=".length).trim();
    }
  }
  throw new Error("DATABASE_URL not found");
}

async function main() {
  const connStr = await getConnStr();
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 15000 });
  await client.connect();

  // Check columns
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name='pm_tasks'
     AND column_name IN ('website_url','youtube_url','tiktok_url','facebook_url')
     ORDER BY column_name`
  );
  console.log("New columns in pm_tasks:", cols.rows.map(r => r.column_name).join(", "));

  // Check seed data
  const tasks = await client.query(
    `SELECT id, title,
            CASE WHEN youtube_url IS NOT NULL THEN 'YES' ELSE 'no' END as has_yt,
            CASE WHEN website_url IS NOT NULL THEN 'YES' ELSE 'no' END as has_web,
            CASE WHEN tiktok_url IS NOT NULL THEN 'YES' ELSE 'no' END as has_tt,
            CASE WHEN facebook_url IS NOT NULL THEN 'YES' ELSE 'no' END as has_fb
     FROM pm_tasks
     WHERE youtube_url IS NOT NULL OR website_url IS NOT NULL
        OR tiktok_url IS NOT NULL OR facebook_url IS NOT NULL
     LIMIT 10`
  );
  console.log(`\nSeed data: ${tasks.rows.length} tasks with links`);
  for (const row of tasks.rows) {
    console.log(`  ${row.title?.slice(0, 45)} [YT:${row.has_yt} WEB:${row.has_web} TT:${row.has_tt} FB:${row.has_fb}]`);
  }

  await client.end();
  console.log("\nDone.");
}

main().catch(err => { console.error(err.message); process.exit(1); });
