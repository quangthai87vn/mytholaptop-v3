/**
 * Run migration: 022_drop_deprecated_tables.sql
 * P8.2.3 — Drop confirmed deprecated workspace tables
 *
 * Safe to drop:
 *   - pm_workflow_comments (0 rows, no code refs)
 *   - pm_ai_suggestions (0 rows, no code refs)
 *
 * NOT dropping:
 *   - pm_workflow_stages (18 rows + FK from pm_media_workflows)
 *   - pm_media_workflows (10 rows + active CRUD functions in lib/workspace/db)
 *
 * Usage: node scripts/run-migration-022.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop',
  connectionTimeoutMillis: 30000,
});

async function runMigration() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'workspace', '022_drop_deprecated_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('=== P8.2.3: Drop Deprecated Workspace Tables ===\n');
  console.log('Dropping: pm_workflow_comments (0 rows), pm_ai_suggestions (0 rows)\n');

  // Pre-flight check
  console.log('[1/3] Pre-flight check — verifying table counts...');
  const checks = [
    { tbl: 'pm_workflow_comments', expected: '0' },
    { tbl: 'pm_ai_suggestions', expected: '0' },
    { tbl: 'pm_workflow_stages', expected: '18 (NOT dropping)' },
    { tbl: 'pm_media_workflows', expected: '10 (NOT dropping)' },
  ];

  for (const { tbl, expected } of checks) {
    try {
      const res = await pool.query(`SELECT COUNT(*)::text AS cnt FROM ${tbl}`);
      const cnt = res.rows[0].cnt;
      const status = tbl === 'pm_workflow_comments' || tbl === 'pm_ai_suggestions' ? 'SAFE TO DROP' : 'KEEPING';
      console.log(`  ${status.padEnd(15)} ${tbl}: ${cnt} rows (expected: ${expected})`);
    } catch (e) {
      console.log(`  ${tbl}: ERROR — ${e.message}`);
    }
  }

  console.log('\n[2/3] Running migration...');
  try {
    await pool.query(sql);
    console.log('  ✅ Migration completed successfully');
  } catch (e) {
    console.error(`  ❌ Migration failed: ${e.message}`);
    await pool.end();
    process.exit(1);
  }

  console.log('\n[3/3] Post-migration verification...');
  const verifyTables = [
    { tbl: 'pm_workflow_comments', shouldExist: false },
    { tbl: 'pm_ai_suggestions', shouldExist: false },
    { tbl: 'pm_workflow_stages', shouldExist: true },
    { tbl: 'pm_media_workflows', shouldExist: true },
    { tbl: '_backup_pm_workflow_comments', shouldExist: true },
    { tbl: '_backup_pm_ai_suggestions', shouldExist: true },
  ];

  for (const { tbl, shouldExist } of verifyTables) {
    try {
      const res = await pool.query(
        `SELECT COUNT(*)::text AS cnt FROM pg_tables WHERE tablename = $1`,
        [tbl]
      );
      const exists = parseInt(res.rows[0].cnt) > 0;
      const status = exists === shouldExist ? '✅' : '❌';
      console.log(`  ${status} ${tbl}: ${exists ? 'exists' : 'not found'} (expected: ${shouldExist ? 'exists' : 'not found'})`);
    } catch (e) {
      console.log(`  ❌ ${tbl}: ${e.message}`);
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log('\nRollback if needed:');
  console.log('  psql -U postgres -d mytholaptop -f sql/workspace/022_rollback_deprecated_tables.sql');

  await pool.end();
}

runMigration().catch(e => {
  console.error('Fatal:', e.message);
  pool.end().catch(() => {});
  process.exit(1);
});
