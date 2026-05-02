"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { loadApiSettings } from "@/lib/settings-storage";
import type { ApiSettings } from "@/lib/settings-storage";
import {
  searchInventoryItemsBySku,
  checkInventoryItemBySku,
  cleanupDryRun,
  runFullCleanup,
  getMigratedProductsWithSkus,
  deleteInventoryItems,
  type InventoryItemInfo,
  type CleanupDryRunResult,
  type CleanupResult,
  MedusaConfig,
} from "@/services/medusa.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  Loader2,
  Database,
  Package,
  Layers,
  ArrowLeft,
  RefreshCw,
  Zap,
} from "lucide-react";

interface SearchResult {
  table: string;
  id: string;
  sku: string;
  title: string;
  hasLinks: boolean;
  isOrphan: boolean;
  productId?: string;
  productTitle?: string;
}

export default function CleanupPage() {
  const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // SKU Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Dry Run
  const [dryRunResult, setDryRunResult] = useState<CleanupDryRunResult | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunDone, setDryRunDone] = useState(false);

  // Full Cleanup
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupStep, setCleanupStep] = useState(0);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [cleanupLogs, setCleanupLogs] = useState<Array<{ msg: string; type: string }>>([]);

  // Load settings
  useEffect(() => {
    loadApiSettings().then(setApiSettings);
  }, []);

  const getConfig = useCallback((): MedusaConfig | null => {
    if (!apiSettings) return null;
    return {
      backendUrl: apiSettings.medusaBackendUrl,
      adminApiKey: apiSettings.medusaAdminKey,
      adminEmail: apiSettings.medusaAdminEmail,
      adminPassword: apiSettings.medusaAdminPassword,
    };
  }, [apiSettings]);

  // Search SKU across all tables
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !getConfig()) return;
    setIsLoading(true);
    setSearchError("");
    setSearchResults([]);
    setHasSearched(true);

    try {
      const config = getConfig()!;
      const results: SearchResult[] = [];

      // 1. Search inventory_item table
      const invResult = await searchInventoryItemsBySku(config, searchQuery.trim());
      if (invResult.success && invResult.data) {
        for (const item of invResult.data) {
          results.push({
            table: "inventory_item",
            id: item.id,
            sku: item.sku,
            title: item.title,
            hasLinks: item.hasVariantLinks,
            isOrphan: item.isOrphan,
            productId: item.product?.id,
            productTitle: item.product?.title,
          });
        }
      }

      // 2. Search product_variant table (by SKU)
      const variantResult = await searchInventoryItemsBySku(config, searchQuery.trim());
      if (variantResult.success && variantResult.data) {
        for (const item of variantResult.data) {
          if (!results.find((r) => r.table === "inventory_item" && r.id === item.id)) {
            results.push({
              table: "inventory_item (variant)",
              id: item.id,
              sku: item.sku,
              title: item.title,
              hasLinks: item.hasVariantLinks,
              isOrphan: item.isOrphan,
              productId: item.product?.id,
              productTitle: item.product?.title,
            });
          }
        }
      }

      setSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Lỗi khi tìm kiếm");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, getConfig]);

  // Dry run
  const handleDryRun = useCallback(async () => {
    if (!getConfig()) return;
    setDryRunLoading(true);
    setDryRunResult(null);
    setDryRunDone(false);

    try {
      const result = await cleanupDryRun(getConfig()!);
      setDryRunResult(result);
      setDryRunDone(true);
    } catch (err) {
      setDryRunResult({
        success: false,
        totalItems: 0,
        orphanItems: 0,
        linkedItems: 0,
        items: [],
        error: err instanceof Error ? err.message : "Lỗi khi dry-run",
      });
      setDryRunDone(true);
    } finally {
      setDryRunLoading(false);
    }
  }, [getConfig]);

  // Get summary before cleanup
  const [cleanupSummary, setCleanupSummary] = useState<{
    products: number;
    skus: number;
    categories: number;
  } | null>(null);

  const handleLoadSummary = useCallback(async () => {
    if (!getConfig()) return;
    setIsLoading(true);

    try {
      const config = getConfig()!;
      const result = await getMigratedProductsWithSkus(config);
      if (result.success && result.data) {
        const skus = new Set<string>();
        for (const p of result.data) {
          for (const v of p.variants) {
            if (v.sku) skus.add(v.sku);
          }
        }
        setCleanupSummary({
          products: result.data.length,
          skus: skus.size,
          categories: 0, // Will be counted in runFullCleanup
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [getConfig]);

  // Run full cleanup
  const handleRunCleanup = useCallback(async () => {
    if (!getConfig() || !confirmCleanup) return;
    setCleanupLoading(true);
    setCleanupStep(1);
    setCleanupLogs([]);
    setCleanupResult(null);

    try {
      const result = await runFullCleanup(getConfig()!, (msg, type) => {
        setCleanupLogs((prev) => [...prev, { msg, type }]);
        setCleanupStep((s) => Math.min(s + 1, 4));
      });
      setCleanupResult(result);
      setCleanupStep(4);
    } catch (err) {
      setCleanupResult({
        success: false,
        deletedInventoryItems: 0,
        deletedProducts: 0,
        deletedCategories: 0,
        errors: [err instanceof Error ? err.message : "Lỗi không xác định"],
        items: [],
      });
      setCleanupStep(4);
    } finally {
      setCleanupLoading(false);
    }
  }, [getConfig, confirmCleanup]);

  const getStatusBadge = (isOrphan: boolean, hasLinks: boolean) => {
    if (isOrphan) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">ORPHAN</Badge>;
    if (hasLinks) return <Badge className="bg-green-100 text-green-800 border-green-300">Linked</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/migration">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Cleanup &amp; Debug</h1>
          <p className="text-muted-foreground">
            Kiểm tra và dọn dẹp inventory items orphan, xoá sản phẩm migrate theo metadata/SKU prefix
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search" className="gap-1.5">
            <Search className="size-3.5" />
            Tra cứu SKU
          </TabsTrigger>
          <TabsTrigger value="dryrun" className="gap-1.5">
            <Zap className="size-3.5" />
            Dry Run
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="gap-1.5">
            <Trash2 className="size-3.5" />
            Xoá dữ liệu
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: SKU Search */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-5" />
                Tra cứu SKU
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập SKU cần tra cứu (VD: woo-12345)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="max-w-md"
                />
                <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Tìm kiếm
                </Button>
              </div>

              {searchError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  {searchError}
                </div>
              )}

              {hasSearched && searchResults.length === 0 && !searchError && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="size-4" />
                  Không tìm thấy SKU nào trong database.
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Bảng</TableHead>
                        <TableHead className="w-48">Record ID</TableHead>
                        <TableHead className="w-40">SKU</TableHead>
                        <TableHead>Tiêu đề</TableHead>
                        <TableHead className="w-28">Trạng thái</TableHead>
                        <TableHead>Product liên kết</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((r, i) => (
                        <TableRow
                          key={`${r.table}-${r.id}-${i}`}
                          className={r.isOrphan ? "bg-yellow-50" : ""}
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {r.table}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {r.id}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium">
                            {r.sku}
                          </TableCell>
                          <TableCell className="text-sm">{r.title || "—"}</TableCell>
                          <TableCell>{getStatusBadge(r.isOrphan, r.hasLinks)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.productTitle ? (
                              <span>
                                {r.productTitle}
                                {r.productId && (
                                  <span className="font-mono ml-1 text-xs">
                                    ({r.productId.slice(0, 12)}...)
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {hasSearched && searchResults.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <strong>{searchResults.length}</strong> kết quả cho SKU: <strong>{searchQuery}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Dry Run */}
        <TabsContent value="dryrun" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-5" />
                Dry Run — Xem trước dữ liệu sẽ xoá
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 flex items-start gap-2">
                <Info className="size-4 mt-0.5 shrink-0" />
                <span>
                  Dry Run sẽ quét toàn bộ products trong Medusa, tìm các sản phẩm migrate
                  (SKU prefix <code className="bg-blue-100 px-1 rounded">woo-</code> hoặc metadata WooCommerce),
                  và kiểm tra inventory items tương ứng. <strong>Không xoá gì cả.</strong>
                </span>
              </div>

              <Button onClick={handleDryRun} disabled={dryRunLoading || !getConfig()}>
                {dryRunLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4" />
                    Chạy Dry Run
                  </>
                )}
              </Button>

              {dryRunDone && dryRunResult && (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{dryRunResult.totalItems}</div>
                      <div className="text-sm text-muted-foreground">Tổng Inventory Items</div>
                    </div>
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{dryRunResult.orphanItems}</div>
                      <div className="text-sm text-yellow-700">Inventory Orphan</div>
                    </div>
                    <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">{dryRunResult.linkedItems}</div>
                      <div className="text-sm text-green-700">Inventory có liên kết</div>
                    </div>
                  </div>

                  {dryRunResult.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      Lỗi: {dryRunResult.error}
                    </div>
                  )}

                  {/* Detailed table */}
                  {dryRunResult.items.length > 0 && (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Inventory Item ID</TableHead>
                            <TableHead>Tiêu đề</TableHead>
                            <TableHead className="w-28">Trạng thái</TableHead>
                            <TableHead>Product</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dryRunResult.items.map((item) => (
                            <TableRow
                              key={item.inventory_item_id}
                              className={item.isOrphan ? "bg-yellow-50" : ""}
                            >
                              <TableCell className="font-mono text-sm font-medium">
                                {item.sku}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {item.inventory_item_id}
                              </TableCell>
                              <TableCell className="text-sm">{item.title || "—"}</TableCell>
                              <TableCell>
                                {getStatusBadge(item.isOrphan, item.hasVariantLinks)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {item.product_title ? (
                                  <span>
                                    {item.product_title}
                                    {item.product_id && (
                                      <span className="font-mono ml-1 text-xs">
                                        ({item.product_id.slice(0, 12)}...)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {dryRunResult.items.length === 0 && dryRunResult.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="size-4" />
                      Không có inventory items nào cần xoá. Database đã sạch.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Full Cleanup */}
        <TabsContent value="cleanup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="size-5" />
                Xoá dữ liệu Migration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <ShieldAlert className="size-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Cảnh báo:</strong> Chức năng này sẽ xoá vĩnh viễn dữ liệu khỏi Medusa.
                  Bao gồm: inventory items orphan, products, và categories đã migrate.
                  <strong>Hành động này không thể hoàn tác.</strong>
                </span>
              </div>

              {/* Summary */}
              {!cleanupSummary && (
                <Button onClick={handleLoadSummary} disabled={isLoading || !getConfig()}>
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Xem trước dữ liệu sẽ xoá
                </Button>
              )}

              {cleanupSummary && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <Package className="size-8 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{cleanupSummary.products}</div>
                      <div className="text-sm text-muted-foreground">Products migrate</div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <Layers className="size-8 text-yellow-600" />
                    <div>
                      <div className="text-2xl font-bold">{cleanupSummary.skus}</div>
                      <div className="text-sm text-muted-foreground">SKU variants</div>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 flex items-center gap-3">
                    <Database className="size-8 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">—</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation */}
              {cleanupSummary && !cleanupLoading && !cleanupResult && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={confirmCleanup}
                        onCheckedChange={(v) => setConfirmCleanup(!!v)}
                      />
                      <span className="text-sm font-medium text-orange-900">
                        Tôi hiểu rủi ro và muốn xoá dữ liệu migration
                      </span>
                    </label>
                    <p className="text-xs text-orange-700 pl-6">
                      Xác nhận bạn đã backup database hoặc chắc chắn muốn xoá.
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={handleRunCleanup}
                    disabled={!confirmCleanup || !getConfig()}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="size-4" />
                    Xoá dữ liệu Migration
                  </Button>
                </div>
              )}

              {/* Progress */}
              {cleanupLoading && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">Đang xoá dữ liệu...</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Bước {cleanupStep}/4: {cleanupStep === 1 ? "Thu thập products..." : cleanupStep === 2 ? "Xoá inventory orphan..." : cleanupStep === 3 ? "Xoá products..." : "Xoá categories..."}</p>
                  </div>
                </div>
              )}

              {/* Logs */}
              {cleanupLogs.length > 0 && (
                <ScrollArea className="h-48 rounded-lg border bg-slate-950 p-3">
                  <div className="space-y-1 font-mono text-xs">
                    {cleanupLogs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.type === "error"
                            ? "text-red-400"
                            : log.type === "warn"
                            ? "text-yellow-400"
                            : log.type === "success"
                            ? "text-green-400"
                            : "text-slate-400"
                        }
                      >
                        {log.msg}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Result */}
              {cleanupResult && !cleanupLoading && (
                <div className="space-y-4">
                  {cleanupResult.success ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                        <CheckCircle className="size-5" />
                        Cleanup hoàn tất!
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>Đã xoá: {cleanupResult.deletedInventoryItems} inventory items</p>
                        <p>Đã xoá: {cleanupResult.deletedProducts} products</p>
                        <p>Đã xoá: {cleanupResult.deletedCategories} categories</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                        <AlertTriangle className="size-5" />
                        Cleanup gặp lỗi
                      </div>
                      <div className="text-sm text-red-700">
                        {cleanupResult.errors.map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {cleanupResult.items.length > 0 && (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Inventory Item ID</TableHead>
                            <TableHead>Tiêu đề</TableHead>
                            <TableHead className="w-28">Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cleanupResult.items.map((item) => (
                            <TableRow key={item.inventory_item_id} className="bg-yellow-50">
                              <TableCell className="font-mono text-sm font-medium">
                                {item.sku}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {item.inventory_item_id}
                              </TableCell>
                              <TableCell className="text-sm">{item.title}</TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  Đã xoá
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={handleDryRun} variant="outline">
                      <RefreshCw className="size-4" />
                      Chạy lại Dry Run
                    </Button>
                    <Link href="/migration">
                      <Button variant="default">
                        <ArrowLeft className="size-4" />
                        Quay lại Migration
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
