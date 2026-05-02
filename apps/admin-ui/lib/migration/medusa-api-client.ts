/**
 * Medusa API Client for Migration
 *
 * Kết nối đến Medusa Admin API để tạo/update products, categories, tags.
 * Hỗ trợ JWT authentication và batch operations.
 *
 * Auth flow:
 * 1. Nếu có adminApiKey → dùng trực tiếp (API key dạng sk_)
 * 2. Nếu có email + password → authenticate để lấy JWT token
 * 3. JWT token được cache và tự động refresh khi hết hạn
 */

import type {
  MedusaMigrationConfig,
  MedusaProductForMigration,
  MedusaCategoryForMigration,
  MedusaTagForMigration,
  MedusaExistingResources,
} from "./medusa-migration-types";

import type {
  MedusaProduct,
  MedusaCategory,
  MedusaProductTag,
  CreateProductInput,
  CreateCategoryInput,
  PaginatedResponse,
} from "@/services/medusa-types";

export class MedusaApiClient {
  private config: MedusaMigrationConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MedusaMigrationConfig) {
    this.config = config;
    this.baseUrl = config.backendUrl.replace(/\/$/, "");
  }

  /**
   * Lấy access token cho request header.
   * Ưu tiên: adminApiKey (JWT eyJ... hoặc API key sk_) > JWT auth (email/password)
   */
  private async getAccessToken(): Promise<string> {
    // Nếu có adminApiKey dạng sk_ → dùng trực tiếp (API key)
    if (this.config.adminApiKey && this.config.adminApiKey.startsWith("sk_")) {
      return this.config.adminApiKey;
    }

    // Nếu có adminApiKey dạng JWT (eyJ...) → dùng trực tiếp
    if (this.config.adminApiKey && this.config.adminApiKey.startsWith("eyJ")) {
      return this.config.adminApiKey;
    }

    // Nếu có JWT đang valid → dùng JWT
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Nếu có email + password → authenticate để lấy JWT
    if (this.config.adminEmail && this.config.adminPassword) {
      await this.authenticateWithCredentials(
        this.config.adminEmail,
        this.config.adminPassword
      );
      return this.accessToken!;
    }

    throw new Error(
      "Không có thông tin xác thực. Cần cung cấp adminApiKey (JWT hoặc sk_xxx) hoặc adminEmail + adminPassword."
    );
  }

  /**
   * Authenticate với email/password để lấy JWT token.
   * Medusa v2 endpoint: POST /admin/auth
   */
  private async authenticateWithCredentials(
    email: string,
    password: string
  ): Promise<void> {
    const url = `${this.baseUrl}/admin/auth`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Auth failed (${response.status}): ${errorBody}`);
      }

      const data = await response.json() as {
        user?: { email: string };
        access_token?: string;
        token?: string;
        expires_at?: number;
      };

      // Medusa có thể trả về access_token hoặc token
      this.accessToken = data.access_token || data.token || "";
      if (!this.accessToken) {
        throw new Error("Auth response không có access_token");
      }

      // JWT token Medusa thường hết hạn sau 24h (86400000ms)
      // Nếu server trả expires_at → dùng nó, không thì mặc định 23h
      this.tokenExpiresAt = data.expires_at
        ? data.expires_at * 1000
        : Date.now() + 23 * 60 * 60 * 1000;

      console.log(`[MedusaAPI] Authenticated as ${email}`);
    } catch (error) {
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Lấy headers cho request, tự động xử lý auth.
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-medusa-source": "migration-tool",
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 0
  ): Promise<T> {
    const url = `${this.baseUrl}/admin${endpoint}`;
    const headers = await this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      // Nếu 401 → thử authenticate lại (nếu dùng JWT)
      if (response.status === 401 && this.config.adminEmail && this.config.adminPassword) {
        console.log("[MedusaAPI] Token expired, re-authenticating...");
        this.accessToken = null;
        this.tokenExpiresAt = 0;
        const newHeaders = await this.getHeaders();
        const retryRes = await fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        });
        if (!retryRes.ok) {
          const errorBody = await retryRes.text();
          throw new Error(`HTTP ${retryRes.status}: ${errorBody}`);
        }
        if (retryRes.status === 204) return {} as T;
        return retryRes.json();
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      if (response.status === 204) return {} as T;

      return await response.json();
    } catch (error: unknown) {
      if (
        retries < this.config.retryAttempts &&
        (error instanceof Error) &&
        !error.message.includes("401") &&
        !error.message.includes("authenticate")
      ) {
        const delay = this.config.retryDelay * Math.pow(2, retries);
        await this.sleep(delay);
        return this.request<T>(endpoint, options, retries + 1);
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<{ user: unknown }>("/users/me");
      return true;
    } catch {
      return false;
    }
  }

  async getExistingResources(): Promise<MedusaExistingResources> {
    const [categories, tags, products] = await Promise.all([
      this.getAllCategories(),
      this.getAllTags(),
      this.getAllProducts(),
    ]);

    return { categories, tags, products };
  }

  async getAllCategories(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.request<PaginatedResponse<MedusaCategory>>(
        `/product-categories?limit=${limit}&offset=${offset}`
      );

      const cats = response.product_categories || [];
      cats.forEach((cat: MedusaCategory) => {
        if (cat.handle) map.set(cat.handle, cat.id);
        if (cat.slug) map.set(cat.slug, cat.id);
        if (cat.name) map.set(cat.name.toLowerCase(), cat.id);
      });

      if (cats.length < limit) break;
      offset += limit;
    }

    return map;
  }

  async getAllTags(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.request<PaginatedResponse<MedusaProductTag>>(
        `/product-tags?limit=${limit}&offset=${offset}`
      );

      const tags = response.product_tags || [];
      tags.forEach((tag: MedusaProductTag) => {
        map.set(tag.value.toLowerCase(), tag.id);
        map.set(tag.value, tag.id);
      });

      if (tags.length < limit) break;
      offset += limit;
    }

    return map;
  }

  async getAllProducts(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.request<PaginatedResponse<MedusaProduct>>(
        `/products?limit=${limit}&offset=${offset}`
      );

      const prods = response.products || [];
      prods.forEach((prod: MedusaProduct) => {
        if (prod.handle) map.set(prod.handle, prod.id);
        if ((prod.metadata as Record<string, unknown>)?.wooId)
          map.set(`woo_${(prod.metadata as Record<string, unknown>).wooId}`, prod.id);
        if ((prod.metadata as Record<string, unknown>)?.sourceId)
          map.set(`src_${(prod.metadata as Record<string, unknown>).sourceId}`, prod.id);
      });

      if (prods.length < limit) break;
      offset += limit;
    }

    return map;
  }

  async getCategoryByHandle(handle: string): Promise<MedusaCategory | null> {
    try {
      const response = await this.request<{ product_category: MedusaCategory }>(
        `/product-categories/${handle}?fields=*`
      );
      return response.product_category;
    } catch {
      return null;
    }
  }

  async getProductByHandle(handle: string): Promise<MedusaProduct | null> {
    try {
      const response = await this.request<{ product: MedusaProduct }>(
        `/products/${handle}?fields=*`
      );
      return response.product;
    } catch {
      return null;
    }
  }

  async findProductBySku(sku: string): Promise<MedusaProduct | null> {
    try {
      const response = await this.request<{ products: MedusaProduct[] }>(
        `/products?q=${encodeURIComponent(sku)}&limit=10`
      );
      const found = (response.products || []).find(
        (p) => p.variants?.some((v) => v.sku === sku)
      );
      return found || null;
    } catch {
      return null;
    }
  }

  async createCategory(input: CreateCategoryInput): Promise<MedusaCategory> {
    const response = await this.request<{ product_category: MedusaCategory }>(
      "/product-categories",
      {
        method: "POST",
        body: JSON.stringify({ product_category: input }),
      }
    );
    return response.product_category;
  }

  async createCategoriesBatch(
    categories: CreateCategoryInput[],
    catMapping?: Record<number, string>
  ): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();
    const batchSize = 10;

    for (let i = 0; i < categories.length; i += batchSize) {
      const batch = categories.slice(i, i + batchSize);

      try {
        const response = await this.request<{ product_categories: MedusaCategory[] }>(
          "/product-categories",
          {
            method: "POST",
            body: JSON.stringify({ product_categories: batch }),
          }
        );

        response.product_categories.forEach((cat) => {
          resultMap.set(cat.handle || cat.name, cat.id);
          if (cat.slug) resultMap.set(cat.slug, cat.id);
        });
      } catch (error) {
        console.error(
          `[MedusaAPI] Batch category creation failed:`,
          error
        );
        for (const cat of batch) {
          try {
            const created = await this.createCategory(cat);
            resultMap.set(created.handle || created.name, created.id);
          } catch (e) {
            console.error(
              `[MedusaAPI] Failed to create category "${cat.name}":`,
              e
            );
          }
        }
      }
    }

    return resultMap;
  }

  async updateCategory(
    id: string,
    input: Partial<CreateCategoryInput>
  ): Promise<MedusaCategory> {
    const response = await this.request<{ product_category: MedusaCategory }>(
      `/product-categories/${id}`,
      {
        method: "POST",
        body: JSON.stringify({ product_category: input }),
      }
    );
    return response.product_category;
  }

  async createTag(value: string): Promise<MedusaProductTag> {
    const response = await this.request<{ product_tag: MedusaProductTag }>(
      "/product-tags",
      {
        method: "POST",
        body: JSON.stringify({ product_tag: { value } }),
      }
    );
    return response.product_tag;
  }

  async createTagsBatch(values: string[]): Promise<Map<string, string>> {
    if (values.length === 0) return new Map();

    try {
      const response = await this.request<{ product_tags: MedusaProductTag[] }>(
        "/product-tags",
        {
          method: "POST",
          body: JSON.stringify({
            product_tags: values.map((v) => ({ value: v })),
          }),
        }
      );

      const map = new Map<string, string>();
      response.product_tags.forEach((tag) => {
        map.set(tag.value.toLowerCase(), tag.id);
        map.set(tag.value, tag.id);
      });
      return map;
    } catch (error) {
      console.error(
        `[MedusaAPI] Batch tag creation failed, trying one by one:`,
        error
      );
      const map = new Map<string, string>();
      for (const value of values) {
        try {
          const tag = await this.createTag(value);
          map.set(tag.value.toLowerCase(), tag.id);
        } catch (e) {
          console.error(
            `[MedusaAPI] Failed to create tag "${value}":`,
            e
          );
        }
      }
      return map;
    }
  }

  async createProduct(input: CreateProductInput): Promise<MedusaProduct> {
    // Debug: log payload summary
    console.log(`[MedusaAPI] Creating product: "${input.title}"`);
    console.log(`  status=${input.status}, categories=${input.categories?.length}, variants=${input.variants?.length}, tags=${input.tags?.length}`);
    if (input.categories && input.categories.length > 0) {
      console.log(`  category IDs: ${JSON.stringify(input.categories)}`);
    }
    if (input.variants && input.variants.length > 0) {
      console.log(`  variant[0]: price=${input.variants[0].price}, inventory=${input.variants[0].inventory_quantity}`);
    }

    const response = await this.request<{ product: MedusaProduct }>(
      "/products",
      {
        method: "POST",
        body: JSON.stringify({ product: input }),
      }
    );
    return response.product;
  }

  async createProductsBatch(
    products: CreateProductInput[],
    wooIds?: number[]
  ): Promise<{ ids: string[]; created: number; failed: number; errors: { index: number; message: string }[] }> {
    const ids: string[] = [];
    const errors: { index: number; message: string }[] = [];
    let created = 0;
    let failed = 0;

    // Tạo từng sản phẩm một để đảm bảo Medusa nhận đầy đủ data
    // (batch API có thể bị Medusa validate cắt bớt fields)
    for (let i = 0; i < products.length; i++) {
      const prod = products[i];
      try {
        const createdProd = await this.createProduct(prod);
        ids.push(createdProd.id);
        created++;

        if ((i + 1) % 10 === 0 || i === products.length - 1) {
          console.log(`[MedusaAPI] Created ${created}/${products.length} products...`);
        }
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ index: i, message: msg });
        console.error(`[MedusaAPI] Failed to create product "${prod.title}":`, msg);
      }
    }

    return { ids, created, failed, errors };
  }

  async updateProduct(
    id: string,
    input: Partial<CreateProductInput>
  ): Promise<MedusaProduct> {
    const response = await this.request<{ product: MedusaProduct }>(
      `/products/${id}`,
      {
        method: "POST",
        body: JSON.stringify({ product: input }),
      }
    );
    return response.product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/products/${id}`, { method: "DELETE" });
  }

  async addProductImages(
    productId: string,
    images: { url: string }[]
  ): Promise<void> {
    if (images.length === 0) return;

    await this.request(`/products/${productId}/images`, {
      method: "POST",
      body: JSON.stringify({ images }),
    });
  }

  async uploadImage(
    imageUrl: string
  ): Promise<{ id: string; url: string } | null> {
    try {
      const response = await this.request<{ image: { id: string; url: string } }>(
        "/images",
        {
          method: "POST",
          body: JSON.stringify({ url: imageUrl }),
        }
      );
      return response.image;
    } catch (error) {
      console.error(
        `[MedusaAPI] Failed to upload image from ${imageUrl}:`,
        error
      );
      return null;
    }
  }

  async getStoreDefaultCurrency(): Promise<string> {
    try {
      const response = await this.request<{ store: { default_currency_code?: string } }>(
        "/store"
      );
      return response.store?.default_currency_code || "usd";
    } catch {
      return "usd";
    }
  }

  buildCategoryInput(
    name: string,
    parentId?: string,
    sourceId?: string
  ): CreateCategoryInput {
    const handle = this.slugify(name);
    return {
      name,
      handle,
      is_active: true,
      is_internal: false,
      parent_category_id: parentId,
      metadata: sourceId ? { sourceId } : undefined,
    };
  }

  buildProductInput(
    product: MedusaProductForMigration,
    categoryIds: string[],
    tagIds: { id?: string; value: string }[]
  ): CreateProductInput {
    return {
      title: product.title,
      subtitle: product.subtitle,
      description: product.description,
      handle: product.handle || this.slugify(product.title),
      status: product.status,
      is_giftcard: product.is_giftcard,
      weight: product.weight,
      length: product.length,
      height: product.height,
      width: product.width,
      thumbnail: product.thumbnail,
      categories: categoryIds.map((id) => ({ id })),
      tags: tagIds.filter((t) => t.id).length > 0 ? tagIds.filter((t) => t.id) : undefined,
      variants: product.variants.map((v) => ({
        title: v.title,
        sku: v.sku,
        ean: v.ean,
        upc: v.upc,
        barcode: v.barcode,
        price: v.price,
        original_price: v.original_price,
        inventory_quantity: v.inventory_quantity,
        allow_backorder: v.allow_backorder,
        manage_inventory: v.manage_inventory,
        weight: v.weight,
        options: v.options,
      })),
      images: product.images,
      options: product.options,
      metadata: product.metadata,
    };
  }

  slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
      .replace(/[èéẹẻẽêềếệểễ]/g, "e")
      .replace(/[ìíịỉĩ]/g, "i")
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
      .replace(/[ùúụủũưừứựửữ]/g, "u")
      .replace(/[ỳýỵỷỹ]/g, "y")
      .replace(/[đ]/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async healthCheck(): Promise<{
    connected: boolean;
    user?: string;
    store?: string;
    version?: string;
    authMethod?: string;
  }> {
    try {
      // Use /admin/users/me (always available for authenticated users)
      // Avoid /admin/store which may not exist in all Medusa v2 configurations
      const [userRes, regionRes] = await Promise.all([
        this.request<{ user: { email: string } }>("/users/me"),
        this.request<{ regions: Array<{ name: string }> }>("/regions?limit=1"),
      ]);

      const authMethod = this.config.adminApiKey?.startsWith("sk_")
        ? "API Key"
        : this.accessToken
          ? "JWT"
          : this.config.adminEmail
            ? "JWT (auth)"
            : "Unknown";

      return {
        connected: true,
        user: userRes.user?.email,
        store: regionRes.regions?.[0]?.name || "Default Store",
        version: undefined,
        authMethod,
      };
    } catch (error) {
      return { connected: false };
    }
  }
}

export function createMedusaClient(
  config: MedusaMigrationConfig
): MedusaApiClient {
  return new MedusaApiClient(config);
}
