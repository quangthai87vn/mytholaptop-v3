"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Cpu,
  Zap,
  MessageSquare,
  FileText,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Route,
  ArrowRight,
} from "lucide-react";
import { useStudioStore, CONTENT_TYPE_TO_TASK, CONTENT_TYPE_LABELS, type StudioContentType } from "@/store/ai-studio-store";
import { useQuery } from "@tanstack/react-query";
import {
  type ContentLength,
  type CTAStyle,
  CTA_LABELS,
  type EmojiLevel,
  EMOJI_LABELS,
  type HashtagMode,
  HASHTAG_LABELS,
} from "@/store/ai-studio-store";
import type { RoutingRule } from "@/types/ai-operating";

const CONTENT_LENGTH_OPTIONS: { value: ContentLength; label: string; desc: string }[] = [
  { value: "short", label: "Ngắn", desc: "~300-500 từ" },
  { value: "medium", label: "Vừa", desc: "~500-800 từ" },
  { value: "long", label: "Dài", desc: "~800-1500 từ" },
];

const CONTENT_LENGTH_TOKENS: Record<ContentLength, number> = {
  short: 500,
  medium: 1500,
  long: 2500,
};

// Derive reverse map
const TASK_TO_CONTENT_TYPE = Object.fromEntries(
  Object.entries(CONTENT_TYPE_TO_TASK).map(([ct, tt]) => [tt, ct as StudioContentType])
);

function creativityLabel(temp: number): string {
  if (temp < 0.3) return "Chính xác";
  if (temp < 0.5) return "Cân bằng";
  if (temp < 0.7) return "Sáng tạo";
  return "Rất sáng tạo";
}

// ── Config Summary Row ────────────────────────────────────────────────────────

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}

// ── Advanced Override Controls ────────────────────────────────────────────────

function CustomizedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[9px] font-medium">
      <span className="size-1.5 rounded-full bg-purple-500 animate-pulse" />
      {label}
    </span>
  );
}

function DefaultBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[9px] font-medium">
      {label}
    </span>
  );
}

function FieldHeader({
  label,
  isOverridden,
}: {
  label: string;
  isOverridden: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      {isOverridden ? (
        <CustomizedBadge label="Tùy chỉnh" />
      ) : (
        <DefaultBadge label="Routing" />
      )}
    </div>
  );
}

