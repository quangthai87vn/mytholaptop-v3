/**
 * Migration Orchestration Service
 *
 * Quản lý luồng migration tổng thể:
 * fetch → transform → upload → log → rollback
 *
 * Kiến trúc hỗ trợ:
 * - Bulk migration với chunk processing
 * - Retry logic
 * - Resume if interrupted
 * - ID mapping
 * - History tracking
 */

import type {
  WooProduct,
  WooCategory,
  MedusaProduct,
  MedusaCategory,
  MigrationConfig,
  MigrationDataType,
  ConflictStrategy,
  MigrationOptions,
  MigrationMode,
  MigrationProgress,
  MigrationLog,
  MigrationStats,
  MigrationHistory,
  IdMapping,
  TransformError,
  ImageTransformResult,
} from "@/types";

const DEBUG = true;
function debug(...args: unknown[]) {
  if (DEBUG) console.debug("[Migration]", ...args);
}

import {
  fetchCategories,
  fetchProducts,
  fetchAllProducts,
  testConnection,
  WooCommerceConfig,
} from "./woocommerce.service";

import {
  createCategory,
  batchCreateCategories,
  createProduct,
  batchCreateProducts,
  findProductBySku,
  updateProduct,
  uploadImage,
  deleteProducts,
  deleteCategories,
  deleteAllCategories,
  deleteAllProducts,
  deleteInventoryItemsBySku,
  deleteInventoryItems,
  checkInventoryItemBySku,
  listAllProducts,
  listAllCategories,
  medusaRequest,
  MedusaConfig,
  saveIdMapping,
  loadIdMapping,
  clearIdMapping,
} from "./medusa.service";

import {
  transformProduct,
  transformCategory,
  transformProducts,
  transformCategories,
  transformImageUrl,
  transformDescription,
  calculateChunks,
  chunkArray,
  ProductTransformConfig,
  sortCategoriesByHierarchy,
  buildCategoryLevelMap,
} from "@/lib/transform";

// ============================================================
// CLEANUP: AbortController for cancellation
// ============================================================

let globalAbortController: AbortController | null = null;

/**
 * Get or create an AbortController for the current migration.
 */
export function getMigrationAbortController(): AbortController {
  if (!globalAbortController) {
    globalAbortController = new AbortController();
  }
  return globalAbortController;
}

/**
 * Cancel the current migration.
 */
export function cancelMigration(): void {
  if (globalAbortController) {
    console.log("[Migration] Cancelling migration...");
    globalAbortController.abort();
    globalAbortController = null;
  }
}

/**
 * Reset the abort controller for a new migration.
 */
export function resetMigrationAbort(): void {
  if (globalAbortController) {
    globalAbortController.abort(); // Cancel any existing
  }
  globalAbortController = new AbortController();
}

// ============================================================
// MIGRATION PIPELINE
// ============================================================

export type MigrationCallback = (log: MigrationLog) => void;
export type ProgressCallback = (progress: MigrationProgress) => void;

export interface MigrationState {
  config: MigrationConfig;
  options: MigrationOptions;
  progress: MigrationProgress;
  logs: MigrationLog[];
  stats: MigrationStats;
  mapping: IdMapping;
}

/**
 * Xoá toàn bộ dữ liệu đã migrate trước khi sync mới.
 * Dùng khi migrationMode = "restart".
 */
