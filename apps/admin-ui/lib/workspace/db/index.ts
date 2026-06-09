// ============================================================
// Workspace Module — Database Operations
// ============================================================

import { query, transaction, getClient } from "@/lib/db";
// Re-export query so callers can use it directly from @/lib/workspace/db
export { query };
import type {
  Project,
  ProjectStatus,
  Campaign,
  Task,
  TaskComment,
  TaskActivity,
  MediaWorkflow,
  WorkflowStage,
  Intern,
  InternKPI,
  WeeklyPerformance,
  InternRanking,
  WorkspaceStats,
  CampaignTypeConfig,
  TaskChecklistItem,
  TaskChecklistProgress,
  TaskActivityEntry,
  TaskActivityAction,
  ContentWorkflowStage,
  PaginatedResult,
  TaskStatus,
  TaskPriority,
  MediaPlatform,
  ContentGoal,
} from "../types";
import type { CalendarEvent } from "../types-calendar";

// Maps a raw DB row to a Task
// Phase 1-2: workflow_stage column was removed; content detail stored as direct columns
function normalizePgArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    const t = val.trim();
    if (t.startsWith("{")) {
      const inner = t.slice(1, -1);
      if (!inner) return [];
      return inner.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? undefined,
    status: ((row.status as string) ?? "todo") as TaskStatus,
    priority: (row.priority as TaskPriority) ?? "normal",
    project_id: (row.project_id as string) ?? undefined,
    campaign_id: (row.campaign_id as string) ?? undefined,
    assignee_ids: normalizePgArray(row.assignee_ids),
    reporter_id: (row.reporter_id as string) ?? undefined,
    start_date: (row.start_date as string) ?? undefined,
    due_date: (row.due_date as string) ?? undefined,
    platform: ((row.platform as string) ?? undefined) as MediaPlatform | undefined,
    workflow_id: (row.workflow_id as string) ?? undefined,
    workflow_stage: (row.workflow_stage as string) ?? undefined,
    tags: normalizePgArray(row.tags),
    attachments: Array.isArray(row.attachments) ? row.attachments as Task["attachments"] : [],
    dependencies: normalizePgArray(row.dependencies),
    metadata: (row.metadata as Task["metadata"]) ?? {},
    is_archived: Boolean(row.is_archived),
    published_at: (row.published_at as string) ?? undefined,
    published_url: (row.published_url as string) ?? undefined,
    estimated_hours: (row.estimated_hours as number) ?? undefined,
    actual_hours: (row.actual_hours as number) ?? undefined,
    progress: (row.progress as number) ?? 0,
    content_title: (row.content_title as string) ?? undefined,
    content_hook: (row.content_hook as string) ?? undefined,
    content_goal: ((row.content_goal as string) ?? undefined) as ContentGoal | undefined,
    related_product: (row.related_product as string) ?? undefined,
    content_body: (row.content_body as string) ?? undefined,
    call_to_action: (row.call_to_action as string) ?? undefined,
    reference_links: (row.reference_links as string[]) ?? undefined,
    output_links: (row.output_links as string[]) ?? undefined,
    content_status: (row.content_status as string) ?? undefined,
    approved_by: (row.approved_by as string) ?? undefined,
    approved_at: (row.approved_at as string) ?? undefined,
    submitted_at: (row.submitted_at as string) ?? undefined,
    submitted_by: (row.submitted_by as string) ?? undefined,
    completion_note: (row.completion_note as string) ?? undefined,
    updated_by_user_id: (row.updated_by_user_id as string) ?? undefined,
    completed_at: (row.completed_at as string) ?? undefined,
    task_type: (row.task_type as unknown as string | undefined) ?? undefined,
    website_url: (row.website_url as string) ?? undefined,
    youtube_url: (row.youtube_url as string) ?? undefined,
    tiktok_url: (row.tiktok_url as string) ?? undefined,
    facebook_url: (row.facebook_url as string) ?? undefined,
    thumbnail_url: (row.thumbnail_url as string) ?? undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ─── Projects ─────────────────────────────────────────────────────

export async function getProjects(filters?: {
  search?: string;
  status?: string;
  priority?: string;
}): Promise<Project[]> {
  let sql = `
    SELECT p.*,
      (SELECT COUNT(*) FROM pm_tasks WHERE project_id = p.id AND is_archived = FALSE) AS task_count,
      (SELECT COUNT(*) FROM pm_campaigns WHERE project_id = p.id AND deleted_at IS NULL) AS campaign_count
    FROM pm_projects p
    WHERE p.deleted_at IS NULL
  `;
  const params: unknown[] = [];

  if (filters?.search) {
    params.push(`%${filters.search}%`);
    sql += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }

  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND p.status = $${params.length}`;
  }

  if (filters?.priority) {
    params.push(filters.priority);
    sql += ` AND p.priority = $${params.length}`;
  }

  sql += " ORDER BY p.created_at DESC";

  const { rows } = await query(sql, params);

  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    description: (r.description as string | undefined) ?? undefined,
    status: (r.status as ProjectStatus | undefined) ?? "active",
    color: String(r.color ?? "#E60012"),
    start_date: (r.start_date as string | null) ?? undefined,
    end_date: (r.end_date as string | null) ?? undefined,
    budget: r.budget != null ? parseFloat(String(r.budget)) : undefined,
    owner_id: (r.owner_id as string | null) ?? undefined,
    team_ids: (r.team_ids as string[] | null) ?? [],
    tags: (r.tags as string[] | null) ?? [],
    metadata: (r.metadata as Record<string, unknown> | null) ?? {},
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    _count: {
      tasks: parseInt(String(r.task_count ?? "0")),
      campaigns: parseInt(String(r.campaign_count ?? "0")),
    },
  }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { rows } = await query<Project & { task_count: string; campaign_count: string }>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM pm_tasks WHERE project_id = p.id AND is_archived = FALSE) AS task_count,
      (SELECT COUNT(*) FROM pm_campaigns WHERE project_id = p.id AND deleted_at IS NULL) AS campaign_count
     FROM pm_projects p WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    budget: rows[0].budget ? parseFloat(String(rows[0].budget)) : undefined,
    _count: {
      tasks: parseInt(rows[0].task_count as unknown as string),
      campaigns: parseInt(rows[0].campaign_count as unknown as string),
    },
  };
}

export async function createProject(
  data: Omit<Project, "id" | "created_at" | "updated_at" | "_count">,
  actorName: string = "System"
): Promise<Project> {
  const { rows } = await query<Project>(
    `INSERT INTO pm_projects (name, description, status, color, start_date, end_date, budget, owner_id, team_ids, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.name,
      data.description ?? null,
      data.status ?? "active",
      data.color,
      data.start_date ?? null,
      data.end_date ?? null,
      data.budget ?? null,
      data.owner_id ?? null,
      data.team_ids,
      data.tags,
      data.metadata ?? {},
    ]
  );

  await query(
    `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
     VALUES ('project', $1, $2, $3)`,
    [(rows[0] as unknown as Record<string, unknown>).id, data.status ?? "active", actorName]
  );

  return rows[0];
}

export async function updateProject(
  id: string,
  data: Partial<Project>,
  actorName: string = "System"
): Promise<Project | null> {
  // Fetch old project để ghi activity log
  const oldProject = await getProjectById(id);
  if (!oldProject) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    "name", "description", "status", "color",
    "start_date", "end_date", "budget", "owner_id", "team_ids", "tags", "metadata",
  ] as const;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fields.length === 0) return oldProject;

  values.push(id);
  const { rows } = await query<Project>(
    `UPDATE pm_projects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  // Log status change
  if (rows[0] && data.status && data.status !== oldProject.status) {
    await query(
      `INSERT INTO pm_status_history (entity_type, entity_id, from_status, to_status, changed_by_name)
       VALUES ('project', $1, $2, $3, $4)`,
      [id, oldProject.status ?? null, data.status, actorName]
    );
  }

  return rows[0] ?? null;
}

// ─── Archive helper ─────────────────────────────────────────────
// Soft-delete: set status = archived (projects/campaigns/tasks)
// Hard-delete: remove from DB (only for super_admin)

export async function archiveProject(
  id: string,
  actorName: string = "System"
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE pm_projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (rowCount && rowCount > 0) {
    await query(
      `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
       VALUES ('project', $1, 'archived', $2)`,
      [id, actorName]
    );
  }
  return (rowCount ?? 0) > 0;
}

export async function deleteProject(
  id: string,
  hardDelete: boolean = false,
  actorName: string = "System"
): Promise<void> {
  await query(
    `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
     VALUES ('project', $1, $2, $3)`,
    [id, hardDelete ? "hard_deleted" : "deleted", actorName]
  );
  if (hardDelete) {
    await query("DELETE FROM pm_projects WHERE id = $1", [id]);
  }
}

export async function archiveCampaign(
  id: string,
  actorName: string = "System"
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE pm_campaigns SET status = 'archived', updated_at = NOW() WHERE id = $1 AND status != 'archived'`,
    [id]
  );
  if (rowCount && rowCount > 0) {
    await query(
      `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
       VALUES ('campaign', $1, 'archived', $2)`,
      [id, actorName]
    );
  }
  return (rowCount ?? 0) > 0;
}

export async function deleteCampaign(
  id: string,
  hardDelete: boolean = false,
  actorName: string = "System"
): Promise<void> {
  await query(
    `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
     VALUES ('campaign', $1, $2, $3)`,
    [id, hardDelete ? "hard_deleted" : "deleted", actorName]
  );
  if (hardDelete) {
    await query("DELETE FROM pm_campaigns WHERE id = $1", [id]);
  }
}

// ─── Campaigns ───────────────────────────────────────────────────

