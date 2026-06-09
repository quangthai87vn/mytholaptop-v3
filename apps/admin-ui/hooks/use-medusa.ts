"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
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
  InviteUserInput,
  CollectionFilter,
  CreateCollectionInput,
  UpdateCollectionInput,
  ProductTypeFilter,
  CreateProductTypeInput,
  UpdateProductTypeInput,
  MedusaProduct,
  MedusaCategory,
  MedusaProductTag,
  MedusaOrder,
  MedusaCustomer,
  MedusaUser,
  MedusaCollection,
  MedusaProductType,
  MedusaInvite,
  PaginatedResponse,
  MedusaApiResponse,
} from "@/services/medusa-types";

// ============================================================
// HOOKS CONFIG
// ============================================================

const STALE_TIMES = {
  products: 1000 * 60 * 2,
  categories: 1000 * 60 * 5,
  tags: 1000 * 60 * 5,
  orders: 1000 * 60,
  customers: 1000 * 60 * 3,
  users: 1000 * 60 * 5,
  stats: 1000 * 30,
};

const QUERY_KEYS = {
  products: (filter?: ProductFilter) => ["products", filter] as const,
  product: (id: string) => ["product", id] as const,
  categories: (filter?: CategoryFilter) => ["categories", filter] as const,
  category: (id: string) => ["category", id] as const,
  tags: (filter?: TagFilter) => ["tags", filter] as const,
  tag: (id: string) => ["tag", id] as const,
  collections: (filter?: CollectionFilter) => ["collections", filter] as const,
  collection: (id: string) => ["collection", id] as const,
  productTypes: (filter?: ProductTypeFilter) => ["product-types", filter] as const,
  productType: (id: string) => ["product-type", id] as const,
  orders: (filter?: OrderFilter) => ["orders", filter] as const,
  order: (id: string) => ["order", id] as const,
  customers: (filter?: CustomerFilter) => ["customers", filter] as const,
  customer: (id: string) => ["customer", id] as const,
  users: (filter?: UserFilter) => ["users", filter] as const,
  user: (id: string) => ["user", id] as const,
  stats: () => ["dashboard-stats"] as const,
  configured: () => ["medusa-configured"] as const,
} as const;

// ============================================================
// UTILITY: Medusa Config Check
// ============================================================

export function useMedusaConfigured() {
  return useQuery({
    queryKey: QUERY_KEYS.configured(),
    queryFn: async () => {
      const res = await fetch("/api/medusa/status");
      if (!res.ok) return false;
      const data = await res.json() as { configured?: boolean };
      return !!(data?.configured);
    },
    staleTime: 1000 * 60,
  });
}

// ============================================================
// DIRECT API CALLS — server reads Medusa config from DB
// Client passes empty config; /api/medusa/* routes handle auth internally
// ============================================================

