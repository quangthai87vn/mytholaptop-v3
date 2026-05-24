"use client";

import Image from "next/image";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  XCircle,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useStudioStore } from "@/store/ai-studio-store";
import type { AIProduct } from "@/types/content";
import { useProducts } from "@/hooks/use-medusa";
import { adaptProduct, filterProductsBySearch } from "@/lib/products/product-filters";
import { formatCurrency, cn } from "@/lib/utils";
import type { AdaptedProduct } from "@/lib/products/product-filters";
import { ProductDetailDrawer } from "../ProductDetailDrawer";

// ── Pagination config ────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [24, 48, 96] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// ── HTML stripper ───────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSpecs(description: string): string[] {
  if (!description) return [];
  const clean = stripHtml(description);
  return clean
    .split(/[.\n]/)
    .filter((l) => l.trim().length > 8 && l.trim().length < 200)
    .map((l) => l.trim().replace(/^[-•*]\s*/, "").replace(/\*\*/g, ""))
    .filter((l) => l.length > 5)
    .slice(0, 5);
}

function toAIProduct(p: AdaptedProduct): AIProduct {
  const specs = extractSpecs(p.description || "");
  const meta = p.metadata || {};
  const stockStatusMap: Record<string, AIProduct["stockStatus"]> = {
    instock: "in_stock",
    outofstock: "out_of_stock",
    onbackorder: "backorder",
    unknown: "unknown",
  };
  return {
    id: p.id,
    name: p.name,
    sku: p.sku || "",
    price: p.price,
    category: p.category || "",
    tags: p.tags || [],
    image: p.image || "",
    description: stripHtml(p.description || ""),
    brand: meta.brand || "",
    stock: p.stock,
    stockStatus: stockStatusMap[p.stockStatus] ?? "unknown",
    status: p.status,
    compareAtPrice: p.compareAtPrice,
    metadata: p.metadata,
    specs,
    shortDescription: stripHtml(p.description || "").slice(0, 250),
    seoTitle: meta.seo_title || meta.wordpress_seo_title || "",
    seoDescription: meta.seo_description || meta.wordpress_seo_description || "",
  };
}

// ── Product Square Card ────────────────────────────────────────────────────────

