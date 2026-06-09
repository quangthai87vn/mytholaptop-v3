/**
 * Medusa API Service
 *
 * Kết nối thật đến Medusa Admin API.
 *
 * API Reference:
 * https://docs.medusajs.com/api/admin
 */

import type {
  MedusaProduct,
  MedusaCategory,
  IdMapping,
} from "@/types";

import { mimeTypeToExt } from "@/lib/media-helpers";

// ============================================================
// CONCURRENT PROCESSING HELPERS
// ============================================================

/**
 * Xử lý array với concurrency limit
 */
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const promise = processor(item, i).then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove resolved promises
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================
// API CLIENT
// ============================================================

export interface MedusaConfig {
  backendUrl: string;
  /** API Key (dạng sk_xxx) — dùng trực tiếp làm Bearer token */
  adminApiKey?: string;
  /** Email cho JWT auth — ưu tiên hơn adminApiKey */
  adminEmail?: string;
  /** Password cho JWT auth */
  adminPassword?: string;
}

export interface MedusaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MedusaBatchResponse {
  created: number;
  updated: number;
  failed: number;
  skipped?: number;
  errors: Array<{ 
    index: number; 
    message: string; 
    httpStatus?: number; 
    code?: string; 
    categoryName?: string;
    productTitle?: string;
    sku?: string;
    wooId?: number;
  }>;
}

/**
 * Gọi Medusa Admin API qua proxy server-side.
 * P4.2 Security: KHÔNG truyền credentials (adminApiKey, email, password)
 * qua URL query params — credentials được proxy load tự động từ database.
 */
export async function medusaRequest<T>(
  endpoint: string,
  config: MedusaConfig,
  options: RequestInit = {}
): Promise<MedusaApiResponse<T>> {
  try {
    // Proxy server-side: credentials được load tự động từ DB
    // Frontend chỉ gửi backendUrl để identify target Medusa instance
    const proxyUrl = `/api/medusa${endpoint}`;
    const url = new URL(proxyUrl, window.location.origin);

    // Chỉ gửi backendUrl — không gửi credentials qua URL
    // Proxy /api/medusa/[...slug] sẽ tự load credentials từ database
    url.searchParams.set("backendUrl", config.backendUrl);

    const response = await fetch(url.toString(), {
      ...options,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const contentType = response.headers.get("Content-Type") || "";
    let data: T | undefined;

    if (contentType.includes("application/json")) {
      const text = await response.text();
      if (typeof window !== "undefined") {
        console.debug("[Medusa]", response.status, endpoint, "|", text.slice(0, 300));
      }
      data = text ? JSON.parse(text) as T : undefined;
    } else {
      const text = await response.text();
      if (typeof window !== "undefined") {
        console.debug("[Medusa]", response.status, endpoint, "|", text.slice(0, 300));
      }
      data = text as unknown as T;
    }

    if (!response.ok) {
      // Medusa v2 error formats:
      // 1. { message: string, code?: string }
      // 2. { error: string, code?: string }
      // 3. { errors: [{ message: string, code?: string, ... }] }
      // 4. { type: string, message: string }
      // 5. Plain text
      let errorData = "";
      if (typeof data === "object" && data !== null) {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.errors)) {
          // Format 3: Batch validation errors
          errorData = (obj.errors as Array<Record<string, unknown>>)
            .map((e) => {
              const msg = typeof e.message === "string" ? e.message : JSON.stringify(e.message);
              const code = typeof e.code === "string" ? `[${e.code}]` : "";
              return `${code} ${msg}`.trim();
            })
            .join("; ");
        } else {
          // Format 1, 2, 4
          errorData =
            (obj.message as string) ||
            (obj.error as string) ||
            (obj.type as string && `${obj.type}: ${obj.message}`) ||
            JSON.stringify(data);
        }
      } else {
        errorData = String(data ?? response.statusText);
      }
      if (typeof window !== "undefined") {
        console.debug("[Medusa]", response.status, endpoint, "| Full error data:", JSON.stringify(data)?.slice(0, 500));
      }
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorData || response.statusText}`,
      };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Network error: ${message}` };
  }
}

// ============================================================
// CATEGORY OPERATIONS
// ============================================================

/**
 * Create a single category in Medusa.
 */
export async function createCategory(
  config: MedusaConfig,
  category: MedusaCategory
): Promise<MedusaApiResponse<{ id: string }>> {
  const result = await medusaRequest<{ product_category: { id: string } }>(
    "/admin/product-categories",
    config,
    {
      method: "POST",
      body: JSON.stringify({
        name: category.name,
        description: category.description,
        handle: category.handle,
        parent_category_id: category.parent_category_id,
        is_active: true,
        is_internal: false,
        metadata: category.metadata,
      }),
    }
  );

  if (result.success && result.data) {
    return { success: true, data: { id: result.data.product_category.id } };
  }

  return { success: false, error: result.error };
}

/**
 * Update a category in Medusa.
 */
export async function updateCategory(
  config: MedusaConfig,
  categoryId: string,
  category: Partial<MedusaCategory>
): Promise<MedusaApiResponse<{ id: string }>> {
  const result = await medusaRequest<{ product_category: { id: string } }>(
    `/admin/product-categories/${categoryId}`,
    config,
    {
      method: "POST",
      body: JSON.stringify(category),
    }
  );

  if (result.success && result.data) {
    return { success: true, data: { id: result.data.product_category.id } };
  }

  return { success: false, error: result.error };
}

/**
 * Callback for category progress updates
 */
export type CategoryProgressCallback = (data: {
  type: "created" | "updated" | "failed";
  name: string;
  index: number;
  total: number;
  medusaId?: string;
  error?: string;
}) => void;

/**
 * Batch create categories with HIERARCHY-AWARE processing for SPEED.
 * Groups categories by level and processes each level in parallel.
 * Parent categories are created BEFORE children.
 */
