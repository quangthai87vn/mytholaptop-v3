/**
 * Transform utilities for WooCommerce → Medusa migration.
 *
 * IMPORTANT: This module handles:
 * 1. Image URL transformation
 * 2. HTML description cleanup (fix WordPress domain links)
 * 3. Product data transformation
 * 4. Category data transformation
 */

import type {
  WooProduct,
  WooCategory,
  MedusaProduct,
  MedusaCategory,
  MedusaVariant,
  MedusaOption,
  TransformResult,
  TransformError,
  TransformWarning,
  ImageTransformResult,
} from "@/types";

// ============================================================
// IMAGE UTILITIES (REQUIRED BY TASK)
// ============================================================

/**
 * Normalize an image URL from WooCommerce.
 * Handles relative URLs, absolute URLs, and different WordPress domain formats.
 */
export function normalizeImageUrl(src: string, wordpressBaseUrl: string): string {
  if (!src) return "";

  // Already absolute and valid
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Protocol-relative URL
  if (src.startsWith("//")) {
    return "https:" + src;
  }

  // Relative URL — prepend WordPress base URL
  const base = wordpressBaseUrl.replace(/\/$/, "");
  if (src.startsWith("/")) {
    return base + src;
  }
  return `${base}/${src}`;
}

/**
 * Extract all image URLs from HTML content (description, short_description).
 * Handles <img> tags with src, srcset, data-src, and background-image in style.
 */
export function extractImageUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();

  // <img src="..." /> and <img data-src="..." />
  const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) urls.add(match[1]);
  }

  // style="background-image: url('...')" or style="background-image:url(...)"
  const bgRegex = /background-image\s*:\s*url\s*\(\s*['"]?([^'"()]+)['"]?\s*\)/gi;
  while ((match = bgRegex.exec(html)) !== null) {
    if (match[1]) urls.add(match[1]);
  }

  return Array.from(urls);
}

/**
 * Transform image URLs in HTML description to use new domain.
 * Replaces WordPress domain with configured target domain.
 */
export function transformDescriptionImages(
  html: string,
  wordpressBaseUrl: string,
  targetDomain: string = ""
): string {
  if (!html) return "";

  const srcBase = wordpressBaseUrl.replace(/\/$/, "");
  const tgtBase = targetDomain.replace(/\/$/, "");

  let result = html;

  // Replace absolute WordPress URLs in src attributes
  if (srcBase) {
    result = result.replace(
      new RegExp(escapeRegExp(srcBase), "gi"),
      tgtBase || srcBase
    );
  }

  // Fix relative URLs to absolute
  result = result.replace(
    /src=["'](?!\s*https?:\/\/)([^"']+)["']/gi,
    `src="${srcBase}$1"`
  );

  // Fix data-src (lazy loading)
  result = result.replace(
    /data-src=["'](?!\s*https?:\/\/)([^"']+)["']/gi,
    `data-src="${srcBase}$1"`
  );

  return result;
}

/**
 * Deduplicate images by URL, preserving order.
 * Keeps the first occurrence of each unique URL.
 */
