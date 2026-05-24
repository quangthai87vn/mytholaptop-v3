"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { useStudioStore, GENERATION_STATUS_LABELS } from "@/store/ai-studio-store";
import { GenerationProgressSteps } from "../GenerationProgressSteps";
import { stopGeneration } from "@/hooks/use-ai-generation";
import { StreamingPreview } from "../output/StreamingPreview";
import { CTAPanel } from "../output/CTAPanel";
import { HashtagsChips } from "../output/HashtagsChips";
import { ActionToolbar } from "../output/ActionToolbar";
import { FacebookPreviewCard } from "../output/FacebookPreviewCard";
import { Cpu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface GenerateStepProps {
  onGenerate: () => void;
}

export function GenerateStep({ onGenerate }: GenerateStepProps) {
  const store = useStudioStore();
  const {
    lastResult,
    generationStatus = "idle",
    pipelineStage = "idle",
    streamingText = "",
    finalContent = "",
    generationError = null,
    clearResult,
    contentType,
    stats,
    selectedProduct,
    advancedOverrides,
  } = store;

  const [copied, setCopied] = useState(false);

  // Load AI settings to resolve provider name for display
  const { data: settingsData } = useQuery({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const providers = settingsData?.data?.providers ?? [];
  const taskRoutes = settingsData?.data?.taskRoutes ?? [];
  const currentTaskType = { facebook_post: "facebook_content", seo_article: "seo_article", video_script: "video_script", image_prompt: "image_prompt", zalo_message: "zalo_message", product_description: "product_description", email_marketing: "email_marketing" }[contentType] ?? contentType;
  const matchedRule = taskRoutes.find((r: any) => r.task_type === currentTaskType && r.is_active !== false);

  const providerId = advancedOverrides?.provider_id ?? matchedRule?.primary_provider_id;
  const activeProvider = providerId ? providers.find((p: any) => String(p.id) === String(providerId)) : null;
  const providerName = activeProvider?.name || activeProvider?.display_name || null;
  const modelName = advancedOverrides?.model_override ?? matchedRule?.primary_model_override ?? activeProvider?.model_name ?? null;
  const [streamedContent, setStreamedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => { setStreamedContent(streamingText); }, [streamingText]);

  const handleCopy = useCallback(() => {
    const text = lastResult?.content || finalContent || "";
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Đã copy!");
  }, [lastResult, finalContent]);

  const handleStop = useCallback(() => { stopGeneration(); }, []);
  const handleRetry = useCallback(() => {
    clearResult();
    onGenerate();
  }, [clearResult, onGenerate]);

  const handleEdit = useCallback(() => {
    setEditValue(lastResult?.content || finalContent || "");
    setIsEditing(true);
  }, [lastResult, finalContent]);

  const handleSaveEdit = useCallback(() => {
    useStudioStore.setState((s) => ({
      lastResult: s.lastResult ? { ...s.lastResult, content: editValue } : null,
    }));
    setIsEditing(false);
    toast.success("Đã lưu nội dung");
  }, [editValue]);

  const handleSchedule = useCallback(() => {
    toast.info("Tính năng lên lịch đang được phát triển");
  }, []);

  const handlePost = useCallback(() => {
    toast.info("Đang kết nối đến Facebook...");
  }, []);

  const isGenerating =
    generationStatus === "resolving" ||
    generationStatus === "generating" ||
    generationStatus === "streaming" ||
    generationStatus === "finalizing";
  const isCompleted = generationStatus === "completed";
  const isError = generationStatus === "error";
  const isEmpty = generationStatus === "idle" && !lastResult && !finalContent;
  const isStreamingActive = generationStatus === "streaming" || generationStatus === "finalizing";
  const rawContent = (lastResult?.content || finalContent || "") as string;

  // ── Generating State ──────────────────────────────────────────────────────────

  function renderGeneratingState() {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-in fade-in duration-300">
        <div className="w-full max-w-2xl">
          <GenerationProgressSteps stage={pipelineStage} status={generationStatus} />
        </div>

        {/* Premium streaming card */}
        <div className="w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground/70">Đang viết nội dung</span>
            {providerName && (
              <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                <Cpu className="size-2.5" />
                {providerName}
                {modelName && <span className="opacity-60 font-mono">· {modelName}</span>}
              </span>
            )}
            {streamedContent.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto">{streamedContent.length} ký tự</span>
            )}
          </div>
          <div className="p-6">
            <StreamingPreview content={streamedContent} isStreaming={isStreamingActive} />
          </div>
        </div>

        <div className="w-full max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Sparkles className="size-3 text-primary animate-pulse" />
            {streamedContent.length > 0 ? `${streamedContent.length} ký tự` : "Đang kết nối AI..."}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 font-medium border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={handleStop}
          >
            <Square className="size-3" fill="currentColor" />
            Dừng
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty State ─────────────────────────────────────────────────────────────

  function renderEmptyState() {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="size-16 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-lg ring-4 ring-primary/5">
            <Sparkles className="size-8 text-primary/70" />
          </div>
          <div className="absolute -top-1 -right-1 size-6 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="size-3.5 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold leading-tight">Sẵn sàng tạo nội dung</p>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed px-4">
            Đã chọn sản phẩm và cấu hình AI. Nhấn nút bên dưới để bắt đầu.
          </p>
        </div>
        <Button
          size="lg"
          className="h-11 gap-2 px-8 font-bold shadow-lg shadow-primary/20"
          onClick={onGenerate}
        >
          <Sparkles className="size-5" />
          Tạo nội dung
        </Button>
      </div>
    );
  }

  // ── Completed State ────────────────────────────────────────────────────────

  function renderCompletedState() {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Success banner */}
        {rawContent && (
          <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/70 to-transparent dark:from-emerald-950/30 dark:border-emerald-800/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Nội dung đã hoàn tất
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                <span>{rawContent.split(/\s+/).filter(Boolean).length} từ</span>
                <span>·</span>
                <span>{rawContent.length} ký tự</span>
              </div>
            </div>
            {stats && (
              <div className="flex items-center gap-3 text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                <span>{stats.tokens} tokens</span>
                <span>·</span>
                <span>{Math.round(stats.latency_ms / 1000)}s</span>
                <span>·</span>
                <span className="font-mono">{stats.model}</span>
              </div>
            )}
          </div>
        )}

        {/* Facebook preview */}
        {contentType === "facebook_post" && rawContent && !isEditing && (
          <FacebookPreviewCard
            content={rawContent}
            productName={selectedProduct?.name || "Mỹ Tho Laptop"}
            cta={lastResult?.cta || ""}
            hashtags={lastResult?.hashtags || []}
            onCopy={handleCopy}
            onRegenerate={handleRetry}
            onPost={handlePost}
          />
        )}

        {/* Generic content */}
        {!["facebook_post"].includes(contentType) && rawContent && !isEditing && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="p-6">
              <StreamingPreview content={rawContent} isStreaming={false} />
            </div>
          </div>
        )}

        {/* CTA */}
        {lastResult?.cta && !isEditing && (
          <CTAPanel cta={lastResult.cta} productName={selectedProduct?.name} />
        )}

        {/* Hashtags */}
        {(lastResult?.hashtags?.length ?? 0) > 0 && !isEditing && (
          <HashtagsChips
            hashtags={lastResult?.hashtags || []}
            onCopy={(tag) => { navigator.clipboard.writeText(tag); toast.success("Đã copy hashtag!"); }}
            onCopyAll={() => { navigator.clipboard.writeText((lastResult?.hashtags || []).join(" ")); toast.success("Đã copy tất cả!"); }}
          />
        )}

        {/* Edit mode */}
        {isEditing && (
          <div className="space-y-3">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full min-h-[200px] p-4 rounded-xl border bg-card text-sm leading-[1.75] outline-none focus:ring-2 focus:ring-primary/20 font-sans"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={handleSaveEdit}>
                Lưu
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(false)}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────────────

  function renderErrorState() {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-in fade-in">
        <div className="size-14 rounded-2xl bg-destructive/10 flex items-center justify-center shadow-sm">
          <AlertCircle className="size-8 text-destructive" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-destructive">Đã xảy ra lỗi</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
            {generationError || "AI không thể tạo nội dung. Vui lòng thử lại."}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={handleRetry}>
          <RefreshCw className="size-3" /> Thử lại
        </Button>
      </div>
    );
  }

  // ── Main Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        {isEmpty && renderEmptyState()}
        {isGenerating && renderGeneratingState()}
        {isCompleted && renderCompletedState()}
        {isError && renderErrorState()}
      </div>

      {/* Sticky Action Toolbar */}
      {isCompleted && (rawContent || lastResult) && (
        <ActionToolbar
          onCopy={handleCopy}
          onRegenerate={handleRetry}
          onEdit={handleEdit}
          onSchedule={handleSchedule}
          onPost={handlePost}
          isCopied={copied}
        />
      )}
    </div>
  );
}
