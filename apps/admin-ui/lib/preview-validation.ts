/**
 * Preview Validation - Kiểm tra sản phẩm trước khi migrate.
 *
 * Phát hiện sớm các vấn đề:
 * - Thiếu category mapping
 * - Thiếu SKU / name / images
 * - Payload không hợp lệ cho Medusa v2
 * - Product có nhiều category
 * - Product thiếu category
 * - Ảnh trong description
 */

import type { WooProduct, WooCategory } from "@/types";
import { categoryMappingStorage, type CategoryMapping } from "@/types";
import { extractImageUrlsFromHtml, transformDescriptionImages } from "@/lib/transform";

export interface ValidationIssue {
  type: "error" | "warning" | "info";
  field: string;
  message: string;
  code?: string;
}

export interface ProductValidation {
  wooId: number;
  wooName: string;
  wooSku: string;
  wooType: string;
  issues: ValidationIssue[];
  // Category mapping details
  categories: Array<{
    wooId: number;
    wooName: string;
    wooSlug: string;
    mapped: boolean;
    medusaId: string | null;
    medusaName: string | null;
  }>;
  // Image details
  imageCount: number;
  imagesInDescription: string[];
  // Payload preview
  payloadPreview: {
    hasTitle: boolean;
    hasSku: boolean;
    hasPrice: boolean;
    hasCategories: boolean;
    allCategoriesMapped: boolean;
    hasImages: boolean;
    hasDescription: boolean;
    isVariable: boolean;
    variationCount: number;
    optionCount: number;
  };
}

export interface CategoryValidation {
  wooId: number;
  wooName: string;
  wooSlug: string;
  wooParentId: number | null;
  parentMapped: boolean;
  medusaId: string | null;
}

export interface PreviewReport {
  timestamp: string;
  wordpressUrl: string;
  medusaBackendUrl: string;
  // Summary
  totalProducts: number;
  totalCategories: number;
  validProducts: number;
  errorProducts: number;
  warningProducts: number;
  // Category mapping summary
  totalCategoryMappings: number;
  unmappedCategories: CategoryValidation[];
  // Product details
  productValidations: ProductValidation[];
  // Summary by issue type
  issueSummary: Record<string, number>;
  // Can migrate?
  canMigrate: boolean;
  blockingIssues: string[];
}

const ISSUE_CODES = {
  MISSING_NAME: "MISSING_NAME",
  MISSING_SKU: "MISSING_SKU",
  MISSING_PRICE: "MISSING_PRICE",
  UNMAPPED_CATEGORY: "UNMAPPED_CATEGORY",
  MISSING_CATEGORY: "MISSING_CATEGORY",
  MISSING_IMAGES: "MISSING_IMAGES",
  MISSING_DESCRIPTION: "MISSING_DESCRIPTION",
  VARIABLE_NO_VARIATIONS: "VARIABLE_NO_VARIATIONS",
  ALL_VARIATIONS_MISSING_PRICE: "ALL_VARIATIONS_MISSING_PRICE",
  EMPTY_OPTION_VALUES: "EMPTY_OPTION_VALUES",
  IMAGES_IN_DESCRIPTION: "IMAGES_IN_DESCRIPTION",
  DUPLICATE_SKU: "DUPLICATE_SKU",
} as const;

/**
 * Validate a single product against category mapping and payload requirements.
 */
