/**
 * AI Marketing Routing Engine — Legacy
 *
 * File này giữ nguyên hàm `routeToModel()` với signature cũ
 * để backward compatibility với code hiện tại.
 *
 * Logic mới nằm trong `lib/ai/routing-engine.ts`.
 */

import type { ProviderType } from "@/types/ai-operating";
import type { ContentPlatform } from "@/types/content";
import type {
  StudioContentType,
  MarketingGoal,
  FunnelStage,
} from "@/store/ai-studio-store";

// Legacy types (để backward compat)
export interface RoutingContext {
  platforms: ContentPlatform[];
  contentType: StudioContentType;
  marketingGoal: MarketingGoal;
  funnelStage: FunnelStage;
  productCount: number;
  hasStock: boolean;
}

export interface RoutingDecision {
  model: string;
  provider: ProviderType;
  temperature: number;
  maxTokens: number;
  strategyLabel: string;
  strategy: AIGeneratedStrategy;
  reasoning: string;
  enableStreaming: boolean;
}

export interface AIGeneratedStrategy {
  name: string;
  description: string;
  promptStyle: "creative" | "balanced" | "conservative";
  variantCount: number;
  extractHooks: boolean;
  generateSEO: boolean;
  generateHashtags: boolean;
  suggestedCTAStyle: "urgent" | "friendly" | "professional" | "soft";
  contentLength: "short" | "medium" | "long";
}

// Copy of the routing matrix and logic from routing-engine.ts
const MODEL_ROUTING: Array<{
  platform?: ContentPlatform;
  contentType?: StudioContentType;
  goal?: MarketingGoal;
  funnel?: FunnelStage;
  model: string;
  provider: ProviderType;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  priority: number;
  note?: string;
}> = [
  {
    platform: "tiktok", goal: "viral", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.85, maxTokens: 1500, streaming: true, priority: 90,
    note: "TikTok viral cần sáng tạo cao, deepseek-chat tốt cho nội dung trending",
  },
  {
    platform: "tiktok", goal: "conversion", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.7, maxTokens: 1200, streaming: true, priority: 85,
  },
  {
    platform: "tiktok", goal: "branding", model: "gpt-4o-mini", provider: "openai",
    temperature: 0.75, maxTokens: 1000, streaming: true, priority: 80,
  },
  {
    platform: "facebook", goal: "conversion", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.7, maxTokens: 2000, streaming: true, priority: 88,
    note: "Facebook conversion: deepseek mạnh về Vietnamese marketing",
  },
  {
    platform: "facebook", goal: "viral", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.8, maxTokens: 1800, streaming: true, priority: 87,
  },
  {
    platform: "facebook", goal: "branding", model: "gpt-4o-mini", provider: "openai",
    temperature: 0.65, maxTokens: 2000, streaming: true, priority: 75,
  },
  {
    platform: "facebook", goal: "seo", model: "gpt-4o", provider: "openai",
    temperature: 0.6, maxTokens: 3000, streaming: false, priority: 90,
  },
  {
    platform: "website", goal: "seo", model: "gpt-4o", provider: "openai",
    temperature: 0.6, maxTokens: 4000, streaming: false, priority: 95,
    note: "SEO article cần GPT-4o để viết chuẩn SEO",
  },
  {
    platform: "website", goal: "branding", model: "gpt-4o-mini", provider: "openai",
    temperature: 0.6, maxTokens: 3000, streaming: false, priority: 85,
  },
  {
    platform: "website", goal: "conversion", model: "gpt-4o-mini", provider: "openai",
    temperature: 0.65, maxTokens: 2500, streaming: false, priority: 80,
  },
  {
    platform: "youtube", contentType: "video_script", model: "gpt-4o", provider: "openai",
    temperature: 0.7, maxTokens: 4000, streaming: false, priority: 90,
    note: "Video script cần GPT-4o để viết kịch bản mạch lạc",
  },
  {
    platform: "youtube", goal: "viral", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.75, maxTokens: 3000, streaming: false, priority: 85,
  },
  {
    platform: "zalo", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.65, maxTokens: 1500, streaming: true, priority: 88,
    note: "Zalo message: ngắn gọn, deepseek rẻ và nhanh",
  },
  {
    contentType: "image_prompt", model: "gpt-4o", provider: "openai",
    temperature: 0.8, maxTokens: 2000, streaming: false, priority: 92,
    note: "Image prompt cần GPT-4o để viết prompt hình ảnh chi tiết",
  },
  {
    funnel: "awareness", goal: "branding", model: "gpt-4o-mini", provider: "openai",
    temperature: 0.7, maxTokens: 2000, streaming: true, priority: 70,
  },
  {
    funnel: "conversion", goal: "conversion", model: "deepseek-chat", provider: "deepseek",
    temperature: 0.65, maxTokens: 2500, streaming: true, priority: 86,
  },
  {
    funnel: "consideration", goal: "conversion", model: "gpt-4o-mini", provider: "openai",
    temperature: 0.6, maxTokens: 2500, streaming: true, priority: 82,
  },
];

