-- ============================================================
-- MIGRATION MASTER SQL
-- All-in-One: Tạo tất cả 22 bảng + indexes + seed data
-- ============================================================
-- Chạy: docker exec -i mtl-postgres psql -U postgres -d mytholaptop < sql/migration-master.sql
-- Hoặc: docker exec mtl-postgres psql -U postgres -d mytholaptop -c "..."
-- ============================================================

BEGIN;

-- ============================================================
-- PHASE 1: Content Module (9 tables)
-- ============================================================

-- 1. ai_providers
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
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON ai_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_providers_sort_order ON ai_providers(sort_order);

-- 2. ai_settings
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
);

-- 3. content_templates
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
);

-- 4. content_items
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
);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_product ON content_items(product_id);
CREATE INDEX IF NOT EXISTS idx_content_items_created ON content_items(created_at DESC);

-- 5. content_generation_logs
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
);
CREATE INDEX IF NOT EXISTS idx_content_generation_logs_content ON content_generation_logs(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_generation_logs_provider ON content_generation_logs(provider);
CREATE INDEX IF NOT EXISTS idx_content_generation_logs_created ON content_generation_logs(created_at DESC);

-- 6. content_schedules
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
);
CREATE INDEX IF NOT EXISTS idx_content_schedules_publish ON content_schedules(publish_at);
CREATE INDEX IF NOT EXISTS idx_content_schedules_status ON content_schedules(status);

-- 7. media_prompts
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
);
CREATE INDEX IF NOT EXISTS idx_media_prompts_content ON media_prompts(content_item_id);

-- 8. publish_channels
CREATE TABLE IF NOT EXISTS publish_channels (
  id              SERIAL PRIMARY KEY,
  channel_code    VARCHAR(50) NOT NULL UNIQUE,
  channel_name    VARCHAR(200) NOT NULL,
  icon            VARCHAR(50),
  config          JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. publish_jobs
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
);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_schedule ON publish_jobs(schedule_id);

-- ============================================================
-- PHASE 2: AIOC Core (6 tables)
-- ============================================================

-- 10. ai_task_routes
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
);
CREATE INDEX IF NOT EXISTS idx_task_routes_task_type ON ai_task_routes(task_type);
CREATE INDEX IF NOT EXISTS idx_task_routes_provider ON ai_task_routes(provider_type);

-- 11. ai_brand_voices
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
);
CREATE INDEX IF NOT EXISTS idx_brand_voices_active ON ai_brand_voices(is_active);

-- 12. ai_prompt_rules
CREATE TABLE IF NOT EXISTS ai_prompt_rules (
  id              SERIAL PRIMARY KEY,
  scope           VARCHAR(20) NOT NULL DEFAULT 'global',
  platform        VARCHAR(30),
  rule_key        VARCHAR(100) NOT NULL,
  rule_text       TEXT NOT NULL,
  priority        INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prompt_rules_scope ON ai_prompt_rules(scope);
CREATE INDEX IF NOT EXISTS idx_prompt_rules_platform ON ai_prompt_rules(platform);

-- 13. ai_safety_rules
CREATE TABLE IF NOT EXISTS ai_safety_rules (
  id                    SERIAL PRIMARY KEY,
  rule_key              VARCHAR(100) NOT NULL UNIQUE,
  rule_text             TEXT NOT NULL,
  severity              VARCHAR(20) DEFAULT 'medium',
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ai_system_prompt_templates
CREATE TABLE IF NOT EXISTS ai_system_prompt_templates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 15. ai_media_settings
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
);

-- ============================================================
-- PHASE 3: Provider Management (3 tables + enhance ai_providers)
-- ============================================================

-- 16. ai_provider_groups
CREATE TABLE IF NOT EXISTS ai_provider_groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50) NOT NULL UNIQUE,
  icon        VARCHAR(50) DEFAULT 'Cpu',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ai_provider_models
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
);
CREATE INDEX IF NOT EXISTS idx_provider_models_provider ON ai_provider_models(provider_id);

