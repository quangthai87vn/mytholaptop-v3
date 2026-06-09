/**
 * Content Items CRUD
 */

import { query } from "@/lib/db";
import type {
  ContentItem,
  ContentItemInput,
  ContentType,
  ContentStatus,
  PaginatedResult,
} from "../types";

export async function getContentItems(options?: {
  content_type?: ContentType;
  status?: ContentStatus;
  search?: string;
  product_id?: string;
  page?: number;
  limit?: number;
  created_by?: string;
  task_id?: string; // V3: filter by linked task
}): Promise<PaginatedResult<ContentItem>> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.content_type) {
    conditions.push(`content_type = $${idx++}`);
    params.push(options.content_type);
  }
  if (options?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(options.status);
  }
  if (options?.search) {
    conditions.push(
      `(title ILIKE $${idx} OR content_body ILIKE $${idx} OR product_name ILIKE $${idx})`
    );
    params.push(`%${options.search}%`);
    idx++;
  }
  if (options?.product_id) {
    conditions.push(`product_id = $${idx++}`);
    params.push(options.product_id);
  }
  if (options?.created_by) {
    conditions.push(`created_by = $${idx++}`);
    params.push(options.created_by);
  }
  if (options?.task_id) {
    conditions.push(`task_id = $${idx++}`);
    params.push(options.task_id);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_items ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  const { rows } = await query<ContentItem>(
    `SELECT * FROM content_items ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    data: rows.map((r) => ({
      ...r,
      metadata:
        typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getContentItemById(
  id: number
): Promise<ContentItem | null> {
  const { rows } = await query<ContentItem>(
    "SELECT * FROM content_items WHERE id = $1",
    [id]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    metadata:
      typeof rows[0].metadata === "string"
        ? JSON.parse(rows[0].metadata)
        : rows[0].metadata,
  };
}

export async function createContentItem(
  data: ContentItemInput & { task_id?: string | null }
): Promise<ContentItem> {
  const { rows } = await query<ContentItem>(
    `INSERT INTO content_items
       (content_type, title, content_body, product_id, product_name,
        status, metadata, generated_by, template_id, created_by, published_at, task_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.content_type,
      data.title || null,
      data.content_body || null,
      data.product_id || null,
      data.product_name || null,
      data.status || "draft",
      JSON.stringify(data.metadata || {}),
      data.generated_by || null,
      data.template_id || null,
      data.created_by || null,
      data.published_at || null,
      data.task_id || null,
    ]
  );
  return {
    ...rows[0],
    metadata:
      typeof rows[0].metadata === "string"
        ? JSON.parse(rows[0].metadata)
        : rows[0].metadata,
  };
}

export async function updateContentItem(
  id: number,
  data: Partial<ContentItemInput>
): Promise<ContentItem | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(data.title);
  }
  if (data.content_body !== undefined) {
    fields.push(`content_body = $${idx++}`);
    values.push(data.content_body);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
    if (data.status === "published") {
      fields.push(`published_at = COALESCE(published_at, NOW())`);
    }
  }
  if (data.metadata !== undefined) {
    fields.push(`metadata = $${idx++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (fields.length === 0) return getContentItemById(id);

  fields.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query<ContentItem>(
    `UPDATE content_items SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    metadata:
      typeof rows[0].metadata === "string"
        ? JSON.parse(rows[0].metadata)
        : rows[0].metadata,
  };
}

export async function deleteContentItem(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM content_items WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function getRecentContentItems(
  limit = 10
): Promise<ContentItem[]> {
  const { rows } = await query<ContentItem>(
    `SELECT * FROM content_items ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    ...r,
    metadata:
      typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
  }));
}