export async function getCampaigns(filters?: {
  project_id?: string;
  status?: string;
}): Promise<Campaign[]> {
  // Simplified media types (migration 034):
  // Content production types (creates_workflow = true): article, video, image, livestream
  const MEDIA_TYPES = "'article','video','image','livestream'";

  let sql = `SELECT c.*,
    COALESCE(task_stats.total, 0)::int AS _task_count,
    COALESCE(task_stats.completed_only, 0)::int AS _completed_task_count,
    COALESCE(task_stats.media_total, 0)::int AS _media_task_count,
    COALESCE(task_stats.media_completed, 0)::int AS _media_completed_count,
    COALESCE(task_stats.unique_assignees, 0)::int AS _unique_assignees,
    task_stats.assignee_ids AS _assignee_ids
  FROM pm_campaigns c
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed_only,
      COUNT(*) FILTER (WHERE t.task_type IN (${MEDIA_TYPES}))::int AS media_total,
      COUNT(*) FILTER (WHERE t.task_type IN (${MEDIA_TYPES}) AND t.status = 'completed')::int AS media_completed,
      COUNT(DISTINCT a.assignee_id) AS unique_assignees,
      ARRAY_AGG(DISTINCT a.assignee_id) FILTER (WHERE a.assignee_id IS NOT NULL) AS assignee_ids
    FROM pm_tasks t
    LEFT JOIN LATERAL unnest(t.assignee_ids) WITH ORDINALITY AS a(assignee_id, ord) ON TRUE
    WHERE t.campaign_id = c.id AND t.is_archived = FALSE
  ) task_stats ON TRUE
  WHERE c.deleted_at IS NULL`;
  const params: unknown[] = [];

  if (filters?.project_id) {
    params.push(filters.project_id);
    sql += ` AND c.project_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND c.status = $${params.length}`;
  }

  sql += " ORDER BY c.created_at DESC";
  const { rows } = await query(sql, params);
  // Use double-cast to satisfy TypeScript: untyped DB row → Record → Campaign
  const mapped = rows.map((r) => {
    const rec = r as unknown as Record<string, unknown>;
    return {
      id: String(rec.id ?? ""),
      project_id: rec.project_id as string | undefined,
      name: String(rec.name ?? ""),
      description: rec.description as string | undefined,
      campaign_type: (rec.campaign_type as Campaign["campaign_type"]) ?? "social_media",
      status: (rec.status as Campaign["status"]) ?? "planning",
      start_date: rec.start_date as string | undefined,
      end_date: rec.end_date as string | undefined,
      budget: rec.budget as number | undefined,
      target_metrics: (rec.target_metrics as Record<string, number>) ?? {},
      actual_metrics: (rec.actual_metrics as Record<string, number>) ?? {},
      channels: (rec.channels as string[]) ?? [],
      tags: (rec.tags as string[]) ?? [],
      created_at: String(rec.created_at ?? ""),
      updated_at: String(rec.updated_at ?? ""),
      _task_count: Number(rec._task_count ?? 0),
      _completed_task_count: Number(rec._completed_task_count ?? 0),
      _media_task_count: Number(rec._media_task_count ?? 0),
      _media_completed_count: Number(rec._media_completed_count ?? 0),
      _unique_assignees: Number((rec._unique_assignees as string | number) ?? 0),
      _assignee_ids: (rec._assignee_ids as string[]) ?? [],
    } satisfies Campaign;
  });
  return mapped;
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { rows } = await query<Campaign>(
    "SELECT * FROM pm_campaigns WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createCampaign(
  data: Omit<Campaign, "id" | "created_at" | "updated_at">,
  actorName: string = "System"
): Promise<Campaign> {
  const { rows } = await query<Campaign>(
    `INSERT INTO pm_campaigns (project_id, name, description, campaign_type, status, start_date, end_date, budget, target_metrics, actual_metrics, channels, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.project_id ?? null,
      data.name,
      data.description ?? null,
      data.campaign_type,
      data.status,
      data.start_date ?? null,
      data.end_date ?? null,
      data.budget ?? null,
      data.target_metrics ?? {},
      data.actual_metrics ?? {},
      data.channels,
      data.tags,
    ]
  );

  await query(
    `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
     VALUES ('campaign', $1, $2, $3)`,
    [(rows[0] as unknown as Record<string, unknown>).id, data.status, actorName]
  );

  return rows[0];
}

// ─── Master Data ─────────────────────────────────────────────────

/** Count tasks using a given status code — used to warn before deleting a task_status category item */
export async function countTasksByStatus(statusCode: string): Promise<number> {
  const result = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM pm_tasks WHERE status = $1",
    [statusCode]
  );
  return parseInt(String(result.rows[0]?.count ?? "0"), 10);
}

// ─── Tasks ───────────────────────────────────────────────────────

export async function getTasks(filters?: {
  project_id?: string;
  campaign_id?: string;
  status?: string;
  assignee_id?: string;
  search?: string;
  task_type?: string;
  include_media_only?: boolean;
  include_archived?: boolean;
}): Promise<Task[]> {
  let sql = "SELECT * FROM pm_tasks WHERE is_archived = FALSE";
  const params: unknown[] = [];

  if (filters?.project_id) {
    params.push(filters.project_id);
    sql += ` AND project_id = $${params.length}`;
  }
  if (filters?.campaign_id) {
    params.push(filters.campaign_id);
    sql += ` AND campaign_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.assignee_id) {
    params.push(filters.assignee_id);
    sql += ` AND $${params.length} = ANY(assignee_ids)`;
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
  }
  if (filters?.task_type) {
    params.push(filters.task_type);
    sql += ` AND task_type = $${params.length}`;
  }
  if (filters?.include_archived) {
    sql = sql.replace("is_archived = FALSE", "1=1");
  }

  sql += " ORDER BY due_date ASC NULLS LAST, created_at DESC";
  const { rows } = await query(sql, params);
  return (rows as Record<string, unknown>[]).map(mapTaskRow);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { rows } = await query<Task>(
    "SELECT * FROM pm_tasks WHERE id = $1",
    [id]
  );
  return rows[0] ? mapTaskRow(rows[0] as unknown as Record<string, unknown>) : null;
}

export async function createTask(
  data: Omit<Task, "id" | "created_at" | "updated_at">,
  actorName: string = "System"
): Promise<Task> {
  const { rows } = await query<Task>(
    `INSERT INTO pm_tasks (project_id, campaign_id, parent_task_id, title, description, status, priority, assignee_ids, reporter_id, start_date, due_date, estimated_hours, actual_hours, attachments, dependencies, progress, metadata, task_type, content_title, content_hook, content_goal, related_product, content_body, call_to_action, reference_links, output_links, content_status, completion_note, website_url, youtube_url, tiktok_url, facebook_url, thumbnail_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
     RETURNING *`,
    [
      data.project_id ?? null,
      data.campaign_id ?? null,
      data.parent_task_id ?? null,
      data.title,
      data.description ?? null,
      data.status,
      (data as Record<string, unknown>).priority ?? "normal",
      data.assignee_ids ?? [],
      data.reporter_id ?? null,
      data.start_date ?? null,
      data.due_date ?? null,
      data.estimated_hours ?? null,
      data.actual_hours ?? null,
      data.attachments ?? [],
      data.dependencies ?? [],
      data.progress,
      data.metadata ?? {},
      data.task_type ?? null,
      data.content_title ?? null,
      data.content_hook ?? null,
      data.content_goal ?? null,
      data.related_product ?? null,
      data.content_body ?? null,
      data.call_to_action ?? null,
      data.reference_links ?? [],
      data.output_links ?? [],
      (data as Record<string, unknown>).content_status ?? "draft",
      (data as Record<string, unknown>).completion_note ?? null,
      (data as Record<string, unknown>).website_url ?? null,
      (data as Record<string, unknown>).youtube_url ?? null,
      (data as Record<string, unknown>).tiktok_url ?? null,
      (data as Record<string, unknown>).facebook_url ?? null,
      (data as Record<string, unknown>).thumbnail_url ?? null,
    ]
  );

  // Populate junction table so triggers and queries work consistently
  if (rows[0] && data.assignee_ids && data.assignee_ids.length > 0) {
    const taskId = (rows[0] as unknown as Record<string, unknown>).id as string;
    const params: unknown[] = [taskId];
    const rowPlaceholders: string[] = [];
    data.assignee_ids.forEach((userId) => {
      params.push(userId);
      params.push(null);
    });
    for (let i = 0; i < data.assignee_ids.length; i++) {
      rowPlaceholders.push(`($1, $${i * 2 + 2}, $${i * 2 + 3})`);
    }
    await query(
      `INSERT INTO pm_task_assignees (task_id, user_id, assigned_by) VALUES ${rowPlaceholders.join(", ")}`,
      params
    );
  }

  await query(
    `INSERT INTO pm_task_activities (task_id, action, new_value, actor_name)
     VALUES ($1, 'created', $2, $3)`,
    [(rows[0] as unknown as Record<string, unknown>).id, data.title, actorName]
  );

  return mapTaskRow(rows[0] as unknown as Record<string, unknown>);
}

export async function updateTask(
  id: string,
  data: Partial<Task>,
  actorName: string = "System",
  actorId?: string,
): Promise<Task | null> {
  // Fetch old task trước để ghi activity log
  const oldTask = await getTaskById(id);
  if (!oldTask) return null;

  // Extract assignee_ids — will be synced via pm_task_assignees junction table
  const hasAssigneeIdsInPayload = "assignee_ids" in data;
  const incomingAssigneeIds = hasAssigneeIdsInPayload ? data.assignee_ids : undefined;
  const { assignee_ids: _unused, ...taskFields } = data as Record<string, unknown>;

  // Build list of fields that actually changed
  const changedFields: string[] = [];
  const changedValues: unknown[] = [];
  let idx = 1;

  const fieldKeys: (keyof Task)[] = [
    "title", "description", "status",
    "project_id", "campaign_id",
    "reporter_id", "start_date", "due_date",
    "estimated_hours", "actual_hours", "attachments",
    "dependencies", "progress", "metadata",
    "task_type", "platform", "priority", "thumbnail_url", "published_at", "published_url",
    "content_title", "content_hook", "content_goal", "related_product",
    "content_body", "call_to_action", "reference_links", "output_links",
    "content_status", "approved_by", "approved_at",
    "completion_note", "workflow_id", "updated_by_user_id",
    "website_url", "youtube_url", "tiktok_url", "facebook_url",
  ];

  for (const key of fieldKeys) {
    if (key in taskFields) {
      changedFields.push(`${key} = $${idx}`);
      changedValues.push(taskFields[key]);
      idx++;
    }
  }

  // Checklist gate: check before updating status=completed
  if (taskFields.status === "completed") {
    const { rows: checklistRows } = await query<{ total: string; done: string }>(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_completed = true) as done
       FROM pm_task_checklist_items WHERE task_id = $1`,
      [id]
    );
    const total = parseInt(checklistRows[0]?.total ?? "0");
    const done = parseInt(checklistRows[0]?.done ?? "0");
    if (total > 0 && done < total) {
      throw new Error(`Hoàn thành checklist trước (${done}/${total})`);
    }
    changedFields.push("completed_at = CURRENT_TIMESTAMP");
  }

  // Phase 1: UPDATE task fields if anything changed
  if (changedFields.length > 0) {
    changedValues.push(id);
    await query(
      `UPDATE pm_tasks SET ${changedFields.join(", ")} WHERE id = $${idx}`,
      changedValues
    );

    // Sync content fields if needed
    if ("content_title" in taskFields || "content_body" in taskFields || "content_status" in taskFields) {
      await upsertTaskContent(id, {
        content_title: taskFields.content_title as string | undefined,
        content_body: taskFields.content_body as string | undefined,
        content_status: taskFields.content_status as string | undefined,
      }, actorName);
    }

    // Log status change
    if (taskFields.status && taskFields.status !== oldTask.status) {
      await query(
        `INSERT INTO pm_task_activities (task_id, action, field_changed, old_value, new_value, actor_name)
         VALUES ($1, 'status_changed', 'status', $2, $3, $4)`,
        [id, oldTask.status ?? null, taskFields.status, actorName]
      );
      await query(
        `INSERT INTO pm_status_history (entity_type, entity_id, from_status, to_status, changed_by_name)
         VALUES ('task', $1, $2, $3, $4)`,
        [id, oldTask.status ?? null, taskFields.status, actorName]
      );
    }
  }

  // Phase 2: Sync assignees via normalized junction table (trigger updates assignee_ids[])
  if (incomingAssigneeIds !== undefined) {
    await query("DELETE FROM pm_task_assignees WHERE task_id = $1", [id]);
    if (incomingAssigneeIds.length > 0) {
      // Each row needs (task_id, user_id, assigned_by) — task_id is the same $1 for all rows
      const rowPlaceholders: string[] = [];
      for (let i = 0; i < incomingAssigneeIds.length; i++) {
        // $1 = task_id (always), $2 = user_id, $3 = assigned_by (row 0)
        // For row i: user_id at $(2 + i*2), assigned_by at $(3 + i*2)
        rowPlaceholders.push(`($1, $${i * 2 + 2}, $${i * 2 + 3})`);
      }
      const params: unknown[] = [id];
      incomingAssigneeIds.forEach((userId) => {
        params.push(userId);
        params.push(actorId ?? null);
      });
      const insertSQL = `INSERT INTO pm_task_assignees (task_id, user_id, assigned_by) VALUES ${rowPlaceholders.join(", ")}`;
      console.debug("[updateTask] junction INSERT:", { sql: insertSQL, paramCount: params.length, incomingAssigneeIds });
      await query(insertSQL, params);
    }
  }

  // Phase 3: Fresh SELECT — always get current state after all syncs
  // Trigger has synced assignee_ids[] via junction table, so this returns correct data
  const { rows: finalRows } = await query("SELECT * FROM pm_tasks WHERE id = $1", [id]);
  return finalRows[0] ? mapTaskRow(finalRows[0] as unknown as Record<string, unknown>) : null;
}

// ─── Task Assignees (Normalized) ─────────────────────────────────

/**
 * Add a single assignee to a task.
 */
export async function addTaskAssignee(
  taskId: string,
  userId: string,
  actorId?: string
): Promise<void> {
  await query(
    `INSERT INTO pm_task_assignees (task_id, user_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (task_id, user_id) DO NOTHING`,
    [taskId, userId, actorId ?? null]
  );
}

/**
 * Remove a single assignee from a task.
 */
export async function removeTaskAssignee(
  taskId: string,
  userId: string
): Promise<void> {
  await query(
    "DELETE FROM pm_task_assignees WHERE task_id = $1 AND user_id = $2",
    [taskId, userId]
  );
}

// ─── Task Content (Phase 3) ──────────────────────────────────────

export interface TaskContentInput {
  task_id: string;
  content_type?: string;
  content_title?: string;
  content_hook?: string;
  content_body?: string;
  content_status?: string;
  rich_text?: string;
  script?: string;
  notes?: string;
  created_by?: string;
}

export interface TaskContent extends TaskContentInput {
  id: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTaskContent(taskId: string): Promise<TaskContent | null> {
  const { rows } = await query<TaskContent>(
    "SELECT * FROM pm_task_contents WHERE task_id = $1",
    [taskId]
  );
  return rows[0] ?? null;
}

export async function upsertTaskContent(
  taskId: string,
  data: Partial<TaskContentInput>,
  actorName: string = "System"
): Promise<TaskContent | null> {
  // Check if content record exists
  const existing = await getTaskContent(taskId);

  const allowed: (keyof TaskContentInput)[] = [
    "content_type", "content_title", "content_hook", "content_body", "content_status",
    "rich_text", "script", "notes",
  ];

  // Separate: columnNames for INSERT, fieldAssignments for UPDATE
  const columnNames: string[] = [];
  const fieldAssignments: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data && data[key] !== undefined) {
      const col = `"${key}"`; // double-quoted for PostgreSQL
      columnNames.push(col);
      fieldAssignments.push(`${col} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fieldAssignments.length === 0 && !existing) {
    return null;
  }

  if (fieldAssignments.length === 0) {
    return existing;
  }

  if (existing) {
    // UPDATE
    values.push(taskId);
    const { rows } = await query<TaskContent>(
      `UPDATE pm_task_contents SET ${fieldAssignments.join(", ")} WHERE task_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  } else {
    // INSERT
    const insertValues = [...values, taskId];
    const { rows } = await query<TaskContent>(
      `INSERT INTO pm_task_contents (${columnNames.join(", ")}, task_id) VALUES (${insertValues.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      insertValues
    );
    return rows[0] ?? null;
  }
}

export async function bulkUpdateTaskStatus(
  updates: { id: string; status: string }[]
): Promise<void> {
  for (const u of updates) {
    // Get old status
    const { rows: oldRows } = await query<{ status: string }>(
      "SELECT status FROM pm_tasks WHERE id = $1",
      [u.id]
    );
    const oldStatus = oldRows[0]?.status ?? null;

    await query(
      "UPDATE pm_tasks SET status = $1 WHERE id = $2",
      [u.status, u.id]
    );

    if (u.status !== oldStatus) {
      await query(
        `INSERT INTO pm_task_activities (task_id, action, field_changed, old_value, new_value, actor_name)
         VALUES ($1, 'status_changed', 'status', $2, $3, 'System')`,
        [u.id, oldStatus, u.status]
      );
      await query(
        `INSERT INTO pm_status_history (entity_type, entity_id, from_status, to_status, changed_by_name)
         VALUES ('task', $1, $2, $3, 'System')`,
        [u.id, oldStatus, u.status]
      );
    }
  }
}

export async function archiveTask(
  id: string,
  actorName: string = "System",
  actorId?: string
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE pm_tasks
       SET is_archived = TRUE,
           archived_at = NOW(),
           archived_by_name = $2,
           updated_at = NOW()
     WHERE id = $1 AND is_archived = FALSE`,
    [id, actorName]
  );
  if (rowCount && rowCount > 0) {
    await query(
      `INSERT INTO pm_task_activities (task_id, action, field_changed, new_value, actor_name, is_archived_action)
       VALUES ($1, 'archived', 'is_archived', 'true', $2, TRUE)`,
      [id, actorName]
    );
  }
  return (rowCount ?? 0) > 0;
}

export async function restoreTask(
  id: string,
  actorName: string = "System"
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE pm_tasks
       SET is_archived = FALSE,
           archived_at = NULL,
           archived_by_name = NULL,
           updated_at = NOW()
     WHERE id = $1 AND is_archived = TRUE`,
    [id]
  );
  if (rowCount && rowCount > 0) {
    await query(
      `INSERT INTO pm_task_activities (task_id, action, field_changed, new_value, actor_name)
       VALUES ($1, 'restored', 'is_archived', 'false', $2)`,
      [id, actorName]
    );
  }
  return (rowCount ?? 0) > 0;
}

export async function duplicateTask(
  sourceTask: Task,
  actorName: string = "System"
): Promise<Task> {
  // Get actual column list from information_schema — works regardless of migration status
  const { rows: colRows } = await query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'pm_tasks'
        AND column_default IS NULL
        AND column_name NOT IN ('id', 'created_at', 'updated_at')
      ORDER BY ordinal_position`
  );

  const copyableColumns = colRows.map((r) => r.column_name as keyof Task);
  const columnNames = copyableColumns.join(", ");

  const placeholders = copyableColumns
    .map((col, i) => {
      if (col === "title") return `$${i + 1}`;
      if (col === "progress") return "0"; // reset
      if (col === "is_archived") return "FALSE";
      if (col === "archived_at") return "NULL";
      if (col === "archived_by") return "NULL";
      if (col === "archived_by_name") return "NULL";
      const val = (sourceTask as unknown as Record<string, unknown>)[col];
      if (val === undefined) return "NULL";
      if (Array.isArray(val)) return `$${i + 1}`;
      if (typeof val === "object" && val !== null) return `$${i + 1}`;
      return `$${i + 1}`;
    })
    .join(", ");

  const paramValues: unknown[] = [];
  copyableColumns.forEach((col, i) => {
    if (col === "title") {
      paramValues.push(`${sourceTask.title} (bản sao)`);
    } else if (
      col === "progress" ||
      col === "is_archived" ||
      col === "archived_at" ||
      col === "archived_by" ||
      col === "archived_by_name"
    ) {
      // These are handled as literals in placeholders — no param needed
    } else {
      const val = (sourceTask as unknown as Record<string, unknown>)[col];
      paramValues.push(val ?? null);
    }
  });

  const { rows } = await query<Task>(
    `INSERT INTO pm_tasks (id, ${columnNames})
       SELECT gen_random_uuid(), ${placeholders}
       FROM pm_tasks WHERE id = $${paramValues.length + 1}
       RETURNING *`,
    [...paramValues, sourceTask.id]
  );

  if (!rows[0]) throw new Error("Duplicate failed — source task not found");

  const newTask = mapTaskRow(rows[0] as unknown as Record<string, unknown>);

  // Populate junction table so assignees persist on duplicated task
  if (sourceTask.assignee_ids && sourceTask.assignee_ids.length > 0) {
    const params: unknown[] = [newTask.id];
    const rowPlaceholders: string[] = [];
    sourceTask.assignee_ids.forEach((userId) => {
      params.push(userId);
      params.push(null);
    });
    for (let i = 0; i < sourceTask.assignee_ids.length; i++) {
      rowPlaceholders.push(`($1, $${i * 2 + 2}, $${i * 2 + 3})`);
    }
    await query(
      `INSERT INTO pm_task_assignees (task_id, user_id, assigned_by) VALUES ${rowPlaceholders.join(", ")}`,
      params
    );
  }

  await query(
    `INSERT INTO pm_task_activities (task_id, action, new_value, actor_name)
     VALUES ($1, 'created', $2, $3)`,
    [newTask.id, newTask.title, actorName]
  );
  return newTask;
}

export async function deleteTask(
  id: string,
  hardDelete: boolean = false,
  actorName: string = "System"
): Promise<void> {
  await query(
    `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
     VALUES ('task', $1, $2, $3)`,
    [id, hardDelete ? "hard_deleted" : "deleted", actorName]
  );
  if (hardDelete) {
    await query("DELETE FROM pm_tasks WHERE id = $1", [id]);
  }
}

// ─── Task Comments ───────────────────────────────────────────────

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { rows } = await query<TaskComment>(
    "SELECT * FROM pm_task_comments WHERE task_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC",
    [taskId]
  );
  return rows;
}

export async function createTaskComment(
  data: Omit<TaskComment, "id" | "created_at" | "updated_at" | "replies">
): Promise<TaskComment> {
  const { rows } = await query<TaskComment>(
    `INSERT INTO pm_task_comments (task_id, parent_comment_id, author_id, author_name, author_avatar, content, is_ai_generated, mentions)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.task_id,
      data.parent_comment_id ?? null,
      data.author_id,
      data.author_name,
      data.author_avatar ?? null,
      data.content,
      data.is_ai_generated,
      data.mentions,
    ]
  );
  return rows[0];
}

export async function getCommentById(commentId: string): Promise<TaskComment | null> {
  const { rows } = await query<TaskComment>(
    `SELECT * FROM pm_task_comments WHERE id = $1 AND deleted_at IS NULL`,
    [commentId]
  );
  return (rows[0] as TaskComment) ?? null;
}

export async function updateTaskComment(
  commentId: string,
  content: string
): Promise<TaskComment | null> {
  const { rows } = await query<TaskComment>(
    `UPDATE pm_task_comments
     SET content = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [commentId, content]
  );
  return (rows[0] as TaskComment) ?? null;
}

export async function deleteTaskComment(commentId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE pm_task_comments
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL`,
    [commentId]
  );
  return (rowCount ?? 0) > 0;
}

export async function getTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const { rows } = await query<TaskActivity>(
    "SELECT * FROM pm_task_activities WHERE task_id = $1 ORDER BY created_at DESC",
    [taskId]
  );
  return rows;
}