async function clearExistingData(
  medusaConfig: MedusaConfig,
  onLog: MigrationCallback,
  onProgress: ProgressCallback
): Promise<{ success: boolean; deletedProducts: number; deletedCategories: number }> {
  const progress: MigrationProgress = {
    phase: "clearing",
    totalItems: 1,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    startTime: new Date().toISOString(),
    errors: [],
  };
  onProgress(progress);

  let deletedProducts = 0;
  let deletedCategories = 0;

  // === Bước 1: Lấy tất cả products để extract SKUs ===
  log(onLog, "clear", "info", "Đang lấy danh sách products từ Medusa...");
  progress.phase = "clearing_products";
  progress.currentItemName = "Đang lấy danh sách products...";
  onProgress(progress);

  const allProductsResult = await listAllProducts(medusaConfig);
  const productIds: string[] = [];
  if (allProductsResult.success && allProductsResult.data && allProductsResult.data.length > 0) {
    for (const p of allProductsResult.data) {
      productIds.push(p.id);
    }
    log(onLog, "clear", "info", `Tìm thấy ${productIds.length} products trong Medusa.`);
  } else if (!allProductsResult.success) {
    log(onLog, "clear", "error", `Không thể lấy danh sách products: ${allProductsResult.error}`);
  } else {
    log(onLog, "clear", "info", "Không có product nào để xoá.");
  }

  // === Bước 2: Xoá inventory items bằng custom API (trước khi xoá products) ===
  // Thu thập SKUs từ tất cả products để xóa inventory
  log(onLog, "clear", "info", "Thu thập SKUs từ products...");
  const allSkus: string[] = [];
  const chunkSize = 50;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    // Gọi Medusa API để lấy variants với SKU
    const idsParam = chunk.map((id) => `id[]=${encodeURIComponent(id)}`).join("&");
    const result = await medusaRequest<{
      products: Array<{ id: string; variants: Array<{ sku?: string }> }>;
    }>(`/admin/products?fields[]=id&fields[]=variants.id&fields[]=variants.sku&limit=${chunk.length}&offset=0`, medusaConfig);
    if (result.success && result.data?.products) {
      for (const prod of result.data.products) {
        for (const variant of prod.variants || []) {
          if (variant.sku) {
            allSkus.push(variant.sku);
          }
        }
      }
    }
  }

  // Xóa inventory items bằng SKUs (dùng custom API)
  if (allSkus.length > 0) {
    log(onLog, "clear", "info", `Đang xoá ${allSkus.length} inventory items theo SKU...`);
    progress.currentItemName = `Đang xoá ${allSkus.length} inventory items...`;
    onProgress(progress);

    const invResult = await deleteInventoryItemsBySku(medusaConfig, allSkus);
    if (invResult.success && invResult.data) {
      log(onLog, "clear", "success", `Đã xoá ${invResult.data.deleted} inventory items`);
    } else {
      log(onLog, "clear", "warning", `Lỗi xoá inventory items: ${invResult.error || "Unknown"} — tiếp tục xoá products`);
    }
  } else {
    log(onLog, "clear", "info", "Không có inventory item nào để xoá.");
  }

  // === Bước 3: Xoá products ===
  if (productIds.length > 0) {
    log(onLog, "clear", "info", `Đang xoá ${productIds.length} products...`);
    progress.currentItemName = `Đang xoá ${productIds.length} products...`;
    onProgress(progress);

    const result = await deleteProducts(medusaConfig, productIds);
    if (result.success && result.data) {
      deletedProducts = result.data.deleted;
      log(onLog, "clear", "success", `Đã xoá ${deletedProducts} products`);
    } else {
      log(onLog, "clear", "error", `Lỗi xoá products: ${result.error || "Unknown error"}`);
    }
    progress.processedItems = productIds.length;
    onProgress(progress);
  }

  // === Bước 4: Xoá categories (con trước, cha sau) ===
  log(onLog, "clear", "info", "Đang lấy danh sách categories từ Medusa...");
  progress.phase = "clearing_categories";
  progress.currentItemName = "Đang lấy danh sách categories...";
  onProgress(progress);

  const allCatsResult = await listAllCategories(medusaConfig);
  if (allCatsResult.success && allCatsResult.data && allCatsResult.data.length > 0) {
    // Reverse để xóa children trước (Medusa yêu cầu xóa con trước khi xóa cha)
    const sortedCats = [...allCatsResult.data].reverse();
    const categoryIds = sortedCats.map((c) => c.id);

    // Đếm parents vs children để log
    const parentCount = allCatsResult.data.filter((c) => !("parent_category_id" in c) || !(c as unknown as { parent_category_id?: string }).parent_category_id).length;
    const childCount = categoryIds.length - parentCount;
    log(
      onLog,
      "clear",
      "info",
      `Xoá ${childCount} categories con trước, sau đó ${parentCount} categories cha...`
    );
    progress.currentItemName = `Đang xoá ${categoryIds.length} categories...`;
    onProgress(progress);

    const result = await deleteCategories(medusaConfig, categoryIds);
    if (result.success && result.data) {
      deletedCategories = result.data.deleted;
      log(onLog, "clear", "success", `Đã xoá ${deletedCategories} categories`);
    } else {
      log(onLog, "clear", "error", `Lỗi xoá categories: ${result.error || "Unknown error"}`);
    }
    progress.processedItems = productIds.length + categoryIds.length;
    onProgress(progress);
  } else if (!allCatsResult.success) {
    log(onLog, "clear", "error", `Không thể lấy danh sách categories: ${allCatsResult.error}`);
  } else {
    log(onLog, "clear", "info", "Không có category nào để xoá.");
  }

  clearIdMapping();

  log(
    onLog,
    "clear",
    "success",
    `Đã xoá toàn bộ dữ liệu cũ: ${deletedProducts} sản phẩm, ${deletedCategories} danh mục.`
  );

  return { success: true, deletedProducts, deletedCategories };
}

/**
 * Main migration orchestrator.
 * Handles the complete flow: fetch → transform → upload → done.
 * Khi migrationMode = "restart": xoá dữ liệu cũ trước khi sync.
 */
