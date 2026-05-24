/**
 * Migration: Add provider FK and override columns to ai_task_routes
 *
 * Run: npx tsx sql/migration-routing-provider-fk.ts
 *
 * Changes:
 * 1. Add primary_provider_id (FK → ai_providers.id, nullable)
 * 2. Add primary_model_override (nullable text) — rename from model_name in code
 * 3. Add fallback_provider_id (FK → ai_providers.id, nullable)
 * 4. Add fallback_model_override (nullable text) — rename from fallback_model_name in code
 * 5. Add temperature_override, max_tokens_override, top_p_override (nullable numeric)
 * 6. Keep existing columns (provider_type, model_name, etc.) for backward compat
 *    but they become deprecated in code — routing resolver prefers the _id columns
 *
 * Backward compatibility strategy:
 * - Old DB columns (provider_type, model_name, temperature, max_tokens) are kept
 * - New code reads from the new columns when present, falls back to old columns
 * - CRUD layer maps old column names → new field names for the new TypeScript interfaces
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
  console.log("=== Migration: Routing Provider FK + Override Columns ===\n");

  try {
    await client.query("BEGIN");

    // ── Check existing columns ─────────────────────────────────────────────────

    const colsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ai_task_routes'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    const existingCols = new Set(colsResult.rows.map((r) => r.column_name));
    console.log("Existing columns:", [...existingCols].join(", "));

    // ── Add new columns (safe: only ADD IF NOT EXISTS) ────────────────────────

    const migrations: Array<{ sql: string; name: string }> = [
      {
        name: "primary_provider_id",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS primary_provider_id INTEGER
              REFERENCES ai_providers(id) ON DELETE SET NULL`,
      },
      {
        name: "primary_model_override",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS primary_model_override TEXT`,
      },
      {
        name: "fallback_provider_id",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS fallback_provider_id INTEGER
              REFERENCES ai_providers(id) ON DELETE SET NULL`,
      },
      {
        name: "fallback_model_override",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS fallback_model_override TEXT`,
      },
      {
        name: "temperature_override",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS temperature_override NUMERIC(3,2)`,
      },
      {
        name: "max_tokens_override",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS max_tokens_override INTEGER`,
      },
      {
        name: "top_p_override",
        sql: `ALTER TABLE ai_task_routes
              ADD COLUMN IF NOT EXISTS top_p_override NUMERIC(3,2)`,
      },
    ];

    for (const m of migrations) {
      if (existingCols.has(m.name)) {
        console.log(`  ⏭️  Skipped (exists): ${m.name}`);
        continue;
      }
      await client.query(m.sql);
      console.log(`  ✅ Added: ${m.name}`);
    }

    // ── Migrate existing data from old columns to new columns ─────────────────
    // Only do this if new columns exist and old columns have data

    const needsMigration =
      existingCols.has("provider_type") &&
      existingCols.has("primary_provider_id") &&
      existingCols.has("model_name") &&
      existingCols.has("primary_model_override");

    if (needsMigration) {
      console.log("\n── Migrating existing routing data ──");

      // Migrate primary_provider_id from provider_type slug → ai_providers.id
      const updatePrimary = await client.query(`
        UPDATE ai_task_routes AS r
        SET primary_provider_id = p.id,
            primary_model_override = r.model_name
        FROM ai_providers p
        WHERE r.provider_type = p.slug
          AND r.primary_provider_id IS NULL
          AND r.model_name IS NOT NULL
          AND r.model_name != ''
        RETURNING r.id, r.task_type, p.name as provider_name, r.model_name
      `);
      console.log(`  Primary provider FK: ${updatePrimary.rowCount ?? 0} rows migrated`);

      // Migrate fallback
      const updateFallback = await client.query(`
        UPDATE ai_task_routes AS r
        SET fallback_provider_id = p.id,
            fallback_model_override = r.fallback_model_name
        FROM ai_providers p
        WHERE r.fallback_provider_type = p.slug
          AND r.fallback_provider_id IS NULL
          AND r.fallback_model_name IS NOT NULL
          AND r.fallback_model_name != ''
        RETURNING r.id, r.task_type
      `);
      console.log(`  Fallback provider FK: ${updateFallback.rowCount ?? 0} rows migrated`);

      // Migrate temperature/max_tokens overrides
      const updateOverrides = await client.query(`
        UPDATE ai_task_routes
        SET temperature_override = temperature,
            max_tokens_override = max_tokens
        WHERE temperature_override IS NULL
          AND temperature IS NOT NULL
          AND temperature != 0.7
        RETURNING id
      `);
      console.log(`  Temperature override: ${updateOverrides.rowCount ?? 0} rows migrated`);

      if ((updatePrimary.rowCount ?? 0) > 0) {
        console.log("\n  Sample migrated routes:");
        for (const row of updatePrimary.rows.slice(0, 5)) {
          console.log(`    [${row.id}] ${row.task_type} → ${row.provider_name} / ${row.model_name}`);
        }
      }
    }

    // ── Create indexes ───────────────────────────────────────────────────────

    const existingIdx = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'ai_task_routes'
    `);
    const existingIndexes = new Set(existingIdx.rows.map((r) => r.indexname));

    if (!existingIndexes.has("ai_task_routes_primary_provider_id_idx")) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS ai_task_routes_primary_provider_id_idx
        ON ai_task_routes(primary_provider_id)
        WHERE primary_provider_id IS NOT NULL
      `);
      console.log("\n  ✅ Created index: ai_task_routes_primary_provider_id_idx");
    }

    if (!existingIndexes.has("ai_task_routes_fallback_provider_id_idx")) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS ai_task_routes_fallback_provider_id_idx
        ON ai_task_routes(fallback_provider_id)
        WHERE fallback_provider_id IS NOT NULL
      `);
      console.log("  ✅ Created index: ai_task_routes_fallback_provider_id_idx");
    }

    // ── Add comments ──────────────────────────────────────────────────────────

    await client.query(`
      COMMENT ON COLUMN ai_task_routes.primary_provider_id IS
        'FK to ai_providers.id. Primary AI provider for this routing rule.';
      COMMENT ON COLUMN ai_task_routes.primary_model_override IS
        'Override model. If null/empty, routing resolver uses provider.default_model.';
      COMMENT ON COLUMN ai_task_routes.fallback_provider_id IS
        'FK to ai_providers.id. Fallback provider when primary fails.';
      COMMENT ON COLUMN ai_task_routes.fallback_model_override IS
        'Fallback model override. If null/empty, uses fallback provider default.';
      COMMENT ON COLUMN ai_task_routes.temperature_override IS
        'Override temperature. If null, uses provider runtime config.';
      COMMENT ON COLUMN ai_task_routes.max_tokens_override IS
        'Override max tokens. If null, uses provider runtime config.';
      COMMENT ON COLUMN ai_task_routes.top_p_override IS
        'Override top_p. If null, uses provider runtime config.';
    `);
    console.log("\n  ✅ Added column comments");

    await client.query("COMMIT");
    console.log("\n✅ Migration completed successfully!");
    console.log("");
    console.log("Schema changes summary:");
    console.log("  • ai_task_routes now has primary_provider_id FK column");
    console.log("  • ai_task_routes now has override columns (model, temp, max_tokens, top_p)");
    console.log("  • Old columns (provider_type, model_name, temperature, max_tokens) are kept for backward compat");
    console.log("  • New routing code reads new columns first, falls back to old columns");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
