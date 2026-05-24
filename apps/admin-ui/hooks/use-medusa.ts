"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMedusaSettings } from "@/services/medusa-settings";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  listTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  listOrders,
  getOrder,
  listCustomers,
  getCustomer,
  listUsers,
  getUser,
  inviteUser,
  getDashboardStats,
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  deleteCollections,
  listProductTypes,
  getProductType,
  createProductType,
  updateProductType,
  deleteProductType,
  deleteProductTypes,
} from "@/services/medusa-api.service";
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
      const config = await getMedusaSettings();
      return !!config;
    },
    staleTime: 1000 * 60,
  });
}

// ============================================================
// PRODUCTS
// ============================================================

export function useProducts(filter?: ProductFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.products(filter),
    queryFn: async () => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listProducts(config, filter);
    },
    staleTime: STALE_TIMES.products,
    enabled: !!configured,
  });
}

export function useProduct(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.product(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Product ID is required");
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getProduct(config, id);
    },
    staleTime: STALE_TIMES.products,
    enabled: !!configured && !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: CreateProductInput) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return createProduct(config, product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      product,
    }: {
      productId: string;
      product: UpdateProductInput;
    }) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return updateProduct(config, productId, product);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.product(variables.productId),
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteProduct(config, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");

      // Call our API route to check SKU
      const params = new URLSearchParams({ sku });
      if (excludeId) params.append("excludeId", excludeId);

      const response = await fetch(`/api/admin/products/check-sku?${params}`, {
        headers: {
          "x-medusa-config": JSON.stringify(config),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check SKU: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!configured && !!sku && sku.length > 0,
    staleTime: 1000 * 60, // Cache for 1 minute
  });
}

// ============================================================
// CATEGORIES
// ============================================================

export function useCategories(filter?: CategoryFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.categories(filter),
    queryFn: async () => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listCategories(config, filter);
    },
    staleTime: STALE_TIMES.categories,
    enabled: !!configured,
  });
}

export function useCategory(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.category(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Category ID is required");
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getCategory(config, id);
    },
    staleTime: STALE_TIMES.categories,
    enabled: !!configured && !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: CreateCategoryInput) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return createCategory(config, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      category,
    }: {
      categoryId: string;
      category: UpdateCategoryInput;
    }) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return updateCategory(config, categoryId, category);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.category(variables.categoryId),
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteCategory(config, categoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

// ============================================================
// TAGS
// ============================================================

export function useTags(filter?: TagFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.tags(filter),
    queryFn: async () => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listTags(config, filter);
    },
    staleTime: STALE_TIMES.tags,
    enabled: !!configured,
  });
}

export function useTag(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.tag(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Tag ID is required");
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getTag(config, id);
    },
    staleTime: STALE_TIMES.tags,
    enabled: !!configured && !!id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tag: CreateTagInput) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return createTag(config, tag);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tagId,
      tag,
    }: {
      tagId: string;
      tag: UpdateTagInput;
    }) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return updateTag(config, tagId, tag);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tag(variables.tagId),
      });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteTag(config, tagId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

// ============================================================
// COLLECTIONS (BRANDS)
// ============================================================

export function useCollections(filter?: CollectionFilter) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.collections(filter),
    queryFn: async () => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listCollections(config, filter);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured,
  });
}

export function useCollection(id: string | null) {
  const { data: configured } = useMedusaConfigured();
  return useQuery({
    queryKey: QUERY_KEYS.collection(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("Collection ID is required");
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getCollection(config, id);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured && !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collection: CreateCollectionInput) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return createCollection(config, collection);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      collectionId,
      collection,
    }: {
      collectionId: string;
      collection: UpdateCollectionInput;
    }) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return updateCollection(config, collectionId, collection);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.collection(variables.collectionId),
      });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collectionId: string) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteCollection(config, collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useDeleteCollections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collectionIds: string[]) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteCollections(config, collectionIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listProductTypes(config, filter);
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getProductType(config, id);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!configured && !!id,
  });
}

export function useCreateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (type: CreateProductTypeInput) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return createProductType(config, type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
    },
  });
}

export function useUpdateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      typeId,
      type,
    }: {
      typeId: string;
      type: UpdateProductTypeInput;
    }) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return updateProductType(config, typeId, type);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.productType(variables.typeId),
      });
    },
  });
}

export function useDeleteProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (typeId: string) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteProductType(config, typeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
    },
  });
}

export function useDeleteProductTypes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (typeIds: string[]) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return deleteProductTypes(config, typeIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
    },
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listOrders(config, filter);
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getOrder(config, id);
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listCustomers(config, filter);
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getCustomer(config, id);
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return listUsers(config, filter);
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return getUser(config, id);
    },
    staleTime: STALE_TIMES.users,
    enabled: !!configured && !!id,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invite: InviteUserInput) => {
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa");
      return inviteUser(config, invite);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
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
      const config = await getMedusaSettings();
      if (!config) throw new Error("Chưa cấu hình Medusa. Vui lòng vào Settings để thiết lập.");
      return getDashboardStats(config);
    },
    staleTime: STALE_TIMES.stats,
    refetchInterval: STALE_TIMES.stats,
    enabled: !!configured,
  });
}