export async function runMigration(
  config: MigrationConfig,
  options: MigrationOptions,
  onLog: MigrationCallback,
  onProgress: ProgressCallback
): Promise<{ success: boolean; stats: MigrationStats; mapping: IdMapping }> {
  const wooConfig: WooCommerceConfig = {
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

  const imageConfig = {
    sourceDomain: config.wordpressUrl,
    targetDomain: "", // Keep original URLs
    uploadToMedusa: false,
  };

  const descriptionConfig = {
    sourceDomain: config.wordpressUrl,
    targetDomain: "",
    removeGutenbergBlocks: true,
    stripInlineStyles: true,
  };

  const transformConfig: ProductTransformConfig = {
    imageConfig,
    descriptionConfig,
    defaultCurrency: "vnd",
    defaultStatus: undefined, // Let transform decide: WooCommerce publish -> published, others -> draft
  };

  // Initialize state
  const stats: MigrationStats = {
    totalCategories: 0,
    migratedCategories: 0,
    totalProducts: 0,
    migratedProducts: 0,
    failedProducts: 0,
    skippedProducts: 0,
    totalVariants: 0,
    migratedVariants: 0,
  };

  const mapping: IdMapping = {
    categories: {},
    products: {},
    images: {},
    tags: {},
  };

  // Initialize progress tracking
  const progress: MigrationProgress = {
    phase: "fetching",
    totalItems: 0,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    startTime: new Date().toISOString(),
    errors: [],
  };

  // Get abort controller for this migration
  const abortController = getMigrationAbortController();

  // Check for abort at start
  if (abortController.signal.aborted) {
    log(onLog, "cancel", "warning", "Migration đã bị huỷ trước khi bắt đầu.");
    return { success: false, stats, mapping };
  }

  // Load existing mapping for resume
  const existingMapping = loadIdMapping();
  if (existingMapping) {
    Object.assign(mapping, existingMapping);
    log(onLog, "resume", "info", "Tiếp tục migration từ lần trước...");
  }

  // Force restart khi conflictStrategy = "create" để tránh inventory conflict
  const effectiveMode: MigrationMode =
    options.conflictStrategy === "create" ? "restart" : options.migrationMode;

  // Nếu mode = restart, xoá dữ liệu cũ trước
  if (effectiveMode === "restart") {
    log(
      onLog,
      "clear",
      "warning",
      options.conflictStrategy === "create"
        ? "Chế độ 'Tạo mới' — tự động xoá dữ liệu cũ trước để tránh conflict..."
        : "Chế độ đồng bộ lại từ đầu - xoá dữ liệu cũ trước..."
    );
    progress.phase = "clearing";
    onProgress(progress);

    const clearResult = await clearExistingData(medusaConfig, onLog, onProgress);
    if (!clearResult.success) {
      log(onLog, "clear", "error", "Xoá dữ liệu cũ thất bại. Hủy migration.");
      progress.phase = "failed";
      onProgress(progress);
      return { success: false, stats, mapping };
    }

    // Reset mapping sau khi xoá và LƯU NGAY để tránh stale data
    mapping.categories = {};
    mapping.products = {};
    mapping.images = {};
    mapping.tags = {};
    saveIdMapping(mapping);
  }

  // === PHASE 1: FETCH CATEGORIES ===
  if (options.selectedTypes.includes("categories")) {
    log(onLog, "fetch_categories", "info", "Bắt đầu lấy danh mục từ WooCommerce...");

    const catResult = await fetchCategories(wooConfig);
    if (!catResult.success || !catResult.data) {
      log(onLog, "fetch_categories", "error", "Không thể lấy danh mục: " + (catResult.error || "Unknown error"));
      progress.phase = "failed";
      onProgress(progress);
      return { success: false, stats, mapping };
    }

    const categories: WooCategory[] = catResult.data;
    stats.totalCategories = categories.length;
    log(onLog, "fetch_categories", "success", `Lấy được ${categories.length} danh mục`);

    // Sort categories by hierarchy so parents are created before children
    const sortedCategories = sortCategoriesByHierarchy(categories);

    // Transform categories
    progress.phase = "transforming";
    onProgress(progress);
    log(onLog, "transform_categories", "info", "Đang chuyển đổi định dạng danh mục...");

    // catMapping: wooCategoryId (number) -> medusaCategoryId
    const catMapping: Record<number, string> = {};

    // Build category level map for hierarchy-aware processing
    const categoryLevelMap = buildCategoryLevelMap(categories);

    const transformedCategories = sortedCategories.map((c) => {
      const level = categoryLevelMap.get(c.id) ?? 0;
      const result = transformCategory(c, level);
      if (!result.success || !result.data) {
        log(onLog, "transform_categories", "warning", `Danh mục "${c.name || c.id}" bị bỏ qua do transform lỗi`);
        return null;
      }
      return result.data;
    }).filter((cat): cat is NonNullable<typeof cat> => cat !== null);

    // Upload categories in chunks
    progress.totalItems = categories.length;
    progress.processedItems = 0;
    progress.phase = "uploading_categories";
    onProgress(progress);

    // Upload ALL categories at once (batchCreateCategories handles hierarchy internally)
    progress.totalItems = categories.length;
    progress.processedItems = 0;
    progress.phase = "uploading_categories";
    onProgress(progress);

    // Pass catMapping so batchCreateCategories can update it with new Medusa IDs
    // and resolve parent_category_id for child categories
    const batchResult = await batchCreateCategories(medusaConfig, transformedCategories, catMapping);

    if (batchResult.success && batchResult.data) {
      // Use wooIdToMedusaId for accurate mapping
      if (batchResult.data.wooIdToMedusaId) {
        for (const [wooIdStr, medusaId] of Object.entries(batchResult.data.wooIdToMedusaId)) {
          const wooIdNum = parseInt(wooIdStr, 10);
          catMapping[wooIdNum] = medusaId;
          mapping.categories[wooIdNum] = medusaId;
        }
      }
      stats.migratedCategories += batchResult.data.created + batchResult.data.updated;
      progress.successCount = stats.migratedCategories;
      progress.processedItems = stats.migratedCategories;
      progress.currentItemName = `${stats.migratedCategories}/${stats.totalCategories} danh mục`;
      onProgress(progress);
      if (batchResult.data.updated > 0) {
        log(
          onLog,
          "migrate_categories",
          "success",
          `Đã tạo ${batchResult.data.created} danh mục, cập nhật ${batchResult.data.updated} danh mục`
        );
      } else {
        log(
          onLog,
          "migrate_categories",
          "success",
          `Đã tạo ${batchResult.data.created} danh mục`
        );
      }
      if (batchResult.data.failed > 0) {
        log(
          onLog,
          "migrate_categories",
          "warning",
          `${batchResult.data.failed} danh mục bị lỗi`
        );
      }
    } else if (batchResult.error) {
      log(onLog, "migrate_categories", "error", `Lỗi khi tạo danh mục: ${batchResult.error}`);
    }

    // Log category creation errors with details
    if (batchResult.data?.errors && batchResult.data.errors.length > 0) {
      batchResult.data.errors.forEach((e) => {
        log(
          onLog,
          "migrate_categories",
          "error",
          `Lỗi tạo danh mục: ${e.message}`
        );
      });
    }

    progress.processedItems = transformedCategories.length;
    onProgress(progress);

    saveIdMapping(mapping);
  }

  // === PHASE 2: FETCH PRODUCTS ===
  let fetchedProducts: WooProduct[] = [];
  if (options.selectedTypes.includes("products")) {
    log(onLog, "fetch_products", "info", "Bắt đầu lấy sản phẩm từ WooCommerce...");

    const prodResult = await fetchAllProducts(wooConfig);
    if (!prodResult.success || !prodResult.data) {
      log(onLog, "fetch_products", "error", "Không thể lấy sản phẩm: " + (prodResult.error || "Unknown error"));
      progress.phase = "failed";
      onProgress(progress);
      return { success: false, stats, mapping };
    }

    fetchedProducts = prodResult.data.products;
    debug("fetchProducts: WooCommerce returned", fetchedProducts.length, "products");
    stats.totalProducts = fetchedProducts.length;
    log(onLog, "fetch_products", "success", `Lấy được ${fetchedProducts.length} sản phẩm`);

    // Transform all products
    progress.phase = "transforming";
    onProgress(progress);
    log(onLog, "transform_products", "info", "Đang chuyển đổi định dạng sản phẩm...");

    const { successful, failed, allWarnings } = transformProducts(fetchedProducts, transformConfig);

    stats.totalProducts = fetchedProducts.length;
    stats.failedProducts = failed.length;

    allWarnings.forEach((w) => {
      log(
        onLog,
        "transform_products",
        "warning",
        `[${w.productId}] ${w.field}: ${w.message}`
      );
    });

    log(
      onLog,
      "transform_products",
      "success",
      `Chuyển đổi xong: ${successful.length} thành công, ${failed.length} lỗi`
    );

    // === PHASE 3: UPLOAD PRODUCTS ===
    progress.phase = "uploading";
    progress.totalItems = successful.length;
    progress.processedItems = 0;
    onProgress(progress);

    // Tăng batch size để giảm số API calls - 200 sản phẩm mỗi batch
    const productChunkSize = options.batchSize || 200;
    const productChunks = chunkArray(successful, productChunkSize);
    // Tổng số sản phẩm đã xử lý tính từ đầu (để hiển thị index chính xác)
    let globalIndex = 0;

    for (let i = 0; i < productChunks.length; i++) {
      // Check for abort at start of each product chunk
      if (abortController.signal.aborted) {
        log(onLog, "cancel", "warning", "Migration bị huỷ bởi người dùng (products loop).");
        progress.phase = "failed";
        progress.errors.push({
          itemId: "user_cancel",
          itemName: "User Cancel",
          phase: "failed",
          message: "Migration bị huỷ bởi người dùng",
          retryable: false,
          timestamp: new Date().toISOString(),
        });
        onProgress(progress);
        // Clear abort controller
        globalAbortController = null;
        return { success: false, stats, mapping };
      }

      const chunk = productChunks[i];

      progress.currentItem = `Lote ${i + 1}/${productChunks.length}`;
      progress.currentItemIndex = i + 1;
      progress.currentItemName = `${chunk.length} sản phẩm trong lote`;
      onProgress(progress);

      // Check for existing products based on conflict strategy
      const processedProducts: Array<{ medusa: MedusaProduct; wooId: number }> = [];

      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j];
        const product = item.medusa;
        globalIndex++;

        // Cập nhật tiến trình chi tiết từng sản phẩm
        progress.currentItemName = product.title || `Sản phẩm #${item.wooId}`;
        progress.currentItemIndex = globalIndex;
        onProgress(progress);

        // Chỉ kiểm tra trùng lặp khi strategy != "create"
        if (options.conflictStrategy !== "create") {
          const sku = product.originalSku || product.variants?.[0]?.originalSku || "";
          const existing = await findProductBySku(medusaConfig, sku);
          if (existing && existing.success && existing.data) {
            const existingId = existing.data.id;

            if (options.conflictStrategy === "skip") {
              stats.skippedProducts++;
              mapping.products[item.wooId] = existingId;
              log(
                onLog,
                "migrate_products",
                "warning",
                `Bỏ qua sản phẩm đã tồn tại: ${product.title} (SKU: ${sku})`
              );
              continue;
            }

            if (options.conflictStrategy === "update") {
              // Resolve Medusa category IDs from WooCommerce category IDs
              const resolvedCategories: Array<{ id: string }> = [];
              if (item.medusa.categoryIds && item.medusa.categoryIds.length > 0) {
                item.medusa.categoryIds.forEach((wcId) => {
                  const mcId = mapping.categories[wcId];
                  if (mcId) {
                    resolvedCategories.push({ id: mcId });
                  }
                });
              }

              // Build update payload without variants (Medusa v2 doesn't support updating variants via product update)
              // NOTE: subtitle is NOT accepted by Medusa v2 Admin API — do not include it
              const updatePayload: Partial<MedusaProduct> = {
                title: product.title,
                description: product.description,
                status: product.status,
                images: product.images,
                options: product.options,
                categories: resolvedCategories.length > 0 ? resolvedCategories : undefined,
              };

              const updateResult = await updateProduct(medusaConfig, existingId, updatePayload);

              mapping.products[item.wooId] = existingId;
              if (updateResult.success) {
                log(
                  onLog,
                  "migrate_products",
                  "success",
                  `[${globalIndex}] Cập nhật sản phẩm: ${product.title} (ID: ${existingId})`
                );
                stats.migratedProducts++;
                progress.successCount = stats.migratedProducts;
                onProgress(progress);
              } else {
                log(
                  onLog,
                  "migrate_products",
                  "error",
                  `[${globalIndex}] Lỗi cập nhật sản phẩm ${product.title}: ${updateResult.error}`
                );
                stats.failedProducts++;
                progress.failCount = stats.failedProducts;
                onProgress(progress);
              }
              continue;
            }
          } else if (existing && !existing.success) {
            // findProductBySku failed — log warning but try to create anyway
            log(
              onLog,
              "migrate_products",
              "warning",
              `Không thể kiểm tra tồn tại cho SKU ${sku}: ${existing.error}. Tiếp tục tạo mới.`
            );
          }
        }

        // Resolve categories that are available, log warning for unmapped ones
        // (Medusa accepts products with partial category mapping)
        const mappedCategoryIds = item.medusa.categoryIds
          ? item.medusa.categoryIds.filter((wcId) => mapping.categories[wcId])
          : [];
        const unmappedCategoryIds = item.medusa.categoryIds
          ? item.medusa.categoryIds.filter((wcId) => !mapping.categories[wcId])
          : [];
        if (unmappedCategoryIds.length > 0) {
          log(
            onLog,
            "migrate_products",
            "warning",
            `Sản phẩm "${product.title}" (ID: ${item.wooId}) có ${unmappedCategoryIds.length} categories chưa được migrate — sẽ tạo với ${mappedCategoryIds.length} categories đã map.`
          );
        }

        processedProducts.push({ medusa: product, wooId: item.wooId });
      }

      // Batch create new products
      if (processedProducts.length > 0) {
        debug("Creating", processedProducts.length, "new products (batch)", i + 1, "of", productChunks.length);
        debug("First product:", processedProducts[0]?.medusa?.title, "SKU:", processedProducts[0]?.medusa?.originalSku);

        // Chỉ log một dòng cho cả batch thay vì log từng sản phẩm (tránh quá tải UI)
        const batchInfo = `[${globalIndex - processedProducts.length + 1}-${globalIndex}/${successful.length}] Đang tạo batch ${i + 1}/${productChunks.length} (${processedProducts.length} sản phẩm)`;
        log(onLog, "migrate_products", "info", batchInfo);

        // Resolve Medusa category IDs for each product before sending to API
        // Medusa v2 expects categories as Array<{ id: string }> in the product payload
        const wooIdList = processedProducts.map((p) => p.wooId);
        const batchMedusaProducts = processedProducts.map((p) => {
          const resolvedCategories: Array<{ id: string }> = [];
          if (p.medusa.categoryIds && p.medusa.categoryIds.length > 0) {
            p.medusa.categoryIds.forEach((wcId) => {
              const mcId = mapping.categories[wcId];
              if (mcId) {
                resolvedCategories.push({ id: mcId });
              }
            });
          }
          return {
            ...p.medusa,
            categories: resolvedCategories.length > 0 ? resolvedCategories : undefined,
          };
        });
        const batchResult = await batchCreateProducts(
          medusaConfig,
          batchMedusaProducts,
          wooIdList
        );

        debug("batchCreateProducts result:", batchResult.success, "created:", batchResult.data?.created, "failed:", batchResult.data?.failed, "ids length:", batchResult.data?.ids?.length);
        console.log("[Migration] Batch", i + 1, "result:", {
          success: batchResult.success,
          created: batchResult.data?.created,
          failed: batchResult.data?.failed,
          idsCount: batchResult.data?.ids?.length || 0,
          processedProductsCount: processedProducts.length
        });

        if (batchResult.success && batchResult.data) {
          // Update stats for each successfully created product
          for (const [idx, medusaId] of batchResult.data.ids.entries()) {
            if (idx < processedProducts.length) {
              const originalProduct = processedProducts[idx].medusa;
              const wooId = processedProducts[idx].wooId;
              mapping.products[wooId] = medusaId;
              stats.migratedProducts++;
              progress.successCount = stats.migratedProducts;

              // Update inventory via Medusa Inventory Module (Medusa v2)
              if (originalProduct.variants) {
                stats.migratedVariants += originalProduct.variants.length;

                // Update inventory for first variant (primary stock)
                const firstVariant = originalProduct.variants[0];
                if (firstVariant?.sku && firstVariant.inventory_quantity !== undefined) {
                  try {
                    const { updateInventoryItemQuantity } = await import("./medusa.service");
                    const invResult = await updateInventoryItemQuantity(
                      medusaConfig,
                      firstVariant.sku,
                      firstVariant.inventory_quantity,
                      {
                        manageInventory: firstVariant.manage_inventory ?? true,
                        allowBackorder: false,
                      }
                    );
                    if (!invResult.success) {
                      console.debug(`[Migration] Failed to update inventory for SKU ${firstVariant.sku}:`, invResult.error);
                    }
                  } catch (invErr) {
                    console.debug(`[Migration] Inventory update error for SKU ${firstVariant.sku}:`, invErr);
                  }
                }
              }

              log(
                onLog,
                "migrate_products",
                "success",
                `[${globalIndex - processedProducts.length + idx + 1}/${successful.length}] Tạo thành công: "${originalProduct.title}" → Medusa ID: ${medusaId} | Categories: ${originalProduct.categories?.length || 0} | Variants: ${originalProduct.variants?.length || 0} | Giá: ${originalProduct.variants?.[0]?.prices?.[0]?.amount ? (originalProduct.variants[0].prices![0].amount / 100).toLocaleString("vi-VN") + "đ" : "—"} | Tồn: ${(() => { const v = originalProduct.variants?.[0]; if (!v) return "N/A"; const qty = v.inventory_quantity; const managed = v.manage_inventory; if (!managed) return "Không QL tồn"; if (qty === undefined) return "N/A"; return qty > 0 ? `Còn ${qty}` : "Hết hàng"; })()}`
              );
            }
          }

          if (batchResult.data.failed > 0) {
            stats.failedProducts += batchResult.data.failed;
            progress.failCount = stats.failedProducts;
            batchResult.data.errors.forEach((e) => {
              log(
                onLog,
                "migrate_products",
                "error",
                `Lỗi: "${e.productTitle}" — ${e.message}`
              );
            });
          }
        } else {
          log(
            onLog,
            "migrate_products",
            "error",
            `Lỗi batch ${i + 1}: ${batchResult.error || "Unknown error"}`
          );
          stats.failedProducts += processedProducts.length;
          progress.failCount = stats.failedProducts;
        }
      } else {
        // Tất cả sản phẩm trong chunk đã skip hoặc update
        log(
          onLog,
          "migrate_products",
          "info",
          `Lote ${i + 1}: ${chunk.length} sản phẩm đã skip/update (conflict strategy: ${options.conflictStrategy})`
        );
      }

      // Xử lý sản phẩm trùng lặp (skip/update) ngay trong chunk — tính vào progress
      const skippedOrUpdated = chunk.length - processedProducts.length;
      if (skippedOrUpdated > 0) {
        progress.processedItems = globalIndex;
        progress.currentItemIndex = globalIndex;
        onProgress(progress);
      }

      progress.processedItems = globalIndex;
      progress.successCount = stats.migratedProducts;
      progress.failCount = stats.failedProducts;
      onProgress(progress);

      saveIdMapping(mapping);
    }

    // Log failed transforms
    failed.forEach((f) => {
      log(
        onLog,
        "migrate_products",
        "error",
        `Sản phẩm ID ${f.wooId} transform lỗi: ${f.errors.map((e) => e.message).join(", ")}`
      );
    });
  }

  // === DONE ===
  progress.phase = "done";
  progress.endTime = new Date().toISOString();
  progress.successCount = stats.migratedProducts + stats.migratedCategories;
  onProgress(progress);

  log(
    onLog,
    "done",
    "success",
    `Migration hoàn tất! Đã migrate ${stats.migratedProducts} sản phẩm, ${stats.migratedCategories} danh mục. Thất bại: ${stats.failedProducts}.`
  );

  // ============================================================
  // POST-MIGRATION: VALIDATION REPORT
  // ============================================================
  const validationReport = await runValidationReport(
    {
      wordpressUrl: config.wordpressUrl,
      wooConsumerKey: config.wooConsumerKey,
      wooConsumerSecret: config.wooConsumerSecret,
      medusaBackendUrl: config.medusaBackendUrl,
      medusaAdminKey: config.medusaAdminKey,
      medusaAdminEmail: config.medusaAdminEmail,
      medusaAdminPassword: config.medusaAdminPassword,
    },
    stats,
    {
      totalMigratedProducts: stats.migratedProducts,
      totalMigratedCategories: stats.migratedCategories,
      failedProducts: stats.failedProducts,
      skippedProducts: stats.skippedProducts,
    }
  );

  if (validationReport.hasWarnings) {
    log(
      onLog,
      "validation",
      "warning",
      `Cảnh báo migration: ${validationReport.warnings.length} vấn đề phát hiện (xem chi tiết trong Validation Report)`
    );
  }
  log(
    onLog,
    "validation",
    "success",
    `Validation Report: ${validationReport.totalProducts} sản phẩm có category, ${validationReport.missingCategory} thiếu category, ${validationReport.missingPrice} thiếu giá, ${validationReport.unmanagedStock} không quản lý tồn kho`
  );

  return { success: true, stats, mapping };
}

