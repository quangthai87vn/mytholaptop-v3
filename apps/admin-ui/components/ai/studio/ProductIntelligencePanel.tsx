"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  Star,
  Tag,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useStudioStore } from "@/store/ai-studio-store";
import type { AIProduct } from "@/types/content";
import { useProducts } from "@/hooks/use-medusa";
import {
  adaptProduct,
  filterProductsBySearch,
  type AdaptedProduct,
} from "@/lib/products/product-filters";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

/** Trích xuất specs từ description để AI hiểu rõ sản phẩm */
function extractSpecs(description: string): string[] {
  if (!description) return [];
  const lines = description
    .split(/[.\n]/)
    .filter((l) => l.trim().length > 8 && l.trim().length < 200)
    .map((l) => l.trim().replace(/^[-•*]\s*/, "").replace(/\*\*/g, ""))
    .filter((l) => l.length > 5);
  return [...new Set(lines)].slice(0, 8);
}

/** Build short description từ mô tả */
function buildShortDescription(description: string): string {
  if (!description) return "";
  const cleaned = description
    .replace(/\*\*/g, "")
    .replace(/[#*_~`]/g, "")
    .trim();
  return cleaned.length > 300 ? cleaned.slice(0, 297) + "..." : cleaned;
}

/** Chuyển AdaptedProduct → AIProduct với rich context cho AI */
function toAIProduct(p: AdaptedProduct): AIProduct {
  const specs = extractSpecs(p.description || "");
  const shortDescription = buildShortDescription(p.description || "");
  const meta = p.metadata || {};

  const stockStatusMap: Record<string, AIProduct["stockStatus"]> = {
    instock: "in_stock",
    outofstock: "out_of_stock",
    onbackorder: "backorder",
    unknown: "unknown",
  };
  const aiStockStatus: AIProduct["stockStatus"] =
    stockStatusMap[p.stockStatus] ?? "unknown";

  return {
    id: p.id,
    name: p.name,
    sku: p.sku || "",
    price: p.price,
    category: p.category || "",
    tags: p.tags || [],
    image: p.image || "",
    description: p.description || "",
    brand: meta.brand || "",
    stock: p.stock,
    stockStatus: aiStockStatus,
    status: p.status,
    compareAtPrice: p.compareAtPrice,
    metadata: p.metadata,
    specs,
    shortDescription,
    seoTitle: meta.seo_title || meta.wordpress_seo_title || "",
    seoDescription: meta.seo_description || meta.wordpress_seo_description || "",
  };
}

function StockBadge({ status, stock }: { status: string; stock: number }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    in_stock: { label: "Còn hàng", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="size-2.5" /> },
    out_of_stock: { label: "Hết hàng", color: "bg-red-100 text-red-700", icon: <WifiOff className="size-2.5" /> },
    backorder: { label: "Đặt trước", color: "bg-yellow-100 text-yellow-700", icon: <AlertTriangle className="size-2.5" /> },
    unknown: { label: "—", color: "bg-gray-100 text-gray-600", icon: null },
  };
  const cfg = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
      {status === "in_stock" && stock > 0 && ` (${stock})`}
    </span>
  );
}

