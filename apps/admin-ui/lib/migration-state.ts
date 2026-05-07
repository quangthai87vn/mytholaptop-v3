/**
 * Migration State Service
 * Quản lý trạng thái migration trong database
 */

import { query, exec, transaction } from "@/lib/db";
import type {
  MigrationRun,
  MigrationItem,
  MigrationMapping,
  MigrationLog,
  MigrationConfig,
  MigrationRunStatus,
  MigrationStage,
  MigrationItemStatus,
  MigrationAction,
  MigrationSourceType,
} from "@/types/migration-server";

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new migration run
 */
export async function createMigrationRun(
  config: MigrationConfig
): Promise<MigrationRun> {
  const id = generateId("run");
  const now = new Date().toISOString();

  await exec(
    `INSERT INTO migration_runs (
      id, source, status, current_stage, total_items, processed_items,
      success_count, failed_count, skipped_count, created_count, updated_count,
      started_at, config, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      "wordpress",
      "idle",
      null,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      JSON.stringify(config),
      now,
      now,
    ]
  );

  return getMigrationRun(id) as Promise<MigrationRun>;
}

/**
 * Get migration run by ID
 */
export async function getMigrationRun(id: string): Promise<MigrationRun | null> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_runs WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return null;

  return transformRunFromDb(rows[0]);
}

/**
 * Get active migration run (running or paused)
 */
export async function getActiveMigrationRun(): Promise<MigrationRun | null> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_runs WHERE status IN ('running', 'paused') ORDER BY created_at DESC LIMIT 1`
  );

  if (rows.length === 0) return null;

  return transformRunFromDb(rows[0]);
}

/**
 * Get latest migration run
 */
export async function getLatestMigrationRun(): Promise<MigrationRun | null> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_runs ORDER BY created_at DESC LIMIT 1`
  );

  if (rows.length === 0) return null;

  return transformRunFromDb(rows[0]);
}

/**
 * Update migration run status
 */
export async function updateMigrationRunStatus(
  id: string,
  status: MigrationRunStatus
): Promise<void> {
  const updates: string[] = ["status = $2"];
  const params: unknown[] = [id, status];

  if (status === "running") {
    updates.push("started_at = NOW()");
  }

  if (status === "completed" || status === "failed" || status === "cancelled") {
    updates.push("finished_at = NOW()");
  }

  await exec(
    `UPDATE migration_runs SET ${updates.join(", ")} WHERE id = $1`,
    params
  );
}

/**
 * Update migration run stage and progress
 */
export async function updateMigrationRunProgress(
  id: string,
  data: {
    stage?: MigrationStage;
    totalItems?: number;
    processedItems?: number;
    successCount?: number;
    failedCount?: number;
    skippedCount?: number;
    createdCount?: number;
    updatedCount?: number;
  }
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [id];
  let paramIndex = 2;

  if (data.stage !== undefined) {
    updates.push(`current_stage = $${paramIndex++}`);
    params.push(data.stage);
  }
  if (data.totalItems !== undefined) {
    updates.push(`total_items = $${paramIndex++}`);
    params.push(data.totalItems);
  }
  if (data.processedItems !== undefined) {
    updates.push(`processed_items = $${paramIndex++}`);
    params.push(data.processedItems);
  }
  if (data.successCount !== undefined) {
    updates.push(`success_count = $${paramIndex++}`);
    params.push(data.successCount);
  }
  if (data.failedCount !== undefined) {
    updates.push(`failed_count = $${paramIndex++}`);
    params.push(data.failedCount);
  }
  if (data.skippedCount !== undefined) {
    updates.push(`skipped_count = $${paramIndex++}`);
    params.push(data.skippedCount);
  }
  if (data.createdCount !== undefined) {
    updates.push(`created_count = $${paramIndex++}`);
    params.push(data.createdCount);
  }
  if (data.updatedCount !== undefined) {
    updates.push(`updated_count = $${paramIndex++}`);
    params.push(data.updatedCount);
  }

  updates.push("last_checkpoint_at = NOW()");

  if (updates.length > 1) {
    await exec(
      `UPDATE migration_runs SET ${updates.join(", ")} WHERE id = $1`,
      params
    );
  }
}

/**
 * Set cancellation requested
 */
export async function setCancellationRequested(id: string, requested: boolean = true): Promise<void> {
  await exec(
    `UPDATE migration_runs SET cancellation_requested = $2 WHERE id = $1`,
    [id, requested]
  );
}

/**
 * Check if cancellation was requested
 */
export async function isCancellationRequested(id: string): Promise<boolean> {
  const { rows } = await query<{ cancellation_requested: boolean }>(
    `SELECT cancellation_requested FROM migration_runs WHERE id = $1`,
    [id]
  );
  return rows.length > 0 && rows[0].cancellation_requested;
}

// ============================================================
// Migration Items
// ============================================================

/**
 * Create migration items in batch
 */
export async function createMigrationItems(
  runId: string,
  items: Array<{
    sourceType: MigrationSourceType;
    sourceId?: string;
    sourceSlug?: string;
    sourceSku?: string;
    sourceHash?: string;
    batchNumber?: number;
  }>
): Promise<void> {
  if (items.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const item of items) {
    const id = generateId("item");
    values.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
    );
    params.push(
      id,
      runId,
      item.sourceType,
      item.sourceId || null,
      item.sourceSlug || null,
      item.sourceSku || null,
      item.sourceHash || null,
      item.batchNumber || 0
    );
  }

  await exec(
    `INSERT INTO migration_items (id, run_id, source_type, source_id, source_slug, source_sku, source_hash, batch_number)
     VALUES ${values.join(", ")}`,
    params
  );
}

/**
 * Get migration items by run and status
 */
export async function getMigrationItems(
  runId: string,
  status?: MigrationItemStatus,
  limit: number = 100
): Promise<MigrationItem[]> {
  let sql = `SELECT * FROM migration_items WHERE run_id = $1`;
  const params: unknown[] = [runId];

  if (status) {
    sql += ` AND status = $2`;
    params.push(status);
  }

  sql += ` ORDER BY batch_number, created_at LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await query<Record<string, unknown>>(sql, params);
  return rows.map(transformItemFromDb);
}

