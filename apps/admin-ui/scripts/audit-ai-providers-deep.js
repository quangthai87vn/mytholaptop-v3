/**
 * P7.1.1: Deep audit AI providers - check is_active and api_key status
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return { user: match[1], password: match[2], host: match[3], port: parseInt(match[4]), database: match[5] };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const client = new Client({ ...parseDatabaseUrl(dbUrl), ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false });

async function main() {
  try {
    await client.connect();

    // Check is_active vs status
    console.log('=== Provider is_active vs status ===');
    const providers = await client.query(`
      SELECT id, name, type, is_active, status, is_default,
             api_key IS NOT NULL AS has_api_key,
             api_key_hash IS NOT NULL AS has_api_key_hash,
             model_name, base_url
      FROM ai_providers
    `);
    providers.rows.forEach(r => {
      console.log(`  [${r.id}] ${r.name} | is_active=${r.is_active} | status=${r.status} | has_key=${r.has_api_key} | has_key_hash=${r.has_api_key_hash} | model=${r.model_name} | url=${r.base_url}`);
    });

    // Check ai_system_prompt_templates (not ai_system_prompts)
    console.log('\n=== System Prompt Templates ===');
    const tpl = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE '%prompt%' AND table_schema='public'
    `);
    tpl.rows.forEach(r => console.log('  table:', r.table_name));

    try {
      const prompts = await client.query('SELECT id, name, is_active FROM ai_system_prompt_templates');
      prompts.rows.forEach(r => console.log(`  [${r.id}] ${r.name} | active=${r.is_active}`));
    } catch(e) { console.log('  error:', e.message); }

    // Check safety rules schema
    console.log('\n=== Safety Rules Schema ===');
    try {
      const srCols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'ai_safety_rules' ORDER BY ordinal_position
      `);
      srCols.rows.forEach(r => console.log('  col:', r.column_name));
      const sr = await client.query('SELECT id, is_active FROM ai_safety_rules LIMIT 5');
      sr.rows.forEach(r => console.log(`  [${r.id}] active=${r.is_active}`));
    } catch(e) { console.log('  error:', e.message); }

    // Check pm_tasks columns for workflow_stage
    console.log('\n=== pm_tasks columns (relevant) ===');
    const taskCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pm_tasks' AND column_name IN ('workflow_stage','stage','platform','task_type','status')
    `);
    taskCols.rows.forEach(r => console.log('  col:', r.column_name));

    // Check if there's a seed/default providers script
    console.log('\n=== Check env for AI keys ===');
    const envKeys = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY'];
    envKeys.forEach(k => {
      const v = process.env[k];
      console.log(`  ${k}=${v ? 'SET (' + v.substring(0,8) + '...)' : 'NOT SET'}`);
    });

    // Check if admin login was successful (test CSRF cookie)
    console.log('\n=== Routing resolution simulation ===');
    console.log('  facebook_content task_type → provider 1 (OpenAI)');
    console.log('  But provider 1 is_active=false → routing skips it');
    console.log('  → Falls back to first active provider = NONE');
    console.log('  → AI call fails with "no provider" error');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