function ProductSquareCard({
  product,
  isSelected,
  onSelect,
  onExpand,
}: {
  product: AIProduct;
  isSelected: boolean;
  onSelect: () => void;
  onExpand: () => void;
}) {
  const isOutOfStock = product.stockStatus === "out_of_stock";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/30",
        "flex flex-col h-full cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-1 shadow-md border-primary"
      )}
      onClick={onSelect}
    >
      {/* Square image */}
      <div
        className={cn(
          "relative overflow-hidden bg-muted shrink-0 aspect-square",
          isOutOfStock && "grayscale"
        )}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              isOutOfStock && "grayscale"
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 16vw"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <XCircle className="size-10 text-muted-foreground/20" />
          </div>
        )}

        {/* Selection badge */}
        <div
          className={cn(
            "absolute top-2 right-2 z-10 rounded-full flex items-center justify-center transition-all p-0.5",
            "bg-white/80 backdrop-blur-sm",
            isSelected
              ? "text-primary shadow-sm ring-2 ring-primary"
              : "text-muted-foreground opacity-0 group-hover:opacity-100"
          )}
        >
          {isSelected ? (
            <CheckSquare className="size-4" />
          ) : (
            <Square className="size-4" />
          )}
        </div>

        {/* Out of stock */}
        {isOutOfStock && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-red-500/90 text-white text-[9px] font-semibold">
            Hết hàng
          </div>
        )}

        {/* Hover expand */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100",
            "flex items-center justify-center transition-opacity duration-200"
          )}
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
        >
          <Button
            variant="secondary"
            size="sm"
            className="gap-1 text-xs shadow"
            onClick={(e) => { e.stopPropagation(); onExpand(); }}
          >
            <Eye className="size-3" />
            Xem
          </Button>
        </div>
      </div>

      {/* Info */}
      <CardContent className="p-2.5 flex flex-col flex-1 min-w-0">
        {product.category && (
          <p className="text-[9px] text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded truncate mb-1">
            {product.category}
          </p>
        )}

        <h3 className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground flex-1">
          {product.name}
        </h3>

        <div className="mt-1.5 pt-1.5 border-t">
          <div className="flex items-center justify-between gap-1">
            {product.price > 0 ? (
              <span className="text-xs font-bold text-primary truncate">
                {formatCurrency(product.price)}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground truncate">Chưa có giá</span>
            )}
            <Badge
              variant={isOutOfStock ? "destructive" : "secondary"}
              className="text-[9px] px-1 py-0 shrink-0"
            >
              {product.stock > 0 && product.stock < 999
                ? `Còn ${product.stock}`
                : isOutOfStock
                ? "Hết"
                : "Còn"}
            </Badge>
          </div>
          {product.specs && product.specs.length > 0 && (
            <p className="text-[9px] text-muted-foreground mt-1 truncate">
              {product.specs[0]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Compact Insight Panel ────────────────────────────────────────────────────────

function InsightPanel({
  product,
  onExpand,
}: {
  product: AIProduct;
  onExpand: () => void;
}) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-4 space-y-3">
      {/* Image + name */}
      <div className="flex items-start gap-2.5">
        <div className="relative size-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center">
              <XCircle className="size-4 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold line-clamp-2 leading-tight">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] font-bold text-primary">
              {product.price > 0 ? formatCurrency(product.price) : "—"}
            </span>
            <Badge
              variant={product.stockStatus === "out_of_stock" ? "destructive" : "secondary"}
              className="text-[9px] px-1 py-0"
            >
              {product.stock > 0 && product.stock < 999
                ? `Còn ${product.stock}`
                : product.stockStatus === "out_of_stock"
                ? "Hết hàng"
                : "Còn hàng"}
            </Badge>
          </div>
        </div>
        <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
      </div>

      {/* Specs */}
      {product.specs && product.specs.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
            Đặc điểm
          </p>
          <div className="space-y-0.5">
            {product.specs.slice(0, 4).map((spec, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="size-1 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                <span className="text-[10px] text-foreground leading-snug">{spec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-[10px] gap-1"
        onClick={onExpand}
      >
        <Eye className="size-3" />
        Xem chi tiết
        <ArrowRight className="size-3 ml-auto" />
      </Button>
    </div>
  );
}

// ── Empty Insight Placeholder ─────────────────────────────────────────────────

function InsightPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8 px-4">
      <div className="relative">
        <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Package className="size-5 text-muted-foreground/30" />
        </div>
        <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-muted flex items-center justify-center">
          <Square className="size-2 text-muted-foreground/30" />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Click vào sản phẩm<br />để xem thông tin chi tiết
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ProductStep() {
  const store = useStudioStore();
  const selectedProduct = store.selectedProduct;
  const productSearch = store.productSearch;
  const setProductSearch = store.setProductSearch;
  const selectProduct = store.selectProduct;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(24);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [productSearch]);

  const { data, isLoading, isError, refetch } = useProducts({
    limit: 1000,
    q: productSearch || undefined,
    expand: "categories,variants,images,metadata",
  });

  const adaptedProducts: AdaptedProduct[] = useMemo(
    () => (data?.data?.products ?? []).map((p: any) => adaptProduct(p, new Map())),
    [data]
  );

  const filteredProducts = useMemo(
    () => filterProductsBySearch(adaptedProducts, productSearch || ""),
    [adaptedProducts, productSearch]
  );

  const totalCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginatedProducts = useMemo(() => {
    const start = page * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  const aiProducts = useMemo(
    () => paginatedProducts.map(toAIProduct),
    [paginatedProducts]
  );

  const handleSelect = useCallback(
    (product: AIProduct) => { selectProduct(product); },
    [selectProduct]
  );

  const handleExpand = useCallback(() => { setDrawerOpen(true); }, []);

  return (
    <>
      <ProductDetailDrawer
        product={selectedProduct}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex flex-col h-full overflow-hidden">
        {/* Minimal header — just search */}
        <div className="shrink-0 px-5 py-3 border-b bg-card/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm sản phẩm..."
              className="h-8 pl-9 pr-9 text-xs rounded-lg bg-muted/30"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Product grid area */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="p-4 space-y-3">
              {/* Toolbar: count + page size */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground truncate">
                  {totalCount > 0
                    ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)} trong ${totalCount} sản phẩm`
                    : `${totalCount} sản phẩm`}
                  {productSearch && ` · "${productSearch}"`}
                </p>
                {/* Page size selector */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">Hiển thị:</span>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      onClick={() => { setPageSize(size); setPage(0); }}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                        pageSize === size
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading skeleton */}
              {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="aspect-square rounded-none" />
                      <CardContent className="p-2.5 space-y-1.5">
                        <Skeleton className="h-2 w-2/3" />
                        <Skeleton className="h-2 w-1/2" />
                        <Skeleton className="h-2 w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Error */}
              {isError && (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <AlertCircle className="size-8 text-orange-500" />
                  <p className="text-xs text-orange-600 font-medium">Không kết nối Medusa</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()}>
                    Thử lại
                  </Button>
                </div>
              )}

              {/* Empty */}
              {!isLoading && !isError && aiProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <Package className="size-10 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {productSearch ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"}
                  </p>
                </div>
              )}

              {/* Product grid: 6 columns responsive */}
              {!isLoading && !isError && aiProducts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 min-w-0">
                  {aiProducts.map((product) => (
                    <ProductSquareCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProduct?.id === product.id}
                      onSelect={() => handleSelect(product)}
                      onExpand={handleExpand}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && !isError && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 pb-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>

                  {/* Page indicators */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) {
                        pageNum = i;
                      } else if (page < 4) {
                        pageNum = i;
                      } else if (page > totalPages - 5) {
                        pageNum = totalPages - 7 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "size-7 rounded text-[11px] font-medium transition-colors",
                            pageNum === page
                              ? "bg-primary text-white shadow-sm"
                              : "text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>

                  <span className="text-[10px] text-muted-foreground ml-1">
                    Trang {page + 1} / {totalPages}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: insight panel */}
          <div className="w-60 shrink-0 border-l overflow-y-auto p-4 hidden xl:block">
            {selectedProduct ? (
              <InsightPanel
                product={selectedProduct}
                onExpand={handleExpand}
              />
            ) : (
              <InsightPlaceholder />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