async function apiGet<T>(path: string): Promise<MedusaApiResponse<T>> {
  try {
    const res = await fetch(path, { method: "GET" });
    const data = await res.json();
    if (!res.ok) return { success: false, error: (data as Record<string, unknown>).error as string || `HTTP ${res.status}`, status: res.status };
    return { success: true, data: data as T, status: res.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<MedusaApiResponse<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: (data as Record<string, unknown>).error as string || `HTTP ${res.status}`, status: res.status };
    return { success: true, data: data as T, status: res.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

async function apiDelete<T>(path: string): Promise<MedusaApiResponse<T>> {
  try {
    const res = await fetch(path, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: (data as Record<string, unknown>).error as string || `HTTP ${res.status}`, status: res.status };
    }
    return { success: true, status: res.status } as unknown as MedusaApiResponse<T>;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// ============================================================
// PRODUCTS
// ============================================================

export function useProducts(filter?: ProductFilter) {
  const { data: configured } = useMedusaConfigured();
  const isDisabled = filter !== undefined && "__skipMedusa" in filter ? !!(filter as Record<string, unknown>).__skipMedusa : false;
  return useQuery({
    queryKey: QUERY_KEYS.products(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.offset) params.set("offset", String(filter.offset));
      if (filter?.q) params.set("q", filter.q);
      if (filter?.status?.length) params.set("status", filter.status.join(","));
      if (filter?.category_id) params.set("category_id", filter.category_id);
      if (filter?.expand) params.set("expand", filter.expand);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaProduct>>(`/api/medusa/admin/products${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải sản phẩm từ Medusa.");
      return result;
    },
    staleTime: STALE_TIMES.products,
    enabled: !!configured && !isDisabled,
  });
}

export function useProduct(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.product(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Product ID is required");
      const result = await apiGet<{ product: MedusaProduct }>(`/api/medusa/admin/products/${id}`);
      if (!result.success) throw new Error(result.error || "Không thể tải sản phẩm.");
      return { success: true, data: result.data!.product };
    },
    staleTime: STALE_TIMES.products,
    enabled: !!configured && !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: CreateProductInput) => {
      const result = await apiPost<{ product: MedusaProduct }>("/api/medusa/admin/products", product);
      if (!result.success) throw new Error(result.error || "Không thể tạo sản phẩm.");
      return { success: true, data: result.data!.product };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, product }: { productId: string; product: UpdateProductInput }) => {
      const result = await apiPost<{ product: MedusaProduct }>(`/api/medusa/admin/products/${productId}`, product);
      if (!result.success) throw new Error(result.error || "Không thể cập nhật sản phẩm.");
      return { success: true, data: result.data!.product };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(variables.productId) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      return apiDelete<{ id: string; deleted: boolean }>(`/api/medusa/admin/products/${productId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); },
  });
}

// ============================================================
// SKU VALIDATION
// ============================================================

export interface SkuCheckResult {
  sku: string;
  exists: boolean;
  duplicates: Array<{ id: string; title: string }>;
}

export function useCheckSku(sku: string, excludeId?: string) {
  const { data: configured } = useMedusaConfigured();

  return useQuery({
    queryKey: ["check-sku", sku, excludeId],
    queryFn: async (): Promise<SkuCheckResult> => {
      const params = new URLSearchParams({ sku });
      if (excludeId) params.append("excludeId", excludeId);

      const response = await fetch(`/api/admin/products/check-sku?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to check SKU: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!configured && !!sku && sku.length > 0,
    staleTime: 1000 * 60,
  });
}

// ============================================================
// CATEGORIES
// ============================================================

export function useCategories(filter?: CategoryFilter) {
  const { data: configured } = useMedusaConfigured();
  const isExplicitlyDisabled = filter !== undefined && "enabled" in filter ? !filter.enabled : false;
  return useQuery({
    queryKey: QUERY_KEYS.categories(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.fields) params.set("fields", filter.fields);
      if (filter?.expand) params.set("expand", filter.expand);
      if (filter?.include_descendants_tree) params.set("include_descendants_tree", "true");
      if (filter?.parent_category_id !== undefined) {
        params.set("parent_category_id", filter.parent_category_id === null ? "null" : String(filter.parent_category_id));
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaCategory>>(`/api/medusa/admin/product-categories${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải danh mục.");
      return result;
    },
    staleTime: STALE_TIMES.categories,
    enabled: !!configured && !isExplicitlyDisabled,
  });
}

export function useCategory(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.category(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Category ID is required");
      const result = await apiGet<{ product_category: MedusaCategory }>(
        `/api/medusa/admin/product-categories/${id}?fields=*&expand=category_children`
      );
      if (!result.success) throw new Error(result.error || "Không thể tải danh mục.");
      return { success: true, data: result.data!.product_category };
    },
    staleTime: STALE_TIMES.categories,
    enabled: !!configured && !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: CreateCategoryInput) => {
      const result = await apiPost<{ product_category: { id: string } }>("/api/medusa/admin/product-categories", category);
      if (!result.success) throw new Error(result.error || "Không thể tạo danh mục.");
      return { success: true, data: { id: result.data!.product_category.id } };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, category }: { categoryId: string; category: UpdateCategoryInput }) => {
      const result = await apiPost<{ product_category: { id: string } }>(
        `/api/medusa/admin/product-categories/${categoryId}`,
        category
      );
      if (!result.success) throw new Error(result.error || "Không thể cập nhật danh mục.");
      return { success: true, data: { id: result.data!.product_category.id } };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.category(variables.categoryId) });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      return apiDelete(`/api/medusa/admin/product-categories/${categoryId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); },
  });
}

// ============================================================
// TAGS
// ============================================================

export function useTags(filter?: TagFilter) {
  const { data: configured } = useMedusaConfigured();
  const isDisabled = filter !== undefined && "__skipMedusa" in (filter as object) ? !!(filter as Record<string, unknown>).__skipMedusa : false;
  return useQuery({
    queryKey: QUERY_KEYS.tags(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.fields) params.set("fields", filter.fields);
      if (filter?.q) params.set("q", filter.q);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaProductTag>>(`/api/medusa/admin/product-tags${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải thẻ.");
      return result;
    },
    staleTime: STALE_TIMES.tags,
    enabled: !!configured && !isDisabled,
  });
}

export function useTag(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.tag(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Tag ID is required");
      const result = await apiGet<{ product_tag: MedusaProductTag }>(`/api/medusa/admin/product-tags/${id}?fields=*`);
      if (!result.success) throw new Error(result.error || "Không thể tải thẻ.");
      return { success: true, data: result.data!.product_tag };
    },
    staleTime: STALE_TIMES.tags,
    enabled: !!configured && !!id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tag: CreateTagInput) => {
      const result = await apiPost<{ product_tag: MedusaProductTag }>("/api/medusa/admin/product-tags", tag);
      if (!result.success) throw new Error(result.error || "Không thể tạo thẻ.");
      return { success: true, data: result.data!.product_tag };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, tag }: { tagId: string; tag: UpdateTagInput }) => {
      const result = await apiPost<{ product_tag: MedusaProductTag }>(`/api/medusa/admin/product-tags/${tagId}`, tag);
      if (!result.success) throw new Error(result.error || "Không thể cập nhật thẻ.");
      return { success: true, data: result.data!.product_tag };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tag(variables.tagId) });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      return apiDelete(`/api/medusa/admin/product-tags/${tagId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); },
  });
}

// ============================================================
// COLLECTIONS (BRANDS)
// ============================================================

export function useCollections(filter?: CollectionFilter) {
  const { data: configured } = useMedusaConfigured();
  const isDisabled = filter !== undefined && "__skipMedusa" in (filter as object) ? !!(filter as Record<string, unknown>).__skipMedusa : false;
  return useQuery({
    queryKey: QUERY_KEYS.collections(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.fields) params.set("fields", filter.fields);
      if (filter?.expand) params.set("expand", filter.expand);
      if (filter?.q) params.set("q", filter.q);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaCollection>>(`/api/medusa/admin/collections${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải bộ sưu tập.");
      return result;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured && !isDisabled,
  });
}

