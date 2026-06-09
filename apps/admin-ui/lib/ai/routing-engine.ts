/**
 * AI Routing Engine v2
 *
 * Redesigned architecture:
 * - Providers define technical runtime configuration (base_url, api_key, default model, settings)
 * - Routing defines business task-level rules (which task → which provider, optional overrides)
 *
 * Resolution logic:
 * 1. Find active routing rule by task_type
 * 2. Load primary provider by primary_provider_id (FK) — NOT by slug string
 * 3. Resolve effective model:
 *    - if routing.primary_model_override exists → use it
 *    - else use provider.model_name (default_model)
 * 4. Resolve generation params (temp, max_tokens):
 *    - if routing.*_override exists → use it
 *    - else use provider runtime config
 * 5. Resolve fallback the same way
 * 6. Return fully resolved config ready for use
 */

const DEV = process.env.NODE_ENV === "development";

import type { RoutingRule, ProviderCard } from "@/types/ai-operating";
import type { ContentPlatform } from "@/types/content";
import type {
  StudioContentType,
  MarketingGoal,
  FunnelStage,
} from "@/store/ai-studio-store";
import type { BrandPreset } from "@/types/ai-operating";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AIGeneratorTask {
  contentType: StudioContentType;
  taskType?: string;
  platforms: ContentPlatform[];
  marketingGoal: MarketingGoal;
  funnelStage: FunnelStage;
  productCount: number;
  hasStock: boolean;
}

export interface ResolvedRouting {
  provider_id: number | null;
  provider_name: string;
  provider_slug: string;
  base_url: string | null;
  model: string;
  effective_model_source: "routing_override" | "provider_default" | "system_default";
  temperature: number;
  max_tokens: number;
  top_p: number;
  streaming_enabled: boolean;
  fallback_provider_id: number | null;
  fallback_provider_name: string | null;
  fallback_model: string | null;
  fallback_model_source: "routing_override" | "provider_default" | "system_default" | "none";
  system_prompt_id: number | null;
  brand_preset: BrandPreset | null;
  reasoning: string;
  source: "routing_rule" | "provider_default" | "system_default";
  task_route_id: number | null;
}

// ── Strategy (exported for backward compat with prompt-engine and brand-engine) ────────

export interface AIRoutingStrategy {
  name: string;
  description: string;
  promptStyle: "creative" | "balanced" | "conservative";
  variantCount: number;
  extractHooks: boolean;
  generateSEO: boolean;
  generateHashtags: boolean;
  contentLength: "short" | "medium" | "long";
  suggestedCTAStyle: "urgent" | "friendly" | "professional" | "soft";
}

export { buildStrategy };

function buildStrategy(task: AIGeneratorTask): AIRoutingStrategy {
  const { platforms, contentType, marketingGoal, funnelStage } = task;
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
  if (isViral) name = "Viral Engine";
  if (isSEO) name = "SEO Article";
  if (isVideo) name = "Video Script";
  if (isImage) name = "Image Prompt";
  if (isConversion && funnelStage === "conversion") name = "Conversion Engine";
  if (isAwareness) name = "Brand Awareness";

  const description = `Strategy for ${name.toLowerCase()} content`;
  const extractHooks = isViral || isTikTok;
  const generateSEO = isSEO;
  const generateHashtags = isViral || isTikTok || isAwareness;

  return {
    name,
    description,
    promptStyle,
    variantCount,
    extractHooks,
    generateSEO,
    generateHashtags,
    contentLength,
    suggestedCTAStyle,
  };
}

// ── Model resolution helpers ─────────────────────────────────────────────────

/** Resolve effective model from routing rule + provider config */
function resolveModel(
  modelOverride: string | null,
  provider: ProviderCard | null
): { model: string; source: "routing_override" | "provider_default" | "system_default" } {
  if (modelOverride && modelOverride.trim() !== "") {
    return { model: modelOverride.trim(), source: "routing_override" };
  }
  if (provider?.model_name && provider.model_name.trim() !== "") {
    return { model: provider.model_name.trim(), source: "provider_default" };
  }
  return { model: "", source: "system_default" };
}

/** Resolve effective temperature */
function resolveTemperature(
  tempOverride: number | null,
  provider: ProviderCard | null
): number {
  if (tempOverride !== null && tempOverride !== undefined) {
    return tempOverride;
  }
  return provider?.temperature ?? 0.7;
}

/** Resolve effective max tokens */
function resolveMaxTokens(
  maxOverride: number | null,
  provider: ProviderCard | null
): number {
  if (maxOverride !== null && maxOverride !== undefined) {
    return maxOverride;
  }
  return provider?.max_output_tokens ?? 2048;
}

