/**
 * Content Templates CRUD
 */

import { query } from "@/lib/db";
import type {
  ContentTemplate,
  ContentTemplateInput,
  ContentType,
  PaginatedResult,
} from "../types";

export async function getTemplates(options?: {
  content_type?: ContentType;
  is_active?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<ContentTemplate>> {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.content_type) {
    conditions.push(`content_type = $${idx++}`);
    params.push(options.content_type);
  }
  if (options?.is_active !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(options.is_active);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM content_templates ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  const { rows } = await query<ContentTemplate>(
    `SELECT * FROM content_templates ${where}
     ORDER BY usage_count DESC, created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    data: rows.map((r) => ({
      ...r,
      variables: typeof r.variables === "string" ? JSON.parse(r.variables) : r.variables,
      tone_options: typeof r.tone_options === "string" ? JSON.parse(r.tone_options) : r.tone_options,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getTemplateById(
  id: number
): Promise<ContentTemplate | null> {
  const { rows } = await query<ContentTemplate>(
    "SELECT * FROM content_templates WHERE id = $1",
    [id]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    variables:
      typeof rows[0].variables === "string"
        ? JSON.parse(rows[0].variables)
        : rows[0].variables,
    tone_options:
      typeof rows[0].tone_options === "string"
        ? JSON.parse(rows[0].tone_options)
        : rows[0].tone_options,
  };
}

export async function createTemplate(
  data: ContentTemplateInput
): Promise<ContentTemplate> {
  const { rows } = await query<ContentTemplate>(
    `INSERT INTO content_templates
       (template_name, content_type, system_prompt, user_template, variables, tone_options, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.template_name,
      data.content_type,
      data.system_prompt || null,
      data.user_template,
      JSON.stringify(data.variables || []),
      JSON.stringify(data.tone_options || []),
      data.is_active ?? true,
    ]
  );
  return {
    ...rows[0],
    variables:
      typeof rows[0].variables === "string"
        ? JSON.parse(rows[0].variables)
        : rows[0].variables,
    tone_options:
      typeof rows[0].tone_options === "string"
        ? JSON.parse(rows[0].tone_options)
        : rows[0].tone_options,
  };
}

export async function updateTemplate(
  id: number,
  data: Partial<ContentTemplateInput>
): Promise<ContentTemplate | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.template_name !== undefined) {
    fields.push(`template_name = $${idx++}`);
    values.push(data.template_name);
  }
  if (data.content_type !== undefined) {
    fields.push(`content_type = $${idx++}`);
    values.push(data.content_type);
  }
  if (data.system_prompt !== undefined) {
    fields.push(`system_prompt = $${idx++}`);
    values.push(data.system_prompt);
  }
  if (data.user_template !== undefined) {
    fields.push(`user_template = $${idx++}`);
    values.push(data.user_template);
  }
  if (data.variables !== undefined) {
    fields.push(`variables = $${idx++}`);
    values.push(JSON.stringify(data.variables));
  }
  if (data.tone_options !== undefined) {
    fields.push(`tone_options = $${idx++}`);
    values.push(JSON.stringify(data.tone_options));
  }
  if (data.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(data.is_active);
  }

  if (fields.length === 0) return getTemplateById(id);

  fields.push("updated_at = NOW()");
  values.push(id);

  const { rows } = await query<ContentTemplate>(
    `UPDATE content_templates SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    variables:
      typeof rows[0].variables === "string"
        ? JSON.parse(rows[0].variables)
        : rows[0].variables,
    tone_options:
      typeof rows[0].tone_options === "string"
        ? JSON.parse(rows[0].tone_options)
        : rows[0].tone_options,
  };
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const { rowCount } = await query(
    "DELETE FROM content_templates WHERE id = $1",
    [id]
  );
  return (rowCount ?? 0) > 0;
}

export async function incrementTemplateUsage(
  id: number
): Promise<void> {
  await query(
    "UPDATE content_templates SET usage_count = usage_count + 1 WHERE id = $1",
    [id]
  );
}
