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
} from "@/lib/transform";

import { mediaMigrationService, type MediaMigrationContext } from "./media-migration.service";
import type { MediaMigrationOptions } from "@/types/media-mapping";

// ============================================================
// HELPER: Migrate single product WITH media (synchronous)
// ============================================================

/**
 * Download and upload all images for a single product.
 * Returns product data with uploaded image URLs.
 */
async function migrateProductImagesInline(
  wooProduct: WooProduct,
  mediaOptions: MediaMigrationOptions,
  wordpressBaseUrl: string,
  medusaBackendUrl: string,
  onLog: MigrationCallback
): Promise<{
  thumbnail: string | undefined;
  images: Array<{ url: string }>;
  description: string;
  shortDescription: string;
}> {
  const thumbnailUrl = wooProduct.images?.[0]?.src || "";
  const galleryUrls = wooProduct.images?.slice(1).map((img) => img.src) || [];

  let thumbnail: string | undefined;
  let images: Array<{ url: string }> = [];
  let description = wooProduct.description || "";
  let shortDescription = wooProduct.short_description || "";

  // Download and upload thumbnail
  if (thumbnailUrl && mediaOptions.downloadThumbnails) {
    try {
      // Fetch via proxy to avoid CORS
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(thumbnailUrl)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const blob = await response.blob();
        const fileName = thumbnailUrl.split("/").pop() || "thumbnail.jpg";

        // Upload to media endpoint
        const formData = new FormData();
        formData.append("file", blob, fileName);
        formData.append("destinationPath", `products/thumbnails/${Date.now()}_${fileName}`);

        const uploadResponse = await fetch("/api/medusa/upload-media", { method: "POST", body: formData });
        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          if (result.success && result.url) {
            thumbnail = result.url;
            log(onLog, "migrate_products", "info", `Thumbnail uploaded: ${fileName}`);
          }
        }
      }
    } catch (err) {
      log(onLog, "migrate_products", "warn", `Failed to upload thumbnail: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }

  // Download and upload gallery images
  if (galleryUrls.length > 0 && mediaOptions.downloadGallery) {
    images = [];
    for (const url of galleryUrls) {
      try {
        const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const blob = await response.blob();
          const fileName = url.split("/").pop() || "image.jpg";

          const formData = new FormData();
          formData.append("file", blob, fileName);
          formData.append("destinationPath", `products/gallery/${Date.now()}_${fileName}`);

          const uploadResponse = await fetch("/api/medusa/upload-media", { method: "POST", body: formData });
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            if (result.success && result.url) {
              images.push({ url: result.url });
            }
          }
        }
      } catch (err) {
        log(onLog, "migrate_products", "warn", `Failed to upload gallery image: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }
  }

  return { thumbnail, images, description, shortDescription };
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

    const transformedCategories = sortedCategories.map((c) => {
      const result = transformCategory(c);
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

    const chunkSize = 50;
    const catChunks = chunkArray(transformedCategories, chunkSize);

    for (let i = 0; i < catChunks.length; i++) {
      const chunk = catChunks[i];
      progress.currentItem = `Lote ${i + 1}/${catChunks.length}`;
      progress.currentItemName = `Danh mục (${chunk.map((c) => c.name).join(", ")})`;
      progress.currentItemIndex = i + 1;
      onProgress(progress);

      // Pass catMapping so batchCreateCategories can update it with new Medusa IDs
      // and resolve parent_category_id for child categories
      const batchResult = await batchCreateCategories(medusaConfig, chunk, catMapping);

      if (batchResult.success && batchResult.data) {
        // Use wooIdToMedusaId for accurate mapping (avoid index mismatch when items are skipped)
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
            `Đã tạo ${batchResult.data.created} danh mục, cập nhật ${batchResult.data.updated} danh mục (lote ${i + 1}/${catChunks.length})`
          );
        } else {
          log(
            onLog,
            "migrate_categories",
            "success",
            `Đã tạo ${batchResult.data.created} danh mục (lote ${i + 1}/${catChunks.length})`
          );
        }
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

      if (!batchResult.success && !batchResult.data) {
        log(
          onLog,
          "migrate_categories",
          "error",
          `Lỗi khi tạo danh mục lote ${i + 1}: ${batchResult.error || "Unknown error"}`
        );
      }

      progress.processedItems += chunk.length;
      onProgress(progress);
    }

    saveIdMapping(mapping);

    // === CATEGORY MEDIA MIGRATION ===
    if (!options.preserveImages && options.mediaOptions?.downloadCategoryImages) {
      const mediaOpts = options.mediaOptions as MediaMigrationOptions;
      const mediaPool = mediaMigrationService.loadPool();

      const mediaContext: MediaMigrationContext = {
        wordpressBaseUrl: config.wordpressUrl,
        medusaBackendUrl: config.medusaBackendUrl,
        jobId: `migration_${Date.now()}`,
        onLog: (msg, type) => {
          log(
            onLog,
            "media_category",
            type === "info" ? "info" : type === "error" ? "error" : type === "warn" ? "warning" : "success",
            msg
          );
        },
      };

      let categoryImagesDownloaded = 0;
      let categoryImagesFailed = 0;

      for (const cat of categories) {
        if (!cat.image?.src) continue;

        const catMedusaId = mapping.categories[cat.id];
        if (!catMedusaId) continue;

        try {
          const result = await mediaMigrationService.migrateCategoryMedia(
            cat,
            mediaPool,
            mediaContext,
            mediaOpts
          );

          if (result.downloads.length > 0) {
            const hasFailed = result.downloads.some((d) => d.status === "failed");
            if (hasFailed) {
              categoryImagesFailed += result.downloads.filter((d) => d.status === "failed").length;
            } else {
              categoryImagesDownloaded += result.downloads.filter(
                (d) => d.status === "downloaded" || d.status === "reused"
              ).length;
            }

            // Update category metadata with image info
            if (result.categoryData.metadata) {
              await import("./medusa.service").then(({ updateCategory }) =>
                updateCategory(medusaConfig, catMedusaId, {
                  metadata: result.categoryData.metadata,
                } as Parameters<typeof updateCategory>[2])
              );
            }
          }
        } catch (err) {
          categoryImagesFailed++;
          debug(`[CategoryMedia] Error for category ${cat.id}:`, err);
        }
      }

      mediaMigrationService.savePool(mediaPool);

      if (categoryImagesDownloaded > 0 || categoryImagesFailed > 0) {
        log(
          onLog,
          "media_category",
          categoryImagesFailed === 0 ? "success" : "warning",
          `Danh mục images: ${categoryImagesDownloaded} downloaded, ${categoryImagesFailed} failed`
        );
      }
    }
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

    const productChunkSize = options.batchSize || 100;
    const productChunks = chunkArray(successful, productChunkSize);
    // Tổng số sản phẩm đã xử lý tính từ đầu (để hiển thị index chính xác)
    let globalIndex = 0;

    for (let i = 0; i < productChunks.length; i++) {
      const chunk = productChunks[i];

      progress.currentItem = `Lote ${i + 1}/${productChunks.length}`;
      progress.currentItemIndex = i + 1;
      progress.currentItemName = `${chunk.length} sản phẩm trong lote`;
      onProgress(progress);

      // Check for existing products based on conflict strategy
      const processedProducts: Array<{ medusa: MedusaProduct; wooId: number; wooProduct?: WooProduct }> = [];

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
              const updatePayload: Partial<MedusaProduct> = {
                title: product.title,
                subtitle: product.subtitle,
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

        // Find original WooProduct for inline media migration
        const originalWooProduct = fetchedProducts.find(p => p.id === item.wooId);
        processedProducts.push({ medusa: product, wooId: item.wooId, wooProduct: originalWooProduct });
      }

      // Batch create new products
      if (processedProducts.length > 0) {
        debug("Creating", processedProducts.length, "new products (batch)", i + 1, "of", productChunks.length);
        debug("First product:", processedProducts[0]?.medusa?.title, "SKU:", processedProducts[0]?.medusa?.originalSku);

        // Log mỗi sản phẩm trước khi gửi
        for (let pi = 0; pi < processedProducts.length; pi++) {
          const p = processedProducts[pi];
          log(
            onLog,
            "migrate_products",
            "info",
            `[${globalIndex - processedProducts.length + pi + 1}/${successful.length}] Đang tạo: "${p.medusa.title}" (WooCommerce ID: ${p.wooId}) | Categories: ${p.medusa.categories?.length || 0} | Variants: ${p.medusa.variants?.length || 0} | Giá: ${p.medusa.variants?.[0]?.prices?.[0]?.amount ? (p.medusa.variants[0].prices![0].amount / 100).toLocaleString("vi-VN") + "đ" : "—"} | Tồn: ${(() => { const v = p.medusa.variants?.[0]; if (!v) return "N/A"; const qty = v.inventory_quantity; const managed = v.manage_inventory; if (!managed) return "Không QL tồn"; if (qty === undefined) return "N/A"; return qty > 0 ? `Còn ${qty}` : "Hết hàng"; })()}`
          );
        }

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

        debug("batchCreateProducts result:", batchResult.success, "created:", batchResult.data?.created, "failed:", batchResult.data?.failed);

        if (batchResult.success && batchResult.data) {
          // Check if inline media migration is enabled
          const inlineMedia = options.mediaOptions?.inlineProductMedia ?? false;

          // Update inventory for each successfully created product
          for (const [idx, medusaId] of batchResult.data.ids.entries()) {
            if (idx < processedProducts.length) {
              const originalProduct = processedProducts[idx].medusa;
              const wooId = processedProducts[idx].wooId;
              const wooProduct = fetchedProducts.find(p => p.id === wooId);
              mapping.products[wooId] = medusaId;
              stats.migratedProducts++;
              progress.successCount = stats.migratedProducts;

              // === INLINE MEDIA MIGRATION ===
              // Download and upload images for this product BEFORE logging success
              if (inlineMedia && processedProducts[idx].wooProduct && options.mediaOptions) {
                try {
                  log(onLog, "migrate_products", "info", `[${globalIndex - processedProducts.length + idx + 1}] Đang tải ảnh cho: ${originalProduct.title}`);

                  const mediaResult = await migrateProductImagesInline(
                    processedProducts[idx].wooProduct!,
                    options.mediaOptions,
                    wooConfig.wordpressUrl,
                    medusaConfig.backendUrl,
                    onLog
                  );

                  // If images were downloaded, update product with new URLs
                  if (mediaResult.thumbnail || mediaResult.images.length > 0) {
                    const updatePayload: Partial<MedusaProduct> = {
                      thumbnail: mediaResult.thumbnail,
                      images: mediaResult.images.length > 0 ? mediaResult.images : undefined,
                    };

                    const mediaUpdateResult = await updateProduct(medusaConfig, medusaId, updatePayload);
                    if (mediaUpdateResult.success) {
                      log(onLog, "migrate_products", "success", `[${globalIndex - processedProducts.length + idx + 1}] Đã tải ảnh xong: ${originalProduct.title}`);
                    } else {
                      log(onLog, "migrate_products", "warn", `[${globalIndex - processedProducts.length + idx + 1}] Tải ảnh thất bại: ${mediaUpdateResult.error}`);
                    }
                  }
                } catch (mediaErr) {
                  log(onLog, "migrate_products", "warn", `[${globalIndex - processedProducts.length + idx + 1}] Lỗi media: ${mediaErr instanceof Error ? mediaErr.message : "Unknown"}`);
                }
              }
              // === END INLINE MEDIA MIGRATION ===

              // Update inventory via Medusa Inventory Module (Medusa v2)
              if (originalProduct.variants) {
                stats.migratedVariants += originalProduct.variants.length;

                // Update inventory for first variant (primary stock)
                const firstVariant = originalProduct.variants[0];
                if (firstVariant?.sku && firstVariant.inventory_quantity !== undefined) {
                  // Import the update function dynamically to avoid circular dependency
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

  // ============================================================
  // PHASE: MEDIA MIGRATION
  // Chỉ chạy nếu preserveImages = false (tải ảnh về Medusa)
  // ============================================================
  if (options.selectedTypes.includes("products") && !options.preserveImages && options.mediaOptions) {
    const mediaOpts = options.mediaOptions as MediaMigrationOptions;
    const hasMediaWork = mediaOpts.downloadThumbnails ||
      mediaOpts.downloadGallery ||
      mediaOpts.downloadDescriptionImages ||
      mediaOpts.downloadShortDescImages ||
      mediaOpts.rewriteHtmlDescriptions;

    if (hasMediaWork) {
      log(
        onLog,
        "media_migration",
        "info",
        "Bắt đầu migration media: tải ảnh từ WordPress về Medusa..."
      );

      progress.phase = "media_migration";
      progress.totalItems = fetchedProducts.length;
      progress.processedItems = 0;
      onProgress(progress);

      // Load existing media pool (for reuse across products)
      const mediaPool = mediaMigrationService.loadPool();

      const mediaContext: MediaMigrationContext = {
        wordpressBaseUrl: config.wordpressUrl,
        medusaBackendUrl: config.medusaBackendUrl,
        jobId: `migration_${Date.now()}`,
        onLog: (msg, type, detail) => {
          log(
            onLog,
            "media_migration",
            type === "info" ? "info" : type === "error" ? "error" : type === "warn" ? "warning" : "success",
            msg
          );
        },
      };

      // Build wooId → medusaId mapping for media-only updates
      const existingProductIds: Record<number, string> = {};
      for (const [wooIdStr, medusaId] of Object.entries(mapping.products)) {
        existingProductIds[parseInt(wooIdStr, 10)] = medusaId;
      }

      const mediaResult = await mediaMigrationService.runMediaOnlyMigration(
        fetchedProducts,
        mediaPool,
        mediaContext,
        mediaOpts,
        existingProductIds,
        async (medusaProductId, wooId, updates) => {
          try {
            const result = await updateProduct(medusaConfig, medusaProductId, updates);
            return { success: result.success, error: result.error };
          } catch (err) {
            return {
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            };
          }
        }
      );

      // Save updated media pool
      mediaMigrationService.savePool(mediaPool);

      // Log media stats
      log(
        onLog,
        "media_migration",
        mediaResult.stats.failed === 0 ? "success" : "warning",
        `Media migration hoàn tất: ${mediaResult.updatedProducts} sản phẩm | ` +
        `Downloaded: ${mediaResult.stats.downloaded} | Reused: ${mediaResult.stats.reused} | ` +
        `Failed: ${mediaResult.stats.failed}`
      );

      if (mediaResult.stats.warnings.length > 0) {
        mediaResult.stats.warnings.slice(0, 5).forEach((w) => {
          log(onLog, "media_migration", "warning", `Cảnh báo: ${w}`);
        });
      }
    }
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
 */
export async function rollbackMigration(
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

  const mapping = loadIdMapping();
  if (!mapping) {
    log(onLog, "rollback", "error", "Không tìm thấy dữ liệu migration để rollback");
    return { success: false, deletedProducts: 0, deletedCategories: 0 };
  }

  const totalProducts = Object.keys(mapping.products).length;
  const totalCategories = Object.keys(mapping.categories).length;
  const totalItems = totalProducts + totalCategories;

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

  // Delete products
  const productIds = Object.values(mapping.products);
  if (productIds.length > 0) {
    log(onLog, "rollback", "info", `Đang xoá ${productIds.length} sản phẩm...`);
    const result = await deleteProducts(medusaConfig, productIds);
    if (result.success && result.data) {
      deletedProducts = result.data.deleted;
      progress.rollbackStats = {
        total: totalItems,
        deleted: deletedProducts,
        errors: 0,
        failedItems: [],
      };
      progress.rollbackProgress = Math.round((deletedProducts / totalItems) * 100);
      onProgress({ ...progress });
      log(onLog, "rollback", "success", `Đã xoá ${deletedProducts} sản phẩm`);
    } else if (result.error) {
      const errMsg = `Lỗi xoá sản phẩm: ${result.error}`;
      progress.rollbackStats = {
        total: totalItems,
        deleted: deletedProducts,
        errors: 1,
        failedItems: [errMsg],
      };
      onProgress({ ...progress });
      log(onLog, "rollback", "error", errMsg);
    }
  }

  progress.processedItems = productIds.length;
  onProgress({ ...progress });

  // Delete categories
  const categoryIds = Object.values(mapping.categories);
  if (categoryIds.length > 0) {
    log(onLog, "rollback", "info", `Đang xoá ${categoryIds.length} danh mục...`);
    const result = await deleteCategories(medusaConfig, categoryIds);
    if (result.success && result.data) {
      deletedCategories = result.data.deleted;
      progress.rollbackStats = {
        total: totalItems,
        deleted: deletedProducts + deletedCategories,
        errors: 0,
        failedItems: [],
      };
      progress.rollbackProgress = Math.round(((productIds.length + deletedCategories) / totalItems) * 100);
      onProgress({ ...progress });
      log(onLog, "rollback", "success", `Đã xoá ${deletedCategories} danh mục`);
    } else if (result.error) {
      const errMsg = `Lỗi xoá danh mục: ${result.error}`;
      progress.rollbackStats = {
        total: totalItems,
        deleted: deletedProducts + deletedCategories,
        errors: 1,
        failedItems: [errMsg],
      };
      onProgress({ ...progress });
      log(onLog, "rollback", "error", errMsg);
    }
  }

  progress.processedItems = productIds.length + categoryIds.length;
  progress.rollbackProgress = 100;
  clearIdMapping();

  if (progress.rollbackStats!.errors === 0) {
    progress.phase = "rollback_done";
    progress.endTime = new Date().toISOString();
    onProgress({ ...progress });
    log(onLog, "rollback", "success", "Rollback hoàn tất!");
  } else {
    progress.phase = "rollback_failed";
    progress.endTime = new Date().toISOString();
    onProgress({ ...progress });
    log(onLog, "rollback", "error", "Rollback gặp lỗi - một số mục không thể xoá.");
  }

  return { success: progress.rollbackStats!.errors === 0, deletedProducts, deletedCategories };
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
