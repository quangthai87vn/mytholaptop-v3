const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop',
  connectionTimeoutMillis: 10000,
});

async function main() {
  const tables = [
    'pm_workflow_stages',
    'pm_workflow_comments',
    'pm_ai_suggestions',
    'pm_media_workflows',
    'pm_tasks',
  ];

  for (const tbl of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) AS cnt FROM ${tbl}`);
      console.log(`${tbl}: ${res.rows[0].cnt} rows`);
    } catch (e) {
      console.log(`${tbl}: ERROR — ${e.message}`);
    }
  }

  // Also check if pm_workflow_stages has FK constraint from pm_media_workflows
  try {
    const res = await pool.query(`
      SELECT conname, confrelid::regclass AS referenced
      FROM pg_constraint
      WHERE conrelid = 'pm_workflow_stages'::regclass
      AND contype = 'f'
    `);
    console.log('\npm_workflow_stages FK constraints:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.log('FK check error:', e.message);
  }

  // Check pm_workflow_comments FK
  try {
    const res = await pool.query(`
      SELECT conname, confrelid::regclass AS referenced
      FROM pg_constraint
      WHERE conrelid = 'pm_workflow_comments'::regclass
      AND contype = 'f'
    `);
    console.log('\npm_workflow_comments FK constraints:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.log('FK check error:', e.message);
  }

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
