/**
 * Run Workspace SQL Migrations
 *
 * Chạy các file SQL migration trong thứ tự đúng.
 * Sử dụng: npx tsx scripts/run-sql-migration.ts [sql_file_path]
 * Hoặc: npx tsx scripts/run-sql-migration.ts --all
 *
 * Database connection: DATABASE_URL từ apps/admin-ui/.env
 */

import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";

async function getConnectionString(): Promise<string> {
  const envPath = path.join(process.cwd(), "..", "..", ".env");
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("DATABASE_URL=")) {
        const eqIdx = trimmed.indexOf("=");
        return trimmed.slice(eqIdx + 1).trim();
      }
    }
  } catch {
    // ignore
  }
  const envVar = process.env.DATABASE_URL;
  if (envVar) return envVar;
  throw new Error("DATABASE_URL not found in .env or environment");
}

async function runSqlFile(client: Client, filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, "utf-8");
  console.log(`  Running: ${path.basename(filePath)}`);
  await client.query(sql);
}

async function runMigration(filePath: string): Promise<void> {
  const connStr = await getConnectionString();
  console.log(`Connecting to PostgreSQL...`);
  console.log(`Host: ${connStr.replace(/:[^:@]+@/, ":***@")}`);

  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    await runSqlFile(client, filePath);
    console.log(`\n  ✓ Success: ${path.basename(filePath)}\n`);
  } finally {
    await client.end();
  }
}

async function runAllMigrations(): Promise<void> {
  const connStr = await getConnectionString();
  console.log(`Connecting to PostgreSQL...`);
  console.log(`Host: ${connStr.replace(/:[^:@]+@/, ":***@")}`);

  const client = new Client({ connectionString: connStr });
  await client.connect();

  const sqlDir = path.join(process.cwd(), "sql", "workspace");
  const files = fs.readdirSync(sqlDir)
    .filter(f => f.endsWith(".sql"))
    .filter(f => f >= "040")
    .sort();

  if (files.length === 0) {
    console.log("No migration files >= 040 found.");
    return;
  }

  console.log(`\nFound ${files.length} migration files:\n`);

  try {
    for (const file of files) {
      const filePath = path.join(sqlDir, file);
      console.log(`  Running: ${file}`);
      try {
        await client.query(fs.readFileSync(filePath, "utf-8"));
        console.log(`    ✓ OK`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exists") || msg.includes("duplicate")) {
          console.log(`    ⚠ Skipped (already exists)`);
        } else {
          console.error(`    ✗ Error: ${msg}`);
        }
      }
    }
    console.log("\n  ✓ All migrations completed\n");
  } finally {
    await client.end();
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    await runAllMigrations();
  } else if (args[0]) {
    const filePath = path.join(process.cwd(), args[0]);
    await runMigration(filePath);
  } else {
    console.log(`
Usage:
  npx tsx scripts/run-sql-migration.ts --all
    Run all migration files from 040 onward

  npx tsx scripts/run-sql-migration.ts sql/workspace/040_task_link_fields.sql
    Run a specific migration file
`);
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