// ─── Media Workflows (DEPRECATED — use Task with task_type instead) ──────
// DEPRECATED: As of migration 008 (2026-05-26), all media workflows have been merged into pm_tasks.
// API endpoints return 410 Gone. Table pm_media_workflows is kept for reference only.
// DO NOT use these functions for new features.
// Migration: sql/workspace/008_media_workflow_merge.sql
// Records migrated: 10 media workflows → pm_tasks (100% linked via pm_media_workflows.task_id)

/**
 * @deprecated Use getTasks() with task_type filter instead.
 * @deprecated since 2026-05-26
 * @deprecated API returns 410 Gone as of 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql — 10 records migrated
 */
export async function getMediaWorkflows(filters?: {
  project_id?: string;
  campaign_id?: string;
  status?: string;
  platform?: string;
  content_type?: string;
}): Promise<MediaWorkflow[]> {
  let sql = "SELECT * FROM pm_media_workflows WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.project_id) {
    params.push(filters.project_id);
    sql += ` AND project_id = $${params.length}`;
  }
  if (filters?.campaign_id) {
    params.push(filters.campaign_id);
    sql += ` AND campaign_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.platform) {
    params.push(filters.platform);
    sql += ` AND platform = $${params.length}`;
  }
  if (filters?.content_type) {
    params.push(filters.content_type);
    sql += ` AND content_type = $${params.length}`;
  }

  sql += " ORDER BY due_date ASC NULLS LAST, created_at DESC";
  const { rows } = await query<MediaWorkflow>(sql, params);
  return rows;
}

/**
 * @deprecated Use getTaskById() with task_type instead.
 * @deprecated since 2026-05-26
 * @deprecated API returns 410 Gone as of 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql
 */
export async function getMediaWorkflowById(id: string): Promise<MediaWorkflow | null> {
  const { rows } = await query<MediaWorkflow>(
    "SELECT * FROM pm_media_workflows WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

/**
 * @deprecated Use createTask() with task_type instead.
 * @deprecated since 2026-05-26
 * @deprecated API returns 410 Gone as of 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql
 */
export async function createMediaWorkflow(
  data: Omit<MediaWorkflow, "id" | "created_at" | "updated_at">
): Promise<MediaWorkflow> {
  const { rows } = await query<MediaWorkflow>(
    `INSERT INTO pm_media_workflows (project_id, campaign_id, title, description, content_type, platform, status, ai_prompt, ai_generated_content, ai_model_used, ai_generated_at, published_at, published_url, engagement_metrics, assignee_ids, due_date, tags, attachments, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      data.project_id ?? null,
      data.campaign_id ?? null,
      data.title,
      data.description ?? null,
      data.content_type,
      data.platform ?? null,
      data.status,
      data.ai_prompt ?? null,
      data.ai_generated_content ?? null,
      data.ai_model_used ?? null,
      data.ai_generated_at ?? null,
      data.published_at ?? null,
      data.published_url ?? null,
      data.engagement_metrics ?? {},
      data.assignee_ids,
      data.due_date ?? null,
      data.tags,
      data.attachments ?? [],
      data.metadata ?? {},
    ]
  );
  return rows[0];
}

