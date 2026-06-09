/**
 * P7.1.2: Add task_assistant routing rule for AI Task Assistant
 * Creates a routing rule that maps task_assistant task_type to the first active provider
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

    // Check if task_assistant route already exists
    const existing = await client.query(
      "SELECT id, task_type, primary_provider_id FROM ai_task_routes WHERE task_type = 'task_assistant'"
    );

    if (existing.rows.length > 0) {
      console.log(`task_assistant route already exists with id=${existing.rows[0].id}`);
      console.log(`  primary_provider_id=${existing.rows[0].primary_provider_id}`);
      console.log("  No changes needed.");
      await client.end();
      return;
    }

    // Find first active provider (is_active=true)
    const activeProvider = await client.query(`
      SELECT id, name, slug, type FROM ai_providers
      WHERE is_deleted = false AND is_active = true
      ORDER BY is_default DESC NULLS LAST, id ASC
      LIMIT 1
    `);

    if (activeProvider.rows.length === 0) {
      console.log("No active providers found. Creating task_assistant rule without provider.");
      console.log("It will be auto-assigned when a provider becomes active.");

      // Create with a placeholder provider_type and model_name
      // Routing engine will resolve the actual model at runtime based on the provider config
      await client.query(`
        INSERT INTO ai_task_routes
          (task_type, task_label, provider_type, model_name, priority, is_active)
        VALUES
          ('task_assistant', 'AI Task Assistant', 'openai', 'gpt-4o-mini', 1, true)
        ON CONFLICT (task_type) DO NOTHING
      `);
      console.log("Created task_assistant route with provider_type='openai', model='gpt-4o-mini' (placeholder).");
    } else {
      const provider = activeProvider.rows[0];
      console.log(`Found active provider: ${provider.name} (id=${provider.id})`);

      await client.query(`
        INSERT INTO ai_task_routes
          (task_type, task_label, primary_provider_id, priority, is_active,
           provider_type, model_name)
        VALUES
          ('task_assistant', 'AI Task Assistant', $1, 1, true, $2, NULL)
        ON CONFLICT (task_type) DO UPDATE SET
          primary_provider_id = EXCLUDED.primary_provider_id,
          priority = EXCLUDED.priority,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `, [provider.id, provider.slug || provider.type]);

      console.log(`Created task_assistant route with provider_id=${provider.id} (${provider.name})`);
    }

    // Verify
    const verify = await client.query(
      "SELECT id, task_type, task_label, primary_provider_id, provider_type, is_active FROM ai_task_routes WHERE task_type = 'task_assistant'"
    );
    if (verify.rows.length > 0) {
      const r = verify.rows[0];
      console.log("\nVerified task_assistant route:");
      console.log(`  id=${r.id} | task_type=${r.task_type} | label="${r.task_label}"`);
      console.log(`  primary_provider_id=${r.primary_provider_id} | provider_type=${r.provider_type} | is_active=${r.is_active}`);
    }

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