/**
 * Get pending/processing items for a run
 */
export async function getPendingItems(
  runId: string,
  limit: number = 50
): Promise<MigrationItem[]> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_items 
     WHERE run_id = $1 AND status IN ('pending', 'processing')
     ORDER BY batch_number, created_at 
     LIMIT $2`,
    [runId, limit]
  );
  return rows.map(transformItemFromDb);
}

/**
 * Update migration item status
 */
export async function updateMigrationItem(
  id: string,
  data: {
    status?: MigrationItemStatus;
    action?: MigrationAction;
    targetId?: string;
    errorMessage?: string;
    retryCount?: number;
  }
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [id];
  let paramIndex = 2;

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.action !== undefined) {
    updates.push(`action = $${paramIndex++}`);
    params.push(data.action);
  }
  if (data.targetId !== undefined) {
    updates.push(`target_id = $${paramIndex++}`);
    params.push(data.targetId);
  }
  if (data.errorMessage !== undefined) {
    updates.push(`error_message = $${paramIndex++}`);
    params.push(data.errorMessage);
  }
  if (data.retryCount !== undefined) {
    updates.push(`retry_count = $${paramIndex++}`);
    params.push(data.retryCount);
  }

  updates.push("last_processed_at = NOW()");

  if (updates.length > 1) {
    await exec(
      `UPDATE migration_items SET ${updates.join(", ")} WHERE id = $1`,
      params
    );
  }
}

/**
 * Get item statistics for a run
 */
export async function getMigrationItemStats(
  runId: string
): Promise<{
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  skipped: number;
}> {
  const { rows } = await query<{
    status: string;
    count: string;
  }>(
    `SELECT status, COUNT(*) as count FROM migration_items WHERE run_id = $1 GROUP BY status`,
    [runId]
  );

  const stats = {
    total: 0,
    pending: 0,
    processing: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const count = parseInt(row.count, 10);
    stats.total += count;
    
    switch (row.status) {
      case "pending":
        stats.pending = count;
        break;
      case "processing":
        stats.processing = count;
        break;
      case "success":
        stats.success = count;
        break;
      case "failed":
        stats.failed = count;
        break;
      case "skipped":
      case "duplicated":
      case "mapped":
        stats.skipped += count;
        break;
    }
  }

  return stats;
}

// ============================================================
// Migration Mappings
// ============================================================

/**
 * Save or update a mapping
 */
export async function saveMapping(mapping: {
  sourceType: MigrationSourceType;
  sourceId: string;
  sourceKey?: string;
  targetType: MigrationSourceType;
  targetId: string;
  targetHandle?: string;
  targetSku?: string;
  sourceHash?: string;
}): Promise<void> {
  const id = generateId("map");

  await exec(
    `INSERT INTO migration_mappings (
      id, source_type, source_id, source_key, target_type, target_id,
      target_handle, target_sku, source_hash, last_synced_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
    ON CONFLICT (source_type, source_id) 
    DO UPDATE SET 
      target_id = EXCLUDED.target_id,
      target_handle = EXCLUDED.target_handle,
      target_sku = EXCLUDED.target_sku,
      source_hash = EXCLUDED.source_hash,
      last_synced_at = NOW(),
      updated_at = NOW()`,
    [
      id,
      mapping.sourceType,
      mapping.sourceId,
      mapping.sourceKey || null,
      mapping.targetType,
      mapping.targetId,
      mapping.targetHandle || null,
      mapping.targetSku || null,
      mapping.sourceHash || null,
    ]
  );
}

/**
 * Get mapping by source
 */
export async function getMapping(
  sourceType: MigrationSourceType,
  sourceId: string
): Promise<MigrationMapping | null> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_mappings WHERE source_type = $1 AND source_id = $2`,
    [sourceType, sourceId]
  );

  if (rows.length === 0) return null;

  return transformMappingFromDb(rows[0]);
}

