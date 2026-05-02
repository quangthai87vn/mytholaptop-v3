"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, XCircle, Package, ExternalLink, ChevronRight, ChevronDown, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { WooCategory, WooProduct } from "@/types";

interface MigrationPreviewProps {
  categories: WooCategory[];
  products: WooProduct[];
  totalProducts: number;
  isLoading: boolean;
  isConnected: boolean;
  wordpressUrl?: string;
}

// Build category tree
function buildCategoryTree(categories: WooCategory[]): Array<WooCategory & { level: number; children: WooCategory[] }> {
  const map = new Map<number, WooCategory & { level: number; children: WooCategory[] }>();
  const roots: Array<WooCategory & { level: number; children: WooCategory[] }> = [];

  // First pass: create all nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, level: 0, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent && map.has(cat.parent)) {
      const parent = map.get(cat.parent)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Flatten tree for display
function flattenTree(
  nodes: Array<WooCategory & { level: number; children: WooCategory[] }>
): Array<WooCategory & { level: number; hasChildren: boolean }> {
  type TreeNode = WooCategory & { level: number; children: WooCategory[] };
  const result: Array<WooCategory & { level: number; hasChildren: boolean }> = [];

  const traverse = (node: TreeNode): void => {
    result.push({ ...node, hasChildren: node.children.length > 0 });
    (node.children as TreeNode[]).forEach(traverse);
  };

  nodes.forEach(traverse);
  return result;
}

export function MigrationPreview({
  categories,
  products,
  totalProducts,
  isLoading,
  isConnected,
  wordpressUrl = "",
}: MigrationPreviewProps) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [galleryProduct, setGalleryProduct] = useState<WooProduct | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const pageSize = 24;

  // Build category tree
  const categoryTree = buildCategoryTree(categories);
  const flattenedCategories = flattenTree(categoryTree);

  // Filter categories by search
  const filteredCategoryIds = new Set(
    categories
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .map((c) => c.id)
  );
  const displayedCategories = flattenedCategories.filter(
    (cat) => cat.level === 0 || filteredCategoryIds.has(cat.id) || filteredCategoryIds.has(cat.parent || 0)
  );

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Build WooCommerce product URL
  const getProductUrl = (product: WooProduct): string => {
    if (!wordpressUrl) return "#";
    const baseUrl = wordpressUrl.replace("/wp-json", "").replace(/\/$/, "");
    return `${baseUrl}/?p=${product.id}`;
  };

  // Build WooCommerce product permalink
  const getProductSlug = (product: WooProduct): string => {
    if (!wordpressUrl || !product.slug) return "#";
    const baseUrl = wordpressUrl.replace("/wp-json", "").replace(/\/$/, "");
    return `${baseUrl}/san-pham/${product.slug}`;
  };

  // Toggle category expansion
  const toggleCat = (catId: number) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xem trước dữ liệu</CardTitle>
          <CardDescription>
            Kết nối WooCommerce trước để xem dữ liệu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="mb-3 size-12" />
            <p>Chưa kết nối WooCommerce</p>
            <p className="text-sm">Vui lòng kiểm tra kết nối trước</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Xem trước dữ liệu</CardTitle>
          <CardDescription>
            Kiểm tra dữ liệu trước khi migration.
            {totalProducts > 0 && (
              <span className="ml-2 font-medium text-primary">
                Tổng sản phẩm: {totalProducts}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && products.length === 0 && categories.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {isLoading && (products.length > 0 || categories.length > 0) && (
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Đang tải thêm...
                </div>
              )}
            <Tabs defaultValue="products">
              <TabsList className="mb-4">
                <TabsTrigger value="categories">
                  Danh mục ({categories.length})
                </TabsTrigger>
                <TabsTrigger value="products">
                  Sản phẩm ({products.length})
                </TabsTrigger>
              </TabsList>

              {/* Categories tab */}
              <TabsContent value="categories">
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm danh mục..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="rounded-md border">
                  {displayedCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <XCircle className="mb-2 size-12" />
                      <p>Không có danh mục</p>
                    </div>
                  ) : (
                    displayedCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
                        style={{ paddingLeft: `${cat.level * 24 + 12}px` }}
                      >
                        <button
                          onClick={() => cat.hasChildren && toggleCat(cat.id)}
                          className="shrink-0 rounded p-0.5 hover:bg-muted"
                          disabled={!cat.hasChildren}
                        >
                          {cat.hasChildren ? (
                            expandedCats.has(cat.id) ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )
                          ) : (
                            <Minus className="size-4 text-muted-foreground/30" />
                          )}
                        </button>
                        <div className="flex-1">
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <Badge variant="secondary">{cat.count} sản phẩm</Badge>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Products tab */}
              <TabsContent value="products">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm sản phẩm..."
                      className="pl-9"
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {filteredProducts.length} sản phẩm / {totalPages} trang
                  </span>
                </div>

                {/* Product Card Grid */}
                {paginatedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Package className="mb-3 size-14" />
                    <p className="text-base font-medium">Không có sản phẩm</p>
                    <p className="text-sm">Thử thay đổi từ khoá tìm kiếm</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedProducts.map((product) => {
                      const isInStock =
                        product.stock_status === "instock" ||
                        (product.stock_quantity !== null && product.stock_quantity > 0);
                      return (
                        <button
                          key={product.id}
                          onClick={() => setGalleryProduct(product)}
                          className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                        >
                          {/* Product Image */}
                          <div className="relative aspect-square overflow-hidden bg-muted">
                            {product.images?.[0]?.src ? (
                              <Image
                                src={product.images[0].src}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <XCircle className="size-10 text-muted-foreground/30" />
                              </div>
                            )}
                            {/* Stock badge overlay */}
                            <div className="absolute right-2 top-2">
                              {isInStock ? (
                                <Badge variant="success" className="gap-1 shadow-sm">
                                  <Package className="size-3" />
                                  Còn hàng
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 shadow-sm text-muted-foreground">
                                  <Package className="size-3" />
                                  Hết hàng
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="flex flex-1 flex-col gap-2 p-3">
                            {/* Categories */}
                            {product.categories.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                {product.categories.map((c) => c.name).join(", ")}
                              </p>
                            )}

                            {/* Product Name */}
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                              {product.name}
                            </h3>

                            {/* SKU */}
                            {product.sku && (
                              <p className="font-mono text-xs text-muted-foreground">
                                SKU: {product.sku}
                              </p>
                            )}

                            {/* Price */}
                            <div className="mt-auto pt-1">
                              {product.sale_price && parseFloat(product.sale_price) > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold text-primary">
                                    {formatCurrency(parseFloat(product.sale_price))}
                                  </span>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(parseFloat(product.regular_price || product.price))}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-base font-bold text-primary">
                                  {formatCurrency(parseFloat(product.price || "0"))}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Trang {currentPage} / {totalPages} ({startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} của {filteredProducts.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        ← Trước
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let page: number;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Sau →
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Modal - Full product page style */}
      <Dialog open={!!galleryProduct} onOpenChange={() => setGalleryProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {galleryProduct && (
            <div className="flex flex-col">
              {/* Image Gallery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Main Image */}
                <div className="relative bg-muted aspect-square">
                  {galleryProduct.images?.[0]?.src ? (
                    <Image
                      src={galleryProduct.images[0].src}
                      alt={galleryProduct.name}
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

                {/* Product Info */}
                <div className="flex flex-col p-6 space-y-4">
                  {/* Categories */}
                  <div className="flex flex-wrap gap-1">
                    {galleryProduct.categories.map((cat) => (
                      <Badge key={cat.id} variant="outline">{cat.name}</Badge>
                    ))}
                  </div>

                  {/* Product Name */}
                  <h2 className="text-2xl font-bold">{galleryProduct.name}</h2>

                  {/* SKU */}
                  <div className="text-sm text-muted-foreground">
                    SKU: <span className="font-mono">{galleryProduct.sku || "—"}</span>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    {galleryProduct.sale_price && parseFloat(galleryProduct.sale_price) > 0 ? (
                      <>
                        <p className="text-3xl font-bold text-primary">
                          {formatCurrency(parseFloat(galleryProduct.sale_price))}
                        </p>
                        <p className="text-lg text-muted-foreground line-through">
                          {formatCurrency(parseFloat(galleryProduct.regular_price || galleryProduct.price))}
                        </p>
                      </>
                    ) : (
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(parseFloat(galleryProduct.price || "0"))}
                      </p>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center gap-2">
                    {galleryProduct.stock_status === "instock" ||
                    (galleryProduct.stock_quantity !== null && galleryProduct.stock_quantity > 0) ? (
                      <Badge variant="success" className="gap-1">
                        <Package className="size-3" />
                        Còn hàng ({galleryProduct.stock_quantity ?? "Có sẵn"})
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Hết hàng</Badge>
                    )}
                  </div>

                  {/* Short Description */}
                  {galleryProduct.short_description && (
                    <div
                      className="text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: galleryProduct.short_description }}
                    />
                  )}

                  {/* External Link */}
                  <div className="pt-4 border-t">
                    <a
                      href={getProductUrl(galleryProduct)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="size-4" />
                      Xem sản phẩm trên website
                    </a>
                  </div>
                </div>
              </div>

              {/* Full Description */}
              {galleryProduct.description && (
                <div className="border-t p-6">
                  <h3 className="text-lg font-semibold mb-3">Mô tả sản phẩm</h3>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: galleryProduct.description }}
                  />
                </div>
              )}

              {/* Tags */}
              {galleryProduct.tags && galleryProduct.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-3">Thẻ đánh dấu</h3>
                    <div className="flex flex-wrap gap-2">
                      {galleryProduct.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Additional Images Gallery */}
              {galleryProduct.images && galleryProduct.images.length > 1 && (
                <>
                  <Separator />
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-3">Hình ảnh sản phẩm</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {galleryProduct.images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          onClick={() => {
                            // Could implement lightbox here
                          }}
                          className="relative aspect-square overflow-hidden rounded-lg border hover:border-primary transition-colors"
                        >
                          <Image
                            src={img.src}
                            alt={img.alt || `Hình ${idx + 1}`}
                            fill
                            className="object-cover hover:scale-105 transition-transform"
                            sizes="150px"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Product Meta */}
              <Separator />
              <div className="p-6 text-sm text-muted-foreground">
                <p>ID: {galleryProduct.id}</p>
                <p>Type: {galleryProduct.type}</p>
                {galleryProduct.weight && <p>Weight: {galleryProduct.weight}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
