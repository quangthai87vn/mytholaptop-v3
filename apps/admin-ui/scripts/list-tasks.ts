/**
 * List all task IDs from DB
 */
import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function getConnStr(): Promise<string> {
  const envPath = path.join(process.cwd(), ".env");
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (t.startsWith("DATABASE_URL=")) return t.slice("DATABASE_URL=".length).trim();
  }
  throw new Error("DATABASE_URL not found");
}

async function main() {
  const client = new Client({ connectionString: await getConnStr(), connectionTimeoutMillis: 15000 });
  await client.connect();
  const r = await client.query("SELECT id, title FROM pm_tasks ORDER BY created_at DESC LIMIT 20");
  console.log(`Total tasks: ${r.rowCount}`);
  r.rows.forEach(row => console.log(row.id, "|", row.title?.slice(0, 60)));
  await client.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