/**
 * @deprecated Use updateTask() with workflow_stage instead.
 * @deprecated since 2026-05-26
 * @deprecated API returns 410 Gone as of 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql
 */
export async function updateMediaWorkflow(
  id: string,
  data: Partial<MediaWorkflow>
): Promise<MediaWorkflow | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    "project_id", "campaign_id", "title", "description", "content_type",
    "platform", "status", "ai_prompt", "ai_generated_content", "ai_model_used",
    "ai_generated_at", "published_at", "published_url", "engagement_metrics",
    "assignee_ids", "due_date", "tags", "attachments", "metadata",
  ] as const;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fields.length === 0) return getMediaWorkflowById(id);

  values.push(id);
  const { rows } = await query<MediaWorkflow>(
    `UPDATE pm_media_workflows SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

/**
 * @deprecated Workflow stages are now managed through Task.workflow_stage.
 *             Use getTasks() and updateTask() instead.
 * @deprecated since 2026-05-26
 * @deprecated Migration: sql/workspace/008_media_workflow_merge.sql
 */
export async function getWorkflowStages(workflowId: string): Promise<WorkflowStage[]> {
  const { rows } = await query<WorkflowStage>(
    "SELECT * FROM pm_workflow_stages WHERE workflow_id = $1 ORDER BY order_index ASC",
    [workflowId]
  );
  return rows;
}

// ─── Interns ─────────────────────────────────────────────────────

export async function getInterns(filters?: {
  status?: string;
  position?: string;
}): Promise<Intern[]> {
  let sql = "SELECT * FROM pm_interns WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.position) {
    params.push(filters.position);
    sql += ` AND position = $${params.length}`;
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await query<Intern>(sql, params);
  return rows;
}

export async function getInternById(id: string): Promise<Intern | null> {
  const { rows } = await query<Intern>(
    "SELECT * FROM pm_interns WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Get all workspace members from admin_users + pm_interns.
 * Derives member_type and job_role from intern record or user role.
 * Calculates task stats from pm_tasks.
 */
export async function getWorkspaceMembers(filters?: {
  memberType?: string;
  jobRole?: string;
  status?: string;
}): Promise<import("@/lib/workspace/types").WorkspaceMember[]> {
  // Bulk fetch: all users + all interns + task stats in 3 queries total (vs 1+N*2 before)
  const userRows = await query<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatar_url?: string;
    created_at: string;
  }>("SELECT id, name, email, role, status, avatar_url, created_at FROM admin_users ORDER BY created_at DESC");

  const internRows = await query<{
    user_id: string;
    position: string;
    start_date: string;
    status: string;
    full_name: string;
  }>("SELECT user_id, position, start_date, status, full_name FROM pm_interns");

  const internMap = new Map(internRows.rows.map((r) => [r.user_id, r]));

  const members: import("@/lib/workspace/types").WorkspaceMember[] = [];

  for (const user of userRows.rows) {
    if (user.role === "super_admin") continue;

    const intern = internMap.get(user.id);

    let memberType: import("@/lib/workspace/types").MemberType = "employee";
    if (intern) {
      if (intern.position === "content_intern" || intern.position === "video_intern" ||
          intern.position === "design_intern" || intern.position === "marketing_intern") {
        memberType = "intern";
      }
    }
    if (user.role === "intern") memberType = "intern";

    let jobRole: import("@/lib/workspace/types").JobRole = "other";
    if (intern) {
      const posMap: Record<string, import("@/lib/workspace/types").JobRole> = {
        content_intern: "content_writer",
        video_intern: "video_editor",
        design_intern: "designer",
        marketing_intern: "social_media",
      };
      jobRole = posMap[intern.position] || "other";
    }

    if (filters?.memberType && filters.memberType !== "all" && memberType !== filters.memberType) continue;
    if (filters?.jobRole && filters.jobRole !== "all" && jobRole !== filters.jobRole) continue;
    if (filters?.status && filters.status !== "all" && user.status !== filters.status) continue;

    const taskStatsRows = await query<{
      assigned: string;
      completed: string;
      overdue: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE $1 = ANY(assignee_ids)) AS assigned,
        COUNT(*) FILTER (WHERE $1 = ANY(assignee_ids) AND status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE $1 = ANY(assignee_ids) AND status != 'completed' AND due_date < NOW()) AS overdue
      FROM pm_tasks
    `, [user.id]);

    const stats = taskStatsRows.rows[0];
    const assigned = parseInt(stats?.assigned ?? "0");
    const completed = parseInt(stats?.completed ?? "0");
    const overdue = parseInt(stats?.overdue ?? "0");
    const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

    members.push({
      id: user.id,
      fullName: intern?.full_name || user.name || user.email,
      email: user.email,
      memberType,
      jobRole,
      systemRole: user.role,
      status: user.status === "active" ? "active" : "inactive",
      avatarUrl: user.avatar_url,
      joinedAt: intern?.start_date || user.created_at,
      stats: {
        tasksAssigned: assigned,
        tasksCompleted: completed,
        tasksOverdue: overdue,
        completionRate,
      },
    });
  }

  return members;
}

export async function createIntern(
  data: Omit<Intern, "id" | "created_at" | "updated_at">
): Promise<Intern> {
  const { rows } = await query<Intern>(
    `INSERT INTO pm_interns (user_id, full_name, email, phone, avatar_url, university, major, year_of_study, position, start_date, end_date, mentor_id, status, skills, bio)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      data.user_id ?? null,
      data.full_name,
      data.email ?? null,
      data.phone ?? null,
      data.avatar_url ?? null,
      data.university ?? null,
      data.major ?? null,
      data.year_of_study ?? null,
      data.position,
      data.start_date,
      data.end_date ?? null,
      data.mentor_id ?? null,
      data.status,
      data.skills,
      data.bio ?? null,
    ]
  );
  return rows[0];
}

export async function getInternKPIs(
  internId: string,
  periodType?: "weekly" | "monthly"
): Promise<InternKPI[]> {
  let sql = "SELECT * FROM pm_intern_kpis WHERE intern_id = $1";
  const params: unknown[] = [internId];

  if (periodType) {
    params.push(periodType);
    sql += ` AND period_type = $${params.length}`;
  }

  sql += " ORDER BY period_start DESC";
  const { rows } = await query<InternKPI>(sql, params);
  return rows;
}

export async function getWeeklyPerformance(
  internId: string
): Promise<WeeklyPerformance[]> {
  const { rows } = await query<WeeklyPerformance>(
    "SELECT * FROM pm_weekly_performance WHERE intern_id = $1 ORDER BY week_start DESC",
    [internId]
  );
  return rows;
}

export async function getInternRankings(
  periodType?: "weekly" | "monthly",
  limit = 10
): Promise<InternRanking[]> {
  let sql = `
    SELECT r.*, i.full_name, i.avatar_url, i.position, i.university
    FROM pm_intern_rankings r
    JOIN pm_interns i ON r.intern_id = i.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (periodType) {
    params.push(periodType);
    sql += ` AND r.period_type = $${params.length}`;
  }

  params.push(limit);
  sql += ` ORDER BY r.overall_rank ASC LIMIT $${params.length}`;

  const { rows } = await query<InternRanking & {
    full_name: string;
    avatar_url: string;
    position: string;
    university: string;
  }>(sql, params);

  return rows.map((r) => ({
    ...r,
    intern: {
      id: r.intern_id,
      full_name: r.full_name,
      avatar_url: r.avatar_url,
      position: r.position as "content_intern" | "video_intern" | "design_intern" | "marketing_intern",
      university: r.university,
      start_date: "",
      status: "active" as const,
      skills: [],
      created_at: "",
      updated_at: "",
    },
  }));
}

export async function getWeeklyPerformanceAll(
  weekStart?: string
): Promise<(WeeklyPerformance & { intern_name: string })[]> {
  let sql = `
    SELECT wp.*, i.full_name as intern_name
    FROM pm_weekly_performance wp
    JOIN pm_interns i ON wp.intern_id = i.id
  `;
  const params: unknown[] = [];

  if (weekStart) {
    params.push(weekStart);
    sql += ` WHERE wp.week_start = $${params.length}`;
  }

  sql += " ORDER BY wp.overall_score DESC";
  const { rows } = await query<WeeklyPerformance & { intern_name: string }>(sql, params);
  return rows;
}

// ─── Staff (for task assignment) ─────────────────────────────────

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export async function getActiveStaff(): Promise<StaffMember[]> {
  const { rows } = await query<StaffMember>(
    "SELECT id, full_name, email, role FROM admin_users WHERE status = 'active' ORDER BY full_name ASC"
  );
  return rows;
}

// ─── Campaign Types ───────────────────────────────────────────────

export async function getCampaignTypes(): Promise<CampaignTypeConfig[]> {
  const { rows } = await query<CampaignTypeConfig>(
    "SELECT id, code, name, description, icon, color, is_active FROM pm_campaign_types WHERE is_active = TRUE ORDER BY sort_order ASC"
  );
  return rows;
}

export interface OverdueCampaign {
  id: string;
  name: string;
  status: string;
  end_date: string;
  days_overdue: number;
}

export async function getOverdueCampaigns(): Promise<OverdueCampaign[]> {
  try {
    const { rows } = await query<{
      id: string;
      name: string;
      status: string;
      end_date: string;
      days_overdue: number;
    }>("SELECT * FROM get_overdue_campaigns()");
    return rows;
  } catch {
    console.warn("[DB] get_overdue_campaigns() not found or error — returning empty");
    return [];
  }
}

// ─── Workspace Stats ─────────────────────────────────────────────

// Query cũ: 6 round-trips riêng biệt (đã deprecate)
// export async function getWorkspaceStats_old(): Promise<WorkspaceStats> { ... }

export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  // Tối ưu: gọi 1 view thay vì 6 queries riêng biệt
  // View: v_workspace_stats — gộp tất cả metrics trong 1 query
  try {
    const { rows } = await query<{
      active_projects: string;
      due_this_week: string;
      overdue_tasks: string;
      overdue_campaigns: string;
      media_ready: string;
      total_interns: string;
      published_this_month: string;
    }>("SELECT * FROM v_workspace_stats");

    const stats = rows[0];
    return {
      active_projects: parseInt(stats?.active_projects ?? "0"),
      due_this_week: parseInt(stats?.due_this_week ?? "0"),
      overdue_tasks: parseInt(stats?.overdue_tasks ?? "0"),
      overdue_campaigns: parseInt(stats?.overdue_campaigns ?? "0"),
      media_ready: parseInt(stats?.media_ready ?? "0"),
      total_interns: parseInt(stats?.total_interns ?? "0"),
      published_this_month: parseInt(stats?.published_this_month ?? "0"),
    };
  } catch {
    console.warn("[DB] v_workspace_stats view not found — returning empty stats");
    return {
      active_projects: 0,
      due_this_week: 0,
      overdue_tasks: 0,
      overdue_campaigns: 0,
      media_ready: 0,
      total_interns: 0,
      published_this_month: 0,
    };
  }
}

// ─── Task Assets ────────────────────────────────────────────────
// P6.2: Asset Management cho Content/Media Workflow

import type { TaskAsset, CreateTaskAssetInput, AssetType } from "../types-asset";

export async function getTaskAssets(taskId: string): Promise<TaskAsset[]> {
  const { rows } = await query(
    `SELECT * FROM pm_task_assets
     WHERE task_id = $1
     ORDER BY created_at DESC`,
    [taskId]
  );
  return rows as TaskAsset[];
}

export async function getTaskAssetById(assetId: string): Promise<TaskAsset | null> {
  const { rows } = await query(
    "SELECT * FROM pm_task_assets WHERE id = $1",
    [assetId]
  );
  return (rows[0] as TaskAsset) ?? null;
}