// ============================================================
// PREVIEW MODE
// ============================================================

export interface PreviewResult {
  categories: WooCategory[];
  products: WooProduct[];
  productValidations: Array<{
    productId: number;
    productName: string;
    issues: Array<{ type: "error" | "warning"; field: string; message: string }>;
  }>;
  estimatedTime: number; // seconds
}

/**
 * Run preview mode — fetch data and validate without migrating.
 */
export async function runPreview(
  config: MigrationConfig,
  options: MigrationOptions,
  onLog: MigrationCallback
): Promise<PreviewResult> {
  const wooConfig: WooCommerceConfig = {
    wordpressUrl: config.wordpressUrl,
    consumerKey: config.wooConsumerKey,
    consumerSecret: config.wooConsumerSecret,
  };

  const result: PreviewResult = {
    categories: [],
    products: [],
    productValidations: [],
    estimatedTime: 0,
  };

  if (options.selectedTypes.includes("categories")) {
    log(onLog, "preview", "info", "Đang lấy danh mục để preview...");
    const catResult = await fetchCategories(wooConfig);
    if (catResult.success && catResult.data) {
      result.categories = catResult.data;
    }
  }

  if (options.selectedTypes.includes("products")) {
    log(onLog, "preview", "info", "Đang lấy sản phẩm để preview...");
    const prodResult = await fetchProducts(wooConfig);
    if (prodResult.success && prodResult.data) {
      result.products = prodResult.data.products;

      // Estimate time: 2s per 100 products + processing
      result.estimatedTime = Math.ceil(result.products.length / 100) * 2;
    }
  }

  return result;
}

