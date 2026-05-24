/**
 * AI Operating Center - Migration Addon
 * Chạy: npx tsx lib/content/migration-addon.ts
 *
 * Thêm các cột/thay đổi cần thiết cho AIOC:
 * 1. Thêm cột model_name, temperature, streaming_enabled, timeout_ms, retry_count vào ai_providers
 * 2. Đảm bảo unique constraint trên ai_prompt_rules
 * 3. Seed thêm OpenRouter provider nếu chưa có
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

async function migrate() {
  if (!DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL chưa được cấu hình. Vui lòng kiểm tra .env file.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  console.log("=== AIOC Migration Addon ===");

  try {
    await client.query("BEGIN");

    // ── 1. Thêm cột model_name, temperature vào ai_providers ─────────────────
    // Các cột này cần thiết để API /api/ai/settings/all hoạt động đúng
    const providerColumns = [
      { name: "model_name",            def: "VARCHAR(200)" },
      { name: "temperature",           def: "NUMERIC(3,2) DEFAULT 0.7" },
      { name: "streaming_enabled",     def: "BOOLEAN DEFAULT false" },
      { name: "timeout_ms",           def: "INTEGER DEFAULT 60000" },
      { name: "retry_count",          def: "INTEGER DEFAULT 3" },
    ];
    for (const col of providerColumns) {
      await client.query(
        `ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`
      );
      console.log(`  [OK] ai_providers: +${col.name}`);
    }

    // ── 2. Đảm bảo unique constraint trên ai_prompt_rules ─────────────────
    // Constraint: (scope, platform, rule_key)
    // platform có thể NULL nên dùng coalesce để đảm bảo uniqueness
    await client.query(`
      DO $$
      BEGIN
        -- Drop old constraint nếu có dạng khác
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'ai_prompt_rules_scope_platform_rule_key_unique'
        ) THEN
          ALTER TABLE ai_prompt_rules DROP CONSTRAINT ai_prompt_rules_scope_platform_rule_key_unique;
        END IF;

        -- Thêm unique constraint mới (dùng COALESCE để xử lý NULL platform)
        ALTER TABLE ai_prompt_rules
          ADD CONSTRAINT ai_prompt_rules_scope_platform_rule_key_unique
          UNIQUE (scope, COALESCE(platform, ''), rule_key);
      EXCEPTION
        WHEN undefined_object THEN
          -- Constraint chưa tồn tại, tạo mới
          ALTER TABLE ai_prompt_rules
            ADD CONSTRAINT ai_prompt_rules_scope_platform_rule_key_unique
            UNIQUE (scope, COALESCE(platform, ''), rule_key);
      END
      $$;
    `);
    console.log("  [OK] ai_prompt_rules: unique constraint (scope, platform, rule_key)");

    // ── 3. Seed OpenRouter provider nếu chưa có ─────────────────────────────
    const seedResult = await client.query(`
      INSERT INTO ai_providers
        (provider, display_name, base_url, sort_order, model_name, temperature, streaming_enabled, timeout_ms, retry_count)
      VALUES
        ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 8,
         'openrouter/anthropic/claude-3.5-sonnet', 0.7, true, 90000, 3)
      ON CONFLICT (provider) DO NOTHING
      RETURNING id
    `);
    if (seedResult.rowCount && seedResult.rowCount > 0) {
      console.log(`  [OK] Seed: openrouter provider (id=${seedResult.rows[0].id})`);
    } else {
      console.log("  [SKIP] openrouter provider đã tồn tại");
    }

    // ── 4. Seed Groq provider nếu chưa có ──────────────────────────────────
    const groqResult = await client.query(`
      INSERT INTO ai_providers
        (provider, display_name, base_url, sort_order, model_name, temperature, streaming_enabled, timeout_ms, retry_count)
      VALUES
        ('groq', 'Groq', 'https://api.groq.com/openai/v1', 9,
         'llama-3.3-70b-versatile', 0.7, true, 60000, 3)
      ON CONFLICT (provider) DO NOTHING
      RETURNING id
    `);
    if (groqResult.rowCount && groqResult.rowCount > 0) {
      console.log(`  [OK] Seed: groq provider (id=${groqResult.rows[0].id})`);
    } else {
      console.log("  [SKIP] groq provider đã tồn tại");
    }

    // ── 5. Đảm bảo bảng ai_routing_rules tồn tại (nếu cần) ────────────────
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
    console.log("  [OK] ai_routing_rules (create if not exists)");

    // ── 6. Indexes bổ sung ───────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active
        ON ai_providers(is_active)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_providers_sort_order
        ON ai_providers(sort_order)
    `);
    console.log("  [OK] Additional indexes");

    // ── 7. Seed default system prompt templates nếu chưa có ─────────────────
    const systemPrompts = [
      {
        name: "Mặc định tiếng Việt",
        description: "Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu.",
        prompt_text: "Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.",
        is_default: true,
      },
    ];
    for (const sp of systemPrompts) {
      await client.query(`
        INSERT INTO ai_system_prompt_templates (name, description, prompt_text, is_default)
        SELECT $1, $2, $3, $4
        WHERE NOT EXISTS (
          SELECT 1 FROM ai_system_prompt_templates
          WHERE name = $1 AND is_default = true
        )
      `, [sp.name, sp.description, sp.prompt_text, sp.is_default]);
    }
    console.log("  [OK] Seed: default system prompt");

    await client.query("COMMIT");
    console.log("\n[AIOC ADDON] Migration thành công!");
    console.log("  Các thay đổi:");
    console.log("  1. ai_providers: +model_name, +temperature, +streaming_enabled, +timeout_ms, +retry_count");
    console.log("  2. ai_prompt_rules: unique constraint (scope, platform, rule_key)");
    console.log("  3. Seed: openrouter, groq providers");
    console.log("  4. Bảng: ai_routing_rules");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[AIOC ADDON] Migration thất bại:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

const cmd = process.argv[2];
if (cmd) {
  console.log("Addon migration không hỗ trợ rollback riêng.");
  console.log("Chạy: npx tsx lib/content/migration-aioc.ts rollback để rollback toàn bộ.");
} else {
  migrate();
}
