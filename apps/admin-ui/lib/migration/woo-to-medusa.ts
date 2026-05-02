/**
 * WooCommerce to Medusa Migration Orchestrator (REST API)
 *
 * Script chính để migrate dữ liệu từ WooCommerce/WordPress sang Medusa.
 *
 * LUÔN LUÔN dùng WooCommerce REST API — KHÔNG kết nối MySQL WordPress trực tiếp.
 *
 * Cách sử dụng:
 *   npx ts-node lib/migration/woo-to-medusa.ts --config ./migration.config.ts
 *   npx ts-node lib/migration/woo-to-medusa.ts --dry-run
 *   npx ts-node lib/migration/woo-to-medusa.ts --incremental
 */

import type {
  MigrationResult,
  MigrationStats,
  MigrationError,
} from "./woo-types";

import type {
  MedusaMigrationConfig,
  MigrationMapping,
  MigrationOptions,
} from "./medusa-migration-types";

import type { CreateCategoryInput } from "@/services/medusa-types";

import { MedusaApiClient } from "./medusa-api-client";
import { dataTransformer } from "./data-transformer";

// WooCommerce REST API client (dùng trực tiếp cho CLI)
import * as https from "https";
import * as http from "http";
import { URL } from "url";

export interface WooCommerceRestConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface MigrationConfig {
  woo: WooCommerceRestConfig;
  medusa: MedusaMigrationConfig;
  options: Partial<MigrationOptions>;
}

const DEFAULT_CONFIG: MigrationConfig = {
  woo: {
    baseUrl: process.env.WOO_API_BASE_URL || "https://mytholaptop.vn/wp-json",
    consumerKey: process.env.WOO_CONSUMER_KEY || "",
    consumerSecret: process.env.WOO_CONSUMER_SECRET || "",
  },
  medusa: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    adminApiKey: process.env.MEDUSA_ADMIN_API_KEY || "",
    adminEmail: process.env.MEDUSA_ADMIN_EMAIL || "",
    adminPassword: process.env.MEDUSA_ADMIN_PASSWORD || "",
    retryAttempts: 3,
    retryDelay: 1000,
    batchSize: 5,
    dryRun: false,
    skipImages: false,
    skipVariants: false,
    preserveIds: false,
  },
  options: {
    source: "woocommerce",
    mode: "full",
    preserveSourceIds: true,
    mapSourceImages: true,
    createMissingCategories: true,
    createMissingTags: true,
    setProductsPublished: true,
  },
};

// ============================================================
// WooCommerce REST API Client (cho CLI)
// REST API response format — khác với DB format trong woo-types.ts

export interface WooRestCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  count: number;
}

export interface WooRestTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooRestProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; name: string; alt: string }>;
  related_ids: number[];
  variations: number[];
  date_created: string;
  date_modified: string;
  featured: boolean;
}
// ============================================================

function buildWooUrl(
  config: WooCommerceRestConfig,
  endpoint: string
): string {
  // Strip /wp-json from baseUrl if present (avoid double-prefix)
  let base = config.baseUrl.endsWith("/")
    ? config.baseUrl.slice(0, -1)
    : config.baseUrl;
  base = base.replace(/\/wp-json$/i, "");
  const url = new URL(`${base}/wp-json/wc/v3/${endpoint}`);
  url.searchParams.set("consumer_key", config.consumerKey);
  url.searchParams.set("consumer_secret", config.consumerSecret);
  return url.toString();
}

async function wooCommerceRequest<T>(
  config: WooCommerceRestConfig,
  endpoint: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    const url = new URL(buildWooUrl(config, endpoint));
    const protocol = url.protocol === "https:" ? https : http;

    const req = protocol.get(url.toString(), (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ success: true, data: JSON.parse(data) as T });
          } catch {
            resolve({ success: false, error: "Invalid JSON response" });
          }
        } else {
          let message = `HTTP ${res.statusCode}`;
          try {
            const parsed = JSON.parse(data);
            message = parsed.message || parsed.error || parsed.code || message;
          } catch {
            message = data.length > 200 ? data.slice(0, 200) + "..." : data;
          }
          resolve({ success: false, error: message });
        }
      });
    });

    req.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({ success: false, error: "Request timeout" });
    });
  });
}

