/**
 * Medusa API Service - Kết nối thật đến Medusa Admin API
 *
 * Module này cung cấp typed CRUD operations cho tất cả resources:
 * Products, Categories, Tags, Orders, Customers, Users
 *
 * API Reference: https://docs.medusajs.com/api/admin
 */

import type {
  MedusaConfig,
  MedusaApiResponse,
  PaginatedResponse,
  MedusaProduct,
  MedusaCategory,
  MedusaProductTag,
  MedusaOrder,
  MedusaCustomer,
  MedusaUser,
  MedusaInvite,
  ProductFilter,
  CategoryFilter,
  TagFilter,
  OrderFilter,
  CustomerFilter,
  UserFilter,
  CreateProductInput,
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateTagInput,
  UpdateTagInput,
  CreateUserInput,
  InviteUserInput,
  DashboardStats,
} from "./medusa-types";

// ============================================================
// API CLIENT
// ============================================================

/**
 * Gọi Medusa Admin API qua proxy nội bộ.
 * Proxy route: /api/medusa/* → forward đến Medusa backend
 */
interface MedusaRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function medusaRequest<T>(
  endpoint: string,
  config: MedusaConfig,
  options: MedusaRequestOptions = {}
): Promise<MedusaApiResponse<T>> {
  try {
    // Sử dụng proxy API route với credentials trong query params
    const proxyUrl = `/api/medusa${endpoint}`;
    const separator = endpoint.includes("?") ? "&" : "?";
    const params = new URLSearchParams({
      backendUrl: config.backendUrl,
      adminApiKey: config.adminApiKey,
    });
    const url = `${proxyUrl}${separator}${params.toString()}`;

    const res = await fetch(url, {
      ...options,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return {
        success: false,
        error: `HTTP ${res.status}: ${errorBody || res.statusText}`,
        status: res.status,
      };
    }

    const data = await res.json();
    return { success: true, data, status: res.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================
// PRODUCTS
// ============================================================

export async function listProducts(
  config: MedusaConfig,
  filter?: ProductFilter
): Promise<MedusaApiResponse<PaginatedResponse<MedusaProduct>>> {
  const params = new URLSearchParams();
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  if (filter?.q) params.set("q", filter.q);
  if (filter?.status?.length) params.set("status", filter.status.join(","));
  if (filter?.category_id) params.set("category_id", filter.category_id);
  if (filter?.order) params.set("order", filter.order);
  if (filter?.fields) params.set("fields", filter.fields);
  if (filter?.expand) params.set("expand", filter.expand);

  const query = params.toString() ? `?${params.toString()}` : "";
  return medusaRequest<PaginatedResponse<MedusaProduct>>(
    `/admin/products${query}`,
    config
  );
}

export async function getProduct(
  config: MedusaConfig,
  productId: string
): Promise<MedusaApiResponse<MedusaProduct>> {
  const fields = [
    "id", "title", "status", "thumbnail", "description", "metadata",
    "categories", "tags", "variants", "images", "options", "inventory_items",
    "handle", "type", "collection", "weight", "length", "width", "height",
  ].join(",");
  const result = await medusaRequest<{ product: MedusaProduct }>(
    `/admin/products/${productId}?fields=${fields}`,
    config
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product };
  }
  return { success: false, error: result.error };
}

export async function createProduct(
  config: MedusaConfig,
  product: CreateProductInput
): Promise<MedusaApiResponse<MedusaProduct>> {
  const result = await medusaRequest<{ product: MedusaProduct }>(
    "/admin/products",
    config,
    { method: "POST", body: product }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product };
  }
  return { success: false, error: result.error };
}

export async function updateProduct(
  config: MedusaConfig,
  productId: string,
  product: UpdateProductInput
): Promise<MedusaApiResponse<MedusaProduct>> {
  const result = await medusaRequest<{ product: MedusaProduct }>(
    `/admin/products/${productId}`,
    config,
    { method: "POST", body: product }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product };
  }
  return { success: false, error: result.error };
}

export async function deleteProduct(
  config: MedusaConfig,
  productId: string
): Promise<MedusaApiResponse<{ id: string; deleted: boolean }>> {
  return medusaRequest<{ id: string; deleted: boolean }>(
    `/admin/products/${productId}`,
    config,
    { method: "DELETE" }
  );
}

export async function deleteProducts(
  config: MedusaConfig,
  productIds: string[]
): Promise<
  MedusaApiResponse<
    Array<{ id: string; object: string; deleted: boolean; parent_id?: string }>
  >
> {
  const result = await Promise.all(
    productIds.map((id) =>
      medusaRequest<
        Array<{ id: string; object: string; deleted: boolean; parent_id?: string }>
      >(`/admin/products/${id}`, config, { method: "DELETE" })
    )
  );

  const all = result.flatMap((r) => (r.data ? [r.data[0]] : []));
  const failed = result.filter((r) => !r.success);

  return {
    success: failed.length === 0,
    data: all,
    error:
      failed.length > 0 ? `${failed.length} items failed to delete` : undefined,
  };
}

export async function uploadProductImage(
  config: MedusaConfig,
  file: File
): Promise<MedusaApiResponse<{ id: string; url: string; filename: string }[]>> {
  try {
    const formData = new FormData();
    formData.append("files", file);

    const params = new URLSearchParams({
      backendUrl: config.backendUrl,
      adminApiKey: config.adminApiKey,
    });

    const res = await fetch(`/api/medusa/admin/uploads?${params}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Upload failed: ${res.statusText}`,
        status: res.status,
      };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================
// CATEGORIES
// ============================================================

export async function listCategories(
  config: MedusaConfig,
  filter?: CategoryFilter
): Promise<MedusaApiResponse<PaginatedResponse<MedusaCategory>>> {
  const params = new URLSearchParams();
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  if (filter?.fields) params.set("fields", filter.fields);
  if (filter?.expand) params.set("expand", filter.expand);
  if (filter?.include_descendants_tree)
    params.set("include_descendants_tree", "true");
  if (filter?.parent_category_id !== undefined) {
    params.set(
      "parent_category_id",
      filter.parent_category_id === null
        ? "null"
        : String(filter.parent_category_id)
    );
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return medusaRequest<PaginatedResponse<MedusaCategory>>(
    `/admin/product-categories${query}`,
    config
  );
}

export async function getCategory(
  config: MedusaConfig,
  categoryId: string
): Promise<MedusaApiResponse<MedusaCategory>> {
  const result = await medusaRequest<{ product_category: MedusaCategory }>(
    `/admin/product-categories/${categoryId}?fields=*&expand=category_children`,
    config
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product_category };
  }
  return { success: false, error: result.error };
}

export async function createCategory(
  config: MedusaConfig,
  category: CreateCategoryInput
): Promise<MedusaApiResponse<MedusaCategory>> {
  const result = await medusaRequest<{ product_category: MedusaCategory }>(
    "/admin/product-categories",
    config,
    { method: "POST", body: category }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product_category };
  }
  return { success: false, error: result.error };
}

export async function updateCategory(
  config: MedusaConfig,
  categoryId: string,
  category: UpdateCategoryInput
): Promise<MedusaApiResponse<MedusaCategory>> {
  const result = await medusaRequest<{ product_category: MedusaCategory }>(
    `/admin/product-categories/${categoryId}`,
    config,
    { method: "POST", body: category }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product_category };
  }
  return { success: false, error: result.error };
}

export async function deleteCategory(
  config: MedusaConfig,
  categoryId: string
): Promise<MedusaApiResponse<{ id: string; deleted: boolean }>> {
  return medusaRequest<{ id: string; deleted: boolean }>(
    `/admin/product-categories/${categoryId}`,
    config,
    { method: "DELETE" }
  );
}

// ============================================================
// TAGS
// ============================================================

export async function listTags(
  config: MedusaConfig,
  filter?: TagFilter
): Promise<MedusaApiResponse<PaginatedResponse<MedusaProductTag>>> {
  const params = new URLSearchParams();
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  if (filter?.fields) params.set("fields", filter.fields);
  if (filter?.q) params.set("q", filter.q);

  const query = params.toString() ? `?${params.toString()}` : "";
  return medusaRequest<PaginatedResponse<MedusaProductTag>>(
    `/admin/product-tags${query}`,
    config
  );
}

export async function getTag(
  config: MedusaConfig,
  tagId: string
): Promise<MedusaApiResponse<MedusaProductTag>> {
  const result = await medusaRequest<{ product_tag: MedusaProductTag }>(
    `/admin/product-tags/${tagId}?fields=*`,
    config
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product_tag };
  }
  return { success: false, error: result.error };
}