// ============================================================
// ROLLBACK
// ============================================================

/**
 * Rollback migration — delete all migrated items from Medusa.
 * @param config - Migration configuration
 * @param onLog - Callback for logging
 * @param onProgress - Callback for progress updates
 * @param mappingData - Optional mapping data (if not provided, loads from localStorage)
 */
export async function rollbackMigration(
  config: MigrationConfig,
  onLog: MigrationCallback,
  onProgress: ProgressCallback,
  mappingData?: { products: Record<number, string>; categories: Record<number, string> }
): Promise<{ success: boolean; deletedProducts: number; deletedCategories: number }> {
  const medusaConfig: MedusaConfig = {
    backendUrl: config.medusaBackendUrl,
    adminApiKey: config.medusaAdminKey,
    adminEmail: config.medusaAdminEmail,
    adminPassword: config.medusaAdminPassword,
  };

  // Use provided mapping or load from localStorage
  const mapping = mappingData || loadIdMapping();
  if (!mapping) {
    log(onLog, "rollback", "error", "Không tìm thấy dữ liệu migration để rollback. Hãy chạy migration trước.");
    return { success: false, deletedProducts: 0, deletedCategories: 0 };
  }

  const productIds = Object.keys(mapping.products || {}).map((key) => mapping.products![parseInt(key, 10)]);
  const categoryIds = Object.keys(mapping.categories || {}).map((key) => mapping.categories![parseInt(key, 10)]);

  const totalProducts = productIds.length;
  const totalCategories = categoryIds.length;
  const totalItems = totalProducts + totalCategories;

  log(onLog, "rollback", "info", `Bắt đầu rollback: ${totalProducts} sản phẩm, ${totalCategories} danh mục...`);

  const progress: MigrationProgress = {
    phase: "rolling_back",
    totalItems,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    startTime: new Date().toISOString(),
    errors: [],
    rollbackStats: {
      total: totalItems,
      deleted: 0,
      errors: 0,
      failedItems: [],
    },
    rollbackProgress: 0,
  };
  onProgress(progress);

  let deletedProducts = 0;
  let deletedCategories = 0;
  let rollbackErrors: string[] = [];

  // === Step 1: Delete products ===
  if (productIds.length > 0) {
    log(onLog, "rollback", "info", `Bước 1/3: Đang xoá ${productIds.length} sản phẩm...`);
    progress.phase = "rolling_back_products";
    progress.currentItemName = `Đang xoá ${productIds.length} sản phẩm...`;
    onProgress(progress);

    const result = await deleteProducts(medusaConfig, productIds);
    if (result.success && result.data) {
      deletedProducts = result.data.deleted;
      log(onLog, "rollback", "success", `Đã xoá ${deletedProducts}/${productIds.length} sản phẩm`);
      progress.rollbackStats!.deleted = deletedProducts;
      progress.rollbackProgress = Math.round((deletedProducts / totalItems) * 100);
      onProgress({ ...progress });
    } else {
      const errMsg = `Lỗi xoá sản phẩm: ${result.error || "Unknown"}`;
      log(onLog, "rollback", "error", errMsg);
      rollbackErrors.push(errMsg);
      progress.rollbackStats!.errors = rollbackErrors.length;
      progress.rollbackStats!.failedItems.push(errMsg);
    }
  } else {
    log(onLog, "rollback", "info", "Không có sản phẩm nào để xoá");
  }

  progress.processedItems = deletedProducts;
  onProgress({ ...progress });

  // === Step 2: Delete inventory items by SKU ===
  // This is handled automatically by Medusa when products are deleted

  // === Step 3: Delete categories ===
  if (categoryIds.length > 0) {
    log(onLog, "rollback", "info", `Bước 2/3: Đang xoá ${categoryIds.length} danh mục...`);
    progress.phase = "rolling_back_categories";
    progress.currentItemName = `Đang xoá ${categoryIds.length} danh mục...`;
    onProgress(progress);

    const result = await deleteCategories(medusaConfig, categoryIds);
    if (result.success && result.data) {
      deletedCategories = result.data.deleted;
      log(onLog, "rollback", "success", `Đã xoá ${deletedCategories}/${categoryIds.length} danh mục`);
      progress.rollbackStats!.deleted += deletedCategories;
      progress.rollbackProgress = Math.round(((deletedProducts + deletedCategories) / totalItems) * 100);
      onProgress({ ...progress });
    } else {
      const errMsg = `Lỗi xoá danh mục: ${result.error || "Unknown"}`;
      log(onLog, "rollback", "error", errMsg);
      rollbackErrors.push(errMsg);
      progress.rollbackStats!.errors = rollbackErrors.length;
      progress.rollbackStats!.failedItems.push(errMsg);
    }
  } else {
    log(onLog, "rollback", "info", "Không có danh mục nào để xoá");
  }

  progress.processedItems = deletedProducts + deletedCategories;
  progress.rollbackProgress = 100;

  // === Step 4: Clear ID mapping ===
  log(onLog, "rollback", "info", "Bước 3/3: Đang xoá dữ liệu ánh xạ...");
  clearIdMapping();

  // === Final status ===
  if (rollbackErrors.length === 0) {
    progress.phase = "rollback_done";
    progress.endTime = new Date().toISOString();
    onProgress({ ...progress });
    log(
      onLog,
      "rollback",
      "success",
      `Rollback hoàn tất! Đã xoá ${deletedProducts} sản phẩm, ${deletedCategories} danh mục.`
    );
  } else {
    progress.phase = "rollback_failed";
    progress.endTime = new Date().toISOString();
    onProgress({ ...progress });
    log(
      onLog,
      "rollback",
      "error",
      `Rollback hoàn tất với ${rollbackErrors.length} lỗi. Đã xoá ${deletedProducts} sản phẩm, ${deletedCategories} danh mục.`
    );
  }

  return { 
    success: rollbackErrors.length === 0, 
    deletedProducts, 
    deletedCategories 
  };
}

