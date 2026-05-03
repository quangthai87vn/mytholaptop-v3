/**
 * Media Migration Service
 *
 * Chiến lược deduplication:
 * - Tất cả images (thumbnail + gallery + description) đều vào CHUNG pool theo URL hash
 * - Trùng URL → reuse file đã download, không tải lại
 * - description image trùng với gallery[0] → cùng 1 file trong pool
 * - Mỗi product/category lưu manifest ghi rõ usage
 *
 * Flow:
 * 1. Collect all image URLs from product (thumbnail + gallery + description + short_description)
 * 2. Normalize → hash each URL
 * 3. Check pool: downloaded? → reuse. pending? → skip. new? → download.
 * 4. Build per-product manifest + HTML rewrite
 * 5. Return transformed product with new paths
 */

import type {
  MediaMappingEntry,
  ProductMediaManifest,
  CategoryMediaManifest,
  MediaUsageRecord,
  MediaMigrationStats,
  MediaMigrationOptions,
  DEFAULT_MEDIA_OPTIONS,
} from "@/types/media-mapping";
import { mediaStorage } from "@/types/media-mapping";

import {
  sanitizeFileName,
  buildRelativePath,
  normalizeUrl,
  extractImageUrlsFromHtml,
  rewriteHtmlImages,
  extractProductDescriptionImages,
  inferMimeType,
  buildMediaUrl,
  isValidImageMimeType,
  isValidFileSize,
} from "@/lib/media-helpers";

import type { WooProduct, WooCategory } from "@/types";
import type { MedusaProduct } from "@/types";

const DEBUG = true;
function debug(...args: unknown[]) {
  if (DEBUG) console.debug("[MediaMigration]", ...args);
}

// ============================================================
// CORE TYPES
// ============================================================

export interface MediaMigrationContext {
  wordpressBaseUrl: string;
  medusaBackendUrl: string;
  jobId: string;
  onLog?: (message: string, type: "info" | "warn" | "error" | "success", detail?: Record<string, unknown>) => void;
}

export interface DownloadResult {
  urlHash: string;
  sourceUrl: string;
  relativePath?: string;
  status: "downloaded" | "reused" | "failed" | "skipped";
  error?: string;
}

export interface ProductMediaResult {
  wooProductId: number;
  thumbnail?: string;
  images?: Array<{ url: string }>;
  description: string;
  shortDescription: string;
  metadata: Record<string, string>;
  downloads: DownloadResult[];
  manifest: ProductMediaManifest;
}

export interface CategoryMediaResult {
  wooCategoryId: number;
  metadata: Record<string, string>;
  downloads: DownloadResult[];
  manifest: CategoryMediaManifest;
}

// ============================================================
// SERVICE
// ============================================================

