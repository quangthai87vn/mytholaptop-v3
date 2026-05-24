"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Settings2,
  Cpu,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  FileText,
  Route,
  Info,
  Lock,
} from "lucide-react";
import { useStudioStore, CONTENT_TYPE_TO_TASK } from "@/store/ai-studio-store";
import { useQuery } from "@tanstack/react-query";
import { PromptPreview } from "./PromptPreview";

// ── UI helpers ─────────────────────────────────────────────────────────────────

function SettingCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────────

export function AdvancedAISettings() {
  const [isOpen, setIsOpen] = useState(false);
  const store = useStudioStore();
  const selectedProduct = store.selectedProduct;
  const customInstructions = store.customInstructions;

  // Load AI settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  // Load active providers
  const { data: activeProviders = [] } = useQuery({
    queryKey: ["ai-providers-active-advanced"],
    queryFn: async () => {
      const res = await fetch("/api/ai/providers?status=active");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.providers ?? [];
    },
    staleTime: 60 * 1000,
  });

  const routingRules = settingsData?.data?.taskRoutes ?? [];
  const brandVoices = settingsData?.data?.brandVoices ?? [];
  const systemPrompts = settingsData?.data?.systemPrompts ?? [];
  const activeBrandPreset = settingsData?.data?.activeBrandPreset;
  const contentType = store.contentType;

  // Map contentType → task_type for correct DB lookup
  const currentTaskType = CONTENT_TYPE_TO_TASK[contentType] ?? contentType;

  // Find matched routing rule
  const matchedRule = routingRules.find(
    (r: any) => r.task_type === currentTaskType && r.is_active !== false
  );

  // Find engine
  const engineInfo = matchedRule?.primary_provider_id
    ? activeProviders.find(
        (p: any) => String(p.id) === String(matchedRule.primary_provider_id)
      )
    : null;

  // Find brand voice
  const activeBrandVoice = brandVoices.find(
    (bv: any) => bv.preset === activeBrandPreset
  );

  // Find system prompt
  const systemPrompt = matchedRule?.system_prompt_id
    ? systemPrompts.find((sp: any) => sp.id === matchedRule.system_prompt_id)
    : null;

  // Build genConfig for PromptPreview
  const genConfig = selectedProduct && matchedRule && engineInfo
    ? {
        engineName: engineInfo.name || engineInfo.slug || "AI Engine",
        model: matchedRule.model || engineInfo.model_name || "",
        systemPrompt: systemPrompt
          ? { name: systemPrompt.name || "Custom", prompt_text: systemPrompt.prompt_text }
          : null,
        brandVoice: activeBrandVoice
          ? { name: activeBrandVoice.name, preset: activeBrandVoice.preset }
          : null,
        promptRules: [],
        safetyRules: [],
        contentLengthLabel: matchedRule.max_tokens
          ? matchedRule.max_tokens > 2000
            ? "Dài"
            : matchedRule.max_tokens > 800
            ? "Vừa"
            : "Ngắn"
          : "Vừa",
        resolutionSource: "routing_rule",
        resolutionReason: matchedRule.description || `Routing cho ${contentType}`,
        hasValidProvider: true,
        strategy: { name: matchedRule.name || contentType },
        temperature: matchedRule.temperature_override ?? engineInfo.temperature ?? 0.7,
      } as any
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-dashed"
        >
          <Settings2 className="size-3.5" />
          <span className="hidden lg:inline">Cấu hình</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[360px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base flex items-center gap-2">
            <Settings2 className="size-4 text-primary" />
            AI Task Routing
          </SheetTitle>
          <div className="flex items-start gap-1.5 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <Info className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
              Cấu hình AI được lấy từ AI Operating Center. Bạn chỉ có thể xem, không thể chỉnh sửa ở đây.{" "}
              <a href="/content/settings" className="underline font-medium">Đi tới cấu hình</a>
            </p>
          </div>
        </SheetHeader>

        <div className="space-y-3">

          {/* ── 1. Routing Preset ─────────────────────────────────────────── */}
          <SettingCard icon={Route} title="Routing Preset">
            <SettingRow
              label="Loại nội dung"
              value={
                <Badge variant="outline" className="text-[10px] h-5">
                  {contentType}
                </Badge>
              }
            />
            <SettingRow
              label="Routing"
              value={
                matchedRule ? (
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {matchedRule.name || matchedRule.task_type}
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                    Chưa cấu hình
                  </span>
                )
              }
            />
            {matchedRule?.description && (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {matchedRule.description}
              </p>
            )}
            {!matchedRule && (
              <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Chưa có routing cho "{contentType}".{" "}
                  <a href="/content/settings" className="underline font-medium">Cấu hình ngay</a>
                </p>
              </div>
            )}
          </SettingCard>

          {/* ── 2. AI Engine ─────────────────────────────────────────────── */}
          <SettingCard icon={Cpu} title="AI Engine">
            {engineInfo ? (
              <>
                <SettingRow
                  label="Engine"
                  value={<span className="font-medium">{engineInfo.name || engineInfo.slug}</span>}
                />
                <SettingRow
                  label="Model"
                  value={<span className="font-mono text-[11px]">{matchedRule?.model || engineInfo.model_name || "—"}</span>}
                />
                {matchedRule?.temperature_override != null && (
                  <SettingRow
                    label="Creativity"
                    value={<span>{Math.round(matchedRule.temperature_override * 100)}%</span>}
                  />
                )}
                {matchedRule?.max_tokens && (
                  <SettingRow
                    label="Max tokens"
                    value={<span>{matchedRule.max_tokens}</span>}
                  />
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertCircle className="size-3" />
                  Chưa có engine được gán trong routing.
                </div>
                <a href="/content/settings" className="text-[10px] text-primary hover:underline">
                  Đi tới AI Operating Center để thêm engine →
                </a>
              </div>
            )}
          </SettingCard>

          {/* ── 3. Brand Voice ───────────────────────────────────────────── */}
          <SettingCard icon={MessageSquare} title="Brand Voice">
            {activeBrandVoice ? (
              <div className="space-y-1">
                <SettingRow
                  label="Preset"
                  value={<Badge variant="secondary" className="text-[10px] h-5">{activeBrandVoice.name}</Badge>}
                />
                {activeBrandVoice.tone_instruction && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {activeBrandVoice.tone_instruction}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-green-500" />
                Dùng brand voice mặc định
              </div>
            )}
          </SettingCard>

          {/* ── 4. System Prompt ──────────────────────────────────────────── */}
          <SettingCard icon={FileText} title="System Prompt">
            {systemPrompt ? (
              <div className="space-y-1">
                <SettingRow
                  label="Template"
                  value={<Badge variant="outline" className="text-[10px] h-5">{systemPrompt.name || "Custom"}</Badge>}
                />
                {systemPrompt.prompt_text && (
                  <div className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3 p-2 rounded border bg-muted/20">
                    {systemPrompt.prompt_text}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-green-500" />
                Dùng prompt mặc định
              </div>
            )}
          </SettingCard>

          {/* ── 5. Prompt Preview ─────────────────────────────────────────── */}
          {genConfig && selectedProduct && (
            <SettingCard icon={MessageSquare} title="Xem trước Prompt">
              <PromptPreview
                genConfig={genConfig}
                product={selectedProduct as any}
                customInstructions={customInstructions}
              />
            </SettingCard>
          )}

          {/* ── 6. Custom Instructions ──────────────────────────────────── */}
          <Separator />
          <SettingCard icon={MessageSquare} title="Hướng dẫn tuỳ chỉnh">
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
              Nhập hướng dẫn đặc biệt cho lần tạo này. VD: "Nhấn mạnh bảo hành 24 tháng", "Dùng giọng văn trẻ trung".
            </p>
            <Textarea
              value={customInstructions || ""}
              onChange={(e) => store.setCustomInstructions(e.target.value)}
              className="min-h-[80px] text-xs"
              placeholder="VD: Viết giọng văn chuyên nghiệp, nhấn mạnh bảo hành 24 tháng..."
              disabled={store.isGenerating}
            />
            {customInstructions && (
              <p className="text-[9px] text-muted-foreground italic">
                {customInstructions.length} ký tự
              </p>
            )}
          </SettingCard>

          {/* ── 7. Link to AI Operating Center ──────────────────────────── */}
          <Separator />
          <a
            href="/content/settings"
            className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <ShieldCheck className="size-4 shrink-0" />
            <div>
              <div className="font-medium">AI Operating Center</div>
              <div className="text-[9px]">
                Quản lý engine, routing, brand voice, prompt templates
              </div>
            </div>
            <ExternalLink className="size-3 ml-auto shrink-0" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
