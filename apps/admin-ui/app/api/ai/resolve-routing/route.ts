/**
 * AI Routing Resolver API
 * POST /api/ai/resolve-routing
 *
 * Fully resolves which provider/model/settings to use for a given task context.
 *
 * Resolution logic:
 * 1. Find active routing rule matching task_type
 * 2. Load primary provider by primary_provider_id FK
 * 3. Resolve effective model:
 *    - if routing.primary_model_override → use it
 *    - else use provider.model_name (default)
 * 4. Resolve temperature/max_tokens:
 *    - if routing.*_override → use it
 *    - else use provider runtime config
 * 5. Resolve fallback the same way
 * 6. Return fully resolved runtime config
 *
 * Response includes effective_model_source to tell UI whether the model
 * came from a routing override or provider default.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveRouting, type AIGeneratorTask } from "@/lib/ai/routing-engine";
import type { ContentPlatform } from "@/types/content";
import type {
  StudioContentType,
  MarketingGoal,
  FunnelStage,
} from "@/store/ai-studio-store";
import { getAllRoutingRules } from "@/lib/content/db/task-routes";
import { getAllProviders } from "@/lib/content/db/provider-service";

interface ResolveBody {
  task_type: StudioContentType;
  platforms?: ContentPlatform[];
  goal?: MarketingGoal;
  funnel_stage?: FunnelStage;
  product_count?: number;
  has_stock?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: ResolveBody = await req.json();

    if (!body.task_type) {
      return NextResponse.json(
        { error: "task_type là bắt buộc" },
        { status: 400 }
      );
    }

    const task: AIGeneratorTask = {
      contentType: body.task_type,
      platforms: body.platforms ?? [],
      marketingGoal: body.goal ?? "conversion",
      funnelStage: body.funnel_stage ?? "consideration",
      productCount: body.product_count ?? 1,
      hasStock: body.has_stock ?? true,
    };

    // Load routing rules and providers in parallel
    const [routingRules, providers] = await Promise.all([
      getAllRoutingRules(),
      getAllProviders({ status: "active" }),
    ]);

    const result = resolveRouting(
      task,
      routingRules,
      providers as unknown as import("@/types/ai-operating").ProviderCard[]
    );

    // Return full resolved routing for AI Generator to use
    return NextResponse.json({
      data: result,
    });
  } catch (err) {
    console.error("[AI Resolve Routing POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi khi resolve routing" },
      { status: 500 }
    );
  }
}