export function validateProduct(
  product: WooProduct,
  categoryMappings: CategoryMapping[]
): ProductValidation {
  const issues: ValidationIssue[] = [];

  // Build a quick lookup for category mappings
  const catMapLookup = new Map<number, CategoryMapping>();
  categoryMappings.forEach((m) => catMapLookup.set(m.wordpressCategoryId, m));

  // === CATEGORY MAPPING ===
  const categories = product.categories.map((cat) => {
    const mapping = catMapLookup.get(cat.id);
    return {
      wooId: cat.id,
      wooName: cat.name,
      wooSlug: "", // slug not available in product.categories
      mapped: !!mapping,
      medusaId: mapping?.medusaCategoryId ?? null,
      medusaName: mapping?.medusaCategoryName ?? null,
    };
  });

  const unmappedCats = categories.filter((c) => !c.mapped);

  // === VALIDATION: Name ===
  if (!product.name?.trim()) {
    issues.push({
      type: "error",
      field: "name",
      message: "Thiếu tên sản phẩm",
      code: ISSUE_CODES.MISSING_NAME,
    });
  }

  // === VALIDATION: SKU ===
  const sku = product.sku?.trim() || `woo-${product.id}`;
  if (!product.sku?.trim()) {
    issues.push({
      type: "warning",
      field: "sku",
      message: `Thiếu SKU — sẽ dùng SKU tự động: "${sku}"`,
      code: ISSUE_CODES.MISSING_SKU,
    });
  }

  // === VALIDATION: Price ===
  // Priority: sale_price > regular_price > price
  const salePrice = parseFloat(product.sale_price || "0");
  const regularPrice = parseFloat(product.regular_price || "0");
  const activePrice = parseFloat(product.price || "0");
  const priceAmount = salePrice > 0 ? salePrice : regularPrice > 0 ? regularPrice : activePrice;
  const priceSource = salePrice > 0 ? "sale_price" : regularPrice > 0 ? "regular_price" : activePrice > 0 ? "price" : null;
  if (priceAmount <= 0) {
    issues.push({
      type: "warning",
      field: "price",
      message: "Giá sản phẩm bằng 0 hoặc không có giá",
      code: ISSUE_CODES.MISSING_PRICE,
    });
  }

  // === VALIDATION: Inventory (stock) ===
  const manageStock = product.manage_stock === true;
  const hasStockQty = product.stock_quantity !== null && product.stock_quantity !== undefined;
  const stockStatus = product.stock_status || "instock";

  if (!manageStock) {
    // WC does not manage stock — not an error, just informational
    issues.push({
      type: "info",
      field: "inventory",
      message: `Không quản lý tồn kho (WC stock_status: ${stockStatus})`,
      code: "NOT_MANAGED_STOCK",
    });
  } else if (manageStock && hasStockQty && product.stock_quantity === 0) {
    issues.push({
      type: "warning",
      field: "inventory",
      message: `Hết hàng (manage_stock=true, stock_quantity=0)`,
      code: "OUT_OF_STOCK",
    });
  }

  // === VALIDATION: Status ===
  if (product.status !== "publish") {
    issues.push({
      type: "info",
      field: "status",
      message: `WooCommerce status "${product.status}" → Medusa sẽ set thành "draft"`,
      code: "STATUS_DRAFT",
    });
  } else {
    issues.push({
      type: "info",
      field: "status",
      message: `WooCommerce "publish" → Medusa "published"`,
      code: "STATUS_PUBLISHED",
    });
  }

  // === VALIDATION: Category ===
  if (categories.length === 0) {
    issues.push({
      type: "warning",
      field: "categories",
      message: "Sản phẩm chưa được phân loại (không có category)",
      code: ISSUE_CODES.MISSING_CATEGORY,
    });
  }

  if (unmappedCats.length > 0) {
    unmappedCats.forEach((c) => {
      issues.push({
        type: "warning",
        field: "categories",
        message: `Category "${c.wooName}" (ID: ${c.wooId}) chưa migrate → sản phẩm vẫn tạo nhưng KHÔNG có category này`,
        code: ISSUE_CODES.UNMAPPED_CATEGORY,
      });
    });
  }

  // === VALIDATION: Images ===
  const imageCount = product.images?.length || 0;
  if (imageCount === 0) {
    issues.push({
      type: "warning",
      field: "images",
      message: "Sản phẩm không có hình ảnh",
      code: ISSUE_CODES.MISSING_IMAGES,
    });
  }

  // Check for images inside description HTML
  const descImages = extractImageUrlsFromHtml(product.description || "");
  const shortDescImages = extractImageUrlsFromHtml(product.short_description || "");
  const allDescImages = [...descImages, ...shortDescImages];

  if (allDescImages.length > 0) {
    issues.push({
      type: "warning",
      field: "description",
      message: `Mô tả chứa ${allDescImages.length} ảnh inline cần xử lý`,
      code: ISSUE_CODES.IMAGES_IN_DESCRIPTION,
    });
  }

  // === VALIDATION: Description ===
  if (!product.description?.trim() && !product.short_description?.trim()) {
    issues.push({
      type: "warning",
      field: "description",
      message: "Sản phẩm không có mô tả",
      code: ISSUE_CODES.MISSING_DESCRIPTION,
    });
  }

  // === VALIDATION: Variable product ===
  const isVariable = product.type === "variable";
  const variationCount = product.variations?.length || 0;

  if (isVariable && variationCount === 0) {
    issues.push({
      type: "error",
      field: "variations",
      message: "Sản phẩm variable nhưng không có biến thể nào",
      code: ISSUE_CODES.VARIABLE_NO_VARIATIONS,
    });
  }

  // Check if all variations have prices (using same priority: sale > regular > price)
  if (variationCount > 0) {
    const allNoPrice = product.variations!.every((v) => {
      const vs = parseFloat(v.sale_price || "0");
      const vr = parseFloat(v.regular_price || "0");
      const va = parseFloat(v.price || "0");
      return (vs > 0 ? vs : vr > 0 ? vr : va) <= 0;
    });
    if (allNoPrice) {
      issues.push({
        type: "warning",
        field: "variations",
        message: "Tất cả biến thể đều không có giá",
        code: ISSUE_CODES.ALL_VARIATIONS_MISSING_PRICE,
      });
    }

    // Check for empty option values
    const emptyOptions = product.variations!.filter(
      (v) => v.attributes.length === 0 || v.attributes.every((a) => !a.option?.trim())
    );
    if (emptyOptions.length > 0) {
      issues.push({
        type: "warning",
        field: "variations",
        message: `${emptyOptions.length} biến thể có attribute trống`,
        code: ISSUE_CODES.EMPTY_OPTION_VALUES,
      });
    }
  }

  // === PAYLOAD PREVIEW ===
  const payloadPreview = {
    hasTitle: !!product.name?.trim(),
    hasSku: !!(product.sku?.trim()),
    hasPrice: priceAmount > 0,
    hasCategories: categories.length > 0,
    allCategoriesMapped: unmappedCats.length === 0,
    hasImages: imageCount > 0,
    hasDescription: !!(product.description?.trim() || product.short_description?.trim()),
    isVariable,
    variationCount,
    optionCount: isVariable
      ? new Set(product.variations?.flatMap((v) => v.attributes.map((a) => a.name))).size
      : 1,
  };

  return {
    wooId: product.id,
    wooName: product.name || "Untitled",
    wooSku: sku,
    wooType: product.type,
    issues,
    categories,
    imageCount,
    imagesInDescription: allDescImages,
    payloadPreview,
  };
}

