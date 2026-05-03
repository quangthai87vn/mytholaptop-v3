/**
 * Media Mapping & Deduplication Types
 *
 * Chiến lược deduplication:
 * - Key = SHA256(normalizeUrl(sourceUrl)) → đảm bảo cùng 1 image URL chỉ download 1 lần
 * - description image trùng với gallery → cùng 1 file trong pool
 * - Mỗi product/category lưu manifest ghi "usage" của từng image trong pool
 * - Tránh ghi trùng: pool chỉ lưu file 1 lần, usage ghi theo reference
 */

export type MediaUsageType =
  | "product_thumbnail"
  | "product_gallery"
  | "product_description"
  | "product_short_description"
  | "category_image";

export type MediaDownloadStatus =
  | "pending"
  | "downloading"
  | "downloaded"
  | "reused"
  | "failed"
  | "skipped";

/** Global media mapping pool entry — unique per source URL */
export interface MediaMappingEntry {
  /** SHA256(normalizeUrl(sourceUrl)) — 32 hex chars */
  urlHash: string;
  /** Original source URL from WordPress/WooCommerce */
  sourceUrl: string;
  /** WooCommerce image ID if available */
  sourceMediaId?: number;
  /** WooCommerce product/category ID that first requested this image */
  sourceOwnerId?: number;
  /** "product" | "category" */
  sourceOwnerType?: "product" | "category";
  /** MIME type from HTTP response */
  mimeType: string;
  /** File size in bytes */
  fileSize: number;
  /** SHA256 of downloaded file content (null if not downloaded yet) */
  contentHash?: string;
  /** Relative path stored in Medusa DB: /uploads/migration/wordpress/media/{hash}/file.ext */
  relativePath?: string;
  /** Full local path on disk: apps/admin-ui/public/uploads/migration/wordpress/media/{hash}/file.ext */
  absolutePath?: string;
  /** Sanitized filename */
  fileName: string;
  /** Download status */
  status: MediaDownloadStatus;
  /** Error message if failed */
  errorMessage?: string;
  /** Timestamp when first added to pool */
  createdAt: string;
  /** Timestamp when status last changed */
  updatedAt: string;
  /** Retry count */
  retryCount: number;
}

/**
 * Media usage record — tracks how a product/category uses images from the pool.
 * One entry per usage, prevents duplicate entries in same product/category.
 */
export interface MediaUsageRecord {
  /** Reference to MediaMappingEntry.urlHash */
  urlHash: string;
  usageType: MediaUsageType;
  /** Which product/category owns this usage */
  ownerId: number;
  ownerType: "product" | "category";
  /** For gallery images: index in gallery array */
  galleryIndex?: number;
  /** Timestamp */
  createdAt: string;
}

/** Per-product media manifest — stored in product metadata */
export interface ProductMediaManifest {
  /** WooCommerce product ID */
  wooProductId: number;
  /** WooCommerce product name (for debugging) */
  wooProductName: string;
  /** All image URL hashes used by this product */
  imageHashes: string[];
  /** Total images in this product's manifest */
  totalImages: number;
  /** Successfully downloaded images count */
  downloadedImages: number;
  /** Failed images count */
  failedImages: number;
  /** Migration timestamp */
  migratedAt: string;
  /** All unique source URLs (for debugging/validation) */
  sourceUrls: string[];
}

/** Per-category media manifest — stored in category metadata */
export interface CategoryMediaManifest {
  wooCategoryId: number;
  wooCategoryName: string;
  imageHash?: string;
  relativePath?: string;
  sourceUrl?: string;
  status: MediaDownloadStatus;
  migratedAt: string;
}

/** Media migration statistics */
export interface MediaMigrationStats {
  totalImages: number;
  downloaded: number;
  reused: number;
  failed: number;
  skipped: number;
  totalProducts: number;
  productsWithImages: number;
  productsWithFailedImages: number;
  totalSizeBytes: number;
  warnings: string[];
}

