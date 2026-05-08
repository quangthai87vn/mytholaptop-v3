/**
 * Content Schedules CRUD
 */

import { query } from "@/lib/db";
import type {
  ContentSchedule,
  ContentScheduleInput,
  ScheduleStatus,
  PaginatedResult,
} from "../types";

export async function getSchedules(options?: {
  channel?: string;
  status?: ScheduleStatus;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<ContentSchedule>> {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.channel) {
    conditions.push(`s.channel = $${idx++}`);
    params.push(options.channel);
  }
  if (options?.status) {
    conditions.push(`s.status = $${idx++}`);
    params.push(options.status);
  }
  if (options?.from_date) {
    conditions.push(`s.publish_at >= $${idx++}`);
    params.push(options.from_date);
  }
  if (options?.to_date) {
    conditions.push(`s.publish_at <= $${idx++}`);
    params.push(options.to_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_schedules s ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  const { rows } = await query<ContentSchedule & { metadata: string }>(
    `SELECT s.*, c.title as content_title, c.content_type
     FROM content_schedules s
     LEFT JOIN content_items c ON s.content_item_id = c.id
     ${where}
     ORDER BY s.publish_at ASC
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

export async function getScheduleById(id: number): Promise<ContentSchedule | null> {
  const { rows } = await query<ContentSchedule & { metadata: string }>(
    "SELECT * FROM content_schedules WHERE id = $1",
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

export async function createSchedule(
  data: ContentScheduleInput
): Promise<ContentSchedule> {
  const { rows } = await query<ContentSchedule>(
    `INSERT INTO content_schedules
       (content_item_id, channel, publish_at, timezone, status, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.content_item_id,
      data.channel,
      data.publish_at,
      data.timezone || "Asia/Ho_Chi_Minh",
      data.status || "pending",
      JSON.stringify(data.metadata || {}),
      data.created_by || null,
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

export async function updateSchedule(
  id: number,
  data: Partial<ContentScheduleInput & { status: ScheduleStatus }>
): Promise<ContentSchedule | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.channel !== undefined) {
    fields.push(`channel = $${idx++}`);
    values.push(data.channel);
  }
  if (data.publish_at !== undefined) {
    fields.push(`publish_at = $${idx++}`);
    values.push(data.publish_at);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(data.status);
  }
  if (data.metadata !== undefined) {
    fields.push(`metadata = $${idx++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (fields.length === 0) return getScheduleById(id);

  fields.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query<ContentSchedule>(
    `UPDATE content_schedules SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
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

export async function deleteSchedule(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM content_schedules WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function getUpcomingSchedules(
  limit = 10
): Promise<(ContentSchedule & { content_title?: string | null })[]> {
  const { rows } = await query<ContentSchedule & { metadata: string; content_title: string | null }>(
    `SELECT s.*, c.title as content_title
     FROM content_schedules s
     LEFT JOIN content_items c ON s.content_item_id = c.id
     WHERE s.status = 'pending' AND s.publish_at > NOW()
     ORDER BY s.publish_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    ...r,
    metadata:
      typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
  }));
}