/**
 * Rollback ALL products and categories from Medusa (without needing mapping).
 * This is faster because it doesn't need to check mapping first.
 * Use this when you want to delete everything in one go.
 */
export async function rollbackAll(
  config: MigrationConfig,
  onLog: MigrationCallback,
  onProgress: ProgressCallback
): Promise<{ success: boolean; deletedProducts: number; deletedCategories: number }> {
  const medusaConfig: MedusaConfig = {
    backendUrl: config.medusaBackendUrl,
    adminApiKey: config.medusaAdminKey,
    adminEmail: config.medusaAdminEmail,
    adminPassword: config.medusaAdminPassword,
  };

  const progress: MigrationProgress = {
    phase: "rolling_back",
    totalItems: 0,
    processedItems: 0,
    successCount: 0,
    failCount: 0,
    startTime: new Date().toISOString(),
    errors: [],
    rollbackStats: {
      total: 0,
      deleted: 0,
      errors: 0,
      failedItems: [],
    },
    rollbackProgress: 0,
  };
  onProgress(progress);

  let deletedProducts = 0;
  let deletedCategories = 0;
  let rollbackErrors: string[] = [];

  log(onLog, "rollback", "info", "=== BẮT ĐẦU XOÁ TOÀN BỘ DỮ LIỆU ===");
  log(onLog, "rollback", "warning", "Đang xoá TẤT CẢ products và categories từ Medusa...");

  // === Step 1: Delete ALL products ===
  log(onLog, "rollback", "info", "Bước 1/2: Đang xoá TẤT CẢ sản phẩm...");
  progress.phase = "rolling_back_products";
  progress.currentItemName = "Đang xoá tất cả sản phẩm...";
  onProgress(progress);

  const prodResult = await deleteAllProducts(medusaConfig);
  if (prodResult.success && prodResult.data) {
    deletedProducts = prodResult.data.deleted;
    log(onLog, "rollback", "success", `Đã xoá ${deletedProducts} sản phẩm`);
    progress.rollbackStats!.deleted = deletedProducts;
    progress.rollbackProgress = 50;
    onProgress({ ...progress });
  } else {
    const errMsg = `Lỗi xoá sản phẩm: ${prodResult.error || "Unknown"}`;
    log(onLog, "rollback", "error", errMsg);
    rollbackErrors.push(errMsg);
  }

  // === Step 2: Delete ALL categories ===
  log(onLog, "rollback", "info", "Bước 2/2: Đang xoá TẤT CẢ danh mục...");
  progress.phase = "rolling_back_categories";
  progress.currentItemName = "Đang xoá tất cả danh mục...";
  onProgress(progress);

  const catResult = await deleteAllCategories(medusaConfig);
  if (catResult.success && catResult.data) {
    deletedCategories = catResult.data.deleted;
    log(onLog, "rollback", "success", `Đã xoá ${deletedCategories} danh mục`);
    progress.rollbackStats!.deleted += deletedCategories;
    progress.rollbackProgress = 100;
    onProgress({ ...progress });
  } else {
    const errMsg = `Lỗi xoá danh mục: ${catResult.error || "Unknown"}`;
    log(onLog, "rollback", "error", errMsg);
    rollbackErrors.push(errMsg);
  }

  // === Clear ID mapping ===
  log(onLog, "rollback", "info", "Đang xoá dữ liệu ánh xạ...");
  clearIdMapping();

  // === Final status ===
  progress.processedItems = deletedProducts + deletedCategories;
  if (rollbackErrors.length === 0) {
    progress.phase = "rollback_done";
    progress.endTime = new Date().toISOString();
    onProgress({ ...progress });
    log(
      onLog,
      "rollback",
      "success",
      `=== XOÁ TOÀN BỘ HOÀN TẤT! === Đã xoá ${deletedProducts} sản phẩm, ${deletedCategories} danh mục.`
    );
  } else {
    progress.phase = "rollback_failed";
    progress.endTime = new Date().toISOString();
    onProgress({ ...progress });
    log(
      onLog,
      "rollback",
      "error",
      `=== XOÁ HOÀN TẤT CÓ LỖI === Đã xoá ${deletedProducts} sản phẩm, ${deletedCategories} danh mục.`
    );
  }

  return {
    success: rollbackErrors.length === 0,
    deletedProducts,
    deletedCategories,
  };
}