async function fetchWooCategories(
  config: WooCommerceRestConfig
): Promise<WooRestCategory[]> {
  const allCategories: WooRestCategory[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await wooCommerceRequest<WooRestCategory[]>(
      config,
      `products/categories?per_page=${perPage}&page=${page}&hide_empty=true`
    );
    if (!result.success || !result.data) {
      throw new Error(
        `Lỗi lấy categories: ${result.error || "Unknown error"}`
      );
    }
    allCategories.push(...result.data);
    if (result.data.length < perPage) break;
    page++;
    if (page > 50) break;
  }

  return allCategories;
}

async function fetchWooTags(
  config: WooCommerceRestConfig
): Promise<WooRestTag[]> {
  const allTags: WooRestTag[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await wooCommerceRequest<WooRestTag[]>(
      config,
      `products/tags?per_page=${perPage}&page=${page}`
    );
    if (!result.success || !result.data) {
      throw new Error(`Lỗi lấy tags: ${result.error || "Unknown error"}`);
    }
    allTags.push(...result.data);
    if (result.data.length < perPage) break;
    page++;
    if (page > 50) break;
  }

  return allTags;
}

async function fetchWooProducts(
  config: WooCommerceRestConfig
): Promise<WooRestProduct[]> {
  const allProducts: WooRestProduct[] = [];
  let page = 1;
  const perPage = 100;
  // Lấy tất cả trạng thái: publish, draft, pending, private, future
  // Status mapping:
  //   publish, private  -> published (Medusa)
  //   draft, pending     -> draft (Medusa)
  //   future             -> draft (Medusa, chưa đến ngày publish)
  const wooStatuses = ["publish", "draft", "pending", "private", "future"];

  for (const status of wooStatuses) {
    let statusPage = 1;
    while (true) {
      const result = await wooCommerceRequest<WooRestProduct[]>(
        config,
        `products?per_page=${perPage}&page=${statusPage}&status=${status}`
      );
      if (!result.success || !result.data) {
        // Nếu lỗi (VD: không có quyền xem trạng thái nào đó), bỏ qua trạng thái đó
        if (statusPage === 1) {
          console.log(`[Migration] Không lấy được products với status=${status}: ${result.error || "Unknown"}`);
        }
        break;
      }
      allProducts.push(...result.data);
      if (result.data.length < perPage) break;
      statusPage++;
      if (statusPage > 50) break;
    }
  }

  // Deduplicate products (cùng ID có thể xuất hiện ở nhiều status)
  const seen = new Set<number>();
  const uniqueProducts = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  console.log(`[Migration] Tổng số products từ WooCommerce: ${uniqueProducts.length} (đã loại bỏ trùng lặp)`);
  return uniqueProducts;
}

// ============================================================
// Medusa API Client (reuse from medusa-api-client)
// ============================================================

// ============================================================
// Migrator
// ============================================================

export class WooToMedusaMigrator {
  private woo: WooCommerceRestConfig;
  private medusa: MedusaApiClient;
  private config: MigrationConfig;
  private options: MigrationOptions;
  private mapping: MigrationMapping;
  private stats: MigrationStats;
  private currency: string = "usd";

  constructor(config: MigrationConfig) {
    this.config = config;
    this.options = {
      source: config.options.source || "woocommerce",
      mode: config.options.mode || "full",
      preserveSourceIds: config.options.preserveSourceIds ?? true,
      mapSourceImages: config.options.mapSourceImages ?? true,
      createMissingCategories: config.options.createMissingCategories ?? true,
      createMissingTags: config.options.createMissingTags ?? true,
      setProductsPublished: config.options.setProductsPublished ?? true,
      productIds: config.options.productIds,
      categoryIds: config.options.categoryIds,
    };

    this.woo = config.woo;
    this.medusa = new MedusaApiClient(config.medusa);
    this.mapping = {
      categoryIdMap: new Map(),
      tagIdMap: new Map(),
      productIdMap: new Map(),
      handleMap: new Map(),
    };
    this.stats = {
      totalCategories: 0,
      totalTags: 0,
      totalProducts: 0,
      processedCategories: 0,
      processedTags: 0,
      processedProducts: 0,
      startTime: new Date(),
      errors: [],
    };
  }

