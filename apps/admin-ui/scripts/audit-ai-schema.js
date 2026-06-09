/**
 * P7.1.1: Check actual schema of ai_providers
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

    console.log('=== ai_providers schema ===');
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ai_providers'
      ORDER BY ordinal_position
    `);
    cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`));

    console.log('\n=== ai_providers data ===');
    const rows = await client.query('SELECT * FROM ai_providers LIMIT 2');
    if (rows.rows.length > 0) {
      console.log('Columns:', Object.keys(rows.rows[0]).join(', '));
      rows.rows.forEach(r => {
        const safe = { ...r };
        if (safe.api_key_hash) safe.api_key_hash = '(HIDDEN)';
        if (safe.encrypted_api_key) safe.encrypted_api_key = '(HIDDEN)';
        console.log(JSON.stringify(safe, null, 2));
      });
    }

    console.log('\n=== ai_task_routes schema ===');
    const rtCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ai_task_routes' ORDER BY ordinal_position
    `);
    rtCols.rows.forEach(r => console.log(' ', r.column_name));

    console.log('\n=== Check is_active in providers ===');
    const prov = await client.query(`
      SELECT id, name, status, is_active, model_name, base_url
      FROM ai_providers
    `);
    prov.rows.forEach(r => console.log(`  [${r.id}] ${r.name} | is_active=${r.is_active} | status=${r.status} | model=${r.model_name} | url=${r.base_url}`));

    console.log('\n=== Routing simulation ===');
    // Simulate what routing engine does for task assistant
    const routes = await client.query('SELECT * FROM ai_task_routes');
    routes.rows.forEach(r => console.log(`  ${r.task_type}: provider=${r.primary_provider_id}, model_override=${r.primary_model_override}`));

    console.log('\n=== Active providers check ===');
    const active = await client.query('SELECT * FROM ai_providers WHERE status = $1', ['active']);
    console.log(`  providers with status=active: ${active.rows.length}`);
    active.rows.forEach(r => console.log(`    [${r.id}] ${r.name}`));

    const isActive = await client.query('SELECT * FROM ai_providers WHERE is_active = true');
    console.log(`  providers with is_active=true: ${isActive.rows.length}`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
