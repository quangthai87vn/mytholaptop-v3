/**
 * Run migration: 023_task_checklist.sql + 024_content_items_task_link.sql
 * P9 — Workspace Content Workflow: Checklist + Content Task Link
 *
 * Usage: node scripts/run-migration-023-024.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop',
  connectionTimeoutMillis: 30000,
});

async function runMigration(sqlFileName, label) {
  const sqlPath = path.join(__dirname, '..', 'sql', 'workspace', sqlFileName);
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`\n[${label}] Running ${sqlFileName}...`);
  try {
    await pool.query(sql);
    console.log(`  ✅ ${label} completed successfully`);
    return true;
  } catch (e) {
    console.error(`  ❌ ${label} failed: ${e.message}`);
    return false;
  }
}

async function verify(tableName, shouldExist) {
  try {
    const res = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM pg_tables WHERE tablename = $1`,
      [tableName]
    );
    const exists = res.rows[0].cnt > 0;
    const ok = exists === shouldExist;
    console.log(`  ${ok ? '✅' : '❌'} Table ${tableName}: ${exists ? 'exists' : 'not found'} (expected: ${shouldExist ? 'exists' : 'not found'})`);
    return ok;
  } catch (e) {
    console.log(`  ❌ ${tableName}: ${e.message}`);
    return false;
  }
}

async function verifyColumn(tableName, columnName) {
  try {
    const res = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    const exists = res.rows.length > 0;
    console.log(`  ${exists ? '✅' : '❌'} ${tableName}.${columnName}: ${exists ? 'exists' : 'not found'}`);
    return exists;
  } catch (e) {
    console.log(`  ❌ ${tableName}.${columnName}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('=== P9: Run DB Migrations (023 + 024) ===\n');

  let allOk = true;

  // Run 023
  const ok1 = await runMigration('023_task_checklist.sql', 'Migration 023');
  if (ok1) allOk = await verify('pm_task_checklist_items', true) && allOk;

  // Run 024
  const ok2 = await runMigration('024_content_items_task_link.sql', 'Migration 024');
  if (ok2) {
    allOk = await verifyColumn('content_items', 'task_id') && allOk;
  } else {
    allOk = false;
  }

  console.log('\n=== Summary ===');
  console.log(allOk ? '✅ All migrations successful' : '❌ Some migrations failed');

  await pool.end();
  process.exit(allOk ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  pool.end().catch(() => {});
  process.exit(1);
});