export async function batchCreateCategories(
  config: MedusaConfig,
  categories: MedusaCategory[],
  parentIdMap: Record<number, string> = {},
  options?: {
    onProgress?: CategoryProgressCallback;
  }
): Promise<MedusaApiResponse<MedusaBatchResponse & { ids: string[]; wooIdToMedusaId: Record<string, string> }>> {
  const ids: string[] = [];
  let created = 0;
  let updated = 0;
  const errors: Array<{ index: number; message: string; categoryName?: string }> = [];
  const wooIdToMedusaId: Record<string, string> = {};

  const startTime = Date.now();

  // Separate categories by hierarchy level
  // Level 0 = root categories (no parent)
  // Level 1 = children of root
  // Level 2 = grandchildren, etc.
  const levels: Map<number, MedusaCategory[]> = new Map();
  
  for (const cat of categories) {
    const level = parseInt(cat.metadata?.parentCategoryLevel || "0", 10);
    if (!levels.has(level)) {
      levels.set(level, []);
    }
    levels.get(level)!.push(cat);
  }

  if (typeof window !== "undefined") {
    console.debug(`[batchCreateCategories] Processing ${categories.length} categories in ${levels.size} levels`);
  }

  // Process each level sequentially, but categories within each level in parallel
  for (const [level, levelCats] of [...levels.entries()].sort((a, b) => a[0] - b[0])) {
    if (typeof window !== "undefined") {
      console.debug(`[batchCreateCategories] Processing level ${level} (${levelCats.length} categories)`);
    }

    // Process all categories at this level in parallel
    await Promise.all(
      levelCats.map(async (cat, idx) => {
        try {
          // Resolve parent_category_id from parentIdMap
          const wooParentId = cat.metadata?.originalParentId
            ? parseInt(cat.metadata.originalParentId, 10)
            : null;
          const resolvedParentId = wooParentId !== null && wooParentId !== undefined
            ? parentIdMap[wooParentId] ?? null
            : null;

          const payload = {
            name: cat.name,
            description: cat.description,
            handle: cat.handle,
            parent_category_id: resolvedParentId || undefined,
            is_active: true,
            is_internal: false,
            metadata: cat.metadata,
          };

          // Try to create
          const createResult = await medusaRequest<{ product_category: { id: string } }>(
            "/admin/product-categories",
            config,
            { method: "POST", body: JSON.stringify(payload) }
          );

          if (createResult.success && createResult.data && "product_category" in createResult.data) {
            const medusaId = createResult.data.product_category.id;
            ids.push(medusaId);
            const thisWooId = cat.metadata?.originalId ? parseInt(cat.metadata.originalId, 10) : null;
            if (thisWooId !== null && thisWooId !== undefined) {
              parentIdMap[thisWooId] = medusaId;
              wooIdToMedusaId[String(thisWooId)] = medusaId;
            }
            created++;
            options?.onProgress?.({
              type: "created",
              name: cat.name || "Unnamed",
              index: categories.indexOf(cat),
              total: categories.length,
              medusaId,
            });
            return;
          }

          // If failed due to duplicate handle, the category already exists
          const dataObj = (createResult.data && typeof createResult.data === "object") ? createResult.data as Record<string, unknown> : {};
          const errorMsg = typeof dataObj.message === "string" ? dataObj.message : "";
          
          // Check for "already exists" error - category is already there, just map it
          if (errorMsg.includes("already exists")) {
            const byHandle = await findCategoryByHandle(config, cat.handle || "");
            if (byHandle.success && byHandle.data) {
              const medusaId = byHandle.data.id;
              ids.push(medusaId);
              const thisWooId = cat.metadata?.originalId ? parseInt(cat.metadata.originalId, 10) : null;
              if (thisWooId !== null && thisWooId !== undefined) {
                parentIdMap[thisWooId] = medusaId;
                wooIdToMedusaId[String(thisWooId)] = medusaId;
              }
              updated++;
              options?.onProgress?.({
                type: "updated",
                name: cat.name || "Unnamed",
                index: categories.indexOf(cat),
                total: categories.length,
                medusaId,
              });
              return;
            }
            // If we can't find it by handle, count as error
            const errMsg = `[${cat.name || "Unnamed"}] already exists but cannot find by handle`;
            errors.push({ index: categories.indexOf(cat), message: errMsg, categoryName: cat.name });
            options?.onProgress?.({
              type: "failed",
              name: cat.name || "Unnamed",
              index: categories.indexOf(cat),
              total: categories.length,
              error: errMsg,
            });
            return;
          }
          
          // For other invalid_data errors, try update
          const errorType = typeof dataObj.type === "string" ? dataObj.type : "";
          if (errorType === "invalid_data") {
            const byHandle = await findCategoryByHandle(config, cat.handle || "");
            if (byHandle.success && byHandle.data) {
              const updateResult = await medusaRequest<{ product_category: { id: string } }>(
                `/admin/product-categories/${byHandle.data.id}`,
                config,
                { method: "POST", body: JSON.stringify(payload) }
              );
              if (updateResult.success && updateResult.data && "product_category" in updateResult.data) {
                const medusaId = updateResult.data.product_category.id;
                ids.push(medusaId);
                const thisWooId = cat.metadata?.originalId ? parseInt(cat.metadata.originalId, 10) : null;
                if (thisWooId !== null && thisWooId !== undefined) {
                  parentIdMap[thisWooId] = medusaId;
                  wooIdToMedusaId[String(thisWooId)] = medusaId;
                }
                updated++;
                return;
              }
            }
          }

          // Failed
          const failMsg = typeof dataObj.message === "string" ? dataObj.message : (createResult.error || "Unknown");
          errors.push({ index: categories.indexOf(cat), message: `[${cat.name || "Unnamed"}] failed: ${failMsg}`, categoryName: cat.name });
          options?.onProgress?.({
            type: "failed",
            name: cat.name || "Unnamed",
            index: categories.indexOf(cat),
            total: categories.length,
            error: failMsg,
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown";
          errors.push({ index: categories.indexOf(cat), message: `[${cat.name || "Unnamed"}] exception: ${errMsg}`, categoryName: cat.name });
          options?.onProgress?.({
            type: "failed",
            name: cat.name || "Unnamed",
            index: categories.indexOf(cat),
            total: categories.length,
            error: errMsg,
          });
        }
      })
    );
  }

  const elapsed = Date.now() - startTime;
  if (typeof window !== "undefined") {
    console.debug(`[batchCreateCategories] Done in ${elapsed}ms. Created: ${created}, Updated: ${updated}, Failed: ${errors.length}`);
  }

  return {
    success: errors.length === 0 || created > 0 || updated > 0,
    data: { created, updated, failed: errors.length, errors, ids, wooIdToMedusaId },
  };
}

// ============================================================
// TAG OPERATIONS
// ============================================================

/**
 * Medusa Product Tag format
 */
export interface MedusaProductTag {
  id: string;
  value: string;
}

/**
 * Create a single product tag in Medusa.
 */
export async function createProductTag(
  config: MedusaConfig,
  tag: { value: string }
): Promise<MedusaApiResponse<{ product_tag: { id: string; value: string } }>> {
  return medusaRequest<{ product_tag: { id: string; value: string } }>(
    "/admin/product-tags",
    config,
    { method: "POST", body: JSON.stringify(tag) }
  );
}

/**
 * List all product tags from Medusa.
 */
export async function listProductTags(
  config: MedusaConfig,
  limit: number = 100
): Promise<MedusaApiResponse<{ product_tags: Array<{ id: string; value: string }>; count: number }>> {
  return medusaRequest<{ product_tags: Array<{ id: string; value: string }>; count: number }>(
    `/admin/product-tags?limit=${limit}`,
    config
  );
}

/**
 * Find a product tag by value/name.
 */
export async function findProductTagByValue(
  config: MedusaConfig,
  value: string
): Promise<MedusaApiResponse<{ id: string; value: string } | null>> {
  const result = await listProductTags(config, 1000);
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }
  const found = result.data.product_tags.find(
    (t) => t.value.toLowerCase() === value.toLowerCase()
  );
  return { success: true, data: found || null };
}

/**
 * Callback for tag progress updates
 */
export type TagProgressCallback = (data: {
  type: "created" | "found" | "failed";
  value: string;
  index: number;
  total: number;
  medusaId?: string;
  error?: string;
}) => void;

/**
 * Batch create or find product tags.
 * Returns mapping of WooCommerce tag IDs to Medusa tag IDs.
 */
export async function batchCreateProductTags(
  config: MedusaConfig,
  tags: Array<{ id: number; name: string; slug: string }>,
  options?: {
    onProgress?: TagProgressCallback;
  }
): Promise<MedusaApiResponse<{ wooIdToMedusaId: Record<string, string>; created: number; found: number; failed: number }>> {
  const wooIdToMedusaId: Record<string, string> = {};
  let created = 0;
  let found = 0;
  let failed = 0;

  // Process tags sequentially to avoid conflicts
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const slug = tag.slug || tag.name.toLowerCase().replace(/\s+/g, "-");
    const value = tag.name;

    try {
      // First, try to find existing tag
      const existingResult = await findProductTagByValue(config, value);
      
      if (existingResult.success && existingResult.data) {
        // Tag already exists
        const medusaId = existingResult.data.id;
        wooIdToMedusaId[String(tag.id)] = medusaId;
        found++;
        options?.onProgress?.({
          type: "found",
          value,
          index: i + 1,
          total: tags.length,
          medusaId,
        });
        continue;
      }

      // Create new tag
      const createResult = await createProductTag(config, { value });
      
      if (createResult.success && createResult.data && "product_tag" in createResult.data) {
        const medusaId = createResult.data.product_tag.id;
        wooIdToMedusaId[String(tag.id)] = medusaId;
        created++;
        options?.onProgress?.({
          type: "created",
          value,
          index: i + 1,
          total: tags.length,
          medusaId,
        });
      } else {
        // Check for "already exists" error
        const dataObj = createResult.data as Record<string, unknown> | undefined;
        const errorMsg = typeof dataObj?.message === "string" ? dataObj.message : "";
        
        if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
          // Try to find it again
          const retryResult = await findProductTagByValue(config, value);
          if (retryResult.success && retryResult.data) {
            wooIdToMedusaId[String(tag.id)] = retryResult.data.id;
            found++;
            options?.onProgress?.({
              type: "found",
              value,
              index: i + 1,
              total: tags.length,
              medusaId: retryResult.data.id,
            });
          } else {
            failed++;
            options?.onProgress?.({
              type: "failed",
              value,
              index: i + 1,
              total: tags.length,
              error: errorMsg || "Cannot create or find tag",
            });
          }
        } else {
          failed++;
          options?.onProgress?.({
            type: "failed",
            value,
            index: i + 1,
            total: tags.length,
            error: errorMsg || createResult.error || "Unknown error",
          });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown";
      failed++;
      options?.onProgress?.({
        type: "failed",
        value,
        index: i + 1,
        total: tags.length,
        error: errMsg,
      });
    }
  }

  return {
    success: failed === 0 || created > 0 || found > 0,
    data: { wooIdToMedusaId, created, found, failed },
  };
}

// ============================================================
// PRODUCT OPERATIONS
// ============================================================

/**
 * Create a single product in Medusa.
 */
export async function createProduct(
  config: MedusaConfig,
  product: MedusaProduct
): Promise<MedusaApiResponse<{ id: string; object: string }>> {
  const result = await medusaRequest<{ product: { id: string; object: string } }>(
    "/admin/products",
    config,
    {
      method: "POST",
      body: JSON.stringify(product),
    }
  );

  if (result.success && result.data) {
    return { success: true, data: { id: result.data.product.id, object: result.data.product.object } };
  }

  return { success: false, error: result.error };
}

/**
 * Update an existing product.
 * Medusa v2: NEVER send variants in update payload — variants must be managed separately.
 * thumbnail và images ĐƯỢC GIỮ LẠI trong update payload — rất quan trọng cho media migration.
 * relative path sẽ được convert sang absolute URL trước khi gửi.
 */
export async function updateProduct(
  config: MedusaConfig,
  productId: string,
  product: Partial<MedusaProduct>,
  options?: {
    /** Base URL để convert relative image path → absolute URL. Mặc định = medusaBackendUrl. */
    imageBaseUrl?: string;
  }
): Promise<MedusaApiResponse<{ id: string; object: string }>> {
  const { variants, subtitle, originalSku, originalId, shortDescription: _removed, ...updatePayload } = product as Record<string, unknown>;

  // short_description is NOT a Medusa v2 top-level field
  // Store it in metadata as woocommerce_short_description
  const shortDesc = (product as Record<string, unknown>).shortDescription as string | undefined;

  // Strip WooCommerce-specific and non-API fields from update payload
  const sanitized: Record<string, unknown> = { ...updatePayload };

  // Keep thumbnail and images for media migration updates
  if (updatePayload.thumbnail !== undefined) {
    sanitized.thumbnail = updatePayload.thumbnail;
  }
  if (updatePayload.images !== undefined) {
    sanitized.images = updatePayload.images;
  }

  // description is a top-level Medusa field — keep it
  // shortDescription (from rewriteHtmlDescriptions) → store in metadata
  const baseMetadata = stripWooCommerceFields(updatePayload.metadata as Record<string, unknown> | undefined) || {};
  if (shortDesc) {
    baseMetadata.woocommerce_short_description = shortDesc;
  }
  sanitized.metadata = Object.keys(baseMetadata).length > 0 ? baseMetadata : undefined;

  // Convert relative image paths (keep as relative — we fixed resolveImageUrl)
  const imageBaseUrl = options?.imageBaseUrl || config.backendUrl;
  const resolvedPayload = resolveProductImageUrls(
    sanitized as Partial<MedusaProduct>,
    config.backendUrl,
    imageBaseUrl
  );

  if (typeof window !== "undefined") {
    console.debug("[updateProduct] Payload thumbnail:", resolvedPayload.thumbnail);
    console.debug("[updateProduct] Thumbnail type:", typeof resolvedPayload.thumbnail, "| Value:", resolvedPayload.thumbnail?.slice(0, 100));
    console.debug("[updateProduct] Payload images:", resolvedPayload.images?.map(i => i.url.slice(0, 80)));
    console.debug("[updateProduct] Payload description:", resolvedPayload.description ? "(has content)" : "none");
    console.debug("[updateProduct] Payload shortDescription in metadata:", shortDesc ? "(has content)" : "none");
  }

  const result = await medusaRequest<{ product: { id: string; object: string } }>(
    `/admin/products/${productId}`,
    config,
    {
      method: "POST",
      body: JSON.stringify(resolvedPayload),
    }
  );

  if (result.success && result.data) {
    return { success: true, data: { id: result.data.product.id, object: result.data.product.object } };
  }

  return { success: false, error: result.error };
}

/**
 * Find a product by variant SKU (more reliable than title search).
 */
export async function findProductByVariantSku(
  config: MedusaConfig,
  sku: string
): Promise<MedusaApiResponse<{ id: string; title: string } | null>> {
  if (!sku) {
    return { success: true, data: null };
  }

  const result = await medusaRequest<{ products: Array<{ id: string; title: string; variants: Array<{ sku?: string }> }>; count: number }>(
    `/admin/products?q=${encodeURIComponent(sku)}`,
    config
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const products = result.data?.products || [];
  const found = products.find((p) =>
    p.variants?.some((v) => v.sku === sku)
  );

  if (typeof window !== "undefined") {
    console.debug("[findProductByVariantSku]", sku, "| found:", found ? `${found.id} (${found.title})` : "null", `| total=${products.length}, count=${result.data?.count}`);
  }

  return { success: true, data: found ? { id: found.id, title: found.title } : null };
}

/**
 * Find a category by WooCommerce original ID stored in metadata.
 * Returns the Medusa category ID if found.
 */
export async function findCategoryByOriginalId(
  config: MedusaConfig,
  originalId: string
): Promise<MedusaApiResponse<{ id: string; name: string } | null>> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = await medusaRequest<{
      product_categories: Array<{ id: string; name: string; metadata?: Record<string, unknown> }>;
      count: number;
    }>(
      `/admin/product-categories?limit=${limit}&offset=${offset}`,
      config
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const categories = result.data?.product_categories || [];
    const found = categories.find(
      (c) => c.metadata?.originalId === originalId
    );

    if (found) {
      return { success: true, data: { id: found.id, name: found.name } };
    }

    if (categories.length < limit) break;
    offset += limit;
    if (offset > 10000) break;
  }

  return { success: true, data: null };
}

/**
 * Find a category by handle.
 */
export async function findCategoryByHandle(
  config: MedusaConfig,
  handle: string
): Promise<MedusaApiResponse<{ id: string; name: string } | null>> {
  if (!handle) {
    return { success: true, data: null };
  }

  const result = await medusaRequest<{
    product_categories: Array<{ id: string; name: string }>;
    count: number;
  }>(
    `/admin/product-categories?handle=${encodeURIComponent(handle)}`,
    config
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const categories = result.data?.product_categories || [];
  if (categories.length > 0) {
    return { success: true, data: { id: categories[0].id, name: categories[0].name } };
  }

  return { success: true, data: null };
}

/**
 * List all products from Medusa (paginated).
 */
export async function listAllProducts(
  config: MedusaConfig,
  limit = 100
): Promise<MedusaApiResponse<Array<{ id: string; title: string }>>> {
  const allProducts: Array<{ id: string; title: string }> = [];
  let offset = 0;

  while (true) {
    const result = await medusaRequest<{
      products: Array<{ id: string; title: string }>;
      count: number;
    }>(
      `/admin/products?limit=${limit}&offset=${offset}`,
      config
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const products = result.data?.products || [];
    allProducts.push(...products);

    if (products.length < limit) {
      break;
    }
    offset += limit;
  }

  return { success: true, data: allProducts };
}

/**
 * List all categories from Medusa (sorted by hierarchy: parents before children).
 */
export async function listAllCategories(
  config: MedusaConfig,
  limit = 100
): Promise<MedusaApiResponse<Array<{ id: string; name: string; rank: number }>>> {
  const result = await medusaRequest<{
    product_categories: Array<{ id: string; name: string; rank: number; parent_category_id?: string | null }>;
    count: number;
  }>(
    `/admin/product-categories?limit=${limit}`,
    config
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const categories = result.data?.product_categories || [];
  const sorted = [...categories].sort((a, b) => {
    if (!a.parent_category_id && b.parent_category_id) return -1;
    if (a.parent_category_id && !b.parent_category_id) return 1;
    return (a.rank ?? 0) - (b.rank ?? 0);
  });

  return { success: true, data: sorted.map((c) => ({ id: c.id, name: c.name, rank: c.rank ?? 0 })) };
}

/**
 * Search inventory items by SKU pattern (supports partial match).
 */
export async function searchInventoryItemsBySku(
  config: MedusaConfig,
  skuQuery: string
): Promise<MedusaApiResponse<Array<{
  id: string;
  sku: string;
  title: string;
  variantCount: number;
  variantIds: string[];
  hasVariantLinks: boolean;
  isOrphan: boolean;
  product?: { id: string; title: string };
}>>> {
  const result = await medusaRequest<{
    success: boolean;
    query: string;
    inventoryItems: Array<{
      id: string;
      sku: string;
      title: string;
      description?: string;
      variantCount: number;
      variantIds: string[];
      product?: { id: string; title: string };
      isOrphan: boolean;
    }>;
  }>(`/admin/custom/inventory-items?q=${encodeURIComponent(skuQuery)}`, config);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: (result.data?.inventoryItems || []).map((item) => ({
      id: item.id,
      sku: item.sku,
      title: item.title,
      variantCount: item.variantCount,
      variantIds: item.variantIds || [],
      hasVariantLinks: (item.variantIds?.length ?? 0) > 0,
      isOrphan: item.isOrphan,
      product: item.product,
    })),
  };
}

/**
 * Delete inventory items by IDs or SKUs.
 * Supports dryRun mode.
 */
export async function deleteInventoryItems(
  config: MedusaConfig,
  options: { ids?: string[]; skus?: string[]; dryRun?: boolean }
): Promise<MedusaApiResponse<{
  deleted?: number;
  dryRun?: boolean;
  items: Array<{
    inventory_item_id: string;
    sku: string;
    title: string;
    hasVariantLinks: boolean;
    variantCount: number;
    isOrphan: boolean;
  }>;
}>> {
  if ((!options.ids || !options.ids.length) && (!options.skus || !options.skus.length)) {
    return { success: false, error: "Phải cung cấp ids hoặc skus" };
  }

  const body: Record<string, unknown> = {};
  if (options.ids?.length) body.ids = options.ids;
  if (options.skus?.length) body.skus = options.skus;
  if (options.dryRun) body.dryRun = true;

  const result = await medusaRequest<{
    success: boolean;
    deleted?: number;
    dryRun?: boolean;
    ids?: string[];
    items: Array<{
      inventory_item_id: string;
      sku: string;
      title: string;
      hasVariantLinks: boolean;
      variantCount: number;
      isOrphan: boolean;
    }>;
  }>(`/admin/custom/inventory-items/delete`, config, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return result;
}

/**
 * Delete inventory items by SKU using custom backend API.
 * @deprecated Use deleteInventoryItems() instead.
 */
export async function deleteInventoryItemsBySku(
  config: MedusaConfig,
  skus: string[]
): Promise<MedusaApiResponse<{ deleted: number; ids: string[] }>> {
  if (!skus.length) {
    return { success: true, data: { deleted: 0, ids: [] } };
  }

  const result = await deleteInventoryItems(config, { skus, dryRun: false });
  
  if (result.success && result.data) {
    // Extract ids from items for backwards compatibility
    const deletedIds = result.data.items?.map((item) => item.inventory_item_id) || [];
    return {
      success: true,
      data: { deleted: result.data.deleted || 0, ids: deletedIds },
    };
  }
  
  return { success: false, error: result.error };
}

// ============================================================
// INVENTORY CLEANUP SERVICE
// ============================================================

export interface InventoryItemInfo {
  inventory_item_id: string;
  sku: string;
  title: string;
  hasVariantLinks: boolean;
  variantCount: number;
  isOrphan: boolean;
  product_id?: string;
  product_title?: string;
}

export interface CleanupDryRunResult {
  success: boolean;
  totalItems: number;
  orphanItems: number;
  linkedItems: number;
  items: InventoryItemInfo[];
  error?: string;
}

export interface CleanupResult {
  success: boolean;
  deletedInventoryItems: number;
  deletedProducts: number;
  deletedCategories: number;
  errors: string[];
  items: InventoryItemInfo[];
  error?: string;
}

/**
 * Get all products with WooCommerce metadata and their variants/SKUs.
 * Returns products matching: metadata.wordpress_sync_source = "woocommerce"
 * or variants with SKU starting with "woo-"
 */
export async function getMigratedProductsWithSkus(
  config: MedusaConfig
): Promise<MedusaApiResponse<Array<{
  id: string;
  title: string;
  sku: string;
  woo_id?: string;
  variants: Array<{ id: string; sku: string; title: string }>;
}>>> {
  const result = await medusaRequest<{
    products: Array<{
      id: string;
      title: string;
      metadata?: Record<string, unknown>;
      variants: Array<{ id: string; sku?: string; title: string }>;
    }>;
    count: number;
  }>(`/admin/products?limit=200&offset=0`, config);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const allProducts: Array<{
    id: string;
    title: string;
    sku: string;
    woo_id?: string;
    variants: Array<{ id: string; sku: string; title: string }>;
  }> = [];

  for (const p of result.data.products || []) {
    // Check if it's a migrated product (by metadata or SKU prefix)
    const isMigrated =
      (p.metadata?.wordpress_sync_source === "woocommerce") ||
      p.variants?.some((v) => v.sku?.startsWith("woo-")) ||
      p.title?.includes("woo_") ||
      p.title?.includes("woo-");

    if (isMigrated) {
      const sku = p.variants?.[0]?.sku || "";
      const woo_id = p.metadata?.wordpress_original_id
        ? String(p.metadata.wordpress_original_id)
        : undefined;

      allProducts.push({
        id: p.id,
        title: p.title,
        sku,
        woo_id,
        variants: (p.variants || []).map((v) => ({
          id: v.id,
          sku: v.sku || "",
          title: v.title || "",
        })),
      });
    }
  }

  return { success: true, data: allProducts };
}

/**
 * Check if a specific SKU exists in inventory_item table.
 * Returns inventory_item details if found.
 */
export async function checkInventoryItemBySku(
  config: MedusaConfig,
  sku: string
): Promise<MedusaApiResponse<{
  exists: boolean;
  inventoryItem?: {
    id: string;
    sku: string;
    title: string;
    isOrphan: boolean;
    variantCount: number;
    variantIds: string[];
    hasVariantLinks: boolean;
    product?: { id: string; title: string };
  };
}>> {
  const result = await searchInventoryItemsBySku(config, sku);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const items = result.data || [];
  const found = items.find((item) => item.sku === sku);

  return {
    success: true,
    data: {
      exists: !!found,
      inventoryItem: found ? {
        id: found.id,
        sku: found.sku,
        title: found.title,
        isOrphan: found.isOrphan,
        variantCount: found.variantCount,
        variantIds: found.variantIds,
        hasVariantLinks: found.hasVariantLinks,
        product: found.product,
      } : undefined,
    },
  };
}

/**
 * Update inventory item quantity after product creation.
 * Medusa v2: Inventory is managed via Inventory Module separately from product variant.
 * After creating a product with variants, we need to update inventory_quantity on the inventory_item.
 */
export async function updateInventoryItemQuantity(
  config: MedusaConfig,
  sku: string,
  quantity: number,
  options?: {
    manageInventory?: boolean;
    allowBackorder?: boolean;
  }
): Promise<MedusaApiResponse<{ id: string; inventory_quantity: number }>> {
  // First check if inventory item exists
  const checkResult = await checkInventoryItemBySku(config, sku);
  if (!checkResult.success || !checkResult.data?.inventoryItem) {
    return { success: false, error: `Inventory item not found for SKU: ${sku}` };
  }

  const inventoryItemId = checkResult.data.inventoryItem.id;

  const result = await medusaRequest<{
    inventory_item: { id: string; inventory_quantity: number };
  }>(
    `/admin/inventory-items/${inventoryItemId}`,
    config,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventory_item: {
          manage_inventory: options?.manageInventory ?? true,
          allow_backorder: options?.allowBackorder ?? false,
        },
      }),
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Update quantity via separate endpoint
  const levelResult = await medusaRequest<{
    inventory_level: { id: string; stocked_quantity: number };
  }>(
    `/admin/inventory-items/${inventoryItemId}/levels`,
    config,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: "", // Use default location
        stocked_quantity: quantity,
      }),
    }
  );

  if (!levelResult.success) {
    return { success: false, error: levelResult.error };
  }

  return {
    success: true,
    data: {
      id: inventoryItemId,
      inventory_quantity: levelResult.data?.inventory_level?.stocked_quantity ?? quantity,
    },
  };
}

