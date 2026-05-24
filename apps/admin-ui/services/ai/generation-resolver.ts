/**
 * AI Generation Resolver — Frontend Layer
 *
 * Đứng giữa UI và Backend:
 * - UI chọn product + content type + platform + goal + funnel
 * - Resolver: đọc routing rules → resolve đầy đủ config
 * - Trả về preview cho UI (engine, model, creativity, tokens)
 * - Backend /api/content/generate dùng cùng logic để generate thật
 *
 * Đảm bảo UI preview và backend generate KHÔNG bao giờ mâu thuẫn.
 */

const DEV = process.env.NODE_ENV === "development";

import type { AIProduct } from "@/types/content";
import type { ContentPlatform } from "@/types/content";
import type {
  StudioContentType,
  MarketingGoal,
  FunnelStage,
} from "@/store/ai-studio-store";
import type {
  RoutingRule,
  ProviderCard,
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
  BrandPreset,
} from "@/types/ai-operating";
import { buildStrategy, type AIRoutingStrategy } from "@/lib/ai/routing-engine";
import { findProviderBySlug } from "@/lib/ai/provider-service";

// ── Resolution Result ────────────────────────────────────────────────────────────

export interface GenerationConfig {
  // AI Engine
  engineId: number | null;
  engineName: string;
  engineSlug: string;
  model: string;
  modelSource: "routing_override" | "provider_default" | "system_default";

  // Generation params
  temperature: number;
  maxTokens: number;
  topP: number;

  // Brand & rules
  brandVoice: BrandVoice | null;
  promptRules: string[];
  safetyRules: SafetyRule[];
  systemPrompt: SystemPromptTemplate | null;

  // Strategy
  strategy: AIRoutingStrategy;

  // UI helpers
  estimatedTokens: number;
  estimatedCost: "free" | "low" | "medium" | "high";
  contentLengthLabel: string;
  promptStyleLabel: string;

  // Reason
  resolutionReason: string;
  resolutionSource: "routing_rule" | "provider_default" | "system_default";

  // Validation: whether the resolved provider actually exists
  // After hard delete, routing may point to a deleted provider id.
  // When false, generation should fail with a clear error.
  hasValidProvider: boolean;
}

// ── Resolver input ──────────────────────────────────────────────────────────────

export interface ResolverInput {
  product: AIProduct;
  contentType: StudioContentType;
  platforms: ContentPlatform[];
  marketingGoal: MarketingGoal;
  funnelStage: FunnelStage;

  // DB data (passed from page that loaded the data)
  routingRules: RoutingRule[];
  providers: ProviderCard[];
  brandVoices: BrandVoice[];
  safetyRules: SafetyRule[];
  systemPrompts: SystemPromptTemplate[];
  activeBrandPreset?: BrandPreset;

  // User overrides from Step 2 "Custom AI Config" — highest priority
  advancedOverrides?: {
    provider_id?: number | null;
    model_override?: string | null;
    brand_preset?: string | null;
    system_prompt_id?: number | null;
    temperature_override?: number | null;
    max_tokens_override?: number | null;
    content_length?: string | null;
    cta_style_override?: string | null;
    emoji_level_override?: string | null;
    hashtag_mode_override?: string | null;
  };
}

// ── Content type → task type mapping ────────────────────────────────────────────
// CRITICAL: Must match the task_type values stored in ai_task_routes DB.
// DB stores SHORT values: facebook_content, seo_article, video_script, image_prompt, zalo_message.
// This map converts StudioContentType → DB task_type for routing lookups.
//
const CONTENT_TYPE_TO_TASK: Record<StudioContentType, string> = {
  facebook_post: "facebook_content",
  seo_article: "seo_article",
  video_script: "video_script",
  image_prompt: "image_prompt",
  zalo_message: "zalo_message",
  product_description: "product_description",
  email_marketing: "email_marketing",
};

