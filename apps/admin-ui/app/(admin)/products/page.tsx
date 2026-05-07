"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  XCircle,
  ImageIcon,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
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
import { useProducts, useDeleteProduct } from "@/hooks/use-medusa";
import { useCategories } from "@/hooks/use-medusa";
import type { MedusaProduct, MedusaProductCategory } from "@/services/medusa-types";
import { toast } from "sonner";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductToolbar } from "@/components/products/product-toolbar";
import { ProductCardGrid } from "@/components/products/product-card-grid";
import { ProductPagination } from "@/components/products/product-pagination";
import type { CategoryNode } from "@/components/categories/category-tree";
import {
  adaptProduct,
  filterProductsBySearch,
  filterProductsByCategoryTree,
  filterProductsByStatus,
  filterProductsByStock,
  paginateProducts,
  hasActiveFilters,
  type AdaptedProduct,
  type StockStatus,
  type ProductStatus,
  STOCK_STATUS_LABELS,
  MEDUSA_STATUS_LABELS,
  getStockBadgeVariant,
  getStatusVariant,
} from "@/lib/products/product-filters";

const DEFAULT_PAGE_SIZE = 30;
const LS_PAGE_SIZE_KEY = "admin-ui.products.pageSize";

/**
 * Build a category tree from flat list + handle include_descendants_tree.
 */
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