function AdvancedOverrideSection({
  providers,
  brandVoices,
  systemPrompts,
  activeProviders,
}: {
  providers: any[];
  brandVoices: any[];
  systemPrompts: any[];
  activeProviders: any[];
}) {
  const store = useStudioStore();
  const overrides = store.advancedOverrides;
  const setOverride = store.setAdvancedOverride;

  const matchedRule = store.selectedProduct; // placeholder, filled below

  return (
    <div className="space-y-4 p-4 rounded-xl border border-dashed bg-muted/20">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-3.5 text-amber-500" />
        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Tuỳ chỉnh tạm thời — chỉ áp dụng cho lần tạo nội dung này
        </p>
      </div>

      {/* AI Engine */}
      <div className="space-y-1.5">
        <FieldHeader label="AI Engine" isOverridden={overrides?.provider_id != null} />
        <Select
          value={
            overrides?.provider_id != null
              ? String(overrides?.provider_id)
              : "__routing__"
          }
          onValueChange={(v) =>
            setOverride({ provider_id: v === "__routing__" ? null : parseInt(v) })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {activeProviders.map((p: any) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name || p.slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand Voice */}
      <div className="space-y-1.5">
        <FieldHeader label="Brand Voice" isOverridden={overrides?.brand_preset != null} />
        <Select
          value={overrides?.brand_preset ?? "__routing__"}
          onValueChange={(v) =>
            setOverride({ brand_preset: v === "__routing__" ? null : v })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {brandVoices.map((bv: any) => (
              <SelectItem key={bv.preset} value={bv.preset}>
                {bv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* System Prompt */}
      <div className="space-y-1.5">
        <FieldHeader label="System Prompt" isOverridden={overrides?.system_prompt_id != null} />
        <Select
          value={
            overrides?.system_prompt_id != null
              ? String(overrides.system_prompt_id)
              : "__routing__"
          }
          onValueChange={(v) =>
            setOverride({ system_prompt_id: v === "__routing__" ? null : parseInt(v) })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {systemPrompts.map((sp: any) => (
              <SelectItem key={sp.id} value={String(sp.id)}>
                {sp.name || "Custom"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Creativity / Temperature */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <FieldHeader label="Độ sáng tạo" isOverridden={overrides?.temperature_override != null} />
          <span className="text-[11px] font-semibold text-primary">
            {creativityLabel(overrides?.temperature_override ?? 0.7)}
          </span>
        </div>
        <Slider
          value={[Math.round((overrides?.temperature_override ?? 0.7) * 100)]}
          min={10}
          max={100}
          step={5}
          onValueChange={([v]) =>
            setOverride({ temperature_override: v / 100 })
          }
          className="py-1"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>Chính xác</span>
          <span>Sáng tạo</span>
        </div>
      </div>

      {/* Content Length */}
      <div className="space-y-1.5">
        <FieldHeader label="Độ dài nội dung" isOverridden={overrides?.content_length != null} />
        <Select
          value={overrides?.content_length ?? "__routing__"}
          onValueChange={(v) =>
            setOverride({ content_length: v === "__routing__" ? null : v as ContentLength })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {CONTENT_LENGTH_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label} ({o.desc})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CTA Style */}
      <div className="space-y-1.5">
        <FieldHeader label="Phong cách CTA" isOverridden={overrides?.cta_style_override != null} />
        <Select
          value={overrides?.cta_style_override ?? "__routing__"}
          onValueChange={(v) =>
            setOverride({ cta_style_override: v === "__routing__" ? null : v as CTAStyle })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {Object.entries(CTA_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Emoji Level */}
      <div className="space-y-1.5">
        <FieldHeader label="Mức emoji" isOverridden={overrides?.emoji_level_override != null} />
        <Select
          value={overrides?.emoji_level_override ?? "__routing__"}
          onValueChange={(v) =>
            setOverride({ emoji_level_override: v === "__routing__" ? null : v as EmojiLevel })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {Object.entries(EMOJI_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hashtag Mode */}
      <div className="space-y-1.5">
        <FieldHeader label="Chế độ hashtag" isOverridden={overrides?.hashtag_mode_override != null} />
        <Select
          value={overrides?.hashtag_mode_override ?? "__routing__"}
          onValueChange={(v) =>
            setOverride({ hashtag_mode_override: v === "__routing__" ? null : v as HashtagMode })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__routing__">Theo Routing (mặc định)</SelectItem>
            {Object.entries(HASHTAG_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">Hướng dẫn bổ sung</label>
          {store.customInstructions && (
            <CustomizedBadge label="Đã nhập" />
          )}
        </div>
        <Textarea
          value={store.customInstructions || ""}
          onChange={(e) => store.setCustomInstructions(e.target.value)}
          className="min-h-[80px] text-xs resize-none"
          placeholder="VD: Nhấn mạnh bảo hành 24 tháng, giọng văn trẻ trung..."
        />
        {store.customInstructions && (
          <p className="text-[9px] text-muted-foreground text-right">
            {store.customInstructions.length} ký tự
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full h-7 text-[11px] text-muted-foreground"
        onClick={() => store.clearAdvancedOverrides()}
      >
        Đặt lại về mặc định Routing
      </Button>
    </div>
  );
}

// ── Main Routing Step Component ──────────────────────────────────────────────

export function RoutingStep() {
  const store = useStudioStore();
  const contentType = store.contentType;
  const setContentType = store.setContentType;
  const goToNextStep = store.goToNextStep;
  const selectedProduct = store.selectedProduct;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Load AI settings
  const { data: settingsData } = useQuery({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const routingRules: RoutingRule[] = settingsData?.data?.taskRoutes ?? [];
  const brandVoices = settingsData?.data?.brandVoices ?? [];
  const systemPrompts = settingsData?.data?.systemPrompts ?? [];
  const activeProviders = settingsData?.data?.providers ?? [];

  const currentTaskType = CONTENT_TYPE_TO_TASK[contentType] ?? contentType;
  const matchedRule = routingRules.find(
    (r: any) => r.task_type === currentTaskType && r.is_active !== false
  );

  const engineInfo = matchedRule?.primary_provider_id
    ? activeProviders.find(
        (p: any) => String(p.id) === String(matchedRule.primary_provider_id)
      )
    : null;

  const brandVoice = matchedRule?.brand_preset
    ? brandVoices.find((bv: any) => bv.preset === matchedRule.brand_preset)
    : null;

  const systemPrompt = matchedRule?.system_prompt_id
    ? systemPrompts.find((sp: any) => sp.id === matchedRule.system_prompt_id)
    : null;

  const temp = matchedRule?.temperature_override ?? engineInfo?.temperature ?? 0.7;
  const tokens = matchedRule?.max_tokens_override ?? 1500;
  const contentLength: ContentLength =
    tokens <= 800 ? "short" : tokens <= 1500 ? "medium" : "long";

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: routing selector + config */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Product reminder */}
          {selectedProduct && (
            <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/20">
              <Sparkles className="size-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate">{selectedProduct.name}</p>
                <p className="text-[10px] text-muted-foreground">Sản phẩm đã chọn ở bước 1</p>
              </div>
            </div>
          )}

          {/* Content Type Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Loại nội dung
            </label>
            <Select
              value={contentType}
              onValueChange={(v) => setContentType(v as StudioContentType)}
            >
              <SelectTrigger className="h-10 text-sm font-medium rounded-xl">
                <SelectValue placeholder="Chọn loại nội dung" />
              </SelectTrigger>
              <SelectContent>
                {routingRules.map((rule: any) => {
                  const ct = TASK_TO_CONTENT_TYPE[rule.task_type];
                  const label = CONTENT_TYPE_LABELS[ct as StudioContentType] ?? rule.task_type;
                  return (
                    <SelectItem key={ct} value={ct} className="text-sm">
                      {label}
                    </SelectItem>
                  );
                })}
                {routingRules.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Chưa có routing — vào AI Operating Center để thêm
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Resolved Config Summary */}
          <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.03] to-transparent p-4 space-y-1">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="text-xs font-bold">Cấu hình từ AI Task Routing</span>
              <Badge className="ml-auto text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800">
                ⚡ Auto
              </Badge>
            </div>

            {!matchedRule ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    Chưa có routing cho "{contentType}"
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    <a href="/content/settings" className="underline">Đi tới AI Operating Center</a> để cấu hình.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ConfigRow label="AI Engine" value={
                  <span className="font-semibold text-primary">
                    {engineInfo?.name || matchedRule?.primary_model_override || "—"}
                  </span>
                } />
                <ConfigRow label="Model" value={
                  <span className="font-mono text-[11px]">
                    {matchedRule.primary_model_override || engineInfo?.model_name || "—"}
                  </span>
                } />
                <ConfigRow label="Brand Voice" value={
                  <Badge variant="outline" className="text-[10px]">
                    {brandVoice?.name || matchedRule.brand_preset || "Mặc định"}
                  </Badge>
                } />
                <ConfigRow label="System Prompt" value={
                  <span className="text-[11px] truncate max-w-[160px]" title={systemPrompt?.name}>
                    {systemPrompt?.name || matchedRule.system_prompt_id ? `ID: ${matchedRule.system_prompt_id}` : "Mặc định"}
                  </span>
                } />
                <ConfigRow label="Độ sáng tạo" value={
                  <span className="font-semibold text-primary">
                    {Math.round(temp * 100)}% ({creativityLabel(temp)})
                  </span>
                } />
                <ConfigRow label="Độ dài" value={
                  <Badge variant="secondary" className="text-[10px]">
                    {CONTENT_LENGTH_OPTIONS.find(o => o.value === contentLength)?.label ?? "Vừa"}
                  </Badge>
                } />
              </>
            )}
          </div>

          {/* Advanced Customization */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 gap-2 text-xs font-medium rounded-xl border-dashed"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {showAdvanced ? "Ẩn tuỳ chỉnh nâng cao" : "Tuỳ chỉnh nâng cao"}
            {Object.keys(store.advancedOverrides ?? {}).length > 0 && (
              <Badge className="ml-1 h-4 text-[9px] px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400">
                {Object.keys(store.advancedOverrides ?? {}).length}
              </Badge>
              )}
            </Button>

            {showAdvanced && (
              <AdvancedOverrideSection
                providers={activeProviders}
                brandVoices={brandVoices}
                systemPrompts={systemPrompts}
                activeProviders={activeProviders}
              />
            )}
          </div>
        </div>

        {/* Right: quick config preview */}
        <div className="w-72 shrink-0 border-l overflow-y-auto p-5 hidden xl:block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Xem nhanh
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Cpu className="size-3 text-blue-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">AI Engine</span>
              </div>
              <p className="text-xs font-bold">{engineInfo?.name || "Chưa cấu hình"}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {matchedRule?.primary_model_override || engineInfo?.model_name || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="size-3 text-purple-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">Brand Voice</span>
              </div>
              <p className="text-xs font-bold">{brandVoice?.name || "Mặc định"}</p>
              {brandVoice?.tone_instruction && (
                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {brandVoice.tone_instruction}
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <div className="flex items-center gap-1.5">
                <FileText className="size-3 text-green-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">System Prompt</span>
              </div>
              <p className="text-xs font-bold">{systemPrompt?.name || "Mặc định"}</p>
            </div>

            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-500" />
                <span className="text-[10px] font-semibold text-muted-foreground">Sáng tạo</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${temp * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Chính xác</span>
                <span className="font-medium text-primary">{creativityLabel(temp)}</span>
                <span>Viral</span>
              </div>
            </div>

            {/* Routing link */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[11px] text-muted-foreground"
              onClick={() => setSheetOpen(true)}
            >
              <Route className="size-3 mr-1" />
              Xem cấu hình đầy đủ
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 px-6 py-4 border-t bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {!matchedRule
              ? "Chưa có routing — cấu hình tại AI Operating Center"
              : `${CONTENT_TYPE_LABELS[contentType]} · ${engineInfo?.name || "Engine"} · ${creativityLabel(temp)}`}
          </p>
          <Button
            size="sm"
            className="h-9 gap-2 px-5 font-semibold shadow-sm"
            disabled={!matchedRule}
            onClick={goToNextStep}
          >
            Xem Prompt
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Full routing config sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[380px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm flex items-center gap-2">
              <Route className="size-4 text-primary" />
              Cấu hình AI Task Routing
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {matchedRule ? (
              <>
                <div className="p-3 rounded-xl border bg-card space-y-2">
                  <p className="text-xs font-bold">{CONTENT_TYPE_LABELS[contentType]}</p>
                  <ConfigRow label="Engine" value={engineInfo?.name || "—"} />
                  <ConfigRow label="Model" value={matchedRule.primary_model_override || "—"} />
                  <ConfigRow label="Temperature" value={`${Math.round(temp * 100)}%`} />
                  <ConfigRow label="Max Tokens" value={tokens} />
                  <ConfigRow label="Brand Voice" value={brandVoice?.name || "Mặc định"} />
                  <ConfigRow label="System Prompt" value={systemPrompt?.name || "Mặc định"} />
                </div>
                <a
                  href="/content/settings"
                  className="flex items-center gap-2 p-3 rounded-xl border border-dashed text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  <Shield className="size-4 shrink-0" />
                  <div>
                    <p className="font-medium">AI Operating Center</p>
                    <p className="text-[10px]">Quản lý engine, routing, brand voice, prompt</p>
                  </div>
                </a>
              </>
            ) : (
              <div className="text-center py-8 space-y-2">
                <AlertCircle className="size-6 text-amber-500 mx-auto" />
                <p className="text-xs font-medium">Chưa có routing cho loại nội dung này</p>
                <a href="/content/settings" className="text-xs text-primary underline">
                  Đi tới AI Operating Center để thêm
                </a>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