/**
 * Run cleanup dry-run: find all migrated products and inventory items.
 * Does NOT delete anything.
 */
export async function cleanupDryRun(
  config: MedusaConfig
): Promise<CleanupDryRunResult> {
  const errors: string[] = [];

  // Get migrated products
  const productsResult = await getMigratedProductsWithSkus(config);
  const migratedProducts = productsResult.success ? (productsResult.data || []) : [];

  // Collect all SKUs from migrated products
  const allSkus = new Set<string>();
  for (const p of migratedProducts) {
    for (const v of p.variants) {
      if (v.sku) allSkus.add(v.sku);
    }
  }

  // Check each SKU in inventory
  const inventoryItems: InventoryItemInfo[] = [];
  let orphanCount = 0;
  let linkedCount = 0;

  for (const sku of allSkus) {
    const invResult = await checkInventoryItemBySku(config, sku);
    if (invResult.success && invResult.data?.inventoryItem) {
      const item = invResult.data.inventoryItem;
      inventoryItems.push({
        inventory_item_id: item.id,
        sku: item.sku,
        title: item.title,
        hasVariantLinks: item.hasVariantLinks,
        variantCount: item.variantCount,
        isOrphan: item.isOrphan,
        product_id: item.product?.id,
        product_title: item.product?.title,
      });
      if (item.isOrphan) orphanCount++;
      else linkedCount++;
    }
  }

  return {
    success: true,
    totalItems: inventoryItems.length,
    orphanItems: orphanCount,
    linkedItems: linkedCount,
    items: inventoryItems,
  };
}

