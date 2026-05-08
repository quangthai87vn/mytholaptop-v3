import type { MedusaProduct } from "@/services/medusa-types";
import type { CategoryNode } from "@/components/categories/category-tree";

export type StockStatus = "instock" | "outofstock" | "onbackorder" | "unknown" | "all";
export type ProductStatus = "draft" | "published" | "proposed" | "rejected" | "archived" | "all";
export type SortOption =
  | "newest_date"
  | "oldest_date"
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "stock_asc";

export const SORT_LABELS: Record<SortOption, string> = {
  newest_date: "Sắp xếp theo ngày mới nhất",
  oldest_date: "Sắp xếp theo ngày cũ nhất",
  name_asc: "Tên A-Z",
  name_desc: "Tên Z-A",
  price_asc: "Giá thấp đến cao",
  price_desc: "Giá cao đến thấp",
  stock_asc: "Tồn kho thấp trước",
};

/**
 * Rewrite image URLs inside HTML description for display.
 * Converts:
 * - Relative paths like /wp-content/uploads/... → /api/fetch-image?url=...
 * - Absolute WooCommerce URLs → /api/fetch-image?url=...
 * - Any path starting with / → /api/fetch-image?url=...
 */
export function rewriteDescriptionImages(html: string): string {
  if (!html) return "";

  // Rewrite <img src="..."> with relative or external URLs
  let result = html.replace(
    /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, url, after) => {
      if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
        return match;
      }
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(url)}`;
      return `<img${before}src="${proxyUrl}"${after}>`;
    }
  );

  // Rewrite style="background-image: url(...)"
  result = result.replace(
    /style=["'][^"']*background-image\s*:\s*url\s*\(\s*['"]?([^'"()]+)['"]?\s*\)[^"']*["']/gi,
    (match, url) => {
      if (!url || url.startsWith("data:") || url.startsWith("blob:")) {
        return match;
      }
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(url)}`;
      return match.replace(url, proxyUrl);
    }
  );

  return result;
}

/**
 * Resolve a single image URL for Next.js Image component.
 * Converts relative paths to fetch-image proxy, keeps absolute URLs as-is.
 */
export function resolveImageUrlForDisplay(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    const encoded = encodeURIComponent(url);
    return `/api/fetch-image?url=${encoded}`;
  }
  return url;
}

export interface AdaptedProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  stockStatus: StockStatus;
  status: string;
  image: string;
  tags: string[];
  metadata?: Record<string, string>;
  rawProduct: MedusaProduct;
  /** ISO date string from Medusa created_at */
  createdAt?: string;
  /** Sync status derived from metadata */
  syncStatus?: "synced" | "pending" | "failed" | "manual";
}

export interface ProductFilters {
  search: string;
  categoryId: string;
  status: ProductStatus;
  stock: StockStatus;
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  all: "Tất cả",
  instock: "Còn hàng",
  outofstock: "Hết hàng",
  onbackorder: "Đang chờ hàng",
  unknown: "Chưa đồng bộ",
};

export const MEDUSA_STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  proposed: "Đề xuất",
  published: "Hoạt động",
  rejected: "Từ chối",
  archived: "Lưu trữ",
  all: "Tất cả",
};

export function getStockBadgeVariant(
  stock: number,
  stockStatus: StockStatus
): "success" | "warning" | "destructive" {
  if (stock === 0) return "destructive";
  if (stockStatus === "outofstock") return "destructive";
  if (stockStatus === "onbackorder") return "warning";
  if (stock <= 3) return "warning";
  return "success";
}

export function getStatusVariant(
  status: string
): "success" | "secondary" | "outline" {
  if (status === "published") return "success";
  if (status === "draft") return "secondary";
  return "outline";
}

export function getSyncStatusVariant(
  status?: string
): "success" | "warning" | "destructive" | "secondary" {
  if (status === "synced") return "success";
  if (status === "failed") return "destructive";
  if (status === "pending") return "warning";
  return "secondary";
}

export const SYNC_STATUS_LABELS: Record<string, string> = {
  synced: "Đã đồng bộ",
  pending: "Chờ đồng bộ",
  failed: "Lỗi",
  manual: "Thủ công",
};