-- 18. ai_provider_runtime_configs
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
);
CREATE INDEX IF NOT EXISTS idx_provider_configs_provider ON ai_provider_runtime_configs(provider_id);

-- Enhance ai_providers
DO $$
BEGIN
  -- Add is_deleted (for soft delete)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='is_deleted') THEN
    ALTER TABLE ai_providers ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Add deleted_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='deleted_at') THEN
    ALTER TABLE ai_providers ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  -- Add slug
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='slug') THEN
    ALTER TABLE ai_providers ADD COLUMN slug VARCHAR(50);
    UPDATE ai_providers SET slug = 'provider_' || id::text WHERE slug IS NULL;
    ALTER TABLE ai_providers ALTER COLUMN slug SET NOT NULL;
    -- Drop old provider unique constraint if exists
    ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_provider_key;
    CREATE UNIQUE INDEX ai_providers_slug_unique ON ai_providers(slug) WHERE slug IS NOT NULL;
  END IF;
  -- Add name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='name') THEN
    ALTER TABLE ai_providers ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '';
  END IF;
  -- Add type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='type') THEN
    ALTER TABLE ai_providers ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT '';
  END IF;
  -- Add group_slug
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='group_slug') THEN
    ALTER TABLE ai_providers ADD COLUMN group_slug VARCHAR(50) DEFAULT 'cloud_api';
  END IF;
  -- Add status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='status') THEN
    ALTER TABLE ai_providers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;
  -- Add is_system
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='is_system') THEN
    ALTER TABLE ai_providers ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;
  -- Add is_default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='is_default') THEN
    ALTER TABLE ai_providers ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
  -- Add connection_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='connection_status') THEN
    ALTER TABLE ai_providers ADD COLUMN connection_status VARCHAR(20) DEFAULT 'unknown';
  END IF;
  -- Add last_checked_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='last_checked_at') THEN
    ALTER TABLE ai_providers ADD COLUMN last_checked_at TIMESTAMPTZ;
  END IF;
  -- Add last_error
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='last_error') THEN
    ALTER TABLE ai_providers ADD COLUMN last_error TEXT;
  END IF;
  -- Add custom_headers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='custom_headers') THEN
    ALTER TABLE ai_providers ADD COLUMN custom_headers JSONB DEFAULT '{}';
  END IF;
  -- Add model_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='model_name') THEN
    ALTER TABLE ai_providers ADD COLUMN model_name VARCHAR(200);
  END IF;
  -- Add streaming_enabled
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='streaming_enabled') THEN
    ALTER TABLE ai_providers ADD COLUMN streaming_enabled BOOLEAN DEFAULT false;
  END IF;
  -- Add timeout_ms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='timeout_ms') THEN
    ALTER TABLE ai_providers ADD COLUMN timeout_ms INTEGER DEFAULT 60000;
  END IF;
  -- Add retry_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_providers' AND column_name='retry_count') THEN
    ALTER TABLE ai_providers ADD COLUMN retry_count INTEGER DEFAULT 3;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Error enhancing ai_providers: %', SQLERRM;
END $$;

-- Backfill name from display_name where name is empty
UPDATE ai_providers SET name = COALESCE(NULLIF(name, ''), display_name)
WHERE name IS NULL OR name = '';

-- Backfill type from slug where type is empty
UPDATE ai_providers SET type = COALESCE(NULLIF(type, ''), slug)
WHERE type IS NULL OR type = '';

-- Backfill slug from provider where slug is empty
UPDATE ai_providers SET slug = COALESCE(slug, 'provider_' || id::text)
WHERE slug IS NULL OR slug = '';

-- Backfill display_name from name where display_name is empty
UPDATE ai_providers SET display_name = COALESCE(NULLIF(display_name, ''), name)
WHERE display_name IS NULL OR display_name = '';

-- Add provider indexes
CREATE INDEX IF NOT EXISTS idx_providers_status ON ai_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_is_default ON ai_providers(is_default);
CREATE INDEX IF NOT EXISTS idx_providers_group_slug ON ai_providers(group_slug);