/**
 * Full cleanup: delete migrated products, categories, and orphan inventory items.
 */
export async function runFullCleanup(
  config: MedusaConfig,
  onLog?: (message: string, type: "info" | "warn" | "error" | "success") => void
): Promise<CleanupResult> {
  const errors: string[] = [];
  const allDeletedItems: InventoryItemInfo[] = [];

  function log(msg: string, type: "info" | "warn" | "error" | "success" = "info") {
    if (typeof window !== "undefined") {
      console.debug(`[Cleanup] ${msg}`);
    }
    onLog?.(msg, type);
  }

  // Step 1: Get migrated products
  log("Đang thu thập sản phẩm đã migrate...", "info");
  const productsResult = await getMigratedProductsWithSkus(config);
  if (!productsResult.success) {
    errors.push(`Lỗi lấy products: ${productsResult.error}`);
    return { success: false, deletedInventoryItems: 0, deletedProducts: 0, deletedCategories: 0, errors, items: [] };
  }

  const migratedProducts = productsResult.data || [];
  if (migratedProducts.length === 0) {
    log("Không có sản phẩm migrate nào cần xoá.", "warn");
    return { success: true, deletedInventoryItems: 0, deletedProducts: 0, deletedCategories: 0, errors, items: [] };
  }

  log(`Tìm thấy ${migratedProducts.length} sản phẩm đã migrate.`, "success");

  // Step 2: Collect all SKUs
  const allSkus: string[] = [];
  for (const p of migratedProducts) {
    for (const v of p.variants) {
      if (v.sku) allSkus.push(v.sku);
    }
  }
  log(`Tìm thấy ${allSkus.length} SKU variants cần xử lý.`, "info");

  // Step 3: Get full inventory item info BEFORE deleting anything
  log("Đang thu thập chi tiết inventory items...", "info");
  const inventoryDetails: InventoryItemInfo[] = [];
  for (const sku of allSkus) {
    const invResult = await checkInventoryItemBySku(config, sku);
    if (invResult.success && invResult.data?.inventoryItem) {
      const item = invResult.data.inventoryItem;
      inventoryDetails.push({
        inventory_item_id: item.id,
        sku: item.sku,
        title: item.title,
        hasVariantLinks: item.hasVariantLinks,
        variantCount: item.variantCount,
        isOrphan: item.isOrphan,
        product_id: item.product?.id,
        product_title: item.product?.title,
      });
    }
  }

  // Step 4: Delete orphan inventory items first (not linked to any variant)
  const orphanSkus = inventoryDetails.filter((i) => i.isOrphan).map((i) => i.sku);
  if (orphanSkus.length > 0) {
    log(`Đang xoá ${orphanSkus.length} inventory items orphan...`, "warn");
    const delResult = await deleteInventoryItems(config, { skus: orphanSkus });
    if (delResult.success && delResult.data) {
      log(`Đã xoá ${delResult.data.deleted || 0} inventory items orphan.`, "success");
      allDeletedItems.push(...(delResult.data.items || []));
    } else {
      errors.push(`Lỗi xoá orphan inventory: ${delResult.error}`);
    }
  }

  // Step 5: Delete products (cascades variants, product_variant_inventory_item links)
  log(`Đang xoá ${migratedProducts.length} products...`, "warn");
  const productIds = migratedProducts.map((p) => p.id);
  const delProductsResult = await deleteProducts(config, productIds);
  const deletedProducts = delProductsResult.success ? (delProductsResult.data?.deleted || 0) : 0;
  if (delProductsResult.success) {
    log(`Đã xoá ${deletedProducts} products (variants và links cũng bị xoá).`, "success");
  } else {
    errors.push(`Lỗi xoá products: ${delProductsResult.error}`);
  }

  // Step 6: Delete orphan inventory items that are now orphaned after product deletion
  log("Kiểm tra inventory items orphan sau khi xoá products...", "info");
  const orphanAfterProducts = inventoryDetails.filter((i) => i.hasVariantLinks);
  const skusAfterProductDelete: string[] = [];
  for (const item of orphanAfterProducts) {
    // Re-check each item
    const recheck = await checkInventoryItemBySku(config, item.sku);
    if (recheck.success && recheck.data?.inventoryItem?.isOrphan) {
      skusAfterProductDelete.push(item.sku);
      allDeletedItems.push({
        ...item,
        isOrphan: true,
        hasVariantLinks: false,
      });
    }
  }

  if (skusAfterProductDelete.length > 0) {
    log(`Xoá ${skusAfterProductDelete.length} inventory items orphan còn lại...`, "warn");
    await deleteInventoryItems(config, { skus: skusAfterProductDelete });
  }

  // Step 7: Delete categories
  log("Đang xoá categories...", "info");
  const catsResult = await listAllCategories(config);
  let deletedCategories = 0;
  if (catsResult.success && catsResult.data && catsResult.data.length > 0) {
    const sortedCats = [...catsResult.data].reverse();
    const catIds = sortedCats.map((c) => c.id);
    const delCatsResult = await deleteCategories(config, catIds);
    deletedCategories = delCatsResult.success ? (delCatsResult.data?.deleted || 0) : 0;
    if (delCatsResult.success) {
      log(`Đã xoá ${deletedCategories} categories.`, "success");
    } else {
      errors.push(`Lỗi xoá categories: ${delCatsResult.error}`);
    }
  } else {
    log("Không có category nào để xoá.", "info");
  }

  // Step 8: Clear ID mapping
  clearIdMapping();

  log("Cleanup hoàn tất!", "success");

  return {
    success: errors.length === 0,
    deletedInventoryItems: allDeletedItems.length,
    deletedProducts,
    deletedCategories,
    errors,
    items: allDeletedItems,
  };
}

