// ============================================================
// Workspace Module — Database Operations
// ============================================================

import { query, transaction } from "@/lib/db";
import type {
  Project,
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
} from "../types";

// ─── Projects ─────────────────────────────────────────────────────

export async function getProjects(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<Project[]> {
  let sql = `
    SELECT p.*,
      (SELECT COUNT(*) FROM pm_tasks WHERE project_id = p.id) AS task_count,
      (SELECT COUNT(*) FROM pm_campaigns WHERE project_id = p.id) AS campaign_count
    FROM pm_projects p
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND p.status = $${params.length}`;
  }
  if (filters?.priority) {
    params.push(filters.priority);
    sql += ` AND p.priority = $${params.length}`;
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    sql += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
  }

  sql += " ORDER BY p.created_at DESC";

  const { rows } = await query<{
    id: string;
    name: string;
    description: string | null;
    status: Project["status"];
    priority: Project["priority"];
    color: string;
    start_date: string | null;
    end_date: string | null;
    budget: string | null;
    owner_id: string | null;
    team_ids: string[];
    tags: string[];
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    task_count: string;
    campaign_count: string;
  }>(sql, params);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    status: r.status,
    priority: r.priority,
    color: r.color,
    start_date: r.start_date ?? undefined,
    end_date: r.end_date ?? undefined,
    budget: r.budget ? parseFloat(r.budget) : undefined,
    owner_id: r.owner_id ?? undefined,
    team_ids: r.team_ids,
    tags: r.tags,
    metadata: r.metadata,
    created_at: r.created_at,
    updated_at: r.updated_at,
    _count: {
      tasks: parseInt(r.task_count),
      campaigns: parseInt(r.campaign_count),
    },
  }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { rows } = await query<Project & { task_count: string; campaign_count: string }>(
    `SELECT p.*,
      (SELECT COUNT(*) FROM pm_tasks WHERE project_id = p.id) AS task_count,
      (SELECT COUNT(*) FROM pm_campaigns WHERE project_id = p.id) AS campaign_count
     FROM pm_projects p WHERE p.id = $1`,
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
  data: Omit<Project, "id" | "created_at" | "updated_at" | "_count">
): Promise<Project> {
  const { rows } = await query<Project>(
    `INSERT INTO pm_projects (name, description, status, priority, color, start_date, end_date, budget, owner_id, team_ids, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      data.name,
      data.description ?? null,
      data.status,
      data.priority,
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
  return rows[0];
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<Project | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    "name", "description", "status", "priority", "color",
    "start_date", "end_date", "budget", "owner_id", "team_ids", "tags", "metadata",
  ] as const;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (fields.length === 0) return getProjectById(id);

  values.push(id);
  const { rows } = await query<Project>(
    `UPDATE pm_projects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  await query("DELETE FROM pm_projects WHERE id = $1", [id]);
}

// ─── Campaigns ───────────────────────────────────────────────────

export async function getCampaigns(filters?: {
  project_id?: string;
  status?: string;
}): Promise<Campaign[]> {
  let sql = "SELECT * FROM pm_campaigns WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.project_id) {
    params.push(filters.project_id);
    sql += ` AND project_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }

  sql += " ORDER BY created_at DESC";
  const { rows } = await query<Campaign>(sql, params);
  return rows;
}

export async function createCampaign(
  data: Omit<Campaign, "id" | "created_at" | "updated_at">
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
  return rows[0];
}

// ─── Tasks ───────────────────────────────────────────────────────

export async function getTasks(filters?: {
  project_id?: string;
  campaign_id?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  search?: string;
}): Promise<Task[]> {
  let sql = "SELECT * FROM pm_tasks WHERE 1=1";
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
  if (filters?.priority) {
    params.push(filters.priority);
    sql += ` AND priority = $${params.length}`;
  }
  if (filters?.assignee_id) {
    params.push(filters.assignee_id);
    sql += ` AND $${params.length} = ANY(assignee_ids)`;
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    sql += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
  }

  sql += " ORDER BY due_date ASC NULLS LAST, created_at DESC";
  const { rows } = await query<Task>(sql, params);
  return rows;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { rows } = await query<Task>(
    "SELECT * FROM pm_tasks WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function createTask(
  data: Omit<Task, "id" | "created_at" | "updated_at">
): Promise<Task> {
  const { rows } = await query<Task>(
    `INSERT INTO pm_tasks (project_id, campaign_id, parent_task_id, title, description, status, priority, stage, assignee_ids, reporter_id, start_date, due_date, estimated_hours, actual_hours, tags, attachments, dependencies, progress, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      data.project_id ?? null,
      data.campaign_id ?? null,
      data.parent_task_id ?? null,
      data.title,
      data.description ?? null,
      data.status,
      data.priority,
      data.stage ?? null,
      data.assignee_ids,
      data.reporter_id ?? null,
      data.start_date ?? null,
      data.due_date ?? null,
      data.estimated_hours ?? null,
      data.actual_hours ?? null,
      data.tags,
      data.attachments ?? [],
      data.dependencies,
      data.progress,
      data.metadata ?? {},
    ]
  );

  await query(
    `INSERT INTO pm_task_activities (task_id, action, new_value, actor_name)
     VALUES ($1, 'created', $2, 'System')`,
    [rows[0].id, data.title]
  );

  return rows[0];
}

