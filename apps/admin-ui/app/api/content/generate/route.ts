/**
 * Content Generation API
 * POST /api/content/generate
 *
 * Đổi mới kiến trúc:
 * - AI Generator chỉ gửi: contentType, taskType, product
 * - Backend routing engine tự chọn provider, model, temperature
 * - AI Settings là source of truth
 *
 * Body (v3 - simplified):
 * {
 *   contentType: StudioContentType,
 *   taskType: string,
 *   product: AIProduct,
 *   customInstructions?: string,
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateContentWithRouting, type AIGenContext } from "@/lib/ai/generation-service";
import { resolveRouting, type AIGeneratorTask } from "@/lib/ai/routing-engine";
import type { ResolvedRouting } from "@/lib/ai/routing-engine";
import type { ContentPlatform } from "@/types/content";
import type {
  StudioContentType,
  MarketingGoal,
  FunnelStage,
} from "@/store/ai-studio-store";
import type { AIProduct } from "@/types/content";
import { getAllRoutingRules } from "@/lib/content/db/task-routes";
import { getAllProviderCards } from "@/lib/content/db/providers";
import { getAllBrandVoices, getActiveBrandVoice } from "@/lib/content/db/brand-voices";
import { getSafetyRules } from "@/lib/content/db/safety-rules";
import { getAllSystemPrompts } from "@/lib/content/db/system-prompts";
import type { ProviderCard, RoutingRule, BrandVoice, SafetyRule, SystemPromptTemplate, BrandPreset } from "@/types/ai-operating";

// ── Body formats ────────────────────────────────────────────────────────────────

interface LegacyBody {
  productId: string;
  productName: string;
  productDescription?: string;
  productThumbnail?: string;
  productPrice?: number;
  productTags?: string[];
  productCategory?: string;
  contentType: string;
  templateId?: number;
  tone?: string;
  audience?: string;
  customPrompt?: string;
  _routing?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface V2Body {
  contentType: StudioContentType;
  platforms: ContentPlatform[];
  marketingGoal: MarketingGoal;
  funnelStage: FunnelStage;
  product: AIProduct;
  overrideRouting?: Partial<ResolvedRouting>;
  customInstructions?: string;
}

interface V3Body {
  contentType: StudioContentType;
  taskType: string;
  product: AIProduct;
  customInstructions?: string;
}

// ── Load all AI context from DB ─────────────────────────────────────────────────

async function loadAIGenContext(): Promise<AIGenContext> {
  const [taskRoutes, providers, brandVoices, safetyRules, systemPrompts, activeBrandVoice] =
    await Promise.all([
      getAllRoutingRules().catch(() => [] as RoutingRule[]),
      getAllProviderCards().catch(() => [] as ProviderCard[]),
      getAllBrandVoices().catch(() => [] as BrandVoice[]),
      getSafetyRules().catch(() => [] as SafetyRule[]),
      getAllSystemPrompts().catch(() => [] as SystemPromptTemplate[]),
      getActiveBrandVoice().catch(() => null as BrandVoice | null),
    ]);

  return {
    taskRoutes,
    providers,
    brandVoices,
    safetyRules,
    systemPrompts,
    activeBrandPreset: activeBrandVoice?.preset as BrandPreset | undefined,
  };
}

// ── Map legacy content type ─────────────────────────────────────────────────────

function mapLegacyContentType(t: string): StudioContentType {
  const map: Record<string, StudioContentType> = {
    facebook: "facebook_post",
    website: "seo_article",
    video: "video_script",
    image: "image_prompt",
    zalo: "zalo_message",
  };
  return map[t] || "facebook_post";
}

// ── Map legacy goal/funnel ──────────────────────────────────────────────────────

function mapLegacyGoal(tone?: string): MarketingGoal {
  if (tone === "sales_aggressive") return "conversion";
  if (tone === "gen_z") return "viral";
  if (tone === "technical") return "seo";
  return "conversion";
}

// ── Route handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json() as LegacyBody | V2Body;

    // ── Detect format: v3 vs v2 vs legacy ───────────────────────────────────────
    const isV3 = "taskType" in body;
    const isV2 = "platforms" in body && "marketingGoal" in body;

    let task: AIGeneratorTask;
    let product: AIProduct;
    let overrideRouting: Partial<ResolvedRouting> | undefined;
    let customInstructions: string | undefined;

    if (isV3) {
      // ── V3 format (simplified — routing from AI Task Routing) ─────────────
      const v3 = body as V3Body;
      task = {
        contentType: v3.contentType,
        taskType: v3.taskType || v3.contentType,
        platforms: [],
        marketingGoal: "conversion",
        funnelStage: "consideration",
        productCount: 1,
        hasStock: v3.product.stockStatus === "in_stock",
      };
      product = v3.product;
      customInstructions = v3.customInstructions;
    } else if (isV2) {
      // ── V2 format ──────────────────────────────────────────────────────────
      const v2 = body as V2Body;
      task = {
        contentType: v2.contentType,
        platforms: v2.platforms,
        marketingGoal: v2.marketingGoal,
        funnelStage: v2.funnelStage,
        productCount: 1,
        hasStock: v2.product.stockStatus === "in_stock",
      };
      product = v2.product;
      overrideRouting = v2.overrideRouting;
      customInstructions = v2.customInstructions;
    } else {
      // ── Legacy format (backward compat) ────────────────────────────────────
      const legacy = body as LegacyBody;

      if (!legacy.productId || !legacy.productName || !legacy.contentType) {
        return NextResponse.json(
          { error: "productId, productName, contentType là bắt buộc" },
          { status: 400 }
        );
      }

      const validLegacyTypes = ["facebook", "website", "video", "image", "zalo"];
      if (!validLegacyTypes.includes(legacy.contentType)) {
        return NextResponse.json(
          { error: "contentType không hợp lệ" },
          { status: 400 }
        );
      }

      product = {
        id: legacy.productId,
        name: legacy.productName,
        sku: "",
        price: legacy.productPrice || 0,
        category: legacy.productCategory || "",
        tags: legacy.productTags || [],
        image: legacy.productThumbnail || "",
        description: legacy.productDescription || "",
        brand: "",
        stock: 0,
        stockStatus: "unknown",
        status: "draft",
      };

      task = {
        contentType: mapLegacyContentType(legacy.contentType),
        platforms: [legacy.contentType as ContentPlatform],
        marketingGoal: mapLegacyGoal(legacy.tone),
        funnelStage: "consideration",
        productCount: 1,
        hasStock: false,
      };

      // Map legacy routing override
      if (legacy._routing) {
        overrideRouting = {
          provider_slug: legacy._routing.provider as string,
          model: legacy._routing.model ?? "",
          temperature: legacy._routing.temperature ?? 0.7,
          max_tokens: legacy._routing.maxTokens ?? 2048,
        };
      }

      customInstructions = legacy.customPrompt;
    }

    // ── Validate ─────────────────────────────────────────────────────────────
    if (!task.contentType || !product.id) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: contentType, product" },
        { status: 400 }
      );
    }

    // ── Load AI context ──────────────────────────────────────────────────────
    const dbCtx = await loadAIGenContext();

    // ── Get routing preview (for response metadata) ────────────────────────────
    const routing = resolveRouting(task, dbCtx.taskRoutes, dbCtx.providers);

    // ── Generate ──────────────────────────────────────────────────────────────
    const result = await generateContentWithRouting(
      {
        task,
        product,
        overrideRouting,
        customInstructions,
      },
      dbCtx
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Lỗi khi tạo nội dung",
          latency_ms: result.latency_ms,
          routing,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      data: {
        content: result.content,
        contentItemId: result.contentItemId,
        model: result.model,
        tokens_used: result.tokens_used,
        latency_ms: result.latency_ms,
        routing,
      },
    });
  } catch (err) {
    console.error("[Generate POST]", err);
    return NextResponse.json(
      { error: "Lỗi khi tạo nội dung" },
      { status: 500 }
    );
  }
}
