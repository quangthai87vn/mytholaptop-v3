/**
 * AI Marketing Routing Engine — Index
 *
 * Re-exports from routing-legacy.ts and the new routing-engine.ts.
 * Use `@/lib/ai/routing-engine` for the new resolver.
 */

export {
  routeToModel,
  getModelLabel,
  getProviderLabel,
  type RoutingContext,
  type RoutingDecision,
  type AIGeneratedStrategy,
} from "./routing-legacy";

export {
  resolveRouting,
  getEffectiveModel,
  getProviderDisplayName,
  getEffectiveModelLabel,
  type AIGeneratorTask,
  type ResolvedRouting,
  type AIRoutingStrategy,
} from "./ai/routing-engine";

export type { RoutingRule } from "@/types/ai-operating";
