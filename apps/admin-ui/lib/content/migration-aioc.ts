/**
 * AI Operating Center Migration v2
 * Chạy: npx tsx lib/content/migration-aioc.ts
 * Rollback: npx tsx lib/content/migration-aioc.ts rollback
 *
 * Tạo 5 bảng cho AI Operating Center:
 * - ai_task_routes          (primary/fallback provider+model, system_prompt, brand_preset)
 * - ai_brand_voices         (extended: target_audience, keywords, example_output)
 * - ai_prompt_rules
 * - ai_safety_rules
 * - ai_system_prompt_templates (default Vietnamese system prompt)
 * - ai_media_settings       (provider riêng cho image/video/audio)
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

async function migrate() {
  if (!DATABASE_URL) {
    console.error("[ERROR] DATABASE_URL chưa được cấu hình. Vui lòng kiểm tra .env file.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  console.log("=== AI Operating Center Migration ===");

  try {
    await client.query("BEGIN");

    // ── 1. ai_task_routes (extended) ────────────────────────────────────────
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
      );
    `);
    console.log("  [OK] ai_task_routes");

    // Add missing columns if table already existed (migration-safe)
    await client.query(`ALTER TABLE ai_task_routes ADD COLUMN IF NOT EXISTS fallback_provider_type VARCHAR(30)`);
    await client.query(`ALTER TABLE ai_task_routes ADD COLUMN IF NOT EXISTS fallback_model_name VARCHAR(200)`);
    await client.query(`ALTER TABLE ai_task_routes ADD COLUMN IF NOT EXISTS system_prompt_id INTEGER`);
    await client.query(`ALTER TABLE ai_task_routes ADD COLUMN IF NOT EXISTS brand_preset VARCHAR(50)`);
    console.log("  [OK] ai_task_routes columns (ALTER TABLE IF NOT EXISTS)");

    // ── 2. ai_brand_voices (extended) ───────────────────────────────────────
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
        cta_style                    VARCHAR(20) DEFAULT 'direct',
        example_output                TEXT,
        is_active                    BOOLEAN DEFAULT true,
        created_at                   TIMESTAMPTZ DEFAULT NOW(),
        updated_at                   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  [OK] ai_brand_voices");

    // Add missing columns if table already existed (migration-safe)
    await client.query(`ALTER TABLE ai_brand_voices ADD COLUMN IF NOT EXISTS target_audience TEXT`);
    await client.query(`ALTER TABLE ai_brand_voices ADD COLUMN IF NOT EXISTS tone_instruction TEXT`);
    await client.query(`ALTER TABLE ai_brand_voices ADD COLUMN IF NOT EXISTS keywords_to_use TEXT[]`);
    await client.query(`ALTER TABLE ai_brand_voices ADD COLUMN IF NOT EXISTS keywords_to_avoid TEXT[]`);
    await client.query(`ALTER TABLE ai_brand_voices ADD COLUMN IF NOT EXISTS example_output TEXT`);
    console.log("  [OK] ai_brand_voices columns (ALTER TABLE IF NOT EXISTS)");

    // ── 3. ai_prompt_rules ──────────────────────────────────────────────────

    // ── 3. ai_prompt_rules ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_prompt_rules (
        id              SERIAL PRIMARY KEY,
        scope           VARCHAR(20) NOT NULL DEFAULT 'global',
        platform        VARCHAR(30),
        rule_key        VARCHAR(100) NOT NULL,
        rule_text       TEXT NOT NULL,
        priority        INTEGER DEFAULT 0,
        is_active       BOOLEAN DEFAULT true,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(scope, platform, rule_key)
      );
    `);
    console.log("  [OK] ai_prompt_rules");

    // ── 4. ai_safety_rules ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_safety_rules (
        id                    SERIAL PRIMARY KEY,
        rule_key              VARCHAR(100) NOT NULL UNIQUE,
        rule_text             TEXT NOT NULL,
        severity              VARCHAR(20) DEFAULT 'medium',
        is_active             BOOLEAN DEFAULT true,
        created_at            TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  [OK] ai_safety_rules");

    // ── 5. ai_system_prompt_templates ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_system_prompt_templates (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(200) NOT NULL,
        description TEXT,
        prompt_text TEXT NOT NULL,
        is_active   BOOLEAN DEFAULT true,
        is_default  BOOLEAN DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  [OK] ai_system_prompt_templates");

    // ── 6. ai_media_settings (image/video/audio AI providers) ─────────────────
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
      );
    `);
    console.log("  [OK] ai_media_settings");

    // ── Seed default media settings ────────────────────────────────────────────
    const mediaSeeds = [
      { media_type: "image", provider: "openai_dall_e", model_name: "dall-e-3", temperature: 0.9, quality: "standard", size: "1024x1024" },
      { media_type: "video", provider: "openai_sora",    model_name: "sora-1",   temperature: 0.8, quality: "720p",     size: "1280x720"  },
      { media_type: "audio", provider: "openai_tts",     model_name: "tts-1",    temperature: 0.9, quality: "mp3_24k",  size: "normal"     },
    ];
    for (const m of mediaSeeds) {
      await client.query(`
        INSERT INTO ai_media_settings (media_type, provider, model_name, temperature, quality, size, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, false)
        ON CONFLICT (media_type) DO NOTHING`,
        [m.media_type, m.provider, m.model_name, m.temperature, m.quality, m.size]
      );
    }
    console.log("  [OK] Seed: ai_media_settings");

    // ── Seed ai_providers (nếu chưa có) ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id              SERIAL PRIMARY KEY,
        provider        VARCHAR(30) NOT NULL UNIQUE,
        display_name    VARCHAR(200) NOT NULL,
        base_url        VARCHAR(500),
        api_key_encrypted TEXT,
        api_key_iv      VARCHAR(100),
        is_active       BOOLEAN DEFAULT false,
        sort_order      INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("  [OK] ai_providers");

    const providerSeeds = [
      { provider: "openai",              display_name: "OpenAI GPT",            base_url: "https://api.openai.com/v1",      sort_order: 1 },
      { provider: "gemini",              display_name: "Google Gemini",        base_url: "https://generativelanguage.googleapis.com/v1beta/models", sort_order: 2 },
      { provider: "deepseek",             display_name: "DeepSeek Cloud",       base_url: "https://api.deepseek.com/v1",   sort_order: 3 },
      { provider: "huggingface",         display_name: "HuggingFace",          base_url: "https://api-inference.huggingface.co/models", sort_order: 4 },
      { provider: "ollama",               display_name: "Ollama (Local)",        base_url: "http://localhost:11434",        sort_order: 5 },
      { provider: "lmstudio",             display_name: "LM Studio (Local)",    base_url: "http://localhost:1234/v1",      sort_order: 6 },
      { provider: "openai-compatible",   display_name: "OpenAI-Compatible",    base_url: "http://localhost:8000/v1",      sort_order: 7 },
    ];
    for (const p of providerSeeds) {
      await client.query(`
        INSERT INTO ai_providers (provider, display_name, base_url, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (provider) DO NOTHING`,
        [p.provider, p.display_name, p.base_url, p.sort_order]
      );
    }
    console.log("  [OK] Seed: ai_providers");

    // ── Indexes ──────────────────────────────────────────────────────────────
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_task_routes_task_type ON ai_task_routes(task_type)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_task_routes_provider ON ai_task_routes(provider_type)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_brand_voices_active ON ai_brand_voices(is_active)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_prompt_rules_scope ON ai_prompt_rules(scope)"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_prompt_rules_platform ON ai_prompt_rules(platform)"
    );
    console.log("  [OK] Indexes");

    // ── Seed default task routes ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO ai_task_routes (task_type, task_label, provider_type, model_name, temperature, priority)
      VALUES
        ('facebook_content',    'Bài viết Facebook',     'openai',  'gpt-4o-mini',      0.7, 1),
        ('seo_article',         'Bài viết SEO Website',   'gemini',  'gemini-2.0-flash', 0.6, 2),
        ('video_script',        'Kịch bản Video',         'openai',  'gpt-4o-mini',      0.8, 3),
        ('image_prompt',        'Prompt Hình ảnh',        'gemini',  'gemini-2.0-flash', 0.9, 4),
        ('zalo_message',        'Tin nhắn Zalo',          'gemini',  'gemini-2.0-flash', 0.5, 5),
        ('product_description', 'Mô tả sản phẩm',        'openai',  'gpt-4o-mini',      0.6, 6),
        ('email_marketing',     'Email Marketing',        'gemini',  'gemini-2.0-flash', 0.7, 7)
      ON CONFLICT (task_type) DO NOTHING
    `);
    console.log("  [OK] Seed: ai_task_routes");

    // ── Seed default brand voices (extended) ─────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandSeeds = ([
      { preset: "professional",    name: "Chuyên nghiệp",      description: "Phong cách trang trọng, chuyên nghiệp cho doanh nghiệp", target_audience: "Doanh nhân, quản lý, kỹ sư IT", tone_instruction: "Giọng văn chuyên nghiệp, trang trọng, dùng thuật ngữ kỹ thuật chính xác.", keywords_to_use: ["chất lượng", "bảo hành", "tin cậy", "hiệu suất", "đáng giá"], keywords_to_avoid: ["rẻ", "tốt rẻ", "free", "siêu rẻ"], tone_professional_casual: 0.8, tone_luxury_affordable: 0.2, tone_technical_simple: 0.5, content_template: "Bạn là chuyên gia marketing chuyên nghiệp với 10 năm kinh nghiệm.", emoji_usage: "minimal", cta_style: "direct", example_output: "Laptop Dell Latitude 5540 — lựa chọn hoàn hảo cho doanh nhân." },
      { preset: "gaming",          name: "Gaming",              description: "Phong cách năng động cho game thủ và giới trẻ", target_audience: "Game thủ, sinh viên, người trẻ thích công nghệ", tone_instruction: "Giọng văn năng động, hào hứng, truyền cảm hứng.", keywords_to_use: ["mạnh mẽ", "chiến game", "RGB", "144Hz", "RTX"], keywords_to_avoid: ["văn phòng", "bền", "tiết kiệm pin"], tone_professional_casual: -0.5, tone_luxury_affordable: -0.3, tone_technical_simple: 0.3, content_template: "Bạn là chuyên gia gaming với kiến thức sâu về laptop chơi game.", emoji_usage: "heavy", cta_style: "urgency", example_output: "Cấu hình KHỦNG! RTX 4060 + i7 Gen 13 — Chiến mượt mọi tựa game AAA!" },
      { preset: "student",         name: "Sinh viên",           description: "Giọng văn gần gũi, dễ hiểu cho sinh viên", target_audience: "Học sinh, sinh viên, người có ngân sách hạn chế", tone_instruction: "Giọng văn thân thiện, gần gũi, đơn giản.", keywords_to_use: ["giá sinh viên", "học tập", "nhẹ", "pin trâu"], keywords_to_avoid: ["doanh nghiệp", "sang trọng"], tone_professional_casual: -0.6, tone_luxury_affordable: -0.8, tone_technical_simple: -0.4, content_template: "Bạn là người bạn đồng hành của sinh viên.", emoji_usage: "moderate", cta_style: "friendly", example_output: "Laptop này cực kỳ phù hợp cho bạn sinh viên!" },
      { preset: "business",        name: "Doanh nhân",           description: "Sang trọng, uy tín cho doanh nhân và doanh nghiệp", target_audience: "Doanh nhân, CEO, giám đốc", tone_instruction: "Giọng văn sang trọng, uy tín, đẳng cấp.", keywords_to_use: ["đẳng cấp", "sang trọng", "bảo mật"], keywords_to_avoid: ["rẻ", "sinh viên"], tone_professional_casual: 0.9, tone_luxury_affordable: 0.8, tone_technical_simple: 0.6, content_template: "Bạn là chuyên gia tư vấn laptop cho doanh nhân.", emoji_usage: "none", cta_style: "direct", example_output: "MacBook Pro M3 — công cụ của những nhà lãnh đạo." },
      { preset: "apple_premium",  name: "Apple Premium",         description: "Tinh tế, đẳng cấp như Apple Store", target_audience: "Người yêu Apple, tín đồ công nghệ", tone_instruction: "Giọng văn tinh tế, đẳng cấp.", keywords_to_use: ["Apple", "ecosystem", "tinh tế"], keywords_to_avoid: ["Windows", "rẻ tiền"], tone_professional_casual: 0.7, tone_luxury_affordable: 0.9, tone_technical_simple: 0.4, content_template: "Bạn là chuyên gia tư vấn MacBook và sản phẩm Apple cao cấp.", emoji_usage: "minimal", cta_style: "soft", example_output: "MacBook Air M3 — mỏng nhẹ chưa từng thấy." },
      { preset: "budget_friendly",name: "Giá rẻ dễ tiếp cận",  description: "Tập trung vào giá trị và tiết kiệm chi phí", target_audience: "Người có ngân sách hạn chế", tone_instruction: "Giọng văn đơn giản, thực tế.", keywords_to_use: ["giá tốt", "tiết kiệm", "bền"], keywords_to_avoid: ["cao cấp", "premium"], tone_professional_casual: -0.3, tone_luxury_affordable: -0.9, tone_technical_simple: -0.2, content_template: "Bạn là chuyên gia tư vấn laptop giá tốt.", emoji_usage: "moderate", cta_style: "friendly", example_output: "Chỉ từ 8.990.000đ — Laptop giá sinh viên cấu hình tốt." },
    ] as const) as unknown as Array<Record<string, unknown>>;
    for (const b of brandSeeds) {
      await client.query(`
        INSERT INTO ai_brand_voices (preset, name, description, target_audience, tone_instruction, keywords_to_use, keywords_to_avoid, tone_professional_casual, tone_luxury_affordable, tone_technical_simple, content_template, emoji_usage, cta_style, example_output)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (preset) DO NOTHING`,
        [b.preset, b.name, b.description, b.target_audience, b.tone_instruction, b.keywords_to_use, b.keywords_to_avoid, b.tone_professional_casual, b.tone_luxury_affordable, b.tone_technical_simple, b.content_template, b.emoji_usage, b.cta_style, b.example_output]
      );
    }
    console.log("  [OK] Seed: ai_brand_voices");

    // ── Seed system prompt templates ──────────────────────────────────────────
    const systemPrompts = [
      {
        name: "Mặc định tiếng Việt",
        description: "Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu.",
        prompt_text: "Luôn trả lời bằng tiếng Việt. Không dùng tiếng Trung hoặc tiếng Anh trừ khi được yêu cầu. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.",
        is_default: true,
      },
      {
        name: "Marketing Laptop Mỹ Tho",
        description: "System prompt cho marketing laptop tại Mỹ Tho, Tiền Giang",
        prompt_text: "Bạn là chuyên gia marketing laptop tại Mỹ Tho, Tiền Giang. Luôn trả lời bằng tiếng Việt. Viết nội dung hấp dẫn, phù hợp với khách hàng địa phương. Nhắc nhở khách hàng có thể đến cửa hàng Mỹ Tho Laptop để trải nghiệm trực tiếp. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.",
        is_default: false,
      },
      {
        name: "Kỹ thuật chi tiết",
        description: "Trả lời chi tiết về thông số kỹ thuật laptop, chip, RAM, GPU",
        prompt_text: "Bạn là chuyên gia kỹ thuật laptop. Luôn trả lời bằng tiếng Việt. Cung cấp thông số kỹ thuật chi tiết, so sánh khách quan. Giải thích rõ ràng các thuật ngữ công nghệ. Không hiển thị quá trình suy luận. Chỉ trả về kết quả cuối cùng.",
        is_default: false,
      },
    ];
    for (const sp of systemPrompts) {
      await client.query(`
        INSERT INTO ai_system_prompt_templates (name, description, prompt_text, is_default)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING`,
        [sp.name, sp.description, sp.prompt_text, sp.is_default]
      );
    }
    console.log("  [OK] Seed: ai_system_prompt_templates");

    // ── Seed default prompt rules ──────────────────────────────────────────────
    const globalRules = [
      { rule_key: "has_cta",       rule_text: "Mỗi bài viết phải có Call-to-Action (CTA) rõ ràng ở cuối.", priority: 10 },
      { rule_key: "no_spam",       rule_text: "Không spam emoji liên tiếp. Tối đa 3 emoji mỗi đoạn.", priority: 5 },
      { rule_key: "product_focus", rule_text: "Nội dung phải tập trung vào lợi ích sản phẩm, không quảng cáo thuần túy.", priority: 8 },
      { rule_key: "local_context",  rule_text: "Nhắc nhở khách hàng đến từ Tiền Giang và khu vực lân cận.", priority: 3 },
      { rule_key: "price_transparent", rule_text: "Không đưa ra giá cụ thể nếu chưa xác nhận với đội ngũ bán hàng.", priority: 9 },
    ];
    for (const r of globalRules) {
      await client.query(`
        INSERT INTO ai_prompt_rules (scope, rule_key, rule_text, priority)
        VALUES ('global', $1, $2, $3)
        ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
          rule_text = EXCLUDED.rule_text,
          priority  = EXCLUDED.priority`,
        [r.rule_key, r.rule_text, r.priority]
      );
    }
    const platformRules: Array<{ platform: string; rule_key: string; rule_text: string }> = [
      { platform: "facebook", rule_key: "hook_3lines",  rule_text: "3 dòng đầu phải gây tò mò, hook mạnh. Có emoji hoặc icon." },
      { platform: "facebook", rule_key: "length",       rule_text: "Độ dài 150-300 từ. Ngắn gọn, dễ đọc trên mobile." },
      { platform: "website",  rule_key: "seo_heading",  rule_text: "Sử dụng heading H2/H3. Từ khóa tự nhiên, không nhồi nhét." },
      { platform: "website",  rule_key: "meta_desc",    rule_text: "Tạo meta description 150-160 ký tự, chứa từ khóa chính." },
      { platform: "video",    rule_key: "hook_3s",      rule_text: "Hook 3 giây đầu phải gây shock hoặc tò mò cực mạnh." },
      { platform: "video",    rule_key: "tempo",        rule_text: "Nhịp độ nhanh, mỗi phần không quá 10 giây. Có text overlay." },
      { platform: "image",    rule_key: "composition",   rule_text: "Mô tả rõ chủ thể, bối cảnh, ánh sáng, phong cách, màu sắc." },
      { platform: "zalo",     rule_key: "short",        rule_text: "Tin nhắn ngắn, không quá 160 ký tự. Có emoji phù hợp." },
    ];
    for (const r of platformRules) {
      await client.query(`
        INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority)
        VALUES ('platform', $1, $2, $3, 5)
        ON CONFLICT (scope, platform, rule_key) DO UPDATE SET
          rule_text = EXCLUDED.rule_text,
          priority  = EXCLUDED.priority`,
        [r.platform, r.rule_key, r.rule_text]
      );
    }
    console.log("  [OK] Seed: ai_prompt_rules");

    // ── Seed default safety rules ─────────────────────────────────────────────
    const safetyRules = [
      { rule_key: "no_sensitive",     rule_text: "Không viết nội dung nhạy cảm về chính trị, tôn giáo, sắc tộc", severity: "high" },
      { rule_key: "no_false_claim",   rule_text: "Không đưa ra claim vượt quá khả năng sản phẩm", severity: "medium" },
      { rule_key: "no_competitor",    rule_text: "Không nhắc đến đối thủ cạnh tranh trực tiếp", severity: "low" },
      { rule_key: "no_spam_emoji",   rule_text: "Không spam emoji hoặc ký tự đặc biệt liên tục", severity: "low" },
      { rule_key: "no_pricing_claim", rule_text: "Không đưa ra cam kết giá cụ thể nếu chưa xác nhận", severity: "medium" },
      { rule_key: "appropriate_age",   rule_text: "Nội dung phải phù hợp với mọi lứa tuổi", severity: "medium" },
    ];
    for (const r of safetyRules) {
      await client.query(`
        INSERT INTO ai_safety_rules (rule_key, rule_text, severity)
        VALUES ($1, $2, $3)
        ON CONFLICT (rule_key) DO UPDATE SET
          rule_text = EXCLUDED.rule_text,
          severity  = EXCLUDED.severity`,
        [r.rule_key, r.rule_text, r.severity]
      );
    }
    console.log("  [OK] Seed: ai_safety_rules");

    await client.query("COMMIT");
    console.log("\n[AIOC MIGRATION] Đã tạo 5 bảng + seed data. Thành công!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n[AIOC MIGRATION] Thất bại:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function rollback() {
  const client = await pool.connect();
  console.log("=== AIOC Rollback ===");
  try {
    await client.query("BEGIN");
    await client.query("DROP TABLE IF EXISTS ai_safety_rules CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_prompt_rules CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_brand_voices CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_task_routes CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_system_prompt_templates CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_media_settings CASCADE");
    await client.query("DROP TABLE IF EXISTS ai_providers CASCADE");
    await client.query("COMMIT");
    console.log("[AIOC ROLLBACK] Thành công!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[AIOC ROLLBACK] Thất bại:", err);
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
