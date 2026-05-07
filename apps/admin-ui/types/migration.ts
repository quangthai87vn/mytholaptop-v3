// ============================================================
// Migration Configuration
// ============================================================

import type { ImageUploadConfig } from "@/types/media-mapping";

export interface MigrationConfig {
  wordpressUrl: string;
  wooConsumerKey: string;
  wooConsumerSecret: string;
  medusaAdminKey?: string;
  medusaAdminEmail?: string;
  medusaAdminPassword?: string;
  medusaBackendUrl: string;
  /** Admin-UI URL — dùng làm CDN cho ảnh đã migrate */
  adminUiUrl?: string;
}

export type ConflictStrategy = "skip" | "update" | "create";

/**
 * Migration mode:
 * - "continue": resume from last checkpoint (skip already-migrated items)
 * - "restart": clear all migrated data first, then migrate fresh
 */
export type MigrationMode = "continue" | "restart";

export type MigrationDataType =
  | "categories"
  | "products"
  | "mainImage"
  | "gallery"
  | "shortDesc"
  | "longDesc"
  | "variants"
  | "inventory"
  | "tags";

// ============================================================
// WooCommerce Types (raw from API)
// ============================================================

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  count: number;
  image?: {
    id: number;
    src: string;
    name: string;
    alt: string;
  };
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  type: "simple" | "variable" | "grouped" | "external";
  status: "draft" | "pending" | "publish" | "private";
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  manage_stock: boolean | undefined;
  categories: Array<{ id: number; name: string }>;
  tags: Array<{ id: number; name: string }>;
  images: WooImage[];
  attributes: WooAttribute[];
  variations: WooVariation[];
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  meta_data: WooMetaData[];
}

/**
 * WooCommerce Product Tag from API
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#product-tags
 */
