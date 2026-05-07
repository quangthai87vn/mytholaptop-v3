// ============================================================
// Migration Types - Server-side state management
// ============================================================

export type MigrationRunStatus = "idle" | "running" | "paused" | "completed" | "failed" | "cancelled";
export type MigrationStage = 
  | "idle"
  | "fetching_categories"
  | "upserting_categories"
  | "fetching_tags"
  | "upserting_tags"
  | "fetching_products"
  | "upserting_products"
  | "verifying"
  | "completed";

export type MigrationItemStatus = "pending" | "processing" | "success" | "failed" | "skipped" | "duplicated" | "mapped";
export type MigrationAction = "create" | "update" | "skip" | "retry";
export type MigrationSourceType = "category" | "tag" | "image" | "product" | "variant";
export type MigrationLogLevel = "info" | "success" | "warning" | "error";

// ============================================================
// Migration Run
// ============================================================
export interface MigrationRun {
  id: string;
  source: string;
  status: MigrationRunStatus;
  currentStage: MigrationStage | null;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  createdCount: number;
  updatedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastCheckpointAt: string | null;
  cancellationRequested: boolean;
  config: MigrationConfig | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Migration Item
// ============================================================
export interface MigrationItem {
  id: string;
  runId: string;
  sourceType: MigrationSourceType;
  sourceId: string | null;
  sourceSlug: string | null;
  sourceSku: string | null;
  sourceHash: string | null;
  targetId: string | null;
  status: MigrationItemStatus;
  action: MigrationAction | null;
  errorMessage: string | null;
  retryCount: number;
  batchNumber: number;
  lastProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Migration Mapping
// ============================================================
export interface MigrationMapping {
  id: string;
  sourceType: MigrationSourceType;
  sourceId: string;
  sourceKey: string | null;
  targetType: MigrationSourceType;
  targetId: string;
  targetHandle: string | null;
  targetSku: string | null;
  sourceHash: string | null;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Migration Log
// ============================================================
export interface MigrationLog {
  id: string;
  runId: string;
  level: MigrationLogLevel;
  stage: MigrationStage | null;
  sourceType: MigrationSourceType | null;
  sourceId: string | null;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

// ============================================================
// Migration Config
// ============================================================
export interface MigrationConfig {
  wordpressUrl: string;
  wooConsumerKey: string;
  wooConsumerSecret: string;
  medusaBackendUrl: string;
  medusaAdminEmail: string;
  medusaAdminPassword: string;
  selectedTypes: MigrationSourceType[];
  conflictStrategy: "skip" | "update" | "create";
  migrationMode: "continue" | "restart";
  batchSize: number;
  skipOnError: boolean;
}

// ============================================================
// API Request/Response Types
// ============================================================
export interface StartMigrationRequest {
  config: MigrationConfig;
}

export interface MigrationStatusResponse {
  run: MigrationRun | null;
  recentLogs: MigrationLog[];
  stats: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
}

export interface MigrationLogsResponse {
  logs: MigrationLog[];
  total: number;
  hasMore: boolean;
}

export interface MigrationReportResponse {
  run: MigrationRun;
  byType: {
    [key in MigrationSourceType]?: {
      total: number;
      success: number;
      failed: number;
      skipped: number;
    };
  };
  errors: Array<{
    sourceType: MigrationSourceType;
    sourceId: string;
    message: string;
    retryCount: number;
  }>;
}
