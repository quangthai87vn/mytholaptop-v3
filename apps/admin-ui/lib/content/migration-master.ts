/**
 * ============================================================
 * MIGRATION MASTER SCRIPT
 * ============================================================
 * Chạy tất cả migration theo đúng thứ tự:
 *   1. Content Module    (9 tables: ai_providers, ai_settings, content_*, publish_*)
 *   2. AIOC Core         (6 tables: ai_task_routes, ai_brand_voices, ai_prompt_rules,
 *                          ai_safety_rules, ai_system_prompt_templates, ai_media_settings)
 *   3. Provider Mgmt     (3 tables: ai_provider_groups, ai_provider_models,
 *                          ai_provider_runtime_configs) + enhance ai_providers
 *   4. Routing FK        (ALTER ai_task_routes: add FK + override columns)
 *   5. Migration State   (4 tables: migration_runs, migration_items,
 *                          migration_mappings, migration_logs)
 *   6. Addon             (ai_routing_rules table, extra seed data)
 *
 * Chạy: npx tsx lib/content/migration-master.ts
 */

import { Pool } from "pg";

// ── Database URL (dùng chung với docker-compose) ──────────────────────────────
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgrespassword&1P@ssw0rd&Aimabiettaolaai@postgres:5432/mytholaptop";

if (!DATABASE_URL) {
  console.error("[ERROR] DATABASE_URL not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ── Helpers ────────────────────────────────────────────────────────────────────

async function colExists(client: any, table: string, col: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return r.rowCount > 0;
}

async function idxExists(client: any, table: string, idx: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM pg_indexes WHERE tablename=$1 AND indexname=$2`,
    [table, idx]
  );
  return r.rowCount > 0;
}

async function ensureIndex(client: any, table: string, idxName: string, idxDef: string) {
  if (!(await idxExists(client, table, idxName))) {
    await client.query(idxDef);
    console.log(`    + index: ${idxName}`);
  }
}

// ── Phase 1: Content Module (9 tables) ─────────────────────────────────────────
async function phase1_contentModule(client: any) {
  console.log("\n[PHASE 1] Content Module (9 tables)...");

  // ai_providers
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id              SERIAL PRIMARY KEY,
      provider        VARCHAR(50) NOT NULL UNIQUE,
      display_name    VARCHAR(200) NOT NULL,
      base_url        VARCHAR(500),
      api_key_encrypted TEXT,
      api_key_iv      VARCHAR(100),
      is_active       BOOLEAN DEFAULT false,
      sort_order      INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_providers");

  // ai_settings
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      id                  SERIAL PRIMARY KEY,
      provider_id         INTEGER REFERENCES ai_providers(id),
      base_url            VARCHAR(500),
      model_name          VARCHAR(200),
      api_key_encrypted   TEXT,
      api_key_iv          VARCHAR(64),
      temperature         NUMERIC(3,2) DEFAULT 0.7,
      max_tokens          INTEGER DEFAULT 2048,
      brand_voice         TEXT,
      prompt_rules        TEXT,
      safety_rules        TEXT,
      is_active           BOOLEAN DEFAULT true,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_settings");

  // content_templates
  await client.query(`
    CREATE TABLE IF NOT EXISTS content_templates (
      id              SERIAL PRIMARY KEY,
      template_name   VARCHAR(300) NOT NULL,
      content_type    VARCHAR(50) NOT NULL,
      system_prompt   TEXT,
      user_template   TEXT NOT NULL,
      variables       JSONB DEFAULT '[]',
      tone_options    JSONB DEFAULT '[]',
      is_active       BOOLEAN DEFAULT true,
      usage_count     INTEGER DEFAULT 0,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + content_templates");

  // content_items
  await client.query(`
    CREATE TABLE IF NOT EXISTS content_items (
      id              SERIAL PRIMARY KEY,
      content_type    VARCHAR(50) NOT NULL,
      title           VARCHAR(500),
      content_body    TEXT,
      product_id      VARCHAR(100),
      product_name    VARCHAR(500),
      status          VARCHAR(30) DEFAULT 'draft',
      metadata        JSONB DEFAULT '{}',
      generated_by    VARCHAR(100),
      template_id     INTEGER REFERENCES content_templates(id),
      created_by      VARCHAR(100),
      published_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + content_items");

  // content_generation_logs
  await client.query(`
    CREATE TABLE IF NOT EXISTS content_generation_logs (
      id              SERIAL PRIMARY KEY,
      content_item_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
      provider        VARCHAR(50) NOT NULL,
      model_name      VARCHAR(200),
      request_payload TEXT,
      response_text   TEXT,
      tokens_used     INTEGER,
      latency_ms      INTEGER,
      error_message   TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + content_generation_logs");

  // content_schedules
  await client.query(`
    CREATE TABLE IF NOT EXISTS content_schedules (
      id              SERIAL PRIMARY KEY,
      content_item_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
      channel         VARCHAR(50) NOT NULL,
      publish_at      TIMESTAMPTZ NOT NULL,
      timezone        VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
      status          VARCHAR(30) DEFAULT 'pending',
      metadata        JSONB DEFAULT '{}',
      created_by      VARCHAR(100),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + content_schedules");

  // media_prompts
  await client.query(`
    CREATE TABLE IF NOT EXISTS media_prompts (
      id              SERIAL PRIMARY KEY,
      content_item_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
      prompt          TEXT NOT NULL,
      negative_prompt TEXT,
      style           VARCHAR(100),
      aspect_ratio    VARCHAR(20) DEFAULT '1:1',
      quality         VARCHAR(20) DEFAULT 'standard',
      status          VARCHAR(30) DEFAULT 'pending',
      result_url      VARCHAR(1000),
      created_by      VARCHAR(100),
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + media_prompts");

  // publish_channels
  await client.query(`
    CREATE TABLE IF NOT EXISTS publish_channels (
      id              SERIAL PRIMARY KEY,
      channel_code    VARCHAR(50) NOT NULL UNIQUE,
      channel_name    VARCHAR(200) NOT NULL,
      icon            VARCHAR(50),
      config          JSONB DEFAULT '{}',
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + publish_channels");

  // publish_jobs
  await client.query(`
    CREATE TABLE IF NOT EXISTS publish_jobs (
      id              SERIAL PRIMARY KEY,
      schedule_id     INTEGER REFERENCES content_schedules(id) ON DELETE SET NULL,
      channel         VARCHAR(50) NOT NULL,
      status          VARCHAR(30) DEFAULT 'pending',
      result          JSONB DEFAULT '{}',
      error_message   TEXT,
      attempts        INTEGER DEFAULT 0,
      run_at          TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + publish_jobs");

  // Indexes
  await ensureIndex(client, "content_items", "idx_content_items_type",
    "CREATE INDEX idx_content_items_type ON content_items(content_type)");
  await ensureIndex(client, "content_items", "idx_content_items_status",
    "CREATE INDEX idx_content_items_status ON content_items(status)");
  await ensureIndex(client, "content_items", "idx_content_items_product",
    "CREATE INDEX idx_content_items_product ON content_items(product_id)");
  await ensureIndex(client, "content_items", "idx_content_items_created",
    "CREATE INDEX idx_content_items_created ON content_items(created_at DESC)");
  await ensureIndex(client, "content_schedules", "idx_content_schedules_publish",
    "CREATE INDEX idx_content_schedules_publish ON content_schedules(publish_at)");
  await ensureIndex(client, "content_schedules", "idx_content_schedules_status",
    "CREATE INDEX idx_content_schedules_status ON content_schedules(status)");
  await ensureIndex(client, "content_generation_logs", "idx_content_generation_logs_content",
    "CREATE INDEX idx_content_generation_logs_content ON content_generation_logs(content_item_id)");
  await ensureIndex(client, "content_generation_logs", "idx_content_generation_logs_provider",
    "CREATE INDEX idx_content_generation_logs_provider ON content_generation_logs(provider)");
  await ensureIndex(client, "content_generation_logs", "idx_content_generation_logs_created",
    "CREATE INDEX idx_content_generation_logs_created ON content_generation_logs(created_at DESC)");
  await ensureIndex(client, "media_prompts", "idx_media_prompts_content",
    "CREATE INDEX idx_media_prompts_content ON media_prompts(content_item_id)");
  await ensureIndex(client, "publish_jobs", "idx_publish_jobs_schedule",
    "CREATE INDEX idx_publish_jobs_schedule ON publish_jobs(schedule_id)");
  console.log("  + indexes (11)");
}

// ── Phase 2: AIOC Core (6 tables) ────────────────────────────────────────────
async function phase2_aiocCore(client: any) {
  console.log("\n[PHASE 2] AIOC Core (6 tables)...");

  // ai_task_routes
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_task_routes (
      id                      SERIAL PRIMARY KEY,
      task_type               VARCHAR(50) NOT NULL,
      task_label              VARCHAR(200) NOT NULL,
      provider_type           VARCHAR(30) NOT NULL,
      model_name              VARCHAR(200) NOT NULL,
      fallback_provider_type  VARCHAR(30),
      fallback_model_name     VARCHAR(200),
      temperature             NUMERIC(3,2) DEFAULT 0.7,
      max_tokens              INTEGER DEFAULT 2048,
      priority                INTEGER DEFAULT 10,
      system_prompt_id        INTEGER,
      brand_preset            VARCHAR(50),
      is_active               BOOLEAN DEFAULT true,
      created_at              TIMESTAMPTZ DEFAULT NOW(),
      updated_at              TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(task_type)
    )
  `);
  console.log("  + ai_task_routes");

  // ai_brand_voices
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_brand_voices (
      id                            SERIAL PRIMARY KEY,
      preset                        VARCHAR(50) NOT NULL UNIQUE,
      name                          VARCHAR(200) NOT NULL,
      description                   TEXT,
      target_audience               TEXT,
      tone_instruction              TEXT,
      keywords_to_use               TEXT[],
      keywords_to_avoid             TEXT[],
      tone_professional_casual      NUMERIC(3,2) DEFAULT 0,
      tone_luxury_affordable        NUMERIC(3,2) DEFAULT 0,
      tone_technical_simple         NUMERIC(3,2) DEFAULT 0,
      content_template              TEXT,
      emoji_usage                   VARCHAR(20) DEFAULT 'moderate',
      cta_style                     VARCHAR(20) DEFAULT 'direct',
      example_output                TEXT,
      is_active                     BOOLEAN DEFAULT true,
      created_at                   TIMESTAMPTZ DEFAULT NOW(),
      updated_at                   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_brand_voices");

  // ai_prompt_rules
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_prompt_rules (
      id              SERIAL PRIMARY KEY,
      scope           VARCHAR(20) NOT NULL DEFAULT 'global',
      platform        VARCHAR(30),
      rule_key        VARCHAR(100) NOT NULL,
      rule_text       TEXT NOT NULL,
      priority        INTEGER DEFAULT 0,
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_prompt_rules");

  // ai_safety_rules
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_safety_rules (
      id                    SERIAL PRIMARY KEY,
      rule_key              VARCHAR(100) NOT NULL UNIQUE,
      rule_text             TEXT NOT NULL,
      severity              VARCHAR(20) DEFAULT 'medium',
      is_active             BOOLEAN DEFAULT true,
      created_at            TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_safety_rules");

  // ai_system_prompt_templates
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_system_prompt_templates (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      description TEXT,
      prompt_text TEXT NOT NULL,
      is_active   BOOLEAN DEFAULT true,
      is_default  BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_system_prompt_templates");

  // ai_media_settings
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_media_settings (
      id                    SERIAL PRIMARY KEY,
      media_type            VARCHAR(20) NOT NULL UNIQUE,
      provider              VARCHAR(30) NOT NULL,
      model_name            VARCHAR(200),
      base_url              VARCHAR(500),
      api_key_encrypted     TEXT,
      api_key_iv            VARCHAR(100),
      temperature           NUMERIC(3,2) DEFAULT 0.9,
      quality               VARCHAR(20) DEFAULT 'standard',
      size                  VARCHAR(20) DEFAULT '1024x1024',
      is_active             BOOLEAN DEFAULT false,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_media_settings");

  // Indexes
  await ensureIndex(client, "ai_task_routes", "idx_task_routes_task_type",
    "CREATE INDEX idx_task_routes_task_type ON ai_task_routes(task_type)");
  await ensureIndex(client, "ai_task_routes", "idx_task_routes_provider",
    "CREATE INDEX idx_task_routes_provider ON ai_task_routes(provider_type)");
  await ensureIndex(client, "ai_brand_voices", "idx_brand_voices_active",
    "CREATE INDEX idx_brand_voices_active ON ai_brand_voices(is_active)");
  await ensureIndex(client, "ai_prompt_rules", "idx_prompt_rules_scope",
    "CREATE INDEX idx_prompt_rules_scope ON ai_prompt_rules(scope)");
  await ensureIndex(client, "ai_prompt_rules", "idx_prompt_rules_platform",
    "CREATE INDEX idx_prompt_rules_platform ON ai_prompt_rules(platform)");
  console.log("  + indexes (5)");
}

// ── Phase 3: Provider Management (3 tables + enhance ai_providers) ─────────────
async function phase3_providerMgmt(client: any) {
  console.log("\n[PHASE 3] Provider Management (3 tables + enhance ai_providers)...");

  // ai_provider_groups
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_provider_groups (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      slug        VARCHAR(50) NOT NULL UNIQUE,
      icon        VARCHAR(50) DEFAULT 'Cpu',
      sort_order  INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + ai_provider_groups");

  // ai_provider_models
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_provider_models (
      id              SERIAL PRIMARY KEY,
      provider_id     INTEGER REFERENCES ai_providers(id) ON DELETE CASCADE,
      model_name      VARCHAR(200) NOT NULL,
      display_name    VARCHAR(200),
      context_length  INTEGER,
      is_default      BOOLEAN DEFAULT false,
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider_id, model_name)
    )
  `);
  console.log("  + ai_provider_models");

  // ai_provider_runtime_configs
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_provider_runtime_configs (
      id                    SERIAL PRIMARY KEY,
      provider_id           INTEGER NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
      selected_model        VARCHAR(200) NOT NULL,
      temperature           NUMERIC(3,2) DEFAULT 0.7,
      max_output_tokens     INTEGER DEFAULT 2048,
      top_p                 NUMERIC(3,2) DEFAULT 1.0,
      frequency_penalty     NUMERIC(3,2) DEFAULT 0.0,
      presence_penalty      NUMERIC(3,2) DEFAULT 0.0,
      timeout_ms            INTEGER DEFAULT 60000,
      retry_count           INTEGER DEFAULT 3,
      streaming_enabled     BOOLEAN DEFAULT false,
      custom_settings      JSONB DEFAULT '{}',
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider_id)
    )
  `);
  console.log("  + ai_provider_runtime_configs");

  // ── Enhance ai_providers with migration-providers.ts columns ──────────────────
  const newCols = [
    { name: "is_deleted",           def: "BOOLEAN NOT NULL DEFAULT false" },
    { name: "deleted_at",           def: "TIMESTAMPTZ" },
    { name: "slug",                 def: "VARCHAR(50)" },
    { name: "name",                 def: "VARCHAR(100) NOT NULL DEFAULT ''" },
    { name: "type",                 def: "VARCHAR(50) NOT NULL DEFAULT ''" },
    { name: "group_slug",           def: "VARCHAR(50) DEFAULT 'cloud_api'" },
    { name: "status",               def: "VARCHAR(20) DEFAULT 'active'" },
    { name: "is_system",            def: "BOOLEAN DEFAULT false" },
    { name: "is_default",            def: "BOOLEAN DEFAULT false" },
    { name: "connection_status",    def: "VARCHAR(20) DEFAULT 'unknown'" },
    { name: "last_checked_at",      def: "TIMESTAMPTZ" },
    { name: "last_error",           def: "TEXT" },
    { name: "custom_headers",        def: "JSONB DEFAULT '{}'" },
    { name: "model_name",           def: "VARCHAR(200)" },
    { name: "streaming_enabled",     def: "BOOLEAN DEFAULT false" },
    { name: "timeout_ms",           def: "INTEGER DEFAULT 60000" },
    { name: "retry_count",          def: "INTEGER DEFAULT 3" },
  ];

  for (const col of newCols) {
    if (!(await colExists(client, "ai_providers", col.name))) {
      await client.query(`ALTER TABLE ai_providers ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  + ai_providers: +${col.name}`);
    }
  }

  // Backfill slug from provider if slug is empty
  await client.query(`
    UPDATE ai_providers
    SET slug = COALESCE(slug, 'provider_' || id::text)
    WHERE slug IS NULL OR slug = ''
  `);

  // Ensure slug NOT NULL + unique
  const slugNullable = await client.query(`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name='ai_providers' AND column_name='slug'
  `).then((r: { rows: Array<{ is_nullable: string }> }) => r.rows[0]?.is_nullable === 'YES');

  if (slugNullable) {
    await client.query(`
      UPDATE ai_providers SET slug = 'provider_' || id::text WHERE slug IS NULL
    `);
    await client.query(`ALTER TABLE ai_providers ALTER COLUMN slug SET NOT NULL`);
    await client.query(`DROP INDEX IF EXISTS ai_providers_slug_key`);
    await client.query(`
      CREATE UNIQUE INDEX ai_providers_slug_unique
      ON ai_providers(slug) WHERE slug IS NOT NULL
    `);
    await client.query(`DROP INDEX IF EXISTS ai_providers_provider_key`);
    console.log("  + ai_providers: slug NOT NULL + unique");
  }

  // Backfill name from display_name if name is empty
  await client.query(`
    UPDATE ai_providers
    SET name = COALESCE(NULLIF(name, ''), display_name)
    WHERE (name IS NULL OR name = '') AND display_name IS NOT NULL AND display_name != ''
  `);

  // Backfill display_name from name if display_name is empty
  await client.query(`
    UPDATE ai_providers
    SET display_name = COALESCE(NULLIF(display_name, ''), name)
    WHERE (display_name IS NULL OR display_name = '') AND name IS NOT NULL AND name != ''
  `);

  // Backfill type from slug if type is empty
  await client.query(`
    UPDATE ai_providers
    SET type = COALESCE(NULLIF(type, ''), slug)
    WHERE (type IS NULL OR type = '') AND slug IS NOT NULL AND slug != ''
  `);

  // Indexes
  await ensureIndex(client, "ai_providers", "idx_providers_status",
    "CREATE INDEX idx_providers_status ON ai_providers(status)");
  await ensureIndex(client, "ai_providers", "idx_providers_is_default",
    "CREATE INDEX idx_providers_is_default ON ai_providers(is_default)");
  await ensureIndex(client, "ai_providers", "idx_providers_group_slug",
    "CREATE INDEX idx_providers_group_slug ON ai_providers(group_slug)");
  await ensureIndex(client, "ai_providers", "idx_providers_is_active",
    "CREATE INDEX idx_ai_providers_is_active ON ai_providers(is_active)");
  await ensureIndex(client, "ai_providers", "idx_ai_providers_sort_order",
    "CREATE INDEX idx_ai_providers_sort_order ON ai_providers(sort_order)");
  await ensureIndex(client, "ai_provider_models", "idx_provider_models_provider",
    "CREATE INDEX idx_provider_models_provider ON ai_provider_models(provider_id)");
  await ensureIndex(client, "ai_provider_runtime_configs", "idx_provider_configs_provider",
    "CREATE INDEX idx_provider_configs_provider ON ai_provider_runtime_configs(provider_id)");
  console.log("  + indexes (7)");
}

// ── Phase 4: Routing FK + Override columns ─────────────────────────────────────
async function phase4_routingFK(client: any) {
  console.log("\n[PHASE 4] Routing FK + Override Columns...");

  const routingNewCols = [
    { name: "primary_provider_id",       def: "INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL" },
    { name: "primary_model_override",     def: "TEXT" },
    { name: "fallback_provider_id",      def: "INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL" },
    { name: "fallback_model_override",   def: "TEXT" },
    { name: "temperature_override",       def: "NUMERIC(3,2)" },
    { name: "max_tokens_override",       def: "INTEGER" },
    { name: "top_p_override",            def: "NUMERIC(3,2)" },
  ];

  for (const col of routingNewCols) {
    if (!(await colExists(client, "ai_task_routes", col.name))) {
      await client.query(`ALTER TABLE ai_task_routes ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  + ai_task_routes: +${col.name}`);
    }
  }

  // Migrate existing data
  const hasOldData = await client.query(`
    SELECT 1 FROM ai_task_routes
    WHERE provider_type IS NOT NULL AND provider_type != ''
    AND (primary_provider_id IS NULL OR primary_model_override IS NULL)
    LIMIT 1
  `).then((r: { rowCount: number }) => r.rowCount > 0);

  if (hasOldData) {
    await client.query(`
      UPDATE ai_task_routes AS r
      SET primary_provider_id = p.id,
          primary_model_override = r.model_name
      FROM ai_providers p
      WHERE r.provider_type = p.slug
        AND r.primary_provider_id IS NULL
        AND r.model_name IS NOT NULL AND r.model_name != ''
    `);
    console.log("  + migrated primary_provider_id from provider_type→slug");
  }

  // Partial indexes
  await ensureIndex(client, "ai_task_routes", "ai_task_routes_primary_provider_id_idx", `
    CREATE INDEX ai_task_routes_primary_provider_id_idx
    ON ai_task_routes(primary_provider_id)
    WHERE primary_provider_id IS NOT NULL
  `);
  await ensureIndex(client, "ai_task_routes", "ai_task_routes_fallback_provider_id_idx", `
    CREATE INDEX ai_task_routes_fallback_provider_id_idx
    ON ai_task_routes(fallback_provider_id)
    WHERE fallback_provider_id IS NOT NULL
  `);
  console.log("  + indexes (2)");
}

// ── Phase 5: Migration State Tables ───────────────────────────────────────────
async function phase5_migrationState(client: any) {
  console.log("\n[PHASE 5] Migration State Tables (4 tables)...");

  // migration_runs
  await client.query(`
    CREATE TABLE IF NOT EXISTS migration_runs (
      id VARCHAR(255) PRIMARY KEY,
      source VARCHAR(50) NOT NULL DEFAULT 'wordpress',
      status VARCHAR(50) NOT NULL DEFAULT 'idle',
      current_stage VARCHAR(50),
      total_items INT DEFAULT 0,
      processed_items INT DEFAULT 0,
      success_count INT DEFAULT 0,
      failed_count INT DEFAULT 0,
      skipped_count INT DEFAULT 0,
      created_count INT DEFAULT 0,
      updated_count INT DEFAULT 0,
      started_at TIMESTAMP NULL,
      finished_at TIMESTAMP NULL,
      last_checkpoint_at TIMESTAMP NULL,
      cancellation_requested BOOLEAN DEFAULT FALSE,
      config JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  + migration_runs");

  // migration_items
  await client.query(`
    CREATE TABLE IF NOT EXISTS migration_items (
      id VARCHAR(255) PRIMARY KEY,
      run_id VARCHAR(255) NOT NULL REFERENCES migration_runs(id) ON DELETE CASCADE,
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(255),
      source_slug VARCHAR(500),
      source_sku VARCHAR(255),
      source_hash VARCHAR(64),
      target_id VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      action VARCHAR(50),
      error_message TEXT,
      retry_count INT DEFAULT 0,
      batch_number INT DEFAULT 0,
      last_processed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  + migration_items");

  // migration_mappings
  await client.query(`
    CREATE TABLE IF NOT EXISTS migration_mappings (
      id VARCHAR(255) PRIMARY KEY,
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(255) NOT NULL,
      source_key VARCHAR(255),
      target_type VARCHAR(50) NOT NULL,
      target_id VARCHAR(255) NOT NULL,
      target_handle VARCHAR(500),
      target_sku VARCHAR(255),
      source_hash VARCHAR(64),
      last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_type, source_id)
    )
  `);
  console.log("  + migration_mappings");

  // migration_logs
  await client.query(`
    CREATE TABLE IF NOT EXISTS migration_logs (
      id VARCHAR(255) PRIMARY KEY,
      run_id VARCHAR(255) NOT NULL REFERENCES migration_runs(id) ON DELETE CASCADE,
      level VARCHAR(20) NOT NULL DEFAULT 'info',
      stage VARCHAR(50),
      source_type VARCHAR(50),
      source_id VARCHAR(255),
      message TEXT NOT NULL,
      payload JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  + migration_logs");

  // Updated_at trigger
  await client.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$
    LANGUAGE plpgsql
  `);

  for (const t of ["migration_runs", "migration_items", "migration_mappings"]) {
    await client.query(`
      DO $$ BEGIN
        CREATE TRIGGER update_${t}_updated_at
          BEFORE UPDATE ON ${t} FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }
  console.log("  + updated_at triggers");

  // Indexes
  await ensureIndex(client, "migration_runs", "idx_migration_runs_status",
    "CREATE INDEX idx_migration_runs_status ON migration_runs(status)");
  await ensureIndex(client, "migration_runs", "idx_migration_runs_created_at",
    "CREATE INDEX idx_migration_runs_created_at ON migration_runs(created_at)");
  await ensureIndex(client, "migration_items", "idx_migration_items_run_id",
    "CREATE INDEX idx_migration_items_run_id ON migration_items(run_id)");
  await ensureIndex(client, "migration_items", "idx_migration_items_status",
    "CREATE INDEX idx_migration_items_status ON migration_items(status)");
  await ensureIndex(client, "migration_items", "idx_migration_items_source_id",
    "CREATE INDEX idx_migration_items_source_id ON migration_items(source_id)");
  await ensureIndex(client, "migration_items", "idx_migration_items_target_id",
    "CREATE INDEX idx_migration_items_target_id ON migration_items(target_id)");
  await ensureIndex(client, "migration_mappings", "idx_migration_mappings_source",
    "CREATE INDEX idx_migration_mappings_source ON migration_mappings(source_type, source_id)");
  await ensureIndex(client, "migration_mappings", "idx_migration_mappings_target",
    "CREATE INDEX idx_migration_mappings_target ON migration_mappings(target_type, target_id)");
  await ensureIndex(client, "migration_logs", "idx_migration_logs_run_id",
    "CREATE INDEX idx_migration_logs_run_id ON migration_logs(run_id)");
  console.log("  + indexes (9)");
}

// ── Phase 6: Addon + ai_routing_rules ─────────────────────────────────────────
async function phase6_addon(client: any) {
  console.log("\n[PHASE 6] Addon (ai_routing_rules, extra seed)...");

  // ai_routing_rules
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_routing_rules (
      id              SERIAL PRIMARY KEY,
      rule_name       VARCHAR(200) NOT NULL,
      task_type       VARCHAR(50) NOT NULL,
      provider_type   VARCHAR(30) NOT NULL,
      model_name      VARCHAR(200),
      priority        INTEGER DEFAULT 10,
      is_active       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(task_type, rule_name)
    )
  `);
  console.log("  + ai_routing_rules");

  // ai_prompt_rules unique constraint (coalesce NULL platform)
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ai_prompt_rules_scope_platform_rule_key_unique'
      ) THEN
        ALTER TABLE ai_prompt_rules
          ADD CONSTRAINT ai_prompt_rules_scope_platform_rule_key_unique
          UNIQUE (scope, COALESCE(platform, ''), rule_key);
      END IF;
    EXCEPTION WHEN undefined_table THEN NULL; END $$
  `);
  console.log("  + ai_prompt_rules unique constraint");
}

// ── Phase 7: App Settings (WooCommerce + Medusa credentials) ───────────────────
async function phase7_appSettings(client: any) {
  console.log("\n[PHASE 7] App Settings...");

  await client.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id          SERIAL PRIMARY KEY,
      key         VARCHAR(100) NOT NULL UNIQUE,
      value       TEXT NOT NULL,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("  + app_settings");

  await ensureIndex(client, "app_settings", "idx_app_settings_key",
    "CREATE UNIQUE INDEX idx_app_settings_key ON app_settings(key)");
  console.log("  + index: idx_app_settings_key");

  // Seed default app settings
  await client.query(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('wooCommerce', '{"wordpressUrl":"","consumerKey":"","consumerSecret":""}', NOW())
    ON CONFLICT (key) DO NOTHING
  `);
  await client.query(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('medusa', '{"backendUrl":"","adminEmail":"","adminPassword":"","adminApiKey":""}', NOW())
    ON CONFLICT (key) DO NOTHING
  `);
  await client.query(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('company', '{"name":"","website":"","phone":"","logoUrl":"","address":""}', NOW())
    ON CONFLICT (key) DO NOTHING
  `);
  console.log("  + seed: app_settings defaults (wooCommerce, medusa, company)");
}

// ── Phase 8: Seed Data ─────────────────────────────────────────────────────────
async function phase8_seed(client: any) {
  console.log("\n[PHASE 7] Seeding Data...");

  // ── Seed provider groups ─────────────────────────────────────────────────────
  const groups = [
    { name: "Cloud APIs",            slug: "cloud_api",         icon: "Cloud",   sort_order: 1 },
    { name: "AI Aggregator",        slug: "ai_aggregator",     icon: "Layers", sort_order: 2 },
    { name: "Local LLM",            slug: "local_llm",         icon: "Cpu",    sort_order: 3 },
    { name: "Inference Platform",    slug: "inference_platform",icon: "Layers", sort_order: 4 },
  ];
  for (const g of groups) {
    await client.query(`
      INSERT INTO ai_provider_groups (name, slug, icon, sort_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon
    `, [g.name, g.slug, g.icon, g.sort_order]);
  }
  console.log("  + seed: ai_provider_groups (4)");

  // ── Seed providers ──────────────────────────────────────────────────────────
  const providers = [
    // Cloud APIs
    { name: "OpenAI", slug: "openai",         group_slug: "cloud_api",        type: "openai",          base_url: "https://api.openai.com/v1",                              default_model: "gpt-4o-mini",           streaming: false, timeout: 60000, retry: 3 },
    { name: "Google Gemini", slug: "gemini",   group_slug: "cloud_api",        type: "gemini",          base_url: "https://generativelanguage.googleapis.com/v1beta/models", default_model: "gemini-2.0-flash",    streaming: false, timeout: 60000, retry: 3 },
    { name: "DeepSeek Cloud", slug: "deepseek",group_slug: "cloud_api",        type: "deepseek",        base_url: "https://api.deepseek.com/v1",                            default_model: "deepseek-chat",        streaming: false, timeout: 60000, retry: 3 },
    // AI Aggregator
    { name: "OpenRouter", slug: "openrouter",  group_slug: "ai_aggregator",   type: "openrouter",      base_url: "https://openrouter.ai/api/v1",                           default_model: "openrouter/anthropic/claude-3.5-sonnet", streaming: true, timeout: 90000, retry: 3 },
    { name: "Groq", slug: "groq",              group_slug: "ai_aggregator",   type: "groq",            base_url: "https://api.groq.com/openai/v1",                        default_model: "llama-3.3-70b-versatile", streaming: true, timeout: 60000, retry: 3 },
    // Local LLM
    { name: "Ollama", slug: "ollama",          group_slug: "local_llm",       type: "ollama",          base_url: "http://localhost:11434",                                 default_model: "llama3.2",             streaming: false, timeout: 120000, retry: 2 },
    { name: "LM Studio", slug: "lmstudio",     group_slug: "local_llm",       type: "lmstudio",        base_url: "http://localhost:1234/v1",                               default_model: "",                     streaming: false, timeout: 120000, retry: 2 },
    { name: "OpenAI-Compatible", slug: "openai_compatible", group_slug: "local_llm", type: "openai_compatible", base_url: "http://localhost:8000/v1",                         default_model: "",                     streaming: false, timeout: 120000, retry: 2 },
    // Inference Platform
    { name: "HuggingFace", slug: "huggingface",group_slug: "inference_platform",type: "huggingface",    base_url: "https://api-inference.huggingface.co/models",             default_model: "mistralai/Mistral-7B-Instruct-v0.2", streaming: false, timeout: 60000, retry: 3 },
  ];

  for (const p of providers) {
    const { rows: existing } = await client.query(
      `SELECT id FROM ai_providers WHERE slug = $1 AND is_deleted = false LIMIT 1`,
      [p.slug]
    );

    if (existing.length === 0) {
      await client.query(`
        INSERT INTO ai_providers
          (name, slug, group_slug, type, base_url, status, is_system, is_default,
           display_name, connection_status, provider, model_name, streaming_enabled, timeout_ms, retry_count)
        VALUES ($1, $2, $3, $4, $5, 'active', true, false, $1, 'unknown', $4, $6, $7, $8, $9)
      `, [p.name, p.slug, p.group_slug, p.type, p.base_url, p.default_model, p.streaming, p.timeout, p.retry]);
    } else {
      await client.query(`
        UPDATE ai_providers SET
          name = COALESCE(NULLIF(name, ''), $1),
          group_slug = COALESCE($2, group_slug),
          type = COALESCE(NULLIF(type, ''), $3),
          base_url = COALESCE(NULLIF(base_url, ''), $4)
        WHERE slug = $5 AND is_deleted = false
      `, [p.name, p.group_slug, p.type, p.base_url, p.slug]);
    }
  }

  // Set OpenAI as default if none set
  await client.query(`
    UPDATE ai_providers SET is_default = false WHERE is_default = true
  `);
  await client.query(`
    UPDATE ai_providers SET is_default = true
    WHERE slug = 'openai' AND is_deleted = false
      AND NOT EXISTS (SELECT 1 FROM ai_providers WHERE is_default = true AND is_deleted = false)
  `);
  console.log("  + seed: ai_providers (9) + default set to OpenAI");

  // ── Seed runtime configs ────────────────────────────────────────────────────
  for (const p of providers) {
    const { rows: provRows } = await client.query(
      `SELECT id FROM ai_providers WHERE slug = $1 AND is_deleted = false LIMIT 1`,
      [p.slug]
    );
    const pid = provRows[0]?.id;
    if (!pid) continue;

    await client.query(`
      INSERT INTO ai_provider_runtime_configs
        (provider_id, selected_model, temperature, max_output_tokens, top_p,
         frequency_penalty, presence_penalty, timeout_ms, retry_count, streaming_enabled)
      VALUES ($1, $2, 0.7, 2048, 1.0, 0.0, 0.0, $3, $4, $5)
      ON CONFLICT (provider_id) DO UPDATE SET
        selected_model = COALESCE(NULLIF(EXCLUDED.selected_model, ''), ai_provider_runtime_configs.selected_model),
        timeout_ms = EXCLUDED.timeout_ms,
        retry_count = EXCLUDED.retry_count,
        streaming_enabled = EXCLUDED.streaming_enabled,
        updated_at = NOW()
    `, [pid, p.default_model, p.timeout, p.retry, p.streaming]);
  }
  console.log("  + seed: ai_provider_runtime_configs (9)");

  // ── Seed models ──────────────────────────────────────────────────────────────
  const models = [
    { slug: "openai",      name: "gpt-4o",                    display: "GPT-4o",                   ctx: 128000, def: false },
    { slug: "openai",      name: "gpt-4o-mini",                display: "GPT-4o Mini",               ctx: 128000, def: true  },
    { slug: "openai",      name: "gpt-4-turbo",                display: "GPT-4 Turbo",               ctx: 128000, def: false },
    { slug: "gemini",      name: "gemini-2.0-flash",           display: "Gemini 2.0 Flash",          ctx: 1000000, def: true },
    { slug: "gemini",      name: "gemini-1.5-flash",           display: "Gemini 1.5 Flash",          ctx: 1000000, def: false },
    { slug: "gemini",      name: "gemini-1.5-pro",             display: "Gemini 1.5 Pro",            ctx: 2000000, def: false },
    { slug: "deepseek",    name: "deepseek-chat",              display: "DeepSeek Chat",             ctx: 64000,  def: true  },
    { slug: "openrouter",  name: "openrouter/anthropic/claude-3.5-sonnet", display: "Claude 3.5 Sonnet (OR)", ctx: 200000, def: true  },
    { slug: "openrouter",  name: "openrouter/anthropic/claude-3-haiku",   display: "Claude 3 Haiku (OR)",   ctx: 200000, def: false },
    { slug: "groq",        name: "llama-3.3-70b-versatile",    display: "Llama 3.3 70B Versatile",   ctx: 128000, def: true  },
    { slug: "groq",        name: "llama-3.1-8b-instant",       display: "Llama 3.1 8B Instant",       ctx: 128000, def: false },
    { slug: "huggingface",name: "mistralai/Mistral-7B-Instruct-v0.2", display: "Mistral 7B Instruct", ctx: 32000,  def: true  },
  ];

  for (const m of models) {
    const { rows: provRows } = await client.query(
      `SELECT id FROM ai_providers WHERE slug = $1 AND is_deleted = false LIMIT 1`,
      [m.slug]
    );
    const pid = provRows[0]?.id;
    if (!pid) continue;

    await client.query(`
      INSERT INTO ai_provider_models
        (provider_id, model_name, display_name, context_length, is_default)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_id, model_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        context_length = COALESCE(EXCLUDED.context_length, ai_provider_models.context_length),
        is_default = EXCLUDED.is_default
    `, [pid, m.name, m.display, m.ctx, m.def]);
  }
  console.log("  + seed: ai_provider_models (12)");

  // ── Seed publish channels ───────────────────────────────────────────────────
  await client.query(`
    INSERT INTO publish_channels (channel_code, channel_name, icon, is_active) VALUES
      ('facebook', 'Facebook',       'Facebook', true),
      ('website',  'Website/Blog',  'Globe',    true),
      ('zalo',     'Zalo Official', 'MessageCircle', true),
      ('tiktok',   'TikTok',        'Video',   true)
    ON CONFLICT (channel_code) DO NOTHING
  `);
  console.log("  + seed: publish_channels (4)");

  // ── Seed content templates ──────────────────────────────────────────────────
  await client.query(`
    INSERT INTO content_templates
      (template_name, content_type, system_prompt, user_template, variables, tone_options)
    VALUES
      ('Bài viết Facebook - Giới thiệu sản phẩm', 'facebook',
       'Bạn là chuyên gia marketing laptop với 10 năm kinh nghiệm. Viết bài Facebook hấp dẫn, kèm emoji.',
       '{{product_name}}\n\n{{product_highlights}}\n\nGiá: {{price}}\n\n{{cta}}',
       '["product_name","product_highlights","price","cta"]',
       '["chuyên nghiệp","thân thiện","hài hước","nghiêm túc"]'),
      ('Bài viết Website - Đánh giá chi tiết', 'website',
       'Bạn là content writer chuyên nghiệp. Viết bài SEO với cấu trúc rõ ràng.',
       'Tiêu đề SEO: {{seo_title}}\n\nGiới thiệu: {{intro}}\n\nĐặc điểm: {{highlights}}\n\nKết luận: {{conclusion}}',
       '["seo_title","intro","highlights","conclusion"]',
       '["chuyên nghiệp","dễ đọc","chi tiết"]'),
      ('Kịch bản Video ngắn', 'video',
       'Bạn là chuyên gia sản xuất nội dung video TikTok/YouTube Shorts.',
       'Hook (3s): {{hook}}\n\nNội dung chính (30s): {{main_content}}\n\nCTA (5s): {{cta}}',
       '["hook","main_content","cta"]',
       '["năng động","chuyên nghiệp","vui vẻ"]'),
      ('Prompt tạo ảnh sản phẩm', 'image',
       'Bạn là chuyên gia prompt cho AI tạo ảnh. Viết prompt chi tiết.',
       '{{subject}} on {{background}}, {{lighting}} lighting, {{style}} style, product photography, high quality, 4k',
       '["subject","background","lighting","style"]',
       '["minimalist","vibrant","dark moody","bright clean"]')
    ON CONFLICT DO NOTHING
  `);
  console.log("  + seed: content_templates (4)");

  // ── Seed default ai_settings ────────────────────────────────────────────────
  await client.query(`
    INSERT INTO ai_settings (provider_id, base_url, model_name, temperature, max_tokens, is_active)
    SELECT id, base_url, 'gpt-4o-mini', 0.7, 2048, true
    FROM ai_providers WHERE slug = 'openai' AND is_deleted = false LIMIT 1
    ON CONFLICT DO NOTHING
  `);
  console.log("  + seed: ai_settings (default OpenAI)");

  // ── Seed task routes ────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO ai_task_routes
      (task_type, task_label, provider_type, model_name, temperature, priority,
       primary_provider_id, primary_model_override)
    SELECT 'facebook_content',    'Bài viết Facebook',
           'openai', 'gpt-4o-mini', 0.7, 1,
           (SELECT id FROM ai_providers WHERE slug='openai' AND is_deleted=false LIMIT 1),
           'gpt-4o-mini'
    WHERE EXISTS (SELECT 1 FROM ai_providers WHERE slug='openai' AND is_deleted=false)
    ON CONFLICT (task_type) DO UPDATE SET
      task_label = EXCLUDED.task_label,
      provider_type = EXCLUDED.provider_type,
      model_name = EXCLUDED.model_name,
      primary_provider_id = EXCLUDED.primary_provider_id,
      primary_model_override = EXCLUDED.primary_model_override
  `);

  for (const rt of [
    { task_type: "seo_article",        label: "Bài viết SEO Website",   provider: "gemini",    model: "gemini-2.0-flash",     temp: 0.6, pri: 2 },
    { task_type: "video_script",       label: "Kịch bản Video",          provider: "openai",   model: "gpt-4o-mini",          temp: 0.8, pri: 3 },
    { task_type: "image_prompt",       label: "Prompt Hình ảnh",          provider: "gemini",    model: "gemini-2.0-flash",     temp: 0.9, pri: 4 },
    { task_type: "zalo_message",       label: "Tin nhắn Zalo",            provider: "gemini",    model: "gemini-2.0-flash",     temp: 0.5, pri: 5 },
    { task_type: "product_description",label: "Mô tả sản phẩm",          provider: "openai",   model: "gpt-4o-mini",          temp: 0.6, pri: 6 },
    { task_type: "email_marketing",    label: "Email Marketing",           provider: "gemini",    model: "gemini-2.0-flash",     temp: 0.7, pri: 7 },
  ]) {
    await client.query(`
      INSERT INTO ai_task_routes
        (task_type, task_label, provider_type, model_name, temperature, priority,
         primary_provider_id, primary_model_override)
      SELECT $1, $2, $3, $4, $5, $6,
             (SELECT id FROM ai_providers WHERE slug=$3 AND is_deleted=false LIMIT 1),
             $4
      WHERE EXISTS (SELECT 1 FROM ai_providers WHERE slug=$3 AND is_deleted=false)
      ON CONFLICT (task_type) DO UPDATE SET
        task_label = EXCLUDED.task_label,
        provider_type = EXCLUDED.provider_type,
        model_name = EXCLUDED.model_name,
        temperature = EXCLUDED.temperature,
        priority = EXCLUDED.priority,
        primary_provider_id = EXCLUDED.primary_provider_id,
        primary_model_override = EXCLUDED.primary_model_override
    `, [rt.task_type, rt.label, rt.provider, rt.model, rt.temp, rt.pri]);
  }
  console.log("  + seed: ai_task_routes (7)");

  // ── Seed brand voices ───────────────────────────────────────────────────────
  const brandVoices = [
    { preset: "professional",    name: "Chuyên nghiệp",      desc: "Trang trọng, chuyên nghiệp", audience: "Doanh nhân, quản lý, kỹ sư IT", tone_inst: "Giọng văn chuyên nghiệp, trang trọng.", keywords_use: ["chất lượng","bảo hành","tin cậy"], keywords_avoid: ["rẻ","tốt rẻ","free"], prof_cas: 0.8, lux_aff: 0.2, tech_sim: 0.5, emoji: "minimal", cta: "direct" },
    { preset: "gaming",          name: "Gaming",              desc: "Năng động cho game thủ",    audience: "Game thủ, sinh viên, người trẻ", tone_inst: "Giọng văn năng động, hào hứng.", keywords_use: ["mạnh mẽ","chiến game","RGB","144Hz"], keywords_avoid: ["văn phòng","bền"], prof_cas: -0.5, lux_aff: -0.3, tech_sim: 0.3, emoji: "heavy", cta: "urgency" },
    { preset: "student",          name: "Sinh viên",           desc: "Gần gũi, dễ hiểu",         audience: "Học sinh, sinh viên, ngân sách hạn chế", tone_inst: "Giọng văn thân thiện, đơn giản.", keywords_use: ["giá sinh viên","học tập","nhẹ"], keywords_avoid: ["doanh nghiệp","sang trọng"], prof_cas: -0.6, lux_aff: -0.8, tech_sim: -0.4, emoji: "moderate", cta: "friendly" },
    { preset: "business",         name: "Doanh nhân",          desc: "Sang trọng, uy tín",         audience: "Doanh nhân, CEO, giám đốc", tone_inst: "Giọng văn sang trọng, uy tín.", keywords_use: ["đẳng cấp","sang trọng","bảo mật"], keywords_avoid: ["rẻ","sinh viên"], prof_cas: 0.9, lux_aff: 0.8, tech_sim: 0.6, emoji: "none", cta: "direct" },
    { preset: "apple_premium",    name: "Apple Premium",       desc: "Tinh tế, đẳng cấp",         audience: "Người yêu Apple", tone_inst: "Giọng văn tinh tế, đẳng cấp.", keywords_use: ["Apple","ecosystem","tinh tế"], keywords_avoid: ["Windows","rẻ tiền"], prof_cas: 0.7, lux_aff: 0.9, tech_sim: 0.4, emoji: "minimal", cta: "soft" },
    { preset: "budget_friendly",  name: "Giá rẻ dễ tiếp cận", desc: "Tập trung vào giá trị",     audience: "Người có ngân sách hạn chế", tone_inst: "Giọng văn đơn giản, thực tế.", keywords_use: ["giá tốt","tiết kiệm","bền"], keywords_avoid: ["cao cấp","premium"], prof_cas: -0.3, lux_aff: -0.9, tech_sim: -0.2, emoji: "moderate", cta: "friendly" },
  ];

  for (const bv of brandVoices) {
    await client.query(`
      INSERT INTO ai_brand_voices
        (preset, name, description, target_audience, tone_instruction,
         keywords_to_use, keywords_to_avoid, tone_professional_casual,
         tone_luxury_affordable, tone_technical_simple, emoji_usage, cta_style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (preset) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        target_audience = EXCLUDED.target_audience,
        tone_instruction = EXCLUDED.tone_instruction,
        keywords_to_use = EXCLUDED.keywords_to_use,
        keywords_to_avoid = EXCLUDED.keywords_to_avoid,
        emoji_usage = EXCLUDED.emoji_usage,
        cta_style = EXCLUDED.cta_style
    `, [bv.preset, bv.name, bv.desc, bv.audience, bv.tone_inst,
        bv.keywords_use, bv.keywords_avoid, bv.prof_cas, bv.lux_aff, bv.tech_sim,
        bv.emoji, bv.cta]);
  }
  console.log("  + seed: ai_brand_voices (6)");

  // ── Seed system prompt templates ───────────────────────────────────────────
  for (const sp of [
    { name: "Mặc định tiếng Việt", desc: "Luôn trả lời bằng tiếng Việt.", prompt: "Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.", is_def: true },
    { name: "Marketing Laptop Mỹ Tho", desc: "System prompt cho marketing laptop tại Mỹ Tho", prompt: "Bạn là chuyên gia marketing laptop tại Mỹ Tho, Tiền Giang. Luôn trả lời bằng tiếng Việt. Viết nội dung hấp dẫn, phù hợp với khách hàng địa phương. Nhắc nhở khách hàng có thể đến cửa hàng Mỹ Tho Laptop để trải nghiệm trực tiếp.", is_def: false },
    { name: "Kỹ thuật chi tiết", desc: "Trả lời chi tiết về thông số kỹ thuật", prompt: "Bạn là chuyên gia kỹ thuật laptop. Luôn trả lời bằng tiếng Việt. Cung cấp thông số kỹ thuật chi tiết, so sánh khách quan. Giải thích rõ ràng các thuật ngữ công nghệ.", is_def: false },
  ]) {
    await client.query(`
      INSERT INTO ai_system_prompt_templates (name, description, prompt_text, is_default)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [sp.name, sp.desc, sp.prompt, sp.is_def]);
  }
  console.log("  + seed: ai_system_prompt_templates (3)");

  // ── Seed prompt rules ───────────────────────────────────────────────────────
  const globalRules = [
    { key: "has_cta",         text: "Mỗi bài viết phải có Call-to-Action (CTA) rõ ràng ở cuối.",         pri: 10 },
    { key: "no_spam",         text: "Không spam emoji liên tiếp. Tối đa 3 emoji mỗi đoạn.",               pri: 5  },
    { key: "product_focus",   text: "Nội dung phải tập trung vào lợi ích sản phẩm, không quảng cáo thuần túy.", pri: 8 },
    { key: "local_context",   text: "Nhắc nhở khách hàng đến từ Tiền Giang và khu vực lân cận.",           pri: 3  },
    { key: "price_transparent", text: "Không đưa ra giá cụ thể nếu chưa xác nhận với đội ngũ bán hàng.",  pri: 9  },
  ];
  for (const r of globalRules) {
    await client.query(`
      INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
      VALUES ('global', NULL, $1, $2, $3, true)
      ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
        rule_text = EXCLUDED.rule_text,
        priority = EXCLUDED.priority
    `, [r.key, r.text, r.pri]);
  }

  const platformRules = [
    { platform: "facebook", key: "hook_3lines",    text: "3 dòng đầu phải gây tò mò, hook mạnh. Có emoji." },
    { platform: "facebook", key: "length",           text: "Độ dài 150-300 từ. Ngắn gọn, dễ đọc trên mobile." },
    { platform: "website",  key: "seo_heading",      text: "Sử dụng heading H2/H3. Từ khóa tự nhiên." },
    { platform: "website",  key: "meta_desc",         text: "Tạo meta description 150-160 ký tự, chứa từ khóa chính." },
    { platform: "video",    key: "hook_3s",          text: "Hook 3 giây đầu phải gây shock hoặc tò mò cực mạnh." },
    { platform: "video",    key: "tempo",             text: "Nhịp độ nhanh, mỗi phần không quá 10 giây." },
    { platform: "image",   key: "composition",        text: "Mô tả rõ chủ thể, bối cảnh, ánh sáng, phong cách." },
    { platform: "zalo",   key: "short",             text: "Tin nhắn ngắn, không quá 160 ký tự. Có emoji phù hợp." },
  ];
  for (const r of platformRules) {
    await client.query(`
      INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
      VALUES ('platform', $1, $2, $3, 5, true)
      ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
        rule_text = EXCLUDED.rule_text
    `, [r.platform, r.key, r.text]);
  }
  console.log("  + seed: ai_prompt_rules (13)");

  // ── Seed safety rules ───────────────────────────────────────────────────────
  const safetyRules = [
    { key: "no_sensitive",      text: "Không viết nội dung nhạy cảm về chính trị, tôn giáo, sắc tộc", severity: "high" },
    { key: "no_false_claim",    text: "Không đưa ra claim vượt quá khả năng sản phẩm",                  severity: "medium" },
    { key: "no_competitor",     text: "Không nhắc đến đối thủ cạnh tranh trực tiếp",                   severity: "low" },
    { key: "no_spam_emoji",    text: "Không spam emoji hoặc ký tự đặc biệt liên tục",                 severity: "low" },
    { key: "no_pricing_claim", text: "Không đưa ra cam kết giá cụ thể nếu chưa xác nhận",             severity: "medium" },
    { key: "appropriate_age",   text: "Nội dung phải phù hợp với mọi lứa tuổi",                       severity: "medium" },
  ];
  for (const r of safetyRules) {
    await client.query(`
      INSERT INTO ai_safety_rules (rule_key, rule_text, severity)
      VALUES ($1, $2, $3)
      ON CONFLICT (rule_key) DO UPDATE SET
        rule_text = EXCLUDED.rule_text,
        severity = EXCLUDED.severity
    `, [r.key, r.text, r.severity]);
  }
  console.log("  + seed: ai_safety_rules (6)");

  // ── Seed media settings ─────────────────────────────────────────────────────
  for (const m of [
    { media_type: "image", provider: "openai_dall_e", model_name: "dall-e-3",  temp: 0.9, quality: "standard", size: "1024x1024" },
    { media_type: "video", provider: "openai_sora",     model_name: "sora-1",    temp: 0.8, quality: "720p",     size: "1280x720"  },
    { media_type: "audio", provider: "openai_tts",      model_name: "tts-1",     temp: 0.9, quality: "mp3_24k",  size: "normal"     },
  ]) {
    await client.query(`
      INSERT INTO ai_media_settings (media_type, provider, model_name, temperature, quality, size, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      ON CONFLICT (media_type) DO NOTHING
    `, [m.media_type, m.provider, m.model_name, m.temp, m.quality, m.size]);
  }
  console.log("  + seed: ai_media_settings (3)");
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  const client = await pool.connect();
  console.log("=".repeat(60));
  console.log(" MIGRATION MASTER — All-in-One");
  console.log("=".repeat(60));
  console.log("Database:", DATABASE_URL.split("@")[1] ?? DATABASE_URL);

  try {
    await client.query("BEGIN");

    await phase1_contentModule(client);
    await phase2_aiocCore(client);
    await phase3_providerMgmt(client);
    await phase4_routingFK(client);
    await phase5_migrationState(client);
    await phase6_addon(client);
    await phase7_appSettings(client);
    await phase8_seed(client);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[MIGRATION] Thất bại:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\n" + "=".repeat(60));
  console.log(" MIGRATION MASTER — HOÀN TẤT!");
  console.log("=".repeat(60));
  console.log("");
  console.log("Tổng kết bảng đã tạo:");
  console.log("  Content Module:  9 bảng + 11 indexes");
  console.log("  AIOC Core:      6 bảng + 5 indexes");
  console.log("  Provider Mgmt:   3 bảng + 7 indexes  + nâng cấp ai_providers");
  console.log("  Routing FK:      0 bảng + 2 indexes  + ALTER ai_task_routes");
  console.log("  Migration State: 4 bảng + 9 indexes  + triggers");
  console.log("  Addon:           1 bảng");
  console.log("  App Settings:    1 bảng + 1 index + seed defaults");
  console.log("  Seed:            providers, models, channels, templates,");
  console.log("                   brand voices, routing, prompts, safety rules");
  console.log("");
  console.log("Tiếp theo: rebuild admin-ui Docker image để fix lỗi TypeScript.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
