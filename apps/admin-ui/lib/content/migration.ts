/**
 * Content Module Migration Script
 * Chạy: npx tsx lib/content/migration.ts
 * Rollback: npx tsx lib/content/migration.ts rollback
 *
 * Tạo 9 bảng cho AI Content Module trong PostgreSQL.
 * KHÔNG ghi vào bảng core Medusa (product, product_variant, etc.)
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "[ERROR] DATABASE_URL chua duoc cau hinh.\n" +
    "Vui long tao file .env.local trong thu muc admin-ui:\n" +
    "  DATABASE_URL=postgres://user:password@host:5433/mtl_medusa\n" +
    "Hoac dat bien moi truong truoc khi chay:\n" +
    "  Windows (cmd): set DATABASE_URL=postgres://...\n" +
    "  Windows (ps):  $env:DATABASE_URL='postgres://...'\n" +
    "  macOS/Linux:   export DATABASE_URL=postgres://..."
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureIndex(client: any, idxName: string, idxDef: string) {
  const check = await client.query(
    "SELECT 1 FROM pg_indexes WHERE indexname = $1",
    [idxName]
  );
  if (check.rowCount === 0) {
    await client.query(idxDef);
  }
}

async function migrate() {
  const client = await pool.connect();
  console.log("=== Content Module Migration ===");
  console.log("Database:", DATABASE_URL.split("@")[1] || "local");

  try {
    await client.query("BEGIN");

    // ── 1. ai_providers ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id              SERIAL PRIMARY KEY,
        provider        VARCHAR(50) NOT NULL UNIQUE,
        display_name    VARCHAR(200) NOT NULL,
        base_url        VARCHAR(500),
        is_active       BOOLEAN DEFAULT false,
        sort_order      INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  [OK] ai_providers");

    // ── 2. ai_settings ───────────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] ai_settings");

    // ── 3. content_templates ─────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] content_templates");

    // ── 4. content_items ─────────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] content_items");

    // ── 5. content_generation_logs ───────────────────────────────────
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
      );
    `);
    console.log("  [OK] content_generation_logs");

    // ── 6. content_schedules ──────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] content_schedules");

    // ── 7. media_prompts ─────────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] media_prompts");

    // ── 8. publish_channels ─────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] publish_channels");

    // ── 9. publish_jobs ───────────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] publish_jobs");

    // ── Indexes (skip if exists) ─────────────────────────────────────
    await ensureIndex(client, "idx_content_items_type",
      "CREATE INDEX idx_content_items_type ON content_items(content_type)");
    await ensureIndex(client, "idx_content_items_status",
      "CREATE INDEX idx_content_items_status ON content_items(status)");
    await ensureIndex(client, "idx_content_items_product",
      "CREATE INDEX idx_content_items_product ON content_items(product_id)");
    await ensureIndex(client, "idx_content_items_created",
      "CREATE INDEX idx_content_items_created ON content_items(created_at DESC)");
    await ensureIndex(client, "idx_content_schedules_publish",
      "CREATE INDEX idx_content_schedules_publish ON content_schedules(publish_at)");
    await ensureIndex(client, "idx_content_schedules_status",
      "CREATE INDEX idx_content_schedules_status ON content_schedules(status)");
    await ensureIndex(client, "idx_content_generation_logs_content",
      "CREATE INDEX idx_content_generation_logs_content ON content_generation_logs(content_item_id)");
    await ensureIndex(client, "idx_content_generation_logs_provider",
      "CREATE INDEX idx_content_generation_logs_provider ON content_generation_logs(provider)");
    await ensureIndex(client, "idx_content_generation_logs_created",
      "CREATE INDEX idx_content_generation_logs_created ON content_generation_logs(created_at DESC)");
    await ensureIndex(client, "idx_media_prompts_content",
      "CREATE INDEX idx_media_prompts_content ON media_prompts(content_item_id)");
    await ensureIndex(client, "idx_publish_jobs_schedule",
      "CREATE INDEX idx_publish_jobs_schedule ON publish_jobs(schedule_id)");
    console.log("  [OK] Indexes");

    // ── Seed default providers ─────────────────────────────────────────
    await client.query(
      `INSERT INTO ai_providers (provider, display_name, base_url, sort_order)
       VALUES ('openai',   'OpenAI (GPT-4)',              'https://api.openai.com/v1',  1),
              ('gemini',   'Google Gemini',               'https://generativelanguage.googleapis.com/v1beta/models', 2),
              ('ollama',   'Ollama (Local LLM)',          'http://localhost:11434',     3),
              ('lmstudio', 'LM Studio (Local LLM)',       'http://localhost:1234/v1',  4)
       ON CONFLICT (provider) DO NOTHING`
    );
    console.log("  [OK] Seed: ai_providers");

    // ── Seed default channels ─────────────────────────────────────────
    await client.query(
      `INSERT INTO publish_channels (channel_code, channel_name, icon, is_active)
       VALUES ('facebook', 'Facebook',        'Facebook', true),
              ('website',  'Website / Blog',  'Globe',    true),
              ('zalo',     'Zalo Official',  'MessageCircle', true),
              ('tiktok',   'TikTok',         'Video',    true)
       ON CONFLICT (channel_code) DO NOTHING`
    );
    console.log("  [OK] Seed: publish_channels");

    // ── Seed default templates ────────────────────────────────────────
    await client.query(
      `INSERT INTO content_templates
        (template_name, content_type, system_prompt, user_template, variables, tone_options)
       VALUES
        (
          'Bai viet Facebook - Gioi thieu san pham',
          'facebook',
          'Ban la chuyen gia marketing laptop voi 10 nam kinh nghiem. Viet bai Facebook hap dan, thu hut nguoi doc, kem emoji phu hop. Khong viet qua dai (200-400 tu).',
          '{{product_name}}\n\n{{product_highlights}}\n\nGia: {{price}}\n\n{{cta}}',
          '["product_name","product_highlights","price","cta"]',
          '["chuyen nghiep","than thien","hai huoc","nghiem tuc"]'
        ),
        (
          'Bai viet Website - Danh gia chi tiet',
          'website',
          'Ban la content writer chuyen nghiep. Viet bai SEO voi cau truc ro rang: gioi thieu, dac diem noi bat, danh gia, ket luan. Su dung heading H2/H3. Tu khoa tu nhien.',
          'Tieu de SEO: {{seo_title}}\n\nGioi thieu: {{intro}}\n\nDac diem noi bat: {{highlights}}\n\nThong so ky thuat: {{specs}}\n\nDanh gia: {{review}}\n\nKet luan: {{conclusion}}',
          '["seo_title","intro","highlights","specs","review","conclusion"]',
          '["chuyen nghiep","de doc","chi tiet"]'
        ),
        (
          'Kich ban Video ngan',
          'video',
          'Ban la chuyen gia san xuat noi dung video TikTok/YouTube Shorts. Viet kich ban ngan gon, co hook manh, tempo nhanh, phu hop platform {{platform}}.',
          'Hook (3s): {{hook}}\n\nMo dau (5s): {{opening}}\n\nNoi dung chinh (30s): {{main_content}}\n\nCTA (5s): {{cta}}',
          '["platform","hook","opening","main_content","cta"]',
          '["nang dong","chuyen nghiep","vui non","kich tinh"]'
        ),
        (
          'Prompt tao anh san pham',
          'image',
          'Ban la chuyen gia prompt cho AI tao anh. Viet prompt chi tiet, mo ta ro chu the, boi canh, anh sang, phong cach, mau sac.',
          '{{subject}} on {{background}}, {{lighting}} lighting, {{style}} style, product photography, high quality, 4k',
          '["subject","background","lighting","style"]',
          '["minimalist","vibrant","dark moody","bright clean"]'
        )
       ON CONFLICT DO NOTHING`
    );
    console.log("  [OK] Seed: content_templates");

    // ── Seed default ai_settings ───────────────────────────────────────
    await client.query(
      `INSERT INTO ai_settings (provider_id, base_url, model_name, temperature, max_tokens, is_active)
       SELECT id, base_url, 'gpt-4o-mini', 0.7, 2048, true
       FROM ai_providers WHERE provider = 'openai'
       LIMIT 1
       ON CONFLICT DO NOTHING`
    );
    console.log("  [OK] Seed: ai_settings (default OpenAI)");

    await client.query("COMMIT");
    console.log("\n[MIGRATION] Da tao 9 bang + seed data. Thanh cong!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[MIGRATION] That bai:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function rollback() {
  const client = await pool.connect();
  console.log("=== Rollback Content Module ===");
  try {
    await client.query("BEGIN");
    await client.query("DROP TABLE IF EXISTS publish_jobs CASCADE");
    await client.query("DROP TABLE IF EXISTS media_prompts CASCADE");
    await client.query("DROP TABLE IF EXISTS publish_channels CASCADE");
    await client.query("DROP TABLE IF EXISTS content_schedules CASCADE");
    await client.query("DROP TABLE IF EXISTS content_generation_logs CASCADE");
    await client.query("DROP TABLE IF EXISTS content_items CASCADE");
    await client.query("DROP TABLE IF EXISTS content_templates CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_settings CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_providers CASCADE");
    await client.query("COMMIT");
    console.log("[ROLLBACK] Thanh cong!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[ROLLBACK] That bai:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

const cmd = process.argv[2];
if (cmd === "rollback") {
  rollback();
} else {
  migrate();
}
