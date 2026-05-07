"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Download,
  FileJson,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import type { MigrationLog } from "@/types";

interface MappingData {
  categories: Record<number, string>;
  products: Record<number, string>;
  images: Record<number, string>;
  tags: Record<number, string>;
}

interface MigrationLogViewProps {
  logs: MigrationLog[];
  maxHeight?: string;
  mappingData?: MappingData | null;
  onClearLogs?: () => void;
  onClearMapping?: () => void;
  /** Progress info để hiển thị trong CSV */
  progressInfo?: {
    phase: string;
    totalItems: number;
    processedItems: number;
    successCount: number;
    failCount: number;
    currentItemName?: string;
  };
  /** Stats để hiển thị trong CSV */
  statsInfo?: {
    totalCategories: number;
    migratedCategories: number;
    totalProducts: number;
    migratedProducts: number;
    failedProducts: number;
    skippedProducts: number;
  };
}

// ============================================================
// CSV EXPORT FUNCTIONS
// ============================================================

/**
 * Chuyển đổi mảng logs thành định dạng CSV
 */
function convertLogsToCsv(logs: MigrationLog[]): string {
  const headers = [
    "Timestamp",
    "Step",
    "Action",
    "Status",
    "Message",
    "ID",
  ];
  
  const rows = logs.map((log) => [
    formatDateTime(log.timestamp),
    log.step,
    log.action,
    log.status,
    `"${log.message.replace(/"/g, '""')}"`, // Escape quotes in CSV
    log.id,
  ]);
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Tạo CSV cho progress (xử lý tới đâu)
 */
function convertProgressToCsv(
  progressInfo: MigrationLogViewProps["progressInfo"],
  statsInfo: MigrationLogViewProps["statsInfo"]
): string {
  const headers = ["Field", "Value"];
  const rows: string[][] = [
    ["Report Generated", new Date().toISOString()],
    ["", ""],
    ["=== PROGRESS ===", ""],
    ["Current Phase", progressInfo?.phase || "N/A"],
    ["Total Items", String(progressInfo?.totalItems || 0)],
    ["Processed Items", String(progressInfo?.processedItems || 0)],
    ["Success Count", String(progressInfo?.successCount || 0)],
    ["Failed Count", String(progressInfo?.failCount || 0)],
    ["Current Item", progressInfo?.currentItemName || "N/A"],
    ["Progress %", progressInfo?.totalItems && progressInfo.totalItems > 0
      ? `${Math.round((progressInfo.processedItems / progressInfo.totalItems) * 100)}%`
      : "N/A"],
    ["", ""],
    ["=== STATS ===", ""],
    ["Total Categories", String(statsInfo?.totalCategories || 0)],
    ["Migrated Categories", String(statsInfo?.migratedCategories || 0)],
    ["Total Products", String(statsInfo?.totalProducts || 0)],
    ["Migrated Products", String(statsInfo?.migratedProducts || 0)],
    ["Failed Products", String(statsInfo?.failedProducts || 0)],
    ["Skipped Products", String(statsInfo?.skippedProducts || 0)],
  ];
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Tạo CSV chi tiết cho từng sản phẩm đã migrate
 */
function convertProductsToCsv(logs: MigrationLog[]): string {
  const headers = [
    "STT",
    "Timestamp",
    "Product Name",
    "WooCommerce ID",
    "Medusa ID",
    "Status",
    "Details",
  ];
  
  // Extract product creation logs
  const productLogs = logs.filter(
    (log) =>
      log.step === "migrate_products" &&
      (log.action === "SUCCESS" || log.action === "ERROR" || log.action === "WARNING")
  );
  
  const rows = productLogs.map((log, index) => {
    // Extract info từ message
    const message = log.message;
    let productName = "";
    let wooId = "";
    let medusaId = "";
    let details = "";
    
    // Parse message format: [index] Tạo thành công: "Name" → Medusa ID: xxx
    const successMatch = message.match(/\[(\d+)\/(\d+)\] Tạo thành công: "([^"]+)" → Medusa ID: ([^\s|]+)/);
    if (successMatch) {
      productName = successMatch[3];
      medusaId = successMatch[4];
      // Try to find WooCommerce ID from earlier log
    }
    
    // Parse message format: Đang tạo: "Name" (WooCommerce ID: xxx)
    const creatingMatch = message.match(/Đang tạo: "([^"]+)" \(WooCommerce ID: (\d+)\)/);
    if (creatingMatch) {
      productName = creatingMatch[1];
      wooId = creatingMatch[2];
    }
    
    // For errors
    if (log.action === "ERROR") {
      details = message;
    }
    
    return [
      String(index + 1),
      formatDateTime(log.timestamp),
      `"${productName.replace(/"/g, '""')}"`,
      wooId,
      medusaId,
      log.action,
      `"${details.replace(/"/g, '""')}"`,
    ];
  });
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Tải file CSV
 */
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Extract error details from log message for highlighting
function parseErrorDetails(message: string): {
  parts: Array<{ text: string; type: "normal" | "error-code" | "http-status" | "woo-id" | "product-name" }>;
} {
  interface Segment { text: string; type: string; start: number; end: number }

  const patterns: Array<{ regex: RegExp; type: string }> = [
    { regex: /\[A-Z][A-Z0-9_]*(?:_[A-Z0-9_]+)*\]/g, type: "error-code" },
    { regex: /\(HTTP \d+\)/g, type: "http-status" },
    { regex: /\[WooCommerce ID: \d+\]/g, type: "woo-id" },
    { regex: /\(SKU: [^)]+\)/g, type: "product-name" },
  ];

  const segments: Segment[] = [];

  for (const { regex: r, type } of patterns) {
    const re = new RegExp(r.source, r.flags);
    let m;
    while ((m = re.exec(message)) !== null) {
      segments.push({ text: m[0], type, start: m.index, end: m.index + m[0].length });
    }
  }

  // Sort by start position
  segments.sort((a, b) => a.start - b.start);

  // Build parts
  const parts: Array<{ text: string; type: "normal" | "error-code" | "http-status" | "woo-id" | "product-name" }> = [];
  let pos = 0;
  for (const seg of segments) {
    if (seg.start > pos) {
      parts.push({ text: message.slice(pos, seg.start), type: "normal" });
    }
    parts.push({ text: seg.text, type: seg.type as "normal" | "error-code" | "http-status" | "woo-id" | "product-name" });
    pos = seg.end;
  }
  if (pos < message.length) {
    parts.push({ text: message.slice(pos), type: "normal" });
  }

  return { parts: parts.length > 0 ? parts : [{ text: message, type: "normal" }] };
}

