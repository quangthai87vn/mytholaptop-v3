"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  XCircle,
  ImageIcon,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  Settings,
  Database,
  Globe,
  RefreshCcw,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  useProducts,
  useCategories,
  useDeleteProduct,
  useMedusaConfigured,
  useWooCommerceProductsAll,
  useWooCommerceConfigured,
  useWooCommerceCategories,
  useProductDataSource,
  type ProductDataSource,
} from "@/hooks/use-medusa";
import type { MedusaProduct, MedusaProductCategory } from "@/services/medusa-types";
import { toast } from "sonner";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductToolbar } from "@/components/products/product-toolbar";
import { ProductCardGrid } from "@/components/products/product-card-grid";
import { ProductsTable } from "@/components/products/products-table";
import { ProductPagination } from "@/components/products/product-pagination";
import { ProductBulkActions } from "@/components/products/product-bulk-actions";
import type { CategoryNode } from "@/components/categories/category-tree";
import {
  adaptProduct,
  adaptWooProduct,
  filterProductsBySearch,
  filterProductsByCategoryTree,
  filterProductsByStatus,
  filterProductsByStock,
  paginateProducts,
  hasActiveFilters,
  sortProducts,
  type AdaptedProduct,
  type StockStatus,
  type ProductStatus,
  type SortOption,
  type WooProduct,
  STOCK_STATUS_LABELS,
  MEDUSA_STATUS_LABELS,
  getStockBadgeVariant,
  getStatusVariant,
  getSourceStatusLabel,
} from "@/lib/products/product-filters";

const LS_VIEW_MODE_KEY = "admin-ui.products.viewMode";
const LS_PAGE_SIZE_KEY = "admin-ui.products.pageSize";
const LS_COLUMNS_KEY = "admin-ui.products.columns";
const LS_SORT_KEY = "admin-ui.products.sort";

function flattenCategories(cats: MedusaProductCategory[]): MedusaProductCategory[] {
  const result: MedusaProductCategory[] = [];
  function traverse(cat: MedusaProductCategory) {
    result.push(cat);
    if (cat.category_children && cat.category_children.length > 0) {
      cat.category_children.forEach((child) => traverse(child));
    }
  }
  cats.forEach((cat) => traverse(cat));
  return result;
}

function buildCategoryTree(cats: MedusaProductCategory[]): CategoryNode[] {
  const flat = flattenCategories(cats);
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  flat.forEach((cat) => {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      handle: cat.handle || cat.slug || "",
      description: cat.description || "",
      is_active: cat.is_active ?? true,
      parent_category_id: cat.parent_category_id || "",
      level: 0,
      children: [],
      wooId: (cat as any).metadata?.originalId || undefined,
    });
  });

  flat.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_category_id && map.has(cat.parent_category_id)) {
      const parent = map.get(cat.parent_category_id)!;
      node.level = parent.level + 1;
      if (!parent.children.some((c) => c.id === node.id)) {
        parent.children.push(node);
      }
    } else {
      if (!roots.some((r) => r.id === node.id)) {
        roots.push(node);
      }
    }
  });

  return roots;
}

function getCategoryNameById(nodes: CategoryNode[], id: string): string {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    const found = getCategoryNameById(node.children, id);
    if (found) return found;
  }
  return id;
}

function collectCategoryDescendants(
  nodes: CategoryNode[],
  targetId: string,
  found: Set<string> = new Set()
): Set<string> {
  for (const node of nodes) {
    if (node.id === targetId) {
      node.children.forEach((child) => {
        found.add(child.id);
        collectCategoryDescendants([child], "", found);
      });
    }
    collectCategoryDescendants(node.children, targetId, found);
  }
  return found;
}

