/**
 * WooCommerce API Service
 *
 * Kết nối thật đến WooCommerce REST API.
 *
 * API Reference:
 * https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

import type {
  WooProduct,
  WooCategory,
  WooTag,
  ConnectionState,
  PreviewState,
  PreviewValidation,
} from "@/types";
import type { TransformError } from "@/types";

// ============================================================
// API CLIENT
// ============================================================

export interface WooCommerceConfig {
  wordpressUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Gọi API WooCommerce qua Next.js proxy để tránh CORS.
 * P5.4 Security: Credentials được load server-side từ DB.
 * Frontend KHÔNG gửi consumer_key/consumer_secret trong URL.
 */
async function wooCommerceRequest<T>(
  endpoint: string,
  _config: WooCommerceConfig,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const proxyUrl = `/api/woo${endpoint}`;

    // P5.4: Credentials loaded server-side from DB — no query params needed
    const response = await fetch(proxyUrl, {
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
        console.debug("[WooCommerce]", response.status, endpoint, "|", text.slice(0, 300));
      }
      data = text ? JSON.parse(text) as T : undefined;
    } else {
      const text = await response.text();
      if (typeof window !== "undefined") {
        console.debug("[WooCommerce]", response.status, endpoint, "|", text.slice(0, 300));
      }
      data = text as unknown as T;
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      if (typeof data === "object" && data !== null) {
        const obj = data as Record<string, unknown>;
        errorMsg = (obj.message as string) || (obj.error as string) || errorMsg;
      } else if (typeof data === "string" && data) {
        errorMsg = data.length > 200 ? data.slice(0, 200) + "..." : data;
      }
      return {
        success: false,
        error: errorMsg,
      };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Network error: ${message}` };
  }
}

/**
 * Test connection to WooCommerce REST API.
 */
export async function testConnection(
  config: WooCommerceConfig
): Promise<ConnectionState> {
  if (!config.wordpressUrl) {
    return {
      status: "failed",
      message: "Vui lòng nhập WordPress API URL",
      testedAt: new Date().toISOString(),
    };
  }
  if (!config.consumerKey || !config.consumerSecret) {
    return {
      status: "failed",
      message: "Vui lòng nhập Consumer Key và Secret",
      testedAt: new Date().toISOString(),
    };
  }
  if (!config.wordpressUrl.includes("wp-json")) {
    return {
      status: "failed",
      message: "WordPress URL phải chứa /wp-json",
      testedAt: new Date().toISOString(),
    };
  }

  const result = await wooCommerceRequest<WooCategory[]>(
    "/products/categories?per_page=1",
    config
  );

  if (result.success) {
    return {
      status: "success",
      message: "Kết nối WooCommerce thành công!",
      testedAt: new Date().toISOString(),
    };
  }

  return {
    status: "failed",
    message: result.error || "Không thể kết nối",
    testedAt: new Date().toISOString(),
  };
}

/**
 * Fetch all categories from WooCommerce with pagination.
 */
export async function fetchCategories(
  config: WooCommerceConfig,
  onPage?: (categories: WooCategory[], totalSoFar: number) => void
): Promise<ApiResponse<WooCategory[]>> {
  const allCategories: WooCategory[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await wooCommerceRequest<WooCategory[]>(
      `/products/categories?per_page=${perPage}&page=${page}&hide_empty=true`,
      config
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    allCategories.push(...result.data);

    if (onPage && result.data.length > 0) {
      onPage(result.data, allCategories.length);
    }

    if (result.data.length < perPage) {
      break;
    }

    page++;

    if (page > 50) {
      break;
    }
  }

  return { success: true, data: allCategories };
}

/**
 * Fetch all product tags from WooCommerce with pagination.
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#product-tags
 */
export async function fetchTags(
  config: WooCommerceConfig,
  onPage?: (tags: WooTag[], totalSoFar: number) => void
): Promise<ApiResponse<WooTag[]>> {
  const allTags: WooTag[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const result = await wooCommerceRequest<WooTag[]>(
      `/products/tags?per_page=${perPage}&page=${page}&hide_empty=true`,
      config
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    allTags.push(...result.data);

    if (onPage && result.data.length > 0) {
      onPage(result.data, allTags.length);
    }

    if (result.data.length < perPage) {
      break;
    }

    page++;

    if (page > 50) {
      break;
    }
  }

  return { success: true, data: allTags };
}

/**
 * Fetch all products from WooCommerce with pagination.
 */
export async function fetchProducts(
  config: WooCommerceConfig,
  page: number = 1,
  perPage: number = 100
): Promise<ApiResponse<{ products: WooProduct[]; total: number; totalPages: number }>> {
  const result = await wooCommerceRequest<WooProduct[]>(
    `/products?per_page=${perPage}&page=${page}&status=publish`,
    config
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const total = result.data.length;
  const totalPages = Math.ceil(total / perPage) || 1;

  return {
    success: true,
    data: {
      products: result.data,
      total,
      totalPages,
    },
  };
}

/**
 * Fetch all products by paginating through all pages.
 * Fetches ALL product statuses: publish, draft, pending, private, future.
 */
export async function fetchAllProducts(
  config: WooCommerceConfig,
  onProgress?: (current: number, total: number) => void,
  onPage?: (products: WooProduct[], totalSoFar: number) => void
): Promise<ApiResponse<{ products: WooProduct[]; total: number; totalPages: number }>> {
  const perPage = 100;
  const allProducts: WooProduct[] = [];
  const seen = new Set<number>();
  const wooStatuses = ["publish", "draft", "pending", "private", "future"];

  for (const status of wooStatuses) {
    let page = 1;
    while (true) {
      const result = await wooCommerceRequest<WooProduct[]>(
        `/products?per_page=${perPage}&page=${page}&status=${status}`,
        config
      );

      if (!result.success || !result.data) {
        break;
      }

      // Deduplicate: same product ID may appear in multiple statuses
      let newProducts: WooProduct[] = [];
      for (const p of result.data) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          allProducts.push(p);
          newProducts.push(p);
        }
      }

      if (onPage && newProducts.length > 0) {
        onPage(newProducts, allProducts.length);
      }

      if (result.data.length < perPage) break;
      page++;
      if (page > 50) break;
    }

    if (onProgress) {
      onProgress(allProducts.length, perPage * 50 * wooStatuses.length);
    }
  }

  return {
    success: true,
    data: {
      products: allProducts,
      total: allProducts.length,
      totalPages: 1,
    },
  };
}

/**
 * Validate product data before migration.
 */
export async function validateProducts(
  products: WooProduct[]
): Promise<PreviewValidation[]> {
  return products.map((product) => {
    const issues: PreviewValidation["issues"] = [];

    if (!product.sku) {
      issues.push({
        type: "error",
        field: "sku",
        message: "Thiếu SKU — sẽ tạo SKU tự động",
      });
    }
    if (!product.images || product.images.length === 0) {
      issues.push({
        type: "warning",
        field: "images",
        message: "Không có hình ảnh sản phẩm",
      });
    }
    if (!product.price || parseFloat(product.price) === 0) {
      issues.push({
        type: "warning",
        field: "price",
        message: "Giá sản phẩm bằng 0",
      });
    }
    if (!product.description) {
      issues.push({
        type: "warning",
        field: "description",
        message: "Không có mô tả sản phẩm",
      });
    }
    if (product.categories.length === 0) {
      issues.push({
        type: "warning",
        field: "categories",
        message: "Sản phẩm chưa được phân loại",
      });
    }
    if (product.type === "variable" && (!product.variations || product.variations.length === 0)) {
      issues.push({
        type: "error",
        field: "variations",
        message: "Sản phẩm biến thể không có biến thể nào",
      });
    }

    return {
      productId: product.id,
      productName: product.name,
      issues,
    };
  });
}

// ============================================================
// UTILITIES
// ============================================================
