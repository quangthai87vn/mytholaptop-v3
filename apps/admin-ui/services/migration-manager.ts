"use client";

/**
 * Migration Manager - Module-level singleton
 * Lưu trữ state ở module level để không bị mất khi chuyển tab
 * Các component React sẽ subscribe vào đây để cập nhật UI
 */

// Counter để tạo log ID duy nhất — tránh trùng khi nhiều log cùng ms
let _logIdCounter = 0;
function createLogId(prefix = "log"): string {
  return `${prefix}_${Date.now()}_${++_logIdCounter}`;
}

import type {
  MigrationConfig,
  MigrationOptions,
  MigrationStats,
  MigrationProgress,
  MigrationLog,
  IdMapping,
} from "@/types";
import type { MediaMigrationOptions } from "@/types/media-mapping";
import type { ProgressCallback } from "./migration.service";
import type { MigrationCallback } from "./migration.service";
import {
  saveIdMapping,
  loadIdMapping,
  saveMigrationHistory,
} from "./medusa.service";
import { fetchCategories, fetchProducts, fetchAllProducts, fetchTags } from "@/services/woocommerce.service";
import {
  transformCategory,
  transformProduct,
  sortCategoriesByHierarchy,
  buildCategoryLevelMap,
} from "@/lib/transform";
import type {
  WooCategory,
  WooProduct,
  WooTag,
  MedusaCategory,
  MedusaProduct,
} from "@/types";
import {
  batchCreateCategories,
  batchCreateProducts,
  batchCreateProductTags,
  deleteAllCategories,
  deleteAllProducts,
} from "./medusa.service";
import type { MedusaConfig } from "./medusa.service";

// ============================================================
// TYPES
// ============================================================

export type MigrationPhase =
  | "idle"
  | "fetching"
  | "transforming"
  | "migrating_categories"
  | "migrating_tags"
  | "migrating_products"
  | "media_migration"
  | "done"
  | "failed"
  | "cancelled"
  | "rolling_back"
  | "rolling_back_products"
  | "rolling_back_categories";

export interface MigrationState {
  phase: MigrationPhase;
  progress: MigrationProgress;
  stats: MigrationStats;
  isRunning: boolean;
}

// ============================================================
// MODULE-LEVEL STATE
// ============================================================

let _state: MigrationState = {
  phase: "idle",
  progress: {
    phase: "idle",
    totalItems: 0,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    errors: [],
  },
  stats: {
    totalCategories: 0,
    migratedCategories: 0,
    totalProducts: 0,
    migratedProducts: 0,
    failedProducts: 0,
    skippedProducts: 0,
    totalVariants: 0,
    migratedVariants: 0,
  },
  isRunning: false,
};

let _logs: MigrationLog[] = [];
let _mapping: IdMapping = { categories: {}, products: {}, images: {}, tags: {} };
let _abortController: AbortController | null = null;

// Subscribers
type Listener = (state: MigrationState) => void;
const _listeners: Set<Listener> = new Set();
type LogListener = (log: MigrationLog) => void;
const _logListeners: Set<LogListener> = new Set();

// ============================================================
// PUBLIC API
// ============================================================

export function getState(): MigrationState {
  return { ..._state };
}

export function getLogs(): MigrationLog[] {
  return [..._logs];
}

export function getMapping(): IdMapping {
  return { ..._mapping };
}

export function reloadMapping(): IdMapping {
  _mapping = loadIdMapping() || { categories: {}, products: {}, images: {}, tags: {} };
  _notify();
  return _mapping;
}

export function isMigrationRunning(): boolean {
  return _state.isRunning;
}

export function subscribe( listener: Listener): () => void {
  _listeners.add(listener);
  listener({ ..._state });
  return () => _listeners.delete(listener);
}

export function subscribeLogs(listener: LogListener): () => void {
  _logListeners.add(listener);
  // Send recent logs
  _logs.slice(-50).forEach(listener);
  return () => _logListeners.delete(listener);
}

function _notify(): void {
  const state = { ..._state };
  _listeners.forEach((l) => l(state));
}

function _emitLog(log: MigrationLog): void {
  _logs.push(log);
  if (_logs.length > 500) {
    _logs = _logs.slice(-500);
  }
  _logListeners.forEach((l) => l(log));
  // Persist
  saveMigrationHistory({
    id: `migration_${Date.now()}`,
    startedAt: _state.progress.startTime || new Date().toISOString(),
    completedAt: _state.phase === "done" || _state.phase === "failed" ? new Date().toISOString() : undefined,
    status: _state.phase === "done" ? "completed" : _state.phase === "failed" ? "failed" : _state.isRunning ? "in_progress" : "stopped",
    stats: {
      totalCategories: _state.stats.totalCategories,
      migratedCategories: _state.stats.migratedCategories,
      totalProducts: _state.stats.totalProducts,
      migratedProducts: _state.stats.migratedProducts,
      failedProducts: _state.stats.failedProducts,
      skippedProducts: _state.stats.skippedProducts,
      totalVariants: _state.stats.totalVariants,
      migratedVariants: _state.stats.migratedVariants,
    },
    logs: _logs.slice(-100).map((l) => ({
      id: l.id,
      step: l.step,
      action: l.action,
      status: l.status,
      message: l.message,
      timestamp: l.timestamp,
    })),
    progress: {
      phase: _state.phase,
      totalItems: _state.progress.totalItems,
      processedItems: _state.progress.processedItems,
      successCount: _state.progress.successCount,
      failCount: _state.progress.failCount,
    },
  });
}