/**
 * Validate all products and generate a comprehensive preview report.
 *
 * @param categoryMappingsOverride - Optional array of CategoryMapping. If provided,
 *                                  overrides reading from localStorage storage.
 */
export function generatePreviewReport(
  products: WooProduct[],
  categories: WooCategory[],
  wordpressUrl: string,
  medusaBackendUrl: string,
  categoryMappingsOverride?: Array<{
    wooId: number;
    medusaId: string;
    wooName?: string;
  }>
): PreviewReport {
  // Use passed mappings if available, otherwise read from localStorage
  const storedMappings = categoryMappingStorage.load();
  let categoryMappings: CategoryMapping[];

  if (categoryMappingsOverride && categoryMappingsOverride.length > 0) {
    // Build CategoryMapping array from the override (flat wooId → medusaId map)
    categoryMappings = categoryMappingsOverride.map((m) => {
      const stored = storedMappings.find(
        (s) => s.wordpressCategoryId === m.wooId
      );
      return {
        wordpressCategoryId: m.wooId,
        wordpressCategoryName: m.wooName || stored?.wordpressCategoryName || "",
        wordpressSlug: stored?.wordpressSlug || "",
        wordpressParentId: stored?.wordpressParentId ?? null,
        medusaCategoryId: m.medusaId,
        medusaCategoryName: stored?.medusaCategoryName || "",
        medusaCategoryHandle: stored?.medusaCategoryHandle || "",
        migratedAt: stored?.migratedAt || new Date().toISOString(),
      };
    });
  } else {
    categoryMappings = storedMappings;
  }

  // Category validation
  const catMapLookup = new Map<number, CategoryMapping>();
  categoryMappings.forEach((m) => catMapLookup.set(m.wordpressCategoryId, m));

  const categoryValidations: CategoryValidation[] = categories.map((cat) => {
    const mapping = catMapLookup.get(cat.id);
    const parentMapping = cat.parent ? catMapLookup.get(cat.parent) : null;
    return {
      wooId: cat.id,
      wooName: cat.name,
      wooSlug: cat.slug,
      wooParentId: cat.parent || null,
      parentMapped: cat.parent === 0 || !!parentMapping,
      medusaId: mapping?.medusaCategoryId ?? null,
    };
  });

  const unmappedCategories = categoryValidations.filter((c) => !c.medusaId);

  // Product validation
  const productValidations = products.map((p) =>
    validateProduct(p, categoryMappings)
  );

  // Count by type
  let validProducts = 0;
  let errorProducts = 0;
  let warningProducts = 0;

  const issueSummary: Record<string, number> = {};

  for (const pv of productValidations) {
    const hasErrors = pv.issues.some((i) => i.type === "error");
    const hasWarnings = pv.issues.some((i) => i.type === "warning");

    if (hasErrors) {
      errorProducts++;
    } else if (hasWarnings) {
      warningProducts++;
    } else {
      validProducts++;
    }

    pv.issues.forEach((issue) => {
      const key = issue.code || issue.field;
      issueSummary[key] = (issueSummary[key] || 0) + 1;
    });
  }

  // Blocking issues = any unmapped categories or variable products without variations
  const blockingIssues: string[] = [];

  if (unmappedCategories.length > 0) {
    blockingIssues.push(
      `${unmappedCategories.length} category chưa được migrate — cần migrate categories trước`
    );
  }

  const BLOCKING_CODES: string[] = [
    "MISSING_NAME",
    "UNMAPPED_CATEGORY",
    "VARIABLE_NO_VARIATIONS",
  ];

  const hasBlockingProductErrors = productValidations.some(
    (pv) =>
      pv.issues.some(
        (i) => i.type === "error" && i.code && BLOCKING_CODES.includes(i.code)
      )
  );

  if (hasBlockingProductErrors) {
    blockingIssues.push("Một số sản phẩm có lỗi nghiêm trọng cần sửa trước khi migrate");
  }

  return {
    timestamp: new Date().toISOString(),
    wordpressUrl,
    medusaBackendUrl,
    totalProducts: products.length,
    totalCategories: categories.length,
    validProducts,
    errorProducts,
    warningProducts,
    totalCategoryMappings: categoryMappings.length,
    unmappedCategories,
    productValidations,
    issueSummary,
    canMigrate: blockingIssues.length === 0,
    blockingIssues,
  };
}

/**
 * Check if a specific WooCommerce category ID has been mapped to Medusa.
 */
export function isCategoryMapped(wooCategoryId: number): boolean {
  return !!categoryMappingStorage.getMedusaId(wooCategoryId);
}

/**
 * Get all unmapped category IDs from a list of WooCommerce category IDs.
 */
export function getUnmappedCategoryIds(wooCategoryIds: number[]): number[] {
  return categoryMappingStorage.getUnmapped(wooCategoryIds);
}

/**
 * Resolve WooCommerce category IDs to Medusa category IDs using stored mapping.
 * Returns array of { wooId, medusaId } for mapped categories.
 */
export function resolveCategories(wooCategoryIds: number[]): Array<{ wooId: number; medusaId: string }> {
  const results: Array<{ wooId: number; medusaId: string }> = [];
  for (const id of wooCategoryIds) {
    const medusaId = categoryMappingStorage.getMedusaId(id);
    if (medusaId) {
      results.push({ wooId: id, medusaId });
    }
  }
  return results;
}
