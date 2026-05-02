"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Bug,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ImageIcon,
  Package,
  Layers,
  Tag,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  generatePreviewReport,
  type PreviewReport,
  type ProductValidation,
  type CategoryValidation,
} from "@/lib/preview-validation";
import type { WooProduct, WooCategory } from "@/types";

interface ProductDebugViewProps {
  products: WooProduct[];
  categories: WooCategory[];
  wordpressUrl: string;
  medusaBackendUrl: string;
  // Category mappings: wooId -> medusaId (from migration service)
  categoryMappings?: Array<{
    wooId: number;
    medusaId: string;
  }>;
  className?: string;
}

export function ProductDebugView({
  products,
  categories,
  wordpressUrl,
  medusaBackendUrl,
  categoryMappings,
  className,
}: ProductDebugViewProps) {
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "errors" | "warnings" | "valid">("all");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "issues">("name");

  const generateReport = useCallback(() => {
    if (products.length === 0) return;
    setIsGenerating(true);
    setTimeout(() => {
      const r = generatePreviewReport(
        products,
        categories,
        wordpressUrl,
        medusaBackendUrl,
        categoryMappings
      );
      setReport(r);
      setIsGenerating(false);
    }, 50);
  }, [products, categories, wordpressUrl, medusaBackendUrl, categoryMappings]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const toggleRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (products.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="size-4" />
            Product Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Kết nối WooCommerce để xem debug sản phẩm.
          </p>
        </CardContent>
      </Card>
    );
  }

  const filteredProducts = (report?.productValidations || []).filter((pv) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      if (
        !pv.wooName.toLowerCase().includes(q) &&
        !pv.wooSku.toLowerCase().includes(q) &&
        !String(pv.wooId).includes(q)
      ) {
        return false;
      }
    }
    // Tab filter
    const hasErrors = pv.issues.some((i) => i.type === "error");
    const hasWarnings = pv.issues.some((i) => i.type === "warning");
    if (filterTab === "errors" && !hasErrors) return false;
    if (filterTab === "warnings" && !hasWarnings) return false;
    if (filterTab === "valid" && (hasErrors || hasWarnings)) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "issues") {
      return b.issues.length - a.issues.length;
    }
    return a.wooName.localeCompare(b.wooName);
  });

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="size-4" />
            Product Debug
            {report && (
              <div className="flex gap-2">
                <Badge variant="outline" className="font-normal text-xs">
                  {report.totalProducts} sản phẩm
                </Badge>
                {report.errorProducts > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {report.errorProducts} lỗi
                  </Badge>
                )}
                {report.warningProducts > 0 && (
                  <Badge variant="outline" className="font-normal text-xs text-yellow-600 border-yellow-300">
                    {report.warningProducts} cảnh báo
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateReport}
              disabled={isGenerating}
              className="size-8 p-0"
              title="Làm mới báo cáo"
            >
              <RefreshCw className={cn("size-3.5", isGenerating && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, SKU, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Tabs
            value={filterTab}
            onValueChange={(v) => setFilterTab(v as typeof filterTab)}
            className="flex-1"
          >
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7 px-2">
                Tất cả ({report?.totalProducts || 0})
              </TabsTrigger>
              <TabsTrigger value="errors" className="text-xs h-7 px-2">
                Lỗi ({report?.errorProducts || 0})
              </TabsTrigger>
              <TabsTrigger value="warnings" className="text-xs h-7 px-2">
                Cảnh báo ({report?.warningProducts || 0})
              </TabsTrigger>
              <TabsTrigger value="valid" className="text-xs h-7 px-2">
                OK ({report?.validProducts || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "issues")}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="name">Theo tên</option>
            <option value="issues">Theo số lỗi</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Đang phân tích...</span>
          </div>
        ) : report && !report.canMigrate ? (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Không thể migrate!</p>
                {report.blockingIssues.map((issue, i) => (
                  <p key={i} className="text-xs text-destructive/80">- {issue}</p>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Issue summary */}
        {report && Object.keys(report.issueSummary).length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {Object.entries(report.issueSummary)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([code, count]) => (
                <Badge
                  key={code}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {code.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
          </div>
        )}

        {/* Product list */}
        {sortedProducts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Không có sản phẩm nào phù hợp
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="w-6 px-1 py-1.5"></th>
                  <th className="px-2 py-1.5 text-left font-medium">Sản phẩm</th>
                  <th className="px-2 py-1.5 text-left font-medium">SKU</th>
                  <th className="px-2 py-1.5 text-left font-medium">Loại</th>
                  <th className="px-2 py-1.5 text-center font-medium">Ảnh</th>
                  <th className="px-2 py-1.5 text-center font-medium">Cats</th>
                  <th className="px-2 py-1.5 text-center font-medium">Vấn đề</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((pv) => {
                  const hasErrors = pv.issues.some((i) => i.type === "error");
                  const hasWarnings = pv.issues.some((i) => i.type === "warning");
                  const isExpanded = expandedRows.has(pv.wooId);

                  return (
                    <>
                      <tr
                        key={pv.wooId}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/30 cursor-pointer",
                          hasErrors && "bg-destructive/5"
                        )}
                        onClick={() => toggleRow(pv.wooId)}
                      >
                        <td className="px-1 py-1.5 text-center">
                          {isExpanded ? (
                            <ChevronDown className="size-3 inline" />
                          ) : (
                            <ChevronRight className="size-3 inline" />
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="font-medium">{pv.wooName}</span>
                          <span className="ml-1 text-muted-foreground">#{pv.wooId}</span>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px]">
                          {pv.wooSku.slice(0, 20)}
                        </td>
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {pv.wooType}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <ImageIcon className="size-3 text-muted-foreground" />
                            <span>{pv.imageCount}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Layers className="size-3 text-muted-foreground" />
                            <span>{pv.categories.length}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {hasErrors && (
                              <Badge variant="destructive" className="text-[10px] h-5 px-1">
                                {pv.issues.filter((i) => i.type === "error").length}
                              </Badge>
                            )}
                            {hasWarnings && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1 text-yellow-600 border-yellow-300">
                                {pv.issues.filter((i) => i.type === "warning").length}
                              </Badge>
                            )}
                            {!hasErrors && !hasWarnings && (
                              <CheckCircle className="size-3 text-green-500" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <tr key={`${pv.wooId}-detail`}>
                          <td colSpan={7} className="bg-muted/20 px-4 py-3">
                            <div className="space-y-3 text-xs">
                              {/* Issues */}
                              {pv.issues.length > 0 && (
                                <div className="space-y-1">
                                  <p className="font-medium text-muted-foreground">Vấn đề:</p>
                                  {pv.issues.map((issue, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "flex items-start gap-2 rounded px-2 py-1",
                                        issue.type === "error"
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-yellow-50 text-yellow-700"
                                      )}
                                    >
                                      {issue.type === "error" ? (
                                        <XCircle className="mt-0.5 size-3 flex-shrink-0" />
                                      ) : (
                                        <AlertTriangle className="mt-0.5 size-3 flex-shrink-0" />
                                      )}
                                      <div>
                                        <span className="font-medium">{issue.field}:</span>{" "}
                                        {issue.message}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Categories */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div>
                                  <p className="font-medium text-muted-foreground">Categories:</p>
                                  {pv.categories.length === 0 ? (
                                    <p className="text-muted-foreground">— Không có category</p>
                                  ) : (
                                    pv.categories.map((cat) => (
                                      <div key={cat.wooId} className="flex items-center gap-1">
                                        {cat.mapped ? (
                                          <CheckCircle className="size-3 text-green-500" />
                                        ) : (
                                          <XCircle className="size-3 text-destructive" />
                                        )}
                                        <span>
                                          {cat.wooName}{" "}
                                          <span className="text-muted-foreground">
                                            (ID: {cat.wooId})
                                          </span>
                                        </span>
                                        {cat.medusaId && (
                                          <code className="rounded bg-muted px-1 text-[10px]">
                                            → {cat.medusaId.slice(0, 12)}...
                                          </code>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Images in description */}
                                <div>
                                  <p className="font-medium text-muted-foreground">Images:</p>
                                  <p>Product images: {pv.imageCount}</p>
                                  {pv.imagesInDescription.length > 0 && (
                                    <p className="text-yellow-600">
                                      Images in description: {pv.imagesInDescription.length}
                                    </p>
                                  )}
                                </div>

                                {/* Payload preview */}
                                <div className="col-span-2">
                                  <p className="font-medium text-muted-foreground">Payload Preview:</p>
                                  <div className="mt-1 grid grid-cols-5 gap-1">
                                    {[
                                      { key: "title", label: "Title", value: pv.payloadPreview.hasTitle },
                                      { key: "sku", label: "SKU", value: pv.payloadPreview.hasSku },
                                      { key: "price", label: "Price", value: pv.payloadPreview.hasPrice },
                                      { key: "cats", label: "Cats", value: pv.payloadPreview.hasCategories },
                                      { key: "mapped", label: "Mapped", value: pv.payloadPreview.allCategoriesMapped },
                                      { key: "images", label: "Images", value: pv.payloadPreview.hasImages },
                                      { key: "desc", label: "Desc", value: pv.payloadPreview.hasDescription },
                                      { key: "var", label: "Variable", value: pv.payloadPreview.isVariable },
                                    ].map(({ key, label, value }) => (
                                      <Badge
                                        key={key}
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] h-5",
                                          value ? "text-green-600 border-green-300" : "text-red-500 border-red-300"
                                        )}
                                      >
                                        {label}: {value ? "✓" : "✗"}
                                      </Badge>
                                    ))}
                                    <Badge variant="outline" className="text-[10px] h-5">
                                      Vars: {pv.payloadPreview.variationCount}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                      Opts: {pv.payloadPreview.optionCount}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