export function useCollection(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.collection(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Collection ID is required");
      const result = await apiGet<{ collection: MedusaCollection }>(`/api/medusa/admin/collections/${id}?fields=*`);
      if (!result.success) throw new Error(result.error || "Không thể tải bộ sưu tập.");
      return { success: true, data: result.data!.collection };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured && !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collection: CreateCollectionInput) => {
      const result = await apiPost<{ collection: MedusaCollection }>("/api/medusa/admin/collections", collection);
      if (!result.success) throw new Error(result.error || "Không thể tạo bộ sưu tập.");
      return { success: true, data: result.data!.collection };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collections"] }); },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, collection }: { collectionId: string; collection: UpdateCollectionInput }) => {
      const result = await apiPost<{ collection: MedusaCollection }>(
        `/api/medusa/admin/collections/${collectionId}`,
        collection
      );
      if (!result.success) throw new Error(result.error || "Không thể cập nhật bộ sưu tập.");
      return { success: true, data: result.data!.collection };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collection(variables.collectionId) });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collectionId: string) => {
      return apiDelete(`/api/medusa/admin/collections/${collectionId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collections"] }); },
  });
}

export function useDeleteCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collectionIds: string[]) => {
      const results = await Promise.all(collectionIds.map((id) => apiDelete<{ id: string }>(`/api/medusa/admin/collections/${id}`)));
      const failed = results.filter((r: MedusaApiResponse<{ id: string }>) => !r.success);
      return {
        success: failed.length === 0,
        data: results.map((r: MedusaApiResponse<{ id: string }>) => r.data).filter(Boolean) as unknown as Array<{ id: string }>,
        error: failed.length > 0 ? `${failed.length} collections failed` : undefined,
      };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collections"] }); },
  });
}

// ============================================================
// PRODUCT TYPES (ATTRIBUTES)
// ============================================================

export function useProductTypes(filter?: ProductTypeFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.productTypes(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.fields) params.set("fields", filter.fields);
      if (filter?.q) params.set("q", filter.q);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaProductType>>(`/api/medusa/admin/product-types${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải loại sản phẩm.");
      return result;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured,
  });
}

export function useProductType(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.productType(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Product type ID is required");
      const result = await apiGet<{ product_type: MedusaProductType }>(`/api/medusa/admin/product-types/${id}?fields=*`);
      if (!result.success) throw new Error(result.error || "Không thể tải loại sản phẩm.");
      return { success: true, data: result.data!.product_type };
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured && !!id,
  });
}