export async function createTaskAsset(
  taskId: string,
  input: CreateTaskAssetInput,
  actorId?: string,
  actorName?: string
): Promise<TaskAsset> {
  const { rows } = await query(
    `INSERT INTO pm_task_assets (
       task_id, asset_type, title, description,
       file_name, file_url, mime_type, file_size,
       storage_provider, original_url,
       uploaded_by, uploaded_by_name, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      taskId,
      input.asset_type,
      input.title ?? "",
      input.description ?? null,
      input.file_name,
      input.file_url ?? null,
      input.mime_type ?? null,
      input.file_size ?? null,
      input.storage_provider ?? "local",
      input.original_url ?? null,
      actorId ?? null,
      actorName ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  return rows[0] as TaskAsset;
}

export async function deleteTaskAsset(
  assetId: string,
  actorId?: string,
  actorName?: string
): Promise<boolean> {
  const asset = await getTaskAssetById(assetId);
  if (!asset) return false;

  const { rowCount } = await query(
    "DELETE FROM pm_task_assets WHERE id = $1",
    [assetId]
  );

  if (rowCount && rowCount > 0) {
    await writeAssetAuditLog({
      actorId,
      actorName,
      action: "delete",
      entityType: "task_asset",
      entityId: assetId,
      assetType: asset.asset_type,
      fileName: asset.file_name,
      fileUrl: asset.file_url,
    });
  }

  return !!(rowCount && rowCount > 0);
}

export async function getTaskAssetCounts(
  taskIds: string[]
): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {};
  const { rows } = await query(
    `SELECT task_id, COUNT(*) as count
     FROM pm_task_assets
     WHERE task_id = ANY($1) AND is_current = TRUE
     GROUP BY task_id`,
    [taskIds]
  );
  const result: Record<string, number> = {};
  for (const row of rows as Array<{ task_id: string; count: string }>) {
    result[row.task_id] = parseInt(row.count);
  }
  return result;
}

// ─── Audit Log ─────────────────────────────────────────────────

interface AuditLogParams {
  actorId?: string;
  actorName?: string;
  action: "upload" | "delete" | "update" | "view";
  entityType: string;
  entityId?: string;
  assetType?: AssetType;
  fileName?: string;
  fileUrl?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAssetAuditLog(params: AuditLogParams): Promise<void> {
  await query(
    `INSERT INTO pm_audit_logs (
       actor_id, actor_name, action, entity_type, entity_id,
       asset_type, file_name, file_url, metadata, ip_address, user_agent
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      params.actorId ?? null,
      params.actorName ?? null,
      params.action,
      params.entityType,
      params.entityId ?? null,
      params.assetType ?? null,
      params.fileName ?? null,
      params.fileUrl ?? null,
      JSON.stringify(params.metadata ?? {}),
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ]
  );
}

