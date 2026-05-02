/**
 * WooCommerce to Medusa Migration
 *
 * Export all modules for easy importing.
 * LUÔN LUÔN dùng WooCommerce REST API — KHÔNG kết nối MySQL WordPress trực tiếp.
 *
 * Usage:
 *   import { WooToMedusaMigrator } from "@/lib/migration";
 *   import { MedusaApiClient } from "@/lib/migration";
 *
 * Lưu ý: WooDatabaseConnector trong woo-connector.ts là DEPRECATED.
 * Không dùng trực tiếp MySQL — dùng WooCommerce REST API qua proxy.
 */

// CLI commands
export { cmdHelp, cmdStatus, cmdStats, cmdMigrate } from "./cli";

// CLI migration (dùng WooCommerce REST API)
export { WooToMedusaMigrator, runMigration } from "./woo-to-medusa";
export type { MigrationConfig } from "./woo-to-medusa";

// Medusa API client
export { MedusaApiClient, createMedusaClient } from "./medusa-api-client";
export type {
  MedusaMigrationConfig,
  MedusaProductForMigration,
  MedusaVariantForMigration,
  MedusaCategoryForMigration,
  MedusaTagForMigration,
  MedusaImageForMigration,
  MedusaExistingResources,
  MigrationMapping,
  MigrationCheckpoint,
  MigrationOptions,
  MigrationPlan,
} from "./medusa-migration-types";

// Data transformer
export { dataTransformer, DataTransformer } from "./data-transformer";

// WooCommerce types (REST API)
export type {
  WooProduct,
  WooProductMeta,
  WooProductImage,
  WooCategory,
  WooTag,
  WooTermRelationship,
  WooTermTaxonomy,
  WooAttribute,
  WooProductVariation,
  WooProductWithMeta,
  WooConfig,
  MigrationResult,
  MigrationStats,
  MigrationError,
  WooProductQueryResult,
  WooCategoryQueryResult,
} from "./woo-types";