// ============================================================
// VALIDATION REPORT
// ============================================================

export interface ValidationReport {
  totalProducts: number;
  withCategory: number;
  missingCategory: number;
  withPrice: number;
  missingPrice: number;
  manageStockTrue: number;
  manageStockFalse: number;
  unmanagedStock: number;
  instock: number;
  outofstock: number;
  onbackorder: number;
  published: number;
  draft: number;
  hasWarnings: boolean;
  warnings: Array<{
    type: "error" | "warning";
    message: string;
  }>;
}

/**
 * Run a post-migration validation report.
 * Fetches migrated products from Medusa and generates statistics.
 */
export async function runValidationReport(
  config: MigrationConfig,
  migrationStats: MigrationStats,
  options: {
    totalMigratedProducts: number;
    totalMigratedCategories: number;
    failedProducts: number;
    skippedProducts: number;
  }
): Promise<ValidationReport> {
  const wooConfig: WooCommerceConfig = {
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

  const report: ValidationReport = {
    totalProducts: options.totalMigratedProducts,
    withCategory: 0,
    missingCategory: 0,
    withPrice: 0,
    missingPrice: 0,
    manageStockTrue: 0,
    manageStockFalse: 0,
    unmanagedStock: 0,
    instock: 0,
    outofstock: 0,
    onbackorder: 0,
    published: 0,
    draft: 0,
    hasWarnings: false,
    warnings: [],
  };

  // Fetch migrated products from Medusa (limit 500, enough for most stores)
  const result = await medusaRequest<{
    products: Array<{
      id: string;
      title: string;
      status: string;
      metadata?: Record<string, string>;
      variants: Array<{
        id: string;
        prices: Array<{ amount: number; currency_code: string }>;
        metadata?: Record<string, string>;
      }>;
      categories: Array<{ id: string }>;
    }>;
    count: number;
  }>(`/admin/products?limit=500&offset=0&fields[]=id&fields[]=title&fields[]=status&fields[]=metadata&fields[]=variants.id&fields[]=variants.prices&fields[]=variants.metadata&fields[]=categories.id`, medusaConfig);

  if (!result.success || !result.data?.products) {
    report.warnings.push({
      type: "warning",
      message: `Không thể lấy products từ Medusa để validate: ${result.error}`,
    });
    report.hasWarnings = true;
    return report;
  }

  const products = result.data.products;
  report.totalProducts = products.length;

  for (const p of products) {
    // Category check
    if (p.categories && p.categories.length > 0) {
      report.withCategory++;
    } else {
      report.missingCategory++;
    }

    // Price check (check first variant's first price)
    const firstVariant = p.variants?.[0];
    const firstPrice = firstVariant?.prices?.[0];
    if (firstPrice && firstPrice.amount > 0) {
      report.withPrice++;
    } else {
      report.missingPrice++;
    }

    // Stock status from metadata or inferred
    const wcStockStatus = p.metadata?.wordpress_stock_status;
    const wcManageStock = p.metadata?.wordpress_manage_stock === "true";
    if (wcManageStock) {
      report.manageStockTrue++;
    } else {
      report.manageStockFalse++;
      report.unmanagedStock++;
    }

    if (wcStockStatus === "instock") {
      report.instock++;
    } else if (wcStockStatus === "outofstock") {
      report.outofstock++;
    } else if (wcStockStatus === "onbackorder") {
      report.onbackorder++;
    } else {
      report.instock++; // default
    }

    // Status
    if (p.status === "published") {
      report.published++;
    } else {
      report.draft++;
    }
  }

  // Generate warnings if issues detected
  const total = report.totalProducts || 1;
  const missingCatPct = (report.missingCategory / total) * 100;
  const missingPricePct = (report.missingPrice / total) * 100;
  const outofstockPct = (report.outofstock / total) * 100;
  const draftPct = (report.draft / total) * 100;

  if (missingCatPct > 50) {
    report.warnings.push({
      type: "error",
      message: `QUAN TRỌNG: ${missingCatPct.toFixed(0)}% sản phẩm (${report.missingCategory}/${report.totalProducts}) không có danh mục! Có thể category mapping thất bại.`,
    });
    report.hasWarnings = true;
  }
  if (missingPricePct > 50) {
    report.warnings.push({
      type: "error",
      message: `QUAN TRỌNG: ${missingPricePct.toFixed(0)}% sản phẩm (${report.missingPrice}/${report.totalProducts}) không có giá! Kiểm tra transform price.`,
    });
    report.hasWarnings = true;
  }
  if (outofstockPct > 50) {
    report.warnings.push({
      type: "warning",
      message: `Cảnh báo: ${outofstockPct.toFixed(0)}% sản phẩm (${report.outofstock}/${report.totalProducts}) bị hết hàng. Kiểm tra stock mapping.`,
    });
    report.hasWarnings = true;
  }
  if (draftPct > 80) {
    report.warnings.push({
      type: "warning",
      message: `Cảnh báo: ${draftPct.toFixed(0)}% sản phẩm (${report.draft}/${report.totalProducts}) ở trạng thái Nháp. Kiểm tra status mapping.`,
    });
    report.hasWarnings = true;
  }
  if (report.missingCategory > 0 && report.missingCategory < total * 0.5) {
    report.warnings.push({
      type: "warning",
      message: `${report.missingCategory} sản phẩm thiếu danh mục — có thể sản phẩm không có category trong WooCommerce.`,
    });
  }

  return report;
}

// ============================================================
// UTILITIES
// ============================================================

function log(
  callback: MigrationCallback,
  step: string,
  status: MigrationLog["status"],
  message: string
): void {
  callback({
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    step,
    action: status.toUpperCase(),
    status,
    message,
    timestamp: new Date().toISOString(),
  });
}
