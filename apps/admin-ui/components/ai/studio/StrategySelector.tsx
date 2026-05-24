"use client";

const DEV = process.env.NODE_ENV === "development";

import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Layers,
  Zap,
  Check,
  Cpu,
  PenLine,
  Clock,
  MessageSquare,
  Settings2,
  ChevronDown,
  AlertTriangle,
  ChevronRight,
  ChevronUp,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useStudioStore } from "@/store/ai-studio-store";
import {
  CONTENT_TYPE_LABELS,
  GOAL_LABELS,
  FUNNEL_LABELS,
} from "@/store/ai-studio-store";
import { resolveGenerationConfig, getCreativityLabel } from "@/services/ai/generation-resolver";
import { useQuery } from "@tanstack/react-query";
import type { ContentPlatform } from "@/types/content";
import type { StudioContentType, MarketingGoal, FunnelStage } from "@/store/ai-studio-store";
import type { ProviderCard, ProviderType, RoutingRule, BrandVoice, SafetyRule, SystemPromptTemplate } from "@/types/ai-operating";

// ── Content Type Config ────────────────────────────────────────────────────────

const CONTENT_TYPES: Array<{ value: StudioContentType; label: string; icon: LucideIcon; defaultGoal: MarketingGoal; defaultFunnel: FunnelStage; defaultPlatforms: ContentPlatform[] }> = [
  {
    value: "facebook_post",
    label: "Bài viết",
    icon: Zap,
    defaultGoal: "conversion",
    defaultFunnel: "consideration",
    defaultPlatforms: ["facebook"],
  },
  {
    value: "seo_article",
    label: "Bài viết SEO",
    icon: PenLine,
    defaultGoal: "seo",
    defaultFunnel: "consideration",
    defaultPlatforms: ["website"],
  },
  {
    value: "video_script",
    label: "Kịch bản video",
    icon: Zap,
    defaultGoal: "viral",
    defaultFunnel: "awareness",
    defaultPlatforms: ["tiktok"],
  },
  {
    value: "image_prompt",
    label: "Prompt hình",
    icon: Zap,
    defaultGoal: "branding",
    defaultFunnel: "awareness",
    defaultPlatforms: ["website"],
  },
  {
    value: "zalo_message",
    label: "Tin nhắn Zalo",
    icon: MessageSquare,
    defaultGoal: "conversion",
    defaultFunnel: "conversion",
    defaultPlatforms: ["zalo"],
  },
  {
    value: "product_description",
    label: "Mô tả sản phẩm",
    icon: Cpu,
    defaultGoal: "conversion",
    defaultFunnel: "consideration",
    defaultPlatforms: ["website"],
  },
  {
    value: "email_marketing",
    label: "Email Marketing",
    icon: PenLine,
    defaultGoal: "conversion",
    defaultFunnel: "consideration",
    defaultPlatforms: ["website"],
  },
];

// ── Advanced controls ───────────────────────────────────────────────────────────

const GOALS: Array<{ value: MarketingGoal; label: string }> = [
  { value: "conversion", label: "Chuyển đổi" },
  { value: "viral", label: "Viral" },
  { value: "branding", label: "Branding" },
  { value: "seo", label: "SEO" },
];

const FUNNELS: Array<{ value: FunnelStage; label: string }> = [
  { value: "awareness", label: "Nhận thức" },
  { value: "consideration", label: "Cân nhắc" },
  { value: "conversion", label: "Mua hàng" },
];

// ── AI Config Resolver ─────────────────────────────────────────────────────────

