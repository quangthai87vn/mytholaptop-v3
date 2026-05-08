/**
 * Publish Channels & Media Prompts CRUD
 */

import { query } from "@/lib/db";
import type { PublishChannel, MediaPrompt, MediaPromptInput, PaginatedResult } from "../types";

// ── Publish Channels ──────────────────────────────────────────────────────────

export async function getChannels(): Promise<PublishChannel[]> {
  const { rows } = await query<PublishChannel>(
    "SELECT * FROM publish_channels WHERE is_active = true ORDER BY id ASC"
  );
  return rows.map((r) => ({
    ...r,
    config: typeof r.config === "string" ? JSON.parse(r.config) : r.config,
  }));
}

export async function getChannelByCode(
  code: string
): Promise<PublishChannel | null> {
  const { rows } = await query<PublishChannel>(
    "SELECT * FROM publish_channels WHERE channel_code = $1",
    [code]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    config: typeof rows[0].config === "string" ? JSON.parse(rows[0].config) : rows[0].config,
  };
}

// ── Media Prompts ──────────────────────────────────────────────────────────────

export async function getMediaPrompts(options?: {
  content_item_id?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<MediaPrompt>> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.content_item_id) {
    conditions.push(`content_item_id = $${idx++}`);
    params.push(options.content_item_id);
  }
  if (options?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(options.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM media_prompts ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  const { rows } = await query<MediaPrompt>(
    `SELECT * FROM media_prompts ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { data: rows, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function createMediaPrompt(
  data: MediaPromptInput
): Promise<MediaPrompt> {
  const { rows } = await query<MediaPrompt>(
    `INSERT INTO media_prompts
       (content_item_id, prompt, negative_prompt, style, aspect_ratio, quality, status, result_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.content_item_id || null,
      data.prompt,
      data.negative_prompt || null,
      data.style || null,
      data.aspect_ratio || "1:1",
      data.quality || "standard",
      data.status || "pending",
      data.result_url || null,
      data.created_by || null,
    ]
  );
  return rows[0];
}

export async function updateMediaPrompt(
  id: number,
  data: Partial<MediaPromptInput>
): Promise<MediaPrompt | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.prompt !== undefined) {
    fields.push(`prompt = $${idx++}`);
    values.push(data.prompt);
  }
  if (data.negative_prompt !== undefined) {
    fields.push(`negative_prompt = $${idx++}`);
    values.push(data.negative_prompt);
  }
  if (data.style !== undefined) {
    fields.push(`style = $${idx++}`);
    values.push(data.style);
  }
  if (data.aspect_ratio !== undefined) {
    fields.push(`aspect_ratio = $${idx++}`);
    values.push(data.aspect_ratio);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (data.result_url !== undefined) {
    fields.push(`result_url = $${idx++}`);
    values.push(data.result_url);
  }

  if (fields.length === 0) {
    const { rows } = await query<MediaPrompt>(
      "SELECT * FROM media_prompts WHERE id = $1",
      [id]
    );
    return rows[0] || null;
  }

  fields.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query<MediaPrompt>(
    `UPDATE media_prompts SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deleteMediaPrompt(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM media_prompts WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}
