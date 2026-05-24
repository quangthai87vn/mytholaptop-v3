/**
 * Migration: Add soft-delete support to ai_providers
 *
 * Adds:
 *   - is_deleted BOOLEAN DEFAULT false
 *   - deleted_at TIMESTAMPTZ
 *
 * Also creates ai_provider_groups table if not exists,
 * and seeds default groups if empty.
 */

import { query, exec, closePool } from "../lib/db";

async function migrate() {
  console.log("🔄 Running: ai-providers-soft-delete migration");

  try {
    // ── 1. Add soft-delete columns ──────────────────────────────────────────────
    await exec(`
      ALTER TABLE ai_providers
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);
    console.log("  ✅ Added is_deleted, deleted_at columns to ai_providers");

    // ── 2. Create ai_provider_groups table ─────────────────────────────────────
    await exec(`
      CREATE TABLE IF NOT EXISTS ai_provider_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL DEFAULT 'Cloud',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✅ Created ai_provider_groups table");

    // ── 3. Create ai_provider_models table ─────────────────────────────────────
    await exec(`
      CREATE TABLE IF NOT EXISTS ai_provider_models (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
        model_name TEXT NOT NULL,
        display_name TEXT,
        context_length INTEGER,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(provider_id, model_name)
      );
    `);
    console.log("  ✅ Created ai_provider_models table");

    // ── 4. Create ai_provider_runtime_configs table ──────────────────────────────
    await exec(`
      CREATE TABLE IF NOT EXISTS ai_provider_runtime_configs (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL UNIQUE REFERENCES ai_providers(id) ON DELETE CASCADE,
        selected_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
        temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
        max_output_tokens INTEGER NOT NULL DEFAULT 2048,
        top_p DECIMAL(3,2) NOT NULL DEFAULT 1.0,
        frequency_penalty DECIMAL(3,2) NOT NULL DEFAULT 0.0,
        presence_penalty DECIMAL(3,2) NOT NULL DEFAULT 0.0,
        timeout_ms INTEGER NOT NULL DEFAULT 60000,
        retry_count INTEGER NOT NULL DEFAULT 3,
        streaming_enabled BOOLEAN NOT NULL DEFAULT false,
        custom_settings JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✅ Created ai_provider_runtime_configs table");

    // ── 5. Create indexes ────────────────────────────────────────────────────────
    await exec(`CREATE INDEX IF NOT EXISTS idx_providers_is_deleted ON ai_providers(is_deleted);`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_providers_status ON ai_providers(status);`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_providers_slug ON ai_providers(slug);`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_providers_group_slug ON ai_providers(group_slug);`);
    await exec(`CREATE INDEX IF NOT EXISTS idx_provider_models_provider_id ON ai_provider_models(provider_id);`);
    console.log("  ✅ Created indexes");

    // ── 6. Seed provider groups ─────────────────────────────────────────────────
    const groupsExist = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_provider_groups"
    );
    if (parseInt(groupsExist.rows[0]?.count || "0", 10) === 0) {
      await exec(`
        INSERT INTO ai_provider_groups (name, slug, icon, sort_order) VALUES
          ('Cloud APIs',          'cloud_api',          'Cloud',    1),
          ('AI Aggregators',     'ai_aggregator',     'Layers',   2),
          ('Local LLMs',         'local_llm',          'Cpu',      3),
          ('Inference Platform', 'inference_platform', 'Zap',      4);
      `);
      console.log("  ✅ Seeded 4 provider groups");
    } else {
      console.log("  ⏭️  Skipped: groups already exist");
    }

    // ── 7. Ensure runtime config exists for each provider ───────────────────────
    await exec(`
      INSERT INTO ai_provider_runtime_configs (provider_id, selected_model, temperature, streaming_enabled, timeout_ms, retry_count)
      SELECT id, COALESCE(model_name, 'gpt-4o-mini'), COALESCE(temperature, 0.7), COALESCE(streaming_enabled, false), COALESCE(timeout_ms, 60000), COALESCE(retry_count, 3)
      FROM ai_providers
      WHERE is_deleted = false
      ON CONFLICT (provider_id) DO NOTHING;
    `);
    console.log("  ✅ Ensured runtime configs for all providers");

    console.log("✅ Migration complete: ai-providers-soft-delete");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