export async function createTag(
  config: MedusaConfig,
  tag: CreateTagInput
): Promise<MedusaApiResponse<MedusaProductTag>> {
  const result = await medusaRequest<{ product_tag: MedusaProductTag }>(
    "/admin/product-tags",
    config,
    { method: "POST", body: tag }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product_tag };
  }
  return { success: false, error: result.error };
}

export async function updateTag(
  config: MedusaConfig,
  tagId: string,
  tag: UpdateTagInput
): Promise<MedusaApiResponse<MedusaProductTag>> {
  const result = await medusaRequest<{ product_tag: MedusaProductTag }>(
    `/admin/product-tags/${tagId}`,
    config,
    {
      method: "POST",
      body: tag,
    }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.product_tag };
  }
  return { success: false, error: result.error };
}

export async function deleteTag(
  config: MedusaConfig,
  tagId: string
): Promise<MedusaApiResponse<{ id: string; deleted: boolean }>> {
  return medusaRequest<{ id: string; deleted: boolean }>(
    `/admin/product-tags/${tagId}`,
    config,
    { method: "DELETE" }
  );
}

export async function deleteTags(
  config: MedusaConfig,
  tagIds: string[]
): Promise<MedusaApiResponse<{ id: string; deleted: boolean }[]>> {
  const result = await Promise.all(
    tagIds.map((id) =>
      medusaRequest<{ id: string; deleted: boolean }>(
        `/admin/product-tags/${id}`,
        config,
        { method: "DELETE" }
      )
    )
  );

  const all = result.flatMap((r) => (r.data ? [r.data] : []));
  const failed = result.filter((r) => !r.success);

  return {
    success: failed.length === 0,
    data: all,
    error:
      failed.length > 0 ? `${failed.length} tags failed to delete` : undefined,
  };
}