export async function getAssetAuditLogs(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<Array<Record<string, unknown>>> {
  const { rows } = await query(
    `SELECT * FROM pm_audit_logs
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [entityType, entityId, limit]
  );
  return rows as Array<Record<string, unknown>>;
}

// ─── Workspace Audit Log (CRUD tracking) ────────────────────────

interface WorkspaceAuditParams {
  actorId?: string;
  actorName?: string;
  action: "created" | "updated" | "deleted" | "archived" | "restored" | "status_changed" | "duplicated";
  entityType: "project" | "campaign" | "task";
  entityId: string;
  entityName?: string;
  changes?: { field: string; old: unknown; new: unknown }[];
  ipAddress?: string;
  userAgent?: string;
}

export async function writeWorkspaceAuditLog(params: WorkspaceAuditParams): Promise<void> {
  await query(
    `INSERT INTO pm_audit_logs (
       actor_id, actor_name, action, entity_type, entity_id,
       metadata, ip_address, user_agent
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      params.actorId ?? null,
      params.actorName ?? null,
      params.action,
      params.entityType,
      params.entityId,
      JSON.stringify({
        entity_name: params.entityName ?? null,
        changes: params.changes ?? [],
      }),
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ]
  );
}

// ─── Task Approvals ─────────────────────────────────────────────
// P6.3: Approval Workflow cho Content/Media Production

import type { TaskApproval, ApprovalAction } from "../types-approval";

export async function getApprovalHistory(taskId: string): Promise<TaskApproval[]> {
  const { rows } = await query(
    `SELECT * FROM pm_task_approvals
     WHERE task_id = $1
     ORDER BY created_at DESC`,
    [taskId]
  );
  return rows as TaskApproval[];
}

export async function createApprovalRecord(params: {
  taskId: string;
  reviewerId?: string;
  reviewerName?: string;
  action: ApprovalAction;
  comment?: string;
  fromStage?: string;
  toStage?: string;
}): Promise<TaskApproval> {
  const { rows } = await query(
    `INSERT INTO pm_task_approvals (
       task_id, reviewer_id, reviewer_name, action, comment,
       from_stage, to_stage, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,'{}')
     RETURNING *`,
    [
      params.taskId,
      params.reviewerId ?? null,
      params.reviewerName ?? null,
      params.action,
      params.comment ?? null,
      params.fromStage ?? null,
      params.toStage ?? null,
    ]
  );
  return rows[0] as TaskApproval;
}

export async function updateTaskStage(
  taskId: string,
  newStage: string
): Promise<void> {
  await query(
    "UPDATE pm_tasks SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [newStage, taskId]
  );
}

/**
 * Thực hiện approval action: approve/reject/request_revision/submit_review/publish.
 * Đổi workflow_stage của task và ghi vào pm_task_approvals + pm_task_activities.
 */
export async function performApprovalAction(params: {
  taskId: string;
  action: ApprovalAction;
  reviewerId?: string;
  reviewerName?: string;
  comment?: string;
}): Promise<{ success: boolean; task?: Task; error?: string }> {
  // Map action → new stage
  const ACTION_STAGE_MAP: Record<ApprovalAction, string | null> = {
    submit_review: "internal_review",
    approve: "approved",
    reject: "revision",
    request_revision: "revision",
    publish: "published",
  };

  const newStage = ACTION_STAGE_MAP[params.action];
  if (!newStage) {
    return { success: false, error: "Invalid action" };
  }

  // Lấy task hiện tại
  const taskRows = await query("SELECT * FROM pm_tasks WHERE id = $1", [params.taskId]);
  if (!taskRows.rows[0]) {
    return { success: false, error: "Task not found" };
  }

  const task = taskRows.rows[0] as Record<string, unknown>;
  const fromStage = String(task.stage ?? "");

  // Nếu submit_review: chỉ cho phép từ writing
  if (params.action === "submit_review" && fromStage !== "writing") {
    return { success: false, error: "Chỉ có thể gửi duyệt từ stage Viết nội dung" };
  }

  // Nếu approve/reject/request_revision: chỉ cho phép từ internal_review
  if (["approve", "reject", "request_revision"].includes(params.action)) {
    if (fromStage !== "internal_review") {
      return { success: false, error: "Chỉ có thể duyệt/từ chối từ stage Review nội bộ" };
    }
  }

  // Nếu reject/request_revision: bắt buộc comment
  if (["reject", "request_revision"].includes(params.action) && !params.comment?.trim()) {
    return { success: false, error: "Bắt buộc nhập lý do khi từ chối hoặc yêu cầu chỉnh sửa" };
  }

  // Nếu publish: chỉ cho phép từ approved hoặc scheduled
  if (params.action === "publish") {
    if (!["approved", "scheduled"].includes(fromStage)) {
      return { success: false, error: "Chỉ có thể xuất bản từ stage Đã duyệt hoặc Đã lên lịch" };
    }
  }

  // Cập nhật task stage
  await updateTaskStage(params.taskId, newStage);

  // Ghi approval record
  await createApprovalRecord({
    taskId: params.taskId,
    reviewerId: params.reviewerId,
    reviewerName: params.reviewerName,
    action: params.action,
    comment: params.comment,
    fromStage,
    toStage: newStage,
  });

  // Ghi activity log
  const actionLabels: Record<ApprovalAction, string> = {
    submit_review: "gửi duyệt",
    approve: "duyệt",
    reject: "từ chối",
    request_revision: "yêu cầu chỉnh sửa",
    publish: "xuất bản",
  };

  await query(
    `INSERT INTO pm_task_activities
       (task_id, actor_id, actor_name, action, field_changed, new_value, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'{}')`,
    [
      params.taskId,
      params.reviewerId ?? null,
      params.reviewerName ?? null,
      actionLabels[params.action],
      "stage",
      `${fromStage} → ${newStage}`,
    ]
  );

  // Lấy task đã cập nhật
  const updatedRows = await query("SELECT * FROM pm_tasks WHERE id = $1", [params.taskId]);

  return { success: true, task: updatedRows.rows[0] as Task };
}

// ─── Calendar Data — P6.4 ────────────────────────────────────────

export async function getCalendarEvents(params: {
  year: number;
  month: number;
  filters?: {
    platforms?: string[];
    assignees?: string[];
    workflowStages?: string[];
    projectIds?: string[];
    campaignIds?: string[];
    showProductionDeadline?: boolean;
    showPublishSchedule?: boolean;
    showCampaignDeadline?: boolean;
  };
}) {
  const { year, month, filters } = params;

  // Build date range for the month
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIdx = 1;

  // Date filters
  conditions.push(`(
    (t.due_date IS NOT NULL AND t.due_date BETWEEN $${paramIdx} AND $${paramIdx + 1})
    OR (t.published_at IS NOT NULL AND t.published_at BETWEEN $${paramIdx} AND $${paramIdx + 1})
  )`);
  queryParams.push(startDate.toISOString(), endDate.toISOString());
  paramIdx += 2;

  if (filters?.platforms?.length) {
    conditions.push(`t.platform = ANY($${paramIdx})`);
    queryParams.push(filters.platforms);
    paramIdx++;
  }

  if (filters?.workflowStages?.length) {
    conditions.push(`t.status = ANY($${paramIdx})`);
    queryParams.push(filters.workflowStages);
    paramIdx++;
  }

  if (filters?.projectIds?.length) {
    conditions.push(`t.project_id = ANY($${paramIdx})`);
    queryParams.push(filters.projectIds);
    paramIdx++;
  }

  if (filters?.campaignIds?.length) {
    conditions.push(`t.campaign_id = ANY($${paramIdx})`);
    queryParams.push(filters.campaignIds);
    paramIdx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Fetch tasks
  const taskRows = await query(
    `SELECT t.*, p.name as project_name, c.name as campaign_name
     FROM pm_tasks t
     LEFT JOIN pm_projects p ON t.project_id = p.id
     LEFT JOIN pm_campaigns c ON t.campaign_id = c.id
     ${whereClause}
     ORDER BY t.due_date ASC NULLS LAST, t.published_at ASC NULLS LAST`,
    queryParams
  );

  // Fetch staff map for assignee names
  const staffRows = await query<{ id: string; full_name: string }>(
    "SELECT id, full_name FROM admin_users WHERE status = 'active'"
  );
  const staffMap: Record<string, string> = {};
  for (const row of staffRows.rows) {
    staffMap[row.id] = row.full_name;
  }

  const events: CalendarEvent[] = [];

  for (const row of taskRows.rows) {
    const task = row as Record<string, unknown>;
    const assigneeIds = (task.assignee_ids as string[] | null) ?? [];
    const assigneeNames = assigneeIds.map((id: string) => staffMap[id] ?? id);
    const tags = (task.tags as string[] | null) ?? [];
    const status = (task.status as string | null) ?? "idea";
    const publishDate = (task.published_at as string | null) ?? undefined;
    const dueDate = (task.due_date as string | null) ?? undefined;
    const platform = (task.platform as string | null) ?? undefined;

    // Compute publish status using task status
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let publishStatus: "draft" | "review" | "approved" | "scheduled" | "published" | "overdue" = "draft";
    if (status === "completed") {
      publishStatus = "published";
    } else if (dueDate) {
      const due = new Date(dueDate);
      if (due < today && !["review", "completed", "cancelled"].includes(status)) {
        publishStatus = "overdue";
      }
    }
    if (publishStatus === "draft" && publishDate) {
      const pub = new Date(publishDate);
      if (pub > today) publishStatus = "scheduled";
    }
    if (publishStatus === "draft") {
      if (status === "review") publishStatus = "review";
      else if (status === "working") publishStatus = "draft";
    }

    // Production deadline event
    if (filters?.showProductionDeadline !== false && dueDate) {
      events.push({
        id: `${String(task.id)}-due`,
        eventType: "production_deadline",
        taskId: String(task.id),
        title: String(task.title ?? ""),
        taskType: (task.task_type as string | null) ?? undefined,
        dueDate,
        workflowStage: status,
        publishStatus: publishStatus as CalendarEvent["publishStatus"],
        platform: platform as CalendarEvent["platform"],
        assigneeIds,
        assigneeNames,
        projectId: task.project_id ? String(task.project_id) : undefined,
        projectName: task.project_name as string | undefined,
        campaignId: task.campaign_id ? String(task.campaign_id) : undefined,
        campaignName: task.campaign_name as string | undefined,
        tags,
        taskUrl: `/tasks/${task.id}`,
        websiteUrl: (task.website_url as string | null) ?? undefined,
        youtubeUrl: (task.youtube_url as string | null) ?? undefined,
        tiktokUrl: (task.tiktok_url as string | null) ?? undefined,
        facebookUrl: (task.facebook_url as string | null) ?? undefined,
      });
    }

    // Publish schedule event
    if (filters?.showPublishSchedule !== false && publishDate) {
      events.push({
        id: `${String(task.id)}-pub`,
        eventType: "publish_schedule",
        taskId: String(task.id),
        title: String(task.title ?? ""),
        taskType: (task.task_type as string | null) ?? undefined,
        publishDate,
        dueDate,
        workflowStage: status,
        publishStatus: publishStatus as CalendarEvent["publishStatus"],
        platform: platform as CalendarEvent["platform"],
        assigneeIds,
        assigneeNames,
        projectId: task.project_id ? String(task.project_id) : undefined,
        projectName: task.project_name as string | undefined,
        campaignId: task.campaign_id ? String(task.campaign_id) : undefined,
        campaignName: task.campaign_name as string | undefined,
        tags,
        taskUrl: `/tasks/${task.id}`,
        websiteUrl: (task.website_url as string | null) ?? undefined,
        youtubeUrl: (task.youtube_url as string | null) ?? undefined,
        tiktokUrl: (task.tiktok_url as string | null) ?? undefined,
        facebookUrl: (task.facebook_url as string | null) ?? undefined,
      });
    }
  }

  // Fetch campaigns with deadlines in range
  if (filters?.showCampaignDeadline !== false) {
    const campaignRows = await query(
      `SELECT c.*, p.name as project_name
       FROM pm_campaigns c
       LEFT JOIN pm_projects p ON c.project_id = p.id
       WHERE c.end_date IS NOT NULL
         AND c.end_date BETWEEN $1 AND $2
       ORDER BY c.end_date ASC`,
      [startDate.toISOString(), endDate.toISOString()]
    );

    for (const row of campaignRows.rows) {
      const campaign = row as Record<string, unknown>;
      events.push({
        id: `campaign-${String(campaign.id)}`,
        eventType: "campaign_deadline" as const,
        taskId: "",
        title: `Deadline: ${String(campaign.name ?? "")}`,
        dueDate: campaign.end_date as string,
        publishDate: undefined,
        workflowStage: undefined,
        publishStatus: "draft",
        platform: undefined,
        assigneeIds: [],
        assigneeNames: [],
        projectId: campaign.project_id ? String(campaign.project_id) : undefined,
        projectName: campaign.project_name as string | undefined,
        campaignId: String(campaign.id),
        campaignName: campaign.name as string | undefined,
        tags: [],
        taskUrl: `/campaigns/${campaign.id}`,
      });
    }
  }

  return events;
}

export async function getCalendarStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  type CountRow = { c: string };
  const [thisWeekRows, approvedRows, overdueRows, scheduledRows] = await Promise.all([
    query<CountRow>(
      `SELECT COUNT(*) as c FROM pm_tasks
       WHERE (due_date BETWEEN $1 AND $2)
          OR (published_at BETWEEN $1 AND $2)`,
      [today.toISOString(), weekEnd.toISOString()]
    ),
    query<CountRow>(
      `SELECT COUNT(*) as c FROM pm_tasks
       WHERE status = 'review'
         AND (published_at IS NULL OR published_at > $1)`,
      [today.toISOString()]
    ),
    query<CountRow>(
      `SELECT COUNT(*) as c FROM pm_tasks
       WHERE due_date < $1
         AND status NOT IN ('completed', 'cancelled')`,
      [today.toISOString()]
    ),
    query<CountRow>(
      `SELECT COUNT(*) as c FROM pm_tasks
       WHERE published_at IS NOT NULL
         AND published_at >= $1
         AND published_at <= $2
         AND status = 'completed'`,
      [today.toISOString(), monthEnd.toISOString()]
    ),
  ]);

  return {
    thisWeek: parseInt(thisWeekRows.rows[0]?.c ?? "0"),
    approvedNotPublished: parseInt(approvedRows.rows[0]?.c ?? "0"),
    overdue: parseInt(overdueRows.rows[0]?.c ?? "0"),
    scheduledThisMonth: parseInt(scheduledRows.rows[0]?.c ?? "0"),
  };
}

// ─── Notifications — P6.5 ────────────────────────────────────────

export async function getNotifications(params: {
  userId: string;
  filters?: {
    types?: string[];
    isRead?: boolean;
    since?: string;
  };
  limit: number;
  offset: number;
}) {
  const { userId, filters, limit, offset } = params;

  const conditions: string[] = ["user_id = $1"];
  const queryParams: unknown[] = [userId];
  let idx = 2;

  if (filters?.types?.length) {
    conditions.push(`type = ANY($${idx})`);
    queryParams.push(filters.types);
    idx++;
  }

  if (filters?.isRead !== undefined) {
    conditions.push(`is_read = $${idx}`);
    queryParams.push(filters.isRead);
    idx++;
  }

  if (filters?.since) {
    conditions.push(`created_at >= $${idx}`);
    queryParams.push(filters.since);
    idx++;
  }

  const where = conditions.join(" AND ");

  const { rows } = await query(
    `SELECT * FROM pm_notifications
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...queryParams, limit, offset]
  );

  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    userName: r.user_name as string | undefined,
    type: String(r.type),
    title: String(r.title),
    message: r.message as string | undefined,
    entityType: r.entity_type as string | undefined,
    entityId: r.entity_id ? String(r.entity_id) : undefined,
    isRead: Boolean(r.is_read),
    dedupKey: r.dedup_key as string | undefined,
    metadata: r.metadata as Record<string, unknown>,
    createdAt: String(r.created_at),
  }));
}

export async function getNotificationCount(params: {
  userId: string;
  filters?: {
    types?: string[];
    isRead?: boolean;
    since?: string;
  };
}) {
  const { userId, filters } = params;

  const conditions: string[] = ["user_id = $1"];
  const queryParams: unknown[] = [userId];
  let idx = 2;

  if (filters?.types?.length) {
    conditions.push(`type = ANY($${idx})`);
    queryParams.push(filters.types);
    idx++;
  }

  if (filters?.isRead !== undefined) {
    conditions.push(`is_read = $${idx}`);
    queryParams.push(filters.isRead);
    idx++;
  }

  if (filters?.since) {
    conditions.push(`created_at >= $${idx}`);
    queryParams.push(filters.since);
    idx++;
  }

  const where = conditions.join(" AND ");

  const countRow = { total: "0", unread: "0" };
  const { rows } = await query<{ total: string; unread: string }>(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE is_read = false) as unread
     FROM pm_notifications
     WHERE ${where}`,
    queryParams
  );

  if (rows[0]) {
    countRow.total = String(rows[0].total);
    countRow.unread = String(rows[0].unread);
  }

  return {
    total: parseInt(countRow.total),
    unread: parseInt(countRow.unread),
  };
}

export async function markNotificationsRead(params: {
  userId: string;
  notificationIds: string[];
}) {
  await query(
    `UPDATE pm_notifications
     SET is_read = true
     WHERE id = ANY($1) AND user_id = $2`,
    [params.notificationIds, params.userId]
  );
}

export async function markAllNotificationsRead(params: { userId: string }) {
  await query(
    `UPDATE pm_notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [params.userId]
  );
}

export async function createNotification(params: {
  userId: string;
  userName?: string;
  type: string;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  dedupKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const { rows } = await query(
    `SELECT * FROM create_notification($1)`,
    [JSON.stringify({
      user_id: params.userId,
      user_name: params.userName,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_type: params.entityType,
      entity_id: params.entityId,
      is_read: false,
      dedup_key: params.dedupKey,
      metadata: params.metadata ?? {},
    })]
  );
  const result = rows[0] as { id: string } | undefined;
  return result?.id ?? null;
}

export async function getAdmins(): Promise<{ id: string; name: string }[]> {
  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id, full_name as name FROM admin_users WHERE role IN ('admin', 'super_admin')`
  );
  return rows;
}

// ─── KPI — P6.6 ───────────────────────────────────────────────

export async function getWorkspaceKpiOverview() {
  const { rows } = await query(
    `SELECT * FROM v_kpi_overview`
  );
  const r = rows[0] as Record<string, unknown>;
  return {
    tasksInProgress: parseInt(String(r?.tasks_in_progress ?? "0")),
    tasksPublished: parseInt(String(r?.tasks_published ?? "0")),
    tasksOverdue: parseInt(String(r?.tasks_overdue ?? "0")),
    tasksDueThisWeek: parseInt(String(r?.tasks_due_this_week ?? "0")),
    approvalsApproved30d: parseInt(String(r?.approvals_approved_30d ?? "0")),
    approvalsRejected30d: parseInt(String(r?.approvals_rejected_30d ?? "0")),
    approvalsSubmitted30d: parseInt(String(r?.approvals_submitted_30d ?? "0")),
    publishedFacebook: parseInt(String(r?.published_facebook ?? "0")),
    publishedWebsite: parseInt(String(r?.published_website ?? "0")),
    publishedTiktok: parseInt(String(r?.published_tiktok ?? "0")),
    publishedYoutube: parseInt(String(r?.published_youtube ?? "0")),
    publishedZalo: parseInt(String(r?.published_zalo ?? "0")),
    approvedNotPublished: parseInt(String(r?.approved_not_published ?? "0")),
    publishedThisMonth: parseInt(String(r?.published_this_month ?? "0")),
    publishedThisWeek: parseInt(String(r?.published_this_week ?? "0")),
    activeCampaigns: parseInt(String(r?.active_campaigns ?? "0")),
    overdueCampaigns: parseInt(String(r?.overdue_campaigns ?? "0")),
    activeInterns: parseInt(String(r?.active_interns ?? "0")),
  };
}

export async function getUserKpiList() {
  const { rows } = await query(
    `SELECT * FROM v_kpi_user_performance ORDER BY tasks_assigned DESC`
  );
  return (rows as Record<string, unknown>[]).map((r) => {
    const assigned = parseInt(String(r.tasks_assigned ?? "0"));
    const completed = parseInt(String(r.tasks_completed ?? "0"));
    const overdue = parseInt(String(r.tasks_overdue ?? "0"));
    return {
      userId: String(r.user_id ?? ""),
      userName: String(r.user_name ?? "Unknown"),
      role: String(r.role ?? "viewer"),
      tasksAssigned: assigned,
      tasksCompleted: completed,
      tasksInProgress: parseInt(String(r.tasks_in_progress ?? "0")),
      tasksOverdue: overdue,
      tasksDueThisWeek: parseInt(String(r.tasks_due_this_week ?? "0")),
      approvalsApproved30d: parseInt(String(r.approvals_approved_30d ?? "0")),
      approvalsRejected30d: parseInt(String(r.approvals_rejected_30d ?? "0")),
      published30d: parseInt(String(r.published_30d ?? "0")),
      avgCompletionDays: parseInt(String(r.avg_completion_days ?? "0")),
      completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) / 100 : 0,
      overdueRate: assigned > 0 ? Math.round((overdue / assigned) * 100) / 100 : 0,
    };
  });
}