/**
 * Get mapping by target (e.g., find WooCommerce ID from Medusa product ID)
 */
export async function getMappingByTarget(
  targetType: MigrationSourceType,
  targetId: string
): Promise<MigrationMapping | null> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_mappings WHERE target_type = $1 AND target_id = $2`,
    [targetType, targetId]
  );

  if (rows.length === 0) return null;

  return transformMappingFromDb(rows[0]);
}

/**
 * Get all mappings by type
 */
export async function getAllMappings(
  sourceType: MigrationSourceType
): Promise<Map<string, MigrationMapping>> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_mappings WHERE source_type = $1`,
    [sourceType]
  );

  const map = new Map<string, MigrationMapping>();
  for (const row of rows) {
    const mapping = transformMappingFromDb(row);
    map.set(mapping.sourceId, mapping);
  }

  return map;
}

/**
 * Check if source hash has changed
 */
export async function hasSourceHashChanged(
  sourceType: MigrationSourceType,
  sourceId: string,
  newHash: string
): Promise<boolean> {
  const mapping = await getMapping(sourceType, sourceId);
  
  if (!mapping || !mapping.sourceHash) return true;
  
  return mapping.sourceHash !== newHash;
}

// ============================================================
// Migration Logs
// ============================================================

/**
 * Create a migration log entry
 */