// ── Provider lookup helpers ──────────────────────────────────────────────────────

function findProviderById(
  id: number,
  providers: ProviderCard[]
): ProviderCard | null {
  return providers.find((p) => p.id === id) ?? null;
}

function findActiveProvider(providers: ProviderCard[]): ProviderCard | null {
  return (
    providers.find((p) => (p.status === "active" || p.is_active) && p.is_default) ??
    providers.find((p) => p.status === "active" || p.is_active) ??
    null
  );
}

// ── Brand voice resolver ────────────────────────────────────────────────────────

function resolveBrandVoice(
  preset: BrandPreset | undefined,
  voices: BrandVoice[]
): BrandVoice | null {
  if (preset) {
    const byPreset = voices.find((v) => v.preset === preset);
    if (byPreset) return byPreset;
  }
  return voices.find((v) => v.is_active) ?? null;
}

// ── Safety rules resolver ───────────────────────────────────────────────────────

function resolveSafetyRules(
  ruleIds: number[] | null | undefined,
  allRules: SafetyRule[]
): SafetyRule[] {
  if (ruleIds && ruleIds.length > 0) {
    return allRules.filter(
      (r) => ruleIds.includes(r.id) && r.is_active !== false
    );
  }
  return allRules.filter((r) => r.is_active !== false);
}

// ── System prompt resolver ─────────────────────────────────────────────────────

function resolveSystemPrompt(
  promptId: number | null | undefined,
  allPrompts: SystemPromptTemplate[]
): SystemPromptTemplate | null {
  if (!promptId) return null;
  return allPrompts.find((p) => p.id === promptId) ?? null;
}

// ── Model resolution ─────────────────────────────────────────────────────────────

function resolveModel(
  override: string | null | undefined,
  provider: ProviderCard | null
): { model: string; source: GenerationConfig["modelSource"] } {
  if (override && override.trim()) {
    return { model: override.trim(), source: "routing_override" };
  }
  if (provider?.model_name?.trim()) {
    return { model: provider.model_name.trim(), source: "provider_default" };
  }
  return { model: "", source: "system_default" };
}

// ── Estimate helpers ───────────────────────────────────────────────────────────

function estimateTokens(
  contentType: StudioContentType,
  strategy: AIRoutingStrategy
): number {
  const base: Record<string, number> = {
    facebook_post: 600,
    seo_article: 2000,
    video_script: 1500,
    image_prompt: 300,
    zalo_message: 400,
    product_description: 800,
    email_marketing: 1000,
  };
  const extra = strategy.contentLength === "long" ? 1.5 : strategy.contentLength === "short" ? 0.5 : 1;
  return Math.ceil((base[contentType] ?? 800) * extra);
}

function estimateCost(
  provider: ProviderCard | null,
  tokens: number
): GenerationConfig["estimatedCost"] {
  if (!provider) return "high";
  // Local providers don't cost money
  const isLocal =
    provider.type === "ollama" ||
    provider.type === "lmstudio" ||
    provider.type === "openai-compatible" ||
    (provider.base_url ?? "").includes("localhost") ||
    (provider.base_url ?? "").includes("127.0.0.1");
  if (isLocal) return "free";
  if (tokens < 500) return "low";
  if (tokens < 2000) return "medium";
  return "high";
}

// ── MAIN RESOLVER ───────────────────────────────────────────────────────────────

/**
 * Resolve full generation configuration from task + DB data.
 *
 * Resolution order:
 * 1. Find routing rule by task_type
 * 2. Resolve primary provider (FK → slug fallback → default)
 * 3. Resolve model (override → provider default → system default)
 * 4. Resolve generation params (override → provider default)
 * 5. Resolve brand voice + safety + system prompt
 */