// ============================================================
// ORDERS
// ============================================================

export async function listOrders(
  config: MedusaConfig,
  filter?: OrderFilter
): Promise<MedusaApiResponse<PaginatedResponse<MedusaOrder>>> {
  const params = new URLSearchParams();
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  if (filter?.fields) params.set("fields", filter.fields);
  if (filter?.expand) params.set("expand", filter.expand);
  if (filter?.q) params.set("q", filter.q);
  if (filter?.status?.length) params.set("status", filter.status.join(","));
  if (filter?.created_at?.gte)
    params.set("created_at[gte]", filter.created_at.gte);
  if (filter?.created_at?.lte)
    params.set("created_at[lte]", filter.created_at.lte);

  const query = params.toString() ? `?${params.toString()}` : "";
  return medusaRequest<PaginatedResponse<MedusaOrder>>(
    `/admin/orders${query}`,
    config
  );
}

export async function getOrder(
  config: MedusaConfig,
  orderId: string
): Promise<MedusaApiResponse<MedusaOrder>> {
  const fields =
    "fields=*,&expand=items,customers,shipping_address,billing_address,discounts,payments";
  const result = await medusaRequest<{ order: MedusaOrder }>(
    `/admin/orders/${orderId}?${fields}`,
    config
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.order };
  }
  return { success: false, error: result.error };
}

export async function updateOrder(
  config: MedusaConfig,
  orderId: string,
  data: { status?: string; metadata?: Record<string, unknown> }
): Promise<MedusaApiResponse<MedusaOrder>> {
  const result = await medusaRequest<{ order: MedusaOrder }>(
    `/admin/orders/${orderId}`,
    config,
    { method: "POST", body: data }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.order };
  }
  return { success: false, error: result.error };
}

// ============================================================
// CUSTOMERS
// ============================================================

export async function listCustomers(
  config: MedusaConfig,
  filter?: CustomerFilter
): Promise<MedusaApiResponse<PaginatedResponse<MedusaCustomer>>> {
  const params = new URLSearchParams();
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  if (filter?.fields) params.set("fields", filter.fields);
  if (filter?.expand) params.set("expand", filter.expand);
  if (filter?.q) params.set("q", filter.q);

  const query = params.toString() ? `?${params.toString()}` : "";
  return medusaRequest<PaginatedResponse<MedusaCustomer>>(
    `/admin/customers${query}`,
    config
  );
}

