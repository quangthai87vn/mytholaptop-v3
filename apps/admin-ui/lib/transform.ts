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
 *
 * IMPORTANT: Luôn trả về RELATIVE PATH (bắt đầu bằng /wp-content/uploads/...)
 * KHÔNG trả về full URL (http://mytholaptop.vn/...)
 */
export function normalizeImageUrl(src: string, wordpressBaseUrl: string): string {
  if (!src) return "";

  // Already absolute — extract relative path from WordPress URL
  if (src.startsWith("http://") || src.startsWith("https://")) {
    // Extract pathname from WordPress URL (e.g. https://mytholaptop.vn/wp-content/uploads/2026/01/image.webp → /wp-content/uploads/2026/01/image.webp)
    const relativeMatch = src.match(/\/wp-content\/uploads\/.+/);
    if (relativeMatch) {
      return relativeMatch[0];
    }
    // Fallback: try to extract pathname
    try {
      const url = new URL(src);
      return url.pathname;
    } catch {
      return src;
    }
  }

  // Protocol-relative URL
  if (src.startsWith("//")) {
    const withProtocol = "https:" + src;
    const relativeMatch = withProtocol.match(/\/wp-content\/uploads\/.+/);
    if (relativeMatch) {
      return relativeMatch[0];
    }
    try {
      return new URL(withProtocol).pathname;
    } catch {
      return src;
    }
  }

  // Already a relative path (starts with /) — extract wp-content/uploads part if present
  if (src.startsWith("/")) {
    const relativeMatch = src.match(/\/wp-content\/uploads\/.+/);
    if (relativeMatch) {
      return relativeMatch[0];
    }
    return src;
  }

  // Plain relative path — prepend /wp-content/uploads/ prefix
  return `/wp-content/uploads/${src}`;
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
 * Transform image URLs in HTML description to use relative paths.
 * IMPORTANT: Luôn giữ relative path (/wp-content/uploads/...) trong HTML,
 * KHÔNG convert thành full URL (http://mytholaptop.vn/...)
 */
export function transformDescriptionImages(
  html: string,
  wordpressBaseUrl: string,
  targetDomain: string = ""
): string {
  if (!html) return "";

  const srcBase = wordpressBaseUrl.replace(/\/$/, "");

  let result = html;

  // Extract relative path from WordPress URLs and replace them in HTML
  // E.g. https://mytholaptop.vn/wp-content/uploads/2026/01/image.webp → /wp-content/uploads/2026/01/image.webp
  // Pattern: match WordPress base URL + /wp-content/uploads/... and replace with just /wp-content/uploads/...
  if (srcBase) {
    // Match full WordPress URL with /wp-content/uploads/ path and replace with relative path
    result = result.replace(
      new RegExp(escapeRegExp(srcBase) + "(/wp-content/uploads/[^\\s\"'<>]+)", "gi"),
      "$1"
    );
    // Also handle double-slash case: https://mytholaptop.vn//wp-content/... → /wp-content/...
    result = result.replace(
      /https?:\/\/[^\/]+\/\/wp-content\/uploads\//gi,
      "/wp-content/uploads/"
    );
  }

  // Fix relative URLs that don't have /wp-content/uploads/ prefix (add it)
  // Pattern: src="/uploads/... → src="/wp-content/uploads/...
  result = result.replace(
    /src=["']\/uploads\//gi,
    'src="/wp-content/uploads/'
  );
  result = result.replace(
    /data-src=["']\/uploads\//gi,
    'data-src="/wp-content/uploads/'
  );
  result = result.replace(
    /href=["']\/uploads\//gi,
    'href="/wp-content/uploads/'
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
 * IMPORTANT: Luôn giữ relative path (/wp-content/uploads/...) trong HTML,
 * KHÔNG convert thành full URL.
 */
export function transformDescription(
  html: string,
  config: DescriptionTransformConfig
): string {
  if (!html) return "";

  const srcBase = config.sourceDomain.replace(/\/$/, "");

  let result = html;

  // Extract relative path from WordPress URLs in HTML (replace full URL → relative path)
  if (srcBase) {
    // Match WordPress URL + /wp-content/uploads/... and replace with just /wp-content/uploads/...
    result = result.replace(
      new RegExp(escapeRegExp(srcBase) + "(/wp-content/uploads/[^\\s\"'<>]+)", "gi"),
      "$1"
    );
    // Handle double-slash case: https://mytholaptop.vn//wp-content/... → /wp-content/...
    result = result.replace(
      /https?:\/\/[^\/]+\/\/wp-content\/uploads\//gi,
      "/wp-content/uploads/"
    );
  }

  // Normalize /uploads/ → /wp-content/uploads/ if needed
  result = result.replace(/src=["']\/uploads\//gi, 'src="/wp-content/uploads/');
  result = result.replace(/href=["']\/uploads\//gi, 'href="/wp-content/uploads/');

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
  /** Mapping of WooCommerce tag ID to Medusa tag ID */
  tagMapping?: Record<number, string>;
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

    // Convert WooCommerce tag IDs to Medusa tag IDs if mapping is provided
    const medusaTags: Array<{ id: string; value: string }> = [];
    if (config.tagMapping) {
      for (const wooTag of wooProduct.tags) {
        const medusaId = config.tagMapping[wooTag.id];
        if (medusaId) {
          medusaTags.push({ id: medusaId, value: wooTag.name });
        }
      }
    }

    medusaProduct.metadata = {
      ...(medusaProduct.metadata || {}),
      wordpress_tags: JSON.stringify(wooProduct.tags),
      wordpress_tag_slugs: tagSlugs.join(","),
      wordpress_tag_names: tagNames.join(","),
      wordpress_tag_ids: tagIds.join(","),
    };

    // Add Medusa tags to product if we have the mapping
    if (medusaTags.length > 0) {
      medusaProduct.tags = medusaTags;
    }
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

/**
 * Build a map of category ID to its hierarchy level.
 * Level 0 = root categories (no parent)
 * Level 1 = children of root
 * Level 2 = grandchildren, etc.
 */
export function buildCategoryLevelMap(categories: WooCategory[]): Map<number, number> {
  const levelMap = new Map<number, number>();
  const childrenMap = new Map<number, WooCategory[]>();
  const catMap = new Map<number, WooCategory>();

  // Index all categories
  for (const cat of categories) {
    catMap.set(cat.id, cat);
    const parentId = cat.parent || 0;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(cat);
  }

  // DFS to calculate level for each category
  function calculateLevel(catId: number, level: number): void {
    if (levelMap.has(catId)) return; // Already calculated
    levelMap.set(catId, level);
    const children = childrenMap.get(catId) || [];
    for (const child of children) {
      calculateLevel(child.id, level + 1);
    }
  }

  // Start with root categories
  const roots = childrenMap.get(0) || [];
  for (const root of roots) {
    calculateLevel(root.id, 0);
  }

  // Handle orphaned children
  for (const cat of categories) {
    if (!levelMap.has(cat.id)) {
      calculateLevel(cat.id, 0);
    }
  }

  return levelMap;
}

// ============================================================
// CATEGORY TRANSFORMATION
// ============================================================

/**
 * Transform a WooCommerce category to Medusa format.
 * Giữ nguyên slug gốc từ WooCommerce để bảo toàn SEO URLs.
 */
export function transformCategory(
  wooCategory: WooCategory,
  parentCategoryLevel: number = 0
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
      parentCategoryLevel: String(parentCategoryLevel),
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