/**
 * Check if a product with given SKU already exists (via variant SKU).
 */
export async function findProductBySku(
  config: MedusaConfig,
  sku: string
): Promise<MedusaApiResponse<{ id: string; title: string } | null>> {
  if (!sku) {
    return { success: true, data: null };
  }

  // Chỉ tìm theo variant SKU (đáng tin cậy nhất)
  return findProductByVariantSku(config, sku);
}

// ============================================================
// URL NORMALIZATION HELPER
// ============================================================

/**
 * Ensure image URL is stored as relative path.
 * e.g. /wp-content/uploads/2023/12/image.jpg → /wp-content/uploads/2023/12/image.jpg
 * e.g. https://mytholaptop.vn/wp-content/uploads/... → /wp-content/uploads/...
 * e.g. https://mytholaptop.vn//wp-content/uploads/... → /wp-content/uploads/...
 *
 * Medusa v2: Store relative paths directly in database — do NOT convert to absolute URL.
 */
function resolveImageUrl(
  relativePath: string,
  medusaBackendUrl: string,
  adminUiBaseUrl?: string
): string {
  if (!relativePath) return relativePath;

  // Already absolute URL — extract relative path
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    // Extract /wp-content/uploads/... path from full URL
    const relativeMatch = relativePath.match(/\/wp-content\/uploads\/.+/);
    if (relativeMatch) {
      return relativeMatch[0];
    }
    // Fallback: extract pathname
    try {
      return new URL(relativePath).pathname;
    } catch {
      return relativePath;
    }
  }

  // Relative path starting with / — use as-is (this is what we want)
  if (relativePath.startsWith("/")) {
    // Fix double-slash case: ///wp-content/... → /wp-content/...
    const cleaned = relativePath.replace(/\/+/g, "/");
    return cleaned;
  }

  // Plain path without leading slash — add it
  return `/${relativePath}`;
}

/**
 * Resolve all relative image paths in a product update payload to absolute URLs.
 * Images stored in admin-ui public folder → use adminUiBaseUrl
 * Images stored in Medusa storage → use medusaBackendUrl
 */
function resolveProductImageUrls(
  payload: Partial<MedusaProduct>,
  medusaBackendUrl: string,
  adminUiBaseUrl?: string
): Partial<MedusaProduct> {
  const resolved = { ...payload };

  if (resolved.thumbnail) {
    resolved.thumbnail = resolveImageUrl(resolved.thumbnail, medusaBackendUrl, adminUiBaseUrl);
  }

  if (resolved.images && resolved.images.length > 0) {
    resolved.images = resolved.images.map((img) => ({
      url: resolveImageUrl(img.url, medusaBackendUrl, adminUiBaseUrl),
    }));
  }

  return resolved;
}

/**
 * Strip WooCommerce-specific fields from metadata that Medusa doesn't accept.
 * Medusa v2 API returns 400 for fields like 'short_description' in metadata.
 */
function stripWooCommerceFields(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const forbiddenKeys = ["short_description", "description", "post_content", "post_excerpt"];
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!forbiddenKeys.includes(key.toLowerCase())) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

/**
 * Convert a MedusaProduct (from transform.ts) to the exact format Medusa v2 Admin API expects.
 *
 * Key differences between MedusaProduct (transform) and API input:
 * - variant.prices (Array<{amount, currency_code}>) -> variant.prices (array of price objects)
 * - variant.options -> DO NOT send; Medusa auto-links via title matching
 * - product.options (Array<{title, values}>) -> unchanged ✓
 * - product.categories (Array<{id: string}>) -> unchanged ✓
 * - product.images (Array<{url: string}>) -> unchanged ✓
 */