-- ============================================================
-- PHASE 4: Routing FK + Override columns
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='primary_provider_id') THEN
    ALTER TABLE ai_task_routes ADD COLUMN primary_provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='primary_model_override') THEN
    ALTER TABLE ai_task_routes ADD COLUMN primary_model_override TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='fallback_provider_id') THEN
    ALTER TABLE ai_task_routes ADD COLUMN fallback_provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='fallback_model_override') THEN
    ALTER TABLE ai_task_routes ADD COLUMN fallback_model_override TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='temperature_override') THEN
    ALTER TABLE ai_task_routes ADD COLUMN temperature_override NUMERIC(3,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='max_tokens_override') THEN
    ALTER TABLE ai_task_routes ADD COLUMN max_tokens_override INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_task_routes' AND column_name='top_p_override') THEN
    ALTER TABLE ai_task_routes ADD COLUMN top_p_override NUMERIC(3,2);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Error enhancing ai_task_routes: %', SQLERRM;
END $$;

-- Migrate existing routing data
UPDATE ai_task_routes AS r
SET primary_provider_id = p.id,
    primary_model_override = r.model_name
FROM ai_providers p
WHERE r.provider_type = p.slug
  AND r.primary_provider_id IS NULL
  AND r.model_name IS NOT NULL
  AND r.model_name != '';

CREATE INDEX IF NOT EXISTS ai_task_routes_primary_provider_id_idx ON ai_task_routes(primary_provider_id) WHERE primary_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ai_task_routes_fallback_provider_id_idx ON ai_task_routes(fallback_provider_id) WHERE fallback_provider_id IS NOT NULL;

-- ============================================================
-- PHASE 5: Migration State Tables (4 tables)
-- ============================================================

-- 19. migration_runs
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
);
CREATE INDEX IF NOT EXISTS idx_migration_runs_status ON migration_runs(status);
CREATE INDEX IF NOT EXISTS idx_migration_runs_created_at ON migration_runs(created_at);

-- 20. migration_items
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
);
CREATE INDEX IF NOT EXISTS idx_migration_items_run_id ON migration_items(run_id);
CREATE INDEX IF NOT EXISTS idx_migration_items_status ON migration_items(status);
CREATE INDEX IF NOT EXISTS idx_migration_items_source_id ON migration_items(source_id);
CREATE INDEX IF NOT EXISTS idx_migration_items_target_id ON migration_items(target_id);

-- 21. migration_mappings
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
);
CREATE INDEX IF NOT EXISTS idx_migration_mappings_source ON migration_mappings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_migration_mappings_target ON migration_mappings(target_type, target_id);

-- 22. migration_logs
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
);
CREATE INDEX IF NOT EXISTS idx_migration_logs_run_id ON migration_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$
LANGUAGE plpgsql;

-- Apply triggers
DO $$ BEGIN
  CREATE TRIGGER update_migration_runs_updated_at BEFORE UPDATE ON migration_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_migration_items_updated_at BEFORE UPDATE ON migration_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_migration_mappings_updated_at BEFORE UPDATE ON migration_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PHASE 6: Addon — ai_routing_rules + ai_prompt_rules constraint
-- ============================================================

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
);

-- Add ai_prompt_rules unique constraint (coalesce NULL platform) using unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ai_prompt_rules_scope_platform_rule_key_unique'
  ) THEN
    CREATE UNIQUE INDEX ai_prompt_rules_scope_platform_rule_key_unique
      ON ai_prompt_rules (scope, (COALESCE(platform, '')), rule_key);
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Constraint may already exist: %', SQLERRM; END $$;

-- ============================================================
-- PHASE 7: Seed Data
-- ============================================================

-- Seed provider groups
INSERT INTO ai_provider_groups (name, slug, icon, sort_order) VALUES
  ('Cloud APIs',            'cloud_api',          'Cloud', 1),
  ('AI Aggregator',        'ai_aggregator',      'Layers', 2),
  ('Local LLM',            'local_llm',          'Cpu', 3),
  ('Inference Platform',   'inference_platform', 'Layers', 4)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- Seed providers