/** Resolve effective top_p */
function resolveTopP(
  topPOverride: number | null,
  provider: ProviderCard | null
): number {
  if (topPOverride !== null && topPOverride !== undefined) {
    return topPOverride;
  }
  return provider?.top_p ?? 1;
}

// ── Default system routing (when no DB rules exist) ──────────────────────────

interface SystemDefault {
  provider_slug: string;
  default_model: string;
  temperature: number;
  max_tokens: number;
  note: string;
}

/**
 * System defaults — these are the final fallback when:
 * - No routing rule exists, OR
 * - No provider is configured
 *
 * NOTE: These are intentionally generic defaults. The actual routing should
 * always prefer what's configured in the database.
 */
const SYSTEM_DEFAULTS: SystemDefault = {
  provider_slug: "openai",
  default_model: "gpt-4o-mini",
  temperature: 0.7,
  max_tokens: 2048,
  note: "System default — configure AI providers and routing rules for production",
};

// ── Main routing resolver ────────────────────────────────────────────────────

/**
 * Resolve routing decision for a given task.
 *
 * @param task - The AI generator task context
 * @param routingRules - Routing rules from DB (use getAllRoutingRules)
 * @param providers - Active providers from DB (use getAllProviders)
 */
export function resolveRouting(
  task: AIGeneratorTask,
  routingRules: RoutingRule[],
  providers: ProviderCard[]
): ResolvedRouting {
  const strategy = buildStrategy(task);
  const dbTaskType = task.taskType || mapContentTypeToTaskType(task.contentType);

  // Build provider lookup maps (include ALL providers, not just active ones)
  const providerById = new Map<number, ProviderCard>();
  const providerBySlug = new Map<string, ProviderCard>();
  for (const p of providers) {
    // Use status (new schema) or is_active (old schema) as active flag
    const isActive = p.status === "active" || (p.is_active ?? false);
    if (isActive) {
      providerById.set(p.id, p);
      if (p.slug) providerBySlug.set(p.slug, p);
      if (p.type) providerBySlug.set(p.type, p);
  // Also map by name
  if (p.name) providerBySlug.set(p.name.toLowerCase(), p);
    }
  }

  // Find matching routing rule
  const rule = routingRules.find(
    (r) => r.task_type === dbTaskType && r.is_active !== false
  );

  let source: ResolvedRouting["source"] = "system_default";
  let task_route_id: number | null = null;
  let reasoning = "";

  if (rule) {
    source = "routing_rule";
    task_route_id = rule.id;
    reasoning = `Routing rule: ${rule.task_label || rule.task_type}`;
  } else {
    reasoning = "No routing rule found, falling back to default provider";
  }

  // ── Primary provider ────────────────────────────────────────────────────

  let primaryProvider: ProviderCard | null = null;

  if (rule?.primary_provider_id) {
    primaryProvider = providerById.get(rule.primary_provider_id) ?? null;
  }

  if (!primaryProvider && rule?.task_type) {
    // Try provider_type (old column) as fallback
    const providerType = (rule as any).provider_type as string | undefined;
    if (providerType) {
      const found = providerBySlug.get(providerType.toLowerCase());
      if (found) {
        primaryProvider = found;
        reasoning += ` | Primary provider resolved from provider_type: ${providerType}`;
      }
    }
    // Also try slug from primary_model_override (e.g. "ollama:gemma4:e4b" → "ollama")
    if (!primaryProvider && rule.primary_model_override) {
      const slugPart = rule.primary_model_override.split(":")[0] || rule.primary_model_override;
      if (slugPart) {
        const found = providerBySlug.get(slugPart.toLowerCase());
        if (found) {
          primaryProvider = found;
          reasoning += ` | Primary provider resolved from model slug: ${slugPart}`;
        }
      }
    }
    if (!primaryProvider) {
      reasoning += " | Primary provider FK not found, legacy fallback also failed";
    }
  }

  // Final fallback: first active provider (respecting is_default)
  if (!primaryProvider) {
    primaryProvider =
      (providers as ProviderCard[]).find(
        (p) => (p.status === "active" || p.is_active) && p.is_default
      ) ??
      (providers as ProviderCard[]).find(
        (p) => p.status === "active" || p.is_active
      ) ??
      null;

    if (primaryProvider) {
      reasoning += ` | Using default provider: ${primaryProvider.name || primaryProvider.slug}`;
    }
  }

  // ── Resolve effective model ─────────────────────────────────────────────

  const { model, source: effective_model_source } = resolveModel(
    rule?.primary_model_override ?? null,
    primaryProvider
  );

  if (effective_model_source === "routing_override") {
    reasoning += ` | Model: ${model} (override)`;
  } else if (effective_model_source === "provider_default") {
    reasoning += ` | Model: ${model} (provider default)`;
  } else if (primaryProvider) {
    reasoning += ` | Model: ${model} (fallback)`;
  }

  // ── Resolve generation params ───────────────────────────────────────────

  const temperature = resolveTemperature(
    rule?.temperature_override ?? null,
    primaryProvider
  );
  const max_tokens = resolveMaxTokens(
    rule?.max_tokens_override ?? null,
    primaryProvider
  );
  const top_p = resolveTopP(
    rule?.top_p_override ?? null,
    primaryProvider
  );
  const streaming_enabled = primaryProvider?.streaming_enabled ?? true;

  // ── Fallback provider ──────────────────────────────────────────────────

  let fallbackProvider: ProviderCard | null = null;
  let fallbackModel = "";
  let fallback_model_source: ResolvedRouting["fallback_model_source"] = "none";
  let fallback_provider_name: string | null = null;

  if (rule?.fallback_provider_id) {
    fallbackProvider = providerById.get(rule.fallback_provider_id) ?? null;
  }

  if (fallbackProvider) {
    fallback_provider_name = fallbackProvider.name || fallbackProvider.slug || null;
    const fb = resolveModel(
      rule?.fallback_model_override ?? null,
      fallbackProvider
    );
    fallbackModel = fb.model;
    fallback_model_source = fb.source;
  }

  // Dev logs for debugging routing resolution
  if (DEV) {
    console.log("[ROUTING_TASK_TYPE]", dbTaskType, { contentType: task.contentType });
    console.log("[ROUTING_ROW]", rule ? {
      id: rule.id,
      task_type: rule.task_type,
      primary_provider_id: rule.primary_provider_id,
      primary_model_override: rule.primary_model_override,
      provider_type: (rule as any).provider_type,
      is_active: rule.is_active,
    } : "no active routing rule found");
    console.log("[RESOLVED_PROVIDER]", {
      provider_id: primaryProvider?.id,
      name: primaryProvider?.name,
      display_name: primaryProvider?.display_name,
      slug: primaryProvider?.slug,
      type: primaryProvider?.type,
      model_name: primaryProvider?.model_name,
      base_url: primaryProvider?.base_url,
    });
  }

  return {
    provider_id: primaryProvider?.id ?? null,
    provider_name: primaryProvider?.name || "",
    provider_slug: primaryProvider?.slug || primaryProvider?.type || "",
    base_url: primaryProvider?.base_url ?? null,
    model,
    effective_model_source,
    temperature,
    max_tokens,
    top_p,
    streaming_enabled,
    fallback_provider_id: fallbackProvider?.id ?? null,
    fallback_provider_name,
    fallback_model: fallbackModel || null,
    fallback_model_source,
    system_prompt_id: rule?.system_prompt_id ?? null,
    brand_preset: rule?.brand_preset ?? null,
    reasoning,
    source,
    task_route_id,
  };
}