export const mediaMigrationService = {
  // ============================================================
  // POOL MANAGEMENT
  // ============================================================

  /**
   * Load global deduplication pool from localStorage
   */
  loadPool(): Record<string, MediaMappingEntry> {
    return mediaStorage.loadPool();
  },

  /**
   * Save global deduplication pool
   */
  savePool(pool: Record<string, MediaMappingEntry>): void {
    mediaStorage.savePool(pool);
  },

  /**
   * Get or create a pool entry for a URL.
   * Returns existing entry if already in pool.
   */
  getOrCreatePoolEntry(
    pool: Record<string, MediaMappingEntry>,
    sourceUrl: string,
    options?: Partial<MediaMappingEntry>
  ): { entry: MediaMappingEntry; isNew: boolean } {
    const urlHash = this.hashSync(sourceUrl);
    const existing = pool[urlHash];

    if (existing) {
      debug(`[Pool] Reuse existing entry for URL hash ${urlHash}`);
      return { entry: existing, isNew: false };
    }

    const newEntry: MediaMappingEntry = {
      urlHash,
      sourceUrl,
      mimeType: inferMimeType(sourceUrl),
      fileSize: 0,
      fileName: "image",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      ...options,
    };

    pool[urlHash] = newEntry;
    debug(`[Pool] New entry added for URL hash ${urlHash}`);
    return { entry: newEntry, isNew: true };
  },

  /**
   * Sync hash function (uses btoa as sync fallback — SHA256 via crypto.subtle is async)
   */
  hashSync(sourceUrl: string): string {
    const normalized = normalizeUrl(sourceUrl);
    // Simple sync hash: base64 of normalized URL (browser-compatible)
    // For deduplication, exact URL match is already unique enough
    // SHA256 is preferred but requires async — see hashUrlAsync below
    try {
      return btoa(normalized).replace(/[+/=]/g, "").slice(0, 32);
    } catch {
      // Fallback: simple string hash
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 32);
    }
  },

  /**
   * Async hash using SHA256 (for precise deduplication)
   */
  async hashUrlAsync(sourceUrl: string): Promise<string> {
    const normalized = normalizeUrl(sourceUrl);
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  },

  // ============================================================
  // IMAGE DOWNLOAD (via Medusa backend upload)
  // ============================================================

  /**
   * Download image from source URL and upload to Medusa backend.
   * 1. Fetch image from source
   * 2. Upload to Medusa backend via proxy API route
   * 3. Update pool entry with result
   *
   * NOTE: Since admin-ui runs in browser, we need to proxy through Next.js API route.
   * The backend-medusa proxy handles the actual file upload to Medusa.
   */
  async downloadAndUploadImage(
    sourceUrl: string,
    poolEntry: MediaMappingEntry,
    context: MediaMigrationContext,
    options: MediaMigrationOptions
  ): Promise<DownloadResult> {
    const urlHash = poolEntry.urlHash;
    const fileName = sanitizeFileName(this.extractFileNameFromUrl(sourceUrl));
    const relativePath = buildRelativePath(urlHash, fileName);

    try {
      // Step 1: Fetch image from source (WordPress/WooCommerce)
      debug(`[Download] Fetching: ${sourceUrl}`);
      context.onLog?.(
        `[Media] Đang tải: ${sourceUrl}`,
        "info",
        { urlHash, fileName }
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

      // Use proxy to avoid CORS when fetching from WordPress
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(sourceUrl)}`;

      const fetchResponse = await fetch(proxyUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }

      // Validate content type
      const contentType = fetchResponse.headers.get("content-type") || "";
      const mimeType = contentType.split(";")[0].trim().toLowerCase();

      if (!isValidImageMimeType(mimeType)) {
        throw new Error(`Invalid content-type: ${contentType}. Expected image.`);
      }

      const blob = await fetchResponse.blob();
      const fileSize = blob.size;

      if (!isValidFileSize(fileSize, options.maxFileSizeBytes)) {
        throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB > ${(options.maxFileSizeBytes / 1024 / 1024).toFixed(0)}MB`);
      }

      debug(`[Download] Downloaded ${fileName} (${(fileSize / 1024).toFixed(1)}KB, ${mimeType})`);

      // Step 2: Upload to Medusa backend via proxy API route
      // The proxy handles token auth and forwards to Medusa backend
      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("destinationPath", relativePath); // Tell backend where to store
      formData.append("sourceUrl", sourceUrl);
      formData.append("jobId", context.jobId);

      const uploadUrl = `/api/medusa/upload-media?backendUrl=${encodeURIComponent(context.medusaBackendUrl)}`;

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: HTTP ${uploadResponse.status} — ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      debug(`[Download] Upload success:`, uploadResult);

      context.onLog?.(
        `[Media] Đã tải lên: ${fileName} → ${relativePath}`,
        "success",
        { urlHash, relativePath, size: fileSize }
      );

      return {
        urlHash,
        sourceUrl,
        relativePath,
        status: "downloaded",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (err instanceof Error && err.name === "AbortError") {
        debug(`[Download] Timeout for ${sourceUrl}`);
        context.onLog?.(`[Media] Timeout khi tải: ${sourceUrl}`, "warn", { urlHash });
      } else {
        debug(`[Download] Error for ${sourceUrl}:`, errorMessage);
        context.onLog?.(
          `[Media] Lỗi tải ảnh: ${sourceUrl} — ${errorMessage}`,
          "error",
          { urlHash }
        );
      }

      return {
        urlHash,
        sourceUrl,
        status: "failed",
        error: errorMessage,
      };
    }
  },

  // ============================================================
  // PRODUCT MEDIA MIGRATION
  // ============================================================

  /**
   * Process all images for a WooCommerce product.
   * Returns transformed product data with new paths and manifest.
   *
   * Flow:
   * 1. Collect all image URLs (thumbnail + gallery + description + short_description)
   * 2. For each URL: check pool → download if needed
   * 3. Build rewritten HTML for description/short_description
   * 4. Build per-product manifest
   * 5. Return new product payload
   */
  async migrateProductMedia(
    wooProduct: WooProduct,
    existingPool: Record<string, MediaMappingEntry>,
    context: MediaMigrationContext,
    options: MediaMigrationOptions
  ): Promise<{
    productData: Partial<MedusaProduct>;
    downloads: DownloadResult[];
    manifest: ProductMediaManifest;
  }> {
    const wooId = wooProduct.id;
    const downloads: DownloadResult[] = [];
    const urlHashToRelativePath: Record<string, string> = {};
    const allSourceUrls: string[] = [];
    const urlHashToSourceUrl: Record<string, string> = {};

    // Step 1: Collect all image URLs
    const thumbnailUrl = wooProduct.images?.[0]?.src || "";
    const galleryUrls = wooProduct.images?.slice(1).map((img) => img.src) || [];
    const descriptionUrls = extractImageUrlsFromHtml(wooProduct.description || "");
    const shortDescUrls = extractImageUrlsFromHtml(wooProduct.short_description || "");

    const allUrls = [
      ...(options.downloadThumbnails && thumbnailUrl ? [{ url: thumbnailUrl, type: "product_thumbnail" as const }] : []),
      ...(options.downloadGallery ? galleryUrls.map((url, i) => ({ url, type: "product_gallery" as const, index: i })) : []),
      ...(options.downloadDescriptionImages ? descriptionUrls.map((url) => ({ url, type: "product_description" as const })) : []),
      ...(options.downloadShortDescImages ? shortDescUrls.map((url) => ({ url, type: "product_short_description" as const })) : []),
    ];

    debug(`[Product ${wooId}] Total image URLs to process: ${allUrls.length}`);

    // Step 2: Process each URL through deduplication pool
    for (const item of allUrls) {
      const { url, type } = item;
      if (!url) continue;

      const normalized = normalizeUrl(url);
      allSourceUrls.push(url);

      // Get or create pool entry
      const { entry: poolEntry, isNew } = this.getOrCreatePoolEntry(existingPool, url, {
        sourceMediaId: wooProduct.images?.find((img) => img.src === url)?.id,
        sourceOwnerId: wooId,
        sourceOwnerType: "product",
      });

      urlHashToSourceUrl[poolEntry.urlHash] = url;

      // Skip if already downloaded or failed (reuse mode)
      if (poolEntry.status === "downloaded" && poolEntry.relativePath) {
        urlHashToRelativePath[poolEntry.urlHash] = poolEntry.relativePath;
        downloads.push({
          urlHash: poolEntry.urlHash,
          sourceUrl: url,
          relativePath: poolEntry.relativePath,
          status: "reused",
        });
        debug(`[Product ${wooId}] Reuse existing: ${poolEntry.urlHash} → ${poolEntry.relativePath}`);
        continue;
      }

      if (poolEntry.status === "failed" && !options.reuseExistingMedia) {
        // Already failed, don't retry unless reuseExistingMedia is false
        debug(`[Product ${wooId}] Skip failed: ${poolEntry.urlHash}`);
        downloads.push({
          urlHash: poolEntry.urlHash,
          sourceUrl: url,
          status: "failed",
          error: poolEntry.errorMessage || "Previously failed",
        });
        continue;
      }

      if (poolEntry.status === "pending" || poolEntry.status === "failed" || isNew) {
        // Need to download
        debug(`[Product ${wooId}] Download: ${url} (isNew=${isNew}, status=${poolEntry.status})`);
        const result = await this.downloadAndUploadImage(url, poolEntry, context, options);
        downloads.push(result);

        // Update pool entry
        if (result.status === "downloaded" && result.relativePath) {
          existingPool[poolEntry.urlHash] = {
            ...poolEntry,
            relativePath: result.relativePath,
            status: "downloaded",
            fileName: this.extractFileNameFromUrl(url),
            mimeType: inferMimeType(url),
            updatedAt: new Date().toISOString(),
          };
          urlHashToRelativePath[poolEntry.urlHash] = result.relativePath;
        } else {
          existingPool[poolEntry.urlHash] = {
            ...poolEntry,
            status: result.status === "failed" ? "failed" : poolEntry.status,
            errorMessage: result.error,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }

    // Step 3: Build rewritten HTML
    let rewrittenDescription = wooProduct.description || "";
    let rewrittenShortDescription = wooProduct.short_description || "";

    // Build URL → relativePath mapping (not hash → relativePath)
    // rewriteHtmlImages uses normalizeUrl() internally to match
    const urlToRelativePath: Record<string, string> = {};
    for (const url of allSourceUrls) {
      const hash = this.hashSync(url);
      const relPath = urlHashToRelativePath[hash];
      if (relPath) {
        urlToRelativePath[url] = relPath;
      }
    }

    if (options.rewriteHtmlDescriptions) {
      const descResult = rewriteHtmlImages(rewrittenDescription, urlToRelativePath, context.wordpressBaseUrl);
      if (descResult.replacedCount > 0) {
        debug(`[Product ${wooId}] Rewrote ${descResult.replacedCount} images in description`);
        context.onLog?.(
          `[Media] Rewrite description: ${descResult.replacedCount} ảnh`,
          "info",
          { productId: wooId }
        );
      }
      rewrittenDescription = descResult.rewrittenHtml;

      const shortDescResult = rewriteHtmlImages(rewrittenShortDescription, urlToRelativePath, context.wordpressBaseUrl);
      if (shortDescResult.replacedCount > 0) {
        debug(`[Product ${wooId}] Rewrote ${shortDescResult.replacedCount} images in short_description`);
      }
      rewrittenShortDescription = shortDescResult.rewrittenHtml;
    }

    // Step 4: Build thumbnail and images arrays for Medusa payload
    const thumbnailHash = thumbnailUrl ? this.hashSync(thumbnailUrl) : "";
    const thumbnail = thumbnailHash && urlHashToRelativePath[thumbnailHash]
      ? urlHashToRelativePath[thumbnailHash]
      : undefined;

    const galleryImages = galleryUrls
      .map((url, i) => {
        const hash = this.hashSync(url);
        const relPath = urlHashToRelativePath[hash];
        return relPath ? { url: relPath } : undefined;
      })
      .filter(Boolean) as Array<{ url: string }>;

    // Step 5: Build metadata
    const downloadedHashes = downloads.filter((d) => d.status === "downloaded").map((d) => d.urlHash);
    const metadata: Record<string, string> = {
      wordpress_media_migrated: "true",
      wordpress_media_migrated_at: new Date().toISOString(),
    };

    if (downloadedHashes.length > 0) {
      metadata.wordpress_media_hashes = JSON.stringify(downloadedHashes);
    }
    if (allSourceUrls.length > 0) {
      metadata.wordpress_original_image_urls = JSON.stringify(allSourceUrls);
    }
    if (thumbnail) {
      metadata.wordpress_migrated_thumbnail = thumbnail;
    }
    if (galleryImages.length > 0) {
      metadata.wordpress_migrated_gallery_images = JSON.stringify(galleryImages.map((g) => g.url));
    }

    // Step 6: Build manifest
    const manifest: ProductMediaManifest = {
      wooProductId: wooId,
      wooProductName: wooProduct.name || `Product #${wooId}`,
      imageHashes: Object.keys(existingPool).filter(
        (h) => existingPool[h].sourceOwnerId === wooId && existingPool[h].sourceOwnerType === "product"
      ),
      totalImages: allUrls.length,
      downloadedImages: downloads.filter((d) => d.status === "downloaded" || d.status === "reused").length,
      failedImages: downloads.filter((d) => d.status === "failed").length,
      migratedAt: new Date().toISOString(),
      sourceUrls: allSourceUrls,
    };

    return {
      productData: {
        thumbnail,
        images: galleryImages.length > 0 ? galleryImages : undefined,
        description: rewrittenDescription,
        short_description: rewrittenShortDescription,
        metadata,
      },
      downloads,
      manifest,
    };
  },

  // ============================================================
  // CATEGORY MEDIA MIGRATION
  // ============================================================

  /**
   * Process image for a WooCommerce category.
   */
  async migrateCategoryMedia(
    wooCategory: WooCategory,
    existingPool: Record<string, MediaMappingEntry>,
    context: MediaMigrationContext,
    options: MediaMigrationOptions
  ): Promise<{
    categoryData: Record<string, unknown>;
    downloads: DownloadResult[];
    manifest: CategoryMediaManifest;
  }> {
    const wooId = wooCategory.id;
    const downloads: DownloadResult[] = [];
    const imageUrl = wooCategory.image?.src || "";

    const manifest: CategoryMediaManifest = {
      wooCategoryId: wooId,
      wooCategoryName: wooCategory.name,
      status: "pending",
      migratedAt: new Date().toISOString(),
    };

    if (!imageUrl || !options.downloadCategoryImages) {
      return { categoryData: {}, downloads, manifest };
    }

    const { entry: poolEntry, isNew } = this.getOrCreatePoolEntry(existingPool, imageUrl, {
      sourceMediaId: wooCategory.image?.id,
      sourceOwnerId: wooId,
      sourceOwnerType: "category",
    });

    manifest.imageHash = poolEntry.urlHash;
    manifest.sourceUrl = imageUrl;

    if (poolEntry.status === "downloaded" && poolEntry.relativePath) {
      manifest.relativePath = poolEntry.relativePath;
      manifest.status = "reused";
      downloads.push({
        urlHash: poolEntry.urlHash,
        sourceUrl: imageUrl,
        relativePath: poolEntry.relativePath,
        status: "reused",
      });
    } else if (poolEntry.status === "pending" || poolEntry.status === "failed") {
      const result = await this.downloadAndUploadImage(imageUrl, poolEntry, context, options);
      downloads.push(result);

      if (result.status === "downloaded" && result.relativePath) {
        existingPool[poolEntry.urlHash] = {
          ...poolEntry,
          relativePath: result.relativePath,
          status: "downloaded",
          fileName: this.extractFileNameFromUrl(imageUrl),
          mimeType: inferMimeType(imageUrl),
          updatedAt: new Date().toISOString(),
        };
        manifest.relativePath = result.relativePath;
        manifest.status = "downloaded";
      } else {
        manifest.status = result.status;
      }
    }

    const metadata: Record<string, string> = {
      wordpress_media_migrated: "true",
    };
    if (manifest.relativePath) {
      metadata.wordpress_migrated_category_image = manifest.relativePath;
    }
    if (imageUrl) {
      metadata.wordpress_original_category_image = imageUrl;
    }

    return {
      categoryData: { metadata },
      downloads,
      manifest,
    };
  },

  // ============================================================
  // MEDIA-ONLY MIGRATION
  // ============================================================

  /**
   * Run media-only migration for products that already exist in Medusa.
   * Matches products by metadata.wordpress_original_id or SKU.
   * Updates only thumbnail, gallery, description, short_description — does NOT touch price/inventory/category.
   */
  async runMediaOnlyMigration(
    wooProducts: WooProduct[],
    existingPool: Record<string, MediaMappingEntry>,
    context: MediaMigrationContext,
    options: MediaMigrationOptions,
    existingProductIds: Record<number, string>, // wooId → medusaProductId
    onProductUpdate: (
      medusaProductId: string,
      wooId: number,
      updates: Partial<MedusaProduct>
    ) => Promise<{ success: boolean; error?: string }>
  ): Promise<{
    updatedProducts: number;
    failedProducts: number;
    downloads: DownloadResult[];
    stats: MediaMigrationStats;
  }> {
    debug(`[MediaOnly] Starting for ${wooProducts.length} products`);

    const downloads: DownloadResult[] = [];
    let updatedProducts = 0;
    let failedProducts = 0;

    const stats: MediaMigrationStats = {
      totalImages: 0,
      downloaded: 0,
      reused: 0,
      failed: 0,
      skipped: 0,
      totalProducts: wooProducts.length,
      productsWithImages: 0,
      productsWithFailedImages: 0,
      totalSizeBytes: 0,
      warnings: [],
    };

    for (const wooProduct of wooProducts) {
      const medusaProductId = existingProductIds[wooProduct.id];

      if (!medusaProductId) {
        debug(`[MediaOnly] No Medusa product found for WooCommerce ID ${wooProduct.id}`);
        stats.warnings.push(`WooCommerce ID ${wooProduct.id} not found in Medusa — skipped`);
        continue;
      }

      context.onLog?.(
        `[Media] Đang xử lý ảnh: ${wooProduct.name} (ID: ${wooProduct.id})`,
        "info",
        { wooId: wooProduct.id, medusaId: medusaProductId }
      );

      try {
        const result = await this.migrateProductMedia(
          wooProduct,
          existingPool,
          context,
          options
        );

        downloads.push(...result.downloads);
        stats.totalImages += result.manifest.totalImages;

        if (result.manifest.totalImages > 0) {
          stats.productsWithImages++;
        }

        if (result.manifest.failedImages > 0) {
          stats.productsWithFailedImages++;
        }

        // Only update if there are actual image changes
        if (result.productData.thumbnail || result.productData.images || result.productData.description) {
          const updateResult = await onProductUpdate(
            medusaProductId,
            wooProduct.id,
            result.productData
          );

          if (updateResult.success) {
            updatedProducts++;
            debug(`[MediaOnly] Updated Medusa product ${medusaProductId}`);
            context.onLog?.(
              `[Media] Đã cập nhật ảnh: ${wooProduct.name}`,
              "success",
              { medusaId: medusaProductId, downloads: result.downloads.length }
            );
          } else {
            failedProducts++;
            stats.warnings.push(`Failed to update product ${wooProduct.name}: ${updateResult.error}`);
          }
        } else {
          updatedProducts++;
        }

        // Count download stats
        for (const dl of result.downloads) {
          if (dl.status === "downloaded") stats.downloaded++;
          else if (dl.status === "reused") stats.reused++;
          else if (dl.status === "failed") stats.failed++;
          else if (dl.status === "skipped") stats.skipped++;
        }

        // Save updated pool after each product
        this.savePool(existingPool);

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        debug(`[MediaOnly] Error for product ${wooProduct.id}:`, msg);
        failedProducts++;
        stats.warnings.push(`Product ${wooProduct.name} (${wooProduct.id}): ${msg}`);
      }
    }

    return { updatedProducts, failedProducts, downloads, stats };
  },

  // ============================================================
  // UTILITIES
  // ============================================================

  /** Extract filename from URL */
  extractFileNameFromUrl(url: string): string {
    if (!url) return "unnamed-image";
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/");
      const fileName = parts[parts.length - 1] || "unnamed-image";
      return decodeURIComponent(fileName) || "unnamed-image";
    } catch {
      const parts = url.split("/");
      const fileName = parts[parts.length - 1]?.split("?")[0] || "unnamed-image";
      return decodeURIComponent(fileName) || "unnamed-image";
    }
  },

  /** Clear all media migration data */
  clearAll(): void {
    mediaStorage.clearAll();
  },

  /** Get statistics from current pool */
  getPoolStats(): {
    total: number;
    downloaded: number;
    pending: number;
    failed: number;
    reused: number;
  } {
    const pool = this.loadPool();
    const entries = Object.values(pool);
    return {
      total: entries.length,
      downloaded: entries.filter((e) => e.status === "downloaded").length,
      pending: entries.filter((e) => e.status === "pending").length,
      failed: entries.filter((e) => e.status === "failed").length,
      reused: entries.filter((e) => e.status === "reused").length,
    };
  },
};
