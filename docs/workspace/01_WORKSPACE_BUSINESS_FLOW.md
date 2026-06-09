# 01_WORKSPACE_BUSINESS_FLOW.md

## Workspace Business Flow

### High-Level Flow

```
User creates Project
  └── User creates Campaign under Project
        └── User creates Tasks under Project/Campaign
              └── Assignee works on task
                    └── Submits for review (status → review)
                          └── Admin approves or requests revision
                                └── Admin marks complete
                                      └── Task locked for editing
```

## User Roles and Permissions

| Role | Create | Edit Own | Edit All | Delete | Approve | Archive |
|------|--------|----------|----------|--------|---------|---------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Intern | ❌ | Own only | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Task Lifecycle

```
idea → assigned → working → review → approved → completed
                                       ↘ rework → working → review
         ↓
      cancelled

Any non-cancelled/non-completed → archived (soft-delete)
```

### Status Definitions

| Status Code | Label | Description |
|-------------|-------|-------------|
| `idea` | Ý tưởng | Task created, not yet assigned |
| `assigned` | Đã giao | Assigned to employee |
| `working` | Đang thực hiện | In progress |
| `review` | Chờ duyệt | Submitted for approval |
| `approved` | Đã duyệt | Approved by admin |
| `completed` | Hoàn thành | Done and published/locked |
| `rework` | Cần sửa | Revision requested |
| `cancelled` | Hủy | Cancelled |

### Locking Rules

- `completed` and `approved` tasks are **locked** — no editing by interns/editors
- Only `super_admin` and `admin` can unlock and re-edit completed tasks
- Locking is enforced on **both** API (`PUT /api/tasks/[id]`) and **UI** (hide Edit button)
- `archived` tasks are hidden from the active Kanban view, visible only in archive filter

## Project → Campaign → Task Hierarchy

```
Project
├── Campaign A
│   ├── Task 1 (platform: Facebook, Website)
│   ├── Task 2 (platform: TikTok)
│   └── Task 3 (platform: Instagram, YouTube)
└── Campaign B
    └── Task 4
```

- One task belongs to **one** project (optional)
- One task belongs to **one** campaign (optional)
- One task can span **multiple** platforms (stored in `metadata.platform_ids`)
- Task type determines workflow (Article → has workflow steps, Idea → no workflow)

## Calendar Events

Calendar renders task events in two types:

| Event Type | Source | Trigger |
|-----------|--------|---------|
| `production_deadline` | `pm_tasks.due_date` | Task has a due date |
| `publish_schedule` | `pm_tasks.published_at` | Task has a publish date |
| `campaign_deadline` | `pm_campaigns.end_date` | Campaign has an end date |

Calendar does NOT show tasks without due_date or published_at.

## Master Data

All dropdowns and filter options come from `pm_master_data`. The system codes are:

| Category | Used By |
|----------|---------|
| `task_status` | Task status filter, Kanban columns, status combobox |
| `task_type` | Task type filter, task form |
| `channel` | Platform filter, task form (platforms) |
| `campaign_type` | Campaign type combobox |
| `campaign_status` | Campaign status filter |
| `workflow_stage` | Media workflow stages |

**Never hardcode these values in UI code.**
