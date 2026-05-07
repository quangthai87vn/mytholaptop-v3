import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";

/**
 * POST /api/migration/init
 * Initialize migration tables in database
 */
export async function POST(request: NextRequest) {
  try {
    // Create migration_runs table
    await exec(`
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
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await exec(`
      CREATE INDEX IF NOT EXISTS idx_migration_runs_status ON migration_runs(status);
      CREATE INDEX IF NOT EXISTS idx_migration_runs_created_at ON migration_runs(created_at DESC);
    `);

    // Create migration_items table
    await exec(`
      CREATE TABLE IF NOT EXISTS migration_items (
        id VARCHAR(255) PRIMARY KEY,
        run_id VARCHAR(255) NOT NULL,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
      )
    `);

    await exec(`
      CREATE INDEX IF NOT EXISTS idx_migration_items_run_id ON migration_items(run_id);
      CREATE INDEX IF NOT EXISTS idx_migration_items_source_type ON migration_items(source_type);
      CREATE INDEX IF NOT EXISTS idx_migration_items_status ON migration_items(status);
      CREATE INDEX IF NOT EXISTS idx_migration_items_source_id ON migration_items(source_id);
      CREATE INDEX IF NOT EXISTS idx_migration_items_target_id ON migration_items(target_id);
    `);

    // Create migration_mappings table
    await exec(`
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

    await exec(`
      CREATE INDEX IF NOT EXISTS idx_migration_mappings_source ON migration_mappings(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_migration_mappings_target ON migration_mappings(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_migration_mappings_sku ON migration_mappings(target_type, target_sku);
      CREATE INDEX IF NOT EXISTS idx_migration_mappings_handle ON migration_mappings(target_type, target_handle);
    `);

    // Create migration_logs table
    await exec(`
      CREATE TABLE IF NOT EXISTS migration_logs (
        id VARCHAR(255) PRIMARY KEY,
        run_id VARCHAR(255) NOT NULL,
        level VARCHAR(20) NOT NULL DEFAULT 'info',
        stage VARCHAR(50),
        source_type VARCHAR(50),
        source_id VARCHAR(255),
        message TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
      )
    `);

    await exec(`
      CREATE INDEX IF NOT EXISTS idx_migration_logs_run_id ON migration_logs(run_id);
      CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level);
      CREATE INDEX IF NOT EXISTS idx_migration_logs_created_at ON migration_logs(created_at DESC);
    `);

    return NextResponse.json({
      success: true,
      message: "Migration tables initialized successfully",
    });
  } catch (error) {
    console.error("[Migration Init] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize tables" },
      { status: 500 }
    );
  }
}