function convertToApiInput(product: MedusaProduct): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { subtitle: _removed, short_description: _shortDesc, originalSku: _origSku, originalId: _origId, ...productRest } = product;
  // Preserve dimensions for API call (needed for length/width/height)
  const dims = product.dimensions;
  // Remove any WooCommerce-specific fields that Medusa doesn't accept
  const input: Record<string, unknown> = {
    title: productRest.title,
    description: productRest.description || undefined,
    handle: productRest.handle || undefined,
    status: productRest.status || "draft",
    // Only send thumbnail if it's a valid string
    thumbnail: typeof productRest.thumbnail === "string" ? productRest.thumbnail : undefined,
    weight: productRest.weight ?? undefined,
    // Handle null dimensions explicitly
    length: dims?.length ?? undefined,
    height: dims?.height ?? undefined,
    width: dims?.width ?? undefined,
    // Chỉ gửi tags nếu có id (Medusa yêu cầu id, không chấp nhận chỉ có value)
    tags: productRest.tags
      ? productRest.tags
          .map((tag) => (typeof tag === "string" ? { value: tag } : tag))
          .filter((tag): tag is { id: string; value: string } => "id" in tag && typeof tag.id === "string")
      : undefined,
    categories: productRest.categories?.length ? productRest.categories : undefined,
    images: productRest.images?.length ? productRest.images : undefined,
    options: productRest.options?.length ? productRest.options : undefined,
    // Strip WooCommerce-specific fields from metadata (short_description, woo_*, wordpress_*)
    metadata: stripWooCommerceFields(productRest.metadata || {}),
  };

  if (productRest.variants && productRest.variants.length > 0) {
    input.variants = productRest.variants.map((v) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { originalSku: _vOrigSku, originalId: _vOrigId, ...variantRest } = v;
      const variant: Record<string, unknown> = {
        title: variantRest.title || "Default Title",
        sku: variantRest.sku || undefined,
      };

      // Medusa v2: prices is REQUIRED for each variant — do NOT omit it
      if (variantRest.prices && variantRest.prices.length > 0) {
        variant.prices = variantRest.prices.map((p) => ({
          amount: p.amount,
          currency_code: p.currency_code || "vnd",
        }));
      } else {
        // Skip variants without prices — don't send empty array
        // This prevents Medusa from creating invalid variants
        delete variant.prices;
      }

      // Medusa v2: variant-level options should NOT be sent.
      // Medusa auto-links variants to options via title matching.
      // Only prices, title, sku, etc. are needed per variant.
      // NOTE: inventory_quantity, manage_inventory, allow_backorder are NOT accepted
      // in Medusa v2 product variant payload. Inventory is managed via Inventory Module separately.
      // These fields cause "Unrecognized fields" 400 errors.
      // However, variant-level metadata IS accepted by Medusa v2.
      if (variantRest.weight !== undefined) {
        variant.weight = variantRest.weight;
      }

      // Forward variant-level metadata (e.g., WooCommerce price/stock debug info)
      if (variantRest.metadata && Object.keys(variantRest.metadata).length > 0) {
        variant.metadata = stripWooCommerceFields(variantRest.metadata);
      }

      return variant;
    });
  }

  return input;
}

/**
 * Batch create products with variants.
 * Medusa v2 Admin API: POST /admin/products — body is the product object directly.
 * Automatic retry with 1-by-1 fallback on batch failure.
 */
export type BatchCreateLogCallback = (message: string) => void;

export interface BatchCreateProductsOptions {
  onLog?: BatchCreateLogCallback;
  onProgress?: (current: number, total: number, status: "success" | "fail" | "skip", productTitle?: string, error?: string) => void;
}

export interface BatchCreateProductsResult extends MedusaBatchResponse {
  ids: string[];
  wooIdToMedusaId?: Record<number, string>; // wooId → medusaId mapping
}

