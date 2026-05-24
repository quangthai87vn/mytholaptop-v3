/**
 * AI Operating Center - Provider Management Migration
 * Chạy: npx tsx lib/content/migration-providers.ts
 *
 * Schema mới cho AI Providers:
 * - ai_provider_groups     : nhóm provider (Cloud APIs, AI Aggregator, Local LLM, Inference Platform)
 * - ai_providers          : enhanced provider (name, slug, group_type, is_system, is_default, status)
 * - ai_provider_models     : models có sẵn theo từng provider
 * - ai_provider_runtime_configs : runtime config riêng theo provider_id
 */

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(__dirname, "../../.env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL ?? "";

if (!DATABASE_URL) {
  console.error(
    "[ERROR] DATABASE_URL chưa được cấu hình.\n" +
    "Vui lòng kiểm tra file .env trong thư mục apps/admin-ui có:\n" +
    "  DATABASE_URL=postgres://user:password@host:5433/mtl_medusa"
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// ── Group types ────────────────────────────────────────────────────────────────
type GroupSlug = "cloud_api" | "ai_aggregator" | "local_llm" | "inference_platform";

// ── Provider type slugs ────────────────────────────────────────────────────────
type ProviderTypeSlug =
  | "openai" | "gemini" | "deepseek" | "huggingface"
  | "ollama" | "lmstudio" | "openai_compatible" | "openai-compatible"
  | "openrouter" | "groq" | "custom";

interface ProviderSeed {
  name: string;
  slug: ProviderTypeSlug;
  group_slug: GroupSlug;
  base_url: string;
  is_system: boolean;
  default_model?: string;
  temperature?: number;
  streaming_enabled?: boolean;
  timeout_ms?: number;
  retry_count?: number;
}

interface ModelSeed {
  provider_slug: ProviderTypeSlug;
  model_name: string;
  display_name: string;
  context_length?: number;
  is_default?: boolean;
}

interface RuntimeConfigSeed {
  provider_slug: ProviderTypeSlug;
  selected_model: string;
  temperature?: number;
  max_output_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  timeout_ms?: number;
  retry_count?: number;
  streaming_enabled?: boolean;
}

async function migrate() {
  if (!DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL chưa được cấu hình. Vui lòng kiểm tra .env file.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  console.log("=== AI Provider Management Migration ===");

  try {
    await client.query("BEGIN");

    // ── 1. ai_provider_groups ────────────────────────────────────────────────
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
    console.log("  [OK] ai_provider_groups");

    // ── 2. Enhanced ai_providers ───────────────────────────────────────────
    // Step 0: Add is_deleted FIRST (needed for all subsequent WHERE clauses)
    await client.query(`
      ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false
    `);
    await client.query(`
      ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
    `);
    console.log("  [OK] ai_providers: is_deleted + deleted_at");

    // Step A: Handle slug column
    const slugColCheck = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ai_providers' AND column_name = 'slug'
    `);
    const slugExists = slugColCheck.rows.length > 0;
    const slugNullable = slugColCheck.rows[0]?.is_nullable === 'YES';

    if (slugExists && slugNullable) {
      // Backfill NULL slugs first, then set NOT NULL
      await client.query(`
        UPDATE ai_providers SET slug = 'provider_' || id::text WHERE slug IS NULL AND is_deleted = false
      `);
      await client.query(`
        UPDATE ai_providers SET slug = 'provider_' || id::text || '_deleted' WHERE slug IS NULL
      `);
      await client.query(`ALTER TABLE ai_providers ALTER COLUMN slug SET NOT NULL`);
    } else if (!slugExists) {
      await client.query(`ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS slug VARCHAR(50)`);
      await client.query(`UPDATE ai_providers SET slug = 'provider_' || id::text WHERE slug IS NULL`);
      await client.query(`ALTER TABLE ai_providers ALTER COLUMN slug SET NOT NULL`);
    }
    console.log("  [OK] ai_providers: slug column is NOT NULL");

    // Step B: Handle type column
    const typeColCheck = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ai_providers' AND column_name = 'type'
    `);
    const typeExists = typeColCheck.rows.length > 0;
    const typeNullable = typeColCheck.rows[0]?.is_nullable === 'YES';

    if (typeExists && typeNullable) {
      await client.query(`UPDATE ai_providers SET type = slug WHERE (type IS NULL OR type = '') AND slug IS NOT NULL`);
      await client.query(`UPDATE ai_providers SET type = name WHERE (type IS NULL OR type = '') AND name IS NOT NULL`);
      await client.query(`ALTER TABLE ai_providers ALTER COLUMN type SET NOT NULL, ALTER COLUMN type SET DEFAULT ''`);
      console.log("  [OK] ai_providers: type column is NOT NULL");
    }

    // Step C: Add remaining columns (is_deleted + slug already handled, add name/type separately)
    const newProviderColumns = [
      { name: "name",            def: "VARCHAR(100) NOT NULL DEFAULT ''" },
      { name: "type",            def: "VARCHAR(50) NOT NULL DEFAULT ''" },
      { name: "group_slug",      def: "VARCHAR(50) DEFAULT 'cloud_api'" },
      { name: "status",          def: "VARCHAR(20) DEFAULT 'active'" },
      { name: "is_system",       def: "BOOLEAN DEFAULT false" },
      { name: "is_default",      def: "BOOLEAN DEFAULT false" },
      { name: "connection_status",def: "VARCHAR(20) DEFAULT 'unknown'" },
      { name: "last_checked_at", def: "TIMESTAMPTZ" },
      { name: "last_error",      def: "TEXT" },
      { name: "display_name",    def: "VARCHAR(200) DEFAULT ''" },
      { name: "custom_headers",   def: "JSONB DEFAULT '{}'" },
      // API key encryption
      { name: "api_key_encrypted", def: "VARCHAR(500)" },
      { name: "api_key_iv",       def: "VARCHAR(100)" },
    ];

    for (const col of newProviderColumns) {
      await client.query(
        `ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`
      );
    }
    console.log("  [OK] ai_providers columns enhanced");

    // Backfill display_name from name if display_name is empty
    await client.query(`
      UPDATE ai_providers
      SET display_name = name
      WHERE (display_name IS NULL OR display_name = '')
        AND name IS NOT NULL AND name != ''
    `);

    // Backfill name from display_name if name is empty
    await client.query(`
      UPDATE ai_providers
      SET name = display_name
      WHERE (name = '' OR name IS NULL)
        AND display_name IS NOT NULL AND display_name != ''
        AND is_deleted = false
    `);

    // Backfill slug from name if slug is empty (shouldn't happen now but safety first)
    await client.query(`
      UPDATE ai_providers
      SET slug = lower(regexp_replace(name, '[^a-z0-9_]', '_', 'g'))
      WHERE (slug IS NULL OR slug = '' OR slug = 'provider_' || id::text)
        AND name IS NOT NULL AND name != ''
        AND is_deleted = false
    `);

    // Thêm unique constraint cho slug (after slug is NOT NULL)
    await client.query(`
      ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_slug_key
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ai_providers_slug_unique
      ON ai_providers (slug) WHERE slug IS NOT NULL
    `);
    // Drop old provider constraint if exists (it blocks our new slug-based logic)
    await client.query(`
      ALTER TABLE ai_providers DROP CONSTRAINT IF EXISTS ai_providers_provider_key
    `);
    console.log("  [OK] ai_providers: unique constraints updated");

    // ── 3. ai_provider_models ────────────────────────────────────────────────
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
    console.log("  [OK] ai_provider_models");

    // ── 4. ai_provider_runtime_configs ─────────────────────────────────────
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
    console.log("  [OK] ai_provider_runtime_configs");

    // ── 5. Indexes ────────────────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_status ON ai_providers(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_is_default ON ai_providers(is_default)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_providers_group_slug ON ai_providers(group_slug)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_provider_models_provider ON ai_provider_models(provider_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_provider_configs_provider ON ai_provider_runtime_configs(provider_id)`);
    console.log("  [OK] Indexes");

    // ── 6. Seed provider groups ─────────────────────────────────────────────
    const groups = [
      { name: "Cloud APIs",         slug: "cloud_api",         icon: "Cloud",          sort_order: 1 },
      { name: "AI Aggregator",     slug: "ai_aggregator",     icon: "Layers",         sort_order: 2 },
      { name: "Local LLM",         slug: "local_llm",         icon: "Cpu",            sort_order: 3 },
      { name: "Inference Platform", slug: "inference_platform",icon: "Layers",         sort_order: 4 },
    ];
    for (const g of groups) {
      await client.query(`
        INSERT INTO ai_provider_groups (name, slug, icon, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order
      `, [g.name, g.slug, g.icon, g.sort_order]);
    }
    console.log("  [OK] Seed: ai_provider_groups");

    // ── 7. Seed providers ─────────────────────────────────────────────────
    const providerSeeds: ProviderSeed[] = [
      // Cloud APIs
      { name: "OpenAI", slug: "openai", group_slug: "cloud_api", base_url: "https://api.openai.com/v1", is_system: true,
        default_model: "gpt-4o-mini", temperature: 0.7, streaming_enabled: false, timeout_ms: 60000, retry_count: 3 },
      { name: "Google Gemini", slug: "gemini", group_slug: "cloud_api", base_url: "https://generativelanguage.googleapis.com/v1beta/models", is_system: true,
        default_model: "gemini-2.0-flash", temperature: 0.7, streaming_enabled: false, timeout_ms: 60000, retry_count: 3 },
      { name: "DeepSeek Cloud", slug: "deepseek", group_slug: "cloud_api", base_url: "https://api.deepseek.com/v1", is_system: true,
        default_model: "deepseek-chat", temperature: 0.7, streaming_enabled: false, timeout_ms: 60000, retry_count: 3 },

      // AI Aggregator
      { name: "OpenRouter", slug: "openrouter", group_slug: "ai_aggregator", base_url: "https://openrouter.ai/api/v1", is_system: true,
        default_model: "openrouter/anthropic/claude-3.5-sonnet", temperature: 0.7, streaming_enabled: true, timeout_ms: 90000, retry_count: 3 },
      { name: "Groq", slug: "groq", group_slug: "ai_aggregator", base_url: "https://api.groq.com/openai/v1", is_system: true,
        default_model: "llama-3.3-70b-versatile", temperature: 0.7, streaming_enabled: true, timeout_ms: 60000, retry_count: 3 },

      // Local LLM
      { name: "Ollama", slug: "ollama", group_slug: "local_llm", base_url: "http://localhost:11434", is_system: true,
        default_model: "llama3.2", temperature: 0.7, streaming_enabled: false, timeout_ms: 120000, retry_count: 2 },
      { name: "LM Studio", slug: "lmstudio", group_slug: "local_llm", base_url: "http://localhost:1234/v1", is_system: true,
        default_model: "", temperature: 0.7, streaming_enabled: false, timeout_ms: 120000, retry_count: 2 },
      { name: "OpenAI-Compatible", slug: "openai_compatible", group_slug: "local_llm", base_url: "http://localhost:8000/v1", is_system: true,
        default_model: "", temperature: 0.7, streaming_enabled: false, timeout_ms: 120000, retry_count: 2 },

      // Inference Platform
      { name: "HuggingFace", slug: "huggingface", group_slug: "inference_platform", base_url: "https://api-inference.huggingface.co/models", is_system: true,
        default_model: "mistralai/Mistral-7B-Instruct-v0.2", temperature: 0.7, streaming_enabled: false, timeout_ms: 60000, retry_count: 3 },
    ];

    // Build a map of existing (non-deleted) providers by slug
    const existingProviders = await client.query(
      `SELECT slug FROM ai_providers WHERE is_deleted = false`
    ).then(r => new Set(r.rows.map((x: any) => x.slug)));

    for (const p of providerSeeds) {
      const status = existingProviders.has(p.slug) ? undefined : "active";
      const displayName = existingProviders.has(p.slug) ? undefined : p.name;

      // Check if provider with slug exists (non-deleted)
      const { rows: existingRows } = await client.query(
        `SELECT id, is_deleted FROM ai_providers WHERE slug = $1 LIMIT 1`,
        [p.slug]
      );
      const existingRow = existingRows[0];

      if (!existingRow) {
        // Insert new seed provider
        await client.query(`
          INSERT INTO ai_providers
            (name, slug, group_slug, type, base_url, status, is_system, is_default, display_name, connection_status, provider)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unknown', $2)
        `, [p.name, p.slug, p.group_slug, p.slug, p.base_url, status, p.is_system, false, displayName]);
      } else if (existingRow && !existingRow.is_deleted) {
        // Update existing non-deleted system provider
        await client.query(`
          UPDATE ai_providers SET
            name = COALESCE(NULLIF($1, ''), name),
            group_slug = COALESCE($2, group_slug),
            type = COALESCE(NULLIF($3, ''), type),
            base_url = COALESCE(NULLIF($4, ''), base_url),
            provider = COALESCE(NULLIF($3, ''), provider)
          WHERE slug = $5 AND is_deleted = false
        `, [p.name, p.group_slug, p.slug, p.base_url, p.slug]);
      }
      // If soft-deleted, skip (never re-activate)

      // Get provider id (only non-deleted)
      const { rows } = await client.query(
        `SELECT id FROM ai_providers WHERE slug = $1 AND is_deleted = false LIMIT 1`, [p.slug]
      );
      const providerId = rows[0]?.id;
      if (!providerId) continue;

      // Seed runtime config
      await client.query(`
        INSERT INTO ai_provider_runtime_configs
          (provider_id, selected_model, temperature, max_output_tokens, top_p,
           frequency_penalty, presence_penalty, timeout_ms, retry_count, streaming_enabled)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (provider_id) DO UPDATE SET
          selected_model = COALESCE(EXCLUDED.selected_model, ai_provider_runtime_configs.selected_model),
          temperature = COALESCE(EXCLUDED.temperature, ai_provider_runtime_configs.temperature),
          timeout_ms = COALESCE(EXCLUDED.timeout_ms, ai_provider_runtime_configs.timeout_ms),
          retry_count = COALESCE(EXCLUDED.retry_count, ai_provider_runtime_configs.retry_count),
          streaming_enabled = COALESCE(EXCLUDED.streaming_enabled, ai_provider_runtime_configs.streaming_enabled),
          updated_at = NOW()
      `, [
        providerId,
        p.default_model || "gpt-4o-mini",
        p.temperature ?? 0.7,
        2048,
        1.0,
        0.0,
        0.0,
        p.timeout_ms ?? 60000,
        p.retry_count ?? 3,
        p.streaming_enabled ?? false,
      ]);
    }
    console.log("  [OK] Seed: ai_providers + runtime configs");

    // ── 8. Seed models for known providers ─────────────────────────────────
    const modelSeeds: ModelSeed[] = [
      // OpenAI
      { provider_slug: "openai", model_name: "gpt-4o", display_name: "GPT-4o", context_length: 128000, is_default: false },
      { provider_slug: "openai", model_name: "gpt-4o-mini", display_name: "GPT-4o Mini", context_length: 128000, is_default: true },
      { provider_slug: "openai", model_name: "gpt-4-turbo", display_name: "GPT-4 Turbo", context_length: 128000, is_default: false },
      { provider_slug: "openai", model_name: "gpt-3.5-turbo", display_name: "GPT-3.5 Turbo", context_length: 16385, is_default: false },

      // Gemini
      { provider_slug: "gemini", model_name: "gemini-2.0-flash", display_name: "Gemini 2.0 Flash", context_length: 1000000, is_default: true },
      { provider_slug: "gemini", model_name: "gemini-1.5-flash", display_name: "Gemini 1.5 Flash", context_length: 1000000, is_default: false },
      { provider_slug: "gemini", model_name: "gemini-1.5-pro", display_name: "Gemini 1.5 Pro", context_length: 2000000, is_default: false },

      // DeepSeek
      { provider_slug: "deepseek", model_name: "deepseek-chat", display_name: "DeepSeek Chat", context_length: 64000, is_default: true },
      { provider_slug: "deepseek", model_name: "deepseek-reasoner", display_name: "DeepSeek Reasoner (R1)", context_length: 64000, is_default: false },

      // OpenRouter - thường dùng
      { provider_slug: "openrouter", model_name: "openrouter/anthropic/claude-3.5-sonnet", display_name: "Claude 3.5 Sonnet (OR)", context_length: 200000, is_default: true },
      { provider_slug: "openrouter", model_name: "openrouter/anthropic/claude-3-haiku", display_name: "Claude 3 Haiku (OR)", context_length: 200000, is_default: false },
      { provider_slug: "openrouter", model_name: "openrouter/google/gemini-2.0-flash-exp", display_name: "Gemini 2.0 Flash (OR)", context_length: 1000000, is_default: false },
      { provider_slug: "openrouter", model_name: "openrouter/meta-llama/llama-3-70b-instruct", display_name: "Llama 3 70B (OR)", context_length: 8000, is_default: false },

      // Groq
      { provider_slug: "groq", model_name: "llama-3.3-70b-versatile", display_name: "Llama 3.3 70B Versatile", context_length: 128000, is_default: true },
      { provider_slug: "groq", model_name: "llama-3.1-8b-instant", display_name: "Llama 3.1 8B Instant", context_length: 128000, is_default: false },
      { provider_slug: "groq", model_name: "mixtral-8x7b-32768", display_name: "Mixtral 8x7B", context_length: 32768, is_default: false },

      // HuggingFace - thường dùng
      { provider_slug: "huggingface", model_name: "mistralai/Mistral-7B-Instruct-v0.2", display_name: "Mistral 7B Instruct", context_length: 32000, is_default: true },
      { provider_slug: "huggingface", model_name: "meta-llama/Llama-3-8B-Instruct", display_name: "Llama 3 8B Instruct", context_length: 8000, is_default: false },
    ];

    for (const m of modelSeeds) {
      const { rows: pRows } = await client.query(
        `SELECT id FROM ai_providers WHERE slug = $1 LIMIT 1`, [m.provider_slug]
      );
      const providerId = pRows[0]?.id;
      if (!providerId) continue;

      await client.query(`
        INSERT INTO ai_provider_models
          (provider_id, model_name, display_name, context_length, is_default)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (provider_id, model_name) DO UPDATE SET
          display_name = COALESCE(EXCLUDED.display_name, ai_provider_models.display_name),
          context_length = COALESCE(EXCLUDED.context_length, ai_provider_models.context_length),
          is_default = COALESCE(EXCLUDED.is_default, ai_provider_models.is_default)
      `, [providerId, m.model_name, m.display_name, m.context_length ?? null, m.is_default ?? false]);
    }
    console.log("  [OK] Seed: ai_provider_models");

    // ── 9. Đặt OpenAI làm default provider đầu tiên ────────────────────
    await client.query(`
      UPDATE ai_providers SET is_default = false WHERE is_default = true
    `);
    await client.query(`
      UPDATE ai_providers SET is_default = true
      WHERE slug = 'openai'
      AND NOT EXISTS (SELECT 1 FROM ai_providers WHERE is_default = true AND slug = 'openai')
    `);

    await client.query("COMMIT");
    console.log("\n[PROVIDER MIGRATION] Thành công!");
    console.log("  Bảng mới:");
    console.log("  - ai_provider_groups");
    console.log("  - ai_provider_models");
    console.log("  - ai_provider_runtime_configs");
    console.log("  Nâng cấp:");
    console.log("  - ai_providers: +name, +slug, +group_slug, +type, +status, +is_system, +is_default, +connection_status, +custom_headers");
    console.log("  Seed: 9 system providers + models + runtime configs");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[PROVIDER MIGRATION] Thất bại:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

const cmd = process.argv[2];
if (cmd === "rollback") {
  console.log("Rollback không được hỗ trợ cho migration này.");
  console.log("Vui lòng xóa bảng thủ công nếu cần:");
  console.log("  DROP TABLE IF EXISTS ai_provider_runtime_configs CASCADE;");
  console.log("  DROP TABLE IF EXISTS ai_provider_models CASCADE;");
  console.log("  DROP TABLE IF EXISTS ai_provider_groups CASCADE;");
  console.log("  -- Reset columns:");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS name;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS slug;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS group_slug;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS status;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS is_system;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS is_default;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS connection_status;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS last_checked_at;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS last_error;");
  console.log("  ALTER TABLE ai_providers DROP COLUMN IF EXISTS custom_headers;");
} else {
  migrate();
}