export function useResolvedConfig() {
  const store = useStudioStore.getState();
  const selectedProduct = store.selectedProduct;

  // Load providers and routing rules from shared AI settings endpoint
  // This uses the same queryClient as the rest of the app, so data is consistent
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  // Normalize providers from the settings response
  const providers: ProviderCard[] = useMemo(() => {
    const rawProviders = settingsData?.data?.providers ?? [];
    return rawProviders.map((p: any) => ({
      id: p.id,
      type: (p.type ?? p.slug ?? "openai") as ProviderType,
      name: p.name ?? "",
      slug: p.slug ?? "",
      base_url: p.base_url ?? null,
      is_active: p.status === "active",
      sort_order: p.sort_order ?? 0,
      status: p.status ?? "inactive",
      is_system: p.is_system ?? false,
      is_default: p.is_default ?? false,
      connection_status: p.connection_status ?? "unknown",
      last_checked_at: null,
      last_error: null,
      request_count: 0,
      model_name: p.model_name ?? undefined,
      temperature: p.temperature ?? undefined,
      streaming_enabled: p.streaming_enabled ?? undefined,
      timeout_ms: p.timeout_ms ?? undefined,
      retry_count: p.retry_count ?? undefined,
      api_key_masked: "",
      custom_headers: {},
    }));
  }, [settingsData]);

  // Get routing rules (taskRoutes) from settings
  const routingRules: RoutingRule[] = useMemo(() => {
    return settingsData?.data?.taskRoutes ?? [];
  }, [settingsData]);

  const brandVoices: BrandVoice[] = useMemo(() => {
    return settingsData?.data?.brandVoices ?? [];
  }, [settingsData]);

  const safetyRules: SafetyRule[] = useMemo(() => {
    return settingsData?.data?.safetyRules ?? [];
  }, [settingsData]);

  const systemPrompts: SystemPromptTemplate[] = useMemo(() => {
    return settingsData?.data?.systemPrompts ?? [];
  }, [settingsData]);

  const config = useMemo(() => {
    if (!selectedProduct) return null;

    // Merge overrides into routing for preview display
    const hasOverrides = store.advancedOverrides && Object.keys(store.advancedOverrides).length > 0;

    const resolved = resolveGenerationConfig({
      product: selectedProduct as any,
      contentType: store.contentType as StudioContentType,
      platforms: (store.platforms ?? []) as ContentPlatform[],
      marketingGoal: store.marketingGoal as MarketingGoal,
      funnelStage: store.funnelStage as FunnelStage,
      routingRules,
      providers,
      brandVoices,
      safetyRules,
      systemPrompts,
      activeBrandPreset: settingsData?.data?.activeBrandPreset,
      // Pass user overrides so preview shows the FINAL active config
      advancedOverrides: hasOverrides ? store.advancedOverrides : undefined,
    });

    // DEV debug: trace system prompt resolution
    if (DEV) {
      const matchedRule = routingRules.find(
        (r) => {
          const CONTENT_TYPE_TO_TASK: Record<string, string> = {
            facebook_post: "facebook_content",
            seo_article: "seo_article",
            video_script: "video_script",
            image_prompt: "image_prompt",
            zalo_message: "zalo_message",
            product_description: "product_description",
            email_marketing: "email_marketing",
          };
          return r.task_type === CONTENT_TYPE_TO_TASK[store.contentType as StudioContentType] && r.is_active !== false;
        }
      );
      console.log("[StrategySelector] System Prompt Debug", {
        contentType: store.contentType,
        hasOverrides,
        matchedRuleId: matchedRule?.id,
        matchedRuleTaskType: matchedRule?.task_type,
        matchedRuleSystemPromptId: matchedRule?.system_prompt_id,
        totalSystemPrompts: systemPrompts.length,
        systemPromptIds: systemPrompts.map((sp) => sp.id),
        resolvedSystemPrompt: resolved.systemPrompt,
        finalConfig: {
          engineName: resolved.engineName,
          model: resolved.model,
          temperature: resolved.temperature,
          brandVoice: resolved.brandVoice?.name,
          systemPrompt: resolved.systemPrompt?.name,
          contentLength: resolved.strategy.contentLength,
          ctaStyle: resolved.strategy.suggestedCTAStyle,
        },
      });
    }

    return resolved;
  }, [selectedProduct, store.contentType, store.platforms, store.marketingGoal, store.funnelStage, store.advancedOverrides, routingRules, providers.length, brandVoices.length, settingsData?.data?.activeBrandPreset, systemPrompts.length]);

  return { config, isLoading: settingsLoading, brandVoices, routingRules };
}