export interface WooTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface WooImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WooAttribute {
  id: number;
  name: string;
  slug: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooVariation {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  attributes: Array<{ id: number; name: string; option: string }>;
}

export interface WooMetaData {
  id: number;
  key: string;
  value: string | string[];
}

// ============================================================
// Medusa Types (transformed for Medusa API)
// ============================================================

export interface MedusaCategory {
  name: string;
  description?: string;
  handle?: string;
  parent_category_id?: string;
  metadata?: Record<string, string | null>;
}

export interface MedusaProduct {
  title: string;
  subtitle?: string;
  description: string;
  short_description?: string;
  handle?: string;
  status?: "draft" | "published" | "proposed" | "rejected";
  thumbnail?: string;
  // Medusa v2 Admin API: Array<{ url: string }> — NO metadata
  images?: Array<{ url: string }>;
  variants: MedusaVariant[];
  options?: MedusaOption[];
  tags?: Array<{ id: string; value: string }>;
  metadata?: Record<string, string>;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  // Extended fields for migration
  originalSku?: string;
  originalId?: number;
  // Store WooCommerce category IDs for later assignment
  categoryIds?: number[];
  // Categories array for create/update (Medusa v2 Admin API)
  categories?: Array<{ id: string }>;
}

export interface MedusaVariant {
  title: string;
  sku: string;
  prices?: Array<{
    amount: number;
    currency_code: string;
  }>;
  options?: Record<string, string>;
  inventory_quantity?: number;
  manage_inventory?: boolean;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  metadata?: Record<string, string>;
  // Extended
  originalSku?: string;
  originalId?: number;
}

export interface MedusaOption {
  title: string;
  values?: string[];
}

// ============================================================
// Transform Types
// ============================================================

export interface TransformResult<T> {
  success: boolean;
  data?: T;
  errors: TransformError[];
  warnings: TransformWarning[];
}

export interface TransformError {
  field: string;
  message: string;
  productId?: number;
}

export interface TransformWarning {
  field: string;
  message: string;
  productId?: number;
}

export interface ImageTransformResult {
  originalUrl: string;
  transformedUrl: string;
  status: "kept" | "uploaded" | "failed";
  error?: string;
}

// ============================================================
// Migration Pipeline Types
// ============================================================

export type MigrationPhase =
  | "idle"
  | "connecting"
  | "fetching"
  | "clearing"
  | "clearing_categories"
  | "clearing_products"
  | "transforming"
  | "uploading_categories"
  | "uploading"
  | "migrating_categories"
  | "migrating_tags"
  | "migrating_products"
  | "media_migration"
  | "done"
  | "failed"
  | "rolling_back"
  | "rolling_back_products"
  | "rolling_back_categories"
  | "rollback_done"
  | "rollback_failed"
  | "cancelled";

export interface RollbackStats {
  total: number;
  deleted: number;
  errors: number;
  failedItems: string[];
}

export interface MigrationProgress {
  phase: MigrationPhase;
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  currentItemName?: string;
  currentItemIndex?: number;
  successCount: number;
  failCount: number;
  startTime?: string;
  endTime?: string;
  errors: MigrationError[];
  rollbackStats?: RollbackStats;
  rollbackProgress?: number;
  /** Media migration progress tracking */
  mediaProgress?: {
    totalProducts: number;
    processedProducts: number;
  };
}

export interface MigrationError {
  itemId: string;
  itemName: string;
  phase: MigrationPhase;
  message: string;
  retryable: boolean;
  timestamp: string;
}

export interface MigrationStats {
  totalCategories: number;
  migratedCategories: number;
  totalProducts: number;
  migratedProducts: number;
  failedProducts: number;
  skippedProducts: number;
  totalVariants: number;
  migratedVariants: number;
}

// ============================================================
// Category Mapping (WordPress → Medusa)
// ============================================================

export interface CategoryMapping {
  wordpressCategoryId: number;
  wordpressCategoryName: string;
  wordpressSlug: string;
  wordpressParentId: number | null;
  medusaCategoryId: string;
  medusaCategoryName: string;
  medusaCategoryHandle: string;
  migratedAt: string;
}

export interface CategoryMappingStore {
  version: number;
  wordpressUrl: string;
  medusaBackendUrl: string;
  mappings: CategoryMapping[];
  exportedAt: string;
}

export interface IdMapping {
  categories: Record<number, string>; // wooId → medusaId
  products: Record<number, string>; // wooId → medusaId
  images: Record<number, string>; // wooImageId → medusaImageId
  tags: Record<number, string>; // wooTagId → medusaTagId
}

/**
 * Category mapping storage utilities.
 * Provides export/import of category mappings as JSON.
 */
export const categoryMappingStorage = {
  STORAGE_KEY: "mtl_category_mapping",

  save(mappings: CategoryMapping[], wordpressUrl: string, medusaBackendUrl: string): void {
    if (typeof window === "undefined") return;
    const store: CategoryMappingStore = {
      version: 1,
      wordpressUrl,
      medusaBackendUrl,
      mappings,
      exportedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    // Also sync to legacy IdMapping format for migration.service.ts compatibility
    const idMapping: IdMapping = {
      categories: {},
      products: {},
      images: {},
      tags: {},
    };
    mappings.forEach((m) => {
      idMapping.categories[m.wordpressCategoryId] = m.medusaCategoryId;
    });
    localStorage.setItem("mtl_migration_mapping", JSON.stringify(idMapping));
  },

  load(): CategoryMapping[] {
    if (typeof window === "undefined") return [];

    // Try new format first
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const store = JSON.parse(saved) as CategoryMappingStore;
        return store.mappings || [];
      } catch {
        // fall through to legacy format
      }
    }

    // Fallback: read from legacy IdMapping format used by migration.service.ts
    const legacy = localStorage.getItem("mtl_migration_mapping");
    if (legacy) {
      try {
        const idMapping = JSON.parse(legacy) as { categories: Record<number, string> };
        return Object.entries(idMapping.categories).map(([wooIdStr, medusaId]) => ({
          wordpressCategoryId: parseInt(wooIdStr, 10),
          wordpressCategoryName: "",
          wordpressSlug: "",
          wordpressParentId: null,
          medusaCategoryId: medusaId,
          medusaCategoryName: "",
          medusaCategoryHandle: "",
          migratedAt: new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    }

    return [];
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  },

  exportAsJson(): string {
    const mappings = this.load();
    const store: CategoryMappingStore = {
      version: 1,
      wordpressUrl: "",
      medusaBackendUrl: "",
      mappings,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(store, null, 2);
  },

  importFromJson(json: string): { success: boolean; count: number; error?: string } {
    try {
      const store = JSON.parse(json) as CategoryMappingStore;
      if (!Array.isArray(store.mappings)) {
        return { success: false, count: 0, error: "Invalid format: mappings is not an array" };
      }
      // Validate structure
      for (const m of store.mappings) {
        if (
          typeof m.wordpressCategoryId !== "number" ||
          !m.medusaCategoryId ||
          typeof m.medusaCategoryId !== "string"
        ) {
          return {
            success: false,
            count: 0,
            error: `Invalid mapping entry: missing required fields`,
          };
        }
      }
      const merged = this.load();
      const existingIds = new Set(merged.map((m) => m.wordpressCategoryId));
      const newMappings = store.mappings.filter(
        (m) => !existingIds.has(m.wordpressCategoryId)
      );
      this.save([...merged, ...newMappings], store.wordpressUrl, store.medusaBackendUrl);
      return { success: true, count: newMappings.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return { success: false, count: 0, error: `Parse error: ${msg}` };
    }
  },

  getMedusaId(wordpressId: number): string | null {
    const mappings = this.load();
    return mappings.find((m) => m.wordpressCategoryId === wordpressId)?.medusaCategoryId ?? null;
  },

  getUnmapped(wooCategoryIds: number[]): number[] {
    const mappings = this.load();
    const mappedIds = new Set(mappings.map((m) => m.wordpressCategoryId));
    return wooCategoryIds.filter((id) => !mappedIds.has(id));
  },
};

export interface MigrationHistory {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: "in_progress" | "completed" | "failed" | "rolled_back";
  config: MigrationConfig;
  selectedTypes: MigrationDataType[];
  conflictStrategy: ConflictStrategy;
  stats: MigrationStats;
  mapping: IdMapping;
  errors: MigrationError[];
}

// ============================================================
// Migration Log (UI)
// ============================================================

export interface MigrationLog {
  id: string;
  step: string;
  action: string;
  status: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

export interface MigrationStep {
  id: string;
  name: string;
  status: "pending" | "running" | "success" | "failed";
  progress: number;
  message?: string;
  startTime?: string;
  endTime?: string;
}

// ============================================================
// UI State Types
// ============================================================

export interface ConnectionState {
  status: "idle" | "connecting" | "success" | "failed";
  message?: string;
  testedAt?: string;
}

export interface PreviewState {
  categories: WooCategory[];
  products: WooProduct[];
  isLoading: boolean;
  error?: string;
}

export interface PreviewValidation {
  productId: number;
  productName: string;
  issues: Array<{
    type: "error" | "warning";
    field: string;
    message: string;
  }>;
}

export interface MigrationOptions {
  selectedTypes: MigrationDataType[];
  conflictStrategy: ConflictStrategy;
  migrationMode: MigrationMode;
  /** @deprecated No longer used — clear data is always implicit before migration */
  allowDelete?: never;
  batchSize: number;
  skipOnError: boolean;
  /** @deprecated Use mediaOptions instead */
  preserveImages: boolean;
  /** Cấu hình upload ảnh — từ popup Tuỳ chọn */
  imageConfig?: ImageUploadConfig;
  /** Media migration options */
  mediaOptions?: {
    downloadThumbnails?: boolean;
    downloadGallery?: boolean;
    downloadCategoryImages?: boolean;
    downloadDescriptionImages?: boolean;
    downloadShortDescImages?: boolean;
    rewriteHtmlDescriptions?: boolean;
    reuseExistingMedia?: boolean;
    /** When true: migrate each product WITH its images inline (synchronous).
     * When false: batch migrate images after all products are created.
     * Default: false */
    inlineProductMedia?: boolean;
    onlyFromWordpressDomain?: boolean;
    imageUploadConfig?: {
      enabled?: boolean;
      uploadRootDir?: string;
      uploadPublicPath?: string;
      imageFolderPattern?: string;
      imageFileNameMode?: "keep-original-name" | "product-slug" | "source-hash" | "product-sku";
      imageConflictStrategy?: "skip" | "overwrite" | "rename";
      imageSaveMode?: "relative_path" | "absolute_url";
    };
  };
}
