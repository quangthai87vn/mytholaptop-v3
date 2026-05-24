"use client";

import Image from "next/image";
import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  ExternalLink,
} from "lucide-react";
import { useStudioStore } from "@/store/ai-studio-store";
import type { AIProduct } from "@/types/content";
import { useProducts } from "@/hooks/use-medusa";
import { adaptProduct, filterProductsBySearch } from "@/lib/products/product-filters";
import { formatCurrency } from "@/lib/utils";
import type { AdaptedProduct } from "@/lib/products/product-filters";
import { ProductDetailDrawer } from "./ProductDetailDrawer";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
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
    .slice(0, 6);
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
    description: stripHtml(p.description || ""),
    brand: meta.brand || "",
    stock: p.stock,
    stockStatus: aiStockStatus,
    status: p.status,
    compareAtPrice: p.compareAtPrice,
    metadata: p.metadata,
    specs,
    shortDescription: stripHtml(p.description || "").slice(0, 250),
    seoTitle: meta.seo_title || meta.wordpress_seo_title || "",
    seoDescription: meta.seo_description || meta.wordpress_seo_description || "",
  };
}

// ── Stock indicator ─────────────────────────────────────────────────────────────

function StockDot({ status, stock }: { status: string; stock: number }) {
  if (status === "out_of_stock") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-medium shrink-0">
        <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
        Hết hàng
      </span>
    );
  }
  if (stock > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium shrink-0">
        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
        Còn {stock}
      </span>
    );
  }
  return null;
}

// ── Compact Product Card (for list) ──────────────────────────────────────────────