// ============================================================
// MIGRATION
// ============================================================

export async function startMigration(
  config: MigrationConfig,
  options: MigrationOptions,
  onLog?: MigrationCallback,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; stats: MigrationStats; mapping: IdMapping }> {
  console.log("[MigrationManager] startMigration CALLED with options:", JSON.stringify({
    selectedTypes: options.selectedTypes,
    preserveImages: options.preserveImages,
    mediaOptions: options.mediaOptions,
    batchSize: options.batchSize,
  }));
  if (_state.isRunning) {
    const errLog: MigrationLog = {
      id: createLogId(),
      step: "system",
      action: "ERROR",
      status: "error",
      message: "Migration đang chạy. Vui lòng đợi hoặc hủy migration hiện tại.",
      timestamp: new Date().toISOString(),
    };
    _emitLog(errLog);
    if (onLog) onLog(errLog);
    return { success: false, stats: _state.stats, mapping: _mapping };
  }

  // Init
  _state.isRunning = true;
  _state.phase = "fetching";
  _abortController = new AbortController();
  _logs = [];
  _mapping = loadIdMapping() || { categories: {}, products: {}, images: {}, tags: {} };
  _state.stats = {
    totalCategories: 0,
    migratedCategories: 0,
    totalProducts: 0,
    migratedProducts: 0,
    failedProducts: 0,
    skippedProducts: 0,
    totalVariants: 0,
    migratedVariants: 0,
  };
  _state.progress = {
    phase: "fetching",
    totalItems: 0,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    startTime: new Date().toISOString(),
    errors: [],
  };
  _notify();

  const wooConfig = {
    wordpressUrl: config.wordpressUrl,
    consumerKey: config.wooConsumerKey,
    consumerSecret: config.wooConsumerSecret,
  };

  const medusaConfig: MedusaConfig = {
    backendUrl: config.medusaBackendUrl,
    adminApiKey: config.medusaAdminKey,
    adminEmail: config.medusaAdminEmail,
    adminPassword: config.medusaAdminPassword,
  };

  try {
    // Fetch products early (needed for tags AND for products migration)
    let products: WooProduct[] = [];
    if (options.selectedTypes.includes("products") || options.selectedTypes.includes("tags")) {
      const prodResult = await fetchAllProducts(wooConfig);
      if (!prodResult.success || !prodResult.data) {
        throw new Error("Không thể lấy sản phẩm: " + (prodResult.error || "Unknown"));
      }
      products = prodResult.data.products;
      _state.stats.totalProducts = products.length;
    }

    // === CATEGORIES ===
    if (options.selectedTypes.includes("categories")) {
      const infoLog: MigrationLog = {
        id: createLogId(),
        step: "fetch_categories",
        action: "INFO",
        status: "info",
        message: "Bắt đầu lấy danh mục từ WooCommerce...",
        timestamp: new Date().toISOString(),
      };
      _emitLog(infoLog);
      if (onLog) onLog(infoLog);
      _state.phase = "fetching";
      _notify();

      const catResult = await fetchCategories(wooConfig);
      if (!catResult.success || !catResult.data) {
        throw new Error("Không thể lấy danh mục: " + (catResult.error || "Unknown"));
      }

      const categories: WooCategory[] = catResult.data;
      _state.stats.totalCategories = categories.length;
      const succLog: MigrationLog = {
        id: createLogId(),
        step: "fetch_categories",
        action: "SUCCESS",
        status: "success",
        message: `Lấy được ${categories.length} danh mục`,
        timestamp: new Date().toISOString(),
      };
      _emitLog(succLog);
      if (onLog) onLog(succLog);

      // Sort + transform
      const sortedCategories = sortCategoriesByHierarchy(categories);
      const categoryLevelMap = buildCategoryLevelMap(categories);

      const transLog: MigrationLog = {
        id: createLogId(),
        step: "transform_categories",
        action: "INFO",
        status: "info",
        message: "Đang chuyển đổi định dạng danh mục...",
        timestamp: new Date().toISOString(),
      };
      _emitLog(transLog);
      if (onLog) onLog(transLog);
      _state.phase = "transforming";
      _notify();

      const catMapping: Record<number, string> = {};
      const transformedCategories: MedusaCategory[] = [];
      for (const c of sortedCategories) {
        const level = categoryLevelMap.get(c.id) ?? 0;
        const result = transformCategory(c, level);
        if (result.success && result.data) {
          transformedCategories.push(result.data);
        }
      }

      // Create
      const createLog: MigrationLog = {
        id: createLogId(),
        step: "migrate_categories",
        action: "INFO",
        status: "info",
        message: `Bắt đầu tạo ${transformedCategories.length} danh mục...`,
        timestamp: new Date().toISOString(),
      };
      _emitLog(createLog);
      if (onLog) onLog(createLog);
      _state.phase = "migrating_categories";
      _state.progress = { ..._state.progress, phase: "migrating_categories", totalItems: transformedCategories.length, processedItems: 0 };
      if (onProgress) onProgress(_state.progress);
      _notify();

      const batchResult = await batchCreateCategories(medusaConfig, transformedCategories, catMapping, {
        onProgress: (data) => {
          // Emit real-time log for each category
          const action = data.type === "created" ? "CREATE" : data.type === "updated" ? "UPDATE" : "ERROR";
          const status = data.type === "created" ? "success" : data.type === "updated" ? "success" : "error";
          const logMsg = data.type === "failed"
            ? `[${data.index + 1}/${data.total}] Lỗi: ${data.name} - ${data.error}`
            : `[${data.index + 1}/${data.total}] ${data.type === "created" ? "Tạo" : "Cập nhật"}: ${data.name}`;
          
          const progressLog: MigrationLog = {
            id: `${createLogId()}_${data.index}`,
            step: "migrate_categories",
            action,
            status,
            message: logMsg,
            timestamp: new Date().toISOString(),
          };
          _emitLog(progressLog);
          if (onLog) onLog(progressLog);
          
          // Update progress
          _state.progress.processedItems = data.index + 1;
          _state.progress.successCount = data.type === "created" ? (data.index + 1) : _state.progress.successCount;
          _notify();
        },
      });

      if (batchResult.success && batchResult.data) {
        if (batchResult.data.wooIdToMedusaId) {
          for (const [wooIdStr, medusaId] of Object.entries(batchResult.data.wooIdToMedusaId)) {
            const wooIdNum = parseInt(wooIdStr, 10);
            _mapping.categories[wooIdNum] = medusaId;
            catMapping[wooIdNum] = medusaId;
          }
        }
        _state.stats.migratedCategories = batchResult.data.created + batchResult.data.updated;
        const doneLog: MigrationLog = {
          id: createLogId(),
          step: "migrate_categories",
          action: "SUCCESS",
          status: "success",
          message: `Đã tạo ${batchResult.data.created} danh mục, cập nhật ${batchResult.data.updated} danh mục`,
          timestamp: new Date().toISOString(),
        };
        _emitLog(doneLog);
        if (onLog) onLog(doneLog);
        if (batchResult.data.failed > 0) {
          const warnLog: MigrationLog = {
            id: createLogId(),
            step: "migrate_categories",
            action: "WARNING",
            status: "warning",
            message: `${batchResult.data.failed} danh mục bị lỗi`,
            timestamp: new Date().toISOString(),
          };
          _emitLog(warnLog);
          if (onLog) onLog(warnLog);
        }
      }
      saveIdMapping(_mapping);
      _state.progress.processedItems = transformedCategories.length;
      _notify();
    }

    // === TAGS ===
    if (options.selectedTypes.includes("tags")) {
      // Collect all unique tags from products
      const tagMap = new Map<number, { id: number; name: string; slug: string }>();
      
      for (const product of products) {
        if (product.tags) {
          for (const tag of product.tags) {
            if (!tagMap.has(tag.id)) {
              tagMap.set(tag.id, {
                id: tag.id,
                name: tag.name,
                slug: tag.name.toLowerCase().replace(/\s+/g, "-"),
              });
            }
          }
        }
      }

      const allTags = Array.from(tagMap.values());
      
      if (allTags.length > 0) {
        const tagLog: MigrationLog = {
          id: createLogId(),
          step: "migrate_tags",
          action: "INFO",
          status: "info",
          message: `Bắt đầu đồng bộ ${allTags.length} tags...`,
          timestamp: new Date().toISOString(),
        };
        _emitLog(tagLog);
        if (onLog) onLog(tagLog);
        _state.phase = "migrating_tags";
        _state.progress = { ..._state.progress, phase: "migrating_tags", totalItems: allTags.length, processedItems: 0 };
        if (onProgress) onProgress(_state.progress);
        _notify();

        const tagBatchResult = await batchCreateProductTags(medusaConfig, allTags, {
          onProgress: (data) => {
            const action = data.type === "created" ? "CREATE" : data.type === "found" ? "FOUND" : "ERROR";
            const status = data.type === "failed" ? "error" : "success";
            const logMsg = data.type === "failed"
              ? `[${data.index}/${data.total}] Lỗi tag: ${data.value} - ${data.error}`
              : `[${data.index}/${data.total}] Tag ${data.type === "created" ? "mới" : "có sẵn"}: ${data.value}`;
            
            const progressLog: MigrationLog = {
              id: `${createLogId()}_${data.index}`,
              step: "migrate_tags",
              action,
              status,
              message: logMsg,
              timestamp: new Date().toISOString(),
            };
            _emitLog(progressLog);
            if (onLog) onLog(progressLog);
            
            _state.progress.processedItems = data.index;
            _notify();
          },
        });

        if (tagBatchResult.success && tagBatchResult.data) {
          // Save tag mapping
          for (const [wooIdStr, medusaId] of Object.entries(tagBatchResult.data.wooIdToMedusaId)) {
            _mapping.tags[parseInt(wooIdStr, 10)] = medusaId;
          }
          
          const tagDoneLog: MigrationLog = {
            id: createLogId(),
            step: "migrate_tags",
            action: "SUCCESS",
            status: "success",
            message: `Tạo ${tagBatchResult.data.created} tags, tìm thấy ${tagBatchResult.data.found} tags`,
            timestamp: new Date().toISOString(),
          };
          _emitLog(tagDoneLog);
          if (onLog) onLog(tagDoneLog);
        }
        saveIdMapping(_mapping);
      }
    }

    // === PRODUCTS ===
    if (options.selectedTypes.includes("products")) {
      const infoLog: MigrationLog = {
        id: createLogId(),
        step: "fetch_products",
        action: "INFO",
        status: "info",
        message: "Bắt đầu lấy sản phẩm từ WooCommerce...",
        timestamp: new Date().toISOString(),
      };
      _emitLog(infoLog);
      if (onLog) onLog(infoLog);
      _state.phase = "fetching";
      _notify();

      // If products already fetched (for tags), just use them; otherwise fetch again
      if (products.length === 0) {
        const prodResult = await fetchAllProducts(wooConfig);
        if (!prodResult.success || !prodResult.data) {
          throw new Error("Không thể lấy sản phẩm: " + (prodResult.error || "Unknown"));
        }
        products = prodResult.data.products;
        _state.stats.totalProducts = products.length;
      }
      const succLog: MigrationLog = {
        id: createLogId(),
        step: "fetch_products",
        action: "SUCCESS",
        status: "success",
        message: `Lấy được ${products.length} sản phẩm`,
        timestamp: new Date().toISOString(),
      };
      _emitLog(succLog);
      if (onLog) onLog(succLog);

      // Transform
      const transLog: MigrationLog = {
        id: createLogId(),
        step: "transform_products",
        action: "INFO",
        status: "info",
        message: "Đang chuyển đổi định dạng sản phẩm...",
        timestamp: new Date().toISOString(),
      };
      _emitLog(transLog);
      if (onLog) onLog(transLog);
      _state.phase = "transforming";
      _notify();

      // Build transform config for products
      const imageConfig = {
        sourceDomain: config.wordpressUrl || "",
        targetDomain: "",
        uploadToMedusa: false,
      };
      const descriptionConfig = {
        sourceDomain: config.wordpressUrl || "",
        targetDomain: "",
        stripInlineStyles: true,
        removeGutenbergBlocks: true,
      };

      const transformedProducts = products.map((p) => {
        const result = transformProduct(p, {
          imageConfig,
          descriptionConfig,
          defaultCurrency: "vnd",
          defaultStatus: "published",
          tagMapping: _mapping.tags,
        });
        return result.success && result.data ? result.data : null;
      }).filter((p): p is NonNullable<typeof p> => p !== null);

      // Create
      const createLog: MigrationLog = {
        id: createLogId(),
        step: "migrate_products",
        action: "INFO",
        status: "info",
        message: `Bắt đầu tạo ${transformedProducts.length} sản phẩm...`,
        timestamp: new Date().toISOString(),
      };
      _emitLog(createLog);
      if (onLog) onLog(createLog);
      _state.phase = "migrating_products";
      _state.progress = { ..._state.progress, phase: "migrating_products", totalItems: transformedProducts.length, processedItems: 0 };
      if (onProgress) onProgress(_state.progress);
      _notify();

      // Build wooIds array for batchCreateProducts to track wooId → medusaId
      const wooIds: number[] = transformedProducts.map(p => p.originalId).filter((id): id is number => id !== undefined);

      const prodBatchResult = await batchCreateProducts(
        medusaConfig,
        transformedProducts,
        wooIds,
        {
          onProgress: (current, total, status, productTitle, error) => {
            // Emit real-time log for each product
            const action = status === "success" ? "CREATE" : status === "skip" ? "SKIP" : "ERROR";
            const logMsg = status === "fail"
              ? `[${current}/${total}] Lỗi: ${productTitle || "Unknown"} - ${error || "Unknown"}`
              : `[${current}/${total}] ${status === "success" ? "Tạo" : status === "skip" ? "Bỏ qua" : "Lỗi"}: ${productTitle || "Unknown"}`;
            
            const progressLog: MigrationLog = {
              id: `${createLogId()}_${current}`,
              step: "migrate_products",
              action,
              status: status === "success" ? "success" : status === "skip" ? "warning" : "error",
              message: logMsg,
              timestamp: new Date().toISOString(),
            };
            _emitLog(progressLog);
            if (onLog) onLog(progressLog);
            
            // Update progress
            _state.progress.processedItems = current;
            _notify();
          },
        }
      );

      if (prodBatchResult.success && prodBatchResult.data) {
        _state.stats.migratedProducts = prodBatchResult.data.created;
        _state.stats.skippedProducts = prodBatchResult.data.skipped ?? 0;
        _state.stats.failedProducts = prodBatchResult.data.failed;

        // CRITICAL: Populate _mapping.products so media migration can work
        const wooIdToMedusaId = prodBatchResult.data.wooIdToMedusaId || {};
        for (const [wooIdStr, medusaId] of Object.entries(wooIdToMedusaId)) {
          _mapping.products[parseInt(wooIdStr, 10)] = medusaId;
        }

        const doneLog: MigrationLog = {
          id: createLogId(),
          step: "migrate_products",
          action: "SUCCESS",
          status: "success",
          message: `Đã tạo ${prodBatchResult.data.created} sản phẩm, bỏ qua ${prodBatchResult.data.skipped} sản phẩm`,
          timestamp: new Date().toISOString(),
        };
        _emitLog(doneLog);
        if (onLog) onLog(doneLog);
        if (prodBatchResult.data.failed > 0) {
          const warnLog: MigrationLog = {
            id: createLogId(),
            step: "migrate_products",
            action: "WARNING",
            status: "warning",
            message: `${prodBatchResult.data.failed} sản phẩm bị lỗi`,
            timestamp: new Date().toISOString(),
          };
          _emitLog(warnLog);
          if (onLog) onLog(warnLog);
        }
      }
      saveIdMapping(_mapping);
      _state.progress.processedItems = transformedProducts.length;
      _notify();

      // === MEDIA MIGRATION v2 ===
      // Chỉ chạy nếu preserveImages = false (tải ảnh về Medusa)
      if (!options.preserveImages && options.mediaOptions) {
        const rawMediaOpts = options.mediaOptions;
        const mediaOpts: MediaMigrationOptions = {
          downloadThumbnails: rawMediaOpts.downloadThumbnails ?? true,
          downloadGallery: rawMediaOpts.downloadGallery ?? true,
          downloadCategoryImages: rawMediaOpts.downloadCategoryImages ?? false,
          downloadDescriptionImages: rawMediaOpts.downloadDescriptionImages ?? false,
          downloadShortDescImages: rawMediaOpts.downloadShortDescImages ?? false,
          rewriteHtmlDescriptions: rawMediaOpts.rewriteHtmlDescriptions ?? false,
          reuseExistingMedia: rawMediaOpts.reuseExistingMedia ?? true,
          maxRetries: 3,
          timeoutMs: 30000,
          maxFileSizeBytes: 10 * 1024 * 1024,
          onlyFromWordpressDomain: rawMediaOpts.onlyFromWordpressDomain ?? true,
        };

        const hasMediaWork =
          mediaOpts.downloadThumbnails ||
          mediaOpts.downloadGallery ||
          mediaOpts.downloadDescriptionImages ||
          mediaOpts.downloadShortDescImages ||
          mediaOpts.rewriteHtmlDescriptions;

        if (hasMediaWork) {
          const configParts: string[] = [];
          if (mediaOpts.downloadThumbnails) configParts.push("thumbnail");
          if (mediaOpts.downloadGallery) configParts.push("gallery");
          if (mediaOpts.downloadDescriptionImages) configParts.push("description");
          if (mediaOpts.downloadShortDescImages) configParts.push("shortDesc");
          if (mediaOpts.rewriteHtmlDescriptions) configParts.push("rewriteHTML");
          const configStr = configParts.length > 0 ? ` [${configParts.join(", ")}]` : "";

          const mediaLog: MigrationLog = {
            id: createLogId(),
            step: "media_migration",
            action: "INFO",
            status: "info",
            message: `Bat dau migrate anh: ${products.length} san pham${configStr}...`,
            timestamp: new Date().toISOString(),
          };
          _emitLog(mediaLog);
          if (onLog) onLog(mediaLog);
          _state.phase = "media_migration";
          _state.progress = {
            ..._state.progress,
            phase: "media_migration",
            totalItems: products.length,
            processedItems: 0,
            mediaProgress: { totalProducts: products.length, processedProducts: 0 },
          };
          if (onProgress) onProgress(_state.progress);
          _notify();

          const { imageMigrationServiceV2 } = await import("./image-migration.v2");
          const mediaPool = imageMigrationServiceV2.loadPool();

          // Lấy imageConfig từ options, fallback về localStorage
          const imgConfig = options.imageConfig
            || (typeof window !== "undefined"
              ? (() => {
                try {
                  const stored = localStorage.getItem("mtl_image_upload_config");
                  if (stored) return JSON.parse(stored);
                } catch { /* ignore */ }
                return null;
              })()
              : null)
            || undefined;

          const mediaContext = {
            wordpressBaseUrl: config.wordpressUrl || "",
            medusaBackendUrl: config.medusaBackendUrl || "",
            adminUiBaseUrl: config.adminUiUrl || `${typeof window !== "undefined" ? window.location.origin : ""}`,
            jobId: `migration_${Date.now()}`,
            onLog: (msg: string, type: "info" | "warn" | "error" | "success") => {
              const logEntry: MigrationLog = {
                id: createLogId(),
                step: "media_migration",
                action: type.toUpperCase(),
                status: type === "warn" ? "warning" : type,
                message: msg,
                timestamp: new Date().toISOString(),
              };
              _emitLog(logEntry);
              if (onLog) onLog(logEntry);
            },
            imageConfig: imgConfig,
          };

          const existingProductIds: Record<number, string> = {};
          for (const [wooIdStr, medusaId] of Object.entries(_mapping.products)) {
            existingProductIds[parseInt(wooIdStr, 10)] = medusaId;
          }

          const mediaResult = await imageMigrationServiceV2.migrateProducts(
            products,
            existingProductIds,
            mediaPool,
            mediaContext,
            mediaOpts,
            async (medusaProductId, wooId, updates) => {
              try {
                console.log(`[ImageMigV2] UPDATE_CALLBACK medusaId=${medusaProductId} wooId=${wooId} thumbnail=${updates.thumbnail || "none"} images=${updates.images.length}`, JSON.stringify(updates.images.map(i => i.url.slice(0, 80))));
                
                // Normalize thumbnail and images to local paths if they are WooCommerce URLs
                const normalizedUpdates: Partial<MedusaProduct> = { ...updates };
                
                // If thumbnail is WooCommerce URL, try to find local path from pool
                if (normalizedUpdates.thumbnail && normalizedUpdates.thumbnail.startsWith('http')) {
                  const pool = imageMigrationServiceV2.loadPool();
                  // Pool is keyed by urlHash (hash of URL), not URL directly
                  const { hashUrl } = await import('./image-migration.v2');
                  const urlHash = hashUrl(normalizedUpdates.thumbnail);
                  const poolEntry = pool[urlHash];
                  if (poolEntry?.relativePath) {
                    console.log(`[ImageMigV2] Thumbnail URL→Local: ${normalizedUpdates.thumbnail.slice(0, 60)} → ${poolEntry.relativePath}`);
                    normalizedUpdates.thumbnail = poolEntry.relativePath;
                  }
                }
                
                const { updateProduct } = await import("./medusa.service");
                const result = await updateProduct(
                  medusaConfig,
                  medusaProductId,
                  normalizedUpdates,
                  { imageBaseUrl: config.adminUiUrl || `${typeof window !== "undefined" ? window.location.origin : ""}` }
                );
                console.log(`[ImageMigV2] UPDATE_RESULT medusaId=${medusaProductId} success=${result.success} error=${result.error || "none"}`);

                _state.progress.mediaProgress = {
                  totalProducts: products.length,
                  processedProducts: (_state.progress.mediaProgress?.processedProducts ?? 0) + 1,
                };
                _state.progress.currentItemIndex = _state.progress.mediaProgress.processedProducts;
                _state.progress.currentItemName = `SP #${wooId}`;
                _notify();
                if (onProgress) onProgress(_state.progress);

                return { success: result.success, error: result.error };
              } catch (err) {
                return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
              }
            }
          );

          imageMigrationServiceV2.savePool(mediaPool);

          const mediaDoneLog: MigrationLog = {
            id: createLogId(),
            step: "media_migration",
            action: mediaResult.failedProducts === 0 ? "SUCCESS" : "WARNING",
            status: mediaResult.failedProducts === 0 ? "success" : "warning",
            message: `Media migration hoan tat: ${mediaResult.updatedProducts} san pham | Downloaded: ${mediaResult.downloaded} | Reused: ${mediaResult.reused} | Failed: ${mediaResult.failed}`,
            timestamp: new Date().toISOString(),
          };
          _emitLog(mediaDoneLog);
          if (onLog) onLog(mediaDoneLog);
          _notify();
        }
      }
    }

    // === DONE ===
    _state.phase = "done";
    _state.isRunning = false;
    _state.progress.endTime = new Date().toISOString();
    const completeLog: MigrationLog = {
      id: createLogId(),
      step: "complete",
      action: "SUCCESS",
      status: "success",
      message: "Migration hoàn tất!",
      timestamp: new Date().toISOString(),
    };
    _emitLog(completeLog);
    if (onLog) onLog(completeLog);
    _notify();

    return { success: true, stats: _state.stats, mapping: _mapping };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errLog: MigrationLog = {
      id: createLogId(),
      step: "error",
      action: "ERROR",
      status: "error",
      message: `Migration thất bại: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };
    _emitLog(errLog);
    if (onLog) onLog(errLog);
    _state.phase = "failed";
    _state.isRunning = false;
    _state.progress.errors.push({
      itemId: "migration_error",
      itemName: "Migration Error",
      phase: _state.phase,
      message: errorMessage,
      retryable: false,
      timestamp: new Date().toISOString(),
    });
    _notify();
    return { success: false, stats: _state.stats, mapping: _mapping };
  }
}

export function cancelMigration(): void {
  if (_abortController) {
    _abortController.abort();
  }
  _state.phase = "cancelled";
  _state.isRunning = false;
  const log: MigrationLog = {
    id: createLogId(),
    step: "cancel",
    action: "WARNING",
    status: "warning",
    message: "Migration đã bị hủy bởi người dùng",
    timestamp: new Date().toISOString(),
  };
  _emitLog(log);
  _notify();
}

export async function rollbackAll(
  config: MigrationConfig,
  onLog?: MigrationCallback,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; deletedProducts: number; deletedCategories: number }> {
  const medusaConfig: MedusaConfig = {
    backendUrl: config.medusaBackendUrl,
    adminApiKey: config.medusaAdminKey,
    adminEmail: config.medusaAdminEmail,
    adminPassword: config.medusaAdminPassword,
  };

  _state.isRunning = true;
  _state.phase = "rolling_back_products";
  _state.stats = {
    ..._state.stats,
    totalProducts: 0,
    migratedProducts: 0,
    failedProducts: 0,
    skippedProducts: 0,
    totalCategories: 0,
    migratedCategories: 0,
    totalVariants: 0,
    migratedVariants: 0,
  };
  _notify();

  const infoLog: MigrationLog = {
    id: createLogId(),
    step: "rollback",
    action: "INFO",
    status: "info",
    message: "=== BẮT ĐẦU XOÁ TOÀN BỘ DỮ LIỆU ===",
    timestamp: new Date().toISOString(),
  };
  _emitLog(infoLog);
  if (onLog) onLog(infoLog);

  // Products
  const prodInfoLog: MigrationLog = {
    id: createLogId(),
    step: "rollback",
    action: "INFO",
    status: "info",
    message: "Đang xoá tất cả sản phẩm...",
    timestamp: new Date().toISOString(),
  };
  _emitLog(prodInfoLog);
  if (onLog) onLog(prodInfoLog);

  const prodResult = await deleteAllProducts(medusaConfig, (deleted, total) => {
    _state.progress = {
      ..._state.progress,
      phase: "rolling_back_products",
      totalItems: total,
      processedItems: deleted,
      successCount: deleted,
      failCount: 0,
      errors: [],
    };
    _state.stats = {
      ..._state.stats,
      totalProducts: total,
      migratedProducts: deleted,
    };
    _notify();
    onProgress?.(_state.progress);
  });

  const deletedProducts = prodResult.data?.deleted ?? 0;
  const prodSuccLog: MigrationLog = {
    id: createLogId(),
    step: "rollback",
    action: "SUCCESS",
    status: "success",
    message: `Đã xoá ${deletedProducts} sản phẩm`,
    timestamp: new Date().toISOString(),
  };
  _emitLog(prodSuccLog);
  if (onLog) onLog(prodSuccLog);

  // Categories
  _state.phase = "rolling_back_categories";
  _state.progress = {
    ..._state.progress,
    phase: "rolling_back_categories",
    totalItems: 0,
    processedItems: 0,
  };
  _notify();

  const catInfoLog: MigrationLog = {
    id: createLogId(),
    step: "rollback",
    action: "INFO",
    status: "info",
    message: "Đang xoá tất cả danh mục...",
    timestamp: new Date().toISOString(),
  };
  _emitLog(catInfoLog);
  if (onLog) onLog(catInfoLog);

  const catResult = await deleteAllCategories(medusaConfig, (deleted, total) => {
    _state.progress = {
      ..._state.progress,
      phase: "rolling_back_categories",
      totalItems: total,
      processedItems: deleted,
      successCount: deleted,
      failCount: 0,
      errors: [],
    };
    _state.stats = {
      ..._state.stats,
      totalCategories: total,
      migratedCategories: deleted,
    };
    _notify();
    onProgress?.(_state.progress);
  });

  const deletedCategories = catResult.data?.deleted ?? 0;
  const catSuccLog: MigrationLog = {
    id: createLogId(),
    step: "rollback",
    action: "SUCCESS",
    status: "success",
    message: `Đã xoá ${deletedCategories} danh mục`,
    timestamp: new Date().toISOString(),
  };
  _emitLog(catSuccLog);
  if (onLog) onLog(catSuccLog);

  // Clear mapping
  _mapping = { categories: {}, products: {}, images: {}, tags: {} };
  saveIdMapping(_mapping);

  _state.isRunning = false;
  _state.phase = "idle";
  _state.progress = {
    phase: "idle",
    totalItems: 0,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    errors: [],
  };
  _state.stats = {
    totalProducts: 0,
    migratedProducts: 0,
    failedProducts: 0,
    skippedProducts: 0,
    totalCategories: 0,
    migratedCategories: 0,
    totalVariants: 0,
    migratedVariants: 0,
  };
  const completeLog: MigrationLog = {
    id: createLogId(),
    step: "rollback",
    action: "SUCCESS",
    status: "success",
    message: "=== XOÁ TOÀN BỘ HOÀN TẤT! ===",
    timestamp: new Date().toISOString(),
  };
  _emitLog(completeLog);
  if (onLog) onLog(completeLog);
  _notify();

  return { success: prodResult.success && catResult.success, deletedProducts, deletedCategories };
}

// ============================================================
// MEDIA-ONLY MIGRATION
// ============================================================

/**
 * Chạy migrate ảnh độc lập cho các sản phẩm đã migrate rồi.
 * Dùng khi các bước categories/products đã xong, chỉ còn migrate ảnh.
 */
export async function migrateMediaOnly(
  config: MigrationConfig,
  options: MigrationOptions,
  onLog?: MigrationCallback,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; stats: { updated: number; failed: number } }> {
  if (_state.isRunning) {
    const errLog: MigrationLog = {
      id: createLogId(),
      step: "media_only",
      action: "ERROR",
      status: "error",
      message: "Đang có migration đang chạy. Vui lòng đợi hoặc hủy migration hiện tại.",
      timestamp: new Date().toISOString(),
    };
    _emitLog(errLog);
    if (onLog) onLog(errLog);
    return { success: false, stats: { updated: 0, failed: 0 } };
  }

  // Load mapping - bắt buộc phải có products mapping
  const mapping = loadIdMapping();
  if (!mapping || !mapping.products || Object.keys(mapping.products).length === 0) {
    const errLog: MigrationLog = {
      id: createLogId(),
      step: "media_only",
      action: "ERROR",
      status: "error",
      message: "Không tìm thấy dữ liệu ánh xạ sản phẩm. Hãy chạy Migration để tạo sản phẩm trước.",
      timestamp: new Date().toISOString(),
    };
    _emitLog(errLog);
    if (onLog) onLog(errLog);
    return { success: false, stats: { updated: 0, failed: 0 } };
  }

  // Init state
  _state.isRunning = true;
  _state.phase = "media_migration";
  _state.progress = {
    phase: "media_migration",
    totalItems: Object.keys(mapping.products).length,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    startTime: new Date().toISOString(),
    errors: [],
    mediaProgress: {
      totalProducts: Object.keys(mapping.products).length,
      processedProducts: 0,
    },
  };
  _mapping = mapping;
  _notify();

  const wooConfig = {
    wordpressUrl: config.wordpressUrl,
    consumerKey: config.wooConsumerKey,
    consumerSecret: config.wooConsumerSecret,
  };

  const medusaConfig: MedusaConfig = {
    backendUrl: config.medusaBackendUrl,
    adminApiKey: config.medusaAdminKey,
    adminEmail: config.medusaAdminEmail,
    adminPassword: config.medusaAdminPassword,
  };

  const infoLog: MigrationLog = {
    id: createLogId(),
    step: "media_only",
    action: "INFO",
    status: "info",
    message: `Bắt đầu migrate ảnh cho ${Object.keys(mapping.products).length} sản phẩm...`,
    timestamp: new Date().toISOString(),
  };
  _emitLog(infoLog);
  if (onLog) onLog(infoLog);
  if (onProgress) onProgress(_state.progress);

  try {
    // Fetch WooCommerce products (cần để lấy image URLs)
    const prodResult = await fetchAllProducts(wooConfig);
    if (!prodResult.success || !prodResult.data) {
      throw new Error("Không thể lấy sản phẩm từ WooCommerce: " + (prodResult.error || "Unknown"));
    }

    const wooProducts = prodResult.data.products;
    _state.progress.totalItems = wooProducts.length;

    // Debug: log WooCommerce products images data
    console.log(`[MigrationManager] WooCommerce products count: ${wooProducts.length}`);
    for (let i = 0; i < Math.min(3, wooProducts.length); i++) {
      const p = wooProducts[i];
      console.log(`[MigrationManager] Product[${i}] wooId=${p.id} name="${p.name}" images_count=${p.images?.length ?? 0}`);
      if (p.images) {
        for (let j = 0; j < p.images.length; j++) {
          console.log(`[MigrationManager]   image[${j}]: ${p.images[j].src}`);
        }
      }
      console.log(`[MigrationManager]   description_length=${p.description?.length ?? 0}`);
      console.log(`[MigrationManager]   short_description_length=${p.short_description?.length ?? 0}`);
    }
    _state.progress.mediaProgress = { totalProducts: wooProducts.length, processedProducts: 0 };
    _notify();
    if (onProgress) onProgress(_state.progress);

    // Import media service v2
    const { imageMigrationServiceV2 } = await import("./image-migration.v2");
    const mediaPool = imageMigrationServiceV2.loadPool();

    const mediaOpts: MediaMigrationOptions = {
      downloadThumbnails: options.mediaOptions?.downloadThumbnails ?? true,
      downloadGallery: options.mediaOptions?.downloadGallery ?? true,
      downloadCategoryImages: options.mediaOptions?.downloadCategoryImages ?? false,
      downloadDescriptionImages: options.mediaOptions?.downloadDescriptionImages ?? false,
      downloadShortDescImages: options.mediaOptions?.downloadShortDescImages ?? false,
      rewriteHtmlDescriptions: options.mediaOptions?.rewriteHtmlDescriptions ?? false,
      reuseExistingMedia: options.mediaOptions?.reuseExistingMedia ?? true,
      maxRetries: 3,
      timeoutMs: 30000,
      maxFileSizeBytes: 10 * 1024 * 1024,
      onlyFromWordpressDomain: options.mediaOptions?.onlyFromWordpressDomain ?? true,
    };

    const imgConfig = options.imageConfig
      || (typeof window !== "undefined"
        ? (() => {
          try {
            const stored = localStorage.getItem("mtl_image_upload_config");
            if (stored) return JSON.parse(stored);
          } catch { /* ignore */ }
          return null;
        })()
        : null)
      || undefined;

    const mediaContext = {
      wordpressBaseUrl: config.wordpressUrl || "",
      medusaBackendUrl: config.medusaBackendUrl || "",
      adminUiBaseUrl: config.adminUiUrl || `${typeof window !== "undefined" ? window.location.origin : ""}`,
      jobId: `media_only_${Date.now()}`,
      onLog: (msg: string, type: "info" | "warn" | "error" | "success") => {
        const logEntry: MigrationLog = {
          id: createLogId(),
          step: "media_migration",
          action: type.toUpperCase(),
          status: type === "warn" ? "warning" : type,
          message: msg,
          timestamp: new Date().toISOString(),
        };
        _emitLog(logEntry);
        if (onLog) onLog(logEntry);
      },
      imageConfig: imgConfig,
    };

    const existingProductIds: Record<number, string> = {};
    for (const [wooIdStr, medusaId] of Object.entries(_mapping.products)) {
      existingProductIds[parseInt(wooIdStr, 10)] = medusaId;
    }

    const result = await imageMigrationServiceV2.migrateProducts(
      wooProducts,
      existingProductIds,
      mediaPool,
      mediaContext,
      mediaOpts,
      async (medusaProductId, wooId, updates) => {
        try {
          const normalizedUpdates: Partial<MedusaProduct> = { ...updates };
          const { updateProduct } = await import("./medusa.service");
          const updateRes = await updateProduct(
            medusaConfig,
            medusaProductId,
            normalizedUpdates,
            { imageBaseUrl: config.adminUiUrl || `${typeof window !== "undefined" ? window.location.origin : ""}` }
          );

          _state.progress.mediaProgress = {
            totalProducts: wooProducts.length,
            processedProducts: (_state.progress.mediaProgress?.processedProducts ?? 0) + 1,
          };
          _state.progress.currentItemIndex = _state.progress.mediaProgress.processedProducts;
          _state.progress.currentItemName = `SP #${wooId}`;
          _notify();
          if (onProgress) onProgress(_state.progress);

          return { success: updateRes.success, error: updateRes.error };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : "Unknown" };
        }
      }
    );

    imageMigrationServiceV2.savePool(mediaPool);

    _state.stats.migratedProducts = result.updatedProducts;
    _state.phase = "done";
    _state.isRunning = false;
    _state.progress.endTime = new Date().toISOString();
    _notify();

    const doneLog: MigrationLog = {
      id: createLogId(),
      step: "media_only",
      action: result.failedProducts === 0 ? "SUCCESS" : "WARNING",
      status: result.failedProducts === 0 ? "success" : "warning",
      message: `Migrate anh hoan tat: ${result.updatedProducts} san pham | Downloaded: ${result.downloaded} | Reused: ${result.reused} | Failed: ${result.failed}`,
      timestamp: new Date().toISOString(),
    };
    _emitLog(doneLog);
    if (onLog) onLog(doneLog);

    return { success: true, stats: { updated: result.updatedProducts, failed: result.failedProducts } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    _state.phase = "failed";
    _state.isRunning = false;
    _state.progress.errors.push({
      itemId: "media_error",
      itemName: "Media Migration Error",
      phase: _state.phase,
      message: errorMessage,
      retryable: true,
      timestamp: new Date().toISOString(),
    });
    _notify();

    const errLog: MigrationLog = {
      id: createLogId(),
      step: "media_only",
      action: "ERROR",
      status: "error",
      message: `Migrate ảnh thất bại: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };
    _emitLog(errLog);
    if (onLog) onLog(errLog);

    return { success: false, stats: { updated: 0, failed: 0 } };
  }
}
