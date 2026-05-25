# AI Marketing & Media OS — Thiết Kế Hệ Thống Quản Lý Dự Án & Media

> **Mô-đun mới cho Mỹ Tho Laptop Admin UI**
> Phiên bản: 1.0.0 | Ngày: 2026-05-24

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Database Schema](#4-database-schema)
5. [UI/UX Wireframe](#5-uiux-wireframe)
6. [API Specification](#6-api-specification)
7. [Kế hoạch triển khai](#7-kế-hoạch-triển-khai)
8. [Migration Plan](#8-migration-plan)

---

## 1. Tổng quan

### Mục tiêu

Xây dựng mô-đun **"Project & Media Workflow Management"** — hệ thống quản lý dự án sản xuất nội dung media cho Mỹ Tho Laptop, bao gồm:

- Quản lý dự án & chiến dịch (Projects & Campaigns)
- Kanban board cho task management
- Media workflow (Idea → Published)
- Quản lý thực tập sinh (Intern Management)
- Dashboard tổng hợp

### Nguyên tắc thiết kế

- **Không phá vỡ** các module hiện có
- Dùng shadcn/ui + Tailwind CSS v4
- Màu chủ đạo: đỏ Mỹ Tho Laptop (`hsl(357 100% 45%)` = `#E60012`)
- Responsive mobile-first
- Smooth animation với CSS transitions
- PostgreSQL + pg driver (giống hệ thống hiện tại)

---

## 2. Kiến trúc hệ thống

### Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN UI (Next.js 16)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Sidebar    │  │  Dashboard   │  │   Project Mgmt   │  │
│  │  (NAV_ITEMS) │  │  (Overview)  │  │   (Kanban/Grid)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Media        │  │  Intern      │  │   API Routes     │  │
│  │ Workflow     │  │  Management  │  │   (/api/projects)│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL (mytholaptop)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │projects  │ │campaigns │ │  tasks   │ │media_workflows│  │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├────────────────┤  │
│  │comments  │ │ attachments│ │activity │ │   interns     │  │
│  └──────────┘ └──────────┘ └──────────┘ │   intern_kpis  │  │
│                                          └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Module chính

| Module | Mô tả | Dependencies |
|--------|-------|-------------|
| **Projects** | Quản lý dự án, chiến dịch, Kanban | tasks, team_members |
| **Tasks** | Task với priority, deadline, status | projects, comments |
| **Media Workflow** | Pipeline sản xuất nội dung | tasks, comments |
| **Interns** | Profile, KPI, performance tracking | tasks |
| **Dashboard** | Tổng hợp stats, charts | All modules |

---

## 3. Cấu trúc thư mục

### Mới trong `apps/admin-ui`

```
app/(admin)/
├── projects/                          # NEW: Project Management
│   ├── page.tsx                       # Project list + Kanban
│   ├── [id]/
│   │   ├── page.tsx                   # Project detail
│   │   └── tasks/page.tsx             # Project tasks
│   └── new/page.tsx                   # Create project
│
├── campaigns/                         # NEW: Campaign Management
│   ├── page.tsx                       # Campaign list
│   ├── [id]/page.tsx                  # Campaign detail
│   └── new/page.tsx                   # Create campaign
│
├── tasks/                             # NEW: Task Management
│   ├── page.tsx                       # All tasks
│   ├── [id]/page.tsx                  # Task detail
│   └── new/page.tsx                   # Create task
│
├── media-workflow/                    # NEW: Media Workflow
│   ├── page.tsx                       # Workflow overview
│   ├── [id]/page.tsx                  # Workflow detail
│   └── pipeline/page.tsx              # Pipeline view (Kanban)
│
├── interns/                           # NEW: Intern Management
│   ├── page.tsx                       # Intern list
│   ├── [id]/page.tsx                  # Intern profile
│   ├── kpi/page.tsx                   # KPI dashboard
│   └── ranking/page.tsx                # Ranking dashboard
│
├── workspace/                         # NEW: Unified Workspace
│   ├── page.tsx                       # Main workspace dashboard
│   ├── calendar/page.tsx               # Calendar view
│   └── activity/page.tsx               # Activity feed

components/
├── workspace/                         # NEW: Workspace components
│   ├── workspace-header.tsx
│   ├── workspace-stats.tsx
│   ├── workspace-activity-feed.tsx
│   └── workspace-quick-actions.tsx
│
├── projects/                          # NEW: Project components
│   ├── project-card.tsx
│   ├── project-form.tsx
│   ├── project-status-badge.tsx
│   ├── project-team.tsx
│   ├── project-list.tsx
│   └── project-detail-header.tsx
│
├── kanban/                            # NEW: Kanban board
│   ├── kanban-board.tsx               # Main board (dnd-kit)
│   ├── kanban-column.tsx              # Column (TODO/IN_PROGRESS/etc)
│   ├── kanban-card.tsx                # Task card
│   ├── kanban-draggable.tsx           # Draggable wrapper
│   └── kanban-add-task.tsx            # Quick add task
│
├── tasks/                             # NEW: Task components
│   ├── task-card.tsx
│   ├── task-form.tsx
│   ├── task-status-badge.tsx
│   ├── task-priority-badge.tsx
│   ├── task-comment.tsx
│   ├── task-comment-list.tsx
│   ├── task-attachment.tsx
│   ├── task-activity.tsx
│   └── task-timeline.tsx
│
├── media-workflow/                     # NEW: Media workflow
│   ├── workflow-pipeline.tsx          # Pipeline stages
│   ├── workflow-card.tsx               # Content card per stage
│   ├── workflow-progress.tsx           # Progress bar
│   ├── workflow-comment.tsx
│   ├── workflow-ai-suggestion.tsx      # AI suggestion panel
│   └── workflow-status-history.tsx
│
├── interns/                           # NEW: Intern components
│   ├── intern-card.tsx
│   ├── intern-profile.tsx
│   ├── intern-kpi-card.tsx
│   ├── intern-ranking-table.tsx
│   ├── intern-performance-chart.tsx
│   └── intern-task-summary.tsx
│
├── dashboard/                         # NEW: Dashboard widgets
│   ├── project-stats-widget.tsx
│   ├── deadline-alert-widget.tsx
│   ├── media-stats-widget.tsx
│   ├── intern-ranking-widget.tsx
│   └── team-activity-widget.tsx
│
└── ui/                                # Existing (add new if needed)

lib/
├── workspace/                         # NEW: Workspace lib
│   ├── db/                            # DB operations
│   │   ├── projects.ts
│   │   ├── campaigns.ts
│   │   ├── tasks.ts
│   │   ├── media-workflows.ts
│   │   ├── interns.ts
│   │   └── index.ts
│   └── types.ts                       # Shared types
│
├── kanban/                            # NEW: Kanban helpers
│   └── kanban-helpers.ts

services/
├── projects.service.ts                # NEW: Project API service
├── campaigns.service.ts               # NEW: Campaign service
├── tasks.service.ts                   # NEW: Task service
├── media-workflow.service.ts          # NEW: Media workflow service
└── interns.service.ts                 # NEW: Intern service

store/
├── workspace-store.ts                 # NEW: Workspace state
├── kanban-store.ts                    # NEW: Kanban state
└── intern-store.ts                    # NEW: Intern state

app/api/
├── projects/                          # NEW
│   ├── route.ts                       # GET (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts                   # GET, PUT, DELETE
│   │   └── tasks/route.ts             # Project tasks
│   └── stats/route.ts                 # Project statistics
│
├── campaigns/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── stats/route.ts
│
├── tasks/
│   ├── route.ts
│   ├── [id]/
│   │   ├── route.ts
│   │   ├── comments/route.ts
│   │   ├── attachments/route.ts
│   │   └── activity/route.ts
│   └── kanban/route.ts                # Bulk update
│
├── media-workflow/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── [id]/stages/route.ts
│   └── [id]/ai-suggestions/route.ts
│
└── interns/
    ├── route.ts
    ├── [id]/route.ts
    ├── [id]/kpi/route.ts
    └── stats/route.ts

sql/
├── workspace/
│   ├── 001_projects.sql               # Projects & Campaigns
│   ├── 002_tasks.sql                 # Tasks & Subtasks
│   ├── 003_media_workflow.sql         # Media workflow pipeline
│   └── 004_interns.sql                # Intern management
```

---

## 4. Database Schema

### 4.1 Projects & Campaigns

```sql
-- ============================================================
-- PROJECTS: Core project entity
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, completed, archived, on_hold
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    color VARCHAR(7) DEFAULT '#E60012',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    owner_id UUID,
    team_ids UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_projects_status ON pm_projects(status);
CREATE INDEX IF NOT EXISTS idx_pm_projects_priority ON pm_projects(priority);
CREATE INDEX IF NOT EXISTS idx_pm_projects_owner ON pm_projects(owner_id);

-- ============================================================
-- CAMPAIGNS: Marketing campaigns linked to projects
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm_projects(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50), -- product_launch, seasonal, social_media, seo, advertising
    status VARCHAR(50) NOT NULL DEFAULT 'planning', -- planning, active, paused, completed, cancelled
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    target_metrics JSONB DEFAULT '{}', -- {impressions: 10000, clicks: 500, conversions: 50}
    actual_metrics JSONB DEFAULT '{}',
    channels TEXT[] DEFAULT '{}', -- facebook, website, tiktok, zalo, youtube
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_campaigns_project ON pm_campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_campaigns_status ON pm_campaigns(status);
```

### 4.2 Tasks

```sql
-- ============================================================
-- TASKS: Core task entity
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm_projects(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES pm_campaigns(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'backlog',  -- backlog, todo, in_progress, review, done, cancelled
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low, medium, high, urgent
    stage VARCHAR(50),  -- idea, writing, filming, editing, published (for media workflow)

    assignee_ids UUID[] DEFAULT '{}',
    reporter_id UUID,

    start_date DATE,
    due_date DATE,
    estimated_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),

    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',  -- [{name, url, size, type}]
    dependencies UUID[] DEFAULT '{}', -- task IDs this depends on

    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_assignee ON pm_tasks USING GIN(assignee_ids);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_due_date ON pm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_stage ON pm_tasks(stage);

-- ============================================================
-- TASK COMMENTS: Threaded comments on tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES pm_task_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    author_avatar VARCHAR(500),
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    mentions UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_comments_task ON pm_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_comments_parent ON pm_task_comments(parent_comment_id);

-- ============================================================
-- TASK ACTIVITY: Audit log for task changes
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_name VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- created, updated, status_changed, assigned, commented, attached
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_activity_task ON pm_task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_created ON pm_task_activities(created_at);

-- ============================================================
-- STATUS HISTORY: Track status changes over time
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- task, media_workflow
    entity_id UUID NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID,
    changed_by_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_status_history_entity ON pm_status_history(entity_type, entity_id);
```

### 4.3 Media Workflow

```sql
-- ============================================================
-- MEDIA_WORKFLOWS: Content production pipeline
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_media_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pm_projects(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES pm_campaigns(id) ON DELETE SET NULL,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- facebook_post, seo_article, video_script, tiktok_video, product_photo
    platform VARCHAR(50), -- facebook, website, tiktok, zalo, youtube, instagram
    status VARCHAR(50) NOT NULL DEFAULT 'idea', -- idea, writing, review, filming, editing, published, archived

    -- AI Generation
    ai_prompt TEXT,
    ai_generated_content TEXT,
    ai_model_used VARCHAR(100),
    ai_generated_at TIMESTAMP,

    -- Publishing
    published_at TIMESTAMP,
    published_url VARCHAR(1000),
    engagement_metrics JSONB DEFAULT '{}', -- {likes: 0, shares: 0, comments: 0, views: 0}

    assignee_ids UUID[] DEFAULT '{}',
    due_date DATE,

    tags TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_media_project ON pm_media_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_media_campaign ON pm_media_workflows(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pm_media_status ON pm_media_workflows(status);
CREATE INDEX IF NOT EXISTS idx_pm_media_platform ON pm_media_workflows(platform);

-- ============================================================
-- MEDIA WORKFLOW STAGES: Stage-specific content and approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL, -- idea, writing, review, filming, editing, published
    content TEXT,
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    reviewer_notes TEXT,
    order_index INT NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_wf_stages_workflow ON pm_workflow_stages(workflow_id);

-- ============================================================
-- MEDIA WORKFLOW COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_workflow_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    stage VARCHAR(50),
    author_id UUID NOT NULL,
    author_name VARCHAR(255),
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_wf_comments_workflow ON pm_workflow_comments(workflow_id);

-- ============================================================
-- AI SUGGESTIONS: AI-generated suggestions for workflows
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES pm_media_workflows(id) ON DELETE CASCADE,
    task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(50) NOT NULL, -- headline, cta, hashtag, image_prompt, script_outline
    content TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    used BOOLEAN DEFAULT FALSE,
    ai_model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_workflow ON pm_ai_suggestions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_pm_ai_suggestions_task ON pm_ai_suggestions(task_id);
```

### 4.4 Intern Management

```sql
-- ============================================================
-- INTERNS: Intern profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_interns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- link to staff system if exists

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    university VARCHAR(255),
    major VARCHAR(255),
    year_of_study INT,

    position VARCHAR(100), -- content_intern, video_intern, design_intern, marketing_intern
    start_date DATE NOT NULL,
    end_date DATE,
    mentor_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, graduated, resigned

    skills TEXT[] DEFAULT '{}',
    bio TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pm_interns_status ON pm_interns(status);
CREATE INDEX IF NOT EXISTS idx_pm_interns_position ON pm_interns(position);

-- ============================================================
-- INTERN KPIS: Weekly/monthly KPI tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_intern_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES pm_interns(id) ON DELETE CASCADE,

    period_type VARCHAR(20) NOT NULL, -- weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Task metrics
    tasks_assigned INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    tasks_overdue INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,

    -- Deadline accuracy
    on_time_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    deadline_accuracy DECIMAL(5,2) DEFAULT 0,

    -- Quality metrics
    revision_count INT DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0, -- 1-5

    -- Content metrics (for media interns)
    content_created INT DEFAULT 0,
    content_published INT DEFAULT 0,
    avg_engagement DECIMAL(10,2) DEFAULT 0,

    -- Working hours
    expected_hours DECIMAL(6,2),
    actual_hours DECIMAL(6,2),
    attendance_rate DECIMAL(5,2) DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(intern_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_pm_kpis_intern ON pm_intern_kpis(intern_id);
CREATE INDEX IF NOT EXISTS idx_pm_kpis_period ON pm_intern_kpis(period_start, period_end);

-- ============================================================
-- WEEKLY PERFORMANCE: Weekly performance reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_weekly_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES pm_interns(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,

    overall_score DECIMAL(3,2) DEFAULT 0, -- 1-5
    productivity_score DECIMAL(3,2) DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0,
    teamwork_score DECIMAL(3,2) DEFAULT 0,
    initiative_score DECIMAL(3,2) DEFAULT 0,

    accomplishments TEXT,
    areas_for_improvement TEXT,
    mentor_feedback TEXT,
    intern_self_reflection TEXT,

    rating VARCHAR(20), -- excellent, good, needs_improvement, poor
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(intern_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_pm_weekly_intern ON pm_weekly_performance(intern_id);
CREATE INDEX IF NOT EXISTS idx_pm_weekly_week ON pm_weekly_performance(week_start);

-- ============================================================
-- INTERN RANKINGS: Computed rankings
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_intern_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID NOT NULL REFERENCES pm_interns(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    overall_rank INT,
    productivity_rank INT,
    quality_rank INT,
    deadline_rank INT,

    overall_score DECIMAL(5,2),
    productivity_score DECIMAL(5,2),
    quality_score DECIMAL(5,2),
    deadline_score DECIMAL(5,2),

    trend VARCHAR(20), -- up, down, stable
    trend_change DECIMAL(4,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(intern_id, period_type, period_start)
);
```

### 4.5 Trigger for updated_at

```sql
-- Auto-update updated_at for all workspace tables
DO $$ BEGIN
    CREATE TRIGGER update_pm_projects_updated_at
        BEFORE UPDATE ON pm_projects
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_campaigns_updated_at
        BEFORE UPDATE ON pm_campaigns
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_tasks_updated_at
        BEFORE UPDATE ON pm_tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_media_workflows_updated_at
        BEFORE UPDATE ON pm_media_workflows
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_workflow_stages_updated_at
        BEFORE UPDATE ON pm_workflow_stages
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_interns_updated_at
        BEFORE UPDATE ON pm_interns
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_intern_kpis_updated_at
        BEFORE UPDATE ON pm_intern_kpis
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_pm_weekly_performance_updated_at
        BEFORE UPDATE ON pm_weekly_performance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

---

## 5. UI/UX Wireframe

### 5.1 Sidebar Navigation (mở rộng)

```
QUẢN LÝ DỰ ÁN (New Section)
├── 📊 Dashboard         → /workspace
├── 📁 Dự án            → /projects
├── 🎯 Chiến dịch       → /campaigns
├── ✅ Công việc        → /tasks
├── 🎬 Media Workflow   → /media-workflow
├── 👥 Thực tập sinh    → /interns
└── 📅 Lịch             → /workspace/calendar
```

### 5.2 Workspace Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Workspace Dashboard                    [+ New Project] 🔍  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Active      │ │ Due This    │ │ Overdue     │ │ Media  │ │
│  │ Projects    │ │ Week       │ │ Tasks       │ │ Ready  │ │
│  │   12        │ │   8        │ │   3 🔴     │ │   24   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                                                             │
│  ┌──────────────────────────────────┐ ┌───────────────────┐│
│  │ Deadline Alerts                   │ │ Team Activity     ││
│  │ ─────────────────────────────    │ │ ───────────────── ││
│  │ 🔴 "Launch video" - Quá hạn 2 ngày│ │ 👤 Minh: Hoàn    ││
│  │ 🟡 "FB post" - Đến hạn trong 1 ngày│ │    thành task    ││
│  │ 🟡 "Product shoot" - Đến hạn 3 ngày │ │ 👤 Lan: Review  ││
│  │ 🟢 5 tasks đúng hạn               │ │    content       ││
│  └──────────────────────────────────┘ └───────────────────┘│
│                                                             │
│  ┌──────────────────────────────────┐ ┌───────────────────┐│
│  │ Media Production Pipeline         │ │ Intern Ranking    ││
│  │ ─────────────────────────────    │ │ ───────────────── ││
│  │ [IDEA] [WRITING] [REVIEW] [FILM]  │ │ 🥇 An  ★4.8      ││
│  │   5      8       6       4        │ │ 🥈 Minh ★4.5      ││
│  │              [EDIT] [PUBLISHED]   │ │ 🥉 Lan  ★4.2      ││
│  │               3        12         │ │ ...              ││
│  └──────────────────────────────────┘ └───────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Kanban Board Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Project: Summer Sale Campaign          [Filter ▾] [+ Task] [Grid]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  BACKLOG          │  TO DO           │  IN PROGRESS  │  DONE      │
│  ────────────     │  ────────────    │  ──────────   │  ────────  │
│  ┌────────────┐   │  ┌────────────┐   │  ┌────────┐  │ ┌────────┐ │
│  │📋 FB Post  │   │  │📋 Product │   │  │📋 Vlog │  │ │📋 Reel │ │
│  │  Summer    │   │  │  Photos    │   │  │  Intro │  │ │ Sale   │ │
│  │  Sale      │   │  │           │   │  │         │  │ │        │ │
│  │ 🏷️ high   │   │  │ 🏷️ urgent│   │  │ 🏷️ med │  │ │ 🏷️ low │ │
│  │ 👤 An      │   │  │ 👤 Minh   │   │  │ 👤 Lan  │  │ │ 👤 An  │ │
│  │ 📅 Jun 20  │   │  │ 📅 Jun 18 │   │  │ 📅 Jun19│  │ │ 📅 ✓  │ │
│  └────────────┘   │  └────────────┘   │  └────────┘  │ └────────┘ │
│  ┌────────────┐   │                  │              │             │
│  │📋 SEO     │   │                  │              │             │
│  │  Article  │   │                  │              │             │
│  └────────────┘   │                  │              │             │
│       + Add Task  │                  │              │             │
│                   │                  │              │             │
└───────────────────┴──────────────────┴──────────────┴─────────────┘
```

### 5.4 Media Workflow Pipeline

```
┌────────────────────────────────────────────────────────────────────┐
│  Media Workflow: June Content Calendar                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  IDEA (5)    WRITING (8)    REVIEW (6)    FILMING (4)   EDITING(3)  │
│  ─────────   ──────────     ─────────     ─────────    ──────────  │
│  ┌───────┐   ┌───────┐      ┌───────┐     ┌───────┐    ┌───────┐  │
│  │ Card  │   │ Card  │      │ Card  │     │ Card  │    │ Card  │  │
│  │       │   │ AI ✨ │      │ ✓     │     │ 📹    │    │ 🎬    │  │
│  └───────┘   └───────┘      └───────┘     └───────┘    └───────┘  │
│  ┌───────┐   ┌───────┐      ┌───────┐                  ┌───────┐  │
│  │ Card  │   │ Card  │      │ Card  │                  │ Card  │  │
│  └───────┘   └───────┘      └───────┘                  └───────┘  │
│                                                                    │
│                                         PUBLISHED (12)             │
│                                         ────────────                │
│                                         ┌───────┐ ┌───────┐ ┌───┐ │
│                                         │ Card ✓│ │ Card ✓│ │...│ │
│                                         └───────┘ └───────┘ └───┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 5.5 Intern KPI Dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  Intern KPI Dashboard — June 2026                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Filter: [All Positions ▾] [All Months ▾] [All Mentors ▾]          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TOP PERFORMERS THIS MONTH                                  │  │
│  │  ───────────────────────────────────────────────────────    │  │
│  │  🥇 An Nguyễn ★4.8  |  🥈 Minh Trần ★4.5  |  🥉 Lan Hoàng ★4.2│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────┐ ┌────────────────────────────┐│
│  │  Completion Rate by Intern       │ │  Deadline Accuracy Trend   ││
│  │  ▓▓▓▓▓▓▓▓▓▓▓  92%              │ │  📈 An: ↑12%              ││
│  │  ▓▓▓▓▓▓▓▓▓▓   85%              │ │  📈 Minh: ↑8%             ││
│  │  ▓▓▓▓▓▓▓▓▓    78%              │ │  📉 Lan: ↓3%              ││
│  └─────────────────────────────────┘ └────────────────────────────┘│
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  INTERN PERFORMANCE TABLE                                    │  │
│  │  ───────────────────────────────────────────────────────    │  │
│  │  #  Name     Pos       Tasks  On-time  Quality  Score  Trend │  │
│  │  1  An N.    Content   12/12   100%     ★4.8    4.8    ↑    │  │
│  │  2  Minh T.  Video     10/12   83%      ★4.5    4.5    ↑    │  │
│  │  3  Lan H.   Marketing  8/10   75%      ★4.2    4.2    ↓    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 5.6 Design Tokens (Mỹ Tho Laptop Brand)

```css
/* Brand Colors */
--primary: hsl(357 100% 45%);        /* #E60012 - Mỹ Tho Laptop Red */
--primary-hover: hsl(357 100% 38%);
--primary-light: hsl(357 100% 95%);  /* #FFF5F5 */
--primary-dark: hsl(357 50% 25%);

/* Status Colors */
--status-idea: hsl(220 14% 70%);      /* Grey */
--status-writing: hsl(261 100% 65%);  /* Purple */
--status-review: hsl(38 92% 50%);     /* Orange */
--status-filming: hsl(199 89% 48%);   /* Cyan */
--status-editing: hsl(25 95% 53%);    /* Orange-Red */
--status-published: hsl(142 70% 45%); /* Green */

/* Priority Colors */
--priority-low: hsl(142 70% 45%);     /* Green */
--priority-medium: hsl(38 92% 50%);   /* Orange */
--priority-high: hsl(14 100% 50%);   /* Red */
--priority-urgent: hsl(0 100% 50%);   /* Bright Red + pulse */

/* Canvas & Surface */
--canvas-bg: hsl(210 20% 98%);        /* Light grey background */
--surface: hsl(0 0% 100%);            /* White cards */
--border: hsl(220 13% 91%);
```

---

## 6. API Specification

### 6.1 Projects API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects (with filters) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Get project detail |
| PUT | `/api/projects/[id]` | Update project |
| DELETE | `/api/projects/[id]` | Delete project |
| GET | `/api/projects/[id]/tasks` | Get project tasks |
| GET | `/api/projects/stats` | Project statistics |

### 6.2 Tasks API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Get task detail |
| PUT | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task |
| POST | `/api/tasks/[id]/comments` | Add comment |
| GET | `/api/tasks/[id]/comments` | Get comments |
| POST | `/api/tasks/[id]/attachments` | Add attachment |
| GET | `/api/tasks/[id]/activity` | Get activity log |
| PUT | `/api/tasks/kanban` | Bulk update (drag-drop) |

### 6.3 Media Workflow API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media-workflow` | List workflows |
| POST | `/api/media-workflow` | Create workflow |
| GET | `/api/media-workflow/[id]` | Get workflow |
| PUT | `/api/media-workflow/[id]` | Update workflow |
| PUT | `/api/media-workflow/[id]/stages` | Update stage |
| POST | `/api/media-workflow/[id]/ai-suggestions` | Get AI suggestions |
| POST | `/api/media-workflow/generate` | AI generate content |

### 6.4 Interns API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interns` | List interns |
| POST | `/api/interns` | Add intern |
| GET | `/api/interns/[id]` | Get intern profile |
| PUT | `/api/interns/[id]` | Update intern |
| GET | `/api/interns/[id]/kpi` | Get KPI history |
| POST | `/api/interns/[id]/kpi` | Add KPI record |
| GET | `/api/interns/[id]/tasks` | Get intern tasks |
| GET | `/api/interns/stats` | Ranking statistics |

---

## 7. Kế hoạch triển khai

### Phase 1: Database & Foundation (Tuần 1)
- [ ] Tạo SQL migration files
- [ ] Chạy migrations trong PostgreSQL
- [ ] Tạo lib/db/ types và DB helpers
- [ ] Tạo service layer
- [ ] Tạo Zustand stores
- [ ] Cập nhật navigation (sidebar)

### Phase 2: Core Components (Tuần 2)
- [ ] Project list + create form
- [ ] Task list + create form
- [ ] Kanban board (dnd-kit)
- [ ] Task detail page (comments, attachments)
- [ ] API routes for projects & tasks

### Phase 3: Media Workflow (Tuần 3)
- [ ] Workflow pipeline view
- [ ] Stage management
- [ ] AI suggestion integration
- [ ] Status history tracking
- [ ] Media workflow API

### Phase 4: Intern Management (Tuần 4)
- [ ] Intern profiles CRUD
- [ ] KPI tracking system
- [ ] Weekly performance reviews
- [ ] Ranking dashboard
- [ ] Intern API

### Phase 5: Dashboard & Polish (Tuần 5)
- [ ] Unified workspace dashboard
- [ ] Charts và statistics
- [ ] Activity feed
- [ ] Calendar view
- [ ] Final UI polish & animations

---

## 8. Migration Plan

### SQL Migration Files (chạy tuần tự)

```bash
# 1. Backup database trước
pg_dump mytholaptop > backup_$(date +%Y%m%d).sql

# 2. Chạy migrations
psql -U postgres -d mytholaptop -f sql/workspace/001_projects.sql
psql -U postgres -d mytholaptop -f sql/workspace/002_tasks.sql
psql -U postgres -d mytholaptop -f sql/workspace/003_media_workflow.sql
psql -U postgres -d mytholaptop -f sql/workspace/004_interns.sql

# 3. Verify tables created
psql -U postgres -d mytholaptop -c "\dt pm_*"
```

### Rollback Plan

```sql
-- Nếu cần rollback, chạy:
DROP TABLE IF EXISTS pm_intern_rankings CASCADE;
DROP TABLE IF EXISTS pm_weekly_performance CASCADE;
DROP TABLE IF EXISTS pm_intern_kpis CASCADE;
DROP TABLE IF EXISTS pm_interns CASCADE;
DROP TABLE IF EXISTS pm_workflow_comments CASCADE;
DROP TABLE IF EXISTS pm_ai_suggestions CASCADE;
DROP TABLE IF EXISTS pm_workflow_stages CASCADE;
DROP TABLE IF EXISTS pm_media_workflows CASCADE;
DROP TABLE IF EXISTS pm_status_history CASCADE;
DROP TABLE IF EXISTS pm_task_activities CASCADE;
DROP TABLE IF EXISTS pm_task_comments CASCADE;
DROP TABLE IF EXISTS pm_tasks CASCADE;
DROP TABLE IF EXISTS pm_campaigns CASCADE;
DROP TABLE IF EXISTS pm_projects CASCADE;
```