export function getStockStatus(
  firstVariant: { inventory_quantity?: number | null } | undefined,
  meta?: Record<string, string>
): { stock: number; stockStatus: StockStatus } {
  const medusaInventoryQty = firstVariant?.inventory_quantity ?? null;
  const wooStockStatus = (meta?.wordpress_stock_status as StockStatus) || "instock";
  const wooManageStock = meta?.wordpress_manage_stock === "true";
  const wooStockQty = meta?.wordpress_stock_quantity
    ? parseInt(meta.wordpress_stock_quantity)
    : null;

  let stockValue: number;
  let stockStatus: StockStatus = "unknown";

  if (medusaInventoryQty !== null && medusaInventoryQty !== undefined) {
    stockValue = medusaInventoryQty;
    stockStatus = medusaInventoryQty > 0 ? "instock" : "outofstock";
  } else if (wooManageStock && wooStockQty !== null && !isNaN(wooStockQty)) {
    stockValue = wooStockQty;
    stockStatus = wooStockQty > 0 ? "instock" : "outofstock";
  } else {
    stockValue = 999;
    stockStatus =
      wooStockStatus === "outofstock"
        ? "outofstock"
        : wooStockStatus === "onbackorder"
        ? "onbackorder"
        : "instock";
  }

  return { stock: stockValue, stockStatus };
}

function deriveSyncStatus(meta?: Record<string, string>): AdaptedProduct["syncStatus"] {
  if (!meta) return "manual";
  if (meta.sync_status === "failed") return "failed";
  if (meta.sync_status === "pending") return "pending";
  if (meta.sync_status === "synced") return "synced";
  if (meta.woo_id || meta.wordpress_id) return "synced";
  return "manual";
}

export function adaptProduct(
  p: MedusaProduct,
  categoryMap: Map<string, string>
): AdaptedProduct {
  const firstVariant = p.variants?.[0];
  const meta = p.metadata as Record<string, string> | undefined;

  const medusaPrice = firstVariant
    ? (firstVariant.calculated_price ?? firstVariant.price?.[0] ?? 0) / 100
    : 0;
  const wooSalePrice = meta?.wordpress_sale_price
    ? parseFloat(meta.wordpress_sale_price)
    : 0;
  const wooRegularPrice = meta?.wordpress_regular_price
    ? parseFloat(meta.wordpress_regular_price)
    : 0;
  const wooPrice = meta?.wordpress_price
    ? parseFloat(meta.wordpress_price)
    : 0;

  let displayPrice = medusaPrice;
  let compareAtPrice: number | undefined;

  if (medusaPrice > 0) {
    displayPrice = medusaPrice;
    compareAtPrice = firstVariant?.calculated_original_price
      ? firstVariant.calculated_original_price / 100
      : undefined;
  } else if (
    wooSalePrice > 0 &&
    wooRegularPrice > 0 &&
    wooSalePrice < wooRegularPrice
  ) {
    displayPrice = wooSalePrice;
    compareAtPrice = wooRegularPrice;
  } else if (wooSalePrice > 0) {
    displayPrice = wooSalePrice;
  } else if (wooRegularPrice > 0) {
    displayPrice = wooRegularPrice;
  } else if (wooPrice > 0) {
    displayPrice = wooPrice;
  }

  const { stock, stockStatus } = getStockStatus(
    firstVariant as { inventory_quantity?: number | null } | undefined,
    meta
  );

  let tags: string[] = [];
  if (meta?.wordpress_tag_names) {
    tags = meta.wordpress_tag_names.split(",").filter(Boolean);
  } else if (p.tags && p.tags.length > 0) {
    tags = p.tags.map((t) => t.value);
  }

  const productCatIds = p.categories || [];
  let categoryName = "";
  let categoryId: string | undefined;

  if (productCatIds.length > 0) {
    const firstCat = productCatIds[0];
    if (firstCat.name) {
      categoryName = firstCat.name;
      categoryId = firstCat.id;
    } else {
      categoryName = categoryMap.get(firstCat.id) || "";
      categoryId = firstCat.id;
    }
  }
  if (!categoryName && meta?.wordpress_category_names) {
    categoryName = meta.wordpress_category_names.split(",")[0].trim();
  }

  return {
    id: p.id,
    name: p.title,
    sku: firstVariant?.sku || "",
    category: categoryName,
    categoryId,
    price: displayPrice,
    compareAtPrice,
    stock,
    stockStatus,
    status: p.status || "draft",
    image: resolveImageUrlForDisplay(p.thumbnail || p.images?.[0]?.url),
    tags,
    metadata: meta,
    rawProduct: p,
    createdAt: p.created_at,
    syncStatus: deriveSyncStatus(meta),
  };
}