export async function updateTask(
  id: string,
  data: Partial<Task>
): Promise<Task | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    "title", "description", "status", "priority", "stage",
    "assignee_ids", "reporter_id", "start_date", "due_date",
    "estimated_hours", "actual_hours", "tags", "attachments",
    "dependencies", "progress", "metadata",
  ] as const;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (data.status === "done") {
    fields.push("completed_at = CURRENT_TIMESTAMP");
  }

  if (fields.length === 0) return getTaskById(id);

  values.push(id);
  const { rows } = await query<Task>(
    `UPDATE pm_tasks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (rows[0] && data.status) {
    await query(
      `INSERT INTO pm_status_history (entity_type, entity_id, to_status)
       VALUES ('task', $1, $2)`,
      [id, data.status]
    );
  }

  return rows[0] ?? null;
}

export async function bulkUpdateTaskStatus(
  updates: { id: string; status: string }[]
): Promise<void> {
  for (const u of updates) {
    await query(
      "UPDATE pm_tasks SET status = $1 WHERE id = $2",
      [u.status, u.id]
    );
    await query(
      `INSERT INTO pm_status_history (entity_type, entity_id, to_status)
       VALUES ('task', $1, $2)`,
      [u.id, u.status]
    );
  }
}

export async function deleteTask(id: string): Promise<void> {
  await query("DELETE FROM pm_tasks WHERE id = $1", [id]);
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

export async function getTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const { rows } = await query<TaskActivity>(
    "SELECT * FROM pm_task_activities WHERE task_id = $1 ORDER BY created_at DESC",
    [taskId]
  );
  return rows;
}

// ─── Media Workflows ─────────────────────────────────────────────

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

export async function getMediaWorkflowById(id: string): Promise<MediaWorkflow | null> {
  const { rows } = await query<MediaWorkflow>(
    "SELECT * FROM pm_media_workflows WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

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

// ─── Workspace Stats ─────────────────────────────────────────────

export async function getWorkspaceStats(): Promise<WorkspaceStats> {
  const [
    { rows: activeProjects },
    { rows: dueTasks },
    { rows: overdueTasks },
    { rows: interns },
    { rows: publishedThisMonth },
  ] = await Promise.all([
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM pm_projects WHERE status = 'active'"
    ),
    query<{ count: string }>(`
      SELECT COUNT(*) as count FROM pm_tasks
      WHERE due_date IS NOT NULL
      AND due_date <= CURRENT_DATE + INTERVAL '7 days'
      AND status NOT IN ('done', 'cancelled')
    `),
    query<{ count: string }>(`
      SELECT COUNT(*) as count FROM pm_tasks
      WHERE due_date < CURRENT_DATE
      AND status NOT IN ('done', 'cancelled')
    `),
    query<{ count: string }>(
      "SELECT COUNT(*) as count FROM pm_interns WHERE status = 'active'"
    ),
    query<{ count: string }>(`
      SELECT COUNT(*) as count FROM pm_media_workflows
      WHERE status = 'published'
      AND published_at >= DATE_TRUNC('month', CURRENT_DATE)
    `),
  ]);

  return {
    active_projects: parseInt(activeProjects[0]?.count ?? "0"),
    due_this_week: parseInt(dueTasks[0]?.count ?? "0"),
    overdue_tasks: parseInt(overdueTasks[0]?.count ?? "0"),
    media_ready: 0,
    total_interns: parseInt(interns[0]?.count ?? "0"),
    published_this_month: parseInt(publishedThisMonth[0]?.count ?? "0"),
  };
}