export async function getUserKpi(userId: string) {
  const { rows } = await query(
    `SELECT * FROM v_kpi_user_performance WHERE user_id = $1`,
    [userId]
  );
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) {
    return null;
  }
  const assigned = parseInt(String(r.tasks_assigned ?? "0"));
  const completed = parseInt(String(r.tasks_completed ?? "0"));
  const overdue = parseInt(String(r.tasks_overdue ?? "0"));
  return {
    userId: String(r.user_id ?? ""),
    userName: String(r.user_name ?? "Unknown"),
    role: String(r.role ?? "viewer"),
    tasksAssigned: assigned,
    tasksCompleted: completed,
    tasksInProgress: parseInt(String(r.tasks_in_progress ?? "0")),
    tasksOverdue: overdue,
    tasksDueThisWeek: parseInt(String(r.tasks_due_this_week ?? "0")),
    approvalsApproved30d: parseInt(String(r.approvals_approved_30d ?? "0")),
    approvalsRejected30d: parseInt(String(r.approvals_rejected_30d ?? "0")),
    published30d: parseInt(String(r.published_30d ?? "0")),
    avgCompletionDays: parseInt(String(r.avg_completion_days ?? "0")),
    completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) / 100 : 0,
    overdueRate: assigned > 0 ? Math.round((overdue / assigned) * 100) / 100 : 0,
  };
}

export async function getWeeklyTrend(weeks: number = 8) {
  const { rows } = await query(
    `SELECT * FROM get_weekly_completion_trend($1)`,
    [weeks]
  );
  return (rows as Record<string, unknown>[]).map((r) => ({
    weekStart: String(r.week_start ?? ""),
    completed: parseInt(String(r.completed ?? "0")),
    approved: parseInt(String(r.approved ?? "0")),
    published: parseInt(String(r.published ?? "0")),
  }));
}

export async function getContentKpi() {
  const [overview] = await Promise.all([getWorkspaceKpiOverview()]);

  // Fetch all tasks grouped by status
  const { rows: taskRows } = await query(
    `SELECT status, COUNT(*) as c FROM pm_tasks WHERE status != 'archived' GROUP BY status`
  );

  const byStage: Record<string, number> = {};
  for (const row of taskRows as Record<string, unknown>[]) {
    byStage[String(row.status)] = parseInt(String(row.c));
  }

  const total = Object.values(byStage).reduce((a, b) => a + b, 0);

  return {
    totalTasks: total,
    inProgress: overview.tasksInProgress,
    published: overview.tasksPublished,
    overdue: overview.tasksOverdue,
    approvedNotPublished: overview.approvedNotPublished,
    // scheduled: tasks assigned/in-progress with a future published_at (content ready to publish)
    scheduled: 0,
    byPlatform: {
      facebook: overview.publishedFacebook,
      website: overview.publishedWebsite,
      tiktok: overview.publishedTiktok,
      youtube: overview.publishedYoutube,
      zalo: overview.publishedZalo,
    },
    publishedThisWeek: overview.publishedThisWeek,
    publishedThisMonth: overview.publishedThisMonth,
  };
}

export async function getCampaignKpi(): Promise<{
  total: number;
  active: number;
  completed: number;
  overdue: number;
  completionRate: number;
}> {
  const { rows } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (
        WHERE status = 'active'
          AND end_date IS NOT NULL
          AND end_date < CURRENT_DATE
      )::int AS overdue
    FROM pm_campaigns
    WHERE deleted_at IS NULL
  `);
  const r = rows[0] as { total: number; active: number; completed: number; overdue: number };
  const total = r.total ?? 0;
  const nonCancelled = total; // all campaigns counted
  const completionRate = nonCancelled > 0 ? (r.completed ?? 0) / nonCancelled : 0;
  return {
    total,
    active: r.active ?? 0,
    completed: r.completed ?? 0,
    overdue: r.overdue ?? 0,
    completionRate,
  };
}

// ─── Comments Helpers — P6.7.1 ────────────────────────────────

export type CommentRole = "super_admin" | "admin" | "editor" | "viewer";

export interface CommentWithRole extends TaskComment {
  author_role: CommentRole;
}

/**
 * Resolve @username or @email mentions from comment content to user IDs.
 * Supports: @full_name (with spaces) and @email format.
 */
export async function resolveMentions(content: string): Promise<string[]> {
  // Match @name (with spaces allowed) and @email patterns
  const nameMatches = content.match(/@"([^"]+)"/g);
  const emailMatches = content.match(/@([^\s@,;.!?()[\]{}'"]+@[^\s@,;.!?()[\]{}'"]+\.[^\s@,;.!?()[\]{}'"]+)/g);

  const nameTerms: string[] = [];
  if (nameMatches) {
    for (const m of nameMatches) {
      nameTerms.push(m.slice(2).toLowerCase());
    }
  }

  const emailTerms: string[] = [];
  if (emailMatches) {
    for (const m of emailMatches) {
      emailTerms.push(m.slice(1).toLowerCase());
    }
  }

  if (nameTerms.length === 0 && emailTerms.length === 0) {
    return [];
  }

  // Single query to find matching users
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const term of nameTerms) {
    params.push(`%${term}%`);
    conditions.push(`LOWER(full_name) LIKE $${idx}`);
    idx++;
  }

  for (const term of emailTerms) {
    params.push(term);
    conditions.push(`LOWER(email) = $${idx}`);
    idx++;
  }

  const { rows } = await query<{ id: string }>(
    `SELECT id FROM admin_users WHERE status = 'active' AND (${conditions.join(" OR ")})`,
    params
  );

  return rows.map((r) => r.id);
}

/**
 * Get role of a user by ID.
 */
export async function getUserRole(userId: string): Promise<CommentRole> {
  const { rows } = await query<{ role: CommentRole }>(
    `SELECT role FROM admin_users WHERE id = $1`,
    [userId]
  );
  return rows[0]?.role ?? "viewer";
}

/**
 * Get task comments with author roles pre-loaded (joined from admin_users).
 */
export async function getTaskCommentsWithRoles(taskId: string): Promise<CommentWithRole[]> {
  const { rows } = await query<CommentWithRole & { author_role: CommentRole }>(
    `SELECT
       c.*,
       COALESCE(u.role, 'viewer') AS author_role
     FROM pm_task_comments c
     LEFT JOIN admin_users u ON c.author_id = u.id
     WHERE c.task_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [taskId]
  );
  return rows as CommentWithRole[];
}

// ─── Comment Activity Log — P6.7.1 ──────────────────────────────

export async function logCommentActivity(params: {
  taskId: string;
  commentId: string;
  actorId?: string;
  actorName?: string;
  action: "comment_created" | "comment_updated" | "comment_deleted";
  contentPreview?: string;
}): Promise<void> {
  await query(
    `INSERT INTO pm_task_activities
       (task_id, actor_id, actor_name, action, field_changed, new_value)
     VALUES ($1, $2, $3, $4, 'comment', $5)`,
    [
      params.taskId,
      params.actorId ?? null,
      params.actorName ?? null,
      params.action,
      params.contentPreview
        ? params.contentPreview.slice(0, 200)
        : params.action.replace(/_/g, " "),
    ]
  );
}

// ─── Activity / Audit Trail — P6.8 ────────────────────────────────