INSERT INTO ai_providers
  (name, slug, group_slug, type, base_url, status, is_system, is_default, display_name, connection_status, provider, model_name, streaming_enabled, timeout_ms, retry_count)
VALUES
  ('OpenAI',         'openai',           'cloud_api',        'openai',           'https://api.openai.com/v1',                          'active', true,  true,  'OpenAI',          'unknown', 'openai',           'gpt-4o-mini',                                            false, 60000, 3),
  ('Google Gemini',  'gemini',           'cloud_api',        'gemini',           'https://generativelanguage.googleapis.com/v1beta/models', 'active', true, false, 'Google Gemini',   'unknown', 'gemini',           'gemini-2.0-flash',                                        false, 60000, 3),
  ('DeepSeek Cloud', 'deepseek',         'cloud_api',        'deepseek',         'https://api.deepseek.com/v1',                        'active', true, false, 'DeepSeek Cloud',  'unknown', 'deepseek',         'deepseek-chat',                                            false, 60000, 3),
  ('OpenRouter',     'openrouter',       'ai_aggregator',   'openrouter',       'https://openrouter.ai/api/v1',                       'active', true, false, 'OpenRouter',      'unknown', 'openrouter',       'openrouter/anthropic/claude-3.5-sonnet',                  true,  90000, 3),
  ('Groq',           'groq',             'ai_aggregator',   'groq',             'https://api.groq.com/openai/v1',                    'active', true, false, 'Groq',            'unknown', 'groq',             'llama-3.3-70b-versatile',                                true,  60000, 3),
  ('Ollama',         'ollama',           'local_llm',       'ollama',           'http://localhost:11434',                             'active', true, false, 'Ollama',          'unknown', 'ollama',           'llama3.2',                                                false, 120000, 2),
  ('LM Studio',      'lmstudio',         'local_llm',       'lmstudio',         'http://localhost:1234/v1',                           'active', true, false, 'LM Studio',       'unknown', 'lmstudio',         '',                                                         false, 120000, 2),
  ('OpenAI-Compatible','openai_compatible','local_llm',      'openai_compatible','http://localhost:8000/v1',                           'active', true, false, 'OpenAI-Compatible','unknown','openai_compatible', '',                                                         false, 120000, 2),
  ('HuggingFace',   'huggingface',      'inference_platform','huggingface',      'https://api-inference.huggingface.co/models',        'active', true, false, 'HuggingFace',    'unknown', 'huggingface',      'mistralai/Mistral-7B-Instruct-v0.2',                     false, 60000, 3)
ON CONFLICT DO NOTHING;

-- Seed runtime configs
INSERT INTO ai_provider_runtime_configs
  (provider_id, selected_model, temperature, max_output_tokens, top_p, frequency_penalty, presence_penalty, timeout_ms, retry_count, streaming_enabled)
SELECT id, model_name, 0.7, 2048, 1.0, 0.0, 0.0, timeout_ms, retry_count, streaming_enabled
FROM ai_providers WHERE is_deleted = false AND slug IN (
  'openai','gemini','deepseek','openrouter','groq','ollama','lmstudio','openai_compatible','huggingface'
)
ON CONFLICT (provider_id) DO UPDATE SET
  selected_model = EXCLUDED.selected_model,
  timeout_ms = EXCLUDED.timeout_ms,
  retry_count = EXCLUDED.retry_count,
  streaming_enabled = EXCLUDED.streaming_enabled,
  updated_at = NOW();

