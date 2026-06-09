/**
 * AI Generation Service
 * Điều phối toàn bộ pipeline: routing → provider → prompt → call → save
 */

const DEV = process.env.NODE_ENV === "development";

import { resolveRouting, type AIGeneratorTask, type ResolvedRouting } from "./routing-engine";
import type { RoutingRule } from "@/types/ai-operating";
import { createProviderFromRouting, findProviderBySlug } from "./provider-service";
import { buildChatMessages, parseAIResponse } from "./prompt-engine";
import type { AIProduct } from "@/types/content";
import type {
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
  ProviderCard,
  BrandPreset,
} from "@/types/ai-operating";
import { getAllProviderCardsLegacy, getDecryptedApiKeyLegacy } from "@/lib/content/db/provider-service";
import { getAllBrandVoices, getActiveBrandVoice } from "@/lib/content/db/brand-voices";
import { getSafetyRules } from "@/lib/content/db/safety-rules";
import { getAllSystemPrompts } from "@/lib/content/db/system-prompts";
import { createContentItem } from "@/lib/content/db/content";
import { createGenerationLog } from "@/lib/content/db/logs";

// ── Generation Options ───────────────────────────────────────────────────────────

export interface GenerationOptions {
  /** AI Generator task context */
  task: AIGeneratorTask;
  /** Sản phẩm để generate content */
  product: AIProduct;
  /** Override routing (nếu user chọn override) */
  overrideRouting?: Partial<ResolvedRouting>;
  /** Custom instructions từ user */
  customInstructions?: string;
  /** Staff user */
  createdBy?: string;
}

// ── Generation Result ─────────────────────────────────────────────────────────────

export interface GenerationResult {
  success: boolean;
  content?: string;
  contentItemId?: number;
  routing?: ResolvedRouting;
  model?: string;
  tokens_used?: number;
  latency_ms?: number;
  error?: string;
}

// ── DB Data cache (passed from route, pre-loaded) ────────────────────────────────

export interface AIGenContext {
  taskRoutes: RoutingRule[];
  providers: ProviderCard[];
  brandVoices: BrandVoice[];
  safetyRules: SafetyRule[];
  systemPrompts: SystemPromptTemplate[];
  activeBrandPreset?: BrandPreset;
}

// ── Main generation function ────────────────────────────────────────────────────

/**
 * AI Generation Pipeline:
 * 1. Route task → provider + model (DB routes → fallback matrix)
 * 2. Load brand voice + safety rules + system prompt
 * 3. Build prompt (system + user)
 * 4. Call AI provider
 * 5. Parse response
 * 6. Save content item + log
 */
