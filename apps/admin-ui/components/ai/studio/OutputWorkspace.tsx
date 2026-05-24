"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Download,
  RefreshCw,
  FileText,
  Layers,
  MousePointer,
  Search,
  Hash,
  Check,
  Loader2,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Zap,
  ChevronRight,
  Edit3,
  Save,
  AlertCircle,
  ExternalLink,
  Wand2,
  Clock,
  Square,
  Calendar,
  Share2,
  Globe,
  MessageCircle,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStudioStore,
  type OutputTab,
  type GenerationStatus,
  GENERATION_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
} from "@/store/ai-studio-store";
import { stopGeneration } from "@/hooks/use-ai-generation";
import { getCreativityLabel } from "@/services/ai/generation-resolver";
import { GenerationProgressSteps } from "./GenerationProgressSteps";
import { useResolvedConfig } from "./StrategySelector";
import { StreamingPreview } from "./output/StreamingPreview";
import { CTAPanel } from "./output/CTAPanel";
import { HashtagsChips } from "./output/HashtagsChips";
import { ActionToolbar } from "./output/ActionToolbar";
import { FacebookPreviewCard } from "./output/FacebookPreviewCard";

// ── AI Config Preview Panel ────────────────────────────────────────────────────

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-medium text-right leading-tight max-w-[100px] truncate">{value}</span>
    </div>
  );
}