export function useCreateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: CreateProductTypeInput) => {
      const result = await apiPost<{ product_type: MedusaProductType }>("/api/medusa/admin/product-types", type);
      if (!result.success) throw new Error(result.error || "Không thể tạo loại sản phẩm.");
      return { success: true, data: result.data!.product_type };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product-types"] }); },
  });
}

export function useUpdateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ typeId, type }: { typeId: string; type: UpdateProductTypeInput }) => {
      const result = await apiPost<{ product_type: MedusaProductType }>(`/api/medusa/admin/product-types/${typeId}`, type);
      if (!result.success) throw new Error(result.error || "Không thể cập nhật loại sản phẩm.");
      return { success: true, data: result.data!.product_type };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productType(variables.typeId) });
    },
  });
}

export function useDeleteProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (typeId: string) => {
      return apiDelete(`/api/medusa/admin/product-types/${typeId}`);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product-types"] }); },
  });
}

export function useDeleteProductTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (typeIds: string[]) => {
      const results = await Promise.all(typeIds.map((id) => apiDelete<{ id: string }>(`/api/medusa/admin/product-types/${id}`)));
      const failed = results.filter((r: MedusaApiResponse<{ id: string }>) => !r.success);
      return {
        success: failed.length === 0,
        data: results.map((r: MedusaApiResponse<{ id: string }>) => r.data).filter(Boolean) as unknown as Array<{ id: string }>,
        error: failed.length > 0 ? `${failed.length} product types failed` : undefined,
      };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["product-types"] }); },
  });
}

// ============================================================
// ORDERS
// ============================================================

export function useOrders(filter?: OrderFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.orders(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.offset) params.set("offset", String(filter.offset));
      if (filter?.fields) params.set("fields", filter.fields);
      if (filter?.expand) params.set("expand", filter.expand);
      if (filter?.q) params.set("q", filter.q);
      if (filter?.status?.length) params.set("status", filter.status.join(","));
      if (filter?.created_at?.gte) params.set("created_at[gte]", filter.created_at.gte);
      if (filter?.created_at?.lte) params.set("created_at[lte]", filter.created_at.lte);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaOrder>>(`/api/medusa/admin/orders${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải đơn hàng.");
      return result;
    },
    staleTime: STALE_TIMES.orders,
    enabled: !!configured,
  });
}

export function useOrder(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.order(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Order ID is required");
      const result = await apiGet<{ order: MedusaOrder }>(
        `/api/medusa/admin/orders/${id}?fields=*&expand=items,customers,shipping_address,billing_address,discounts,payments`
      );
      if (!result.success) throw new Error(result.error || "Không thể tải đơn hàng.");
      return { success: true, data: result.data!.order };
    },
    staleTime: STALE_TIMES.orders,
    enabled: !!configured && !!id,
  });
}

// ============================================================
// CUSTOMERS
// ============================================================

export function useCustomers(filter?: CustomerFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.customers(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.offset) params.set("offset", String(filter.offset));
      if (filter?.fields) params.set("fields", filter.fields);
      if (filter?.expand) params.set("expand", filter.expand);
      if (filter?.q) params.set("q", filter.q);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaCustomer>>(`/api/medusa/admin/customers${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải khách hàng.");
      return result;
    },
    staleTime: STALE_TIMES.customers,
    enabled: !!configured,
  });
}

export function useCustomer(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.customer(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Customer ID is required");
      const result = await apiGet<{ customer: MedusaCustomer }>(
        `/api/medusa/admin/customers/${id}?fields=*&expand=orders,addresses`
      );
      if (!result.success) throw new Error(result.error || "Không thể tải khách hàng.");
      return { success: true, data: result.data!.customer };
    },
    staleTime: STALE_TIMES.customers,
    enabled: !!configured && !!id,
  });
}

// ============================================================
// USERS / STAFF
// ============================================================

export function useUsers(filter?: UserFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.users(filter),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter?.limit) params.set("limit", String(filter.limit));
      if (filter?.fields) params.set("fields", filter.fields);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiGet<PaginatedResponse<MedusaUser>>(`/api/medusa/admin/users${query}`);
      if (!result.success) throw new Error(result.error || "Không thể tải người dùng.");
      return result;
    },
    staleTime: STALE_TIMES.users,
    enabled: !!configured,
  });
}