export async function generateContentWithRouting(
  options: GenerationOptions,
  dbCtx: AIGenContext
): Promise<GenerationResult> {
  const startTime = Date.now();

  // ── 1. Resolve routing ───────────────────────────────────────────────────
  // Use the new routing engine that respects provider FK + model override semantics
  const routing = resolveRouting(
    options.task,
    dbCtx.taskRoutes,
    dbCtx.providers
  );

  // Apply override if user chose manual routing
  const finalRouting = applyRoutingOverride(routing, options.overrideRouting);

  // Dev logs: log routing resolution at service level
  if (DEV) {
    console.log("[ROUTING_TASK_TYPE]", routing.source, {
      contentType: options.task.contentType,
      marketingGoal: options.task.marketingGoal,
      funnelStage: options.task.funnelStage,
    });
    console.log("[ROUTING_ROW]", {
      task_type: routing.source,
      task_route_id: routing.task_route_id,
      reasoning: routing.reasoning,
    });
    console.log("[RESOLVED_PROVIDER]", {
      provider_id: finalRouting.provider_id,
      provider_name: finalRouting.provider_name,
      provider_slug: finalRouting.provider_slug,
      model: finalRouting.model,
      effective_model_source: finalRouting.effective_model_source,
    });
    console.log("[GENERATION_PAYLOAD]", {
      product: options.product.name,
      contentType: options.task.contentType,
      isAdvancedOverride: !!options.overrideRouting,
      overrideRouting: options.overrideRouting,
    });
  }

  try {
    // ── 2. Load brand voice ─────────────────────────────────────────────────
    const brandVoice = resolveBrandVoice(
      finalRouting.brand_preset ?? undefined,
      dbCtx.brandVoices,
      undefined
    );

    // ── 3. Load safety rules ─────────────────────────────────────────────────
    const safetyRules = resolveSafetyRules(finalRouting.system_prompt_id != null ? [finalRouting.system_prompt_id] : [], dbCtx.safetyRules);

    // ── 4. Load system prompt ────────────────────────────────────────────────
    const systemPrompt = resolveSystemPrompt(finalRouting.system_prompt_id ?? undefined, dbCtx.systemPrompts);

    // ── 5. Build messages ────────────────────────────────────────────────────
    const strategy = buildStrategy(options.task);
    const messages = buildChatMessages(options.task.contentType, {
      product: options.product,
      strategy,
      brandVoice,
      safetyRules,
      systemPrompt,
      customInstructions: options.customInstructions,
    });

    // ── 6. Create provider + call ────────────────────────────────────────────
    // CRITICAL: Match by provider.id (FK), not by type/slug.
    // finalRouting.provider_id is the DB primary key of the selected AI connection.
    let dbProvider = dbCtx.providers.find(
      (p) => p.id === finalRouting.provider_id
    ) ?? null;

    // ── Legacy routing fallback: if primary_provider_id is null but routing has a slug
    // (common for existing DB rows), look up provider by routing.provider_slug.
    // This allows existing routing rules to work even without FK migration.
    if (!dbProvider && finalRouting.provider_slug) {
      dbProvider =
        dbCtx.providers.find((p) => p.slug?.toLowerCase() === finalRouting.provider_slug.toLowerCase()) ??
        dbCtx.providers.find((p) => p.type?.toLowerCase() === finalRouting.provider_slug.toLowerCase()) ??
        null;

      if (DEV) {
        console.log("[PROVIDER_LOOKUP_BY_SLUG]", {
          routing_provider_slug: finalRouting.provider_slug,
          resolved_provider: dbProvider
            ? { id: dbProvider.id, name: dbProvider.name, display_name: dbProvider.display_name, base_url: dbProvider.base_url }
            : "NOT FOUND",
        });
      }
    }

    // ── Validate: if routing says a provider should be used but we can't find it
    // NOTE: We only fail here if routing.source === "routing_rule" (routing exists)
    // If source === "system_default" or "provider_default", it's OK to proceed without strict validation.
    if (
      finalRouting.source === "routing_rule" &&
      !dbProvider &&
      !finalRouting.base_url
    ) {
      return {
        success: false,
        error: `Không tìm thấy AI Provider "${finalRouting.provider_name || finalRouting.provider_slug}" trong hệ thống. Vui lòng kiểm tra AI Connections hoặc vào AI Routing để chọn lại provider.`,
        latency_ms: Date.now() - startTime,
      };
    }

    // Decrypt API key using provider DB id (not type slug)
    const apiKey = dbProvider ? await getDecryptedApiKeyLegacy(dbProvider.id) : null;
    const provider = createProviderFromRouting(
      finalRouting,
      dbProvider ?? undefined,
      apiKey ?? undefined
    );

    // Log resolved config for debugging
    if (DEV) {
      console.log("[AI_RESOLVED_CONFIG]", {
        provider_id: finalRouting.provider_id,
        provider_name: finalRouting.provider_name,
        provider_slug: finalRouting.provider_slug,
        model: finalRouting.model,
        effective_model_source: finalRouting.effective_model_source,
        base_url: finalRouting.base_url,
        reasoning: finalRouting.reasoning,
        source: finalRouting.source,
        task_route_id: finalRouting.task_route_id,
      });
    }

    const response = await provider.chat({
      model: finalRouting.model || finalRouting.model,
      messages,
      temperature: finalRouting.temperature,
      max_tokens: finalRouting.max_tokens,
    });

    const latencyMs = Date.now() - startTime;

    // ── 7. Save content item ─────────────────────────────────────────────────
    const parsed = parseAIResponse(response.content);

    const contentItem = await createContentItem({
      content_type: mapContentType(options.task.contentType),
      title: buildTitle(options.product.name, options.task.contentType),
      content_body: parsed.content,
      product_id: options.product.id,
      product_name: options.product.name,
      status: "draft",
      metadata: {
        routing_provider: finalRouting.provider_name,
        routing_model: finalRouting.model,
        routing_strategy: strategy.name,
        routing_reasoning: finalRouting.reasoning,
        routing_source: finalRouting.source,
        brand_voice_id: brandVoice?.id?.toString() || "",
        tokens_used: response.tokens_used?.toString() || "",
        latency_ms: latencyMs.toString(),
      },
      generated_by: finalRouting.model,
      created_by: options.createdBy,
    });

    // ── 8. Log generation ────────────────────────────────────────────────────
    await createGenerationLog({
      content_item_id: contentItem.id,
      provider: finalRouting.provider_slug as "openai" | "gemini" | "deepseek" | "huggingface" | "ollama" | "lmstudio" | "openai-compatible",
      model_name: finalRouting.model,
      request_payload: JSON.stringify({ messages, routing: finalRouting }),
      response_text: response.content,
      tokens_used: response.tokens_used,
      latency_ms: latencyMs,
    });

    return {
      success: true,
      content: parsed.content,
      contentItemId: contentItem.id,
      routing: finalRouting,
      model: finalRouting.model,
      tokens_used: response.tokens_used,
      latency_ms: latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await createGenerationLog({
      content_item_id: undefined,
      provider: (finalRouting.provider_slug || "unknown") as any,
      latency_ms: latencyMs,
      error_message: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      latency_ms: latencyMs,
    };
  }
}

// ── Override helpers ────────────────────────────────────────────────────────────

function applyRoutingOverride(
  routing: ResolvedRouting,
  override?: Partial<ResolvedRouting>
): ResolvedRouting {
  if (!override) return routing;
  // Chỉ override fields thực sự được set (không phải undefined/null)
  // để tránh mất valid routing khi frontend gửi overrideRouting rỗng
  const cleanOverride = Object.fromEntries(
    Object.entries(override).filter(([, v]) => v != null)
  );
  return { ...routing, ...cleanOverride };
}

// ── Strategy builder (moved from routing-engine) ──────────────────────────────────

export function buildStrategy(task: AIGeneratorTask) {
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

  return {
    name,
    description: "",
    promptStyle,
    variantCount,
    extractHooks: !isSEO && !isVideo,
    generateSEO: isSEO || platforms.includes("website") || platforms.includes("facebook"),
    generateHashtags: !isSEO,
    contentLength,
    suggestedCTAStyle,
  };
}

// ── Provider ID resolver ────────────────────────────────────────────────────────
// Given a provider slug/type, find the actual DB provider ID
function resolveProviderId(
  provider: string,
  providers: ProviderCard[]
): number | undefined {
  const found = providers.find(
    (p) => p.type === provider || p.slug === provider
  );
  return found?.id;
}

// ── Brand voice resolver ────────────────────────────────────────────────────────

function resolveBrandVoice(
  brandPreset: BrandPreset | undefined,
  voices: BrandVoice[],
  defaultPreset?: BrandPreset
): BrandVoice | null {
  const targetPreset = brandPreset || defaultPreset;
  if (!targetPreset) return null;
  // Try to find by preset field first, then by is_active
  return voices.find((v) => v.preset === targetPreset) || voices.find((v) => v.is_active) || null;
}

// ── Safety rules resolver ──────────────────────────────────────────────────────

function resolveSafetyRules(
  ruleIds: number[] | undefined,
  rules: SafetyRule[]
): SafetyRule[] {
  if (ruleIds && ruleIds.length > 0) {
    return rules.filter((r) => ruleIds.includes(r.id) && r.is_active !== false);
  }
  return rules.filter((r) => r.is_active !== false);
}

// ── System prompt resolver ──────────────────────────────────────────────────────

function resolveSystemPrompt(
  promptId: number | undefined,
  prompts: SystemPromptTemplate[]
): SystemPromptTemplate | undefined {
  if (!promptId) return undefined;
  return prompts.find((p) => p.id === promptId);
}

// ── Title builder ──────────────────────────────────────────────────────────────

function buildTitle(productName: string, contentType: string): string {
  const prefixes: Record<string, string> = {
    facebook_post: `${productName} - Laptop chất lượng`,
    seo_article: `Đánh giá chi tiết: ${productName}`,
    video_script: `Review nhanh: ${productName}`,
    image_prompt: `Ảnh sản phẩm: ${productName}`,
    zalo_message: `Tin nhắn Zalo: ${productName}`,
  };
  return prefixes[contentType] || productName;
}

// ── Content type mapping (StudioContentType → DB ContentType) ────────────────────
// DB stores ai_content_items.content_type as: facebook, website, video, image
// We need to map from StudioContentType values to these DB values for saving content.
function mapContentType(ct: string): "facebook" | "website" | "video" | "image" {
  const map: Record<string, "facebook" | "website" | "video" | "image"> = {
    facebook_post: "facebook",
    seo_article: "website",
    video_script: "video",
    image_prompt: "image",
    zalo_message: "facebook", // fallback
    product_description: "website",
    email_marketing: "website",
  };
  return map[ct] || "facebook";
}
