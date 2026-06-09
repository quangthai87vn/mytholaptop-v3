# Báo Cáo Phân Tích Kiến Trúc Project Management

**Ngày phân tích:** 26/05/2026  
**Dự án:** MTL Commerce Admin UI  
**Phạm vi:** Workspace Module (Projects, Campaigns, Tasks, Media Workflow, Interns, Activity)

---

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Database/Schema](#2-databaseschema)
3. [Components Liên Quan](#3-các-component-liên-quan)
4. [Flow Dữ Liệu Hiện Tại](#4-flow-dữ-liệu-hiện-tại)
5. [Điểm Sai Kiến Trúc](#5-điểm-sai-kiến-trúc)
6. [Đề Xuất Sửa Chữa](#6-đề-xuất-sửa-chữa)
7. [Sơ Đồ Flow Dữ Liệu](#7-sơ-đồ-flow-dữ-liệu)

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN UI (Next.js App Router)                     │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Dashboard   │  │  Workspace   │  │Media Workflow│               │
│  │  /workspace  │  │  /calendar   │  │  /media-     │               │
│  │  /activity   │  │             │  │  workflow     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                  │                  │                        │
│         ▼                  ▼                  ▼                        │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                    API Routes (/app/api)                       │     │
│  │  /api/tasks  │  /api/medusa/*  │  /api/migration/*         │     │
│  └──────────────────────────┬───────────────────────────────┬────┘     │
│                             │                               │           │
└─────────────────────────────┼───────────────────────────────┼───────────┘
                              │                               │
                              ▼                               │
              ┌───────────────────────────┐   ┌───────────────────────────┐
              │   PostgreSQL Workspace DB   │   │   Medusa Backend         │
              │   (pm_tasks, pm_campaigns  │   │   (products, orders)     │
              │    pm_projects, pm_interns │   │                          │
              │    pm_media_workflows*)     │   └───────────────────────────┘
              │   (*) DEPRECATED           │
              └───────────────────────────┘
```

### Vai trò của Task — Dữ Liệu Trung Tâm

**Task LÀ dữ liệu trung tâm** của toàn bộ workspace module.

- **Task** đại diện cho mọi loại công việc: content, design, video, SEO, marketing...
- Loại công việc được phân biệt bằng `task_type` field
- Kanban UI dùng `status` field (backlog → todo → in_progress → review → done)
- Media Pipeline UI dùng `workflow_stage` field (idea → writing → review → shooting → editing → scheduled → published)
- Task liên kết với Project và Campaign thông qua `project_id` và `campaign_id`

### Media Workflow — Legacy, Đang Deprecated

- Bảng `pm_media_workflows` **đã bị đánh dấu DEPRECATED** trong `types.ts`
- Mục đích: giữ lại backward compatibility
- Hướng dẫn: features mới nên dùng `Task` với `task_type` thay vì MediaWorkflow
- File `006_task_media_consolidation.sql` cố sync dữ liệu giữa 2 bảng

### Calendar và Activity

| Trang | Nguồn dữ liệu | Bảng |
|-------|----------------|------|
| `/workspace/calendar` | `GET /api/tasks` | `pm_tasks` (chỉ tasks có `due_date`) |
| `/workspace/activity` | Raw SQL UNION | `pm_task_activities` + `pm_status_history` |

---

## 2. Database/Schema

### 2.1 Bảng chính (Production)

| Bảng | File | Mô tả | Priority |
|------|------|--------|----------|
| `pm_tasks` | 002 | Task trung tâm - tất cả loại công việc | ⭐ CORE |
| `pm_projects` | - | Dự án | ⭐ CORE |
| `pm_campaigns` | 005 | Chiến dịch marketing | ⭐ CORE |
| `pm_task_comments` | 002 | Bình luận trên task | HIGH |
| `pm_task_activities` | 002 | Activity log | HIGH |
| `pm_status_history` | 002 | Lịch sử status (generic - tất cả entity) | HIGH |
| `pm_interns` | 004 | Hồ sơ thực tập sinh | MEDIUM |
| `pm_intern_rankings` | 004 | Xếp hạng thực tập sinh | MEDIUM |
| `pm_intern_kpis` | 004 | KPI theo tuần/tháng | MEDIUM |
| `pm_weekly_performance` | 004 | Đánh giá hiệu suất hàng tuần | MEDIUM |
| `pm_campaign_types` | 005 | Loại chiến dịch cố định | LOW |

### 2.2 Bảng DEPRECATED

| Bảng | Lý do | Thay thế |
|------|-------|----------|
| `pm_media_workflows` | Trùng lặp dữ liệu với pm_tasks | Dùng `pm_tasks` với `task_type` |

### 2.3 Schema Chi Tiết

#### pm_tasks
```sql
id                UUID PK
project_id        UUID FK → pm_projects
campaign_id       UUID FK → pm_campaigns (SET NULL)
parent_task_id    UUID FK → pm_tasks (self-reference)
title             VARCHAR(500) NOT NULL
description       TEXT
status            VARCHAR(50) DEFAULT 'backlog'
                  -- backlog | todo | in_progress | review | done | cancelled
priority          VARCHAR(20) DEFAULT 'medium'
                  -- low | medium | high | urgent
stage             VARCHAR(50)
                  -- idea | writing | review | shooting | editing | scheduled | published
task_type         VARCHAR(50)  -- facebook_post | tiktok_video | seo_article | ...
platform          VARCHAR(50)  -- facebook | website | tiktok | zalo | youtube | instagram
assignee_ids      UUID[]
reporter_id       UUID
start_date        DATE
due_date          DATE
estimated_hours   DECIMAL(6,2)
actual_hours      DECIMAL(6,2)
tags              TEXT[]
attachments       JSONB
dependencies      UUID[]
progress          INT (0-100)
published_at      TIMESTAMP
published_url     VARCHAR(1000)
metadata          JSONB
created_at        TIMESTAMP
updated_at        TIMESTAMP
completed_at      TIMESTAMP
```

#### pm_projects
```sql
id            UUID PK
name          VARCHAR(255) NOT NULL
description   TEXT
status        VARCHAR(50) DEFAULT 'active'
              -- active | planning | on_hold | completed | archived
priority      VARCHAR(20) DEFAULT 'medium'
color         VARCHAR(7) DEFAULT '#E60012'
start_date    DATE
end_date      DATE
budget        DECIMAL(12,2)
owner_id      UUID
team_ids      UUID[]
tags          TEXT[]
metadata      JSONB
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

#### pm_campaigns
```sql
id              UUID PK
project_id      UUID FK → pm_projects
name            VARCHAR(255) NOT NULL
description     TEXT
campaign_type   VARCHAR(50)
                -- product_launch | seasonal | social_media | seo |
                -- advertising | email_marketing | influencer | ...
status          VARCHAR(50) DEFAULT 'planning'
                -- planning | active | paused | completed | cancelled
start_date      DATE
end_date        DATE
budget          DECIMAL(12,2)
target_metrics  JSONB
actual_metrics  JSONB
channels        VARCHAR(50)[]  -- facebook | website | tiktok | zalo | youtube | instagram
tags            TEXT[]
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### pm_media_workflows (DEPRECATED)
```sql
id                      UUID PK
project_id              UUID FK → pm_projects (SET NULL)
campaign_id             UUID FK → pm_campaigns (SET NULL)
title                   VARCHAR(500) NOT NULL
description             TEXT
content_type            VARCHAR(50) NOT NULL
platform                VARCHAR(50)
status                  VARCHAR(50) DEFAULT 'idea'
ai_prompt               TEXT
ai_generated_content    TEXT
ai_model_used          VARCHAR(100)
ai_generated_at        TIMESTAMP
published_at            TIMESTAMP
published_url           VARCHAR(1000)
engagement_metrics      JSONB
assignee_ids            UUID[]
due_date                DATE
tags                    TEXT[]
attachments              JSONB
metadata                JSONB
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

#### pm_task_comments
```sql
id                UUID PK
task_id           UUID FK → pm_tasks (CASCADE)
parent_comment_id UUID FK → pm_task_comments (self-reference)
author_id         UUID NOT NULL
author_name       VARCHAR(255)
author_avatar     VARCHAR(500)
content           TEXT NOT NULL
is_ai_generated   BOOLEAN DEFAULT FALSE
mentions          UUID[]
created_at        TIMESTAMP
updated_at        TIMESTAMP
deleted_at        TIMESTAMP
```

#### pm_task_activities
```sql
id           UUID PK
task_id      UUID FK → pm_tasks (CASCADE)
actor_id     UUID
actor_name   VARCHAR(255)
action       VARCHAR(50) NOT NULL
field_changed VARCHAR(100)
old_value    TEXT
new_value    TEXT
metadata     JSONB
created_at   TIMESTAMP
```

#### pm_status_history (Generic - tất cả entity)
```sql
entity_type    VARCHAR(50) NOT NULL  -- task | project | campaign | media_workflow
entity_id      UUID NOT NULL
from_status    VARCHAR(50)
to_status      VARCHAR(50) NOT NULL
changed_by     UUID
changed_by_name VARCHAR(255)
note           TEXT
created_at     TIMESTAMP
```

#### pm_workflow_stages (DEPRECATED - cho MediaWorkflow)
```sql
id               UUID PK
workflow_id      UUID FK → pm_media_workflows (CASCADE)
stage            VARCHAR(50) NOT NULL
content          TEXT
approved_by      UUID
approved_at      TIMESTAMP
rejection_reason TEXT
reviewer_notes   TEXT
order_index      INT DEFAULT 0
metadata         JSONB
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

#### pm_workflow_comments (DEPRECATED)
```sql
id              UUID PK
workflow_id     UUID FK → pm_media_workflows (CASCADE)
stage           VARCHAR(50)
author_id       UUID NOT NULL
author_name     VARCHAR(255)
content         TEXT NOT NULL
is_ai_generated BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP
```

#### pm_ai_suggestions (DEPRECATED - có cả workflow_id và task_id)
```sql
id               UUID PK
workflow_id      UUID FK → pm_media_workflows (CASCADE)
task_id          UUID FK → pm_tasks (CASCADE)
suggestion_type  VARCHAR(50) NOT NULL
content          TEXT NOT NULL
confidence_score DECIMAL(3,2)
used             BOOLEAN DEFAULT FALSE
ai_model         VARCHAR(100)
created_at       TIMESTAMP
```

#### pm_interns
```sql
id             UUID PK
user_id        UUID
full_name      VARCHAR(255) NOT NULL
email          VARCHAR(255)
phone          VARCHAR(20)
avatar_url     VARCHAR(500)
university     VARCHAR(255)
major          VARCHAR(255)
year_of_study  INT
position       VARCHAR(100)
               -- content_intern | video_intern | design_intern | marketing_intern
start_date     DATE NOT NULL
end_date       DATE
mentor_id      UUID
status         VARCHAR(50) DEFAULT 'active'
               -- active | inactive | graduated | resigned
skills         TEXT[]
bio            TEXT
created_at     TIMESTAMP
updated_at     TIMESTAMP
```

#### pm_intern_kpis
```sql
id                  UUID PK
intern_id           UUID FK → pm_interns (CASCADE)
period_type         VARCHAR(20) NOT NULL  -- weekly | monthly
period_start        DATE NOT NULL
period_end          DATE NOT NULL
tasks_assigned       INT DEFAULT 0
tasks_completed      INT DEFAULT 0
tasks_overdue        INT DEFAULT 0
completion_rate      DECIMAL(5,2) DEFAULT 0
on_time_count        INT DEFAULT 0
late_count           INT DEFAULT 0
deadline_accuracy    DECIMAL(5,2) DEFAULT 0
revision_count       INT DEFAULT 0
quality_score        DECIMAL(3,2) DEFAULT 0
content_created      INT DEFAULT 0
content_published     INT DEFAULT 0
avg_engagement        DECIMAL(10,2) DEFAULT 0
expected_hours        DECIMAL(6,2)
actual_hours          DECIMAL(6,2)
attendance_rate        DECIMAL(5,2) DEFAULT 0
notes                 TEXT
created_at            TIMESTAMP
updated_at            TIMESTAMP
-- UNIQUE(intern_id, period_type, period_start)
```

#### pm_weekly_performance
```sql
id                      UUID PK
intern_id               UUID FK → pm_interns (CASCADE)
week_start             DATE NOT NULL
overall_score          DECIMAL(3,2) DEFAULT 0
productivity_score     DECIMAL(3,2) DEFAULT 0
quality_score          DECIMAL(3,2) DEFAULT 0
teamwork_score         DECIMAL(3,2) DEFAULT 0
initiative_score        DECIMAL(3,2) DEFAULT 0
accomplishments         TEXT
areas_for_improvement   TEXT
mentor_feedback         TEXT
intern_self_reflection   TEXT
rating                  VARCHAR(20)  -- excellent | good | needs_improvement | poor
created_at              TIMESTAMP
updated_at              TIMESTAMP
-- UNIQUE(intern_id, week_start)
```

#### pm_intern_rankings
```sql
id                  UUID PK
intern_id           UUID FK → pm_interns (CASCADE)
period_type         VARCHAR(20) NOT NULL
period_start        DATE NOT NULL
period_end          DATE NOT NULL
overall_rank        INT
productivity_rank   INT
quality_rank        INT
deadline_rank       INT
overall_score       DECIMAL(5,2)
productivity_score  DECIMAL(5,2)
quality_score       DECIMAL(5,2)
deadline_score      DECIMAL(5,2)
trend               VARCHAR(20)  -- up | down | stable
trend_change        DECIMAL(4,2)
created_at          TIMESTAMP
-- UNIQUE(intern_id, period_type, period_start)
```

#### pm_campaign_types
```sql
id           UUID PK
code         VARCHAR(50) UNIQUE NOT NULL
name         VARCHAR(255) NOT NULL
description  TEXT
icon         VARCHAR(50)
color        VARCHAR(7) DEFAULT '#64748b'
sort_order   INT DEFAULT 0
is_active    BOOLEAN DEFAULT TRUE
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

### 2.4 Mối Quan Hệ (Foreign Keys)

```
pm_projects ──────────────────────────────┐
    │                                    │
    ├───→ pm_tasks.project_id           │
    │                                    │
    ├───→ pm_media_workflows.project_id │
    │    (DEPRECATED)                   │
    │                                    │
    └───→ pm_campaigns.project_id        │

pm_campaigns ────────────────────────────┐
    │                                   │
    ├───→ pm_tasks.campaign_id         │
    │    (ON DELETE SET NULL)          │
    │                                   │
    └───→ pm_media_workflows.campaign_id│
         (ON DELETE SET NULL)           │
         (DEPRECATED)                    │

pm_tasks ──────────────────────────────────────────┐
    │                                                │
    ├───→ pm_tasks.parent_task_id (self-reference)   │
    │                                                │
    ├───→ pm_task_comments.task_id (CASCADE)        │
    │                                                │
    ├───→ pm_task_activities.task_id (CASCADE)      │
    │                                                │
    ├───→ pm_ai_suggestions.task_id (CASCADE)        │
    │                                                │
    └───→ pm_workflow_stages (qua workflow)          │
                                                     │
pm_media_workflows ─────────────────────────────────┤ (DEPRECATED)
    │                                                │
    ├───→ pm_workflow_stages.workflow_id (CASCADE)  │
    │                                                │
    └───→ pm_workflow_comments.workflow_id (CASCADE)│
                                                     │
pm_interns ──────────────────────────────────────────┤
    │                                                │
    ├───→ pm_intern_kpis.intern_id (CASCADE)        │
    │                                                │
    ├───→ pm_weekly_performance.intern_id (CASCADE)  │
    │                                                │
    └───→ pm_intern_rankings.intern_id (CASCADE)    │
```

### 2.5 Triggers và Functions Đặc Biệt

#### Triggers `update_*_updated_at` (tất cả bảng chính)
```sql
CREATE TRIGGER update_pm_tasks_updated_at
    BEFORE UPDATE ON pm_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```
> Tự động cập nhật `updated_at` khi có thay đổi.

#### Function `auto_complete_expired_campaigns()` (005)
```sql
CREATE OR REPLACE FUNCTION auto_complete_expired_campaigns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_date < CURRENT_DATE
       AND OLD.status = 'active'
       AND NEW.status = 'active'
       AND NEW.end_date < OLD.end_date THEN
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_complete_campaigns
    BEFORE UPDATE ON pm_campaigns
    FOR EACH ROW
    EXECUT E FUNCTION auto_complete_expired_campaigns();
```
> Tự động chuyển campaign sang `completed` khi hết hạn.

#### Function `get_overdue_campaigns()` (005)
```sql
CREATE OR REPLACE FUNCTION get_overdue_campaigns()
RETURNS TABLE (id UUID, name VARCHAR(255), status VARCHAR(50), end_date DATE, days_overdue INT)
```
> Trả về danh sách campaigns đã quá hạn.

#### View `v_campaign_stats` (005)
```sql
CREATE OR REPLACE VIEW v_campaign_stats AS
SELECT
    c.id, c.name, c.status, c.campaign_type,
    c.start_date, c.end_date, c.project_id,
    CASE
        WHEN c.end_date < CURRENT_DATE AND c.status = 'active' THEN 'overdue'
        WHEN c.start_date > CURRENT_DATE AND c.status = 'planning' THEN 'upcoming'
        WHEN c.end_date >= CURRENT_DATE AND c.status = 'active' THEN 'running'
        ELSE c.status
    END AS effective_status,
    (SELECT COUNT(*) FROM pm_media_workflows mw WHERE mw.campaign_id = c.id) AS workflow_count,
    (SELECT COUNT(*) FROM pm_tasks t WHERE t.campaign_id = c.id) AS task_count,
    COALESCE(c.budget, 0) AS budget
FROM pm_campaigns c;
```
> View thống kê campaign với trạng thái tự động tính toán.

### 2.6 Các Cột Trùng Lặp Giữa Bảng

| Cột | Các bảng sử dụng |
|-----|-------------------|
| `title` | pm_tasks ↔ pm_media_workflows |
| `status` | pm_tasks, pm_media_workflows, pm_campaigns, pm_status_history |
| `stage` | pm_tasks, pm_workflow_stages, pm_workflow_comments |
| `platform` | pm_media_workflows, pm_tasks (từ 006) |
| `content_type` | pm_media_workflows, pm_tasks.task_type (từ 006) |
| `published_at` | pm_media_workflows, pm_tasks (từ 006) |
| `published_url` | pm_media_workflows, pm_tasks (từ 006) |
| `assignee_ids` | pm_tasks, pm_media_workflows |
| `due_date` | pm_tasks, pm_media_workflows |
| `ai_prompt` | pm_media_workflows, pm_ai_suggestions |

---

## 3. Các Component Liên Quan

### 3.1 Pages

| Component | File | Data nguồn | Mục đích |
|-----------|------|-----------|----------|
| `WorkspacePage` | `app/(admin)/workspace/page.tsx` | `getTasks()`, `getProjects()`, `getWorkspaceStats()` | Dashboard tổng quan workspace |
| `ActivityPage` | `app/(admin)/workspace/activity/page.tsx` | Raw SQL UNION (activities + status history) | Activity feed |
| `CalendarPage` | `app/(admin)/workspace/calendar/page.tsx` | `GET /api/tasks` | Calendar view |
| `MediaWorkflowPage` | `app/(admin)/media-workflow/page.tsx` | `getTasks()`, filter `MEDIA_TASK_TYPES` | Media pipeline |
| `InternsPage` | `app/(admin)/interns/` | `getInterns()`, `getInternRankings()` | Quản lý intern |
| `ProjectsPage` | `app/(admin)/projects/` | `getProjects()` | Quản lý project |

### 3.2 Client Components

| Component | File | Data | Mục đích |
|-----------|------|------|----------|
| `KanbanCard` | `components/kanban/kanban-card.tsx` | `Task` props | Task card cho Kanban |
| `WorkflowCard` | `components/media-workflow/workflow-card.tsx` | `Task` props | Media task card |
| `WorkflowPipeline` | `components/media-workflow/workflow-pipeline.tsx` | `Task[]` props | Pipeline view theo workflow_stage |
| `MediaWorkflowClient` | `media-workflow/media-workflow-client.tsx` | `Task[]` + state | Media workflow management |
| `MediaStatsWidget` | `components/dashboard/media-stats-widget.tsx` | `Task[]` props | Stats media theo pipeline stage |
| `WorkspaceStatsWidget` | `components/dashboard/workspace-stats-widget.tsx` | `WorkspaceStats` props | Stats tổng quan workspace |
| `CampaignAlertWidget` | `components/dashboard/campaign-alert-widget.tsx` | `WorkspaceStats` props | Alert campaign quá hạn |
| `TaskForm` | `components/tasks/task-form.tsx` | `Task`, `Project[]`, `Campaign[]` props | Form tạo/sửa task |
| `ProjectForm` | `components/projects/project-form.tsx` | `Project` props | Form tạo/sửa project |
| `KanbanBoard` | `components/kanban/kanban-board.tsx` | `Task[]` props | Kanban board |
| `ProjectDetailClient` | `components/projects/project-detail-client.tsx` | `Project`, `Task[]` props | Chi tiết project |

### 3.3 API Routes

| Endpoint | Method | File | Mục đích |
|----------|--------|------|----------|
| `/api/tasks` | GET, POST | `app/api/tasks/route.ts` | CRUD tasks |
| `/api/tasks/[id]` | GET, PUT, DELETE | `app/api/tasks/[id]/route.ts` | Task riêng |
| `/api/medusa/*` | GET, POST, DELETE | `app/api/medusa/[...slug]/route.ts` | Medusa backend proxy |
| `/api/medusa/products` | GET | `app/api/medusa/products/route.ts` | Products proxy |
| `/api/migration/init` | POST | `app/api/migration/init/route.ts` | Init migration tables |
| `/api/auth/token` | POST | `app/api/auth/token/route.ts` | Auth với Medusa |

### 3.4 Database Functions (lib/workspace/db/index.ts)

#### Projects
| Function | Return | Mô tả |
|----------|--------|--------|
| `getProjects(filters?)` | `Project[]` | Lấy danh sách project với filter |
| `getProjectById(id)` | `Project \| null` | Lấy project theo ID |
| `createProject(data)` | `Project` | Tạo project mới |
| `updateProject(id, data)` | `Project \| null` | Cập nhật project |
| `deleteProject(id)` | `void` | Xóa project |

#### Campaigns
| Function | Return | Mô tả |
|----------|--------|--------|
| `getCampaigns(filters?)` | `Campaign[]` | Lấy danh sách campaign |
| `getCampaignById(id)` | `Campaign \| null` | Lấy campaign theo ID |
| `createCampaign(data)` | `Campaign` | Tạo campaign mới |

#### Tasks
| Function | Return | Mô tả |
|----------|--------|--------|
| `getTasks(filters?)` | `Task[]` | Lấy danh sách task với filter |
| `getTaskById(id)` | `Task \| null` | Lấy task theo ID |
| `createTask(data)` | `Task` | Tạo task mới |
| `updateTask(id, data)` | `Task \| null` | Cập nhật task |
| `bulkUpdateTaskStatus(updates)` | `void` | Bulk update status |
| `deleteTask(id)` | `void` | Xóa task |

#### Task Comments/Activities
| Function | Return | Mô tả |
|----------|--------|--------|
| `getTaskComments(taskId)` | `TaskComment[]` | Lấy bình luận của task |
| `createTaskComment(data)` | `TaskComment` | Tạo bình luận |
| `getTaskActivity(taskId)` | `TaskActivity[]` | Lấy activity log |

#### Media Workflows (DEPRECATED)
| Function | Return | Mô tả |
|----------|--------|--------|
| `getMediaWorkflows(filters?)` | `MediaWorkflow[]` | Lấy danh sách workflow |
| `getMediaWorkflowById(id)` | `MediaWorkflow \| null` | Lấy workflow theo ID |
| `createMediaWorkflow(data)` | `MediaWorkflow` | Tạo workflow mới |
| `updateMediaWorkflow(id, data)` | `MediaWorkflow \| null` | Cập nhật workflow |
| `getWorkflowStages(workflowId)` | `WorkflowStage[]` | Lấy các stage |

#### Interns
| Function | Return | Mô tả |
|----------|--------|--------|
| `getInterns(filters?)` | `Intern[]` | Lấy danh sách intern |
| `getInternById(id)` | `Intern \| null` | Lấy intern theo ID |
| `createIntern(data)` | `Intern` | Tạo intern mới |
| `getInternKPIs(internId, periodType?)` | `InternKPI[]` | Lấy KPI |
| `getWeeklyPerformance(internId)` | `WeeklyPerformance[]` | Lấy hiệu suất tuần |
| `getInternRankings(periodType?, limit?)` | `InternRanking[]` | Lấy xếp hạng |
| `getWeeklyPerformanceAll(weekStart?)` | `WeeklyPerformance[]` | Tất cả intern performance |

#### Stats
| Function | Return | Mô tả |
|----------|--------|--------|
| `getWorkspaceStats()` | `WorkspaceStats` | Stats tổng quan (6 queries) |
| `getCampaignTypes()` | `CampaignTypeConfig[]` | Loại campaign |
| `getOverdueCampaigns()` | `OverdueCampaign[]` | Campaigns quá hạn |

---

## 4. Flow Dữ Liệu Hiện Tại

### 4.1 Flow của Workspace Dashboard (`/workspace`)

```
getWorkspaceStats()  ─────────────────────────────────────────────────┐
  ├─ active_projects: COUNT(*) FROM pm_projects WHERE status='active'  │
  ├─ due_this_week: COUNT(*) FROM pm_tasks                             │
  │    WHERE due_date <= CURRENT_DATE + 7 days                         │
  │    AND status NOT IN ('done', 'cancelled')                        │
  ├─ overdue_tasks: COUNT(*) FROM pm_tasks                            │
  │    WHERE due_date < CURRENT_DATE                                  │
  │    AND status NOT IN ('done', 'cancelled')                        │
  ├─ overdue_campaigns: COUNT(*) FROM pm_campaigns                    │
  │    WHERE status='active' AND end_date < CURRENT_DATE              │
  ├─ total_interns: COUNT(*) FROM pm_interns WHERE status='active'     │
  └─ published_this_month: COUNT(*) FROM pm_tasks                      │
       WHERE workflow_stage='published'                                │
       AND published_at >= DATE_TRUNC('month', CURRENT_DATE)           │
                                                                       │
getTasks() ─────────────────────────────────────────────────────────► Task[]
  ├─ project_id filter ────────────────────────────────────────────────
  ├─ campaign_id filter ───────────────────────────────────────────────
  ├─ status filter ─────────────────────────────────────────────────────
  ├─ priority filter ───────────────────────────────────────────────────
  ├─ assignee_id filter (ANY(assignee_ids)) ────────────────────────────
  ├─ search (ILIKE title/description) ─────────────────────────────────
  └─ task_type filter ──────────────────────────────────────────────────

getProjects() ──────────────────────────────────────────────────────► Project[]
getInternRankings("weekly", 5) ──────────────────────────────────────► InternRanking[]
getOverdueCampaigns() ───────────────────────────────────────────────► OverdueCampaign[]
```

### 4.2 Flow của Media Workflow (`/media-workflow`)

```
Server (RSC):
  getTasks() ──► Task[] (all tasks)
        │
        ▼ Filter
  MEDIA_TASK_TYPES = [
    "facebook_post", "tiktok_video", "youtube_video",
    "seo_article", "design_image", "product_photo", "livestream", "other"
  ]
  │
  ▼ Filter by task_type
  mediaTasks = tasks.filter(t =>
    t.task_type && MEDIA_TASK_TYPES.includes(t.task_type)
  )
        │
        ▼ Pass to client
  MediaWorkflowClient (client)

Client state:
  tasks[] ──► local state (filter/search/pagination)

Pipeline view (WorkflowPipeline):
  MEDIA_PIPELINE_STAGES.map(stage =>
    stageTasks = tasks.filter(t => t.workflow_stage === stage.id)
  )

Grid view:
  tasks.filter(...) (no grouping)

Update workflow_stage:
  PUT /api/tasks/{id}
  Body: { workflow_stage: newStage }
```

### 4.3 Flow của Calendar (`/calendar`)

```
Client-side fetch:
  GET /api/tasks
        │
        ▼
  Filter: tasks có due_date
        │
        ▼
  CalendarView component
  └─ Hiển thị task trên calendar grid
  └─ Click task → mở TaskForm
```

### 4.4 Flow của Activity (`/activity`)

```
Raw SQL (Server-side):
  SELECT * FROM pm_task_activities
    UNION
  SELECT * FROM pm_status_history
    ORDER BY created_at DESC LIMIT 100
        │
        ▼
  UnifiedActivity[] (entity_type, entity_id, action, created_at)
        │
        ▼
  ActivityFeed component
```

### 4.5 MediaWorkflow vs Task — So sánh Fields

#### Fields TRÙNG LẶP:

| Field | pm_tasks | pm_media_workflows |
|-------|----------|-------------------|
| `id` | string | string |
| `project_id` | string | string |
| `campaign_id` | string | string |
| `title` | string | string |
| `description` | string | string |
| `assignee_ids` | string[] | string[] |
| `due_date` | string | string |
| `tags` | string[] | string[] |
| `attachments` | Attachment[] | Attachment[] |
| `metadata` | Record | Record |
| `published_at` | string | string |
| `published_url` | string | string |

#### Fields CHỈ MỘT BẢNG CÓ:

**Task có, MediaWorkflow không:**
- `parent_task_id` — hỗ trợ subtasks
- `status` — Kanban status
- `priority` — ưu tiên
- `workflow_stage` — pipeline stage
- `task_type` — loại content
- `platform` — nền tảng đăng
- `reporter_id` — người giao việc
- `start_date`, `estimated_hours`, `actual_hours` — thời gian
- `progress` — % hoàn thành
- `dependencies` — phụ thuộc task khác

**MediaWorkflow có, Task không:**
- `task_id` — liên kết ngược về Task
- `content_type` — loại nội dung media
- `ai_prompt` — prompt AI
- `ai_generated_content` — nội dung sinh tự động
- `ai_model_used` — model AI
- `ai_generated_at` — thời gian sinh
- `engagement_metrics` — metrics tương tác

---

## 5. Điểm Sai Kiến Trúc

### 5.1 🔴 NGUY HIỂM — Cần fix ngay

#### A. MediaWorkflow trùng lặp dữ liệu với Task

| Vấn đề | Chi tiết |
|---------|----------|
| **Trùng lặp dữ liệu** | `pm_media_workflows` và `pm_tasks` có ~10 trường giống nhau |
| **Không đồng bộ** | Update ở bảng này không tự động cập nhật bảng kia |
| **Code bất đồng bộ** | File `006_task_media_consolidation.sql` sync dựa trên `title` — không đáng tin cậy |
| **Kế thừa rủi ro** | `pm_workflow_stages`, `pm_workflow_comments`, `pm_ai_suggestions` phụ thuộc vào MediaWorkflow |

**Ảnh hưởng:**
- Khi user update task status trên UI, `pm_media_workflows` không được update
- Dữ liệu AI suggestions có thể bị orphan khi MediaWorkflow deprecated hoàn toàn
- Bảng `pm_ai_suggestions` có cả `workflow_id` và `task_id`, nhưng chỉ `workflow_id` được dùng cho MediaWorkflow

#### B. `getWorkspaceStats()` dùng 6 round-trips đến database

```typescript
const [
  { rows: activeProjects },
  { rows: dueTasks },
  { rows: overdueTasks },
  { rows: overdueCampaigns },
  { rows: interns },
  { rows: publishedThisMonth },
] = await Promise.all([...]);
```

**Ảnh hưởng:**
- 6 query độc lập, mỗi query có network latency
- Nên gộp thành 1 query hoặc dùng database view

#### C. `pm_ai_suggestions` có cả `workflow_id` và `task_id`

Khi MediaWorkflow deprecated:
- `workflow_id` sẽ không còn được reference
- Nhưng `task_id` vẫn tồn tại trong schema
- Cần xác định rõ: suggestions nên gắn với Task hay MediaWorkflow

---

### 5.2 🟡 CẢNH BÁO — Nên cải thiện

#### A. Activity Feed không cover đầy đủ entities

```sql
SELECT * FROM pm_task_activities
UNION pm_status_history
```
> `pm_status_history` có `entity_type` generic nhưng UNION có thể thiếu:
> - MediaWorkflow activities (đã deprecated nhưng vẫn tồn tại)
> - Campaign status changes
> - Project status changes

#### B. Calendar chỉ hiển thị Tasks

> Activities, status changes, campaign deadlines không hiển thị trên calendar. User không thể xem:
> - Khi nào một task được chuyển sang "done"
> - Deadline của campaign
> - Hoạt động của intern

#### C. `pm_intern_rankings` là computed data trong table

Rankings được tính toán từ KPI nhưng lưu trong table:
- Cần cơ chế để recalculate
- Risk: data staleness nếu không update định kỳ
- Nên dùng **materialized view** hoặc **view** thay vì table

#### D. `updateTask` thiếu `"workflow_stage"` trong `allowed` fields

**Đã fix:** `workflow_stage` đã được thêm vào danh sách `allowed` fields của `updateTask`, với logic đặc biệt để map thành `stage` column trong database.

#### E. Thiếu auth check trong API routes

- `/api/tasks` không có middleware kiểm tra authentication
- Cần thêm auth check cho tất cả API routes

#### F. No rate limiting

- API không có rate limiting
- Có risk bị abuse

---

### 5.3 🟢 LƯU Ý — Không ảnh hưởng ngay

#### A. `pm_workflow_stages` phụ thuộc vào MediaWorkflow

- `pm_workflow_stages.workflow_id` references `pm_media_workflows.id`
- Khi xóa MediaWorkflow, các stages cũng bị xóa (CASCADE)
- Cần xem xét: stages có nên gắn với Task thay vì MediaWorkflow không?

#### B. Kanban board và Media Pipeline dùng chung data model

- Kanban dùng `status` field
- Media Pipeline dùng `workflow_stage` field
- Hai view khác nhau nhưng cùng nguồn dữ liệu — **đây là điểm tốt**, không phải vấn đề

---

## 6. Đề Xuất Sửa Chữa

### Priority 1: Hợp nhất MediaWorkflow → Task (Critical)

```
Bước 1: Verify data sync
  - Chạy query kiểm tra xem có bao nhiêu MediaWorkflow records
  - So sánh với Task records có task_type tương ứng
  - Xác định orphaned records

Bước 2: Migrate AI suggestions
  - Chuyển pm_ai_suggestions.workflow_id → pm_ai_suggestions.task_id
  - Update logic để gắn suggestions với Task thay vì MediaWorkflow

Bước 3: Update UI
  - Media workflow page đã dùng Task — verify đầy đủ
  - Đảm bảo tất cả media-related features dùng Task

Bước 4: Deprecate MediaWorkflow APIs
  - Tạo deprecation warning cho getMediaWorkflows(), createMediaWorkflow()
  - Chuyển hướng sang Task-based functions

Bước 5: Xóa bảng legacy (sau khi verify đủ data)
  - Xóa pm_media_workflows
  - Xóa pm_workflow_stages, pm_workflow_comments (CASCADE)
  - Cập nhật db/index.ts
```

### Priority 2: Tối ưu WorkspaceStats (High)

```sql
-- Tạo view thay vì 6 query riêng biệt
CREATE OR REPLACE VIEW v_workspace_stats AS
SELECT
  (SELECT COUNT(*) FROM pm_projects WHERE status = 'active') AS active_projects,
  (SELECT COUNT(*) FROM pm_tasks WHERE due_date <= NOW() + INTERVAL '7 days' AND status NOT IN ('done','cancelled')) AS due_this_week,
  (SELECT COUNT(*) FROM pm_tasks WHERE due_date < CURRENT_DATE AND status NOT IN ('done','cancelled')) AS overdue_tasks,
  (SELECT COUNT(*) FROM pm_campaigns WHERE status = 'active' AND end_date < CURRENT_DATE) AS overdue_campaigns,
  (SELECT COUNT(*) FROM pm_interns WHERE status = 'active') AS total_interns,
  (SELECT COUNT(*) FROM pm_tasks WHERE workflow_stage = 'published' AND published_at >= DATE_TRUNC('month', CURRENT_DATE)) AS published_this_month,
  0 AS media_ready;

-- Function đọc từ view
CREATE OR REPLACE FUNCTION get_workspace_stats()
RETURNS TABLE (
  active_projects BIGINT,
  due_this_week BIGINT,
  overdue_tasks BIGINT,
  overdue_campaigns BIGINT,
  media_ready BIGINT,
  total_interns BIGINT,
  published_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM v_workspace_stats;
END;
$$ LANGUAGE plpgsql;
```

### Priority 3: Cải thiện Activity Feed (Medium)

```sql
-- Tạo unified activity view
CREATE OR REPLACE VIEW v_all_activities AS
SELECT
  'task' AS entity_type,
  ta.id AS id,
  ta.task_id AS entity_id,
  ta.actor_name AS actor,
  ta.action AS action_type,
  ta.field_changed,
  ta.old_value,
  ta.new_value,
  ta.created_at
FROM pm_task_activities ta
UNION ALL
SELECT
  sh.entity_type,
  sh.id,
  sh.entity_id,
  sh.changed_by_name AS actor,
  'status_changed' AS action_type,
  'status' AS field_changed,
  sh.from_status AS old_value,
  sh.to_status AS new_value,
  sh.created_at
FROM pm_status_history sh
ORDER BY created_at DESC;
```

### Priority 4: Thêm Auth check vào API routes (Medium)

```typescript
// Thêm vào /api/tasks/route.ts
import { getServerSession } from "next-auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... existing code
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... existing code
}
```

### Priority 5: Cải thiện Calendar (Low)

- Thêm campaign deadlines vào calendar
- Thêm status change events vào calendar
- Thêm intern KPIs vào calendar (tuần/tháng review)

### Priority 6: Bảo mật API (Low)

- Thêm rate limiting vào API routes
- Validate input với Zod schema
- Thêm logging cho audit trail

---

## 7. Sơ Đồ Flow Dữ Liệu

### 7.1 Sơ Đồ Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                        │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Workspace  │  │    Media    │  │  Calendar   │  │  Activity   │   │
│  │  Dashboard  │  │  Workflow   │  │             │  │             │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                 │                 │                 │          │
└─────────┼─────────────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      /api/tasks                                   │  │
│  │   GET /tasks ─────────────────────────────────────► pm_tasks     │  │
│  │   POST /tasks ───────────────────────────────────► pm_tasks     │  │
│  │   PUT /tasks/:id ────────────────────────────────► pm_tasks     │  │
│  │   DELETE /tasks/:id ───────────────────────────► pm_tasks     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  /api/medusa/* (Medusa Proxy)                     │  │
│  │   GET /admin/products ──────────────────────────────────► Medusa│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                            │
│                                                                         │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐                   │
│   │pm_projects │◄───┤  pm_tasks  ├───►│pm_campaigns│                   │
│   └────────────┘    └─────┬──────┘    └────────────┘                   │
│                           │                                           │
│   ┌───────────────────────┼───────────────────────────────────┐       │
│   │                       │                                   │       │
│   ▼                       ▼                                   ▼       │
│ ┌────────────┐    ┌───────────────┐    ┌──────────────────────────┐  │
│ │pm_comments │    │pm_activities  │    │pm_status_history         │  │
│ └────────────┘    └───────────────┘    └──────────────────────────┘  │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  DEPRECATED: pm_media_workflows ⚠️ (dùng pm_tasks.task_type)    │  │
│   │  ├── pm_workflow_stages                                          │  │
│   │  ├── pm_workflow_comments                                        │  │
│   │  └── pm_ai_suggestions (task_id + workflow_id)                   │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│   ┌────────────┐    ┌───────────────┐    ┌──────────────────────────┐  │
│   │pm_interns  │───►│pm_intern_kpis│    │pm_intern_rankings       │  │
│   └────────────┘    └───────────────┘    └──────────────────────────┘  │
│                            │                                           │
│                   ┌────────┴────────┐                                   │
│                   │pm_weekly_perf  │                                   │
│                   └────────────────┘                                   │
│                                                                         │
│   ┌────────────┐    ┌───────────────┐    ┌──────────────────────────┐  │
│   │pm_campaign │───►│pm_campaign_   │    │pm_campaign_types         │  │
│   │_types      │    │types_view     │    │(cố định)                │  │
│   └────────────┘    └───────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Sơ Đồ Chi Tiết — Task Flow

```
Task Creation Flow
──────────────────

User clicks "Tạo Task"
        │
        ▼
  TaskForm dialog
        │
        ▼
  POST /api/tasks
  Body: {
    title, description,
    project_id, campaign_id,
    status: "todo", priority: "medium",
    workflow_stage?, task_type?, platform?,
    assignee_ids[], due_date?,
    tags[], metadata{}
  }
        │
        ▼
  lib/workspace/db/index.ts → createTask()
        │
        ├──► INSERT INTO pm_tasks (...)
        │
        └──► INSERT INTO pm_task_activities ('created', title, 'System')
        │
        ▼
  mapTaskRow(row) → Task
        │
        ▼
  return { data: task }
        │
        ▼
  UI: thêm task vào danh sách, đóng dialog


Task Update Workflow Stage Flow
──────────────────────────────

User kéo task sang column mới trên Pipeline
        │
        ▼
  WorkflowPipeline.onDrop(taskId, newStage)
        │
        ▼
  PUT /api/tasks/{taskId}
  Body: { workflow_stage: newStage }
        │
        ▼
  lib/workspace/db/index.ts → updateTask(id, { workflow_stage })
        │
        ├──► UPDATE pm_tasks SET stage = $1 WHERE id = $2
        │
        └──► INSERT INTO pm_task_activities ('stage_changed', newStage)
        │
        └──► INSERT INTO pm_status_history ('task', id, oldStage, newStage)
        │
        ▼
  return { data: updatedTask }
        │
        ▼
  UI: cập nhật card, animate transition
```

### 7.3 Sơ Đồ Chi Tiết — Workspace Stats

```
getWorkspaceStats() Flow
────────────────────────

getWorkspaceStats()
        │
        ├──┬──► Query 1: COUNT pm_projects WHERE status='active'
        │              │
        │              ▼
        │          active_projects: int
        │
        ├──┬──► Query 2: COUNT pm_tasks WHERE due <= 7 days
        │              │
        │              ▼
        │          due_this_week: int
        │
        ├──┬──► Query 3: COUNT pm_tasks WHERE due < today
        │              │
        │              ▼
        │          overdue_tasks: int
        │
        ├──┬──► Query 4: COUNT pm_campaigns WHERE overdue
        │              │
        │              ▼
        │          overdue_campaigns: int
        │
        ├──┬──► Query 5: COUNT pm_interns WHERE active
        │              │
        │              ▼
        │          total_interns: int
        │
        └──┬──► Query 6: COUNT pm_tasks WHERE published_this_month
                       │
                       ▼
                   published_this_month: int
        │
        ▼
  Promise.all([6 queries]) → WorkspaceStats
        │
        ▼
  return WorkspaceStats
        │
        ▼
  WorkspaceStatsWidget
  MediaStatsWidget (from tasks prop)
  CampaignAlertWidget
```

---

## 8. Kết Luận

### Task là dữ liệu trung tâm ✅

- **Task** là single source of truth cho mọi loại công việc
- Media content được represent bằng `task_type` field
- Kanban dùng `status`; Media Pipeline dùng `workflow_stage`
- Tất cả components chính đều xoay quanh Task

### Media Workflow đang dùng dữ liệu riêng ⚠️

- `pm_media_workflows` tồn tại song song với `pm_tasks`
- Đã mark là DEPRECATED nhưng chưa xóa
- UI đã chuyển sang Task nhưng database còn legacy table

### Calendar và Activity

| Trang | Nguồn | Bảng |
|-------|-------|------|
| Calendar | `GET /api/tasks` | `pm_tasks` |
| Activity | Raw SQL UNION | `pm_task_activities` + `pm_status_history` |

### Priority hành động

1. **Ngay lập tức**: Xử lý trùng lặp MediaWorkflow/Task
2. **Sớm**: Tối ưu `getWorkspaceStats()` (gộp 6 queries)
3. **Khi có thời gian**: Cải thiện Activity Feed, Calendar, Auth check

---

*Document được tạo bởi AI agent vào 26/05/2026*