export function useUser(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.user(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("User ID is required");
      const result = await apiGet<{ user: MedusaUser }>(`/api/medusa/admin/users/${id}?fields=*`);
      if (!result.success) throw new Error(result.error || "Không thể tải người dùng.");
      return { success: true, data: result.data!.user };
    },
    staleTime: STALE_TIMES.users,
    enabled: !!configured && !!id,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invite: InviteUserInput) => {
      const result = await apiPost<{ invite: MedusaInvite }>("/api/medusa/admin/invites", invite);
      if (!result.success) throw new Error(result.error || "Không thể mời người dùng.");
      return { success: true, data: result.data!.invite };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); },
  });
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export function useDashboardStats() {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.stats(),
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split("T")[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const [ordersRes, productsRes, customersRes] = await Promise.all([
        apiGet<PaginatedResponse<MedusaOrder>>(`/api/medusa/admin/orders?limit=1000&created_at[gte]=${monthStart}`),
        apiGet<PaginatedResponse<MedusaProduct>>("/api/medusa/admin/products?limit=1"),
        apiGet<PaginatedResponse<MedusaCustomer>>("/api/medusa/admin/customers?limit=1"),
      ]);

      if (!ordersRes.success || !productsRes.success || !customersRes.success) {
        throw new Error("Failed to fetch dashboard data");
      }

      const orders = ordersRes.data?.orders || [];
      const todayOrders = orders.filter((o: MedusaOrder) => (o.created_at as string).startsWith(todayStart));
      const todayRevenue = todayOrders.reduce((sum: number, o: MedusaOrder) => sum + (o.total || 0), 0);
      const monthRevenue = orders.reduce((sum: number, o: MedusaOrder) => sum + (o.total || 0), 0);

      return {
        success: true,
        data: {
          todayRevenue: todayRevenue / 100,
          todayOrders: todayOrders.length,
          monthRevenue: monthRevenue / 100,
          monthOrders: orders.length,
          totalProducts: productsRes.data?.count || 0,
          totalCustomers: customersRes.data?.count || 0,
        },
      };
    },
    staleTime: STALE_TIMES.stats,
    refetchInterval: STALE_TIMES.stats,
    enabled: !!configured,
  });
}

// ============================================================
// PRODUCT DATA SOURCE
// ============================================================

export type ProductDataSource = "medusa" | "woocommerce";