export interface ActivityRow {
  id: string;
  source_table: string;
  entity_id: string | null;
  entity_type: string;
  entity_name: string;
  actor_id: string | null;
  actor_name: string | null;
  action_type: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface GetActivitiesOptions {
  entityType?: string | string[];
  actionType?: string | string[];
  actorId?: string;
  actorName?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  /** When set, only returns activities created by this user OR related to their assigned tasks */
  internId?: string;
}

export interface GetActivitiesResult {
  data: ActivityRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getActivities(
  options: GetActivitiesOptions = {}
): Promise<GetActivitiesResult> {
  const {
    entityType,
    actionType,
    actorId,
    actorName,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
    internId,
  } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (entityType) {
    const types = Array.isArray(entityType) ? entityType : [entityType];
    conditions.push(`entity_type = ANY($${idx})`);
    params.push(types);
    idx++;
  }

  if (actionType) {
    const actions = Array.isArray(actionType) ? actionType : [actionType];
    conditions.push(`action_type = ANY($${idx})`);
    params.push(actions);
    idx++;
  }

  if (actorId) {
    conditions.push(`actor_id = $${idx}`);
    params.push(actorId);
    idx++;
  }

  if (actorName) {
    conditions.push(`actor_name ILIKE $${idx}`);
    params.push(`%${actorName}%`);
    idx++;
  }

  if (search) {
    conditions.push(`(entity_name ILIKE $${idx} OR action_type ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  if (dateFrom) {
    conditions.push(`created_at >= $${idx}`);
    params.push(dateFrom);
    idx++;
  }

  if (dateTo) {
    conditions.push(`created_at <= $${idx}`);
    params.push(dateTo);
    idx++;
  }

  // Intern filter: only see their own activities or activities on tasks assigned to them
  if (internId) {
    conditions.push(
      `(actor_id = $${idx} OR (entity_type = 'task' AND entity_id IN (SELECT id FROM pm_tasks WHERE $${idx} = ANY(assignee_ids))))`
    );
    params.push(internId);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRows = await query<{ c: string }>(
    `SELECT COUNT(*) as c FROM v_workspace_activities ${whereClause}`,
    params
  );
  const total = parseInt(countRows.rows[0]?.c ?? "0");

  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const { rows } = await query<ActivityRow>(
    `SELECT * FROM v_workspace_activities ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );

  return {
    data: rows as ActivityRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getActivitiesForExport(
  options: Omit<GetActivitiesOptions, "page" | "pageSize"> = {}
): Promise<ActivityRow[]> {
  const result = await getActivities({ ...options, page: 1, pageSize: 5000 });
  return result.data;
}

// ─── Checklist Functions (P9) ─────────────────────────────────

export interface CreateChecklistItemInput {
  title: string;
  sort_order?: number;
}

export interface UpdateChecklistItemInput {
  title?: string;
  is_completed?: boolean;
  sort_order?: number;
}

export async function getTaskChecklist(
  taskId: string
): Promise<TaskChecklistItem[]> {
  const { rows } = await query<TaskChecklistItem>(
    `SELECT * FROM pm_task_checklist_items
     WHERE task_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [taskId]
  );
  return rows;
}

export async function createChecklistItem(
  taskId: string,
  createdBy: string,
  input: CreateChecklistItemInput
): Promise<TaskChecklistItem> {
  let sortOrder = input.sort_order ?? 0;
  if (input.sort_order === undefined) {
    const res = await query<{ max: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max
       FROM pm_task_checklist_items WHERE task_id = $1`,
      [taskId]
    );
    sortOrder = res.rows[0]?.max ?? 0;
  }
  const { rows } = await query<TaskChecklistItem>(
    `INSERT INTO pm_task_checklist_items (task_id, title, sort_order, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [taskId, input.title.trim(), sortOrder, createdBy]
  );
  return rows[0];
}

export async function updateChecklistItem(
  itemId: string,
  userId: string,
  input: UpdateChecklistItemInput
): Promise<TaskChecklistItem> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIdx++}`);
    params.push(input.title.trim());
  }
  if (input.is_completed !== undefined) {
    updates.push(`is_completed = $${paramIdx++}`);
    params.push(input.is_completed);
    if (input.is_completed) {
      updates.push(`completed_by = $${paramIdx++}`);
      params.push(userId);
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else {
      updates.push(`completed_by = NULL`);
      updates.push(`completed_at = NULL`);
    }
  }
  if (input.sort_order !== undefined) {
    updates.push(`sort_order = $${paramIdx++}`);
    params.push(input.sort_order);
  }

  params.push(itemId);
  const { rows } = await query<TaskChecklistItem>(
    `UPDATE pm_task_checklist_items
     SET ${updates.join(", ")}
     WHERE id = $${paramIdx}
     RETURNING *`,
    params
  );
  if (!rows[0]) throw new Error("Checklist item not found");
  return rows[0];
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  await query("DELETE FROM pm_task_checklist_items WHERE id = $1", [itemId]);
}

export async function reorderChecklistItems(
  taskId: string,
  orderedItemIds: string[]
): Promise<void> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedItemIds.length; i++) {
      await client.query(
        `UPDATE pm_task_checklist_items
         SET sort_order = $1
         WHERE id = $2 AND task_id = $3`,
        [i, orderedItemIds[i], taskId]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getTaskChecklistProgress(
  taskId: string
): Promise<TaskChecklistProgress> {
  const { rows } = await query<{ total: number; completed: number }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_completed = TRUE)::int AS completed
     FROM pm_task_checklist_items
     WHERE task_id = $1`,
    [taskId]
  );
  const total = rows[0]?.total ?? 0;
  const completed = rows[0]?.completed ?? 0;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ─── Per-Task Activity (P9) ─────────────────────────────────

// Note: The old getTaskActivity at line 533 returns TaskActivity[] (no pagination).
// This version returns PaginatedResult<TaskActivityEntry> with JOIN for actor_name.
export async function getTaskActivityEntries(
  taskId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<TaskActivityEntry>> {
  const offset = (page - 1) * pageSize;
  const countRes = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM pm_task_activities WHERE task_id = $1`,
    [taskId]
  );
  const total = Number(countRes.rows[0]?.count ?? 0);

  const { rows } = await query<TaskActivityEntry>(
    `SELECT ta.id, ta.task_id, ta.actor_id,
            COALESCE(au.full_name, ta.actor_id::text) AS actor_name,
            ta.action, ta.field_changed, ta.old_value, ta.new_value,
            ta.metadata, ta.created_at
     FROM pm_task_activities ta
     LEFT JOIN admin_users au ON ta.actor_id = au.id
     WHERE ta.task_id = $1
     ORDER BY ta.created_at DESC
     LIMIT $2 OFFSET $3`,
    [taskId, pageSize, offset]
  );

  return {
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function logTaskActivity(
  taskId: string,
  actorId: string,
  action: TaskActivityAction,
  details?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await query(
    `INSERT INTO pm_task_activities
       (task_id, actor_id, action, field_changed, old_value, new_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      taskId,
      actorId,
      action,
      details?.field ?? null,
      details?.oldValue ?? null,
      details?.newValue ?? null,
      details?.metadata ? JSON.stringify(details.metadata) : null,
    ]
  );
}

// ─── Content Workflow Stage Derivation (Phase 3) ──────────────
// Map task status → content_status

export function deriveContentWorkflowStage(
  task: { status: string; content_status?: string; published_at?: string }
): ContentWorkflowStage {
  // Phase 3: Ưu tiên dùng content_status nếu có
  if (task.content_status) {
    return task.content_status as ContentWorkflowStage;
  }
  // Fallback: map task status cũ sang content workflow
  if (task.status === "completed" || task.status === "cancelled") {
    return "published";
  }
  if (task.status === "review") {
    return "internal_review";
  }
  if (task.status === "working") {
    return "writing";
  }
  if (task.status === "rework") {
    return "revision";
  }
  if (task.status === "assigned" || task.status === "idea") {
    return "draft";
  }
  return "draft";
}

// ============================================================
// MASTER DATA — Danh mục
// ============================================================
import type {
  MasterDataItem,
  MasterDataCategory,
  CreateMasterDataInput,
  UpdateMasterDataInput,
} from "@/lib/workspace/types-master-data";

export async function getMasterDataItems(
  category: MasterDataCategory,
  options?: { includeInactive?: boolean }
): Promise<MasterDataItem[]> {
  const { rows } = await query<MasterDataItem>(
    `SELECT * FROM pm_master_data
     WHERE category = $1 AND deleted_at IS NULL
     ${options?.includeInactive ? "" : "AND is_active = TRUE"}
     ORDER BY sort_order ASC, name ASC`,
    [category]
  );
  return rows;
}

export async function getAllMasterData(): Promise<Record<MasterDataCategory, MasterDataItem[]>> {
  const { rows } = await query<MasterDataItem>(
    `SELECT * FROM pm_master_data
     WHERE deleted_at IS NULL AND is_active = TRUE
     ORDER BY category, sort_order ASC`
  );
  const grouped: Record<string, MasterDataItem[]> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }
  return grouped as Record<MasterDataCategory, MasterDataItem[]>;
}

export async function getMasterDataById(id: string): Promise<MasterDataItem | null> {
  const { rows } = await query<MasterDataItem>(
    "SELECT * FROM pm_master_data WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  return rows[0] ?? null;
}

export async function createMasterDataItem(
  data: CreateMasterDataInput,
  _actorName: string = "System"
): Promise<MasterDataItem> {
  const { rows } = await query<MasterDataItem>(
    `INSERT INTO pm_master_data (category, code, name, description, color, bg_color, icon, sort_order, is_active, column_bg_color, column_border_color, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.category,
      data.code,
      data.name,
      data.description ?? null,
      data.color ?? "#6b7280",
      data.bg_color ?? "#f3f4f6",
      data.icon ?? null,
      data.sort_order ?? 0,
      data.is_active ?? true,
      data.column_bg_color ?? null,
      data.column_border_color ?? null,
      data.metadata ?? null,
    ]
  );
  return rows[0];
}

export async function updateMasterDataItem(
  id: string,
  data: UpdateMasterDataInput,
  _actorName: string = "System"
): Promise<MasterDataItem | null> {
  const existing = await getMasterDataById(id);
  if (!existing) return null;

  const { rows } = await query<MasterDataItem>(
    `UPDATE pm_master_data SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       color = COALESCE($4, color),
       bg_color = COALESCE($5, bg_color),
       icon = COALESCE($6, icon),
       sort_order = COALESCE($7, sort_order),
       is_active = COALESCE($8, is_active),
       column_bg_color = COALESCE($9, column_bg_color),
       column_border_color = COALESCE($10, column_border_color),
       metadata = COALESCE($11, metadata)
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id,
      data.name ?? null,
      data.description ?? null,
      data.color ?? null,
      data.bg_color ?? null,
      data.icon ?? null,
      data.sort_order ?? null,
      data.is_active ?? null,
      data.column_bg_color ?? null,
      data.column_border_color ?? null,
      data.metadata ?? null,
    ]
  );

  return rows[0] ?? null;
}

export async function softDeleteMasterDataItem(
  id: string,
  _actorName: string = "System"
): Promise<boolean> {
  const existing = await getMasterDataById(id);
  if (!existing) return false;
  if (existing.is_system) return false;

  await query(
    `UPDATE pm_master_data SET deleted_at = NOW() WHERE id = $1`,
    [id]
  );
  return true;
}

export async function restoreMasterDataItem(
  id: string,
  _actorName: string = "System"
): Promise<boolean> {
  const { rows } = await query<MasterDataItem>(
    `UPDATE pm_master_data SET deleted_at = NULL, is_active = TRUE
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows.length > 0;
}

// ─── Workflow auto-generation ────────────────────────────────────────

export interface Workflow {
  id: string;
  workflow_type: string;
  task_id: string;
  title: string;
  description?: string | null;
  content_title?: string | null;
  content_hook?: string | null;
  content_goal?: string | null;
  related_product?: string | null;
  content_body?: string | null;
  call_to_action?: string | null;
  reference_links?: string[] | null;
  platform?: string | null;
  published_url?: string | null;
  published_at?: string | null;
  status: string;
  progress: number;
  project_id?: string | null;
  campaign_id?: string | null;
  assignee_ids?: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

function mapWorkflowRow(r: Record<string, unknown>): Workflow {
  return {
    ...r,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  } as Workflow;
}

/** Get workflow by task_id (1:1 relationship) */
export async function getWorkflowByTaskId(taskId: string): Promise<Workflow | null> {
  const { rows } = await query<Record<string, unknown>>(
    "SELECT * FROM pm_workflows WHERE task_id = $1 AND deleted_at IS NULL",
    [taskId]
  );
  return rows[0] ? mapWorkflowRow(rows[0]) : null;
}

/** Create a workflow linked to a task. */
export async function createWorkflow(data: {
  taskId: string;
  workflowType: string;
  title: string;
  description?: string;
  contentTitle?: string;
  contentHook?: string;
  contentGoal?: string;
  relatedProduct?: string;
  contentBody?: string;
  callToAction?: string;
  referenceLinks?: string[];
  platform?: string;
  platformIds?: string[];
  projectId?: string;
  campaignId?: string;
  assigneeIds?: string[];
  taskStatus?: string;
}): Promise<Workflow> {
  const { rows } = await query<Record<string, unknown>>(
    `INSERT INTO pm_workflows
       (task_id, workflow_type, title, description, content_title, content_hook,
        content_goal, related_product, content_body, call_to_action, reference_links,
        platform, platform_ids, project_id, campaign_id, assignee_ids, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      data.taskId,
      data.workflowType,
      data.title,
      data.description ?? null,
      data.contentTitle ?? null,
      data.contentHook ?? null,
      data.contentGoal ?? null,
      data.relatedProduct ?? null,
      data.contentBody ?? null,
      data.callToAction ?? null,
      data.referenceLinks ?? null,
      data.platform ?? null,
      data.platformIds ?? null,
      data.projectId ?? null,
      data.campaignId ?? null,
      data.assigneeIds ?? null,
      data.taskStatus ?? "idea",
    ]
  );
  return mapWorkflowRow(rows[0]);
}

/** Update workflow status and/or linked fields. */
export async function updateWorkflow(
  id: string,
  data: {
    status?: string;
    progress?: number;
    contentTitle?: string;
    contentHook?: string;
    contentGoal?: string;
    contentBody?: string;
    callToAction?: string;
    relatedProduct?: string;
    platform?: string;
    platformIds?: string[];
    publishedUrl?: string;
    assigneeIds?: string[];
    workflowType?: string;
  }
): Promise<Workflow | null> {
  const fields: string[] = ["updated_at = NOW()"];
  const vals: unknown[] = [];
  let p = 1;

  if (data.status !== undefined) {
    fields.push(`status = $${p++}`);
    vals.push(data.status);
  }
  if (data.progress !== undefined) {
    fields.push(`progress = $${p++}`);
    vals.push(data.progress);
  }
  if (data.contentTitle !== undefined) {
    fields.push(`content_title = $${p++}`);
    vals.push(data.contentTitle);
  }
  if (data.contentHook !== undefined) {
    fields.push(`content_hook = $${p++}`);
    vals.push(data.contentHook);
  }
  if (data.contentGoal !== undefined) {
    fields.push(`content_goal = $${p++}`);
    vals.push(data.contentGoal);
  }
  if (data.contentBody !== undefined) {
    fields.push(`content_body = $${p++}`);
    vals.push(data.contentBody);
  }
  if (data.callToAction !== undefined) {
    fields.push(`call_to_action = $${p++}`);
    vals.push(data.callToAction);
  }
  if (data.relatedProduct !== undefined) {
    fields.push(`related_product = $${p++}`);
    vals.push(data.relatedProduct);
  }
  if (data.platform !== undefined) {
    fields.push(`platform = $${p++}`);
    vals.push(data.platform);
  }
  if (data.platformIds !== undefined) {
    fields.push(`platform_ids = $${p++}`);
    vals.push(data.platformIds);
  }
  if (data.publishedUrl !== undefined) {
    fields.push(`published_url = $${p++}`);
    vals.push(data.publishedUrl);
    if (data.publishedUrl) {
      fields.push(`published_at = NOW()`);
    }
  }
  if (data.assigneeIds !== undefined) {
    fields.push(`assignee_ids = $${p++}`);
    vals.push(data.assigneeIds);
  }
  if (data.workflowType !== undefined) {
    fields.push(`workflow_type = $${p++}`);
    vals.push(data.workflowType);
  }

  vals.push(id);
  const { rows } = await query<Record<string, unknown>>(
    `UPDATE pm_workflows SET ${fields.join(", ")}
     WHERE id = $${p} AND deleted_at IS NULL
     RETURNING *`,
    vals
  );
  return rows[0] ? mapWorkflowRow(rows[0]) : null;
}

/** Soft-delete a workflow. */
export async function deleteWorkflow(id: string): Promise<boolean> {
  const { rows } = await query(
    `UPDATE pm_workflows SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return rows.length > 0;
}

