/**
 * Medusa Types for Migration
 *
 * Type definitions dùng cho việc migrate từ WooCommerce sang Medusa.
 * Mở rộng từ medusa-types.ts gốc với các fields cần thiết cho migration.
 */

import type { CreateProductInput, CreateCategoryInput } from "@/services/medusa-types";

export interface MedusaMigrationConfig {
  backendUrl: string;
  /** API key (dạng sk_xxx) hoặc JWT token (dạng eyJxxx) */
  adminApiKey?: string;
  /** Email để authenticate qua JWT (dùng thay cho adminApiKey) */
  adminEmail?: string;
  /** Password để authenticate qua JWT */
  adminPassword?: string;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
  dryRun: boolean;
  skipImages: boolean;
  skipVariants: boolean;
  preserveIds: boolean;
}

export interface MedusaProductForMigration {
  title: string;
  subtitle?: string;
  description?: string;
  handle?: string;
  status: 'draft' | 'published';
  is_giftcard: boolean;
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
  thumbnail?: string;
  categories: { id: string }[];
  tags: { id?: string; value: string }[];
  variants: MedusaVariantForMigration[];
  images: { url: string }[];
  options?: { title: string; values: string[] }[];
  metadata: Record<string, unknown>;
}

export interface MedusaVariantForMigration {
  title: string;
  sku?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  price: number;
  original_price?: number;
  inventory_quantity: number;
  allow_backorder: boolean;
  manage_inventory: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  options?: { value: string }[];
  metadata: Record<string, unknown>;
}

export interface MedusaCategoryForMigration extends CreateCategoryInput {
  sourceId?: string;
  sourceSlug?: string;
}

export interface MedusaTagForMigration {
  value: string;
  sourceId?: string;
  sourceSlug?: string;
}

export interface MedusaImageForMigration {
  url: string;
  sourceId?: string;
  sourceUrl?: string;
}

export interface MedusaExistingResources {
  categories: Map<string, string>;
  tags: Map<string, string>;
  products: Map<string, string>;
}

export interface MigrationMapping {
  categoryIdMap: Map<string, string>;
  tagIdMap: Map<string, string>;
  productIdMap: Map<string, string>;
  handleMap: Map<string, string>;
}

export interface MigrationCheckpoint {
  lastProductId: string;
  lastCategoryId: string;
  lastTagId: string;
  processedProducts: number;
  processedCategories: number;
  processedTags: number;
  errors: string[];
  timestamp: Date;
}

export interface MigrationOptions {
  source: 'woocommerce' | 'wordpress' | 'csv' | 'json';
  mode: 'full' | 'incremental' | 'dry-run';
  startDate?: Date;
  endDate?: Date;
  productIds?: string[];
  categoryIds?: string[];
  preserveSourceIds: boolean;
  mapSourceImages: boolean;
  createMissingCategories: boolean;
  createMissingTags: boolean;
  setProductsPublished: boolean;
}

export interface MigrationPlan {
  options: MigrationOptions;
  config: MedusaMigrationConfig;
  estimatedProducts: number;
  estimatedCategories: number;
  estimatedTags: number;
  warnings: string[];
}