export async function batchCreateProducts(
  config: MedusaConfig,
  products: MedusaProduct[],
  wooIds?: number[],
  options?: BatchCreateProductsOptions
): Promise<MedusaApiResponse<BatchCreateProductsResult>> {
  const ids: string[] = [];
  const wooIdToMedusaId: Record<number, string> = {};
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ index: number; message: string; httpStatus?: number; code?: string; wooId?: number; productTitle?: string; sku?: string }> = [];
  const failedProducts: Array<{ wooId: number; title: string; sku: string; error: string }> = [];
  
  // Progress tracking
  const progress = {
    failCount: 0,
  };

  function log(message: string) {
    if (typeof window !== "undefined") {
      console.debug(`[batchCreateProducts] ${message}`);
    }
    options?.onLog?.(message);
  }

  if (typeof window !== "undefined") {
    console.debug("[batchCreateProducts] Starting with", products.length, "products");
  }

  // Only log first and last product to reduce console spam
  const firstProduct = products[0];
  const lastProduct = products[products.length - 1];
  if (typeof window !== "undefined") {
    console.debug(`[batchCreateProducts] Creating ${products.length} products: "${firstProduct?.title}" ... "${lastProduct?.title}"`);
  }

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const wooId = wooIds?.[i];

    const productIdentifier = product.originalSku || product.originalId ? ` (SKU: ${product.originalSku || product.originalId})` : "";
    const wooIdStr = wooId ? ` [WooCommerce ID: ${wooId}]` : "";

    // Convert to API input format
    const apiInput = convertToApiInput(product);

    // Try up to 3 times with exponential backoff
    let result: MedusaApiResponse<{ product: { id: string } } | { code: string; message: string; type?: string }> = { success: false };
    let attempt = 0;
    const maxAttempts = 3;

    for (attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 500;
        await new Promise((r) => setTimeout(r, delay));
      }

      result = await medusaRequest<{ product: { id: string } } | { code: string; message: string; type?: string }>(
        "/admin/products",
        config,
        {
          method: "POST",
          body: JSON.stringify(apiInput),
        }
      );

      if (result.success && result.data && "product" in result.data) {
        break;
      }

      // Log lỗi chi tiết từ Medusa
      if (typeof window !== "undefined") {
        console.error("[batchCreateProducts] Lỗi Medusa:", result.error, "| Data:", JSON.stringify(result.data)?.slice(0, 500));
      }

      // Non-retryable errors
      const dataObj = (result.data && typeof result.data === "object") ? result.data as Record<string, unknown> : {};
      const errorMsg = typeof dataObj.message === "string" ? dataObj.message : "";
      const errorCode = typeof dataObj.code === "string" ? dataObj.code : "";
      if (
        errorCode === "INVALID_DATA" ||
        errorCode === "VALIDATION_ERROR" ||
        (result.data && !result.success)
      ) {
        break;
      }
    }

    if (result.success && result.data && "product" in result.data) {
      const medusaId = result.data.product.id;
      ids.push(medusaId);
      if (wooId) {
        wooIdToMedusaId[wooId] = medusaId;
      }
      created++;
      options?.onProgress?.(i + 1, products.length, "success", product.title);
      if (typeof window !== "undefined") {
        console.debug("[batchCreateProducts] Success:", result.data.product.id, `(${attempt + 1} attempt${attempt > 0 ? "s" : ""})`);
      }
    } else {
      if (typeof window !== "undefined") {
        console.debug("[batchCreateProducts] Failed:", product.title, "| Error:", result.error, "| Data:", JSON.stringify(result.data)?.slice(0, 500));
        // Log the full API input for debugging
        console.debug("[batchCreateProducts] API Input for failed product:", JSON.stringify(apiInput, null, 2)?.slice(0, 500));
      }

      let errorMsg = "Unknown error";
      let httpStatus: number | undefined;
      let errorCode: string | undefined;
      let isInventoryConflict = false;
      let isHandleConflict = false;

      if (result.data && typeof result.data === "object") {
        const dataObj = result.data as Record<string, unknown>;
        // Check for nested error object
        if (dataObj.error && typeof dataObj.error === "object") {
          const errObj = dataObj.error as Record<string, unknown>;
          errorMsg = String(errObj.message || errObj.code || JSON.stringify(errObj));
        } else if (typeof dataObj.message === "string") {
          errorMsg = dataObj.message;
        } else if (typeof dataObj.error === "string") {
          errorMsg = dataObj.error;
        } else if (typeof dataObj.code === "string") {
          errorCode = dataObj.code;
          errorMsg = `[${errorCode}] ${dataObj.error || dataObj.message || "Unknown"}`;
        }
        // Check for Medusa v2 error format: { type: string, message: string }
        if (dataObj.type && typeof dataObj.type === "string" && dataObj.message) {
          errorCode = dataObj.type;
          errorMsg = dataObj.message as string;
        }
        // Phát hiện lỗi "Inventory item already exists"
        if (errorMsg.includes("Inventory item with sku") && errorMsg.includes("already exists")) {
          isInventoryConflict = true;
        }
        // Phát hiện lỗi "Product with handle ... already exists"
        if (errorMsg.includes("Product with handle") && errorMsg.includes("already exists")) {
          isHandleConflict = true;
        }
      } else if (result.error) {
        errorMsg = result.error;
        const httpMatch = result.error.match(/HTTP (\d+)/);
        if (httpMatch) {
          httpStatus = parseInt(httpMatch[1], 10);
        }
        if (errorMsg.includes("Inventory item with sku") && errorMsg.includes("already exists")) {
          isInventoryConflict = true;
        }
        if (errorMsg.includes("Product with handle") && errorMsg.includes("already exists")) {
          isHandleConflict = true;
        }
      }

      // HANDLE conflict — sản phẩm đã tồn tại theo handle trong Medusa
      // Thường xảy ra khi xoá product nhưng handle chưa được giải phóng
      if (isHandleConflict) {
        const handle = String(apiInput.handle || product.handle || "");
        if (handle) {
          if (typeof window !== "undefined") {
            console.debug(`[batchCreateProducts] HANDLE_CONFLICT for handle: "${handle}". Searching existing product...`);
          }
          
          // Tìm product theo handle
          const searchResult = await medusaRequest<{ products: Array<{ id: string; handle: string }>; count: number }>(
            `/admin/products?handle=${encodeURIComponent(handle)}&limit=1`,
            config
          );
          
          if (searchResult.success && searchResult.data?.products && searchResult.data.products.length > 0) {
            const existingId = searchResult.data.products[0].id;
            if (typeof window !== "undefined") {
              console.debug(`[batchCreateProducts] Found existing product with handle "${handle}": ${existingId}`);
            }
            log(`Sản phẩm "${product.title}" đã tồn tại (handle="${handle}", id=${existingId}). Mapping và skip.`);
            ids.push(existingId);
            if (wooId) {
              wooIdToMedusaId[wooId] = existingId;
            }
            skipped++;
            options?.onProgress?.(i + 1, products.length, "skip", product.title);
            failedProducts.push({
              wooId: wooId || 0,
              title: product.title,
              sku: product.originalSku || product.variants?.[0]?.originalSku || "",
              error: `HANDLE_CONFLICT: handle="${handle}" đã tồn tại trong product ${existingId}`,
            });
            continue;
          } else {
            if (typeof window !== "undefined") {
              console.debug(`[batchCreateProducts] Handle conflict but product not found by handle "${handle}". Checking by query...`);
            }
            // Thử tìm bằng title query
            const titleQuery = encodeURIComponent(product.title || "");
            const altResult = await medusaRequest<{ products: Array<{ id: string; title: string }>; count: number }>(
              `/admin/products?q=${titleQuery}&limit=1`,
              config
            );
            if (altResult.success && altResult.data?.products && altResult.data.products.length > 0) {
              const existingId = altResult.data.products[0].id;
              if (typeof window !== "undefined") {
                console.debug(`[batchCreateProducts] Found by title "${product.title}": ${existingId}`);
              }
              log(`Sản phẩm "${product.title}" đã tồn tại (id=${existingId}). Mapping và skip.`);
              ids.push(existingId);
              if (wooId) {
                wooIdToMedusaId[wooId] = existingId;
              }
              skipped++;
              options?.onProgress?.(i + 1, products.length, "skip", product.title);
              failedProducts.push({
                wooId: wooId || 0,
                title: product.title,
                sku: product.originalSku || product.variants?.[0]?.originalSku || "",
                error: `HANDLE_CONFLICT_RESOLVED: đã tìm thấy bằng title query, product ${existingId}`,
              });
              continue;
            }
          }
          log(`Handle conflict cho "${product.title}" nhưng không tìm thấy product. Bỏ qua.`);
        }
        skipped++;
        options?.onProgress?.(i + 1, products.length, "skip", product.title);
        failedProducts.push({
          wooId: wooId || 0,
          title: product.title,
          sku: product.originalSku || product.variants?.[0]?.originalSku || "",
          error: `HANDLE_CONFLICT_UNRESOLVED: ${errorMsg}`,
        });
        continue;
      }

      // SKU conflict — check if inventory_item exists but product is missing (orphan scenario)
      if (isInventoryConflict && (product.originalSku || product.variants?.[0]?.originalSku)) {
        const sku = product.originalSku || product.variants?.[0]?.originalSku || "";
        
        if (typeof window !== "undefined") {
          console.debug(`[batchCreateProducts] INVENTORY_CONFLICT for SKU: ${sku}`);
        }

        // Check inventory_item table directly
        const invCheck = await checkInventoryItemBySku(config, sku);
        
        if (invCheck.success && invCheck.data?.inventoryItem) {
          const invItem = invCheck.data.inventoryItem;
          
          if (typeof window !== "undefined") {
            console.debug(`[batchCreateProducts] Inventory item found:`, {
              id: invItem.id,
              sku: invItem.sku,
              title: invItem.title,
              isOrphan: invItem.isOrphan,
              hasVariantLinks: invItem.hasVariantLinks,
              variantCount: invItem.variantCount,
              product: invItem.product,
            });
          }

          if (invItem.isOrphan) {
            // ORPHAN INVENTORY: inventory_item exists but no variant points to it
            log(
              `SKU "${sku}" có inventory_item orphan (id=${invItem.id}). ` +
              `Không tìm thấy product nào. Đang xoá inventory orphan và tạo lại...`
            );

            // Delete the orphan inventory item
            const delInv = await deleteInventoryItems(config, { skus: [sku] });
            if (delInv.success) {
              log(
                `Đã xoá orphan inventory item "${sku}" (${delInv.data?.deleted || 0} item). Tiếp tục create...`
              );
            } else {
              log(
                `Không thể xoá orphan inventory "${sku}": ${delInv.error}. Bỏ qua sản phẩm này.`
              );
              failed++;
              progress.failCount++;
              failedProducts.push({
                wooId: wooId || 0,
                title: product.title,
                sku,
                error: `ORPHAN_INVENTORY_SKU: ${sku} (${invItem.id})`,
              });
              continue;
            }
          } else if (invItem.hasVariantLinks && invItem.product) {
            // Linked inventory: product exists but with different ID, update it
            log(
              `SKU "${sku}" đã tồn tại trong product "${invItem.product.title}" (id=${invItem.product.id}). ` +
              `Bỏ qua (strategy=skip).`
            );
            skipped++;
            progress.failCount++;
            options?.onProgress?.(i + 1, products.length, "skip", product.title);
            failedProducts.push({
              wooId: wooId || 0,
              title: product.title,
              sku,
              error: `DUPLICATE_SKU: SKU=${sku} thuộc product "${invItem.product.title}" (${invItem.product.id})`,
            });
            continue;
          } else {
            // Has variant links but no product found — treat as orphan
            log(
              `SKU "${sku}" có variant links nhưng không tìm thấy product. Xoá orphan...`
            );
            await deleteInventoryItems(config, { skus: [sku] });
          }
        } else {
          // Inventory item not found in inventory table — log as unexpected
          if (typeof window !== "undefined") {
            console.debug(`[batchCreateProducts] Unexpected: inventory conflict for "${sku}" but inventory_item NOT found in table`);
            console.warn(`[batchCreateProducts] SKU="${sku}" caused conflict but not found in inventory_item table. Skipping.`);
          }
          skipped++;
          progress.failCount++;
          options?.onProgress?.(i + 1, products.length, "skip", product.title);
          failedProducts.push({
            wooId: wooId || 0,
            title: product.title,
            sku,
            error: `INVENTORY_CONFLICT_UNRESOLVED: ${sku}`,
          });
          continue;
        }
      }

      const medusaCodeMatch = errorMsg.match(/\[([A-Z_]+)\]/);
      if (medusaCodeMatch && !errorCode) {
        errorCode = medusaCodeMatch[1];
      }

      const httpStatusStr = httpStatus ? ` (HTTP ${httpStatus})` : "";
      const errorCodeStr = errorCode ? ` [${errorCode}]` : "";

      errors.push({
        index: i,
        message: `[${product.title || "Unnamed"}]${productIdentifier}${wooIdStr}${errorCodeStr}${httpStatusStr} — ${errorMsg}`,
        productTitle: product.title,
        httpStatus,
        code: errorCode,
        wooId,
      });
      
      options?.onProgress?.(i + 1, products.length, "fail", product.title, errorMsg);
    }
  }

  if (typeof window !== "undefined") {
    console.debug("[batchCreateProducts] Done. Created:", created, "Failed:", errors.length);
  }

  // Success = true nếu có ít nhất 1 sản phẩm được tạo thành công
  // Điều này cho phép migration tiếp tục ngay cả khi một số sản phẩm lỗi
  return {
    success: created > 0 || ids.length > 0,
    data: { created, updated: 0, failed: errors.length, skipped, errors, ids, wooIdToMedusaId },
  };
}

/**
 * Upload image to Medusa media library.
 */
export async function uploadImage(
  config: MedusaConfig,
  imageUrl: string
): Promise<MedusaApiResponse<{ id: string; url: string }>> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const formData = new FormData();
    // Infer extension from content-type header
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const ext = mimeTypeToExt(contentType);
    formData.append("file", blob, `image.${ext}`);

    const baseUrl = config.backendUrl.replace(/\/$/, "");
    const uploadResponse = await fetch(`${baseUrl}/admin/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.adminApiKey}`,
      },
      body: formData,
    });

    const data = await uploadResponse.json();

    if (uploadResponse.ok && data.uploads?.[0]) {
      return {
        success: true,
        data: { id: data.uploads[0].id, url: data.uploads[0].url },
      };
    }

    return { success: false, error: data.message || "Upload failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Upload error: ${message}` };
  }
}

/**
 * Assign categories to a product via Medusa product-category endpoint.
 */
