"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Circle,
  Loader2,
  RotateCcw,
  Play,
  Square,
  SkipForward,
  Trash2,
  FolderSync,
  Package,
  Zap,
  ArrowRight,
  DatabaseZap,
  ImageIcon,
  LayoutGrid,
  FileText,
  AlignLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MigrationPhase, MigrationProgress, MigrationStats } from "@/types";
import { useMigration } from "@/services/migration-hook";
import { loadIdMapping } from "@/services/medusa.service";

const PHASE_STEPS: Array<{
  id: MigrationPhase;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = [
  // Gộp: clearing + clearing_products + clearing_categories
  { id: "clearing", label: "Xoá dữ liệu cũ", description: "Dọn dẹp dữ liệu đã đồng bộ trước đó", icon: Trash2, color: "text-orange-500" },
  // Gộp: fetching + transforming
  { id: "fetching", label: "Lấy dữ liệu + Chuyển đổi", description: "Fetch & transform dữ liệu từ WooCommerce", icon: DatabaseZap, color: "text-blue-500" },
  { id: "uploading_categories", label: "Đồng bộ danh mục", description: "Đang đồng bộ danh mục sang Medusa", icon: FolderSync, color: "text-cyan-500" },
  // Gộp: uploading + migrating_products
  { id: "uploading", label: "Đồng bộ sản phẩm", description: "Đang đồng bộ sản phẩm sang Medusa", icon: Package, color: "text-green-500" },
  // Thêm bước media migration
  { id: "media_migration", label: "Migrate hình ảnh về Medusa", description: "Đang tải hình ảnh từ WooCommerce về Medusa", icon: ImageIcon, color: "text-indigo-500" },
  // Gộp: done + failed + cancelled → "Kết thúc"
  { id: "done", label: "Kết thúc", description: "Migration hoàn tất", icon: CheckCircle, color: "text-green-600" },
  { id: "rolling_back", label: "Đang xoá dữ liệu", description: "Rollback đang chạy...", icon: Loader2, color: "text-orange-500" },
  { id: "rollback_done", label: "Đã xoá xong", description: "Rollback hoàn tất", icon: CheckCircle, color: "text-green-600" },
  { id: "rollback_failed", label: "Rollback lỗi", description: "Có lỗi khi xoá dữ liệu", icon: XCircle, color: "text-red-500" },
];

// Props for backward compatibility
interface MigrationProgressComponentProps {
  progress?: MigrationProgress;
  stats?: MigrationStats;
  phase?: MigrationPhase;
  totalProducts?: number;
  isRunning?: boolean;
  onStart?: () => void;
  onMigrateMedia?: () => void;
  onCancel?: () => void;
  onRollback?: () => void;
  isConnected?: boolean;
  hasExistingMapping?: boolean;
}

// Export props interface for parent components
export type { MigrationProgressComponentProps };

export function MigrationProgressComponent(props: MigrationProgressComponentProps = {}) {
  // Use props if provided, otherwise get from MigrationManager singleton
  const managerState = useMigration();

  // Track if we have existing products mapping (read synchronously from localStorage)
  // This makes button visible immediately on first render, not waiting for useEffect
  const [hasExistingProducts, setHasExistingProducts] = useState(false);
  useEffect(() => {
    const saved = loadIdMapping();
    setHasExistingProducts(Boolean(saved?.products && Object.keys(saved.products).length > 0));
  }, []);

  // Merge props with managerState - prefer the one with more up-to-date data
  // ManagerState updates in real-time, props only update at end of migration
  const progress = (() => {
    const p = props.progress ?? managerState.progress;
    const m = managerState.progress;
    // Prefer managerState if it has more recent progress data
    if (m.processedItems > (props.progress?.processedItems ?? 0)) {
      return { ...p, ...m };
    }
    // For media migration phase, always prefer managerState (has real-time mediaProgress)
    if (m.phase === "media_migration") {
      return { ...p, ...m };
    }
    return p;
  })();
  const stats = (() => {
    const s = props.stats ?? managerState.stats;
    const m = managerState.stats;
    // Prefer managerState stats (has real-time migratedCounts)
    // but take totalProducts/totalCategories from props if set
    return {
      ...s,
      migratedCategories: m.migratedCategories,
      migratedProducts: m.migratedProducts,
      totalCategories: m.totalCategories > 0 ? m.totalCategories : s.totalCategories,
      totalProducts: m.totalProducts > 0 ? m.totalProducts : s.totalProducts,
      failedProducts: m.failedProducts,
      skippedProducts: m.skippedProducts,
    };
  })();
  const mapping = managerState.mapping;
  const isRunning = props.isRunning ?? managerState.isRunning;
  // Callbacks from props (required for button actions)
  const onStart = props.onStart;
  const onMigrateMedia = props.onMigrateMedia;
  const onCancel = props.onCancel;
  const onRollback = props.onRollback;
  const isConnected = props.isConnected ?? true;
  const totalProducts = stats.totalProducts;

  // Derive live stats from progress (stats only updates at end of migration)
  const getLiveStats = () => {
    // During category migration phase
    const isCategoryPhase = ["uploading_categories", "migrating_categories", "migrating_tags"].includes(progress.phase);
    const liveMigratedCategories = isCategoryPhase ? (progress.currentItemIndex ?? progress.processedItems) : stats.migratedCategories;
    const liveTotalCategories = isCategoryPhase ? (progress.totalItems || stats.totalCategories) : stats.totalCategories;

    // During product migration phase
    const isProductPhase = ["uploading", "migrating_products"].includes(progress.phase);
    const liveMigratedProducts = isProductPhase ? (progress.currentItemIndex ?? progress.processedItems) : stats.migratedProducts;
    const liveTotalProducts = progress.totalItems || totalProducts;

    return {
      migratedCategories: liveMigratedCategories,
      totalCategories: liveTotalCategories,
      migratedProducts: liveMigratedProducts,
      totalProducts: liveTotalProducts,
    };
  };
  const liveStats = getLiveStats();

  const isRollbackPhase = (phase: MigrationPhase) =>
    phase === "rolling_back" || phase === "rolling_back_products" || phase === "rolling_back_categories" || phase === "rollback_done" || phase === "rollback_failed";

  const isClearPhase = (phase: MigrationPhase) =>
    phase === "clearing" || phase === "clearing_products" || phase === "clearing_categories";

  const overallProgress = (() => {
    // During migrating_products: use liveStats.migratedProducts / liveStats.totalProducts
    if (progress.phase === "migrating_products") {
      return liveStats.totalProducts > 0
        ? Math.round((liveStats.migratedProducts / liveStats.totalProducts) * 100)
        : 0;
    }
    // During migrating_categories: use liveStats.migratedCategories / liveStats.totalCategories
    if (progress.phase === "migrating_categories") {
      return liveStats.totalCategories > 0
        ? Math.round((liveStats.migratedCategories / liveStats.totalCategories) * 100)
        : 0;
    }
    // During fetching: show indeterminate (no totalItems yet)
    if (progress.phase === "fetching" || progress.phase === "transforming") {
      return -1; // Special value to indicate indeterminate progress
    }
    // During clearing: show indeterminate
    if (isClearPhase(progress.phase)) {
      return -1;
    }
    // Default: use processedItems / totalItems
    if (progress.totalItems > 0) {
      return Math.round((progress.processedItems / progress.totalItems) * 100);
    }
    return 0;
  })();

  // Map sub-phases to their parent step index
  const getPhaseToStepIndex = (phase: MigrationPhase): number => {
    if (phase === "clearing_products" || phase === "clearing_categories") return 0; // → Xoá dữ liệu cũ
    if (phase === "transforming") return 1; // → Lấy dữ liệu + Chuyển đổi
    if (phase === "migrating_categories" || phase === "migrating_tags") return 2; // → Đồng bộ danh mục
    if (phase === "migrating_products") return 3; // → Đồng bộ sản phẩm
    if (phase === "done" || phase === "failed" || phase === "cancelled") return 5; // → Kết thúc (step index 5)
    // Rollback phases → hiển thị ở step "Xoá dữ liệu cũ" (index 0)
    if (phase === "rolling_back" || phase === "rolling_back_products" || phase === "rolling_back_categories") return 0;
    return PHASE_STEPS.findIndex((p) => p.id === phase);
  };

  const getStepStatus = (step: typeof PHASE_STEPS[number], idx: number) => {
    const currentIdx = getPhaseToStepIndex(progress.phase);
    const stepId = step.id;

    // Kết thúc: done/failed/cancelled → hiển thị ở step "Kết thúc" (index 5)
    if (progress.phase === "done") {
      if (stepId === "done") return "success";
      if (idx < 5) return "success";
      return "pending";
    }
    if (progress.phase === "failed" || progress.phase === "cancelled") {
      if (stepId === "done") return "error";
      if (idx < 5) return "success";
      return "pending";
    }
    if (progress.phase === "rollback_done") {
      if (stepId === "rollback_done") return "success";
      const rollbackDoneIdx = PHASE_STEPS.findIndex((p) => p.id === "rollback_done");
      if (idx < rollbackDoneIdx) return "success";
      return "pending";
    }
    if (progress.phase === "rollback_failed") {
      if (stepId === "rollback_failed") return "error";
      const rollbackFailedIdx = PHASE_STEPS.findIndex((p) => p.id === "rollback_failed");
      if (idx < rollbackFailedIdx) return "success";
      return "pending";
    }
    if (isRollbackPhase(stepId) || isClearPhase(stepId)) {
      if (stepId === progress.phase) return "active";
      if (idx < currentIdx) return "success";
      return "pending";
    }
    if (idx < currentIdx) return "success";
    if (idx === currentIdx) return "active";
    return "pending";
  };

  // Map done/failed/cancelled to "Kết thúc" step
  const getFinalStep = () => {
    if (progress.phase === "failed" || progress.phase === "cancelled") {
      return PHASE_STEPS.find((p) => p.id === "done");
    }
    return PHASE_STEPS.find((p) => p.id === progress.phase);
  };
  const activeStep = getFinalStep();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Điều khiển Migration</CardTitle>
          {isRunning && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Đang chạy
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active step card */}
        {activeStep && progress.phase !== "idle" && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm",
                getStepStatus(activeStep, getPhaseToStepIndex(progress.phase)) === "active" && "ring-2 ring-primary/30"
              )}>
                <activeStep.icon className={cn("size-5", activeStep.color,
                  getStepStatus(activeStep, getPhaseToStepIndex(progress.phase)) === "active" && "animate-pulse"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{activeStep.label}</p>
                <p className="text-xs text-muted-foreground">{activeStep.description}</p>
              </div>
              {overallProgress >= 0 && progress.totalItems > 0 && !isRollbackPhase(progress.phase) && (
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums">{overallProgress}%</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {overallProgress >= 0 && progress.totalItems > 0 && !isRollbackPhase(progress.phase) && progress.phase !== "media_migration" && (
              <Progress value={overallProgress} className="h-2" />
            )}

            {/* Media migration progress bar */}
            {progress.phase === "media_migration" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-600 font-medium">Migrate ảnh sản phẩm</span>
                  <span className="text-indigo-600 font-semibold tabular-nums">
                    {progress.mediaProgress?.processedProducts ?? 0}/{liveStats.totalProducts}
                  </span>
                </div>
                <Progress
                  value={liveStats.totalProducts > 0
                    ? Math.round(((progress.mediaProgress?.processedProducts ?? 0) / liveStats.totalProducts) * 100)
                    : 0}
                  className="h-2 [&>*]:bg-indigo-500"
                />
                {/* Media config summary */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600">
                    <ImageIcon className="size-2.5" />
                    Thumbnail
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">
                    <LayoutGrid className="size-2.5" />
                    Gallery
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-600">
                    <FileText className="size-2.5" />
                    Mô tả
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">
                    <AlignLeft className="size-2.5" />
                    Ngắn
                  </span>
                </div>
              </div>
            )}

            {/* Rollback progress bar */}
            {(progress.phase === "rolling_back_products" || progress.phase === "rolling_back_categories") && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-orange-600 font-medium">
                    {progress.phase === "rolling_back_products" ? "Đang xoá sản phẩm..." : "Đang xoá danh mục..."}
                  </span>
                  <span className="text-orange-600 font-semibold tabular-nums">
                    {progress.processedItems}/{progress.totalItems}
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2 [&>*]:bg-orange-500" />
              </div>
            )}

            {/* Current item name */}
            {progress.currentItemName && (
              <div className="flex items-center gap-2 text-xs">
                <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">
                  {progress.currentItemName}
                </span>
                {progress.currentItemIndex !== undefined && progress.totalItems > 0 && (
                  <span className="shrink-0 text-muted-foreground">
                    ({progress.currentItemIndex}/{progress.totalItems})
                  </span>
                )}
              </div>
            )}

            {/* Chunk info */}
            {progress.currentItem && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{progress.currentItem}</span>
              </div>
            )}

            {/* Stats during progress */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded bg-background/80 p-2 text-center">
                <p className="text-xs text-muted-foreground">Đã xử lý</p>
                <p className="text-sm font-bold tabular-nums">{progress.processedItems}</p>
              </div>
              <div className="rounded bg-background/80 p-2 text-center">
                <p className="text-xs text-muted-foreground">Thành công</p>
                <p className="text-sm font-bold text-green-600 tabular-nums">{progress.successCount}</p>
              </div>
              <div className="rounded bg-background/80 p-2 text-center">
                <p className="text-xs text-muted-foreground">Lỗi</p>
                <p className="text-sm font-bold text-red-600 tabular-nums">{progress.failCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Phase stepper - only show when idle or done */}
        {progress.phase === "idle" && (
          <div className="space-y-3">
            {PHASE_STEPS.filter((s) =>
              !isRollbackPhase(s.id) && !isClearPhase(s.id)
            ).map((step) => {
              const originalIdx = PHASE_STEPS.findIndex((p) => p.id === step.id);
              const status = getStepStatus(step, originalIdx);
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border bg-background",
                    status === "success" && "border-green-500 bg-green-50",
                    status === "active" && "border-primary bg-primary/10",
                    status === "pending" && "border-muted"
                  )}>
                    {status === "success" && <CheckCircle className="size-3.5 text-green-600" />}
                    {status === "active" && <Loader2 className="size-3.5 animate-spin text-primary" />}
                    {status === "pending" && <Circle className="size-3.5 text-muted-foreground" />}
                  </div>
                  <p className={cn(
                    "text-xs",
                    status === "active" && "font-medium text-primary",
                    status === "pending" && "text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        {/* Stats summary */}
        {progress.phase !== "idle" && (
          <div className="space-y-2">
            {/* Row 1: Tổng sản phẩm */}
            {totalProducts > 0 && (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/30">
                <span className="text-xs text-muted-foreground">Tổng sản phẩm</span>
                <span className="text-sm font-semibold tabular-nums">{totalProducts}</span>
              </div>
            )}

            {/* Row 2: Danh mục + Sản phẩm */}
            {!isRollbackPhase(progress.phase) && progress.phase !== "media_migration" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Danh mục</p>
                  <p className="text-base font-bold text-cyan-600 tabular-nums">
                    {liveStats.migratedCategories}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{liveStats.totalCategories}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Sản phẩm</p>
                  <p className="text-base font-bold text-green-600 tabular-nums">
                    {liveStats.migratedProducts}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{liveStats.totalProducts}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Row 3: Media migration progress */}
            {progress.phase === "media_migration" && (
              <div className="space-y-2">
                {/* Products synced */}
                <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-green-50 border-green-200">
                  <span className="text-xs text-green-700">Đã đồng bộ sản phẩm</span>
                  <span className="text-sm font-bold text-green-700 tabular-nums">
                    {liveStats.migratedProducts}
                    <span className="text-xs font-normal text-green-600">
                      /{liveStats.totalProducts}
                    </span>
                  </span>
                </div>
                {/* Media migration */}
                <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-indigo-50 border-indigo-200">
                  <span className="text-xs text-indigo-700">Migrate ảnh</span>
                  <span className="text-sm font-bold text-indigo-700 tabular-nums">
                    {progress.mediaProgress?.processedProducts ?? 0}
                    <span className="text-xs font-normal text-indigo-600">
                      /{liveStats.totalProducts}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Rollback stats */}
            {isRollbackPhase(progress.phase) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Đã xoá</p>
                  <p className="text-base font-bold text-orange-600 tabular-nums">
                    {progress.rollbackStats?.deleted ?? 0}
                    <span className="text-xs font-normal text-muted-foreground">
                      /{progress.rollbackStats?.total ?? 0}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">Lỗi</p>
                  <p className="text-base font-bold text-red-600 tabular-nums">
                    {progress.rollbackStats?.errors ?? 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Action buttons */}
        <div className="space-y-2">
          {!isRunning && progress.phase === "idle" && (
            <>
              <Button
                className="w-full"
                onClick={onStart}
                disabled={!isConnected}
              >
                <Play className="mr-2 size-4" />
                Bắt đầu Migration
              </Button>
              {/* Button migrate ảnh - chỉ hiện khi đã có sản phẩm migrate rồi */}
              {(hasExistingProducts || stats.migratedProducts > 0) && (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={onMigrateMedia}
                  disabled={!isConnected}
                >
                  <ImageIcon className="mr-2 size-4" />
                  Migrate ảnh
                </Button>
              )}
            </>
          )}
          {isRunning && (
            <Button
              className="w-full"
              variant="destructive"
              onClick={onCancel}
            >
              <Square className="mr-2 size-4" />
              Dừng Migration
            </Button>
          )}
          {!isRunning && (
            (progress.phase === "failed" ||
              progress.phase === "done" ||
              progress.phase === "rollback_done" ||
              progress.phase === "rollback_failed") && (
              <>
                {progress.phase === "failed" && (
                  <Button
                    className="w-full"
                    onClick={onStart}
                    disabled={!isConnected}
                  >
                    <SkipForward className="mr-2 size-4" />
                    Tiếp tục Migration
                  </Button>
                )}
                {(progress.phase === "done" || progress.phase === "rollback_done") && (
                  <Button
                    className="w-full"
                    onClick={onStart}
                    disabled={!isConnected}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Chạy lại Migration
                  </Button>
                )}
                {(progress.phase === "rollback_failed" || progress.phase === "done" || progress.phase === "failed") && (
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={onRollback}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Xoá dữ liệu đã migrate
                  </Button>
                )}
                {progress.phase === "rollback_done" && (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-green-500/50 bg-green-50 p-2 text-sm text-green-700">
                    <CheckCircle className="size-4" />
                    <span>Đã xoá dữ liệu thành công!</span>
                  </div>
                )}
                {progress.phase === "rollback_failed" && (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-red-500/50 bg-red-50 p-2 text-sm text-red-700">
                    <XCircle className="size-4" />
                    <span>Rollback thất bại. Thử lại?</span>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