export async function createMigrationLog(data: {
  runId: string;
  level?: "info" | "success" | "warning" | "error";
  stage?: MigrationStage;
  sourceType?: MigrationSourceType;
  sourceId?: string;
  message: string;
  payload?: Record<string, unknown>;
}): Promise<MigrationLog> {
  const id = generateId("log");

  await exec(
    `INSERT INTO migration_logs (id, run_id, level, stage, source_type, source_id, message, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      id,
      data.runId,
      data.level || "info",
      data.stage || null,
      data.sourceType || null,
      data.sourceId || null,
      data.message,
      data.payload ? JSON.stringify(data.payload) : null,
    ]
  );

  return {
    id,
    runId: data.runId,
    level: data.level || "info",
    stage: data.stage || null,
    sourceType: data.sourceType || null,
    sourceId: data.sourceId || null,
    message: data.message,
    payload: data.payload || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get recent logs for a run
 */
export async function getRecentLogs(
  runId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{ logs: MigrationLog[]; total: number }> {
  const [{ rows }, countResult] = await Promise.all([
    query<Record<string, unknown>>(
      `SELECT * FROM migration_logs WHERE run_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [runId, limit, offset]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM migration_logs WHERE run_id = $1`,
      [runId]
    ),
  ]);

  return {
    logs: rows.map(transformLogFromDb),
    total: parseInt(countResult.rows[0]?.count || "0", 10),
  };
}

/**
 * Get logs by level
 */
export async function getLogsByLevel(
  runId: string,
  level: string,
  limit: number = 100
): Promise<MigrationLog[]> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_logs WHERE run_id = $1 AND level = $2 ORDER BY created_at DESC LIMIT $3`,
    [runId, level, limit]
  );
  return rows.map(transformLogFromDb);
}

/**
 * Get failed items for a run
 */
export async function getFailedItems(runId: string): Promise<MigrationItem[]> {
  const { rows } = await query<Record<string, unknown>>(
    `SELECT * FROM migration_items WHERE run_id = $1 AND status = 'failed' ORDER BY created_at`,
    [runId]
  );
  return rows.map(transformItemFromDb);
}

// ============================================================
// Helper Functions
// ============================================================

function transformRunFromDb(row: Record<string, unknown>): MigrationRun {
  return {
    id: row.id as string,
    source: row.source as string,
    status: row.status as MigrationRunStatus,
    currentStage: row.current_stage as MigrationStage | null,
    totalItems: row.total_items as number,
    processedItems: row.processed_items as number,
    successCount: row.success_count as number,
    failedCount: row.failed_count as number,
    skippedCount: row.skipped_count as number,
    createdCount: row.created_count as number,
    updatedCount: row.updated_count as number,
    startedAt: row.started_at as string | null,
    finishedAt: row.finished_at as string | null,
    lastCheckpointAt: row.last_checkpoint_at as string | null,
    cancellationRequested: row.cancellation_requested as boolean,
    config: row.config as MigrationConfig | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformItemFromDb(row: Record<string, unknown>): MigrationItem {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    sourceType: row.source_type as MigrationSourceType,
    sourceId: row.source_id as string | null,
    sourceSlug: row.source_slug as string | null,
    sourceSku: row.source_sku as string | null,
    sourceHash: row.source_hash as string | null,
    targetId: row.target_id as string | null,
    status: row.status as MigrationItemStatus,
    action: row.action as MigrationAction | null,
    errorMessage: row.error_message as string | null,
    retryCount: row.retry_count as number,
    batchNumber: row.batch_number as number,
    lastProcessedAt: row.last_processed_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformMappingFromDb(row: Record<string, unknown>): MigrationMapping {
  return {
    id: row.id as string,
    sourceType: row.source_type as MigrationSourceType,
    sourceId: row.source_id as string,
    sourceKey: row.source_key as string | null,
    targetType: row.target_type as MigrationSourceType,
    targetId: row.target_id as string,
    targetHandle: row.target_handle as string | null,
    targetSku: row.target_sku as string | null,
    sourceHash: row.source_hash as string | null,
    lastSyncedAt: row.last_synced_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformLogFromDb(row: Record<string, unknown>): MigrationLog {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    level: row.level as "info" | "success" | "warning" | "error",
    stage: row.stage as MigrationStage | null,
    sourceType: row.source_type as MigrationSourceType | null,
    sourceId: row.source_id as string | null,
    message: row.message as string,
    payload: row.payload as Record<string, unknown> | null,
    createdAt: row.created_at as string,
  };
}