-- Seed models
INSERT INTO ai_provider_models (provider_id, model_name, display_name, context_length, is_default) VALUES
  ((SELECT id FROM ai_providers WHERE slug='openai'),        'gpt-4o',                                      'GPT-4o',                   128000, false),
  ((SELECT id FROM ai_providers WHERE slug='openai'),        'gpt-4o-mini',                                  'GPT-4o Mini',               128000, true),
  ((SELECT id FROM ai_providers WHERE slug='openai'),        'gpt-4-turbo',                                  'GPT-4 Turbo',               128000, false),
  ((SELECT id FROM ai_providers WHERE slug='gemini'),        'gemini-2.0-flash',                             'Gemini 2.0 Flash',         1000000, true),
  ((SELECT id FROM ai_providers WHERE slug='gemini'),        'gemini-1.5-flash',                             'Gemini 1.5 Flash',         1000000, false),
  ((SELECT id FROM ai_providers WHERE slug='gemini'),        'gemini-1.5-pro',                               'Gemini 1.5 Pro',           2000000, false),
  ((SELECT id FROM ai_providers WHERE slug='deepseek'),      'deepseek-chat',                                'DeepSeek Chat',              64000, true),
  ((SELECT id FROM ai_providers WHERE slug='openrouter'),    'openrouter/anthropic/claude-3.5-sonnet',       'Claude 3.5 Sonnet (OR)',    200000, true),
  ((SELECT id FROM ai_providers WHERE slug='openrouter'),    'openrouter/anthropic/claude-3-haiku',           'Claude 3 Haiku (OR)',       200000, false),
  ((SELECT id FROM ai_providers WHERE slug='groq'),          'llama-3.3-70b-versatile',                      'Llama 3.3 70B Versatile',  128000, true),
  ((SELECT id FROM ai_providers WHERE slug='groq'),          'llama-3.1-8b-instant',                          'Llama 3.1 8B Instant',     128000, false),
  ((SELECT id FROM ai_providers WHERE slug='huggingface'),   'mistralai/Mistral-7B-Instruct-v0.2',            'Mistral 7B Instruct',       32000, true)