export default function ProductsPage() {
  const router = useRouter();
  // ─── State ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus>("all");
  const [stockFilter, setStockFilter] = useState<StockStatus>("all");
  const [columns, setColumns] = useState(5);
  const [pageSize, setPageSize] = useState(30);
  const [sort, setSort] = useState<SortOption>("newest_date");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MedusaProduct | null>(null);
  const [viewProduct, setViewProduct] = useState<AdaptedProduct | null>(null);

  // ─── localStorage init ──────────────────────────────────────────────────
  useEffect(() => {
    const savedViewMode = localStorage.getItem(LS_VIEW_MODE_KEY);
    if (savedViewMode === "grid" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    }
    const savedPageSize = localStorage.getItem(LS_PAGE_SIZE_KEY);
    if (savedPageSize) {
      const parsed = parseInt(savedPageSize, 10);
      if ([30, 60, 90, 120].includes(parsed)) {
        setPageSize(parsed);
      }
    }
    const savedColumns = localStorage.getItem(LS_COLUMNS_KEY);
    if (savedColumns) {
      const parsed = parseInt(savedColumns, 10);
      if ([4, 5, 6].includes(parsed)) {
        setColumns(parsed);
      }
    }
    const savedSort = localStorage.getItem(LS_SORT_KEY);
    const validSorts: SortOption[] = [
      "newest_date", "oldest_date", "name_asc", "name_desc",
      "price_asc", "price_desc", "stock_asc",
    ];
    if (savedSort && validSorts.includes(savedSort as SortOption)) {
      setSort(savedSort as SortOption);
    }
  }, []);

  // ─── Data source routing ─────────────────────────────────────────────────
  const { data: productSource } = useProductDataSource();
  const activeSource: ProductDataSource = productSource ?? "woocommerce";
  const isMedusaSource = activeSource === "medusa";

  // ─── Medusa data ──────────────────────────────────────────────────────────
  const { data: isMedusaConfigured } = useMedusaConfigured();
  const {
    data: medusaData,
    isLoading: isMedusaLoading,
    isError: isMedusaError,
    error: medusaError,
    refetch: refetchMedusa,
  } = useProducts({
    limit: 1000,
    q: search || undefined,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
    expand: "categories,variants,images,metadata",
    __skipMedusa: !isMedusaSource,
  });

  // ─── WooCommerce data ─────────────────────────────────────────────────────
  const { data: isWooConfigured } = useWooCommerceConfigured();

  const {
    data: wooData,
    isLoading: isWooLoading,
    isError: isWooError,
    error: wooError,
    refetch: refetchWoo,
  } = useWooCommerceProductsAll();

  // ─── Categories ──────────────────────────────────────────────────────────
  // Medusa: only fetch when using Medusa source
  const {
    data: categoriesData,
    refetch: refetchMedusaCats,
  } = useCategories({
    limit: 100,
    include_descendants_tree: true,
    enabled: isMedusaSource,
  });

  // WooCommerce: fetch categories from WooCommerce when using Woo source
  const {
    data: wooCategoriesData,
    refetch: refetchWooCats,
  } = useWooCommerceCategories({ per_page: 100 });

  // Unified category tree — built from the active source
  const categoryTree = useMemo(() => {
    if (isMedusaSource) {
      const cats = categoriesData?.data?.product_categories || [];
      return buildCategoryTree(cats);
    }
    // WooCommerce: build tree from wooCategoriesData
    if (!wooCategoriesData || !Array.isArray(wooCategoriesData)) return [];
    return buildTreeFromWooCommerce(wooCategoriesData);
  }, [isMedusaSource, categoriesData, wooCategoriesData]);

  // Build CategoryNode tree from WooCommerce categories
  function buildTreeFromWooCommerce(cats: import("@/lib/products/product-filters").WooCategory[]): CategoryNode[] {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];
    cats.forEach((cat) => {
      map.set(String(cat.id), {
        id: String(cat.id),
        name: cat.name,
        handle: cat.slug || "",
        description: cat.description || "",
        is_active: true,
        parent_category_id: cat.parent ? String(cat.parent) : "",
        level: 0,
        children: [],
        wooId: String(cat.id),
      });
    });
    cats.forEach((cat) => {
      const node = map.get(String(cat.id))!;
      if (cat.parent && map.has(String(cat.parent))) {
        const parent = map.get(String(cat.parent))!;
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    const cats = categoriesData?.data?.product_categories || [];
    cats.forEach((c: any) => {
      if (c.id && c.name) map.set(c.id, c.name);
    });
    return map;
  }, [categoriesData]);

  const categoryDescendants = useMemo(
    () => collectCategoryDescendants(categoryTree, categoryFilter),
    [categoryTree, categoryFilter]
  );

  // ─── Unified data state ──────────────────────────────────────────────────
  const rawProducts = useMemo(() => {
    if (!isMedusaSource) {
      if (!wooData || !Array.isArray(wooData)) return [];
      // Build a category map from WooCommerce categories for parent/child display
      const wooCatMap = new Map<string, { name: string; parent: number }>();
      if (wooCategoriesData && Array.isArray(wooCategoriesData)) {
        wooCategoriesData.forEach((cat) => {
          wooCatMap.set(String(cat.id), { name: cat.name, parent: cat.parent });
        });
      }
      return (wooData as unknown as WooProduct[]).map((p) => adaptWooProduct(p, wooCatMap));
    }
    return (medusaData?.data?.products ?? []).map((p: MedusaProduct) => adaptProduct(p, categoryMap));
  }, [isMedusaSource, wooData, medusaData, categoryMap, wooCategoriesData]);

  const isLoading = isMedusaSource ? isMedusaLoading : isWooLoading;
  const isError = isMedusaSource ? isMedusaError : isWooError;
  const error = isMedusaSource ? medusaError : wooError;
  const refetch = isMedusaSource ? refetchMedusa : refetchWoo;
  const refetchCategories = isMedusaSource ? refetchMedusaCats : refetchWooCats;
  const totalCount = rawProducts.length;

  const adaptedProducts = rawProducts;

  // ─── Filter → Sort → Paginate ────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = adaptedProducts;
    result = filterProductsBySearch(result, search);
    result = filterProductsByCategoryTree(result, categoryFilter, categoryDescendants, categoryTree);
    result = filterProductsByStatus(result, statusFilter);
    result = filterProductsByStock(result, stockFilter);
    return result;
  }, [adaptedProducts, search, categoryFilter, statusFilter, stockFilter, categoryDescendants, categoryTree]);

  const sortedProducts = useMemo(
    () => sortProducts(filteredProducts, sort),
    [filteredProducts, sort]
  );

  const { items: paginatedProducts, total, totalPages } = useMemo(
    () => paginateProducts(sortedProducts, page, pageSize),
    [sortedProducts, page, pageSize]
  );

  const filters = useMemo(
    () => ({ search, categoryId: categoryFilter, status: statusFilter, stock: stockFilter }),
    [search, categoryFilter, statusFilter, stockFilter]
  );

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (search) labels.push(`Tìm: ${search}`);
    if (categoryFilter && categoryFilter !== "all")
      labels.push(`Danh mục: ${getCategoryNameById(categoryTree, categoryFilter)}`);
    if (statusFilter && statusFilter !== "all")
      labels.push(`Trạng thái: ${MEDUSA_STATUS_LABELS[statusFilter] || statusFilter}`);
    if (stockFilter && stockFilter !== "all")
      labels.push(`Tồn kho: ${STOCK_STATUS_LABELS[stockFilter] || stockFilter}`);
    return labels;
  }, [search, categoryFilter, statusFilter, stockFilter, categoryTree]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (productId: string) => {
    if (!confirm("Bạn có chắc muốn xoá sản phẩm này?")) return;
    const result = await deleteProduct.mutateAsync(productId);
    if (result.success) {
      toast.success("Đã xoá sản phẩm");
      refetch();
    } else {
      toast.error("Lỗi: Xóa sản phẩm thất bại");
    }
  };

  const handleSync = (productId: string) => {
    toast.info(`Đang đồng bộ sản phẩm ${productId}...`);
  };

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((value: ProductStatus) => {
    setStatusFilter(value);
    setPage(0);
  }, []);

  const handleStockChange = useCallback((value: StockStatus) => {
    setStockFilter(value);
    setPage(0);
  }, []);

  const handleColumnsChange = useCallback((value: number) => {
    setColumns(value);
    localStorage.setItem(LS_COLUMNS_KEY, String(value));
  }, []);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
    localStorage.setItem(LS_PAGE_SIZE_KEY, String(value));
    setPage(0);
  }, []);

  const handleSortChange = useCallback((value: SortOption) => {
    setSort(value);
    localStorage.setItem(LS_SORT_KEY, value);
    setPage(0);
  }, []);

  const handleViewModeChange = useCallback((value: "grid" | "list") => {
    setViewMode(value);
    localStorage.setItem(LS_VIEW_MODE_KEY, value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
    setPage(0);
  }, []);

  // ─── Selection ───────────────────────────────────────────────────────────
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleSelectPage = useCallback(
    (ids: string[]) => {
      setSelectedIds((prev) => {
        if (ids.length === 0) {
          // deselect all on page
          const next = new Set(prev);
          paginatedProducts.forEach((p) => next.delete(p.id));
          return next;
        } else {
          // select all on page
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        }
      });
    },
    [paginatedProducts]
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 min-w-0 w-full">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl truncate">
            Quản lý sản phẩm
          </h1>
          <p className="text-muted-foreground hidden sm:block text-sm">
            {totalCount > 0
              ? `${totalCount} sản phẩm`
              : "Danh sách sản phẩm trong cửa hàng"}
            {isMedusaSource ? " từ Medusa" : " từ WooCommerce"}
          </p>
        </div>
        {isMedusaSource && (
          <Button
            onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}
            className="shrink-0"
          >
            <Plus className="mr-2 size-4" />
            <span className="hidden sm:inline">Thêm sản phẩm</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <ProductToolbar
            source={activeSource}
            search={search}
            onSearchChange={handleSearchChange}
            categoryId={categoryFilter}
            onCategoryChange={handleCategoryChange}
            status={statusFilter}
            onStatusChange={handleStatusChange}
            stock={stockFilter}
            onStockChange={handleStockChange}
            columns={columns}
            pageSize={pageSize}
            sort={sort}
            viewMode={viewMode}
            onColumnsChange={handleColumnsChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onViewModeChange={handleViewModeChange}
            onRefresh={() => refetch()}
            categoryTree={categoryTree}
            hasActiveFilters={hasActiveFilters(filters)}
            filterLabels={activeFilterLabels}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Bulk actions bar — appears when items are selected */}
      <ProductBulkActions
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
      />

      {/* Source-specific not-configured banner */}
      {isMedusaSource ? (
        isMedusaConfigured === false && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-6 px-6">
              <div className="shrink-0">
                <Database className="size-10 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Chưa kết nối Medusa Backend
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Vui lòng cấu hình Medusa trong Cài đặt ứng dụng để quản lý sản phẩm.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => refetchMedusa()}>
                  Thử lại
                </Button>
                <Button size="sm" asChild>
                  <Link href="/settings/app">
                    <Settings className="mr-2 size-4" />
                    Cấu hình ứng dụng
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        isWooConfigured === false && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-6 px-6">
              <div className="shrink-0">
                <Globe className="size-10 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Chưa kết nối WooCommerce API
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Vui lòng cấu hình WooCommerce trong Cài đặt ứng dụng để hiển thị sản phẩm trực tiếp.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => refetchWoo()}>
                  Thử lại
                </Button>
                <Button size="sm" asChild>
                  <Link href="/settings/app">
                    <Settings className="mr-2 size-4" />
                    Cấu hình ứng dụng
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square rounded-none" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            {isMedusaSource ? (
              <>
                <AlertCircle className="size-10 text-destructive mb-3" />
                <p className="text-base font-medium text-destructive">
                  Không thể kết nối Medusa
                </p>
                <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                  {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa trong Cài đặt ứng dụng."}
                </p>
              </>
            ) : (
              <>
                <Globe className="size-10 text-green-500 mb-3" />
                <p className="text-base font-medium text-green-700 dark:text-green-300">
                  Không thể kết nối WooCommerce
                </p>
                <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                  {(error as Error)?.message || "Vui lòng kiểm tra cấu hình WooCommerce trong Cài đặt ứng dụng."}
                </p>
              </>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 size-4" />
                Thử lại
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings/app">
                  <Settings className="mr-2 size-4" />
                  Cài đặt ứng dụng
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredProducts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="size-12 mb-3" />
            {isMedusaSource ? (
              <>
                <p className="text-base font-medium">Chưa có sản phẩm trong Medusa.</p>
                <p className="text-sm">Vào Migration để đồng bộ từ WooCommerce, hoặc thêm sản phẩm thủ công.</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" asChild>
                    <Link href="/migration">Trang Migration</Link>
                  </Button>
                  <Button onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}>
                    <Plus className="mr-2 size-4" /> Thêm sản phẩm
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Globe className="size-12 mb-3" />
                <p className="text-base font-medium">Chưa có sản phẩm trong WooCommerce.</p>
                <p className="text-sm">Sản phẩm được hiển thị trực tiếp từ WooCommerce API.</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" asChild>
                    <Link href="/migration">Trang Migration</Link>
                  </Button>
                  <Button variant="outline" onClick={() => refetchWoo()}>
                    <RefreshCcw className="mr-2 size-4" /> Làm mới
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Products */}
      {!isLoading && !isError && filteredProducts.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <ProductCardGrid
              products={paginatedProducts}
              columns={columns}
              selectedIds={selectedIds}
              activeSource={activeSource}
              onToggleSelect={handleToggleSelect}
              onView={setViewProduct}
              onEdit={isMedusaSource ? (p) => { setEditingProduct(p.rawProduct ?? null); setProductDialogOpen(true); } : (p) => { router.push(`/products/${p.id}/woo-edit`); }}
              onDelete={handleDelete}
              onSync={handleSync}
            />
          ) : (
            <ProductsTable
              products={paginatedProducts}
              selectedIds={selectedIds}
              activeSource={activeSource}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectPage}
              onView={setViewProduct}
              onEdit={isMedusaSource ? (p) => { setEditingProduct(p.rawProduct ?? null); setProductDialogOpen(true); } : (p) => { router.push(`/products/${p.id}/woo-edit`); }}
              onDelete={handleDelete}
              onSync={handleSync}
            />
          )}

          {/* Pagination */}
          <Card>
            <CardContent className="p-3">
              <ProductPagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Product detail modal */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{viewProduct?.name || "Chi tiết sản phẩm"}</DialogTitle>
          </DialogHeader>
          {viewProduct && (
            <div className="flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Image — square */}
                <div className="relative bg-muted aspect-square">
                  {viewProduct.image ? (
                    <Image
                      src={viewProduct.image}
                      alt={viewProduct.name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <XCircle className="size-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col p-6 space-y-4">
                  {/* Source + category badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {viewProduct.category && (
                      <Badge variant="outline">{viewProduct.category}</Badge>
                    )}
                    <Badge
                      variant={viewProduct.source === "woocommerce" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {viewProduct.source === "woocommerce" ? "WooCommerce" : "Medusa"}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold">{viewProduct.name}</h2>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      SKU: <span className="font-mono">{viewProduct.sku || "—"}</span>
                    </div>
                    {viewProduct.source === "woocommerce" && (
                      <div>
                        WooCommerce ID: <span className="font-mono">{viewProduct.sourceId}</span>
                      </div>
                    )}
                    {viewProduct.source === "medusa" && (
                      <div>
                        Medusa ID: <span className="font-mono">{viewProduct.sourceId}</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    {viewProduct.price > 0 ? (
                      <>
                        <p className="text-3xl font-bold text-primary">
                          {formatCurrency(viewProduct.price)}
                        </p>
                        {viewProduct.compareAtPrice && viewProduct.compareAtPrice > viewProduct.price && (
                          <p className="text-lg text-muted-foreground line-through">
                            {formatCurrency(viewProduct.compareAtPrice)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xl text-muted-foreground">Chưa có giá</p>
                    )}
                  </div>

                  {/* Stock status */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getStockBadgeVariant(viewProduct.stock, viewProduct.stockStatus)}
                      className="gap-1"
                    >
                      {viewProduct.stock > 0 && viewProduct.stock < 999
                        ? `Còn ${viewProduct.stock}`
                        : STOCK_STATUS_LABELS[viewProduct.stockStatus] || "Còn hàng"}
                    </Badge>
                    <Badge variant={getStatusVariant(viewProduct.status)}>
                      {getSourceStatusLabel(
                        viewProduct.status,
                        viewProduct.source || activeSource
                      )}
                    </Badge>
                  </div>

                  {/* Short description */}
                  {viewProduct.description && !viewProduct.description.startsWith("<") && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {viewProduct.description}
                    </p>
                  )}

                  {/* Tags */}
                  {viewProduct.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {viewProduct.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t flex gap-2 flex-wrap">
                    {isMedusaSource ? (
                      <Button
                        onClick={() => {
                          setViewProduct(null);
                          setEditingProduct(viewProduct.rawProduct ?? null);
                          setProductDialogOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Sửa sản phẩm
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setViewProduct(null);
                          router.push(`/products/${viewProduct.id}/woo-edit`);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Sửa sản phẩm
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:text-red-600 hover:bg-red-50 gap-2"
                      onClick={() => {
                        setViewProduct(null);
                        handleDelete(viewProduct.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Xoá
                    </Button>
                  </div>
                </div>
              </div>

              {/* Full description */}
              {viewProduct.description && viewProduct.description.startsWith("<") && (
                <>
                  <Separator />
                  <div className="p-6">
                    <h4 className="font-medium mb-2">Mô tả</h4>
                    <div
                      className="prose prose-sm max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: viewProduct.description }}
                    />
                  </div>
                </>
              )}

              {/* Metadata */}
              <Separator />
              <div className="p-6 text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>ID:</strong> <code className="bg-muted px-2 py-1 rounded">{viewProduct.id}</code></p>
                    <p><strong>Nguồn:</strong> {viewProduct.source === "woocommerce" ? "WooCommerce" : "Medusa"}</p>
                    <p><strong>Ngày tạo:</strong> {viewProduct.createdAt ? new Date(viewProduct.createdAt).toLocaleDateString("vi-VN") : "—"}</p>
                  </div>
                  {viewProduct.metadata && Object.keys(viewProduct.metadata).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Metadata</h4>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(viewProduct.metadata).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-muted-foreground">{key}:</span>{" "}
                            <code className="bg-muted px-1 rounded">{value}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProductFormDialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