function AIConfigPreviewPanel({ onGenerate }: { onGenerate?: () => void }) {
  const store = useStudioStore();
  const { config, isLoading } = useResolvedConfig();
  const selectedProduct = store.selectedProduct;
  const contentTypeLabel = CONTENT_TYPE_LABELS[store.contentType ?? "facebook_post"] || store.contentType;

  if (!selectedProduct) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">AI sẽ dùng</p>
            <p className="text-[10px] text-muted-foreground">{contentTypeLabel}</p>
          </div>
        </div>
        {config?.resolutionSource && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
            config.resolutionSource === "routing_rule"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              : config.resolutionSource === "provider_default"
              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
              : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800"
          }`}>
            {config.resolutionSource === "routing_rule" ? "⚡ Routing"
              : config.resolutionSource === "provider_default" ? "Provider"
              : "System Default"}
          </span>
        )}
      </div>

      {config?.resolutionSource === "system_default" && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="size-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Chưa cấu hình AI Routing. Đang dùng provider mặc định.{" "}
            <a href="/content/settings" className="underline font-medium">Cấu hình ngay</a>
          </p>
        </div>
      )}

      {!config?.hasValidProvider && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="size-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Provider đã bị xóa. <a href="/content/settings" className="underline font-medium">Cấu hình lại</a>
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          <ConfigRow label="Engine" value={<span className="font-medium">{config?.engineName ?? "—"}</span>} />
          <ConfigRow label="Model" value={<span className="font-mono text-primary/80">{config?.model ?? "—"}</span>} />
          <ConfigRow label="Phong cách" value={<span>{config?.strategy.name ?? "—"}</span>} />
          <ConfigRow label="Độ dài" value={<span>{config?.contentLengthLabel ?? "—"}</span>} />
          <ConfigRow label="Brand Voice" value={<span>{config?.brandVoice?.name ?? "Mặc định"}</span>} />
          <ConfigRow
            label="System Prompt"
            value={
              config?.systemPrompt ? (
                <span className="text-primary/80 max-w-[100px] truncate" title={config.systemPrompt.name}>
                  {config.systemPrompt.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Mặc định</span>
              )
            }
          />
        </div>
      )}

      <div className="space-y-1.5 pt-1 border-t">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Sáng tạo</span>
          <span className="text-[10px] font-medium text-primary">
            {config?.temperature != null ? `${Math.round(config.temperature * 100)}%` : "—"}
          </span>
        </div>
        {config?.temperature != null && (
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full transition-all"
              style={{ width: `${config.temperature * 100}%` }}
            />
          </div>
        )}
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Chính xác</span>
          <span>{config?.temperature != null ? getCreativityLabel(config.temperature) : ""}</span>
          <span>Viral</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t">
        <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
          <FileText className="size-3 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold truncate">{selectedProduct.name}</p>
          <p className="text-[9px] text-muted-foreground truncate">{selectedProduct.category || "Không phân loại"}</p>
        </div>
      </div>

      {onGenerate && (
        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5 font-semibold"
          onClick={onGenerate}
        >
          <Sparkles className="size-3.5" />
          AI Viết Ngay
        </Button>
      )}
    </div>
  );
}

// ── Quick Suggestions ─────────────────────────────────────────────────────────

const SUGGESTIONS: Array<{
  icon: typeof Zap;
  label: string;
  desc: string;
  bgColor: string;
  iconColor: string;
  contentType: "facebook_post" | "seo_article" | "video_script" | "image_prompt" | "zalo_message" | "product_description" | "email_marketing";
}> = [
  { icon: Zap, label: "Bài Facebook bán hàng", desc: "Tạo nội dung quảng cáo hiệu quả", bgColor: "bg-blue-500/10", iconColor: "text-blue-500", contentType: "facebook_post" },
  { icon: Search, label: "Bài SEO chuẩn Google", desc: "Tối ưu tìm kiếm", bgColor: "bg-green-500/10", iconColor: "text-green-500", contentType: "seo_article" },
  { icon: Wand2, label: "Video Script", desc: "Kịch bản quảng cáo video", bgColor: "bg-violet-500/10", iconColor: "text-violet-500", contentType: "video_script" },
  { icon: Layers, label: "Caption đa nền tảng", desc: "Bài viết cho Zalo, website...", bgColor: "bg-orange-500/10", iconColor: "text-orange-500", contentType: "zalo_message" },
];

// ── Tabs Config ──────────────────────────────────────────────────────────────

type TabMeta = { value: OutputTab; label: string; icon: typeof FileText };

const TABS: TabMeta[] = [
  { value: "main", label: "Nội dung", icon: FileText },
  { value: "variants", label: "Biến thể", icon: Layers },
  { value: "hooks", label: "Móc câu", icon: Zap },
  { value: "cta", label: "CTA", icon: MousePointer },
  { value: "seo", label: "SEO", icon: Search },
  { value: "hashtags", label: "Hashtags", icon: Hash },
];

function getTabCount(tab: OutputTab, result: ReturnType<typeof useStudioStore.getState>["lastResult"]) {
  if (!result) return 0;
  switch (tab) {
    case "main": return 1;
    case "variants": return result.variants.length;
    case "hooks": return result.hooks.length;
    case "cta": return result.cta ? 1 : 0;
    case "seo": return result.seoKeywords.length;
    case "hashtags": return result.hashtags.length;
    default: return 0;
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export function OutputWorkspace({ onGenerate }: { onGenerate?: () => void }) {
  const store = useStudioStore();
  const {
    lastResult,
    generationStatus = "idle",
    pipelineStage = "idle",
    streamingText = "",
    finalContent = "",
    generationError = null,
    activeOutputTab = "main",
    setActiveOutputTab,
    clearResult,
    contentType,
    stats,
  } = store;

  const [copiedTab, setCopiedTab] = useState<OutputTab | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => { setStreamedContent(streamingText); }, [streamingText]);

  const handleCopy = useCallback((text: string, tab: OutputTab) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
    toast.success("Đã copy!");
  }, []);

  const handleUseVariantAsMain = useCallback((variant: string) => {
    useStudioStore.setState((s) => ({
      finalContent: variant,
      lastResult: s.lastResult ? { ...s.lastResult, content: variant } : {
        content: variant, title: "", variants: [], hooks: [], cta: "", seoKeywords: [], hashtags: [],
      },
    }));
    setActiveOutputTab("main");
    toast.success("Đã dùng biến thể này làm nội dung chính");
  }, [setActiveOutputTab]);

  const handleUseHookAsMain = useCallback((hook: string) => {
    const current = useStudioStore.getState();
    const content = current.finalContent || current.lastResult?.content || "";
    const updated = hook + "\n\n" + content;
    useStudioStore.setState((s) => ({
      finalContent: updated,
      lastResult: s.lastResult ? { ...s.lastResult, content: updated } : {
        content: updated, title: "", variants: [], hooks: [], cta: "", seoKeywords: [], hashtags: [],
      },
    }));
    setActiveOutputTab("main");
    toast.success("Đã dùng hook này làm mở đầu");
  }, [setActiveOutputTab]);

  const handleExport = useCallback(() => {
    const content = lastResult?.content || finalContent || "";
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ai-content-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã export!");
  }, [lastResult, finalContent]);

  const handleStop = useCallback(() => { stopGeneration(); }, []);
  const handleRetry = useCallback(() => {
    clearResult();
    if (onGenerate) onGenerate();
  }, [onGenerate, clearResult]);

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

  // Status helpers
  const isGenerating =
    generationStatus === "resolving" ||
    generationStatus === "generating" ||
    generationStatus === "streaming" ||
    generationStatus === "finalizing";
  const isCompleted = generationStatus === "completed";
  const isStopped = generationStatus === "stopped";
  const isError = generationStatus === "error";
  const isEmpty = generationStatus === "idle" && !lastResult && !finalContent;
  const isStreamingActive = generationStatus === "streaming" || generationStatus === "finalizing";

  const rawContent = (lastResult?.content || finalContent || "") as string;
  const mainContent = rawContent;

  // ── Empty State ─────────────────────────────────────────────────────────

  function renderEmptyState() {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-8 animate-in fade-in duration-300">
        <div className="relative">
          <div className="size-[72px] rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shadow-lg ring-4 ring-primary/5">
            <Sparkles className="size-8 text-primary/70" />
          </div>
          <div className="absolute -top-2 -right-2 size-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="size-3.5 text-primary" />
          </div>
          <div className="absolute -bottom-1.5 -left-1.5 size-4 rounded-full bg-emerald-500 shadow-sm" />
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-base font-bold leading-tight">AI Marketing Studio</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed px-4">
            Chọn sản phẩm bên trái, chọn chiến lược và nhấn{" "}
            <strong className="text-foreground">"AI Viết Ngay"</strong> để tạo nội dung.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <Lightbulb className="size-3.5" /> Bắt đầu nhanh
          </div>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => { store.setContentType(s.contentType); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 hover:shadow-sm transition-all text-left group"
            >
              <div className={`size-9 rounded-xl ${s.bgColor} flex items-center justify-center shrink-0`}>
                <s.icon className={`size-4 ${s.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold group-hover:text-primary transition-colors leading-tight">{s.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Clock className="size-3" />
          Nội dung được tạo trong 5–15 giây
        </div>
      </div>
    );
  }

  // ── Generating / Streaming State ────────────────────────────────────────

  function renderGeneratingState() {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        {/* Progress steps */}
        <div className="flex items-center justify-center py-2">
          <GenerationProgressSteps stage={pipelineStage} status={generationStatus} />
        </div>

        {/* Premium streaming card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground/70">Đang viết nội dung</span>
            {streamedContent.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {streamedContent.length} ký tự
              </span>
            )}
          </div>

          {/* Streaming content with markdown */}
          <div className="p-6">
            <StreamingPreview content={streamedContent} isStreaming={isStreamingActive} />
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between">
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
            Dừng tạo
          </Button>
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────────

  function renderErrorState() {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-in fade-in">
        <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center shadow-sm">
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

  // ── Stopped State ───────────────────────────────────────────────────────

  function renderStoppedState() {
    const stoppedContent = lastResult?.content || finalContent;
    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800/50 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Đã dừng</p>
          </div>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
            Nội dung tạm thời đã được giữ lại. Bạn có thể copy hoặc tiếp tục chỉnh sửa.
          </p>
        </div>

        {/* Content preview */}
        {stoppedContent && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-6">
            <StreamingPreview content={stoppedContent} isStreaming={false} />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={() => stoppedContent && handleCopy(stoppedContent, "main")}>
            <Copy className="size-3" /> Copy nội dung
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={handleRetry}>
            <RefreshCw className="size-3" /> Tạo lại
          </Button>
        </div>
      </div>
    );
  }

  // ── Tab Content ─────────────────────────────────────────────────────────

  function renderCompletedTab(tabValue: OutputTab) {
    const hasContent = lastResult || finalContent;
    if (!hasContent) return null;

    switch (tabValue) {
      case "main": {
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Success banner */}
            {mainContent && (
              <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/70 to-transparent dark:from-emerald-950/30 dark:border-emerald-800/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      Nội dung đã hoàn tất
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                    <span>{mainContent.split(/\s+/).filter(Boolean).length} từ</span>
                    <span>·</span>
                    <span>{mainContent.length} ký tự</span>
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

            {/* Edit mode */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full min-h-[200px] p-4 rounded-xl border bg-card text-sm leading-[1.75] outline-none focus:ring-2 focus:ring-primary/20 font-sans"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={handleSaveEdit}>
                    <Save className="size-3" /> Lưu
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(false)}>
                    Hủy
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Facebook preview */}
            {contentType === "facebook_post" && mainContent && !isEditing && (
              <FacebookPreviewCard
                content={mainContent}
                productName={store.selectedProduct?.name || "Mỹ Tho Laptop"}
                cta={lastResult?.cta || ""}
                hashtags={lastResult?.hashtags || []}
                onCopy={() => handleCopy(mainContent, "main")}
                onRegenerate={handleRetry}
                onPost={handlePost}
              />
            )}

            {/* SEO preview */}
            {contentType === "seo_article" && mainContent && !isEditing && (
              <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-muted/30 to-transparent border-b border-border/40">
                  <p className="text-[11px] text-muted-foreground font-medium">Xem trước Google</p>
                </div>
                <div className="p-4">
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-[#f8f9fa] dark:bg-neutral-800 px-4 py-2.5 border-b">
                      <div className="flex items-center gap-2">
                        <div className="size-4 rounded-full border-2 border-neutral-400 dark:border-neutral-600" />
                        <div className="flex gap-1.5 ml-1">
                          {["G", "o", "o", "g", "l", "e"].map((l, i) => (
                            <span key={i} className={`text-[13px] font-medium ${i === 0 ? "text-blue-500" : "text-neutral-500"}`}>{l}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-[15px] text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer mb-1 leading-tight">
                        {lastResult?.title || `${store.selectedProduct?.name || "Sản phẩm"} - Mỹ Tho Laptop`}
                      </p>
                      <p className="text-green-700 dark:text-green-400 text-[11px] mb-1.5">mytholaptop.vn › san-pham</p>
                      <p className="text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {mainContent.slice(0, 160) || `${store.selectedProduct?.name} chính hãng, giá tốt nhất, bảo hành uy tín tại Mỹ Tho.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generic content (non-Facebook/SEO) */}
            {!["facebook_post", "seo_article"].includes(contentType) && mainContent && !isEditing && (
              <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="p-6">
                  <StreamingPreview content={mainContent} isStreaming={false} />
                </div>
              </div>
            )}

            {/* CTA */}
            {lastResult?.cta && !isEditing && (
              <CTAPanel cta={lastResult.cta} productName={store.selectedProduct?.name} />
            )}

            {/* Hashtags */}
            {(lastResult?.hashtags?.length ?? 0) > 0 && !isEditing && (
              <HashtagsChips
                hashtags={lastResult?.hashtags || []}
                onCopy={(tag) => { navigator.clipboard.writeText(tag); toast.success("Đã copy hashtag!"); }}
                onCopyAll={() => { navigator.clipboard.writeText((lastResult?.hashtags || []).join(" ")); toast.success("Đã copy tất cả hashtags!"); }}
              />
            )}

            {/* Empty result */}
            {!mainContent && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Không có nội dung. Nhấn "Tạo lại" để thử lại.
              </div>
            )}
          </div>
        );
      }

      case "variants":
        return (
          <div className="space-y-3">
            {(!lastResult?.variants?.length) && (
              <div className="text-center py-12">
                <Layers className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có biến thể nào</p>
              </div>
            )}
            {lastResult?.variants?.map((v, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
                <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-medium">Biến thể {i + 1}</Badge>
                </div>
                <div className="px-4 pb-3">
                  <StreamingPreview content={v} isStreaming={false} className="text-sm" />
                </div>
                <div className="px-4 pb-3 flex gap-2 border-t border-border/30 pt-3">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => handleCopy(v, "variants")}>
                    <Copy className="size-3" />
                    {copiedTab === "variants" ? "Đã copy!" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => handleUseVariantAsMain(v)}>
                    <Check className="size-3.5" /> Dùng làm chính
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      case "hooks":
        return (
          <div className="space-y-2.5">
            {!lastResult?.hooks?.length && (
              <div className="text-center py-12">
                <Zap className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có hook nào</p>
              </div>
            )}
            {lastResult?.hooks?.map((hook, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/60 bg-card shadow-sm">
                <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0 font-medium">#{i + 1}</Badge>
                <p className="text-sm flex-1 leading-[1.65]">{hook}</p>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(hook, "hooks")}>
                    <Copy className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Dùng hook này" onClick={() => handleUseHookAsMain(hook)}>
                    <Check className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );

      case "cta":
        return (
          <div className="space-y-3">
            {!lastResult?.cta && (
              <div className="text-center py-12">
                <MousePointer className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có CTA</p>
              </div>
            )}
            {lastResult?.cta && (
              <>
                <CTAPanel cta={lastResult.cta} productName={store.selectedProduct?.name} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1.5 font-medium" onClick={() => handleCopy(lastResult.cta, "cta")}>
                    <Copy className="size-3" /> Copy CTA
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1.5 font-medium" onClick={handleRetry}>
                    <RefreshCw className="size-3" /> Tạo CTA mới
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case "seo":
        return (
          <div className="space-y-3">
            {!lastResult?.seoKeywords?.length && (
              <div className="text-center py-12">
                <Search className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có từ khóa SEO</p>
              </div>
            )}
            {lastResult?.title && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <FileText className="size-3" /> Meta Title
                </div>
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm leading-snug font-medium">{lastResult.title}</p>
                </div>
              </div>
            )}
            {lastResult?.content && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <FileText className="size-3" /> Meta Description
                </div>
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm leading-relaxed">{lastResult.content.slice(0, 160)}</p>
                </div>
              </div>
            )}
            {(lastResult?.seoKeywords?.length ?? 0) > 0 && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    <Hash className="size-3" /> Từ khóa SEO
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {lastResult?.seoKeywords?.map((kw, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-card">
                        <Search className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate font-medium">{kw}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 font-medium" onClick={() => handleCopy((lastResult?.seoKeywords ?? []).join(", "), "seo")}>
                  <Copy className="size-3" /> Copy {(lastResult?.seoKeywords?.length ?? 0)} từ khóa
                </Button>
              </>
            )}
          </div>
        );

      case "hashtags":
        return (
          <div className="space-y-3">
            {(lastResult?.hashtags?.length ?? 0) === 0 && (
              <div className="text-center py-12">
                <Hash className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có hashtag</p>
              </div>
            )}
            <HashtagsChips
              hashtags={lastResult?.hashtags || []}
              onCopy={(tag) => { navigator.clipboard.writeText(tag); toast.success("Đã copy!"); }}
              onCopyAll={() => { navigator.clipboard.writeText((lastResult?.hashtags || []).join(" ")); toast.success("Đã copy tất cả!"); }}
            />
          </div>
        );

      default:
        return null;
    }
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : isGenerating ? (
              <Sparkles className="size-4 text-primary animate-pulse" />
            ) : isError ? (
              <AlertCircle className="size-4 text-destructive" />
            ) : (
              <FileText className="size-4 text-primary" />
            )}
            <span className="text-sm font-semibold">
              {isEmpty
                ? "AI Content Studio"
                : isCompleted
                ? "Nội dung đã tạo"
                : isGenerating
                ? "Đang tạo nội dung..."
                : isStopped
                ? "Đã dừng"
                : isError
                ? "Lỗi"
                : "AI Content Studio"}
            </span>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Badge className="h-6 text-[11px] gap-1.5 font-medium bg-primary/10 text-primary border-primary/20 animate-pulse">
                <Loader2 className="size-3 animate-spin" />
                {GENERATION_STATUS_LABELS[generationStatus]}
              </Badge>
            )}
            {isCompleted && (
              <Badge className="h-6 text-[11px] gap-1.5 font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
                <CheckCircle2 className="size-3" /> Hoàn tất
              </Badge>
            )}
            {isStopped && (
              <Badge className="h-6 text-[11px] gap-1.5 font-semibold bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="size-3" /> Đã dừng
              </Badge>
            )}
            {isError && (
              <Badge className="h-6 text-[11px] gap-1.5 font-semibold bg-destructive/10 text-destructive border-destructive/20">
                <AlertCircle className="size-3" /> Lỗi
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeOutputTab} onValueChange={(v) => setActiveOutputTab(v as OutputTab)}>
          <TabsList className="grid w-full grid-cols-6 h-9 bg-muted/40 p-0.5 gap-0.5">
            {TABS.map(({ value, label, icon: Icon }) => {
              const hasStructured = lastResult && (
                (value === "main" && lastResult.content) ||
                (value === "hooks" && (lastResult.hooks?.length ?? 0) > 0) ||
                (value === "cta" && lastResult.cta) ||
                (value === "hashtags" && (lastResult.hashtags?.length ?? 0) > 0) ||
                (value === "seo" && (lastResult.seoKeywords?.length ?? 0) > 0) ||
                (value === "variants" && (lastResult.variants?.length ?? 0) > 0)
              );
              const hasRaw = value === "main" && finalContent;
              const hasContent = hasStructured || hasRaw;
              const count = getTabCount(value, lastResult);
              const isActive = activeOutputTab === value;
              const disabled = !lastResult && !finalContent && !isGenerating;

              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  disabled={disabled}
                  className={`text-[11px] h-8 py-1 gap-1 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary data-[state=active]:font-semibold ${!hasContent && !isActive ? "opacity-40" : ""}`}
                >
                  <Icon className="size-3 shrink-0" />
                  <span className="hidden xl:inline">{label}</span>
                  {count > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                      isActive ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary/80"
                    }`}>
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* AI Config Preview */}
          {isEmpty && (
            <div className="mt-4">
              <AIConfigPreviewPanel onGenerate={onGenerate} />
            </div>
          )}

          {/* Content */}
          <TabsContent value={activeOutputTab} className="mt-4 space-y-3 pb-24 animate-in fade-in duration-200">
            {isEmpty && renderEmptyState()}
            {isGenerating && renderGeneratingState()}
            {isError && renderErrorState()}
            {isStopped && renderStoppedState()}
            {isCompleted && renderCompletedTab(activeOutputTab)}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Action Toolbar - visible only when completed */}
      {isCompleted && (rawContent || lastResult) && (
        <ActionToolbar
          onCopy={() => handleCopy(rawContent || lastResult?.content || "", "main")}
          onRegenerate={handleRetry}
          onEdit={handleEdit}
          onSchedule={handleSchedule}
          onPost={handlePost}
          onExport={handleExport}
          isCopied={copiedTab === "main"}
        />
      )}
    </div>
  );
}
