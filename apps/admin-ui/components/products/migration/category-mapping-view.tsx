"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  TableIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { categoryMappingStorage, type CategoryMapping } from "@/types";
import type { WooCategory } from "@/types";

interface CategoryMappingViewProps {
  /** WooCommerce categories (from API) — used to display names + build mapping */
  categories?: WooCategory[];
  /** ID mapping from migration service: Record<wooCategoryId, medusaCategoryId> */
  idMapping?: Record<number, string>;
  onRefresh?: () => void;
  className?: string;
}

export function CategoryMappingView({ categories, idMapping, onRefresh, className }: CategoryMappingViewProps) {
  // Build CategoryMapping[] from WooCommerce categories + ID mapping
  const buildMappings = useCallback((): CategoryMapping[] => {
    // If page passes data, build from that
    if (categories && idMapping) {
      const wooMap = new Map(categories.map((c) => [c.id, c]));
      return Object.entries(idMapping).map(([wooIdStr, medusaId]) => {
        const wooId = parseInt(wooIdStr, 10);
        const wooCat = wooMap.get(wooId);
        return {
          wordpressCategoryId: wooId,
          wordpressCategoryName: wooCat?.name || `ID: ${wooId}`,
          wordpressSlug: wooCat?.slug || "",
          wordpressParentId: wooCat?.parent || null,
          medusaCategoryId: medusaId,
          medusaCategoryName: wooCat?.name || "",
          medusaCategoryHandle: wooCat?.slug || "",
          migratedAt: new Date().toISOString(),
        };
      });
    }
    // Fallback: load from localStorage
    return categoryMappingStorage.load();
  }, [categories, idMapping]);

  const [mappings, setMappings] = useState<CategoryMapping[]>(() => buildMappings());

  // Rebuild when props change
  useEffect(() => {
    setMappings(buildMappings());
  }, [buildMappings]);

  // Auto-poll localStorage every 2s for migration updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMappings(buildMappings());
    }, 2000);
    return () => clearInterval(interval);
  }, [buildMappings]);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const reloadMappings = useCallback(() => {
    setMappings(buildMappings());
    onRefresh?.();
  }, [buildMappings, onRefresh]);

  const handleExport = useCallback(() => {
    // Export current mappings state (with WooCommerce names)
    const store = {
      version: 1,
      wordpressUrl: "",
      medusaBackendUrl: "",
      mappings,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(store, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `category-mapping-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mappings]);

  const handleImport = useCallback(() => {
    const result = categoryMappingStorage.importFromJson(importJson);
    if (result.success) {
      setImportResult({ success: true, message: `Đã import ${result.count} mapping thành công!` });
      reloadMappings();
      setTimeout(() => {
        setShowImport(false);
        setImportJson("");
        setImportResult(null);
      }, 1500);
    } else {
      setImportResult({ success: false, message: result.error || "Import thất bại" });
    }
  }, [importJson, reloadMappings]);

  const handleClear = useCallback(() => {
    if (confirm("Xoá toàn bộ category mapping? Hành động này không thể hoàn tác.")) {
      categoryMappingStorage.clear();
      reloadMappings();
    }
  }, [reloadMappings]);

  const toggleRow = useCallback((wooId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(wooId)) {
        next.delete(wooId);
      } else {
        next.add(wooId);
      }
      return next;
    });
  }, []);

  const filtered = mappings.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.wordpressCategoryName.toLowerCase().includes(q) ||
      m.medusaCategoryName.toLowerCase().includes(q) ||
      m.wordpressSlug.toLowerCase().includes(q) ||
      m.medusaCategoryHandle.toLowerCase().includes(q) ||
      String(m.wordpressCategoryId).includes(q)
    );
  });

  const total = mappings.length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TableIcon className="size-4" />
            Category Mapping
            <Badge variant="outline" className="ml-1 font-normal">
              {total}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={reloadMappings}
              title="Làm mới"
              className="size-8 p-0"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              title="Export JSON"
              className="size-8 p-0"
              disabled={total === 0}
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImport(true)}
              title="Import JSON"
              className="size-8 p-0"
            >
              <Upload className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              title="Xoá tất cả mapping"
              className="size-8 p-0 text-destructive hover:text-destructive"
              disabled={total === 0}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, slug, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Chưa có category mapping.
            </p>
            <p className="text-xs text-muted-foreground">
              Chạy migration categories để tạo mapping.
            </p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="mb-2 flex gap-3 text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="size-3" />
                <span>{total} đã map</span>
              </div>
              {search && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>Kết quả lọc: {filtered.length}</span>
                </div>
              )}
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-1 border-b px-2 pb-1.5 text-xs font-medium text-muted-foreground">
              <div className="col-span-1"></div>
              <div className="col-span-3">WordPress</div>
              <div className="col-span-3">Medusa</div>
              <div className="col-span-3">Chi tiết</div>
              <div className="col-span-2 text-right">Ngày migrate</div>
            </div>

            {/* Rows */}
            <div className="max-h-80 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Không tìm thấy kết quả phù hợp
                </p>
              ) : (
                filtered.map((m) => (
                  <div key={m.wordpressCategoryId}>
                    <div
                      className={cn(
                        "grid grid-cols-12 gap-1 border-b px-2 py-1.5 text-xs transition-colors hover:bg-muted/50",
                        expandedRows.has(m.wordpressCategoryId) && "bg-muted/30"
                      )}
                    >
                      <div className="col-span-1 flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(m.wordpressCategoryId)}
                          className="size-5 p-0"
                        >
                          {expandedRows.has(m.wordpressCategoryId) ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronRight className="size-3" />
                          )}
                        </Button>
                      </div>

                      {/* WP info */}
                      <div className="col-span-3 flex flex-col justify-center">
                        <span className="truncate font-medium">{m.wordpressCategoryName}</span>
                        <span className="text-muted-foreground">ID: {m.wordpressCategoryId}</span>
                      </div>

                      {/* Medusa info */}
                      <div className="col-span-3 flex flex-col justify-center">
                        <span className="truncate font-medium">{m.medusaCategoryName}</span>
                        <span className="truncate text-muted-foreground">
                          {m.medusaCategoryHandle || "—"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-3 flex flex-col justify-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="size-3 text-green-500" />
                          <span className="truncate text-xs">
                            {m.wordpressSlug || "—"}
                          </span>
                        </div>
                        {m.wordpressParentId && (
                          <span className="text-xs text-muted-foreground">
                            Parent ID: {m.wordpressParentId}
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-2 flex items-center justify-end text-xs text-muted-foreground">
                        {new Date(m.migratedAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expandedRows.has(m.wordpressCategoryId) && (
                      <div className="border-b bg-muted/20 px-6 py-2 text-xs">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <div>
                            <span className="font-medium text-muted-foreground">WordPress ID:</span>{" "}
                            {m.wordpressCategoryId}
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Medusa ID:</span>{" "}
                            <code className="rounded bg-muted px-1 text-[10px]">
                              {m.medusaCategoryId}
                            </code>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">WP Slug:</span>{" "}
                            {m.wordpressSlug || "—"}
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Medusa Handle:</span>{" "}
                            {m.medusaCategoryHandle || "—"}
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Parent ID:</span>{" "}
                            {m.wordpressParentId ?? "—"}
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Migrated At:</span>{" "}
                            {new Date(m.migratedAt).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Category Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Dán JSON mapping đã export trước đó. Mapping mới sẽ được thêm vào (không ghi đè).
            </p>
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder={`Paste JSON here...\n{\n  "mappings": [...]\n}`}
              className="min-h-[200px] font-mono text-xs"
            />
            {importResult && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  importResult.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {importResult.success ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {importResult.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Đóng
            </Button>
            <Button onClick={handleImport} disabled={!importJson.trim()}>
              <Upload className="mr-1 size-3.5" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
