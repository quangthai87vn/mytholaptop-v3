/**
 * P7.1.1: Audit AI Provider Configuration
 * Queries all AI-related tables to understand current state.
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const dbConfig = parseDatabaseUrl(dbUrl);

const client = new Client({
  ...dbConfig,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    await client.connect();
    console.log('=== AI Provider Audit ===\n');

    // 1. List AI-related tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE 'ai_%' OR table_name LIKE 'pm_ai%')
      ORDER BY table_name
    `);
    console.log('AI tables:');
    if (tables.rows.length === 0) {
      console.log('  (none found)');
    } else {
      tables.rows.forEach(r => console.log('  -', r.table_name));
    }

    // 2. AI Providers
    console.log('\n--- AI Providers ---');
    try {
      const providers = await client.query('SELECT id, name, type, slug, base_url, model_name, is_active, status, is_default FROM ai_providers ORDER BY id');
      if (providers.rows.length === 0) {
        console.log('(no providers)');
      } else {
        providers.rows.forEach(r => {
          console.log(`  [${r.id}] ${r.name} | type=${r.type} | slug=${r.slug} | model=${r.model_name} | base_url=${r.base_url} | active=${r.is_active} | status=${r.status} | default=${r.is_default}`);
        });
      }
    } catch (e) { console.log('ai_providers table error:', e.message); }

    // 3. AI Task Routes
    console.log('\n--- AI Task Routes ---');
    try {
      const routes = await client.query('SELECT id, task_type, task_label, primary_provider_id, primary_model_override, is_active FROM ai_task_routes ORDER BY id');
      if (routes.rows.length === 0) {
        console.log('(no routing rules)');
      } else {
        routes.rows.forEach(r => {
          console.log(`  [${r.id}] ${r.task_type} "${r.task_label}" | provider_id=${r.primary_provider_id} | model=${r.primary_model_override} | active=${r.is_active}`);
        });
      }
    } catch (e) { console.log('ai_task_routes table error:', e.message); }

    // 4. AI Brand Voices
    console.log('\n--- AI Brand Voices ---');
    try {
      const voices = await client.query('SELECT id, name, preset, tone_instruction, is_active FROM ai_brand_voices ORDER BY id');
      if (voices.rows.length === 0) {
        console.log('(no brand voices)');
      } else {
        voices.rows.forEach(r => {
          console.log(`  [${r.id}] ${r.name} | preset=${r.preset} | active=${r.is_active}`);
        });
      }
    } catch (e) { console.log('ai_brand_voices table error:', e.message); }

    // 5. AI System Prompts
    console.log('\n--- AI System Prompts ---');
    try {
      const prompts = await client.query('SELECT id, name, prompt_text, is_active FROM ai_system_prompts ORDER BY id');
      if (prompts.rows.length === 0) {
        console.log('(no system prompts)');
      } else {
        prompts.rows.forEach(r => {
          const preview = r.prompt_text ? r.prompt_text.substring(0, 80) + '...' : '(empty)';
          console.log(`  [${r.id}] ${r.name} | active=${r.is_active} | "${preview}"`);
        });
      }
    } catch (e) { console.log('ai_system_prompts table error:', e.message); }

    // 6. AI Safety Rules
    console.log('\n--- AI Safety Rules ---');
    try {
      const rules = await client.query('SELECT id, name, rule_text, is_active FROM ai_safety_rules ORDER BY id');
      if (rules.rows.length === 0) {
        console.log('(no safety rules)');
      } else {
        rules.rows.forEach(r => {
          console.log(`  [${r.id}] ${r.name} | active=${r.is_active}`);
        });
      }
    } catch (e) { console.log('ai_safety_rules table error:', e.message); }

    // 7. Content Generation Logs
    console.log('\n--- Recent Generation Logs (last 5) ---');
    try {
      const logs = await client.query('SELECT id, provider, model_name, latency_ms, created_at, error_message FROM content_generation_logs ORDER BY created_at DESC LIMIT 5');
      if (logs.rows.length === 0) {
        console.log('(no generation logs)');
      } else {
        logs.rows.forEach(r => {
          console.log(`  [${r.id}] ${r.provider}/${r.model_name} | ${r.latency_ms}ms | ${r.created_at} | err=${r.error_message ? 'YES: ' + r.error_message.substring(0, 60) : 'none'}`);
        });
      }
    } catch (e) { console.log('content_generation_logs table error:', e.message); }

    // 8. Check pm_tasks sample for context
    console.log('\n--- Sample Tasks (for AI context) ---');
    try {
      const tasks = await client.query('SELECT id, title, task_type, platform, workflow_stage FROM pm_tasks ORDER BY created_at DESC LIMIT 3');
      tasks.rows.forEach(r => {
        console.log(`  [${r.id}] "${r.title}" | type=${r.task_type} | platform=${r.platform} | stage=${r.workflow_stage}`);
      });
    } catch (e) { console.log('pm_tasks error:', e.message); }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
