/**
 * P7.1.1: Check AI provider runtime configs and generation code paths
 */
const { Client } = require('pg');

function parseDbUrl(url) {
  const m = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  return { user: m[1], password: m[2], host: m[3], port: parseInt(m[4]), database: m[5] };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const client = new Client({ ...parseDbUrl(dbUrl), ssl: false });

async function main() {
  try {
    await client.connect();

    // Check ai_provider_runtime_configs
    console.log('=== ai_provider_runtime_configs ===');
    try {
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'ai_provider_runtime_configs' ORDER BY ordinal_position
      `);
      cols.rows.forEach(r => console.log(' ', r.column_name));

      const configs = await client.query('SELECT * FROM ai_provider_runtime_configs');
      if (configs.rows.length === 0) {
        console.log('  (no configs)');
      } else {
        configs.rows.forEach(r => {
          const safe = { ...r };
          if (safe.api_key) safe.api_key = '(HIDDEN)';
          console.log(' ', JSON.stringify(safe));
        });
      }
    } catch(e) { console.log('  error:', e.message); }

    // Check how ai_providers is queried in getRoutingRuleProvider
    // It joins with ai_provider_runtime_configs - what if no config exists?
    console.log('\n=== Provider + Runtime Config JOIN ===');
    const joined = await client.query(`
      SELECT p.id, p.name, p.base_url, p.api_key_encrypted IS NOT NULL as has_key,
             rc.selected_model, rc.temperature
      FROM ai_providers p
      LEFT JOIN ai_provider_runtime_configs rc ON p.id = rc.provider_id
      WHERE p.is_deleted = false
      ORDER BY p.id
    `);
    joined.rows.forEach(r => {
      console.log(`  [${r.id}] ${r.name} | has_key=${r.has_key} | model=${r.selected_model} | temp=${r.temperature}`);
    });

    // Check ai_routing_rules (the other routing table)
    console.log('\n=== ai_routing_rules ===');
    try {
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'ai_routing_rules' ORDER BY ordinal_position
      `);
      cols.rows.forEach(r => console.log(' ', r.column_name));
      const rows = await client.query('SELECT * FROM ai_routing_rules LIMIT 5');
      rows.rows.forEach(r => console.log(' ', JSON.stringify(r)));
    } catch(e) { console.log('  error:', e.message); }

    // Check pm_tasks columns to understand what fields are available
    console.log('\n=== pm_tasks sample columns ===');
    const taskCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pm_tasks' ORDER BY ordinal_position
    `);
    taskCols.rows.forEach(r => console.log(' ', r.column_name));

    // Show a sample task
    console.log('\n=== Sample task ===');
    const sample = await client.query('SELECT * FROM pm_tasks LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('Keys:', Object.keys(sample.rows[0]).join(', '));
      console.log(JSON.stringify(sample.rows[0], null, 2).substring(0, 500));
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