ON CONFLICT (provider_id, model_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  context_length = COALESCE(EXCLUDED.context_length, ai_provider_models.context_length),
  is_default = EXCLUDED.is_default;

-- Seed publish channels
INSERT INTO publish_channels (channel_code, channel_name, icon, is_active) VALUES
  ('facebook', 'Facebook',       'Facebook',       true),
  ('website',  'Website/Blog',  'Globe',          true),
  ('zalo',     'Zalo Official', 'MessageCircle',   true),
  ('tiktok',   'TikTok',        'Video',          true)
ON CONFLICT (channel_code) DO NOTHING;

-- Seed content templates
INSERT INTO content_templates (template_name, content_type, system_prompt, user_template, variables, tone_options) VALUES
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
ON CONFLICT DO NOTHING;

-- Seed ai_settings (default OpenAI)
INSERT INTO ai_settings (provider_id, base_url, model_name, temperature, max_tokens, is_active)
SELECT id, base_url, 'gpt-4o-mini', 0.7, 2048, true
FROM ai_providers WHERE slug = 'openai' AND is_deleted = false LIMIT 1
ON CONFLICT DO NOTHING;

-- Seed task routes (with FK)
INSERT INTO ai_task_routes
  (task_type, task_label, provider_type, model_name, temperature, priority, primary_provider_id, primary_model_override)
SELECT 'facebook_content',     'Bài viết Facebook',    'openai', 'gpt-4o-mini',          0.7, 1, id, 'gpt-4o-mini'
FROM ai_providers WHERE slug = 'openai' AND is_deleted = false LIMIT 1
ON CONFLICT (task_type) DO UPDATE SET
  task_label = EXCLUDED.task_label, provider_type = EXCLUDED.provider_type,
  model_name = EXCLUDED.model_name, primary_provider_id = EXCLUDED.primary_provider_id,
  primary_model_override = EXCLUDED.primary_model_override;

DO $$
DECLARE
  gemini_id INTEGER;
BEGIN
  SELECT id INTO gemini_id FROM ai_providers WHERE slug = 'gemini' AND is_deleted = false LIMIT 1;

  INSERT INTO ai_task_routes
    (task_type, task_label, provider_type, model_name, temperature, priority, primary_provider_id, primary_model_override)
  VALUES
    ('seo_article',         'Bài viết SEO Website',  'gemini', 'gemini-2.0-flash', 0.6, 2, gemini_id, 'gemini-2.0-flash'),
    ('image_prompt',       'Prompt Hình ảnh',       'gemini', 'gemini-2.0-flash', 0.9, 4, gemini_id, 'gemini-2.0-flash'),
    ('zalo_message',       'Tin nhắn Zalo',         'gemini', 'gemini-2.0-flash', 0.5, 5, gemini_id, 'gemini-2.0-flash'),
    ('email_marketing',    'Email Marketing',         'gemini', 'gemini-2.0-flash', 0.7, 7, gemini_id, 'gemini-2.0-flash')
  ON CONFLICT (task_type) DO UPDATE SET
    task_label = EXCLUDED.task_label, provider_type = EXCLUDED.provider_type,
    model_name = EXCLUDED.model_name, temperature = EXCLUDED.temperature,
    primary_provider_id = EXCLUDED.primary_provider_id,
    primary_model_override = EXCLUDED.primary_model_override;
END $$;

DO $$
DECLARE
  openai_id INTEGER;
BEGIN
  SELECT id INTO openai_id FROM ai_providers WHERE slug = 'openai' AND is_deleted = false LIMIT 1;

  INSERT INTO ai_task_routes
    (task_type, task_label, provider_type, model_name, temperature, priority, primary_provider_id, primary_model_override)
  VALUES
    ('video_script',       'Kịch bản Video',        'openai', 'gpt-4o-mini', 0.8, 3, openai_id, 'gpt-4o-mini'),
    ('product_description','Mô tả sản phẩm',         'openai', 'gpt-4o-mini', 0.6, 6, openai_id, 'gpt-4o-mini')
  ON CONFLICT (task_type) DO UPDATE SET
    task_label = EXCLUDED.task_label, provider_type = EXCLUDED.provider_type,
    model_name = EXCLUDED.model_name, temperature = EXCLUDED.temperature,
    primary_provider_id = EXCLUDED.primary_provider_id,
    primary_model_override = EXCLUDED.primary_model_override;
END $$;

-- Seed brand voices
INSERT INTO ai_brand_voices
  (preset, name, description, target_audience, tone_instruction, keywords_to_use, keywords_to_avoid,
   tone_professional_casual, tone_luxury_affordable, tone_technical_simple, emoji_usage, cta_style)
VALUES
  ('professional',    'Chuyên nghiệp',      'Trang trọng, chuyên nghiệp',         'Doanh nhân, quản lý, kỹ sư IT',
   'Giọng văn chuyên nghiệp, trang trọng, dùng thuật ngữ kỹ thuật chính xác.',
   ARRAY['chất lượng','bảo hành','tin cậy','hiệu suất','đáng giá'], ARRAY['rẻ','tốt rẻ','free','siêu rẻ'],
   0.8, 0.2, 0.5, 'minimal', 'direct'),
  ('gaming',          'Gaming',              'Năng động cho game thủ',             'Game thủ, sinh viên, người trẻ',
   'Giọng văn năng động, hào hứng, truyền cảm hứng.',
   ARRAY['mạnh mẽ','chiến game','RGB','144Hz','RTX'], ARRAY['văn phòng','bền','tiết kiệm pin'],
   -0.5, -0.3, 0.3, 'heavy', 'urgency'),
  ('student',         'Sinh viên',           'Gần gũi, dễ hiểu',                  'Học sinh, sinh viên, ngân sách hạn chế',
   'Giọng văn thân thiện, gần gũi, đơn giản.',
   ARRAY['giá sinh viên','học tập','nhẹ','pin trâu'], ARRAY['doanh nghiệp','sang trọng'],
   -0.6, -0.8, -0.4, 'moderate', 'friendly'),
  ('business',        'Doanh nhân',           'Sang trọng, uy tín',                  'Doanh nhân, CEO, giám đốc',
   'Giọng văn sang trọng, uy tín, đẳng cấp.',
   ARRAY['đẳng cấp','sang trọng','bảo mật'], ARRAY['rẻ','sinh viên'],
   0.9, 0.8, 0.6, 'none', 'direct'),
  ('apple_premium',   'Apple Premium',        'Tinh tế, đẳng cấp',                  'Người yêu Apple',
   'Giọng văn tinh tế, đẳng cấp.',
   ARRAY['Apple','ecosystem','tinh tế'], ARRAY['Windows','rẻ tiền'],
   0.7, 0.9, 0.4, 'minimal', 'soft'),
  ('budget_friendly', 'Giá rẻ dễ tiếp cận', 'Tập trung vào giá trị',               'Người có ngân sách hạn chế',
   'Giọng văn đơn giản, thực tế.',
   ARRAY['giá tốt','tiết kiệm','bền'], ARRAY['cao cấp','premium'],
   -0.3, -0.9, -0.2, 'moderate', 'friendly')
ON CONFLICT (preset) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  target_audience = EXCLUDED.target_audience,
  tone_instruction = EXCLUDED.tone_instruction,
  keywords_to_use = EXCLUDED.keywords_to_use,
  keywords_to_avoid = EXCLUDED.keywords_to_avoid,
  emoji_usage = EXCLUDED.emoji_usage, cta_style = EXCLUDED.cta_style;

-- Seed system prompt templates
-- Seed system prompt templates (no unique constraint on name, so use DO block)
DO $$
BEGIN
  INSERT INTO ai_system_prompt_templates (name, description, prompt_text, is_default) VALUES
    ('Mặc định tiếng Việt', 'Luôn trả lời bằng tiếng Việt.',
     'Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.',
     true),
    ('Marketing Laptop Mỹ Tho', 'System prompt cho marketing laptop tại Mỹ Tho',
     'Bạn là chuyên gia marketing laptop tại Mỹ Tho, Tiền Giang. Luôn trả lời bằng tiếng Việt. Viết nội dung hấp dẫn, phù hợp với khách hàng địa phương. Nhắc nhở khách hàng có thể đến cửa hàng Mỹ Tho Laptop để trải nghiệm trực tiếp.',
     false),
    ('Kỹ thuật chi tiết', 'Trả lời chi tiết về thông số kỹ thuật',
     'Bạn là chuyên gia kỹ thuật laptop. Luôn trả lời bằng tiếng Việt. Cung cấp thông số kỹ thuật chi tiết, so sánh khách quan. Giải thích rõ ràng các thuật ngữ công nghệ.',
     false);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Seed system prompts skipped: %', SQLERRM;
END $$;

-- Seed global prompt rules
INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active) VALUES
  ('global', NULL, 'has_cta',          'Mỗi bài viết phải có Call-to-Action (CTA) rõ ràng ở cuối.', 10, true),
  ('global', NULL, 'no_spam',          'Không spam emoji liên tiếp. Tối đa 3 emoji mỗi đoạn.', 5, true),
  ('global', NULL, 'product_focus',    'Nội dung phải tập trung vào lợi ích sản phẩm, không quảng cáo thuần túy.', 8, true),
  ('global', NULL, 'local_context',    'Nhắc nhở khách hàng đến từ Tiền Giang và khu vực lân cận.', 3, true),
  ('global', NULL, 'price_transparent','Không đưa ra giá cụ thể nếu chưa xác nhận với đội ngũ bán hàng.', 9, true)
