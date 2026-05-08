/**
 * Content Generation Logs CRUD
 */

import { query } from "@/lib/db";
import type {
  ContentGenerationLog,
  AIProviderType,
  PaginatedResult,
} from "../types";

export interface GenerationLogInput {
  content_item_id?: number;
  provider: AIProviderType;
  model_name?: string;
  request_payload?: string;
  response_text?: string;
  tokens_used?: number;
  latency_ms?: number;
  error_message?: string;
}

export async function createGenerationLog(
  data: GenerationLogInput
): Promise<ContentGenerationLog> {
  const { rows } = await query<ContentGenerationLog>(
    `INSERT INTO content_generation_logs
       (content_item_id, provider, model_name, request_payload,
        response_text, tokens_used, latency_ms, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.content_item_id || null,
      data.provider,
      data.model_name || null,
      data.request_payload || null,
      data.response_text || null,
      data.tokens_used || null,
      data.latency_ms || null,
      data.error_message || null,
    ]
  );
  return rows[0];
}

export async function getGenerationLogs(options?: {
  content_item_id?: number;
  provider?: AIProviderType;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<ContentGenerationLog>> {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.content_item_id) {
    conditions.push(`content_item_id = $${idx++}`);
    params.push(options.content_item_id);
  }
  if (options?.provider) {
    conditions.push(`provider = $${idx++}`);
    params.push(options.provider);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_generation_logs ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  const { rows } = await query<ContentGenerationLog>(
    `SELECT * FROM content_generation_logs ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { data: rows, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getTotalTokenUsage(): Promise<{
  total_tokens: number;
  total_calls: number;
  avg_latency_ms: number;
}> {
  const { rows } = await query<{
    total_tokens: string;
    total_calls: string;
    avg_latency: string;
  }>(
    `SELECT
       COALESCE(SUM(tokens_used), 0) as total_tokens,
       COUNT(*) as total_calls,
       COALESCE(AVG(latency_ms), 0) as avg_latency
     FROM content_generation_logs
     WHERE error_message IS NULL`
  );
  return {
    total_tokens: parseInt(rows[0]?.total_tokens || "0", 10),
    total_calls: parseInt(rows[0]?.total_calls || "0", 10),
    avg_latency_ms: Math.round(parseFloat(rows[0]?.avg_latency || "0")),
  };
}