/** Media migration options */
export interface MediaMigrationOptions {
  downloadThumbnails: boolean;
  downloadGallery: boolean;
  downloadCategoryImages: boolean;
  downloadDescriptionImages: boolean;
  downloadShortDescImages: boolean;
  rewriteHtmlDescriptions: boolean;
  reuseExistingMedia: boolean;
  maxRetries: number;
  timeoutMs: number;
  maxFileSizeBytes: number;
  /** When true: migrate each product WITH its images inline (synchronous). Default: false */
  inlineProductMedia: boolean;
}

// ============================================================
// DEFAULT OPTIONS
// ============================================================

export const DEFAULT_MEDIA_OPTIONS: MediaMigrationOptions = {
  downloadThumbnails: true,
  downloadGallery: true,
  downloadCategoryImages: true,
  downloadDescriptionImages: true,
  downloadShortDescImages: true,
  rewriteHtmlDescriptions: true,
  reuseExistingMedia: true,
  maxRetries: 3,
  timeoutMs: 30000,
  maxFileSizeBytes: 20 * 1024 * 1024, // 20MB
  inlineProductMedia: true, // Default: migrate each product WITH its images inline
};

// ============================================================
// STORAGE KEYS
// ============================================================

export const MEDIA_STORAGE_KEYS = {
  /** Global deduplication pool: Record<urlHash, MediaMappingEntry> */
  MEDIA_POOL: "mtl_media_pool",
  /** Per-product manifest: Record<wooProductId, ProductMediaManifest> */
  PRODUCT_MANIFESTS: "mtl_media_product_manifests",
  /** Per-category manifest: Record<wooCategoryId, CategoryMediaManifest> */
  CATEGORY_MANIFESTS: "mtl_media_category_manifests",
  /** Usage records: MediaUsageRecord[] */
  USAGE_RECORDS: "mtl_media_usage_records",
  /** Media migration stats */
  MEDIA_STATS: "mtl_media_stats",
} as const;

// ============================================================
// STORAGE UTILITIES
// ============================================================

export const mediaStorage = {
  STORAGE_KEYS: MEDIA_STORAGE_KEYS,

  /** Load global media pool */
  loadPool(): Record<string, MediaMappingEntry> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(MEDIA_STORAGE_KEYS.MEDIA_POOL);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /** Save global media pool */
  savePool(pool: Record<string, MediaMappingEntry>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(MEDIA_STORAGE_KEYS.MEDIA_POOL, JSON.stringify(pool));
  },

  /** Load product manifests */
  loadProductManifests(): Record<number, ProductMediaManifest> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(MEDIA_STORAGE_KEYS.PRODUCT_MANIFESTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /** Save product manifests */
  saveProductManifests(manifests: Record<number, ProductMediaManifest>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(MEDIA_STORAGE_KEYS.PRODUCT_MANIFESTS, JSON.stringify(manifests));
  },

  /** Load category manifests */
  loadCategoryManifests(): Record<number, CategoryMediaManifest> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(MEDIA_STORAGE_KEYS.CATEGORY_MANIFESTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /** Save category manifests */
  saveCategoryManifests(manifests: Record<number, CategoryMediaManifest>): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(MEDIA_STORAGE_KEYS.CATEGORY_MANIFESTS, JSON.stringify(manifests));
  },

  /** Load usage records */
  loadUsageRecords(): MediaUsageRecord[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(MEDIA_STORAGE_KEYS.USAGE_RECORDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Save usage records */
  saveUsageRecords(records: MediaUsageRecord[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(MEDIA_STORAGE_KEYS.USAGE_RECORDS, JSON.stringify(records));
  },

  /** Load media stats */
  loadStats(): MediaMigrationStats | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(MEDIA_STORAGE_KEYS.MEDIA_STATS);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Save media stats */
  saveStats(stats: MediaMigrationStats): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(MEDIA_STORAGE_KEYS.MEDIA_STATS, JSON.stringify(stats));
  },

  /** Clear all media migration data */
  clearAll(): void {
    if (typeof window === "undefined") return;
    Object.values(MEDIA_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  /** Clear only pool (keep manifests for retry) */
  clearPool(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(MEDIA_STORAGE_KEYS.MEDIA_POOL);
  },
};
