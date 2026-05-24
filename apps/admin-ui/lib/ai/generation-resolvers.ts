/**
 * Shared AI Generation Resolvers
 * Dùng chung cho cả streaming và non-streaming generation routes.
 */

import type {
  BrandVoice,
  SafetyRule,
  SystemPromptTemplate,
  BrandPreset,
  RoutingRule,
} from "@/types/ai-operating";

// ── Brand Voice Resolver ─────────────────────────────────────────────────────

export function resolveBrandVoice(
  brandPreset: BrandPreset | undefined | null,
  voices: BrandVoice[],
  defaultPreset?: BrandPreset
): BrandVoice | null {
  const targetPreset = brandPreset ?? defaultPreset;
  if (!targetPreset) return null;
  return (
    voices.find((v) => v.preset === targetPreset) ||
    voices.find((v) => v.is_active) ||
    null
  );
}

// ── Safety Rules Resolver ───────────────────────────────────────────────────

export function resolveSafetyRules(
  ruleIds: number[] | undefined | null,
  rules: SafetyRule[]
): SafetyRule[] {
  if (ruleIds && ruleIds.length > 0) {
    return rules.filter((r) => ruleIds.includes(r.id) && r.is_active !== false);
  }
  return rules.filter((r) => r.is_active !== false);
}

// ── System Prompt Resolver ─────────────────────────────────────────────────

export function resolveSystemPrompt(
  promptId: number | undefined | null,
  prompts: SystemPromptTemplate[]
): SystemPromptTemplate | undefined {
  if (!promptId) return undefined;
  return prompts.find((p) => p.id === promptId);
}

// ── Routing Rule Resolver ───────────────────────────────────────────────────

export interface ResolvedRoutingRule {
  rule: RoutingRule | null;
  legacyRoute: { brand_preset?: string; system_prompt_id?: number } | null;
}

export function resolveRoutingRule(
  taskType: string,
  taskRoutes: RoutingRule[]
): ResolvedRoutingRule {
  const rule = taskRoutes.find((r) => r.task_type === taskType) ?? null;
  return { rule, legacyRoute: null };
}