// ── Config Row ─────────────────────────────────────────────────────────────────

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-medium text-right leading-tight max-w-[140px] truncate">{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function StrategySelector() {
  const store = useStudioStore();
  const contentType = store.contentType ?? "facebook_post";
  const platforms = store.platforms ?? [];
  const marketingGoal = store.marketingGoal ?? "conversion";
  const funnelStage = store.funnelStage ?? "consideration";
  const setContentType = store.setContentType;
  const setMarketingGoal = store.setMarketingGoal;
  const setFunnelStage = store.setFunnelStage;
  const togglePlatform = store.togglePlatform;

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const { config } = useResolvedConfig();

  const currentCT = CONTENT_TYPES.find((ct) => ct.value === contentType) ?? CONTENT_TYPES[0];

  const handleContentTypeChange = (ct: typeof CONTENT_TYPES[0]) => {
    setContentType(ct.value);
    // Auto-set recommended platform, goal, funnel
    store.setPlatforms(ct.defaultPlatforms);
    setMarketingGoal(ct.defaultGoal);
    setFunnelStage(ct.defaultFunnel);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="font-semibold text-sm">Chiến lược</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">

          {/* ── Content Type ─────────────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Zap className="size-2.5" />
              Loại nội dung
            </label>
            <div className="grid grid-cols-1 gap-1">
              {CONTENT_TYPES.map((ct) => {
                const active = contentType === ct.value;
                return (
                  <button
                    key={ct.value}
                    onClick={() => handleContentTypeChange(ct)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <ct.icon className={`size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium flex-1 ${active ? "text-primary" : ""}`}>
                      {ct.label}
                    </span>
                    {active && <Check className="size-3 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* ── AI sẽ dùng (readonly) ────────────────────────────────────── */}
          <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Cpu className="size-3.5" />
                AI sẽ dùng
              </div>
              {/* Source badge — shows where config came from */}
              {config?.resolutionSource && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
                  config.resolutionSource === "routing_rule"
                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                    : config.resolutionSource === "provider_default"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                    : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800"
                }`}>
                  {config.resolutionSource === "routing_rule" ? "Routing"
                    : config.resolutionSource === "provider_default" ? "Provider"
                    : "System Default"}
                </span>
              )}
            </div>

            {/* Warning: no routing found for this content type */}
            {config?.resolutionSource === "system_default" && (
              <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 mb-2">
                <AlertTriangle className="size-3 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Chưa cấu hình AI Routing cho loại nội dung này. Đang dùng provider mặc định.{" "}
                  <a href="/content/settings" className="underline font-medium">Cấu hình AI</a>
                </div>
              </div>
            )}

            {/* Warning: provider was deleted */}
            {!config?.hasValidProvider && (
              <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 mb-2">
                <AlertTriangle className="size-3 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Provider đã bị xóa. Vui lòng vào{" "}
                  <a href="/content/settings" className="underline font-medium">Cấu hình AI</a>{" "}
                  để chọn lại provider cho task này.
                </div>
              </div>
            )}

            <ConfigRow
              label="Engine"
              value={
                <span className="font-medium text-[11px]">
                  {config?.engineName ?? "—"}
                </span>
              }
            />
            <ConfigRow
              label="Model"
              value={
                <span className="font-mono text-[10px] text-primary/80">
                  {config?.model ?? "—"}
                </span>
              }
            />
            <ConfigRow
              label="Phong cách"
              value={
                <span className="text-[11px]">
                  {config?.strategy.name ?? "—"}
                </span>
              }
            />
            <ConfigRow
              label="Độ dài"
              value={
                <span className="text-[11px]">
                  {config?.contentLengthLabel ?? "—"}
                </span>
              }
            />
            <ConfigRow
              label="Sáng tạo"
              value={
                <span className="text-[11px]">
                  {config ? getCreativityLabel(config.temperature) : "—"}
                </span>
              }
            />
            <ConfigRow
              label="Brand Voice"
              value={
                <span className="text-[11px]">
                  {config?.brandVoice?.name ?? "Mặc định"}
                </span>
              }
            />
            <ConfigRow
              label="System Prompt"
              value={
                config?.systemPrompt ? (
                  <span
                    className="text-[11px] text-primary/80 max-w-[140px] truncate block"
                    title={config.systemPrompt.name}
                  >
                    {config.systemPrompt.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[11px]">Mặc định (tiếng Việt)</span>
                )
              }
            />

            {config?.resolutionReason && (
              <div className="text-[9px] text-muted-foreground/70 italic leading-relaxed pt-1 border-t mt-1">
                {config.resolutionReason}
              </div>
            )}

            {/* ── Technical Details Collapsible ─────────────────────────── */}
            <button
              onClick={() => setTechnicalOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1 border-t mt-1 w-full"
            >
              <Settings2 className="size-3" />
              <span>Chi tiết kỹ thuật</span>
              {technicalOpen ? <ChevronUp className="size-3 ml-auto" /> : <ChevronRight className="size-3 ml-auto" />}
            </button>

            {technicalOpen && (
              <div className="space-y-1 pt-1">
                <div className="text-[9px] space-y-0.5 text-muted-foreground/60 font-mono">
                  <div className="flex items-center gap-2">
                    <Info className="size-2.5 shrink-0" />
                    <span className="font-semibold uppercase tracking-wide text-[8px]">Engine</span>
                  </div>
                  <div className="pl-5">Tên: {config?.engineName ?? "—"}</div>
                  <div className="pl-5">Model: {config?.model ?? "—"}</div>
                  <div className="pl-5">Source: {config?.modelSource ?? "—"}</div>
                  <div className="pl-5">Provider: {config?.engineId ?? "—"}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Info className="size-2.5 shrink-0" />
                    <span className="font-semibold uppercase tracking-wide text-[8px]">Routing</span>
                  </div>
                  <div className="pl-5">Source: {config?.resolutionSource ?? "—"}</div>
                  <div className="pl-5">Task: {store.contentType}</div>
                  <div className="pl-5">SP ID: {config?.systemPrompt?.id ?? "—"}</div>
                  <div className="pl-5">SP: {config?.systemPrompt?.name ?? "default"}</div>
                  {config?.systemPrompt?.prompt_text && (
                    <div className="pl-5 mt-1">
                      <div className="text-[8px] text-muted-foreground/40 italic line-clamp-3">
                        {config.systemPrompt.prompt_text}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Advanced Mode Toggle ──────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Settings2 className="size-3.5 text-muted-foreground" />
              <div>
                <div className="text-xs font-medium">Chế độ nâng cao</div>
                <div className="text-[9px] text-muted-foreground">Tùy chỉnh platform, mục tiêu, AI</div>
              </div>
            </div>
            <Switch
              checked={advancedOpen}
              onCheckedChange={setAdvancedOpen}
            />
          </div>

          {/* ── Advanced Controls ─────────────────────────────────────────── */}
          {advancedOpen && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">

              {/* Platform */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Nền tảng
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["facebook", "website", "tiktok", "zalo", "youtube"] as ContentPlatform[]).map((p) => {
                    const active = platforms.includes(p);
                    const colorMap: Record<string, string> = {
                      facebook: "bg-blue-500",
                      website: "bg-gray-500",
                      tiktok: "bg-pink-500",
                      zalo: "bg-blue-400",
                      youtube: "bg-red-500",
                    };
                    return (
                      <button
                        key={p}
                        onClick={() => togglePlatform(p)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${active ? colorMap[p] : "bg-gray-300"}`} />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Mục tiêu
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {GOALS.map((g) => {
                    const active = marketingGoal === g.value;
                    return (
                      <button
                        key={g.value}
                        onClick={() => setMarketingGoal(g.value)}
                        className={`p-2 rounded-lg border text-center text-[11px] font-medium transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Funnel */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Giai đoạn
                </label>
                <div className="flex gap-1">
                  {FUNNELS.map((f) => {
                    const active = funnelStage === f.value;
                    return (
                      <button
                        key={f.value}
                        onClick={() => setFunnelStage(f.value)}
                        className={`flex-1 p-2 rounded-lg border text-center transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className={`text-[10px] font-bold ${active ? "text-primary" : ""}`}>
                          {f.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
