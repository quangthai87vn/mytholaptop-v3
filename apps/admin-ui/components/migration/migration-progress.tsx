"use client";

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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MigrationPhase, MigrationProgress, MigrationStats } from "@/types";

const PHASE_STEPS: Array<{
  id: MigrationPhase;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = [
  { id: "clearing", label: "Xoá dữ liệu cũ", description: "Dọn dẹp dữ liệu đã đồng bộ trước đó", icon: Trash2, color: "text-orange-500" },
  { id: "clearing_products", label: "Xoá sản phẩm", description: "Đang xoá sản phẩm cũ", icon: Package, color: "text-orange-500" },
  { id: "clearing_categories", label: "Xoá danh mục", description: "Đang xoá danh mục cũ", icon: FolderSync, color: "text-orange-500" },
  { id: "fetching", label: "Lấy dữ liệu", description: "Fetch dữ liệu từ WooCommerce", icon: DatabaseZap, color: "text-blue-500" },
  { id: "transforming", label: "Chuyển đổi", description: "Transform sang định dạng Medusa", icon: Zap, color: "text-purple-500" },
  { id: "uploading_categories", label: "Đồng bộ danh mục", description: "Đang đồng bộ danh mục sang Medusa", icon: FolderSync, color: "text-cyan-500" },
  { id: "uploading", label: "Đồng bộ sản phẩm", description: "Đang đồng bộ sản phẩm sang Medusa", icon: Package, color: "text-green-500" },
  { id: "done", label: "Hoàn tất", description: "Migration thành công", icon: CheckCircle, color: "text-green-600" },
  { id: "failed", label: "Thất bại", description: "Có lỗi xảy ra", icon: XCircle, color: "text-red-500" },
  { id: "rolling_back", label: "Đang xoá dữ liệu", description: "Rollback đang chạy...", icon: Loader2, color: "text-orange-500" },
  { id: "rollback_done", label: "Đã xoá xong", description: "Rollback hoàn tất", icon: CheckCircle, color: "text-green-600" },
  { id: "rollback_failed", label: "Rollback lỗi", description: "Có lỗi khi xoá dữ liệu", icon: XCircle, color: "text-red-500" },
];

interface MigrationProgressComponentProps {
  progress: MigrationProgress;
  stats: MigrationStats;
  totalProducts: number;
  isRunning: boolean;
  onStart: () => void;
  onCancel: () => void;
  onRollback: () => void;
  allowDelete: boolean;
  isConnected: boolean;
  hasExistingMapping?: boolean;
}

export function MigrationProgressComponent({
  progress,
  stats,
  totalProducts,
  isRunning,
  onStart,
  onCancel,
  onRollback,
  allowDelete,
  isConnected,
}: MigrationProgressComponentProps) {
  const phaseIndex = PHASE_STEPS.findIndex((p) => p.id === progress.phase);

  const overallProgress =
    progress.totalItems > 0
      ? Math.round((progress.processedItems / progress.totalItems) * 100)
      : 0;

  const isRollbackPhase = (phase: MigrationPhase) =>
    phase === "rolling_back" || phase === "rollback_done" || phase === "rollback_failed";

  const isClearPhase = (phase: MigrationPhase) =>
    phase === "clearing" || phase === "clearing_products" || phase === "clearing_categories";

  const getStepStatus = (step: typeof PHASE_STEPS[number], idx: number) => {
    const currentIdx = phaseIndex;
    const stepId = step.id;

    if (progress.phase === "done") {
      if (stepId === "done") return "success";
      if (idx < phaseIndex) return "success";
      return "pending";
    }
    if (progress.phase === "failed") {
      if (stepId === "failed") return "error";
      if (idx < phaseIndex) return "success";
      return "pending";
    }
    if (progress.phase === "rollback_done") {
      if (stepId === "rollback_done") return "success";
      if (idx < phaseIndex) return "success";
      return "pending";
    }
    if (progress.phase === "rollback_failed") {
      if (stepId === "rollback_failed") return "error";
      if (idx < phaseIndex) return "success";
      return "pending";
    }
    if (isClearPhase(stepId) || isRollbackPhase(stepId)) {
      if (stepId === progress.phase) return "active";
      if (idx < currentIdx) return "success";
      return "pending";
    }
    if (idx < currentIdx) return "success";
    if (idx === currentIdx) return "active";
    return "pending";
  };

  const activeStep = PHASE_STEPS.find((p) => p.id === progress.phase);

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
                getStepStatus(activeStep, phaseIndex) === "active" && "ring-2 ring-primary/30"
              )}>
                <activeStep.icon className={cn("size-5", activeStep.color,
                  getStepStatus(activeStep, phaseIndex) === "active" && "animate-pulse"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{activeStep.label}</p>
                <p className="text-xs text-muted-foreground">{activeStep.description}</p>
              </div>
              {progress.totalItems > 0 && !isRollbackPhase(progress.phase) && (
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums">{overallProgress}%</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {progress.totalItems > 0 && !isRollbackPhase(progress.phase) && (
              <Progress value={overallProgress} className="h-2" />
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
            ).map((step, idx) => {
              const status = getStepStatus(step, idx);
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
          <div className="grid grid-cols-2 gap-3">
            {totalProducts > 0 && (
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Tổng sản phẩm</p>
                <p className="text-lg font-bold">{totalProducts}</p>
              </div>
            )}
            {isRollbackPhase(progress.phase) ? (
              <>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Đã xoá</p>
                  <p className="text-lg font-bold text-orange-600">
                    {progress.rollbackStats?.deleted ?? 0}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{progress.rollbackStats?.total ?? 0}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Lỗi</p>
                  <p className="text-lg font-bold text-red-600">
                    {progress.rollbackStats?.errors ?? 0}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Danh mục</p>
                  <p className="text-lg font-bold text-cyan-600">{stats.migratedCategories}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Sản phẩm</p>
                  <p className="text-lg font-bold text-green-600">{stats.migratedProducts}</p>
                </div>
              </>
            )}
          </div>
        )}

        <Separator />

        {/* Action buttons */}
        <div className="space-y-2">
          {!isRunning && progress.phase === "idle" && (
            <Button
              className="w-full"
              onClick={onStart}
              disabled={!isConnected}
            >
              <Play className="mr-2 size-4" />
              Bắt đầu Migration
            </Button>
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
                {(progress.phase === "rollback_failed" || progress.phase === "done" || progress.phase === "failed") && allowDelete && (
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
