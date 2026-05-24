"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  User,
  MessageSquare,
  Package,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  Edit3,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useStudioStore, CONTENT_TYPE_LABELS, type StudioContentType } from "@/store/ai-studio-store";
import { useQuery } from "@tanstack/react-query";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

interface PromptSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string;
  variant?: "default" | "highlight" | "warning";
  editable?: boolean;
  onEdit?: (text: string) => void;
}

function PromptSection({
  title,
  icon,
  content,
  variant = "default",
  editable,
  onEdit,
}: PromptSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content);

  const borderColor =
    variant === "highlight"
      ? "border-primary/20"
      : variant === "warning"
      ? "border-amber-200 dark:border-amber-800"
      : "border-border";
  const bgColor =
    variant === "highlight"
      ? "bg-primary/[0.03]"
      : variant === "warning"
      ? "bg-amber-50 dark:bg-amber-950/20"
      : "bg-card";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !editing && setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); !editing && setExpanded((v) => !v); } }}
        className="flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {editable && !editing && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Edit3 className="size-3 text-muted-foreground" />
            </button>
          )}
          {expanded ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3">
          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-h-[80px] text-xs resize-none font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => { setEditing(false); onEdit?.(value); }}
                >
                  <CheckCircle2 className="size-3" /> Lưu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => { setEditing(false); setValue(content); }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
              {content || "—"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Build the prompt preview from resolved routing config
function buildPromptPreview(params: {
  product: any;
  contentType: StudioContentType;
  matchedRule: any;
  engineInfo: any;
  brandVoice: any;
  systemPrompt: any;
  customInstructions: string;
  overrides: any;
}): { systemRole: string; brandVoice: string; productContext: string; taskInstruction: string; outputFormat: string; model: string; temperature: number } {
  const { product, contentType, matchedRule, engineInfo, brandVoice, systemPrompt, customInstructions, overrides } = params;
  const cleanName = product?.name || "Sản phẩm";
  const cleanDesc = stripHtml(product?.description || "");
  const specs = (product?.specs || []).join(", ");

  // Resolve temperature: overrides > matchedRule > engineInfo > hardcoded default
  const temp = overrides?.temperature_override ?? matchedRule?.temperature_override ?? engineInfo?.temperature ?? 0.7;
  // Resolve tokens: overrides > matchedRule > hardcoded default
  const tokens = overrides?.max_tokens_override ?? matchedRule?.max_tokens_override ?? matchedRule?.max_tokens ?? 1500;
  // Resolve model: overrides > matchedRule.primary_model_override > engineInfo.model_name
  const model = overrides?.model_override ?? matchedRule?.primary_model_override ?? engineInfo?.model_name ?? "—";
  const lengthLabel = tokens <= 800 ? "ngắn gọn (~300-500 từ)" : tokens <= 1500 ? "vừa phải (~500-800 từ)" : "chi tiết (~800-1500 từ)";

  // Priority: overrides (from Step 2) > matchedRule > hardcoded fallback
  const systemRole = (systemPrompt?.prompt_text) ||
    `Bạn là chuyên gia viết content marketing cho website bán laptop và công nghệ. Viết nội dung chuyên nghiệp, hấp dẫn, tối ưu SEO.`;

  // Build rich brand voice text from full BrandVoice object
  const brandVoiceText = brandVoice
    ? [
        `Phong cách: ${brandVoice.name}`,
        brandVoice.tone_instruction ? `Hướng dẫn: ${brandVoice.tone_instruction}` : null,
        brandVoice.target_audience ? `Đối tượng: ${brandVoice.target_audience}` : null,
        brandVoice.keywords_to_use?.length
          ? `Từ khóa ưu tiên: ${brandVoice.keywords_to_use.join(", ")}`
          : null,
        brandVoice.keywords_to_avoid?.length
          ? `Tránh dùng: ${brandVoice.keywords_to_avoid.join(", ")}`
          : null,
        // Tone sliders
        brandVoice.tone_professional_casual !== undefined
          ? `Giọng văn: ${
              brandVoice.tone_professional_casual <= -0.5
                ? "Chuyên nghiệp, trang trọng"
                : brandVoice.tone_professional_casual >= 0.5
                ? "Thân thiện, gần gũi"
                : "Cân bằng"
            }`
          : null,
        brandVoice.tone_luxury_affordable !== undefined
          ? `Giá trị: ${
              brandVoice.tone_luxury_affordable <= -0.5
                ? "Cao cấp, sang trọng"
                : brandVoice.tone_luxury_affordable >= 0.5
                ? "Hợp lý, tiết kiệm"
                : "Cân bằng"
            }`
          : null,
        brandVoice.tone_technical_simple !== undefined
          ? `Ngôn ngữ: ${
              brandVoice.tone_technical_simple <= -0.5
                ? "Kỹ thuật, chuyên sâu"
                : brandVoice.tone_technical_simple >= 0.5
                ? "Đơn giản, dễ hiểu"
                : "Cân bằng"
            }`
          : null,
        brandVoice.cta_style ? `CTA style: ${brandVoice.cta_style}` : null,
        brandVoice.emoji_usage
          ? `Emoji: ${(brandVoice.emoji_usage === "none" ? "Không dùng" : brandVoice.emoji_usage === "minimal" ? "Ít (1-2)" : brandVoice.emoji_usage === "moderate" ? "Vừa (3-5)" : "Nhiều (5+)")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Chưa cấu hình Brand Voice — vào AI Operating Center để thiết lập.";

  const productContext = [
    `Sản phẩm: ${cleanName}`,
    specs ? `Thông số: ${specs}` : null,
    cleanDesc ? `Mô tả: ${cleanDesc.slice(0, 300)}${cleanDesc.length > 300 ? "..." : ""}` : null,
  ].filter(Boolean).join("\n");

  const contentTypeLabel = CONTENT_TYPE_LABELS[contentType] || contentType;

  const taskInstruction = [
    `Tạo bài ${contentTypeLabel}`,
    `Độ dài: ${lengthLabel}`,
    `Độ sáng tạo: ${Math.round(temp * 100)}%`,
    customInstructions ? `\nHướng dẫn thêm: ${customInstructions}` : null,
  ].filter(Boolean).join("\n");

  const outputFormat = [
    "## Nội dung chính",
    "[Bài viết được tạo bởi AI]",
    "",
    "## Hook (mở đầu thu hút)",
    "[Hook ấn tượng]",
    "",
    "## CTA (call to action)",
    "[Kêu gọi hành động rõ ràng]",
    "",
    "## Hashtags",
    "[Danh sách hashtag phù hợp]",
  ].join("\n");

  return { systemRole, brandVoice: brandVoiceText, productContext, taskInstruction, outputFormat, model, temperature: temp };
}

export function PromptPreviewStep() {
  const store = useStudioStore();
  const contentType = store.contentType;
  const selectedProduct = store.selectedProduct;
  const customInstructions = store.customInstructions;
  const overrides = store.advancedOverrides;
  const goToNextStep = store.goToNextStep;
  const goToPrevStep = store.goToPrevStep;

  const [editedSections, setEditedSections] = useState<Record<string, string>>({});

  const { data: settingsData } = useQuery({
    queryKey: ["ai-settings-all"],
    queryFn: async () => {
      const res = await fetch("/api/ai/settings/all");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000,
  });

  const routingRules: any[] = settingsData?.data?.taskRoutes ?? [];
  const brandVoices = settingsData?.data?.brandVoices ?? [];
  const systemPrompts = settingsData?.data?.systemPrompts ?? [];
  const activeProviders = settingsData?.data?.providers ?? [];

  const matchedRule = routingRules.find(
    (r: any) => {
      const taskType = r.task_type;
      // Match contentType to task_type
      const CONTENT_TYPE_TO_TASK: Record<string, string> = {
        facebook_post: "facebook_content",
        seo_article: "seo_article",
        video_script: "video_script",
        image_prompt: "image_prompt",
        zalo_message: "zalo_message",
        product_description: "product_description",
        email_marketing: "email_marketing",
      };
      return r.task_type === CONTENT_TYPE_TO_TASK[contentType] && r.is_active !== false;
    }
  );

  const engineInfo = overrides?.provider_id != null
    ? activeProviders.find((p: any) => String(p.id) === String(overrides.provider_id))
    : matchedRule?.primary_provider_id
    ? activeProviders.find((p: any) => String(p.id) === String(matchedRule.primary_provider_id))
    : null;

  // Resolve brandVoice: overrides (Step 2) take priority over matchedRule defaults
  // The overrides object stores user customizations from Step 2
  const brandVoiceOverride = overrides?.brand_preset;
  const systemPromptOverride = overrides?.system_prompt_id;

  const brandVoice = brandVoiceOverride
    ? brandVoices.find((bv: any) => bv.preset === brandVoiceOverride)
    : matchedRule?.brand_preset
    ? brandVoices.find((bv: any) => bv.preset === matchedRule.brand_preset)
    : null;

  const systemPrompt = systemPromptOverride
    ? systemPrompts.find((sp: any) => String(sp.id) === String(systemPromptOverride))
    : matchedRule?.system_prompt_id
    ? systemPrompts.find((sp: any) => sp.id === matchedRule.system_prompt_id)
    : null;

  const preview = selectedProduct
    ? buildPromptPreview({
        product: selectedProduct,
        contentType,
        matchedRule,
        engineInfo,
        brandVoice,
        systemPrompt,
        customInstructions,
        overrides,
      })
    : null;

  const getSection = (key: string, fallback: string) =>
    editedSections[key] ?? fallback;

  const handleEdit = (key: string, text: string) => {
    setEditedSections((prev) => ({ ...prev, [key]: text }));
  };

  const handleReset = () => {
    setEditedSections({});
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: prompt sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Warning */}
          {!selectedProduct && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Vui lòng chọn sản phẩm ở Bước 1 trước.
              </p>
            </div>
          )}

          {selectedProduct && preview && (
            <>
              {/* System Role */}
              <PromptSection
                title="System Role"
                icon={<User className="size-3.5 text-blue-500" />}
                content={getSection("systemRole", preview.systemRole)}
                variant="default"
                editable
                onEdit={(t) => handleEdit("systemRole", t)}
              />

              {/* Brand Voice */}
              <PromptSection
                title="Brand Voice"
                icon={<MessageSquare className="size-3.5 text-purple-500" />}
                content={getSection("brandVoice", preview.brandVoice)}
                variant="default"
                editable
                onEdit={(t) => handleEdit("brandVoice", t)}
              />

              {/* Product Context */}
              <PromptSection
                title="Product Context"
                icon={<Package className="size-3.5 text-green-500" />}
                content={getSection("productContext", preview.productContext)}
                variant="highlight"
                editable
                onEdit={(t) => handleEdit("productContext", t)}
              />

              {/* Task Instruction */}
              <PromptSection
                title="Task Instruction"
                icon={<FileText className="size-3.5 text-amber-500" />}
                content={getSection("taskInstruction", preview.taskInstruction)}
                variant="highlight"
                editable
                onEdit={(t) => handleEdit("taskInstruction", t)}
              />

              {/* Output Format */}
              <PromptSection
                title="Output Format"
                icon={<Shield className="size-3.5 text-orange-500" />}
                content={getSection("outputFormat", preview.outputFormat)}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Right: summary */}
        <div className="w-64 shrink-0 border-l overflow-y-auto p-4 hidden xl:block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Tóm tắt
          </p>
          <div className="space-y-3">
            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <p className="text-[10px] text-muted-foreground">Loại nội dung</p>
              <p className="text-xs font-bold">{CONTENT_TYPE_LABELS[contentType]}</p>
            </div>
            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <p className="text-[10px] text-muted-foreground">Sản phẩm</p>
              <p className="text-xs font-bold line-clamp-2">{selectedProduct?.name || "—"}</p>
            </div>
            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <p className="text-[10px] text-muted-foreground">AI Engine</p>
              <p className="text-xs font-bold">{preview ? (preview.model || "—") : (engineInfo?.name || "Chưa cấu hình")}</p>
            </div>
            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <p className="text-[10px] text-muted-foreground">Độ sáng tạo</p>
              <p className="text-xs font-bold">{preview ? `${Math.round(preview.temperature * 100)}%` : "—"}</p>
            </div>
            <div className="p-3 rounded-xl border bg-card space-y-1.5">
              <p className="text-[10px] text-muted-foreground">Brand Voice</p>
              <p className="text-xs font-bold">{brandVoice?.name || "Mặc định"}</p>
            </div>
            {Object.keys(editedSections).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[11px] gap-1"
                onClick={handleReset}
              >
                <RotateCcw className="size-3" />
                Khôi phục Prompt gốc
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="shrink-0 px-6 py-4 border-t bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-4 text-xs"
            onClick={goToPrevStep}
          >
            <ArrowLeft className="size-3.5" />
            Quay lại
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 px-5 font-semibold shadow-sm"
            disabled={!selectedProduct}
            onClick={goToNextStep}
          >
            <Sparkles className="size-3.5" />
            Tạo nội dung
          </Button>
        </div>
      </div>
    </div>
  );
}