export function ProductIntelligencePanel() {
  const raw = useStudioStore();
  const {
    selectedProduct,
    productsLoading = false,
    productsError = null,
    productSearch = "",
    setSelectedProduct,
    toggleProduct,
    setProductsLoading,
    setProductsError,
    setProductSearch,
  } = raw;

  // Load products giống products/page.tsx — dùng hook useProducts
  const { data, isLoading, isError, error, refetch } = useProducts({
    limit: 100,
    q: productSearch || undefined,
    expand: "categories,variants,images,metadata",
  });

  // Sync loading/error về store để các component khác có thể dùng
  // (component này dùng trực tiếp nên không cần sync, nhưng giữ interface cũ)
  void setProductsLoading;
  void setProductsError;

  const adaptedProducts: AdaptedProduct[] = useMemo(() => {
    const rawProducts = data?.data?.products ?? [];
    return rawProducts.map((p: any) => adaptProduct(p, new Map()));
  }, [data]);

  const filteredProducts = useMemo(
    () => filterProductsBySearch(adaptedProducts, productSearch),
    [adaptedProducts, productSearch]
  );

  const aiProducts: AIProduct[] = useMemo(
    () => filteredProducts.map(toAIProduct),
    [filteredProducts]
  );

  const primaryProduct = selectedProduct;

  const handleClearSelection = () => setSelectedProduct(null);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Package className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">Product Intelligence</h2>
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-2 p-2 rounded-lg border">
              <Skeleton className="size-10 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Package className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">Product Intelligence</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm sản phẩm..."
              className="h-8 text-xs pl-8"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-2">
          <AlertCircle className="size-8 text-orange-500" />
          <p className="text-xs text-orange-600 font-medium">
            Không thể kết nối Medusa
          </p>
          <p className="text-[10px] text-muted-foreground">
            {(error as Error)?.message || "Vui lòng kiểm tra cấu hình Medusa"}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className="size-3 mr-1" />
              Thử lại
            </Button>
            <Button variant="link" size="sm" className="h-7 text-xs px-1" asChild>
              <Link href="/settings">Cấu hình</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Package className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Product Intelligence</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {aiProducts.length} sản phẩm
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm sản phẩm..."
            className="h-8 text-xs pl-8"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>

        {/* Selection count */}
        {selectedProduct && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-green-500" />
              <span className="text-xs text-muted-foreground">
                1 sản phẩm đã chọn
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-1.5 text-muted-foreground hover:text-destructive"
              onClick={handleClearSelection}
            >
              <X className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto">
        {aiProducts.length === 0 ? (
          <div className="p-4 text-center">
            <Package className="size-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {productSearch ? "Không tìm thấy sản phẩm phù hợp" : "Không có sản phẩm"}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {aiProducts.map((product) => {
              const isSelected = selectedProduct?.id === product.id;
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex gap-2.5">
                    {/* Thumbnail */}
                    <div className="relative size-10 rounded overflow-hidden bg-muted shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-[10px] text-muted-foreground">
                          SP
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="size-3.5 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate leading-tight">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {product.sku || "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <StockBadge status={product.stockStatus} stock={product.stock} />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] font-semibold text-primary">
                          {product.price > 0 ? formatCurrency(product.price) : "Chưa giá"}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary product detail */}
      {primaryProduct && (
        <>
          <Separator />
          <div className="p-3 space-y-3 bg-muted/20 overflow-y-auto max-h-72">
            {/* Image */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              {primaryProduct.image ? (
                <Image
                  src={primaryProduct.image}
                  alt={primaryProduct.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-muted-foreground text-xs">
                  Không có ảnh
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {primaryProduct.name}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span>{primaryProduct.sku || "—"}</span>
                {primaryProduct.category && (
                  <>
                    <span>•</span>
                    <span>{primaryProduct.category}</span>
                  </>
                )}
                <span>•</span>
                <StockBadge status={primaryProduct.stockStatus} stock={primaryProduct.stock} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-primary">
                  {primaryProduct.price > 0 ? formatCurrency(primaryProduct.price) : "Chưa giá"}
                </span>
                {primaryProduct.compareAtPrice && primaryProduct.compareAtPrice > primaryProduct.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCurrency(primaryProduct.compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Tags */}
              {primaryProduct.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {primaryProduct.tags.slice(0, 5).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      <Tag className="size-2.5 mr-0.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Specs — dùng cho AI context */}
              {primaryProduct.specs && primaryProduct.specs.length > 0 && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Star className="size-2.5" />
                    Đặc điểm nổi bật
                  </div>
                  {primaryProduct.specs.slice(0, 5).map((spec, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground pl-3">
                      • {spec.trim()}
                    </p>
                  ))}
                </div>
              )}

              {/* Short description */}
              {primaryProduct.shortDescription && (
                <div className="mt-1">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {primaryProduct.shortDescription}
                  </p>
                </div>
              )}

              {/* SEO info */}
              {(primaryProduct.seoTitle || primaryProduct.seoDescription) && (
                <div className="mt-1 p-2 rounded bg-blue-50 border border-blue-100 space-y-0.5">
                  <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">
                    SEO Info
                  </p>
                  {primaryProduct.seoTitle && (
                    <p className="text-[10px] text-blue-700 font-medium">
                      {primaryProduct.seoTitle}
                    </p>
                  )}
                  {primaryProduct.seoDescription && (
                    <p className="text-[9px] text-blue-600 leading-relaxed">
                      {primaryProduct.seoDescription}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
