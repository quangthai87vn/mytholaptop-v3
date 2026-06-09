# 03_WORKSPACE_DATABASE_RULES.md

## Database Access

All database operations for the Workspace module go through `lib/workspace/db/index.ts`.

**Rules:**
- Do not write raw SQL in API routes
- Do not import DB functions in client components — use API routes as bridge
- All mutations must include `actorName` or `actorId` for audit logging

## Tables

### pm_projects
```
id, name, description, status, start_date, end_date,
created_by, created_at, updated_at
```

### pm_campaigns
```
id, project_id, name, campaign_type, status,
start_date, end_date, created_by, created_at, updated_at
```

### pm_tasks
```
id, project_id, campaign_id, title, description,
task_type, status, priority, due_date, published_at,
assignee_ids (uuid[]), platform (text — DEPRECATED),
metadata (jsonb) — contains platform_ids[], tags[]
is_archived (boolean), created_by, created_at, updated_at
```

**Critical:** `assignee_ids` is a PostgreSQL array. Query with:
```sql
WHERE $1 = ANY(assignee_ids)
```

### pm_workflows
```
id, task_id (FK pm_tasks), status, progress,
platform_ids (uuid[]), assignee_ids (uuid[]),
created_at, updated_at, deleted_at
```
- 1:1 relationship with `pm_tasks`
- Created automatically when task is created with task_type that has `createWorkflow=true`

### pm_master_data
```
id, category, code, name, sort_order,
color, bg_color, is_active, is_system,
metadata (jsonb) — contains createWorkflow, etc.
deleted_at, created_at, updated_at
```

### pm_task_activities
```
id, task_id (FK pm_tasks), actor_id (FK admin_users),
action, details (jsonb), created_at
```

### pm_task_comments
```
id, task_id (FK pm_tasks), author_id (FK admin_users),
content, deleted_at, created_at, updated_at
```

### pm_task_approvals
```
id, task_id (FK pm_tasks), approver_id (FK admin_users),
action (submitted|approved|rejected|revision_requested),
notes, created_at
```

## Master Data Categories

| Category | System Item | Used For |
|----------|-------------|---------|
| `task_status` | Yes (all) | Kanban columns, status filters |
| `task_type` | Yes | Task form, workflow generation |
| `channel` | No | Platform filter |
| `campaign_type` | No | Campaign form |
| `campaign_status` | No | Campaign filters |
| `workflow_stage` | Yes | Media workflow stages |

## Important Queries

### Filter tasks by assignee
```sql
WHERE $1 = ANY(assignee_ids)
```

### Filter tasks by platform (from metadata)
```sql
WHERE metadata->>'platform_ids' ? $1
-- or with array overlap
WHERE metadata->'platform_ids' ?| array[$1]
```

### Get tasks due this week
```sql
WHERE due_date >= $weekStart AND due_date <= $weekEnd
   OR published_at >= $weekStart AND published_at <= $weekEnd
```

### Archive (soft-delete)
```sql
UPDATE pm_tasks SET is_archived = TRUE WHERE id = $1
-- Never DELETE unless super_admin hard-delete
```

## Transaction Rules

- Use transactions for multi-step operations (e.g., creating task + workflow)
- Include `actorName` in every mutation function call for audit trail
- Never expose raw error messages to client — log internally, return generic message