  async initialize(): Promise<void> {
    this.log("=== Initializing WooCommerce to Medusa Migration (REST API) ===");
    this.log(
      `Mode: ${this.options.mode}${this.config.medusa.dryRun ? " (DRY RUN)" : ""}`
    );
    this.log(`Source: WooCommerce REST API`);
    this.log("");

    this.log("[1/6] Connecting to WooCommerce REST API...");
    // Quick connectivity check
    const checkResult = await wooCommerceRequest(
      this.woo,
      "products/categories?per_page=1"
    );
    if (!checkResult.success) {
      this.log(`WooCommerce API Error: ${checkResult.error}`);
    } else {
      this.log("WooCommerce REST API: Connected");
    }

    this.log("[2/6] Connecting to Medusa API...");
    const medusaHealth = await this.medusa.healthCheck();
    if (!medusaHealth.connected) {
      throw new Error(
        "Cannot connect to Medusa API. Check your API key and backend URL."
      );
    }
    this.log(
      `Medusa connected: ${medusaHealth.store || "Store"} (${medusaHealth.version || "unknown"})`
    );

    this.log("[3/6] Getting existing resources from Medusa...");
    const existing = await this.medusa.getExistingResources();
    this.log(`Found ${existing.categories.size} existing categories`);
    this.log(`Found ${existing.tags.size} existing tags`);
    this.log(`Found ${existing.products.size} existing products`);

    // Debug: log sample category mappings
    if (existing.categories.size > 0) {
      const sampleCats = Array.from(existing.categories.entries()).slice(0, 5);
      this.log(`[DEBUG] Sample Medusa category keys: ${JSON.stringify(sampleCats)}`);
    }

    this.mapping.categoryIdMap = existing.categories;
    this.mapping.tagIdMap = existing.tags;
    this.mapping.productIdMap = existing.products;

    this.currency = await this.medusa.getStoreDefaultCurrency();
    dataTransformer.setDefaultCurrency(this.currency);

    this.log("[4/6] Analyzing WooCommerce data...");
    const categories = await fetchWooCategories(this.woo);
    const products = await fetchWooProducts(this.woo);
    const tags = await fetchWooTags(this.woo);
    this.stats.totalCategories = categories.length;
    this.stats.totalTags = tags.length;
    this.stats.totalProducts = products.length;

    this.log(`Products: ${this.stats.totalProducts}`);
    this.log(`Categories: ${this.stats.totalCategories}`);
    this.log(`Tags: ${this.stats.totalTags}`);
    this.log("");

    this.log("[5/6] Loading WooCommerce data into memory...");
    this.log("");
  }

  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: MigrationError[] = [];

    try {
      await this.initialize();

      if (this.config.medusa.dryRun) {
        this.log("=== DRY RUN MODE - No changes will be made ===\n");
      }

      await this.migrateCategories(errors);

      await this.migrateTags(errors);

      await this.migrateProducts(errors);

      await this.finalize();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logError("Migration failed", errMsg);
      errors.push({
        type: "product",
        sourceId: "system",
        message: `Migration failed: ${errMsg}`,
        timestamp: new Date(),
      });
    }

    const duration = Date.now() - startTime;

    const result: MigrationResult = {
      success: errors.length === 0,
      categoriesMigrated: this.stats.processedCategories,
      tagsMigrated: this.stats.processedTags,
      productsMigrated: this.stats.processedProducts,
      productsUpdated: 0,
      errors,
      duration,
    };

