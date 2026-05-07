-- Migration State Tables for WordPress/WooCommerce to Medusa
-- Run this in Medusa database

-- ============================================================
-- migration_runs: Track overall migration run status
-- ============================================================
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

-- ============================================================
-- migration_items: Track individual item migration status
-- ============================================================
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
);

CREATE INDEX IF NOT EXISTS idx_migration_items_run_id ON migration_items(run_id);
CREATE INDEX IF NOT EXISTS idx_migration_items_source_type ON migration_items(source_type);
CREATE INDEX IF NOT EXISTS idx_migration_items_status ON migration_items(status);
CREATE INDEX IF NOT EXISTS idx_migration_items_source_id ON migration_items(source_id);
CREATE INDEX IF NOT EXISTS idx_migration_items_target_id ON migration_items(target_id);

-- ============================================================
-- migration_mappings: Map WooCommerce IDs to Medusa IDs
-- ============================================================
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
CREATE INDEX IF NOT EXISTS idx_migration_mappings_target_sku ON migration_mappings(target_type, target_sku);
CREATE INDEX IF NOT EXISTS idx_migration_mappings_target_handle ON migration_mappings(target_type, target_handle);

-- ============================================================
-- migration_logs: Detailed logs for each migration action
-- ============================================================
CREATE TABLE IF NOT EXISTS migration_logs (
  id VARCHAR(255) PRIMARY KEY,
  run_id VARCHAR(255) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  stage VARCHAR(50),
  source_type VARCHAR(50),
  source_id VARCHAR(255),
  message TEXT NOT NULL,
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES migration_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_migration_logs_run_id ON migration_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level);
CREATE INDEX IF NOT EXISTS idx_migration_logs_created_at ON migration_logs(created_at);

-- ============================================================
-- Trigger to auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_migration_runs_updated_at BEFORE UPDATE ON migration_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_migration_items_updated_at BEFORE UPDATE ON migration_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_migration_mappings_updated_at BEFORE UPDATE ON migration_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