function generateStrategy(ctx: RoutingContext): AIGeneratedStrategy {
  const { platforms, contentType, marketingGoal, funnelStage } = ctx;
  const isViral = marketingGoal === "viral";
  const isConversion = marketingGoal === "conversion";
  const isSEO = marketingGoal === "seo";
  const isAwareness = funnelStage === "awareness";
  const isTikTok = platforms.includes("tiktok");
  const isVideo = contentType === "video_script";
  const isImage = contentType === "image_prompt";

  let promptStyle: "creative" | "balanced" | "conservative" = "balanced";
  if (isViral || isTikTok) promptStyle = "creative";
  if (isSEO) promptStyle = "conservative";

  let variantCount = 2;
  if (isViral) variantCount = 3;
  if (isSEO || isVideo) variantCount = 1;

  let contentLength: "short" | "medium" | "long" = "medium";
  if (isViral || isTikTok) contentLength = "short";
  if (isSEO || isVideo) contentLength = "long";
  if (isAwareness) contentLength = "short";

  let suggestedCTAStyle: "urgent" | "friendly" | "professional" | "soft" = "friendly";
  if (isConversion && funnelStage === "conversion") suggestedCTAStyle = "urgent";
  if (isSEO) suggestedCTAStyle = "professional";
  if (isViral || isTikTok) suggestedCTAStyle = "soft";

  let name = "Marketing Content";
  if (isViral) name = "Viral Content";
  if (isSEO) name = "SEO Article";
  if (isVideo) name = "Video Script";
  if (isImage) name = "Image Prompt";
  if (isConversion && funnelStage === "conversion") name = "Conversion Content";
  if (isAwareness) name = "Brand Awareness";

  let description = "Nội dung marketing đa năng cho người Việt.";
  if (isTikTok && isViral) description = "Nội dung TikTok viral với hook mạnh, emoji, hashtag trending.";
  if (isSEO) description = "Bài viết SEO chuẩn Google, tối ưu keyword, meta description.";
  if (isVideo) description = "Kịch bản video hấp dẫn với hook, body, CTA rõ ràng.";
  if (isAwareness) description = "Nội dung gây nhận biết thương hiệu, viral factor cao.";

  return {
    name,
    description,
    promptStyle,
    variantCount,
    extractHooks: !isSEO && !isVideo,
    generateSEO: isSEO || platforms.includes("website") || platforms.includes("facebook"),
    generateHashtags: !isSEO,
    suggestedCTAStyle,
    contentLength,
  };
}

export function routeToModel(ctx: RoutingContext): RoutingDecision {
  const { platforms, contentType, marketingGoal, funnelStage } = ctx;

  const candidates = MODEL_ROUTING.filter((r) => {
    if (r.platform && !platforms.includes(r.platform)) return false;
    if (r.contentType && r.contentType !== contentType) return false;
    if (r.goal && r.goal !== marketingGoal) return false;
    if (r.funnel && r.funnel !== funnelStage) return false;
    return true;
  });

  const platformFallback = MODEL_ROUTING.filter(
    (r) =>
      r.platform && platforms.includes(r.platform) &&
      !r.goal && !r.funnel && !r.contentType
  );

  const defaultRoute = MODEL_ROUTING.find(
    (r) => !r.platform && !r.contentType && !r.goal && !r.funnel
  )!;

  const picked = candidates.length > 0
    ? candidates.reduce((best, r) => (r.priority > best.priority ? r : best))
    : platformFallback.length > 0
    ? platformFallback.reduce((best, r) => (r.priority > best.priority ? r : best))
    : defaultRoute;

  const strategy = generateStrategy(ctx);
  const note = picked.note || `Platform: ${platforms.join(", ")}, Goal: ${marketingGoal}, Funnel: ${funnelStage}`;

  return {
    model: picked.model,
    provider: picked.provider,
    temperature: picked.temperature,
    maxTokens: picked.maxTokens,
    enableStreaming: picked.streaming,
    strategyLabel: strategy.name,
    strategy,
    reasoning: note,
  };
}

// ── Label helpers ──────────────────────────────────────────────────────────────

export function getProviderLabel(provider: ProviderType): string {
  const labels: Record<ProviderType, string> = {
    openai: "OpenAI",
    gemini: "Google Gemini",
    deepseek: "DeepSeek",
    huggingface: "HuggingFace",
    ollama: "Ollama (Local)",
    lmstudio: "LM Studio (Local)",
    "openai-compatible": "OpenAI Compatible",
    openrouter: "OpenRouter",
    groq: "Groq",
  };
  return labels[provider] || provider;
}

export function getModelLabel(model: string): string {
  const labels: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "deepseek-chat": "DeepSeek Chat",
    "deepseek-reasoner": "DeepSeek Reasoner",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
    "gemini-1.5-flash": "Gemini 1.5 Flash",
    "gemini-1.5-pro": "Gemini 1.5 Pro",
  };
  return labels[model] || model;
}