    return result;
  }

  private async migrateCategories(errors: MigrationError[]): Promise<void> {
    this.log("\n=== Phase 1: Migrating Categories ===\n");

    const categories = await fetchWooCategories(this.woo);

    const categoriesToCreate: CreateCategoryInput[] = [];

    for (const cat of categories) {
      const slugKey = dataTransformer.transformHandle(cat.name);
      if (this.mapping.categoryIdMap.has(slugKey)) {
        this.log(`[SKIP] Category "${cat.name}" already exists (${slugKey})`);
        this.mapping.categoryIdMap.set(
          String(cat.id),
          this.mapping.categoryIdMap.get(slugKey)!
        );
        this.stats.processedCategories++;
        continue;
      }

      const parentId =
        cat.parent && this.mapping.categoryIdMap.has(String(cat.parent))
          ? this.mapping.categoryIdMap.get(String(cat.parent))!
          : undefined;

      const input: CreateCategoryInput = {
        name: dataTransformer.transformCategoryName(cat.name),
        handle: slugKey,
        description: cat.description || undefined,
        is_active: true,
        is_internal: false,
        rank: 0,
        parent_category_id: parentId,
        metadata: {
          sourceType: "woocommerce",
          sourceId: String(cat.id),
          sourceSlug: cat.slug,
          originalCount: cat.count,
        },
      };

      categoriesToCreate.push(input);
    }

    if (categoriesToCreate.length === 0) {
      this.log("No new categories to create.");
      return;
    }

    this.log(`Creating ${categoriesToCreate.length} new categories...`);

    if (!this.config.medusa.dryRun) {
      const created = await this.medusa.createCategoriesBatch(
        categoriesToCreate
      );

      created.forEach((medusaId, key) => {
        this.mapping.categoryIdMap.set(key, medusaId);
      });

      // Also map by WooCommerce ID
      categories.forEach((cat) => {
        const existing = this.mapping.categoryIdMap.get(
          dataTransformer.transformHandle(cat.name)
        );
        if (existing) {
          this.mapping.categoryIdMap.set(String(cat.id), existing);
        } else {
          this.log(`[WARN] Không tìm thấy Medusa ID cho category "${cat.name}" (WooCommerce ID: ${cat.id})`);
        }
      });

      // Debug: log category map entries
      const wooCatIds = categories.map((c) => String(c.id));
      const mappedCount = wooCatIds.filter((id) => this.mapping.categoryIdMap.has(id)).length;
      this.log(`[DEBUG] Category map: ${mappedCount}/${categories.length} có Medusa ID`);
    }

    this.stats.processedCategories += categoriesToCreate.length;
    this.log(`Categories created: ${categoriesToCreate.length}`);
  }

  private async migrateTags(errors: MigrationError[]): Promise<void> {
    this.log("\n=== Phase 2: Migrating Tags ===\n");

    const tags = await fetchWooTags(this.woo);

    const tagsToCreate: string[] = [];

    for (const tag of tags) {
      const nameKey = tag.name.toLowerCase();
      if (this.mapping.tagIdMap.has(nameKey)) {
        this.log(`[SKIP] Tag "${tag.name}" already exists`);
        this.stats.processedTags++;
        continue;
      }

      tagsToCreate.push(tag.name);
    }

    if (tagsToCreate.length === 0) {
      this.log("No new tags to create.");
      return;
    }

    this.log(`Creating ${tagsToCreate.length} new tags...`);

    if (!this.config.medusa.dryRun) {
      const created = await this.medusa.createTagsBatch(tagsToCreate);

      created.forEach((medusaId, key) => {
        this.mapping.tagIdMap.set(key, medusaId);
      });
    }

    this.stats.processedTags += tagsToCreate.length;
    this.log(`Tags created: ${tagsToCreate.length}`);
  }

  private async migrateProducts(errors: MigrationError[]): Promise<void> {
    this.log("\n=== Phase 3: Migrating Products ===\n");

    const productIds = this.options.productIds;
    const wooProducts = await fetchWooProducts(this.woo);

    const productsToProcess = productIds
      ? wooProducts.filter((p) => productIds.includes(String(p.id)))
      : wooProducts;

    this.log(`Found ${productsToProcess.length} products to migrate\n`);

    const productsPerBatch = this.config.medusa.batchSize;

    for (
      let i = 0;
      i < productsToProcess.length;
      i += productsPerBatch
    ) {
      const batch = productsToProcess.slice(i, i + productsPerBatch);
      const batchNum = Math.floor(i / productsPerBatch) + 1;
      const totalBatches = Math.ceil(
        productsToProcess.length / productsPerBatch
      );

      this.log(
        `Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`
      );

      await this.processProductBatch(batch, errors, batchNum);

      this.stats.processedProducts += batch.length;
      this.logProgress(i + batch.length, productsToProcess.length);
    }
  }

  private async processProductBatch(
    products: WooRestProduct[],
    errors: MigrationError[],
    batchNum: number
  ): Promise<void> {
    const medusaProducts: unknown[] = [];

    for (const woo of products) {
      try {
        const handle = dataTransformer.transformHandle(woo.name || "", String(woo.id));

        if (this.mapping.productIdMap.has(handle)) {
          this.log(
            `  [SKIP] Product "${woo.name}" already exists (${handle})`
          );
          continue;
        }

        const categoryIds = (woo.categories || [])
          .map((cat) => this.mapping.categoryIdMap.get(String(cat.id)))
          .filter((id): id is string => id !== undefined);

        if (categoryIds.length === 0 && (woo.categories || []).length > 0) {
          this.log(`[WARN] Product "${woo.name}" (ID: ${woo.id}) có ${woo.categories.length} categories nhưng KHÔNG tìm được Medusa ID cho bất kỳ category nào`);
          this.log(`  WooCommerce category IDs: ${woo.categories.map((c) => `${c.id}(${c.name})`).join(", ")}`);
          this.log(`  Medusa category map keys: ${Array.from(this.mapping.categoryIdMap.keys()).slice(0, 10).join(", ")}...`);
        }

        // Map WooCommerce tag IDs/names to Medusa tag IDs (tags were migrated in Phase 2)
        const categoryTagIds: { id: string; value: string }[] = (woo.tags || [])
          .map((tag) => {
            const nameKey = tag.name.toLowerCase();
            const medusaId = this.mapping.tagIdMap.get(nameKey) || this.mapping.tagIdMap.get(tag.name);
            return medusaId ? { id: medusaId, value: tag.name } : null;
          })
          .filter((item): item is { id: string; value: string } => item !== null);

        // Map images từ REST API format (src) sang DB format (guid) để tương thích với dataTransformer
        // REST API: name, description, regular_price, sale_price, sku, stock_quantity, weight, images[].src
        // DB format: post_title, post_content, meta._regular_price, meta._sale_price, meta._sku, meta._stock, meta._weight, images[].guid

        // Map images từ REST API format (src) sang DB format (guid)
        const mappedImages: import("./woo-types").WooProductImage[] = (woo.images || []).map((img) => ({
          ID: String(img.id),
          post_author: "",
          post_date: "",
          post_date_gmt: "",
          post_content: "",
          post_title: img.name || "",
          post_excerpt: "",
          post_status: "inherit",
          comment_status: "open",
          ping_status: "open",
          post_password: "",
          post_name: "",
          to_ping: "",
          pinged: "",
          post_modified: "",
          post_modified_gmt: "",
          post_content_filtered: "",
          post_parent: String(woo.id),
          guid: img.src || "",
          menu_order: 0,
          post_type: "attachment",
          post_mime_type: img.src?.endsWith(".png") ? "image/png" : "image/jpeg",
          comment_count: "0",
        }));

        const wooWithMeta: import("./woo-types").WooProductWithMeta = {
          ID: String(woo.id),
          post_author: "",
          post_date: woo.date_created || "",
          post_date_gmt: "",
          post_content: woo.description || "",
          post_title: woo.name || "",
          post_excerpt: woo.short_description || "",
          post_status: woo.status || "publish",
          comment_status: "open",
          ping_status: "open",
          post_password: "",
          post_name: handle,
          to_ping: "",
          pinged: "",
          post_modified: woo.date_modified || "",
          post_modified_gmt: "",
          post_content_filtered: "",
          post_parent: "",
          guid: "",
          menu_order: 0,
          post_type: "product",
          post_mime_type: "",
          comment_count: "0",
          meta: {
            _sku: woo.sku,
            _regular_price: woo.regular_price,
            _sale_price: woo.sale_price,
            _stock: woo.stock_quantity !== null && woo.stock_quantity !== undefined
              ? String(woo.stock_quantity)
              : undefined,
            _stock_status: woo.stock_status,
            _weight: woo.weight,
            _length: woo.length,
            _width: woo.width,
            _height: woo.height,
          },
          categories: (woo.categories || []).map((c) => String(c.id)),
          tags: (woo.tags || []).map((t) => String(t.id)),
          images: mappedImages,
          variations: [],
        };

        // Nếu config yêu cầu setProductsPublished=true, ép tất cả sang published
        // (bỏ qua trạng thái gốc từ WooCommerce)
        const finalStatus: "draft" | "published" = this.options.setProductsPublished
          ? "published"
          : dataTransformer.transformProductStatus(woo.status);

        const medusaProduct = dataTransformer.transformWooProductToMedusa(
          wooWithMeta,
          categoryIds,
          [],
          categoryTagIds,
          this.currency
        );

        // Ghi đè status nếu cần
        medusaProduct.status = finalStatus;

        medusaProduct.metadata = {
          ...medusaProduct.metadata,
          wooId: String(woo.id),
          batchNumber: batchNum,
        };

        const medusaInput = this.medusa.buildProductInput(
          medusaProduct,
          categoryIds,
          categoryTagIds
        );
        if (medusaInput.categories && medusaInput.categories.length > 0) {
          this.log(`  [DEBUG] Product "${woo.name}" có ${medusaInput.categories.length} Medusa categories: ${medusaInput.categories.map((c) => c.id).join(", ")}`);
        }

        const validation = dataTransformer.validateProductForMigration(
          medusaProduct
        );
        if (!validation.valid) {
          this.log(
            `  [WARN] Product "${woo.name}" has issues: ${validation.errors.join(", ")}`
          );
        }

        medusaProducts.push(medusaInput);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logError(`Failed to prepare product "${woo.name}"`, errMsg);
        errors.push({
          type: "product",
          sourceId: String(woo.id),
          message: `Failed to prepare: ${errMsg}`,
          timestamp: new Date(),
        });
      }
    }

    if (medusaProducts.length === 0) {
      this.log(`  Batch ${batchNum}: No products to create (all skipped or failed)`);
      return;
    }

    this.log(`  Batch ${batchNum}: Creating ${medusaProducts.length} products...`);

    if (!this.config.medusa.dryRun) {
      try {
        const created = await this.medusa.createProductsBatch(
          medusaProducts as Parameters<typeof this.medusa.createProductsBatch>[0]
        );

        created.ids.forEach((medusaId) => {
          this.mapping.productIdMap.set(medusaId, medusaId);
        });

        this.log(
          `  Batch ${batchNum}: Successfully created ${created.created} products (${created.failed} failed)`
        );

        if (created.errors.length > 0) {
          created.errors.forEach((err) => {
            this.logError(`  Product [${err.index}] failed:`, err.message);
          });
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logError(`Batch ${batchNum} failed`, errMsg);
        errors.push({
          type: "product",
          sourceId: `batch-${batchNum}`,
          message: `Batch creation failed: ${errMsg}`,
          timestamp: new Date(),
        });
      }
    } else {
      this.log(
        `  [DRY RUN] Would create ${medusaProducts.length} products`
      );
    }
  }

  private async finalize(): Promise<void> {
    this.log("\n=== Migration Complete ===\n");
    this.log(
      `Categories migrated: ${this.stats.processedCategories}/${this.stats.totalCategories}`
    );
    this.log(
      `Tags migrated: ${this.stats.processedTags}/${this.stats.totalTags}`
    );
    this.log(
      `Products migrated: ${this.stats.processedProducts}/${this.stats.totalProducts}`
    );

    if (this.stats.errors.length > 0) {
      this.log(`\nErrors encountered: ${this.stats.errors.length}`);
      this.stats.errors.slice(0, 10).forEach((err, i) => {
        this.log(`  ${i + 1}. [${err.type}] ${err.sourceId}: ${err.message}`);
      });
      if (this.stats.errors.length > 10) {
        this.log(`  ... and ${this.stats.errors.length - 10} more errors`);
      }
    }

    this.log("Done!");
  }

  private log(message: string): void {
    console.log(`[Migration] ${message}`);
  }

  private logError(message: string, error?: string): void {
    console.error(`[Migration] ERROR: ${message}`);
    if (error) {
      console.error(`  Details: ${error}`);
    }
  }

  private logProgress(current: number, total: number): void {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const bar = "=".repeat(Math.floor(percent / 5)) + " ".repeat(20 - Math.floor(percent / 5));
    process.stdout.write(`\r  Progress: [${bar}] ${percent}% (${current}/${total})`);
    if (current >= total) process.stdout.write("\n");
  }

  getStats(): MigrationStats {
    return { ...this.stats };
  }

  getMapping(): MigrationMapping {
    return { ...this.mapping };
  }
}