export async function assignProductCategories(
  config: MedusaConfig,
  productId: string,
  categoryIds: string[]
): Promise<MedusaApiResponse<{ id: string; categories?: Array<{ id: string }> }>> {
  if (categoryIds.length === 0) {
    return { success: true, data: { id: productId, categories: [] } };
  }

  if (typeof window !== "undefined") {
    console.debug("[assignProductCategories]", "Product:", productId, "Categories:", categoryIds);
  }

  // Note: Medusa v2 doesn't support POST /admin/products/{id}/categories
  // This function is kept for reference but will fail with MEDUSA_1100
  // Categories should be assigned via the product create/update payload instead
  const result = await medusaRequest<{ product?: { id: string; categories?: Array<{ id: string }> }; product_category?: Array<{ id: string }> }>(
    `/admin/products/${productId}/categories`,
    config,
    {
      method: "POST",
      body: JSON.stringify({
        categories: categoryIds.map((id) => ({ id })),
      }),
    }
  );

  if (typeof window !== "undefined") {
    console.debug("[assignProductCategories]", "Result:", result.success, result.data, result.error);
  }

  if (result.success && result.data && result.data.product) {
    return { success: true, data: { id: result.data.product.id, categories: result.data.product.categories } };
  }

  return { success: false, error: result.error };
}

/**
 * Batch assign categories to multiple products.
 */
export async function batchAssignProductCategories(
  config: MedusaConfig,
  productCategoryMap: Array<{ productId: string; categoryIds: string[] }>,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: boolean; assigned: number; failed: number }> {
  let assigned = 0;
  let failed = 0;

  for (let i = 0; i < productCategoryMap.length; i++) {
    const { productId, categoryIds } = productCategoryMap[i];

    const result = await assignProductCategories(config, productId, categoryIds);
    if (result.success) {
      assigned++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(i + 1, productCategoryMap.length);
    }
  }

  return { success: failed === 0, assigned, failed };
}

// ============================================================
// ROLLBACK OPERATIONS
// ============================================================

/**
 * Delete migrated products by their Medusa IDs.
 * Uses concurrent processing for speed.
 */
export async function deleteProducts(
  config: MedusaConfig,
  productIds: string[]
): Promise<MedusaApiResponse<{ deleted: number }>> {
  if (productIds.length === 0) {
    return { success: true, data: { deleted: 0 } };
  }

  const CONCURRENCY = 10;
  let deleted = 0;
  const errors: string[] = [];

  // Process in batches with concurrency
  const batches: string[][] = [];
  for (let i = 0; i < productIds.length; i += CONCURRENCY) {
    batches.push(productIds.slice(i, i + CONCURRENCY));
  }

  for (const batch of batches) {
    const promises = batch.map(async (id) => {
      const result = await medusaRequest(
        `/admin/products/${id}`,
        config,
        { method: "DELETE" }
      );
      if (result.success) {
        deleted++;
      } else {
        errors.push(result.error || "Delete failed");
      }
      return result.success;
    });
    await Promise.all(promises);
  }

  if (typeof window !== "undefined") {
    console.debug(`[deleteProducts] Deleted: ${deleted}/${productIds.length}`);
  }

  return {
    success: errors.length === 0,
    data: { deleted },
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

/**
 * Delete ALL categories in Medusa with MAXIMUM PARALLEL processing.
 * Deletes all categories at once regardless of hierarchy.
 */
export async function deleteAllCategories(
  config: MedusaConfig,
  onProgress?: (deleted: number, total: number) => void
): Promise<MedusaApiResponse<{ deleted: number }>> {
  // Get all categories first
  const allCats = await listAllCategories(config, 1000);
  if (!allCats.success || !allCats.data || allCats.data.length === 0) {
    return { success: true, data: { deleted: 0 } };
  }

  const categoryIds = allCats.data.map((c) => c.id);
  const total = categoryIds.length;
  let deleted = 0;
  const errors: string[] = [];

  // Delete ALL categories in parallel - maximum speed!
  await Promise.all(
    categoryIds.map(async (id) => {
      const result = await medusaRequest(
        `/admin/product-categories/${id}`,
        config,
        { method: "DELETE" }
      );
      if (result.success) {
        deleted++;
        onProgress?.(deleted, total);
      } else {
        errors.push(result.error || "Delete failed");
      }
    })
  );

  if (typeof window !== "undefined") {
    console.debug(`[deleteAllCategories] Deleted: ${deleted}/${categoryIds.length}`);
  }

  return {
    success: errors.length === 0,
    data: { deleted },
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

/**
 * Delete ALL products in Medusa with MAXIMUM PARALLEL processing.
 */
export async function deleteAllProducts(
  config: MedusaConfig,
  onProgress?: (deleted: number, total: number, lastId?: string) => void
): Promise<MedusaApiResponse<{ deleted: number }>> {
  // Get all products first
  const allProds = await listAllProducts(config, 1000);
  if (!allProds.success || !allProds.data || allProds.data.length === 0) {
    return { success: true, data: { deleted: 0 } };
  }

  const productIds = allProds.data.map((p) => p.id);
  const total = productIds.length;
  let deleted = 0;
  const errors: string[] = [];
  const progressLock = { count: 0 };

  // Delete ALL products in parallel - maximum speed!
  // Report progress after each deletion
  await Promise.all(
    productIds.map(
      async (id): Promise<void> => {
        const result = await medusaRequest(
          `/admin/products/${id}`,
          config,
          { method: "DELETE" }
        );
        const idx = progressLock.count++;
        if (result.success) {
          deleted++;
          onProgress?.(deleted, total, id);
        } else {
          errors.push(result.error || "Delete failed");
        }
      }
    )
  );

  if (typeof window !== "undefined") {
    console.debug(`[deleteAllProducts] Deleted: ${deleted}/${productIds.length}`);
  }

  return {
    success: errors.length === 0,
    data: { deleted },
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

/**
 * Delete categories by IDs (with concurrent processing).
 */
export async function deleteCategories(
  config: MedusaConfig,
  categoryIds: string[]
): Promise<MedusaApiResponse<{ deleted: number }>> {
  if (categoryIds.length === 0) {
    return { success: true, data: { deleted: 0 } };
  }

  let deleted = 0;
  const errors: string[] = [];

  // Delete all in parallel
  await Promise.all(
    categoryIds.map(async (id) => {
      const result = await medusaRequest(
        `/admin/product-categories/${id}`,
        config,
        { method: "DELETE" }
      );
      if (result.success) {
        deleted++;
      } else {
        errors.push(result.error || "Delete failed");
      }
    })
  );

  return {
    success: errors.length === 0,
    data: { deleted },
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

// ============================================================
// ID MAPPING
// ============================================================

/**
 * Save ID mapping (WordPress ID → Medusa ID) for future reference.
 */
export function saveIdMapping(mapping: IdMapping): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("mtl_migration_mapping", JSON.stringify(mapping));
  }
}

/**
 * Load saved ID mapping.
 */
export function loadIdMapping(): IdMapping | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("mtl_migration_mapping");
    if (saved) {
      try {
        return JSON.parse(saved) as IdMapping;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Clear saved ID mapping.
 */
export function clearIdMapping(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mtl_migration_mapping");
  }
}

// ============================================================
// MIGRATION HISTORY (Logs + Stats)
// ============================================================

export interface MigrationHistoryData {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: "in_progress" | "completed" | "failed" | "stopped";
  stats: {
    totalCategories: number;
    migratedCategories: number;
    totalProducts: number;
    migratedProducts: number;
    failedProducts: number;
    skippedProducts: number;
    totalVariants: number;
    migratedVariants: number;
  };
  logs: Array<{
    id: string;
    step: string;
    action: string;
    status: "info" | "success" | "warning" | "error";
    message: string;
    timestamp: string;
  }>;
  progress: {
    phase: string;
    totalItems: number;
    processedItems: number;
    successCount: number;
    failCount: number;
  };
}

/**
 * Save migration history (logs + stats) to localStorage.
 */
export function saveMigrationHistory(history: MigrationHistoryData): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("mtl_migration_history", JSON.stringify(history));
  }
}

/**
 * Load saved migration history.
 */
export function loadMigrationHistory(): MigrationHistoryData | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("mtl_migration_history");
    if (saved) {
      try {
        return JSON.parse(saved) as MigrationHistoryData;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Clear migration history.
 */
export function clearMigrationHistory(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mtl_migration_history");
  }
}

/**
 * Update only the logs in existing migration history, preserving all other data.
 */
export function updateMigrationHistoryLogs(
  logs: Array<{
    id: string;
    step: string;
    action: string;
    status: "info" | "success" | "warning" | "error";
    message: string;
    timestamp: string;
  }>
): void {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("mtl_migration_history");
    if (saved) {
      try {
        const history = JSON.parse(saved) as MigrationHistoryData;
        history.logs = logs;
        localStorage.setItem("mtl_migration_history", JSON.stringify(history));
      } catch {
        // ignore parse errors
      }
    }
  }
}