export function dedupeImages(
  images: Array<{ url: string; [key: string]: unknown }>
): Array<{ url: string; [key: string]: unknown }> {
  const seen = new Set<string>();
  return images.filter((img) => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
}

// ============================================================
// IMAGE TRANSFORMATION
// ============================================================

export interface ImageTransformConfig {
  sourceDomain: string;
  targetDomain?: string;
  uploadToMedusa?: boolean;
  mediaLibrary?: string; // Cloudflare R2, S3, etc.
}

const DEFAULT_IMAGE_CONFIG: ImageTransformConfig = {
  sourceDomain: "",
  uploadToMedusa: false,
};

/**
 * Transform a single image URL from WordPress domain.
 * - If preserveImages=true: keep original URL
 * - If uploadToMedusa=true: mark for upload (returns upload task)
 * - If domain changed: replace domain in URL
 */
export function transformImageUrl(
  imageUrl: string,
  config: ImageTransformConfig = DEFAULT_IMAGE_CONFIG
): ImageTransformResult {
  if (!imageUrl) {
    return {
      originalUrl: imageUrl,
      transformedUrl: imageUrl,
      status: "failed",
      error: "Empty image URL",
    };
  }

  // Keep original URL — simplest option for migration
  if (!config.uploadToMedusa) {
    return {
      originalUrl: imageUrl,
      transformedUrl: imageUrl,
      status: "kept",
    };
  }

  // Transform domain if targetDomain is set
  if (config.targetDomain && config.sourceDomain) {
    const transformed = imageUrl.replace(
      config.sourceDomain,
      config.targetDomain
    );
    return {
      originalUrl: imageUrl,
      transformedUrl: transformed,
      status: "kept",
    };
  }

  // Mark for upload to Medusa's media library
  return {
    originalUrl: imageUrl,
    transformedUrl: imageUrl,
    status: "uploaded",
  };
}

/**
 * Transform all images in a WooCommerce product.
 * Returns main image + gallery separately.
 *
 * Medusa v2 Admin API expects: Array<{ url: string }> — NO metadata.
 */
export function transformProductImages(
  images: Array<{ id: number; src: string; name: string; alt: string }>,
  config: ImageTransformConfig = DEFAULT_IMAGE_CONFIG
): {
  thumbnail: string | undefined;
  images: Array<{ url: string }>;
} {
  if (images.length === 0) {
    return { thumbnail: undefined, images: [] };
  }

  // Normalize URLs and deduplicate
  const normalized = images.map((img) => ({
    ...img,
    src: normalizeImageUrl(img.src, config.sourceDomain || ""),
  }));

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = normalized.filter((img) => {
    if (seen.has(img.src)) return false;
    seen.add(img.src);
    return true;
  });

  // Medusa v2 Admin API: ONLY { url: string } — no metadata
  const transformedImages = unique.map((img) => ({
    url: img.src,
  }));

  return {
    thumbnail: transformedImages[0]?.url,
    images: transformedImages,
  };
}

// ============================================================
// DESCRIPTION TRANSFORMATION
// ============================================================

export interface DescriptionTransformConfig {
  sourceDomain: string;
  targetDomain?: string;
  stripInlineStyles?: boolean;
  removeGutenbergBlocks?: boolean;
}

/**
 * Transform HTML description from WooCommerce to Medusa.
 * - Replaces WordPress domain URLs if needed
 * - Cleans up Gutenberg block comments
 * - Handles relative image URLs
 */
export function transformDescription(
  html: string,
  config: DescriptionTransformConfig
): string {
  if (!html) return "";

  let result = html;

  // Replace WordPress domain in image src and href attributes
  if (config.sourceDomain && config.targetDomain) {
    result = result.replace(
      new RegExp(escapeRegExp(config.sourceDomain), "g"),
      config.targetDomain
    );
  }

  // Convert relative URLs to absolute if targetDomain is set
  if (config.targetDomain) {
    result = result.replace(
      /src=["'](?!\s*https?:\/\/)([^"']+)["']/gi,
      `src="${config.targetDomain}$1"`
    );
    result = result.replace(
      /href=["'](?!\s*https?:\/\/)([^"']+)["']/gi,
      `href="${config.targetDomain}$1"`
    );
  }

  // Remove Gutenberg block comments
  if (config.removeGutenbergBlocks) {
    result = result.replace(/<!-- wp:[\s\S]*?-->/g, "");
  }

  // Remove inline styles for cleaner HTML
  if (config.stripInlineStyles) {
    result = result.replace(/\s*style=["'][^"']*["']/gi, "");
  }

  return result;
}

/**
 * Extract image URLs from HTML content.
 */
export function extractImagesFromHtml(html: string): string[] {
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;
  while ((match = imageRegex.exec(html)) !== null) {
    images.push(match[1]);
  }
  return images;
}

/**
 * Transform short description (typically plain text or minimal HTML).
 */
export function transformShortDescription(text: string): string {
  if (!text) return "";

  // Strip HTML tags for short description if too long
  if (text.length > 500) {
    const stripped = text.replace(/<[^>]+>/g, "").trim();
    return stripped.slice(0, 500) + (stripped.length > 500 ? "..." : "");
  }

  return text;
}

// ============================================================
// METADATA BUILDER
// ============================================================

/**
 * Build comprehensive WooCommerce metadata for a Medusa product.
 * This metadata is stored on the Medusa product and used by admin-ui as fallback
 * when Medusa's native price/inventory fields are not available.
 */
function buildProductMetadata(
  wooProduct: WooProduct,
  priceSource: string | null,
  wooCategoryIds: number[]
): Record<string, string> {
  // Build comprehensive metadata: WooCommerce category IDs + names for UI fallback
  // Even when Medusa categories aren't assigned, these fields let the Products page
  // display category info and enable client-side filtering via wordpress_category_ids metadata
  const categoryIdsStr = wooCategoryIds.map((id) => String(id)).join(",");
  const categoryNamesStr = wooProduct.categories?.map((c) => c.name || String(c.id)).join(",") || "";

  return {
    // Price fields
    wordpress_price: wooProduct.price || "",
    wordpress_regular_price: wooProduct.regular_price || "",
    wordpress_sale_price: wooProduct.sale_price || "",
    wordpress_price_source: priceSource || "none",
    wordpress_currency: "VND",
    // Inventory fields
    wordpress_manage_stock: String(wooProduct.manage_stock ?? false),
    wordpress_stock_status: wooProduct.stock_status || "instock",
    wordpress_stock_quantity: wooProduct.stock_quantity !== null && wooProduct.stock_quantity !== undefined
      ? String(wooProduct.stock_quantity)
      : "",
    // Category — store IDs and names so Products page can display + filter by category
    // Even if Medusa category assignment fails, these fields provide category visibility
    wordpress_category_ids: categoryIdsStr,
    wordpress_category_names: categoryNamesStr,
    wordpress_category_count: String(wooCategoryIds.length),
  };
}

// ============================================================
// PRODUCT TRANSFORMATION
// ============================================================

export interface ProductTransformConfig {
  imageConfig: ImageTransformConfig;
  descriptionConfig: DescriptionTransformConfig;
  defaultCurrency?: string;
  defaultStatus?: "draft" | "published";
}

/**
 * Transform a WooCommerce product to Medusa format.
 * Returns success/error/warning for each field.
 */
export function transformProduct(
  wooProduct: WooProduct,
  config: ProductTransformConfig
): TransformResult<MedusaProduct> {
  const errors: TransformError[] = [];
  const warnings: TransformWarning[] = [];

  // Validation errors
  if (!wooProduct.name) {
    errors.push({ field: "name", message: "Product name is required", productId: wooProduct.id });
  }
  if (!wooProduct.sku && !wooProduct.id) {
    errors.push({ field: "sku", message: "Product SKU or ID is required", productId: wooProduct.id });
  }

  // Warnings
  if (!wooProduct.images || wooProduct.images.length === 0) {
    warnings.push({ field: "images", message: "Sản phẩm không có hình ảnh", productId: wooProduct.id });
  }
  if (!wooProduct.description && !wooProduct.short_description) {
    warnings.push({ field: "description", message: "Sản phẩm không có mô tả", productId: wooProduct.id });
  }

  // Transform images
  const { images } = transformProductImages(
    wooProduct.images || [],
    config.imageConfig
  );

  // Transform descriptions
  const rawDescription = wooProduct.description || wooProduct.short_description || "";
  const description = rawDescription
    ? transformDescription(rawDescription, config.descriptionConfig)
    : `<p>San pham ${wooProduct.name || wooProduct.id}</p>`;
  const shortDescription = transformShortDescription(
    wooProduct.short_description || ""
  );
  // Use short_description as subtitle only if not empty
  const subtitle = shortDescription || undefined;

  // Build handle from name (slug) — always go through slugify to sanitize special characters
  const handle = slugify(wooProduct.slug || wooProduct.name || "product");

  // Store WooCommerce category IDs for later category assignment
  const wooCategoryIds = wooProduct.categories?.map((c) => c.id) || [];

  // PRICE: Compute source for metadata (used by both variable and simple products)
  const wooSalePrice = parseFloat(wooProduct.sale_price || "0");
  const wooRegularPrice = parseFloat(wooProduct.regular_price || "0");
  const wooActivePrice = parseFloat(wooProduct.price || "0");
  const priceSource = wooSalePrice > 0 ? "sale_price" : wooRegularPrice > 0 ? "regular_price" : wooActivePrice > 0 ? "price" : null;

  // Transform to Medusa product
  let medusaProduct: MedusaProduct;

  if (wooProduct.type === "variable" && wooProduct.variations?.length) {
    const { variants, options } = transformVariants(wooProduct, config);
    medusaProduct = {
      title: wooProduct.name || "Untitled Product",
      subtitle,
      description,
      handle,
      status: config.defaultStatus || (wooProduct.status === "publish" ? "published" : "draft"),
      // Do NOT set thumbnail — Medusa v2 doesn't accept external URLs as thumbnail
      // First image in images array will be used as thumbnail automatically
      images: images.length > 0 ? images : undefined,
      variants,
      options,
      originalSku: wooProduct.sku || `woo-${wooProduct.id}`,
      originalId: wooProduct.id,
      categoryIds: wooCategoryIds.length > 0 ? wooCategoryIds : undefined,
      // Store full WooCommerce price fields for UI fallback display
      metadata: buildProductMetadata(wooProduct, priceSource, wooCategoryIds),
    };
  } else {
    // Simple product — single variant
    // PRICE: Priority: sale_price > regular_price > price
    const salePrice = parseFloat(wooProduct.sale_price || "0");
    const regularPrice = parseFloat(wooProduct.regular_price || "0");
    const activePrice = parseFloat(wooProduct.price || "0");
    const priceAmount = salePrice > 0 ? salePrice : regularPrice > 0 ? regularPrice : activePrice;
    const hasPrice = priceAmount > 0;

    // INVENTORY: Only set quantity if WooCommerce actually manages stock
    const manageStock = wooProduct.manage_stock === true;
    const hasStockQty = wooProduct.stock_quantity !== null && wooProduct.stock_quantity !== undefined;
    let inventoryQty: number | undefined;
    let stockStatus: string | undefined;

    if (manageStock && hasStockQty) {
      inventoryQty = wooProduct.stock_quantity!;
      stockStatus = wooProduct.stock_quantity! > 0 ? "instock" : "outofstock";
    } else {
      // WC does NOT manage stock OR manage_stock=true but no stock_quantity
      // Use stock_status as the source of truth for availability display
      inventoryQty = undefined;
      stockStatus = wooProduct.stock_status || "instock";
    }

    const medusaVariant: MedusaVariant = {
      title: wooProduct.name || "Default",
      sku: wooProduct.sku || `woo-${wooProduct.id}`,
      prices: hasPrice
        ? [{ amount: Math.round(priceAmount * 100), currency_code: config.defaultCurrency || "vnd" }]
        : undefined,
      inventory_quantity: inventoryQty,
      manage_inventory: manageStock && hasStockQty ? true : false,
      originalSku: wooProduct.sku || `woo-${wooProduct.id}`,
      originalId: wooProduct.id,
      options: { "Default option": "Default" },
      metadata: {
        _price_source: priceSource || "none",
        _price_value: String(priceAmount),
        _stock_status: stockStatus || "unknown",
        _manage_stock: String(manageStock),
        _original_stock_qty: String(wooProduct.stock_quantity ?? "null"),
        _original_stock_status: wooProduct.stock_status || "unknown",
      },
    };

    if (wooProduct.weight) {
      medusaVariant.weight = parseFloat(wooProduct.weight) || undefined;
    }

    medusaProduct = {
      title: wooProduct.name || "Untitled Product",
      subtitle,
      description,
      handle,
      status: config.defaultStatus || (wooProduct.status === "publish" ? "published" : "draft"),
      images: images.length > 0 ? images : undefined,
      variants: [medusaVariant],
      options: [{ title: "Default option", values: ["Default"] }],
      originalSku: wooProduct.sku || `woo-${wooProduct.id}`,
      originalId: wooProduct.id,
      categoryIds: wooCategoryIds.length > 0 ? wooCategoryIds : undefined,
      // Store full WooCommerce price and stock data for UI fallback
      metadata: buildProductMetadata(wooProduct, priceSource, wooCategoryIds),
    };
  }

  // Store WooCommerce tags in product metadata for SEO/filter display
  // Even without Medusa tag IDs, we preserve the original WooCommerce tags
  if (wooProduct.tags && wooProduct.tags.length > 0) {
    const tagSlugs = wooProduct.tags.map((t) => t.name.toLowerCase().replace(/\s+/g, "-")).filter(Boolean);
    const tagNames = wooProduct.tags.map((t) => t.name).filter(Boolean);
    const tagIds = wooProduct.tags.map((t) => String(t.id)).filter((id) => id !== "undefined");

    medusaProduct.metadata = {
      ...(medusaProduct.metadata || {}),
      wordpress_tags: JSON.stringify(wooProduct.tags),
      wordpress_tag_slugs: tagSlugs.join(","),
      wordpress_tag_names: tagNames.join(","),
      wordpress_tag_ids: tagIds.join(","),
    };
  }

  // Dimensions
  if (wooProduct.dimensions) {
    const d = wooProduct.dimensions;
    if (d.length || d.width || d.height) {
      medusaProduct.dimensions = {
        length: d.length ? parseFloat(d.length) : undefined,
        width: d.width ? parseFloat(d.width) : undefined,
        height: d.height ? parseFloat(d.height) : undefined,
      };
    }
  }

  return {
    success: errors.length === 0,
    data: medusaProduct,
    errors,
    warnings,
  };
}

/**
 * Transform WooCommerce variable product variants to Medusa format.
 * Medusa v2 expects options as Record<string, string> (e.g., { "RAM": "8GB", "Color": "Black" })
 */
function transformVariants(
  wooProduct: WooProduct,
  config: ProductTransformConfig
): {
  variants: MedusaVariant[];
  options: MedusaOption[];
} {
  // Extract unique attributes for options (by attribute name)
  const attributeMap = new Map<string, Set<string>>();

  wooProduct.variations.forEach((variation) => {
    variation.attributes.forEach((attr) => {
      if (!attributeMap.has(attr.name)) {
        attributeMap.set(attr.name, new Set());
      }
      attributeMap.get(attr.name)!.add(attr.option);
    });
  });

  // Build Medusa options (title + values array)
  // Medusa v2 requires options for ALL products with variants
  const options: MedusaOption[] = [];
  if (attributeMap.size === 0) {
    // No variation attributes — create a default option so Medusa can auto-create the variant
    options.push({ title: "Default option", values: ["Default"] });
  } else {
    options.push(...Array.from(attributeMap.entries()).map(([name, values]) => ({
      title: name,
      values: Array.from(values),
    })));
  }

  // Transform each variation
  const variants: MedusaVariant[] = wooProduct.variations.map((variation) => {
    // PRICE: Priority for each variation: sale_price > regular_price > price
    const varSalePrice = parseFloat(variation.sale_price || variation.regular_price || "0");
    const varRegularPrice = parseFloat(variation.regular_price || "0");
    const varActivePrice = parseFloat(variation.price || "0");
    const varPriceAmount = varSalePrice > 0 ? varSalePrice : varRegularPrice > 0 ? varRegularPrice : varActivePrice;
    const varHasPrice = varPriceAmount > 0;

    // INVENTORY per variation
    const varManageStock = wooProduct.manage_stock === true;
    const varHasStockQty = variation.stock_quantity !== null && variation.stock_quantity !== undefined;
    let varInventoryQty: number | undefined;
    let varStockStatus: string | undefined;

    if (varManageStock && varHasStockQty) {
      varInventoryQty = variation.stock_quantity!;
      varStockStatus = variation.stock_quantity! > 0 ? "instock" : "outofstock";
    } else if (!varManageStock) {
      varInventoryQty = undefined;
      varStockStatus = wooProduct.stock_status || "instock";
    } else {
      varInventoryQty = undefined;
      varStockStatus = wooProduct.stock_status || "instock";
    }

    // Build options as Record<string, string> — Medusa v2 format
    const variantOptions: Record<string, string> = {};
    variation.attributes.forEach((attr) => {
      if (attr.option) {
        variantOptions[attr.name] = attr.option;
      }
    });

    // If no variation attributes, use default option
    if (Object.keys(variantOptions).length === 0 && wooProduct.variations.length > 0) {
      variantOptions["Default option"] = "Default";
    }

    const medusaVariant: MedusaVariant = {
      title: variation.attributes.map((a) => a.option).join(" / ") || "Default",
      sku: variation.sku || `${wooProduct.sku}-var-${variation.id}`,
      prices: varHasPrice
        ? [{ amount: Math.round(varPriceAmount * 100), currency_code: config.defaultCurrency || "vnd" }]
        : undefined,
      options: variantOptions,
      inventory_quantity: varInventoryQty,
      manage_inventory: varManageStock && varHasStockQty ? true : false,
      originalSku: variation.sku || `woo-var-${variation.id}`,
      originalId: variation.id,
      metadata: {
        _price_source: varSalePrice > 0 ? "sale_price" : varRegularPrice > 0 ? "regular_price" : varActivePrice > 0 ? "price" : "none",
        _price_value: String(varPriceAmount),
        _stock_status: varStockStatus || "unknown",
        _manage_stock: String(varManageStock),
        _original_stock_qty: String(variation.stock_quantity ?? "null"),
        _parent_stock_status: wooProduct.stock_status || "unknown",
      },
    };

    return medusaVariant;
  });

  return { variants, options };
}

/**
 * Sort categories so parents come before children.
 * WooCommerce returns categories in arbitrary order, but Medusa needs
 * parent_category_id to reference an existing category.
 *
 * Algorithm:
 * 1. Collect all root categories (parent === 0)
 * 2. Recursively collect children
 * 3. Build sorted array
 */
export function sortCategoriesByHierarchy(
  categories: WooCategory[]
): WooCategory[] {
  const map = new Map<number, WooCategory>();
  const childrenMap = new Map<number, WooCategory[]>();

  // Index all categories
  for (const cat of categories) {
    map.set(cat.id, cat);
    const parentId = cat.parent || 0;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  }

  // Recursively build ordered list (DFS)
  const result: WooCategory[] = [];

  function addCategoryAndChildren(cat: WooCategory) {
    result.push(cat);
    const children = childrenMap.get(cat.id) || [];
    for (const child of children) {
      addCategoryAndChildren(child);
    }
  }

  // Start with root categories (parent === 0)
  const roots = childrenMap.get(0) || [];
  for (const root of roots) {
    addCategoryAndChildren(root);
  }

  // Handle orphaned children (parent ID not in the list) — add them at the end
  const resultIds = new Set(result.map((c) => c.id));
  for (const cat of categories) {
    if (!resultIds.has(cat.id)) {
      result.push(cat);
    }
  }

  return result;
}

// ============================================================
// CATEGORY TRANSFORMATION
// ============================================================

/**
 * Transform a WooCommerce category to Medusa format.
 * Giữ nguyên slug gốc từ WooCommerce để bảo toàn SEO URLs.
 */
export function transformCategory(
  wooCategory: WooCategory
): TransformResult<MedusaCategory> {
  const errors: TransformError[] = [];

  if (!wooCategory.name) {
    errors.push({ field: "name", message: "Category name is required", productId: wooCategory.id });
  }

  const handle = slugify(wooCategory.slug || wooCategory.name || "category");

  const medusaCategory: MedusaCategory = {
    name: wooCategory.name,
    description: wooCategory.description || undefined,
    handle,
    parent_category_id: undefined,
    metadata: {
      originalId: String(wooCategory.id),
      originalSlug: wooCategory.slug,
      originalParentId: wooCategory.parent ? String(wooCategory.parent) : null,
    },
  };

  return {
    success: errors.length === 0,
    data: medusaCategory,
    errors,
    warnings: [],
  };
}

// ============================================================
// BULK TRANSFORMATION
// ============================================================

/**
 * Transform multiple products with error handling per item.
 */
export function transformProducts(
  wooProducts: WooProduct[],
  config: ProductTransformConfig
): {
  successful: Array<{ wooId: number; medusa: MedusaProduct }>;
  failed: Array<{ wooId: number; errors: TransformError[] }>;
  allWarnings: TransformWarning[];
} {
  const successful: Array<{ wooId: number; medusa: MedusaProduct }> = [];
  const failed: Array<{ wooId: number; errors: TransformError[] }> = [];
  const allWarnings: TransformWarning[] = [];

  for (const product of wooProducts) {
    const result = transformProduct(product, config);
    if (result.success && result.data) {
      successful.push({ wooId: product.id, medusa: result.data });
    } else {
      failed.push({ wooId: product.id, errors: result.errors });
    }
    allWarnings.push(...result.warnings);
  }

  return { successful, failed, allWarnings };
}

/**
 * Transform multiple categories.
 */
export function transformCategories(
  wooCategories: WooCategory[]
): {
  successful: Array<{ wooId: number; medusa: MedusaCategory }>;
  failed: Array<{ wooId: number; errors: TransformError[] }>;
} {
  const successful: Array<{ wooId: number; medusa: MedusaCategory }> = [];
  const failed: Array<{ wooId: number; errors: TransformError[] }> = [];

  for (const category of wooCategories) {
    const result = transformCategory(category);
    if (result.success && result.data) {
      successful.push({ wooId: category.id, medusa: result.data });
    } else {
      failed.push({ wooId: category.id, errors: result.errors });
    }
  }

  return { successful, failed };
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Convert a string to URL-safe slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate how many chunks needed for bulk migration.
 */
export function calculateChunks(total: number, batchSize: number): number {
  return Math.ceil(total / batchSize);
}

/**
 * Split array into chunks for bulk processing.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