export function resolveGenerationConfig(input: ResolverInput): GenerationConfig {
  const {
    contentType,
    platforms,
    marketingGoal,
    funnelStage,
    routingRules,
    providers,
    brandVoices,
    safetyRules,
    systemPrompts,
    activeBrandPreset,
  } = input;

  const taskType = CONTENT_TYPE_TO_TASK[contentType];
  const strategy = buildStrategy({
    contentType,
    platforms: platforms as ContentPlatform[],
    marketingGoal: marketingGoal as MarketingGoal,
    funnelStage: funnelStage as FunnelStage,
    productCount: 1,
    hasStock: input.product.stockStatus === "in_stock",
  });

  // ── 1. Find routing rule ───────────────────────────────────────────────
  const rule = routingRules.find(
    (r) => r.task_type === taskType && r.is_active !== false
  );

  // Dev logs — comprehensive debugging for routing resolution
  if (DEV) {
    console.log("[SELECTED_CONTENT_TYPE]", contentType);
    console.log("[NORMALIZED_TASK_TYPE]", taskType);
    console.log("[ALL_ROUTING_ROWS]", routingRules.map((r) => ({
      id: r.id,
      task_type: r.task_type,
      task_label: r.task_label,
      primary_provider_id: r.primary_provider_id,
      primary_model_override: r.primary_model_override,
      provider_type: (r as any).provider_type,
      is_active: r.is_active,
    })));
    console.log("[MATCHED_ROUTING]", rule ? {
      id: rule.id,
      task_type: rule.task_type,
      primary_provider_id: rule.primary_provider_id,
      primary_model_override: rule.primary_model_override,
      is_active: rule.is_active,
      provider_type: (rule as any).provider_type,
    } : "NO MATCH — check if task_type values align");
  }

  let source: GenerationConfig["resolutionSource"] = "system_default";
  let reason = `Không tìm thấy routing rule cho task_type="${taskType}". Kiểm tra console để xem danh sách routing đang có.`;

  if (rule) {
    source = "routing_rule";
    reason = `Routing rule: ${rule.task_label || taskType}`;
  }

  // ── 2. Resolve primary provider ──────────────────────────────────────────
  let primaryProvider: ProviderCard | null = null;
  // Track whether the routing rule's explicit provider_id was actually found.
  // If the rule specifies primary_provider_id but the provider no longer exists
  // (was hard-deleted), this stays false so we can warn the user.
  let hasExplicitProvider = false;

  if (rule?.primary_provider_id) {
    const found = findProviderById(rule.primary_provider_id, providers);
    if (found) {
      primaryProvider = found;
      hasExplicitProvider = true;
    }
  }

  // Fallback chain when primary_provider_id is not found or not set
  if (!primaryProvider && rule?.task_type) {
    // Try provider_type (old column from DB)
    if ((rule as any).provider_type) {
      primaryProvider = findProviderBySlug((rule as any).provider_type, providers);
      if (primaryProvider) reason += ` | Resolved from provider_type: ${(rule as any).provider_type}`;
    }
    // Try slug from primary_model_override (e.g. "openai:gpt-4o-mini" or just "openai")
    if (!primaryProvider && rule.primary_model_override) {
      const slugPart = rule.primary_model_override.split(":")[0] || rule.primary_model_override;
      if (slugPart) {
        primaryProvider = findProviderBySlug(slugPart, providers);
        if (primaryProvider) reason += ` | Resolved from model slug: ${slugPart}`;
      }
    }
  }

  // Final fallback: first active provider (respecting is_default)
  if (!primaryProvider) {
    primaryProvider = findActiveProvider(providers);
    if (primaryProvider) {
      reason = `Dùng provider mặc định: ${primaryProvider.name || primaryProvider.slug}`;
    }
  }

  // Determine if the provider is valid:
  // - If routing rule has primary_provider_id but provider was NOT found → invalid (hard-deleted)
  // - If routing rule has no primary_provider_id → valid (just using fallback)
  const hasValidProvider =
    rule?.primary_provider_id != null ? hasExplicitProvider : true;

  // ── 3. Resolve model ────────────────────────────────────────────────────
  const { model, source: modelSource } = resolveModel(
    rule?.primary_model_override ?? null,
    primaryProvider
  );

  // ── 4. Resolve generation params ────────────────────────────────────────
  const temperature =
    rule?.temperature_override ?? primaryProvider?.temperature ?? 0.7;
  const maxTokens =
    rule?.max_tokens_override ?? primaryProvider?.max_output_tokens ?? 2048;
  const topP =
    rule?.top_p_override ?? primaryProvider?.top_p ?? 1;

  // ── 5. Resolve brand, safety, system prompt ─────────────────────────────
  const brandVoice = resolveBrandVoice(
    rule?.brand_preset ?? activeBrandPreset,
    brandVoices
  );
  const resolvedSafetyRules = resolveSafetyRules(
    rule?.system_prompt_id ? [rule.system_prompt_id] : undefined,
    safetyRules
  );
  const systemPrompt = resolveSystemPrompt(
    rule?.system_prompt_id ?? undefined,
    systemPrompts
  );

  if (DEV) {
    console.log("[RESOLVED_PROVIDER]", {
      id: primaryProvider?.id,
      name: primaryProvider?.name,
      display_name: primaryProvider?.display_name,
      slug: primaryProvider?.slug,
      type: primaryProvider?.type,
      model_name: primaryProvider?.model_name,
      base_url: primaryProvider?.base_url,
    });
  }

  // ── MERGE: User overrides from Step 2 take PRIORITY over routing ─────────────────
  const hasOverrides = input.advancedOverrides && Object.keys(input.advancedOverrides).length > 0;

  // If user explicitly set a provider override, resolve that provider
  if (hasOverrides && input.advancedOverrides!.provider_id != null) {
    primaryProvider = findProviderById(input.advancedOverrides!.provider_id, providers) ?? primaryProvider;
  }

  // Apply model override
  const modelOverride = input.advancedOverrides?.model_override ?? null;
  const finalModel = modelOverride ?? model;

  // Apply temperature override
  const temperatureOverride = input.advancedOverrides?.temperature_override;
  const finalTemperature = temperatureOverride ?? temperature;

  // Apply max_tokens override
  const maxTokensOverride = input.advancedOverrides?.max_tokens_override;
  const finalMaxTokens = maxTokensOverride ?? maxTokens;

  // Apply brand preset override
  const brandPresetOverride = input.advancedOverrides?.brand_preset ?? null;
  const finalBrandVoice = resolveBrandVoice(
    (brandPresetOverride ?? rule?.brand_preset ?? activeBrandPreset) as "professional" | "gaming" | "student" | "business" | "apple_premium" | "budget_friendly" | undefined,
    brandVoices
  );

  // Apply system prompt override
  const systemPromptIdOverride = input.advancedOverrides?.system_prompt_id;
  const finalSystemPrompt = resolveSystemPrompt(
    systemPromptIdOverride ?? rule?.system_prompt_id ?? undefined,
    systemPrompts
  );

  // Apply strategy overrides (content length, CTA style, etc.)
  let finalStrategy = { ...strategy };
  if (hasOverrides && input.advancedOverrides) {
    const o = input.advancedOverrides;
    if (o.content_length) {
      finalStrategy = { ...finalStrategy, contentLength: o.content_length as "short" | "medium" | "long" };
    }
    if (o.cta_style_override) {
      finalStrategy = { ...finalStrategy, suggestedCTAStyle: o.cta_style_override as "urgent" | "friendly" | "professional" | "soft" };
    }
    if (o.temperature_override !== undefined) {
      const temp = o.temperature_override;
      if (temp !== null && temp >= 1.0) {
        finalStrategy = { ...finalStrategy, promptStyle: "creative" };
      } else if (temp !== null && temp <= 0.4) {
        finalStrategy = { ...finalStrategy, promptStyle: "conservative" };
      }
    }
    if (o.hashtag_mode_override) {
      finalStrategy = { ...finalStrategy, generateHashtags: o.hashtag_mode_override !== "none" };
    }
  }

  if (DEV && hasOverrides) {
    console.log("[RESOLVER] Overrides applied:", {
      provider: primaryProvider?.name,
      model: finalModel,
      temperature: finalTemperature,
      brandVoice: finalBrandVoice?.name,
      systemPrompt: finalSystemPrompt?.name,
      contentLength: finalStrategy.contentLength,
      ctaStyle: finalStrategy.suggestedCTAStyle,
      promptStyle: finalStrategy.promptStyle,
    });
  }

  // ── 7. Estimate ────────────────────────────────────────────────────────
  const estimatedTokens = estimateTokens(contentType, finalStrategy);
  const estimatedCost = estimateCost(primaryProvider, estimatedTokens);

  // Dev logs — comprehensive debugging for routing resolution
  if (DEV) {
    console.log("[RESOLVED_AI_CONFIG]", {
      engineId: primaryProvider?.id ?? null,
      engineName: primaryProvider?.name ?? "System Default",
      model: finalModel,
      modelSource,
      source,
      reason,
      hasValidProvider,
    });
  }

  // ── 8. Build final config ───────────────────────────────────────────────
  return {
    // Engine
    engineId: primaryProvider?.id ?? null,
    engineName: primaryProvider?.name ?? "System Default",
    engineSlug: primaryProvider?.slug ?? primaryProvider?.type ?? "openai",
    model: finalModel,
    modelSource: modelOverride ? "routing_override" : modelSource,

    // Params
    temperature: finalTemperature,
    maxTokens: finalMaxTokens,
    topP,

    // Brand & rules
    brandVoice: finalBrandVoice,
    promptRules: [], // TODO: load prompt rules by type
    safetyRules: resolvedSafetyRules,
    systemPrompt: finalSystemPrompt,

    // Strategy
    strategy: finalStrategy,

    // Estimates
    estimatedTokens,
    estimatedCost,
    contentLengthLabel: {
      short: "Ngắn gọn",
      medium: "Trung bình",
      long: "Dài",
    }[finalStrategy.contentLength],
    promptStyleLabel: {
      creative: "Sáng tạo",
      balanced: "Cân bằng",
      conservative: "Bảo thủ",
    }[finalStrategy.promptStyle],

    // Reason
    resolutionReason: hasOverrides ? `Tùy chỉnh bởi người dùng — ${reason}` : reason,
    resolutionSource: source,

    // Validation
    hasValidProvider,
  };
}

// ── Preview helpers ────────────────────────────────────────────────────────────

/**
 * Get a short summary of the resolved config for UI display.
 */
export function getConfigSummary(config: GenerationConfig): string {
  const parts: string[] = [];

  if (config.engineName !== "System Default") {
    parts.push(`Engine: ${config.engineName}`);
  }
  parts.push(`Model: ${config.model}`);
  parts.push(`Độ sáng tạo: ${config.promptStyleLabel}`);
  parts.push(`Độ dài: ${config.contentLengthLabel}`);
  parts.push(`Token ước tính: ~${config.estimatedTokens}`);

  if (config.brandVoice) {
    parts.push(`Brand: ${config.brandVoice.name}`);
  }

  return parts.join(" · ");
}

/**
 * Get creativity level (0-100) from temperature.
 */
export function temperatureToCreativityLevel(temp: number): number {
  return Math.round(Math.min(100, Math.max(0, temp * 100)));
}

/**
 * Get creativity label from temperature.
 */
export function getCreativityLabel(temp: number): string {
  const level = temperatureToCreativityLevel(temp);
  if (level < 30) return "Chính xác";
  if (level < 60) return "Cân bằng";
  if (level < 80) return "Sáng tạo";
  return "Rất sáng tạo";
}