ON CONFLICT DO NOTHING;

-- Seed platform prompt rules
INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active) VALUES
  ('platform', 'facebook', 'hook_3lines',  '3 dòng đầu phải gây tò mò, hook mạnh. Có emoji hoặc icon.', 5, true),
  ('platform', 'facebook', 'length',         'Độ dài 150-300 từ. Ngắn gọn, dễ đọc trên mobile.', 5, true),
  ('platform', 'website',  'seo_heading',   'Sử dụng heading H2/H3. Từ khóa tự nhiên, không nhồi nhét.', 5, true),
  ('platform', 'website',  'meta_desc',      'Tạo meta description 150-160 ký tự, chứa từ khóa chính.', 5, true),
  ('platform', 'video',    'hook_3s',       'Hook 3 giây đầu phải gây shock hoặc tò mò cực mạnh.', 5, true),
  ('platform', 'video',    'tempo',          'Nhịp độ nhanh, mỗi phần không quá 10 giây. Có text overlay.', 5, true),
  ('platform', 'image',   'composition',     'Mô tả rõ chủ thể, bối cảnh, ánh sáng, phong cách, màu sắc.', 5, true),
  ('platform', 'zalo',    'short',          'Tin nhắn ngắn, không quá 160 ký tự. Có emoji phù hợp.', 5, true)