/**
 * Simple version for client-side: just returns the resolved model without provider details.
 * Used by AI Generator hook for quick model resolution.
 */
export function getEffectiveModel(
  routingRules: RoutingRule[],
  providers: ProviderCard[],
  taskType: StudioContentType
): {
  provider_id: number | null;
  model: string;
  effective_model_source: "routing_override" | "provider_default" | "system_default";
  reasoning: string;
} {
  const task: AIGeneratorTask = {
    contentType: taskType,
    platforms: [],
    marketingGoal: "conversion",
    funnelStage: "consideration",
    productCount: 0,
    hasStock: true,
  };

  const result = resolveRouting(task, routingRules, providers);

  return {
    provider_id: result.provider_id,
    model: result.model,
    effective_model_source: result.effective_model_source,
    reasoning: result.reasoning,
  };
}

// ── Content type mapping ─────────────────────────────────────────────────────

function mapContentTypeToTaskType(contentType: StudioContentType): string {
  // CRITICAL: DB stores actual task_type values from the ai_task_routes table.
  // This must match CONTENT_TYPE_TO_TASK in generation-resolver.ts and actual DB values.
  const map: Record<string, string> = {
    facebook_post: "facebook_content",
    seo_article: "seo_article",
    video_script: "video_script",
    image_prompt: "image_prompt",
    zalo_message: "zalo_message",
    product_description: "product_description",
    email_marketing: "email_marketing",
  };
  return map[contentType] ?? "facebook_content";
}

// ── Label helpers (for UI) ──────────────────────────────────────────────────

export function getProviderDisplayName(p: ProviderCard): string {
  return p.name || p.slug || p.type || "Unknown Provider";
}

export function getEffectiveModelLabel(
  model: string,
  source: "routing_override" | "provider_default" | "system_default" | "none"
): string {
  if (source === "routing_override") {
    return `${model} · override`;
  }
  if (source === "provider_default") {
    return `${model} · provider default`;
  }
  return model || "—";
}