function buildCategoryTree(
  cats: MedusaProductCategory[]
): CategoryNode[] {
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

function collectCategoryDescendants(nodes: CategoryNode[], targetId: string, found: Set<string> = new Set()): Set<string> {
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
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus>("all");
  const [stockFilter, setStockFilter] = useState<StockStatus>("all");
  const [columns, setColumns] = useState(5);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MedusaProduct | null>(null);
  const [viewProduct, setViewProduct] = useState<AdaptedProduct | null>(null);

  useEffect(() => {
    const savedPageSize = localStorage.getItem(LS_PAGE_SIZE_KEY);
    if (savedPageSize) {
      const parsed = parseInt(savedPageSize, 10);
      if ([20, 30, 50, 100].includes(parsed)) setPageSize(parsed);
    }
  }, []);

  const { data, isLoading, isError, error, refetch } = useProducts({
    limit: 1000,
    q: search || undefined,
    status: statusFilter !== "all" ? [statusFilter] : undefined,
    expand: "categories,variants,images,metadata",
  });

  const { data: categoriesData } = useCategories({
    limit: 100,
    include_descendants_tree: true,
  });

  const rawProducts = data?.data?.products ?? [];
  const totalCount = data?.data?.count ?? rawProducts.length;

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    const cats = categoriesData?.data?.product_categories || [];
    cats.forEach((c: any) => {
      if (c.id && c.name) map.set(c.id, c.name);
    });
    return map;
  }, [categoriesData]);

  const adaptedProducts = useMemo(
    () => rawProducts.map((p: MedusaProduct) => adaptProduct(p, categoryMap)),
    [rawProducts, categoryMap]
  );

  const categoryTree = useMemo(
    () => buildCategoryTree(categoriesData?.data?.product_categories || []),
    [categoriesData]
  );

  const categoryDescendants = useMemo(
    () => collectCategoryDescendants(categoryTree, categoryFilter),
    [categoryTree, categoryFilter]
  );

  const filteredProducts = useMemo(() => {
    let result = adaptedProducts;
    result = filterProductsBySearch(result, search);
    result = filterProductsByCategoryTree(result, categoryFilter, categoryDescendants, categoryTree);
    result = filterProductsByStatus(result, statusFilter);
    result = filterProductsByStock(result, stockFilter);
    return result;
  }, [adaptedProducts, search, categoryFilter, statusFilter, stockFilter, categoryDescendants, categoryTree]);

  const { items: paginatedProducts, total, totalPages } = useMemo(
    () => paginateProducts(filteredProducts, page, pageSize),
    [filteredProducts, page, pageSize]
  );

  const filters = useMemo(
    () => ({
      search,
      categoryId: categoryFilter,
      status: statusFilter,
      stock: stockFilter,
    }),
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

  const deleteProduct = useDeleteProduct();

  const handleDelete = async (productId: string) => {
    if (!confirm("Bạn có chắc muốn xoá sản phẩm này?")) return;
    const result = await deleteProduct.mutateAsync(productId);
    if (result.success) {
      toast.success("Đã xoá sản phẩm");
      refetch();
    } else {
      toast.error(`Lỗi: ${result.error}`);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(0);
  };

  const handleStatusChange = (value: ProductStatus) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleStockChange = (value: StockStatus) => {
    setStockFilter(value);
    setPage(0);
  };

  const handleColumnsChange = (value: number) => {
    setColumns(value);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    localStorage.setItem(LS_PAGE_SIZE_KEY, String(value));
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockFilter("all");
    setPage(0);
  };

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl truncate">
            Quản lý sản phẩm
          </h1>
          <p className="text-muted-foreground hidden sm:block">
            {totalCount > 0 ? `${totalCount} sản phẩm` : "Danh sách sản phẩm trong cửa hàng"}
          </p>
        </div>
        <Button
          onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}
          className="shrink-0"
        >
          <Plus className="mr-2 size-4" />
          <span className="hidden sm:inline">Thêm sản phẩm</span>
          <span className="sm:hidden">Thêm</span>
        </Button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <ProductToolbar
            search={search}
            onSearchChange={handleSearchChange}
            categoryId={categoryFilter}
            onCategoryChange={handleCategoryChange}
            status={statusFilter}
            onStatusChange={handleStatusChange}
            stock={stockFilter}
            onStockChange={handleStockChange}
            columns={columns}
            onColumnsChange={handleColumnsChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            onRefresh={() => refetch()}
            categoryTree={categoryTree}
            hasActiveFilters={hasActiveFilters(filters)}
            filterLabels={activeFilterLabels}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] rounded-none" />
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
            <AlertCircle className="size-10 text-destructive mb-3" />
            <p className="text-base font-medium text-destructive">
              Không thể kết nối Medusa
            </p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
              {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa trong Settings."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && filteredProducts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ImageIcon className="size-12 mb-3" />
            <p className="text-base font-medium">Không tìm thấy sản phẩm phù hợp.</p>
            <p className="text-sm">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.</p>
            {hasActiveFilters(filters) && (
              <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
                Xoá bộ lọc
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Product Grid */}
      {!isLoading && !isError && filteredProducts.length > 0 && (
        <>
          <ProductCardGrid
            products={paginatedProducts}
            columns={columns}
            onView={setViewProduct}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          <Card>
            <CardContent className="p-3">
              <ProductPagination
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!viewProduct} onOpenChange={() => setViewProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{viewProduct?.name || "Chi tiết sản phẩm"}</DialogTitle>
          </DialogHeader>
          {viewProduct && (
            <div className="flex flex-col">
              {/* Image */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
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
                  {viewProduct.category && (
                    <Badge variant="outline">{viewProduct.category}</Badge>
                  )}
                  <h2 className="text-2xl font-bold">{viewProduct.name}</h2>
                  <div className="text-sm text-muted-foreground">
                    SKU: <span className="font-mono">{viewProduct.sku || "—"}</span>
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

                  {/* Status badges */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getStockBadgeVariant(viewProduct.stock, viewProduct.stockStatus)}
                      className="gap-1"
                    >
                      {STOCK_STATUS_LABELS[viewProduct.stockStatus] || "Còn hàng"}
                    </Badge>
                    <Badge variant={getStatusVariant(viewProduct.status)}>
                      {MEDUSA_STATUS_LABELS[viewProduct.status] || viewProduct.status}
                    </Badge>
                  </div>

                  {/* WP metadata */}
                  {viewProduct.metadata && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {viewProduct.metadata.wordpress_regular_price && (
                        <p>Giá gốc WP: {formatCurrency(parseFloat(viewProduct.metadata.wordpress_regular_price))}</p>
                      )}
                      {viewProduct.metadata.wordpress_sale_price && (
                        <p>Giá sale WP: {formatCurrency(parseFloat(viewProduct.metadata.wordpress_sale_price))}</p>
                      )}
                    </div>
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
                    <Button
                      onClick={() => setViewProduct(null)}
                    >
                      <Pencil className="mr-2 size-4" />
                      Sửa sản phẩm
                    </Button>
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

              {/* Metadata */}
              <Separator />
              <div className="p-6 text-sm text-muted-foreground">
                <p><strong>Product ID:</strong> <code className="bg-muted px-2 py-1 rounded">{viewProduct.id}</code></p>
                {viewProduct.metadata && Object.keys(viewProduct.metadata).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 gap-2">
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
