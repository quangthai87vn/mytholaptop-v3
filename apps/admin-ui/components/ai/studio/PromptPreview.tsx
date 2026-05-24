"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Sparkles,
  Shield,
  Package,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import type { GenerationConfig } from "@/services/ai/generation-resolver";
import type { AIProduct } from "@/types/content";
import type { AIRoutingStrategy } from "@/lib/ai/routing-engine";

interface PromptPreviewProps {
  genConfig: GenerationConfig;
  product: AIProduct;
  customInstructions?: string;
}

// ── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  key: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  getContent: (ctx: StepContext) => string;
}

interface StepContext {
  genConfig: GenerationConfig;
  product: AIProduct;
  customInstructions?: string;
  strategy: {
    name: string;
    contentLength: "short" | "medium" | "long";
    promptStyle: "creative" | "balanced" | "conservative";
    variantCount: number;
    suggestedCTAStyle: "urgent" | "friendly" | "professional" | "soft";
    generateHashtags: boolean;
    generateSEO: boolean;
    extractHooks: boolean;
    description: string;
  };
}

function buildStrategy(ctx: { genConfig: GenerationConfig }): StepContext["strategy"] {
  const { genConfig } = ctx;
  return {
    name: genConfig.strategy.name,
    contentLength: genConfig.strategy.contentLength,
    promptStyle: genConfig.strategy.promptStyle,
    variantCount: genConfig.strategy.variantCount,
    suggestedCTAStyle: genConfig.strategy.suggestedCTAStyle,
    generateHashtags: genConfig.strategy.generateHashtags,
    generateSEO: genConfig.strategy.generateSEO,
    extractHooks: genConfig.strategy.extractHooks,
    description: genConfig.strategy.description,
  };
}

const PIPELINE_STEPS: Step[] = [
  {
    key: "system",
    label: "System Prompt",
    shortLabel: "System",
    icon: Sparkles,
    getContent: ({ genConfig, customInstructions }) => {
      const lines: string[] = [];
      lines.push("=== ROLE ===");
      lines.push("Bạn là chuyên gia marketing với 10 năm kinh nghiệm viết content cho thị trường Việt Nam.");
      if (genConfig.brandVoice) {
        lines.push("");
        lines.push("=== BRAND VOICE ===");
        lines.push(`Tên: ${genConfig.brandVoice.name}`);
        if (genConfig.brandVoice.tone_instruction) {
          lines.push(`Giọng điệu: ${genConfig.brandVoice.tone_instruction}`);
        }
        if (genConfig.brandVoice.example_output) {
          lines.push("Ví dụ: " + genConfig.brandVoice.example_output.slice(0, 120) + (genConfig.brandVoice.example_output.length > 120 ? "..." : ""));
        }
      }
      if (genConfig.safetyRules?.length) {
        lines.push("");
        lines.push("=== SAFETY RULES ===");
        genConfig.safetyRules.forEach((r) => {
          lines.push(`- ${r.rule_text}`);
        });
      }
      if (customInstructions) {
        lines.push("");
        lines.push("=== CUSTOM INSTRUCTIONS ===");
        lines.push(customInstructions);
      }
      return lines.join("\n");
    },
  },
  {
    key: "product",
    label: "Product Context",
    shortLabel: "Sản phẩm",
    icon: Package,
    getContent: ({ product }) => {
      const lines: string[] = [];
      lines.push("=== PRODUCT INFO ===");
      lines.push(`Tên: ${product.name || "N/A"}`);
      if (product.category) lines.push(`Danh mục: ${product.category}`);
      if (product.brand) lines.push(`Thương hiệu: ${product.brand}`);
      if (product.description) lines.push(`Mô tả: ${product.description}`);
      if (product.price) lines.push(`Giá: ${product.price}`);
      if (product.tags?.length) lines.push(`Tags: ${product.tags.join(", ")}`);
      if (product.stockStatus) {
        lines.push(`Tình trạng: ${product.stockStatus === "in_stock" ? "Còn hàng" : "Hết hàng"}`);
      }
      return lines.join("\n");
    },
  },
  {
    key: "user",
    label: "User Prompt",
    shortLabel: "User",
    icon: User,
    getContent: ({ genConfig, product }) => {
      const strategy = genConfig.strategy;
      const lines: string[] = [];
      const contentType = genConfig.strategy.name || "facebook_post";
      const lengthMap: Record<string, string> = {
        short: "150-200 từ",
        medium: "300-500 từ",
        long: "800-1200 từ",
      };
      lines.push(`=== TASK: ${contentType.toUpperCase()} ===`);
      lines.push(`Sản phẩm: ${product.name || "N/A"}`);
      lines.push(`Độ dài: ${lengthMap[strategy.contentLength] || "300-500 từ"}`);
      lines.push(`Phong cách: ${strategy.promptStyle || "cân bằng"}`);
      if (strategy.extractHooks) lines.push("- Hook thu hút trong 3 giây đầu");
      if (strategy.generateHashtags) lines.push("- Kèm 5-10 hashtag phù hợp");
      if (strategy.generateSEO) lines.push("- Tối ưu từ khóa tự nhiên");
      if (strategy.variantCount > 1) lines.push(`- Tạo ${strategy.variantCount} biến thể`);
      return lines.join("\n");
    },
  },
];

// ── Single step row ────────────────────────────────────────────────────────

function PipelineStepRow({ step, content }: { step: Step; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
      >
        <step.icon className="size-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-medium">{step.label}</span>
        <span className="ml-auto text-[9px] text-muted-foreground font-mono">
          {content.length} chars
        </span>
        {open ? (
          <ChevronDown className="size-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t">
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed mt-2 max-h-48 overflow-y-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function PromptPreview({ genConfig, product, customInstructions }: PromptPreviewProps) {
  const [showAll, setShowAll] = useState(false);

  const strategy = buildStrategy({ genConfig });
  const ctx: StepContext = { genConfig, product, customInstructions, strategy };

  const visibleSteps = showAll ? PIPELINE_STEPS : PIPELINE_STEPS.slice(0, 1);

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Xem trước prompt mà AI sẽ nhận. Toggle để xem chi tiết từng bước.
      </p>

      <div className="space-y-1">
        {visibleSteps.map((step) => (
          <PipelineStepRow key={step.key} step={step} content={step.getContent(ctx)} />
        ))}
      </div>

      {PIPELINE_STEPS.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 w-full"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? (
            <>
              <EyeOff className="size-3" /> Ẩn bớt
            </>
          ) : (
            <>
              <Eye className="size-3" /> Xem đầy đủ ({PIPELINE_STEPS.length} bước)
            </>
          )}
        </Button>
      )}
    </div>
  );
}