const LOG_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const LOG_STYLES = {
  success: "border-l-green-500 bg-green-50 text-green-800",
  error: "border-l-red-500 bg-red-50 text-red-800",
  warning: "border-l-amber-500 bg-amber-50 text-amber-800",
  info: "border-l-blue-500 bg-blue-50 text-blue-800",
};

const LOG_BADGE_VARIANT = {
  success: "success" as const,
  error: "destructive" as const,
  warning: "warning" as const,
  info: "secondary" as const,
};

const PAGE_SIZE = 20;

export function MigrationLogView({
  logs,
  maxHeight = "400px",
  mappingData,
  onClearLogs,
  onClearMapping,
  progressInfo,
  statsInfo,
}: MigrationLogViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogsLength = useRef(logs.length);

  const sortedLogs = [...logs].reverse();
  const totalPages = Math.ceil(sortedLogs.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  // Tính số lượng log theo status
  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const warningCount = logs.filter((l) => l.status === "warning").length;

  // Tải về toàn bộ nhật ký (logs) dạng CSV
  const handleDownloadLogsCsv = useCallback(() => {
    const csv = convertLogsToCsv(logs);
    downloadCsv(csv, `migration_logs_${Date.now()}.csv`);
  }, [logs]);

  // Tải về progress report dạng CSV
  const handleDownloadProgressCsv = useCallback(() => {
    const csv = convertProgressToCsv(progressInfo, statsInfo);
    downloadCsv(csv, `migration_progress_${Date.now()}.csv`);
  }, [progressInfo, statsInfo]);

  // Tải về chi tiết sản phẩm đã migrate dạng CSV
  const handleDownloadProductsCsv = useCallback(() => {
    const csv = convertProductsToCsv(logs);
    downloadCsv(csv, `migration_products_${Date.now()}.csv`);
  }, [logs]);

  // Tải về toàn bộ nhật ký (logs) dạng JSON
  const handleDownloadLogs = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      type: "migration_logs",
      totalLogs: logs.length,
      logs,
    };
    downloadJson(exportData, `migration_logs_${Date.now()}.json`);
  };

  // Tải về mapping ID (WordPress → Medusa)
  const handleDownloadMapping = () => {
    if (!mappingData) return;
    const exportData = {
      exportedAt: new Date().toISOString(),
      type: "id_mapping",
      categories: Object.keys(mappingData.categories).length,
      products: Object.keys(mappingData.products).length,
      images: Object.keys(mappingData.images).length,
      tags: Object.keys(mappingData.tags).length,
      mapping: mappingData,
    };
    downloadJson(exportData, `migration_mapping_${Date.now()}.json`);
  };

  // Tải về backup hoàn chỉnh (logs + mapping + stats)
  const handleDownloadBackup = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      type: "migration_backup",
      version: "1.0",
      logs,
      mapping: mappingData || { categories: {}, products: {}, images: {}, tags: {} },
    };
    downloadJson(exportData, `migration_backup_${Date.now()}.json`);
  };

  const downloadJson = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Auto-scroll to top and navigate to last page when new logs arrive
  useEffect(() => {
    if (logs.length > prevLogsLength.current) {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
      setCurrentPage(1);
    }
    prevLogsLength.current = logs.length;
  }, [logs.length]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nhật ký Migration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="mb-2 size-8" />
            <p className="text-sm">Chưa có nhật ký</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Nhật ký Migration</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{logs.length} events</Badge>
            {/* Dropdown tải về / xuất file */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 size-4" />
                  Tải về
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleDownloadLogs}>
                  <FileJson className="mr-2 size-4" />
                  <div>
                    <p className="font-medium">Xuất nhật ký (JSON)</p>
                    <p className="text-xs text-muted-foreground">
                      File JSON chứa toàn bộ nhật ký migration
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadLogsCsv}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  <div>
                    <p className="font-medium">Xuất nhật ký (CSV)</p>
                    <p className="text-xs text-muted-foreground">
                      File CSV để mở trong Excel/Google Sheets
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadProgressCsv}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  <div>
                    <p className="font-medium">Xuất Tiến độ (CSV)</p>
                    <p className="text-xs text-muted-foreground">
                      Báo cáo tiến độ xử lý hiện tại
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadProductsCsv}>
                  <FileSpreadsheet className="mr-2 size-4" />
                  <div>
                    <p className="font-medium">Xuất DS Sản phẩm (CSV)</p>
                    <p className="text-xs text-muted-foreground">
                      Danh sách sản phẩm đã migrate thành công
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDownloadMapping}
                  disabled={!mappingData || (Object.keys(mappingData.categories).length === 0 && Object.keys(mappingData.products).length === 0)}
                >
                  <FileJson className="mr-2 size-4" />
                  <div>
                    <p className="font-medium">Xuất Mapping ID</p>
                    <p className="text-xs text-muted-foreground">
                      Bảng ánh xạ WordPress ID → Medusa ID
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadBackup}>
                  <FileJson className="mr-2 size-4" />
                  <div>
                    <p className="font-medium">Backup hoàn chỉnh</p>
                    <p className="text-xs text-muted-foreground">
                      Nhật ký + Mapping + Dữ liệu đầy đủ
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Nút xoá */}
            {(onClearLogs || onClearMapping) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onClearLogs && (
                    <DropdownMenuItem onClick={onClearLogs}>
                      <Trash2 className="mr-2 size-4" />
                      Xoá nhật ký
                    </DropdownMenuItem>
                  )}
                  {onClearMapping && (
                    <DropdownMenuItem onClick={onClearMapping}>
                      <Trash2 className="mr-2 size-4" />
                      Xoá mapping
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Log list with scroll */}
        <div
          ref={scrollRef}
          className="overflow-y-auto rounded-md border bg-muted/30"
          style={{ maxHeight }}
        >
          <div className="space-y-2 p-3">
            {paginatedLogs.map((log) => {
              const Icon = LOG_ICONS[log.status] || Info;
              const style = LOG_STYLES[log.status] || LOG_STYLES.info;
              const badgeVariant = LOG_BADGE_VARIANT[log.status] || "secondary";
              const { parts } = parseErrorDetails(log.message);

              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 rounded-md border-l-4 p-3 text-sm",
                    style
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={badgeVariant} className="text-xs">
                        {log.action}
                      </Badge>
                      <span className="text-xs opacity-70 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="font-medium leading-snug">
                      {parts.map((part, idx) => {
                        if (part.type === "error-code") {
                          return (
                            <span key={idx} className="mx-0.5 rounded bg-red-200 px-1 py-0.5 font-mono text-xs font-bold text-red-700">
                              {part.text}
                            </span>
                          );
                        }
                        if (part.type === "http-status") {
                          return (
                            <span key={idx} className="mx-0.5 rounded bg-orange-200 px-1 py-0.5 font-mono text-xs font-bold text-orange-700">
                              {part.text}
                            </span>
                          );
                        }
                        if (part.type === "woo-id") {
                          return (
                            <span key={idx} className="mx-0.5 rounded bg-blue-200 px-1 py-0.5 font-mono text-xs font-bold text-blue-700">
                              {part.text}
                            </span>
                          );
                        }
                        if (part.type === "product-name") {
                          return (
                            <span key={idx} className="font-mono text-xs font-semibold text-foreground">
                              {part.text}
                            </span>
                          );
                        }
                        return <span key={idx}>{part.text}</span>;
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, sortedLogs.length)} / {sortedLogs.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="size-8"
              >
                ←
              </Button>
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
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className="size-8"
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="size-8"
              >
                →
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