export async function runMigration(
  config?: Partial<MigrationConfig>
): Promise<MigrationResult> {
  const finalConfig: MigrationConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    woo: { ...DEFAULT_CONFIG.woo, ...config?.woo },
    medusa: { ...DEFAULT_CONFIG.medusa, ...config?.medusa },
    options: { ...DEFAULT_CONFIG.options, ...config?.options },
  };

  const migrator = new WooToMedusaMigrator(finalConfig);

  return await migrator.migrate();
}

async function parseArgs(): Promise<{
  configPath?: string;
  dryRun?: boolean;
  incremental?: boolean;
  batchSize?: number;
}> {
  const args = process.argv.slice(2);
  const result: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "-d") {
      result.dryRun = true;
    } else if (arg === "--incremental" || arg === "-i") {
      result.incremental = true;
    } else if (arg === "--config" || arg === "-c") {
      result.configPath = args[++i];
    } else if (arg === "--batch" || arg === "-b") {
      result.batchSize = parseInt(args[++i] as string, 10);
    }
  }

  return result as {
    configPath?: string;
    dryRun?: boolean;
    incremental?: boolean;
    batchSize?: number;
  };
}

async function main(): Promise<void> {
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     WooCommerce to Medusa Migration Tool v2.0           ║");
  console.log("║     (Dùng WooCommerce REST API — không MySQL trực tiếp) ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n");

  const args = await parseArgs();

  let config: Partial<MigrationConfig> = {};

  if (args.configPath) {
    try {
      const imported = await import(args.configPath as string);
      config = imported.default || imported;
      console.log(`Loaded config from: ${args.configPath as string}\n`);
    } catch (error) {
      console.error(
        `Failed to load config from ${args.configPath as string}:`,
        error
      );
      process.exit(1);
    }
  }

  const cfg = config as Record<string, unknown>;

  if (args.dryRun) {
    cfg.medusa = cfg.medusa as Record<string, unknown> || {};
    (cfg.medusa as Record<string, unknown>).dryRun = true;
  }

  if (args.incremental) {
    cfg.options = cfg.options as Record<string, unknown> || {};
    (cfg.options as Record<string, unknown>).mode = "incremental";
  }

  if (args.batchSize) {
    cfg.medusa = cfg.medusa as Record<string, unknown> || {};
    (cfg.medusa as Record<string, unknown>).batchSize = args.batchSize;
  }

  if (
    !DEFAULT_CONFIG.medusa.adminApiKey &&
    !process.env.MEDUSA_ADMIN_API_KEY
  ) {
    console.error("ERROR: MEDUSA_ADMIN_API_KEY is required.");
    console.error("Set it via environment variable or in config file.\n");
    process.exit(1);
  }

  try {
    const result = await runMigration(config);

    console.log("\n");
    if (result.success) {
      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║  Migration completed successfully!                       ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
    } else {
      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║  Migration completed with errors.                        ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      process.exitCode = 1;
    }

    console.log("\nSummary:");
    console.log(`  Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`  Categories: ${result.categoriesMigrated}`);
    console.log(`  Tags: ${result.tagsMigrated}`);
    console.log(`  Products: ${result.productsMigrated}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log("");
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("\nFATAL ERROR:", errMsg);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
