"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Download,
  RefreshCw,
  ExternalLink,
  Save,
  Calendar,
  Share2,
  CheckCircle2,
  Sparkles,
  Check,
  Layers,
  MousePointer,
  Search,
  Hash,
  FileText,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useStudioStore, type OutputTab } from "@/store/ai-studio-store";

type TabMeta = { value: OutputTab; label: string; icon: typeof FileText };

const TABS: TabMeta[] = [
  { value: "main", label: "Nội dung", icon: FileText },
  { value: "variants", label: "Biến thể", icon: Layers },
  { value: "hooks", label: "Móc câu", icon: Check },
  { value: "cta", label: "CTA", icon: MousePointer },
  { value: "seo", label: "SEO", icon: Search },
  { value: "hashtags", label: "Hashtags", icon: Hash },
];

function getTabCount(tab: OutputTab, result: any) {
  if (!result) return 0;
  switch (tab) {
    case "main": return 1;
    case "variants": return result.variants?.length ?? 0;
    case "hooks": return result.hooks?.length ?? 0;
    case "cta": return result.cta ? 1 : 0;
    case "seo": return result.seoKeywords?.length ?? 0;
    case "hashtags": return result.hashtags?.length ?? 0;
    default: return 0;
  }
}

export function ReviewStep() {
  const store = useStudioStore();
  const {
    lastResult,
    finalContent,
    activeOutputTab,
    setActiveOutputTab,
    contentType,
    selectedProduct,
    generationStatus,
  } = store;

  const [copiedTab, setCopiedTab] = useState<OutputTab | null>(null);

  const rawContent = (lastResult?.content || finalContent || "") as string;
  const hasContent = !!rawContent;

  const handleCopy = useCallback((text: string, tab: OutputTab) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 1500);
    toast.success("Đã copy!");
  }, []);

  const handleUseVariantAsMain = useCallback((variant: string) => {
    useStudioStore.setState((s) => ({
      finalContent: variant,
      lastResult: s.lastResult
        ? { ...s.lastResult, content: variant }
        : { content: variant, title: "", variants: [], hooks: [], cta: "", seoKeywords: [], hashtags: [] },
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
      lastResult: s.lastResult
        ? { ...s.lastResult, content: updated }
        : { content: updated, title: "", variants: [], hooks: [], cta: "", seoKeywords: [], hashtags: [] },
    }));
    setActiveOutputTab("main");
    toast.success("Đã dùng hook này làm mở đầu");
  }, [setActiveOutputTab]);

  const handleExport = useCallback(() => {
    if (!rawContent) return;
    const blob = new Blob([rawContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ai-content-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã export!");
  }, [rawContent]);

  const renderTabContent = (tabValue: OutputTab) => {
    if (!hasContent) return null;
    const result = lastResult;

    switch (tabValue) {
      case "main":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Nội dung đã hoàn tất</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-600/70">
                  <span>{rawContent.split(/\s+/).filter(Boolean).length} từ</span>
                  <span>·</span>
                  <span>{rawContent.length} ký tự</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-foreground">
                {rawContent}
              </pre>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium"
                onClick={() => handleCopy(rawContent, "main")}>
                <Copy className="size-3" />
                {copiedTab === "main" ? "Đã copy!" : "Copy nội dung"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium" onClick={handleExport}>
                <Download className="size-3" /> Export
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 font-semibold ml-auto"
                onClick={() => toast.info("Tính năng đang phát triển", { description: "Integration required" })}>
                <Share2 className="size-3" /> Đăng Facebook
              </Button>
            </div>
          </div>
        );

      case "variants":
        return (
          <div className="space-y-3">
            {!result?.variants?.length && (
              <div className="text-center py-12">
                <Layers className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có biến thể nào</p>
              </div>
            )}
            {result?.variants?.map((v, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 pt-3 pb-1">
                  <Badge variant="outline" className="text-[10px] font-medium">Biến thể {i + 1}</Badge>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-sm leading-[1.7] whitespace-pre-wrap">{v}</p>
                </div>
                <div className="px-4 pb-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1"
                    onClick={() => handleCopy(v, "variants")}>
                    <Copy className="size-3" />
                    {copiedTab === "variants" ? "Đã copy!" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1"
                    onClick={() => handleUseVariantAsMain(v)}>
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
            {!result?.hooks?.length && (
              <div className="text-center py-12">
                <Check className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có hook nào</p>
              </div>
            )}
            {result?.hooks?.map((hook, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border bg-card">
                <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0 font-medium">#{i + 1}</Badge>
                <p className="text-sm flex-1 leading-[1.65]">{hook}</p>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => handleCopy(hook, "hooks")}>
                    <Copy className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    title="Dùng hook này"
                    onClick={() => handleUseHookAsMain(hook)}>
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
            {!result?.cta && (
              <div className="text-center py-12">
                <MousePointer className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có CTA</p>
              </div>
            )}
            {result?.cta && (
              <>
                <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-2">
                    <MousePointer className="size-3.5 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Call to Action</span>
                  </div>
                  <p className="text-lg font-bold leading-snug text-foreground">{result.cta}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 gap-1.5 font-medium"
                    onClick={() => handleCopy(result!.cta, "cta")}>
                    <Copy className="size-3" /> Copy CTA
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      case "seo":
        return (
          <div className="space-y-3">
            {!result?.seoKeywords?.length && (
              <div className="text-center py-12">
                <Search className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có từ khóa SEO</p>
              </div>
            )}
            {result?.title && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Meta Title</p>
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm leading-snug font-medium">{result.title}</p>
                </div>
              </div>
            )}
            {(result?.seoKeywords?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Từ khóa SEO</p>
                <div className="grid grid-cols-2 gap-2">
                  {result?.seoKeywords?.map((kw, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl border bg-card">
                      <Search className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate font-medium">{kw}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 font-medium"
                  onClick={() => handleCopy(result!.seoKeywords.join(", "), "seo")}>
                  <Copy className="size-3" /> Copy {result!.seoKeywords.length} từ khóa
                </Button>
              </div>
            )}
          </div>
        );

      case "hashtags":
        return (
          <div className="space-y-3">
            {(result?.hashtags?.length ?? 0) === 0 && (
              <div className="text-center py-12">
                <Hash className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Chưa có hashtag</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(result?.hashtags ?? []).map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleCopy(tag, "hashtags")}
                  className="px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/5 text-xs text-primary font-semibold hover:bg-primary/20 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            {(result?.hashtags?.length ?? 0) > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 font-medium"
                onClick={() => handleCopy(result!.hashtags.join(" "), "hashtags")}>
                <Copy className="size-3" /> Copy {(result?.hashtags?.length ?? 0)} hashtags
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isCompleted = generationStatus === "completed";

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — moved from header */}
      <div className="shrink-0 px-5 py-3 border-b bg-card/50 space-y-2">
        {/* Step label */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Hoàn tất & Xuất bản</span>
          {isCompleted && (
            <Badge className="ml-1 text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
              ✓ Đã tạo
            </Badge>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(({ value, label, icon: Icon }) => {
            const count = getTabCount(value, lastResult);
            const isActive = activeOutputTab === value;
            const hasTabContent = count > 0 || (value === "main" && rawContent);
            return (
              <button
                key={value}
                onClick={() => setActiveOutputTab(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : hasTabContent
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3" />
                {label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-primary/15 text-primary"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center">
            <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Sparkles className="size-5 text-muted-foreground/30" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Chưa có nội dung nào được tạo
            </p>
          </div>
        ) : (
          renderTabContent(activeOutputTab)
        )}
      </div>

      {/* Action bar */}
      {hasContent && (
        <div className="shrink-0 px-6 py-4 border-t bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium"
              onClick={() => handleCopy(rawContent, "main")}>
              <Copy className="size-3" /> Copy nội dung
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium"
              onClick={handleExport}>
              <Download className="size-3" /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium"
              onClick={() => toast.info("Tính năng đang phát triển", { description: "Integration required" })}>
              <Save className="size-3" /> Lưu nháp
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-medium"
              onClick={() => toast.info("Tính năng đang phát triển", { description: "Integration required" })}>
              <Calendar className="size-3" /> Lên lịch
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 font-semibold ml-auto"
              onClick={() => toast.info("Tính năng đang phát triển", { description: "Integration required" })}>
              <Share2 className="size-3" /> Đăng Facebook
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
