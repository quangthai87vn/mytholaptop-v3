/**
 * AI Streaming Generation API
 * POST /api/ai/generate/stream
 *
 * Server-Sent Events endpoint cho real-time streaming generation.
 * Load đầy đủ: routing rules + brand voices + system prompts + safety rules
 * từ DB trước khi generate.
 */

import { NextRequest } from "next/server";
import { resolveRouting, type AIGeneratorTask } from "@/lib/ai/routing-engine";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requirePermission } from "@/lib/auth/require-permission";
import { createProviderFromRouting } from "@/lib/ai/provider-service";
import { buildChatMessages } from "@/lib/ai/prompt-engine";
import { buildStrategy } from "@/lib/ai/generation-service";
import {
  resolveBrandVoice,
  resolveSafetyRules,
  resolveSystemPrompt,
} from "@/lib/ai/generation-resolvers";
import { getAllRoutingRules } from "@/lib/content/db/task-routes";
import { getAllProviderCardsLegacy, getDecryptedApiKeyLegacy } from "@/lib/content/db/provider-service";
import { getAllBrandVoices } from "@/lib/content/db/brand-voices";
import { getSafetyRules } from "@/lib/content/db/safety-rules";
import { getAllSystemPrompts } from "@/lib/content/db/system-prompts";
import { createContentItem } from "@/lib/content/db/content";
import { createGenerationLog } from "@/lib/content/db/logs";
import type {
  ProviderCard,
  RoutingRule,
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
} from "@/types/ai-operating";
import type { AIProduct } from "@/types/content";
import type {
  StudioContentType,
} from "@/store/ai-studio-store";

// ── SSE Helpers ────────────────────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseToken(content: string): string {
  return `event: token\ndata: ${JSON.stringify({ type: "token", content })}\n\n`;
}

function sseDone(): string {
  return `event: generation_done\ndata: ${JSON.stringify({ type: "generation_done" })}\n\n`;
}

function sseError(message: string): string {
  return `event: error\ndata: ${JSON.stringify({ type: "error", message })}\n\n`;
}

// ── Content type mapping ──────────────────────────────────────────────────────

function mapContentType(
  ct: string
): "facebook" | "website" | "video" | "image" {
  const map: Record<string, "facebook" | "website" | "video" | "image"> = {
    facebook_post: "facebook",
    seo_article: "website",
    video_script: "video",
    image_prompt: "image",
    zalo_message: "facebook",
    product_description: "website",
    email_marketing: "website",
  };
  return map[ct] || "facebook";
}

// ── Title builder ────────────────────────────────────────────────────────────

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

// ── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const permError = requirePermission(req, "ai_generate");
  if (permError) return permError;

  const startTime = Date.now();

  let body: {
    contentType: StudioContentType;
    taskType: string;
    product: AIProduct;
    customInstructions?: string;
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
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    contentType: ct,
    taskType,
    product,
    customInstructions,
    advancedOverrides,
  } = body;

  const hasOverrides = advancedOverrides && Object.keys(advancedOverrides).length > 0;

  if (hasOverrides) {
    console.log("[AI_GENERATE] User overrides detected:", JSON.stringify(advancedOverrides, null, 2));
  }

  if (!ct || !product?.id) {
    return new Response(
      JSON.stringify({ error: "Thiếu thông tin bắt buộc" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Load AI context từ DB — đầy đủ routing rules + brand voices + safety + prompts
  const [taskRoutes, providers, brandVoices, safetyRules, systemPrompts] =
    await Promise.all([
      getAllRoutingRules().catch(() => [] as RoutingRule[]),
      getAllProviderCardsLegacy().catch(() => [] as ProviderCard[]),
      getAllBrandVoices().catch(() => [] as BrandVoice[]),
      getSafetyRules().catch(() => [] as SafetyRule[]),
      getAllSystemPrompts().catch(() => [] as SystemPromptTemplate[]),
    ]);

  const task: AIGeneratorTask = {
    contentType: ct,
    taskType: taskType || ct,
    platforms: [],
    marketingGoal: "conversion",
    funnelStage: "consideration",
    productCount: 1,
    hasStock: product.stockStatus === "in_stock",
  };

  // Resolve routing từ DB
  const routing = resolveRouting(task, taskRoutes, providers);

  // ── MERGE: User overrides from Step 2 "Custom AI Config" take PRIORITY ─────────
  // Priority: User Overrides > Routing Preset > System Defaults
  if (hasOverrides && advancedOverrides) {
    // Build a resolved brand_preset — use override if provided, else keep routing value
    const resolvedBrandPreset = advancedOverrides.brand_preset !== undefined
      ? advancedOverrides.brand_preset
      : routing.brand_preset;

    const resolvedSystemPromptId = advancedOverrides.system_prompt_id !== undefined
      ? advancedOverrides.system_prompt_id
      : routing.system_prompt_id;

    // Merge overrides into routing object
    Object.assign(routing, {
      provider_id: advancedOverrides.provider_id !== undefined
        ? advancedOverrides.provider_id
        : routing.provider_id,
      model: advancedOverrides.model_override !== undefined
        ? advancedOverrides.model_override
        : routing.model,
      temperature: advancedOverrides.temperature_override !== undefined
        ? advancedOverrides.temperature_override
        : routing.temperature,
      max_tokens: advancedOverrides.max_tokens_override !== undefined
        ? advancedOverrides.max_tokens_override
        : routing.max_tokens,
      brand_preset: resolvedBrandPreset,
      system_prompt_id: resolvedSystemPromptId,
    });

    // Log the final merged config for debugging
    console.log("[AI_GENERATE] Final merged config:", {
      provider_id: routing.provider_id,
      model: routing.model,
      temperature: routing.temperature,
      max_tokens: routing.max_tokens,
      brand_preset: routing.brand_preset,
      system_prompt_id: routing.system_prompt_id,
      content_length: advancedOverrides.content_length,
      cta_style: advancedOverrides.cta_style_override,
      emoji_level: advancedOverrides.emoji_level_override,
      hashtag_mode: advancedOverrides.hashtag_mode_override,
    });
  }

  // Resolve brand voice từ routing.brand_preset (already merged if overridden)
  const brandVoice = resolveBrandVoice(
    routing.brand_preset ?? null,
    brandVoices,
    undefined
  );

  // Resolve safety rules (lấy all active nếu không chỉ định)
  const activeSafetyRules = resolveSafetyRules(null, safetyRules);

  // Resolve system prompt từ routing.system_prompt_id (already merged if overridden)
  const systemPrompt = resolveSystemPrompt(
    routing.system_prompt_id ?? null,
    systemPrompts
  );

  // Build strategy + messages với đầy đủ context
  let strategy = buildStrategy(task);

  // Override strategy fields if user set them in Step 2
  if (hasOverrides && advancedOverrides) {
    if (advancedOverrides.content_length) {
      strategy = { ...strategy, contentLength: advancedOverrides.content_length as "short" | "medium" | "long" };
    }
    if (advancedOverrides.cta_style_override) {
      strategy = { ...strategy, suggestedCTAStyle: advancedOverrides.cta_style_override as "urgent" | "friendly" | "professional" | "soft" };
    }
    // Override creativity (temperature) indirectly via prompt style
    if (advancedOverrides.temperature_override !== undefined) {
      const temp = advancedOverrides.temperature_override!;
      if (temp >= 1.0) {
        strategy = { ...strategy, promptStyle: "creative" };
      } else if (temp <= 0.4) {
        strategy = { ...strategy, promptStyle: "conservative" };
      }
      // else keep default balanced
    }
    if (advancedOverrides.emoji_level_override === "minimal") {
      // minimal emoji: already handled by prompt style conservative
    } else if (advancedOverrides.emoji_level_override === "abundant") {
      // abundant emoji: handled by creative style
    }
    if (advancedOverrides.hashtag_mode_override) {
      const mode = advancedOverrides.hashtag_mode_override;
      strategy = { ...strategy, generateHashtags: mode !== "none" };
    }
  }

  const messages = buildChatMessages(ct, {
    product,
    strategy,
    brandVoice,
    safetyRules: activeSafetyRules,
    systemPrompt,
    customInstructions,
  });

  // Build prompt pipeline from messages for the frontend viewer
  const systemMessage = messages.find((m) => m.role === "system");
  const userMessage = messages.find((m) => m.role === "user");
  const pipelineData = {
    provider_name: routing.provider_name,
    provider_slug: routing.provider_slug,
    model: routing.model,
    brand_voice: brandVoice?.name || null,
    system_prompt: brandVoice?.tone_instruction || systemPrompt?.prompt_text || null,
    brand_voice_text: brandVoice
      ? [
          brandVoice.name,
          brandVoice.tone_instruction,
          brandVoice.target_audience,
          brandVoice.keywords_to_use?.length ? `Từ khóa ưu tiên: ${brandVoice.keywords_to_use.join(", ")}` : null,
          brandVoice.keywords_to_avoid?.length ? `Tránh dùng: ${brandVoice.keywords_to_avoid.join(", ")}` : null,
        ].filter(Boolean).join("\n")
      : null,
    safety_rules: activeSafetyRules.map((r) => r.rule_text),
    product_context: userMessage?.content?.split("\n\n")[0] || null,
    user_input: customInstructions || null,
    final_prompt: userMessage?.content || null,
  };

  // Find provider từ routing.provider_id (DB FK)
  let dbProvider =
    providers.find((p) => p.id === routing.provider_id) ?? null;
  if (!dbProvider && routing.provider_slug) {
    dbProvider =
      providers.find(
        (p) => p.slug?.toLowerCase() === routing.provider_slug.toLowerCase()
      ) ??
      providers.find(
        (p) =>
          p.type?.toLowerCase() === routing.provider_slug.toLowerCase()
      ) ??
      null;
  }

  const apiKey = dbProvider ? await getDecryptedApiKeyLegacy(dbProvider.id) : null;
  const provider = createProviderFromRouting(
    routing,
    dbProvider ?? undefined,
    apiKey ?? undefined
  );

  // ── Create SSE Stream ──────────────────────────────────────────────────────

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      try {
        // Emit start
        write(
          sseEvent("generation_start", {
            routing: {
              provider_name: routing.provider_name,
              provider_slug: routing.provider_slug,
              model: routing.model,
              brand_voice: brandVoice?.name || null,
              system_prompt: systemPrompt?.name || null,
            },
            prompt_pipeline: pipelineData,
            latency_ms: 0,
          })
        );

        // Stage: analyzing
        write(sseEvent("stage_start", { stage: "analyzing", label: "Đang phân tích sản phẩm..." }));
        await new Promise((r) => setTimeout(r, 200));
        write(sseEvent("stage_done", { stage: "analyzing", label: "Đang phân tích sản phẩm..." }));

        // Stage: building_prompt
        write(sseEvent("stage_start", { stage: "building_prompt", label: "Đang xây dựng prompt..." }));
        await new Promise((r) => setTimeout(r, 150));
        write(sseEvent("stage_done", { stage: "building_prompt", label: "Đang xây dựng prompt..." }));

        // Stage: writing_main
        write(sseEvent("stage_start", { stage: "writing_main", label: "Đang viết nội dung chính..." }));

        let fullContent = "";
        let tokenCount = 0;

        try {
          const streamingProvider = provider as unknown as {
            chatStream?: (req: unknown) => AsyncGenerator<{
              content: string;
              done: boolean;
            }>;
          };

          if (streamingProvider.chatStream) {
            for await (const chunk of streamingProvider.chatStream({
              model: routing.model,
              messages,
              temperature: routing.temperature,
              max_tokens: routing.max_tokens,
            })) {
              fullContent += chunk.content;
              tokenCount++;
              write(sseToken(chunk.content));
            }
          } else {
            const response = await provider.chat({
              model: routing.model,
              messages,
              temperature: routing.temperature,
              max_tokens: routing.max_tokens,
            });
            fullContent = response.content || "";

            const CHUNK_SIZE = 3;
            for (let i = 0; i < fullContent.length; i += CHUNK_SIZE) {
              write(sseToken(fullContent.slice(i, i + CHUNK_SIZE)));
              await new Promise((r) => setTimeout(r, 15 + Math.random() * 10));
            }
          }
        } catch (streamErr) {
          const errMsg =
            streamErr instanceof Error ? streamErr.message : String(streamErr);
          write(sseEvent("error", { message: `Stream error: ${errMsg}` }));

          try {
            const response = await provider.chat({
              model: routing.model,
              messages,
              temperature: routing.temperature,
              max_tokens: routing.max_tokens,
            });
            fullContent = response.content || "";
            const CHUNK_SIZE = 3;
            for (let i = 0; i < fullContent.length; i += CHUNK_SIZE) {
              write(sseToken(fullContent.slice(i, i + CHUNK_SIZE)));
              await new Promise((r) => setTimeout(r, 15 + Math.random() * 10));
            }
          } catch (fallbackErr) {
            const fbErr =
              fallbackErr instanceof Error
                ? fallbackErr.message
                : String(fallbackErr);
            write(sseError(fbErr));
            await createGenerationLog({
              provider: (routing.provider_slug || "unknown") as any,
              latency_ms: Date.now() - startTime,
              error_message: fbErr,
            });
            controller.close();
            return;
          }
        }

        write(sseEvent("stage_done", { stage: "writing_main", label: "Đang viết nội dung chính..." }));

        // Save content
        try {
          const contentItem = await createContentItem({
            content_type: mapContentType(ct),
            title: buildTitle(product.name, ct),
            content_body: fullContent,
            product_id: product.id,
            product_name: product.name,
            status: "draft",
            metadata: {
              routing_provider: routing.provider_name,
              routing_model: routing.model,
              routing_strategy: strategy.name,
              brand_voice: brandVoice?.name || "",
              system_prompt: systemPrompt?.name || "",
            },
            generated_by: routing.model,
          });

          await createGenerationLog({
            content_item_id: contentItem.id,
            provider: (routing.provider_slug || "unknown") as any,
            model_name: routing.model,
            request_payload: JSON.stringify({
              messages,
              routing: routing,
              brandVoice,
              systemPrompt,
            }),
            response_text: fullContent,
            tokens_used: tokenCount,
            latency_ms: Date.now() - startTime,
          });

          write(sseDone());
        } catch (dbErr) {
          const dbErrMsg =
            dbErr instanceof Error ? dbErr.message : String(dbErr);
          write(sseError(`Lỗi lưu content: ${dbErrMsg}`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        write(sseError(msg));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
