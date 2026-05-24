/**
 * Seed Default Providers
 *
 * One-time seed: Only runs if NO providers exist in the database.
 * Checks for any providers with is_deleted = false before seeding.
 * If user has deleted all providers, this will NOT re-seed automatically.
 *
 * Run: npx tsx lib/content/db/seed-default-providers.ts
 */

import { query, closePool } from "@/lib/db";
import { encrypt } from "./encryption";

interface SeedProvider {
  name: string;
  slug: string;
  group_slug: "cloud_api" | "ai_aggregator" | "local_llm" | "inference_platform";
  type: string;
  base_url: string;
  default_model: string;
  status: "active" | "inactive";
  is_default: boolean;
  is_system: boolean;
  temperature: number;
  streaming_enabled: boolean;
  timeout_ms: number;
  retry_count: number;
  description: string;
}

const DEFAULT_PROVIDERS: SeedProvider[] = [
  {
    name: "OpenAI",
    slug: "openai",
    group_slug: "cloud_api",
    type: "openai",
    base_url: "https://api.openai.com/v1",
    default_model: "gpt-4o-mini",
    status: "inactive",
    is_default: true,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 60000,
    retry_count: 3,
    description: "GPT-4o, GPT-4o-mini — Mô hình mạnh nhất",
  },
  {
    name: "Google Gemini",
    slug: "gemini",
    group_slug: "cloud_api",
    type: "gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/models",
    default_model: "gemini-2.0-flash",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 60000,
    retry_count: 3,
    description: "Gemini 2.0 Flash — Nhanh và tiết kiệm token",
  },
  {
    name: "DeepSeek Cloud",
    slug: "deepseek",
    group_slug: "cloud_api",
    type: "deepseek",
    base_url: "https://api.deepseek.com/v1",
    default_model: "deepseek-chat",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 60000,
    retry_count: 3,
    description: "DeepSeek Chat & Reasoner — Chi phí thấp",
  },
  {
    name: "OpenRouter",
    slug: "openrouter",
    group_slug: "ai_aggregator",
    type: "openrouter",
    base_url: "https://openrouter.ai/api/v1",
    default_model: "openrouter/anthropic/claude-3.5-sonnet",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 90000,
    retry_count: 3,
    description: "Truy cập 100+ models (Claude, GPT, Llama...)",
  },
  {
    name: "Groq",
    slug: "groq",
    group_slug: "ai_aggregator",
    type: "groq",
    base_url: "https://api.groq.com/openai/v1",
    default_model: "llama-3.3-70b-versatile",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 60000,
    retry_count: 3,
    description: "Inference cực nhanh với chip LPU",
  },
  {
    name: "Ollama (Local)",
    slug: "ollama",
    group_slug: "local_llm",
    type: "ollama",
    base_url: "http://localhost:11434",
    default_model: "llama3.2",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 120000,
    retry_count: 2,
    description: "Chạy DeepSeek, Llama, Qwen... local. Miễn phí",
  },
  {
    name: "LM Studio (Local)",
    slug: "lmstudio",
    group_slug: "local_llm",
    type: "lmstudio",
    base_url: "http://localhost:1234/v1",
    default_model: "local-model",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 120000,
    retry_count: 2,
    description: "Desktop app chạy LLMs local. Miễn phí",
  },
  {
    name: "HuggingFace",
    slug: "huggingface",
    group_slug: "inference_platform",
    type: "huggingface",
    base_url: "https://api-inference.huggingface.co/models",
    default_model: "mistralai/Mistral-7B-Instruct-v0.2",
    status: "inactive",
    is_default: false,
    is_system: true,
    temperature: 0.7,
    streaming_enabled: false,
    timeout_ms: 60000,
    retry_count: 3,
    description: "Inference API — Hàng nghìn model open-source",
  },
];

async function seed() {
  console.log("🔄 Checking if seed is needed...");

  try {
    // Check if any non-deleted providers exist
    const { rows } = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM ai_providers WHERE is_deleted = false"
    );
    const count = parseInt(rows[0]?.count || "0", 10);

    if (count > 0) {
      console.log(`⏭️  Skipped: ${count} provider(s) already exist in database`);
      console.log("   To re-seed, first delete all existing providers.");
      await closePool();
      return;
    }

    console.log(`🌱 Seeding ${DEFAULT_PROVIDERS.length} default providers...`);

    for (const p of DEFAULT_PROVIDERS) {
      // Get max sort_order
      const { rows: maxRows } = await query<{ max_order: number }>(
        "SELECT COALESCE(MAX(sort_order), 0) + 1 as max_order FROM ai_providers"
      );
      const nextOrder = maxRows[0]?.max_order ?? 1;

      // Insert provider
      const { rows: insertRows } = await query<{ id: number }>(
        `INSERT INTO ai_providers
           (name, slug, group_slug, type, base_url, status, is_system, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          p.name,
          p.slug,
          p.group_slug,
          p.type,
          p.base_url,
          p.status,
          p.is_system,
          p.is_default,
          nextOrder,
        ]
      );

      const providerId = insertRows[0].id;

      // Create runtime config
      await query(
        `INSERT INTO ai_provider_runtime_configs
           (provider_id, selected_model, temperature, streaming_enabled, timeout_ms, retry_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          providerId,
          p.default_model,
          p.temperature,
          p.streaming_enabled,
          p.timeout_ms,
          p.retry_count,
        ]
      );

      console.log(`  ✅ ${p.name} (${p.slug})`);
    }

    console.log(`✅ Seeded ${DEFAULT_PROVIDERS.length} providers successfully`);
    console.log("   All providers are set to 'inactive' by default.");
    console.log("   OpenAI is set as the default provider.");
    console.log("");
    console.log("📝 Next steps:");
    console.log("   1. Go to AI Operating Center");
    console.log("   2. Add API key for your provider");
    console.log("   3. Click 'Test Connection'");
    console.log("   4. Click 'Activate' to enable the provider");
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seed();