export async function getCustomer(
  config: MedusaConfig,
  customerId: string
): Promise<MedusaApiResponse<MedusaCustomer>> {
  const result = await medusaRequest<{ customer: MedusaCustomer }>(
    `/admin/customers/${customerId}?fields=*&expand=orders,addresses`,
    config
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.customer };
  }
  return { success: false, error: result.error };
}

// ============================================================
// USERS / STAFF
// ============================================================

export async function listUsers(
  config: MedusaConfig,
  filter?: UserFilter
): Promise<MedusaApiResponse<PaginatedResponse<MedusaUser>>> {
  const params = new URLSearchParams();
  if (filter?.limit) params.set("limit", String(filter.limit));
  if (filter?.offset) params.set("offset", String(filter.offset));
  if (filter?.fields) params.set("fields", filter.fields);

  const query = params.toString() ? `?${params.toString()}` : "";
  return medusaRequest<PaginatedResponse<MedusaUser>>(
    `/admin/users${query}`,
    config
  );
}

export async function getUser(
  config: MedusaConfig,
  userId: string
): Promise<MedusaApiResponse<MedusaUser>> {
  const result = await medusaRequest<{ user: MedusaUser }>(
    `/admin/users/${userId}?fields=*`,
    config
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.user };
  }
  return { success: false, error: result.error };
}

export async function createUser(
  config: MedusaConfig,
  user: CreateUserInput
): Promise<MedusaApiResponse<MedusaUser>> {
  const result = await medusaRequest<{ user: MedusaUser }>(
    "/admin/users",
    config,
    { method: "POST", body: user }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.user };
  }
  return { success: false, error: result.error };
}

export async function updateUser(
  config: MedusaConfig,
  userId: string,
  data: {
    first_name?: string;
    last_name?: string;
    role?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<MedusaApiResponse<MedusaUser>> {
  const result = await medusaRequest<{ user: MedusaUser }>(
    `/admin/users/${userId}`,
    config,
    { method: "POST", body: data }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.user };
  }
  return { success: false, error: result.error };
}

export async function deleteUser(
  config: MedusaConfig,
  userId: string
): Promise<MedusaApiResponse<{ id: string; deleted: boolean }>> {
  return medusaRequest<{ id: string; deleted: boolean }>(
    `/admin/users/${userId}`,
    config,
    { method: "DELETE" }
  );
}

export async function inviteUser(
  config: MedusaConfig,
  invite: InviteUserInput
): Promise<MedusaApiResponse<MedusaInvite>> {
  const result = await medusaRequest<{ invite: MedusaInvite }>(
    "/admin/invites",
    config,
    { method: "POST", body: invite }
  );
  if (result.success && result.data) {
    return { success: true, data: result.data.invite };
  }
  return { success: false, error: result.error };
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(
  config: MedusaConfig
): Promise<MedusaApiResponse<DashboardStats>> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      .toISOString()
      .split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const [ordersRes, productsRes, customersRes] = await Promise.all([
      listOrders(config, {
        limit: 1000,
        created_at: { gte: monthStart },
      }),
      listProducts(config, { limit: 1 }),
      listCustomers(config, { limit: 1 }),
    ]);

    if (!ordersRes.success || !productsRes.success || !customersRes.success) {
      return {
        success: false,
        error: "Failed to fetch dashboard data",
      };
    }

    const orders = ordersRes.data?.orders || [];
    const todayOrders = orders.filter((o) =>
      (o.created_at as string).startsWith(todayStart)
    );

    const todayRevenue = todayOrders.reduce(
      (sum: number, o: MedusaOrder) => sum + (o.total || 0),
      0
    );

    const monthRevenue = orders.reduce(
      (sum: number, o: MedusaOrder) => sum + (o.total || 0),
      0
    );

    const newCustomers = customersRes.data?.count || 0;

    return {
      success: true,
      data: {
        todayRevenue: todayRevenue / 100,
        todayOrders: todayOrders.length,
        monthRevenue: monthRevenue / 100,
        monthOrders: orders.length,
        totalProducts: productsRes.data?.count || 0,
        totalCustomers: newCustomers,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