function ProductCard({
  product,
  isSelected,
  onSelect,
}: {
  product: AIProduct;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
          : "border-transparent hover:border-border hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Thumbnail */}
        <div className="relative size-11 rounded-lg overflow-hidden bg-muted shrink-0 shadow-sm">
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center">
              <Package className="size-4 text-muted-foreground/30" />
            </div>
          )}
          {isSelected && (
            <div className="absolute inset-0 bg-primary/15 flex items-center justify-center rounded-lg">
              <CheckCircle2 className="size-4 text-primary drop-shadow-sm" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold line-clamp-2 leading-tight">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-bold text-primary shrink-0">
              {product.price > 0 ? formatCurrency(product.price) : "—"}
            </span>
            <StockDot status={product.stockStatus} stock={product.stock} />
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Selected Product Compact Card (shown in sidebar detail slot) ──────────────────

function SelectedProductCard({
  product,
  onExpand,
}: {
  product: AIProduct;
  onExpand: () => void;
}) {
  return (
    <div className="p-2.5 space-y-2 border-t bg-gradient-to-br from-primary/[0.03] to-transparent">
      {/* Image */}
      {product.image ? (
        <div
          className="relative w-full h-16 rounded-lg overflow-hidden bg-muted shadow-sm cursor-pointer group"
          onClick={onExpand}
        >
          <Image src={product.image} alt={product.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <Eye className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : (
        <div className="relative w-full h-16 rounded-lg bg-muted flex items-center justify-center">
          <Package className="size-6 text-muted-foreground/20" />
        </div>
      )}

      {/* Name */}
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold leading-tight line-clamp-2">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[12px] font-bold text-primary">
              {product.price > 0 ? formatCurrency(product.price) : "—"}
            </span>
            <StockDot status={product.stockStatus} stock={product.stock} />
          </div>
        </div>
        <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
      </div>

      {/* Short specs */}
      {product.specs && product.specs.length > 0 && (
        <p className="text-[9px] text-muted-foreground line-clamp-1 leading-relaxed">
          {product.specs.slice(0, 2).join(" · ")}
        </p>
      )}

      {/* View more */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-[10px] gap-1"
        onClick={onExpand}
      >
        <Eye className="size-3" />
        Xem chi tiết
      </Button>
    </div>
  );
}

// ── Collapsed Thumbnails ────────────────────────────────────────────────────────

function CollapsedThumbnails({
  products,
  selectedId,
  onSelect,
}: {
  products: AIProduct[];
  selectedId: string | null;
  onSelect: (p: AIProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[10px] text-muted-foreground/40">Không có sản phẩm</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p)}
          className={`relative shrink-0 size-9 rounded-xl overflow-hidden border-2 transition-all ${
            p.id === selectedId
              ? "border-primary shadow-sm ring-2 ring-primary/20"
              : "border-border/40 hover:border-primary/40"
          }`}
          title={p.name}
        >
          {p.image ? (
            <Image src={p.image} alt={p.name} fill className="object-cover" />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center">
              <Package className="size-3 text-muted-foreground/30" />
            </div>
          )}
          {p.id === selectedId && (
            <div className="absolute inset-0 bg-primary/15 flex items-center justify-center rounded-xl">
              <CheckCircle2 className="size-3 text-primary" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────────

export function ProductSelector() {
  const { selectedProduct, productSearch = "", selectProduct, setProductSearch } =
    useStudioStore();

  const [listExpanded, setListExpanded] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useProducts({
    limit: 100,
    q: productSearch || undefined,
    expand: "categories,variants,images,metadata",
  });

  const adaptedProducts: AdaptedProduct[] = useMemo(
    () => (data?.data?.products ?? []).map((p: any) => adaptProduct(p, new Map())),
    [data]
  );

  const filteredProducts = useMemo(
    () => filterProductsBySearch(adaptedProducts, productSearch),
    [adaptedProducts, productSearch]
  );

  const aiProducts = useMemo(
    () => filteredProducts.map(toAIProduct),
    [filteredProducts]
  );

  const handleSelect = useCallback(
    (product: AIProduct) => { selectProduct(product); },
    [selectProduct]
  );

  const handleExpand = useCallback(() => { setDrawerOpen(true); }, []);

  const isCollapsed = !listExpanded;

  return (
    <>
      <ProductDetailDrawer
        product={selectedProduct}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex flex-col h-full">

        {/* Header */}
        <div className="px-3 py-2.5 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Package className="size-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-semibold">Sản phẩm</span>
              {selectedProduct && (
                <Badge variant="default" className="h-4 text-[9px] px-1 bg-primary text-white">
                  1
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {/* List collapse */}
              <button
                onClick={() => setListExpanded((v) => !v)}
                className="size-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title={listExpanded ? "Thu gọn danh sách" : "Mở rộng danh sách"}
              >
                {listExpanded ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}
              </button>
              {/* Detail collapse */}
              {selectedProduct && (
                <button
                  onClick={() => setShowDetail((v) => !v)}
                  className={`size-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors ${
                    showDetail ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={showDetail ? "Ẩn chi tiết" : "Hiện chi tiết"}
                >
                  <ChevronDown className={`size-3 transition-transform ${!showDetail ? "-rotate-90" : ""}`} />
                </button>
              )}
            </div>
          </div>

          {/* Search (only when list expanded) */}
          {listExpanded && (
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                placeholder="Tìm sản phẩm..."
                className="h-7 text-[11px] pl-8 pr-8 bg-muted/30"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Product list */}
          {listExpanded ? (
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-2 space-y-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-xl border">
                        <Skeleton className="size-11 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isError ? (
                  <div className="p-4 text-center space-y-2">
                    <AlertCircle className="size-5 text-orange-500 mx-auto" />
                    <p className="text-[10px] text-orange-600">Không kết nối Medusa</p>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => refetch()}>
                      Thử lại
                    </Button>
                  </div>
                ) : aiProducts.length === 0 ? (
                  <div className="p-4 text-center">
                    <Package className="size-6 text-muted-foreground/20 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">
                      {productSearch ? "Không tìm thấy" : "Chưa có sản phẩm"}
                    </p>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-0.5">
                    {aiProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSelected={selectedProduct?.id === product.id}
                        onSelect={() => handleSelect(product)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!isLoading && !isError && aiProducts.length > 0 && (
                <div className="px-3 py-1.5 border-t shrink-0">
                  <p className="text-[9px] text-muted-foreground text-center">
                    {aiProducts.length} sản phẩm
                    {productSearch && ` · tìm: "${productSearch}"`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed: thumbnails only */
            <div className="flex-1 overflow-hidden">
              <CollapsedThumbnails
                products={aiProducts}
                selectedId={selectedProduct?.id ?? null}
                onSelect={handleSelect}
              />
            </div>
          )}

          {/* Detail panel — compact, right side */}
          {selectedProduct && showDetail && (
            <div className="w-48 shrink-0 border-l overflow-y-auto hidden xl:block">
              <SelectedProductCard
                product={selectedProduct}
                onExpand={handleExpand}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