export function filterProductsBySearch(
  products: AdaptedProduct[],
  search: string
): AdaptedProduct[] {
  if (!search.trim()) return products;
  const lower = search.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.sku.toLowerCase().includes(lower) ||
      p.category.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

export function filterProductsByCategory(
  products: AdaptedProduct[],
  categoryId: string
): AdaptedProduct[] {
  if (!categoryId || categoryId === "all") return products;
  return products.filter((p) => {
    if (p.categoryId === categoryId) return true;
    const meta = p.metadata;
    if (meta?.wordpress_category_ids) {
      const ids = meta.wordpress_category_ids.split(",").map((s) => s.trim());
      if (ids.includes(categoryId)) return true;
    }
    return false;
  });
}

/**
 * Collect all category IDs (Medusa IDs) that match a given WooCommerce category ID.
 * A WooCommerce category ID maps to a Medusa category via wooId field.
 */
function getMedusaIdsByWooId(nodes: CategoryNode[], wooId: string): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    if (node.wooId === wooId) result.push(node.id);
    result.push(...getMedusaIdsByWooId(node.children, wooId));
  }
  return result;
}

export function filterProductsByCategoryTree(
  products: AdaptedProduct[],
  categoryId: string,
  categoryDescendants: Set<string>,
  categoryTree: CategoryNode[] = []
): AdaptedProduct[] {
  if (!categoryId || categoryId === "all") return products;
  return products.filter((p) => {
    if (p.categoryId === categoryId) return true;
    if (categoryDescendants.has(p.categoryId || "")) return true;

    const meta = p.metadata;
    const wooCatIds = meta?.wordpress_category_ids
      ? meta.wordpress_category_ids.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    for (const wooId of wooCatIds) {
      const medusaIds = getMedusaIdsByWooId(categoryTree, wooId);
      for (const mId of medusaIds) {
        if (mId === categoryId) return true;
        if (categoryDescendants.has(mId)) return true;
      }
    }

    return false;
  });
}

export function filterProductsByStatus(
  products: AdaptedProduct[],
  status: ProductStatus
): AdaptedProduct[] {
  if (status === "all") return products;
  return products.filter((p) => p.status === status);
}

export function filterProductsByStock(
  products: AdaptedProduct[],
  stock: StockStatus
): AdaptedProduct[] {
  if (stock === "all" || stock === "unknown") return products;
  return products.filter((p) => p.stockStatus === stock);
}

/** Client-side sort on the filtered + adapted product list */
export function sortProducts(
  products: AdaptedProduct[],
  sort: SortOption
): AdaptedProduct[] {
  const arr = [...products];
  switch (sort) {
    case "newest_date":
      return arr.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    case "oldest_date":
      return arr.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    case "name_desc":
      return arr.sort((a, b) => b.name.localeCompare(a.name, "vi"));
    case "price_asc":
      return arr.sort((a, b) => {
        const pa = a.price ?? 0;
        const pb = b.price ?? 0;
        return pa - pb;
      });
    case "price_desc":
      return arr.sort((a, b) => {
        const pa = a.price ?? 0;
        const pb = b.price ?? 0;
        return pb - pa;
      });
    case "stock_asc":
      return arr.sort((a, b) => {
        const sa = a.stock ?? 9999;
        const sb = b.stock ?? 9999;
        return sa - sb;
      });
    default:
      return arr;
  }
}

export function paginateProducts(
  products: AdaptedProduct[],
  page: number,
  pageSize: number
): { items: AdaptedProduct[]; total: number; totalPages: number } {
  const total = products.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = page * pageSize;
  const items = products.slice(offset, offset + pageSize);
  return { items, total, totalPages };
}

export function getActiveFilterLabels(filters: ProductFilters): string[] {
  const labels: string[] = [];
  if (filters.search) labels.push(`Tìm: ${filters.search}`);
  if (filters.categoryId && filters.categoryId !== "all")
    labels.push(`Danh mục`);
  if (filters.status && filters.status !== "all")
    labels.push(`Trạng thái: ${MEDUSA_STATUS_LABELS[filters.status] || filters.status}`);
  if (filters.stock && filters.stock !== "all")
    labels.push(`Tồn kho: ${STOCK_STATUS_LABELS[filters.stock] || filters.stock}`);
  return labels;
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return !!(
    filters.search ||
    (filters.categoryId && filters.categoryId !== "all") ||
    (filters.status && filters.status !== "all") ||
    (filters.stock && filters.stock !== "all")
  );
}
