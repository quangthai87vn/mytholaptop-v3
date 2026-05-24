/**
 * AI Usage Logs — query generation history for analytics
 */

import { query } from "@/lib/db";
import type { UsageStats, ProviderType } from "@/types/ai-operating";

const COST_PER_1K_TOKENS: Record<ProviderType, number> = {
  openai: 150,           // VND per 1K tokens (gpt-4o-mini ≈ $0.15/1M input)
  gemini: 80,            // VND per 1K tokens
  deepseek: 50,          // VND per 1K tokens (DeepSeek V3 pricing)
  huggingface: 20,       // VND per 1K tokens (Inference API pricing)
  ollama: 0,             // Free — chạy local
  lmstudio: 0,            // Free — chạy local
  "openai-compatible": 0,  // Free — chạy local via vLLM/TGI
  openrouter: 100,        // VND per 1K tokens (OpenRouter pricing varies)
  groq: 60,               // VND per 1K tokens (Groq pricing)
};

function toVND(tokens: number, provider: ProviderType): number {
  return Math.round((tokens / 1000) * COST_PER_1K_TOKENS[provider]);
}

export async function getUsageStats(): Promise<UsageStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [today, week, month, activeProviderRow, topModels] = await Promise.all([
    query<{ cnt: string; tokens: string }>(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(tokens_used), 0) as tokens
       FROM content_generation_logs WHERE created_at >= $1`,
      [todayStart]
    ),
    query<{ cnt: string; tokens: string }>(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(tokens_used), 0) as tokens
       FROM content_generation_logs WHERE created_at >= $1`,
      [weekStart.toISOString()]
    ),
    query<{ cnt: string; tokens: string }>(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(tokens_used), 0) as tokens
       FROM content_generation_logs WHERE created_at >= $1`,
      [monthStart]
    ),
    query<{ provider: string }>(
      `SELECT gl.provider
       FROM content_generation_logs gl
       JOIN ai_providers ap ON ap.provider = gl.provider
       WHERE ap.is_active = true
       LIMIT 1`
    ),
    query<{ provider: string; model_name: string; cnt: string; tokens: string }>(
      `SELECT provider, model_name, COUNT(*) as cnt,
              COALESCE(SUM(tokens_used), 0) as tokens
       FROM content_generation_logs
       WHERE created_at >= $1
       GROUP BY provider, model_name
       ORDER BY cnt DESC
       LIMIT 5`,
      [weekStart.toISOString()]
    ),
  ]);

  const localProviders = ["ollama", "lmstudio"];
  const localReq = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM content_generation_logs
     WHERE created_at >= $1 AND provider = ANY($2)`,
    [weekStart.toISOString(), localProviders]
  );
  const cloudReq = await query<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM content_generation_logs
     WHERE created_at >= $1 AND provider = 'openai'`,
    [weekStart.toISOString()]
  );

  const todayTokens = parseInt(today.rows[0]?.tokens || "0");
  const monthTokens = parseInt(month.rows[0]?.tokens || "0");
  const monthRows = month.rows[0];

  const costByProvider: UsageStats["cost_by_provider"] = [];
  for (const row of topModels.rows) {
    const prov = row.provider as ProviderType;
    costByProvider.push({
      provider: prov,
      estimated_vnd: toVND(parseInt(row.tokens), prov),
      requests: parseInt(row.cnt),
    });
  }

  return {
    requests_today: parseInt(today.rows[0]?.cnt || "0"),
    requests_this_week: parseInt(week.rows[0]?.cnt || "0"),
    requests_this_month: parseInt(month.rows[0]?.cnt || "0"),
    tokens_today: todayTokens,
    tokens_this_week: parseInt(week.rows[0]?.tokens || "0"),
    tokens_this_month: monthTokens,
    estimated_cost_today: toVND(todayTokens, (activeProviderRow.rows[0]?.provider as ProviderType) ?? "openai"),
    estimated_cost_this_month: costByProvider.reduce((sum, p) => sum + p.estimated_vnd, 0),
    active_provider: (activeProviderRow.rows[0]?.provider as ProviderType) ?? null,
    local_vs_cloud: {
      local: parseInt(localReq.rows[0]?.cnt || "0"),
      cloud: parseInt(cloudReq.rows[0]?.cnt || "0"),
    },
    top_models: topModels.rows.map((r) => ({
      model: r.model_name || "unknown",
      requests: parseInt(r.cnt),
      tokens: parseInt(r.tokens),
    })),
    cost_by_provider: costByProvider,
    generated_at: new Date().toISOString(),
  };
}