export function useProductDataSource() {
  return useQuery({
    queryKey: ["product-data-source"] as const,
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) return "woocommerce" as const;
      const data = await res.json() as { product_data_source?: ProductDataSource };
      return (data.product_data_source as ProductDataSource) ?? "woocommerce";
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================
// WOOCOMMERCE PRODUCTS — fetches ALL products across pages
// ============================================================

export function useWooCommerceProductsAll() {
  return useQuery({
    queryKey: ["woocommerce-products-all"] as const,
    queryFn: async () => {
      const allProducts: import("@/lib/products/product-filters").WooProduct[] = [];
      let page = 1;
      const perPage = 100;
      const maxPages = 100; // safety limit

      while (page <= maxPages) {
        const res = await fetch(
          `/api/woo/products?per_page=${perPage}&page=${page}`
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
          if (page === 1) {
            throw new Error((err.error as string) || "Không thể tải sản phẩm từ WooCommerce.");
          }
          break; // stop pagination on error after page 1
        }
        const data = await res.json();
        const products = data as unknown as import("@/lib/products/product-filters").WooProduct[];

        if (!Array.isArray(products) || products.length === 0) break;

        allProducts.push(...products);

        if (products.length < perPage) break; // last page
        page++;
      }

      return allProducts;
    },
    staleTime: STALE_TIMES.products,
  });
}

/** @deprecated Use useWooCommerceProductsAll() instead — this single-page hook only gets first 100 products */
export function useWooCommerceProducts(params?: {
  per_page?: number;
  page?: number;
  orderby?: string;
  order?: "asc" | "desc";
  category?: number;
  search?: string;
  status?: string;
}) {
  const { per_page = 100, page = 1, orderby, order, category, search, status } = params ?? {};
  return useQuery({
    queryKey: ["woocommerce-products", per_page, page, orderby, order, category, search, status] as const,
    queryFn: async () => {
      const queryParts = [`per_page=${per_page}`, `page=${page}`];
      if (orderby) queryParts.push(`orderby=${orderby}`);
      if (order) queryParts.push(`order=${order}`);
      if (category) queryParts.push(`category=${category}`);
      if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
      if (status) queryParts.push(`status=${status}`);
      const query = queryParts.join("&");
      const res = await fetch(`/api/woo/products?${query}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Không thể tải sản phẩm từ WooCommerce.");
      }
      const data = await res.json();
      return data as unknown as import("@/lib/products/product-filters").WooProduct[];
    },
    staleTime: STALE_TIMES.products,
  });
}

export function useWooCommerceConfigured() {
  return useQuery({
    queryKey: ["woocommerce-configured"] as const,
    queryFn: async () => {
      const res = await fetch("/api/woo/products?per_page=1");
      if (!res.ok) return false;
      return true;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

// ============================================================
// WOOCOMMERCE CATEGORIES
// ============================================================

export function useWooCommerceCategories(params?: { per_page?: number; hide_empty?: boolean }) {
  const { per_page = 100, hide_empty = true } = params ?? {};
  return useQuery({
    queryKey: ["woocommerce-categories", per_page, hide_empty] as const,
    queryFn: async () => {
      const res = await fetch(
        `/api/woo/products/categories?per_page=${per_page}&hide_empty=${hide_empty}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Không thể tải danh mục từ WooCommerce.");
      }
      const data = await res.json();
      return data as unknown as import("@/lib/products/product-filters").WooCategory[];
    },
    staleTime: STALE_TIMES.categories,
  });
}

// ============================================================
// WOOCOMMERCE TAGS
// ============================================================

export interface WooTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export function useWooCommerceTags(params?: { per_page?: number }) {
  const { per_page = 100 } = params ?? {};
  return useQuery({
    queryKey: ["woocommerce-tags", per_page] as const,
    queryFn: async () => {
      const res = await fetch(
        `/api/woo/products/tags?per_page=${per_page}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Không thể tải thẻ từ WooCommerce.");
      }
      const data = await res.json();
      return data as unknown as WooTag[];
    },
    staleTime: STALE_TIMES.tags,
  });
}

// ============================================================
// WOOCOMMERCE PRODUCT UPDATE
// ============================================================

export interface WooProductUpdatePayload {
  name?: string;
  status?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  manage_stock?: boolean;
  stock_quantity?: number;
  short_description?: string;
  description?: string;
  categories?: Array<{ id: number }>;
  tags?: Array<{ id: number }>;
  images?: Array<{ id?: number; src?: string; position?: number }>;
}

export function useUpdateWooCommerceProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: WooProductUpdatePayload;
    }) => {
      const res = await fetch(`/api/woo/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Không thể cập nhật sản phẩm WooCommerce.");
      }
      return res.json() as Promise<import("@/lib/products/product-filters").WooProduct>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-products"] });
    },
  });
}

// ============================================================
// WOOCOMMERCE SINGLE PRODUCT FETCH
// ============================================================

export function useWooCommerceProduct(id: string | null) {
  return useQuery({
    queryKey: ["woocommerce-product", id] as const,
    queryFn: async () => {
      if (!id) throw new Error("Product ID is required");
      const res = await fetch(`/api/woo/products/${id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Không thể tải sản phẩm WooCommerce.");
      }
      return res.json() as Promise<import("@/lib/products/product-filters").WooProduct>;
    },
    staleTime: STALE_TIMES.products,
    enabled: !!id,
  });
}

// ============================================================
// WORDPRESS MEDIA LIBRARY
// ============================================================

export interface WpMediaItem {
  id: number;
  source_url: string;
  title: { rendered: string };
  alt_text: string;
  mime_type: string;
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
}

export interface WpMediaListResponse {
  items: WpMediaItem[];
  totalPages: number;
  totalItems: number;
}

export function useWordPressMediaLibrary(params: {
  page?: number;
  perPage?: number;
  search?: string;
  enabled?: boolean;
}) {
  const { page = 1, perPage = 60, search = "", enabled = true } = params;
  return useQuery({
    queryKey: ["wordpress-media", page, perPage, search] as const,
    queryFn: async (): Promise<WpMediaListResponse> => {
      const query = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        search,
      });
      const res = await fetch(`/api/wordpress-media?${query.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Không thể tải thư viện WordPress Media.");
      }
      return res.json();
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useWordPressMediaUpload() {
  return useMutation({
    mutationFn: async (data: { file: File; title?: string }) => {
      const form = new FormData();
      form.append("file", data.file);
      if (data.title) form.append("title", data.title);
      const res = await fetch("/api/wordpress-media", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as Record<string, unknown>;
        throw new Error((err.error as string) || "Upload ảnh thất bại.");
      }
      return res.json() as Promise<{ id: number; source_url: string; title: string; alt: string }>;
    },
  });
}
