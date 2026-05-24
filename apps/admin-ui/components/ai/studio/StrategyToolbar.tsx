"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Square,
  RefreshCw,
  Loader2,
  RotateCcw,
  Settings2,
  Cpu,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AdvancedAISettings } from "./AdvancedAISettings";
import { useStudioStore, CONTENT_TYPE_TO_TASK, CONTENT_TYPE_LABELS, type StudioContentType } from "@/store/ai-studio-store";
import { useQuery } from "@tanstack/react-query";
import { useGeneration, stopGeneration } from "@/hooks/use-ai-generation";

// Derive reverse map at runtime — single source of truth from store
const TASK_TO_CONTENT_TYPE = Object.fromEntries(
  Object.entries(CONTENT_TYPE_TO_TASK).map(([ct, tt]) => [tt, ct as StudioContentType])
);

// ── Main Toolbar ────────────────────────────────────────────────────────────────

export function StrategyToolbar() {
  const store = useStudioStore();
  const contentType = store.contentType;
  const selectedProduct = store.selectedProduct;
  const generationStatus = store.generationStatus ?? "idle";
  const lastResult = store.lastResult;
  const setContentType = store.setContentType;
  const clearResult = store.clearResult;
  const setSelectedProduct = store.setSelectedProduct;

  const { generate } = useGeneration();

  // Load active providers
  const { data: activeProviders = [] } = useQuery({
    queryKey: ["ai-providers-active-toolbar"],
    queryFn: async () => {
      const res = await fetch("/api/ai/providers?status=active");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.providers ?? [];
    },
    staleTime: 30 * 1000,
  });

  // Load AI settings (for display badges)
  const { data: settingsData } = useQuery({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const hasActiveProvider = activeProviders.length > 0;

  // Get routing config for badges
  const routingRules = settingsData?.data?.taskRoutes ?? [];
  const brandVoices = settingsData?.data?.brandVoices ?? [];
  const activeBrandPreset = settingsData?.data?.activeBrandPreset;

  // Map contentType → task_type for matching
  const currentTaskType = Object.entries(TASK_TO_CONTENT_TYPE).find(
    ([, ct]) => ct === contentType
  )?.[0];

  const matchedRule = routingRules.find(
    (r: any) => r.task_type === currentTaskType && r.is_active !== false
  );

  // Find engine info
  const engineInfo = (() => {
    if (!matchedRule?.primary_provider_id) return null;
    return activeProviders.find(
      (p: any) => String(p.id) === String(matchedRule.primary_provider_id)
    );
  })();

  // Find brand voice
  const activeBrandVoice = brandVoices.find(
    (bv: any) => bv.preset === activeBrandPreset
  );

  const isGenerating =
    generationStatus === "resolving" ||
    generationStatus === "generating" ||
    generationStatus === "streaming" ||
    generationStatus === "finalizing";

  const isCompleted =
    generationStatus === "completed" || generationStatus === "stopped";

  const canGenerate =
    hasActiveProvider && !!selectedProduct && !isGenerating;

  const handleGenerate = async () => {
    if (!hasActiveProvider) {
      toast.error("Vui lòng cấu hình AI Provider tại AI Operating Center.");
      return;
    }
    if (!selectedProduct) {
      toast.error("Vui lòng chọn 1 sản phẩm");
      return;
    }
    await generate();
  };

  const handleClearAll = () => {
    clearResult();
    setSelectedProduct(null);
    toast.success("Đã xóa nội dung");
  };

  const getGenerateLabel = () => {
    if (isGenerating) return "AI đang viết...";
    if (isCompleted) return "Tạo lại";
    if (!hasActiveProvider) return "Chưa cấu hình";
    if (!selectedProduct) return "AI Viết Ngay";
    return "AI Viết Ngay";
  };

  const getGenerateVariant = () => {
    if (isGenerating) return "outline" as const;
    if (isCompleted) return "default" as const;
    if (!hasActiveProvider || !selectedProduct) return "secondary" as const;
    return "default" as const;
  };

  const getGenerateIcon = () => {
    if (isGenerating) return <Loader2 className="size-3.5 animate-spin" />;
    if (isCompleted) return <RefreshCw className="size-3.5" />;
    if (!hasActiveProvider) return <AlertCircle className="size-3.5" />;
    return <Sparkles className="size-3.5" />;
  };

  const getStatusBadge = () => {
    if (generationStatus === "resolving" || generationStatus === "generating") {
      return (
        <Badge className="h-6 text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
          <Loader2 className="size-3 animate-spin" />
          <span>Đang chuẩn bị...</span>
        </Badge>
      );
    }
    if (generationStatus === "streaming" || generationStatus === "finalizing") {
      return (
        <Badge className="h-6 text-[10px] gap-1 bg-primary/10 text-primary border-primary/20 animate-pulse">
          <Zap className="size-3" />
          <span>AI đang viết...</span>
        </Badge>
      );
    }
    if (generationStatus === "completed" || lastResult) {
      return (
        <Badge className="h-6 text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle2 className="size-3" />
          <span>Hoàn tất</span>
        </Badge>
      );
    }
    if (generationStatus === "stopped") {
      return (
        <Badge className="h-6 text-[10px] gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800">
          <AlertCircle className="size-3" />
          <span>Đã dừng</span>
        </Badge>
      );
    }
    if (generationStatus === "error") {
      return (
        <Badge className="h-6 text-[10px] gap-1 bg-destructive/10 text-destructive border-destructive/20">
          <AlertCircle className="size-3" />
          <span>Lỗi</span>
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="shrink-0 border-b bg-card/80 backdrop-blur-sm">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto scrollbar-none">

        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-2 shrink-0">
          <div className="size-6 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
            <Sparkles className="size-3 text-white" />
          </div>
          <span className="text-xs font-bold hidden sm:block">AI Studio</span>
        </div>

        <Separator orientation="vertical" className="h-5 shrink-0" />

        {/* AI Task Routing Preset Dropdown — tự động tạo từ routing DB */}
        <Select
          value={contentType}
          onValueChange={(v) => setContentType(v as StudioContentType)}
        >
          <SelectTrigger className="h-7 text-[11px] gap-1.5 font-semibold bg-transparent border-border/60 hover:border-primary/40 hover:bg-primary/5 data-[state=open]:bg-primary/5 data-[state=open]:border-primary/40 transition-colors min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {routingRules.map((rule: any) => {
              const ct = TASK_TO_CONTENT_TYPE[rule.task_type];
              const label = CONTENT_TYPE_LABELS[ct] ?? rule.task_type;
              return (
                <SelectItem key={ct} value={ct} className="text-xs">
                  {label}
                </SelectItem>
              );
            })}
            {routingRules.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Chưa có routing nào — vào AI Operating Center để thêm
              </div>
            )}
          </SelectContent>
        </Select>

        {/* AI Engine Badge */}
        <Badge
          variant="outline"
          className="h-6 text-[10px] gap-1 font-mono bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
        >
          <Cpu className="size-2.5" />
          <span>{engineInfo?.name ?? engineInfo?.model_name ?? matchedRule?.model ?? "Auto"}</span>
        </Badge>

        {/* Brand Voice Badge */}
        {activeBrandVoice && (
          <Badge
            variant="outline"
            className="h-6 text-[10px] gap-1 bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 hidden lg:flex"
          >
            <Zap className="size-2.5" />
            <span>{activeBrandVoice.name}</span>
          </Badge>
        )}

        {/* Routing Status */}
        {matchedRule ? (
          <Badge className="h-6 text-[10px] gap-1 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 hidden xl:flex">
            <CheckCircle2 className="size-2.5" />
            <span>Routing</span>
          </Badge>
        ) : (
          <Badge className="h-6 text-[10px] gap-1 bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 hidden xl:flex">
            <AlertCircle className="size-2.5" />
            <span>Chưa cấu hình</span>
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {/* Status */}
          <div className="hidden lg:flex">{getStatusBadge()}</div>

          {/* Warning */}
          {!hasActiveProvider && (
            <Badge
              variant="outline"
              className="h-6 text-[10px] gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 hidden lg:flex"
            >
              <AlertCircle className="size-3" />
              <span>Chưa cấu hình AI</span>
            </Badge>
          )}

          {/* AI Settings */}
          <AdvancedAISettings />

          {/* Clear */}
          {lastResult && !isGenerating && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleClearAll}
            >
              <RotateCcw className="size-3" />
              <span className="hidden xl:inline">Xóa</span>
            </Button>
          )}

          {/* Stop */}
          {isGenerating && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                stopGeneration();
                toast.info("Đã dừng tạo nội dung.");
              }}
            >
              <Square className="size-3" fill="currentColor" />
              <span className="hidden xl:inline">Dừng</span>
            </Button>
          )}

          {/* Generate */}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 font-semibold shadow-sm"
            disabled={!canGenerate && !isCompleted}
            onClick={handleGenerate}
            variant={getGenerateVariant()}
          >
            {getGenerateIcon()}
            <span className="hidden sm:inline">{getGenerateLabel()}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