ON CONFLICT DO NOTHING;

-- Seed safety rules
INSERT INTO ai_safety_rules (rule_key, rule_text, severity) VALUES
  ('no_sensitive',      'Không viết nội dung nhạy cảm về chính trị, tôn giáo, sắc tộc', 'high'),
  ('no_false_claim',   'Không đưa ra claim vượt quá khả năng sản phẩm', 'medium'),
  ('no_competitor',    'Không nhắc đến đối thủ cạnh tranh trực tiếp', 'low'),
  ('no_spam_emoji',   'Không spam emoji hoặc ký tự đặc biệt liên tục', 'low'),
  ('no_pricing_claim', 'Không đưa ra cam kết giá cụ thể nếu chưa xác nhận', 'medium'),
  ('appropriate_age',  'Nội dung phải phù hợp với mọi lứa tuổi', 'medium')
ON CONFLICT (rule_key) DO UPDATE SET rule_text = EXCLUDED.rule_text, severity = EXCLUDED.severity;

-- Seed media settings
INSERT INTO ai_media_settings (media_type, provider, model_name, temperature, quality, size, is_active) VALUES
  ('image', 'openai_dall_e', 'dall-e-3', 0.9, 'standard', '1024x1024', false),
  ('video', 'openai_sora',  'sora-1',   0.8, '720p',     '1280x720',  false),
  ('audio', 'openai_tts',   'tts-1',    0.9, 'mp3_24k',  'normal',    false)
ON CONFLICT (media_type) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  provider_count INTEGER;
  brand_count INTEGER;
  route_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN (
      'ai_providers','ai_settings','content_templates','content_items',
      'content_generation_logs','content_schedules','media_prompts',
      'publish_channels','publish_jobs',
      'ai_task_routes','ai_brand_voices','ai_prompt_rules','ai_safety_rules',
      'ai_system_prompt_templates','ai_media_settings',
      'ai_provider_groups','ai_provider_models','ai_provider_runtime_configs',
      'ai_routing_rules',
      'migration_runs','migration_items','migration_mappings','migration_logs'
    );

  SELECT COUNT(*) INTO index_count FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (
      'ai_providers','ai_settings','content_templates','content_items',
      'content_generation_logs','content_schedules','media_prompts',
      'publish_channels','publish_jobs',
      'ai_task_routes','ai_brand_voices','ai_prompt_rules','ai_safety_rules',
      'ai_system_prompt_templates','ai_media_settings',
      'ai_provider_groups','ai_provider_models','ai_provider_runtime_configs',
      'ai_routing_rules',
      'migration_runs','migration_items','migration_mappings','migration_logs'
    );

  SELECT COUNT(*) INTO provider_count FROM ai_providers WHERE is_deleted = false;
  SELECT COUNT(*) INTO brand_count FROM ai_brand_voices;
  SELECT COUNT(*) INTO route_count FROM ai_task_routes;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' MIGRATION MASTER - VERIFICATION';
  RAISE NOTICE '============================================================';
  RAISE NOTICE ' Tables created:  % / 22 expected', table_count;
  RAISE NOTICE ' Indexes created: %', index_count;
  RAISE NOTICE ' Providers seeded: %', provider_count;
  RAISE NOTICE ' Brand voices:    %', brand_count;
  RAISE NOTICE ' Task routes:     %', route_count;
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration complete! Next: rebuild admin-ui Docker image.';
  RAISE NOTICE '';
END $$;
