-- Migration: AI Providers Soft Delete + Schema Enhancement
-- Run: npx tsx sql/migration-ai-providers-soft-delete.sql.ts

-- Add soft-delete columns
ALTER TABLE ai_providers
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create provider groups table
CREATE TABLE IF NOT EXISTS ai_provider_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'Cloud',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create provider models table
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

-- Create provider runtime configs table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_providers_is_deleted ON ai_providers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_providers_status ON ai_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_slug ON ai_providers(slug);
CREATE INDEX IF NOT EXISTS idx_providers_group_slug ON ai_providers(group_slug);
CREATE INDEX IF NOT EXISTS idx_provider_models_provider_id ON ai_provider_models(provider_id);

-- Seed provider groups if empty
INSERT INTO ai_provider_groups (name, slug, icon, sort_order)
SELECT 'Cloud APIs', 'cloud_api', 'Cloud', 1 WHERE NOT EXISTS (SELECT 1 FROM ai_provider_groups WHERE slug = 'cloud_api');

INSERT INTO ai_provider_groups (name, slug, icon, sort_order)
SELECT 'AI Aggregators', 'ai_aggregator', 'Layers', 2 WHERE NOT EXISTS (SELECT 1 FROM ai_provider_groups WHERE slug = 'ai_aggregator');

INSERT INTO ai_provider_groups (name, slug, icon, sort_order)
SELECT 'Local LLMs', 'local_llm', 'Cpu', 3 WHERE NOT EXISTS (SELECT 1 FROM ai_provider_groups WHERE slug = 'local_llm');

INSERT INTO ai_provider_groups (name, slug, icon, sort_order)
SELECT 'Inference Platform', 'inference_platform', 'Zap', 4 WHERE NOT EXISTS (SELECT 1 FROM ai_provider_groups WHERE slug = 'inference_platform');
