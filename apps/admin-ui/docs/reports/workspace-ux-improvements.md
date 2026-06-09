# Workspace UX Improvements — Implementation Report

**Ngày:** 2026-05-30
**Người thực hiện:** Claude Agent
**Phiên bản:** MTP v3 — Workspace Task & Campaign Module

---

## 1. Tóm tắt

Nâng cấp Workspace Dashboard, Kanban board, Task card và Campaign card với:
- Kanban responsive full-width cho 1920px
- Task card: assignee avatar/name, campaign name, days remaining, progress
- Campaign card: team avatars, task progress %, completion badge
- 4 dashboard widgets mới: Tasks by Employee, Overdue Tasks, Campaign Progress, Tasks Completed This Week

---

## 2. Files Changed

### UI Components

| File | Change |
|------|--------|
| `components/kanban/kanban-board.tsx` | Column min-width 280px → xl:320px → 2xl:360px; gap 4px → 3px; scrollbar-thin; max-height responsive |
| `components/kanban/kanban-card.tsx` | Thêm `daysLeft`, `(quá Xd)` overdue label, checklist compact indicator, assignee name full width trên md+ |
| `components/campaigns/campaign-card.tsx` | Task progress bar, completed/total badge %, team member avatars, `staffMap` prop |
| `components/campaigns/campaign-list.tsx` | `staffMap` prop, pass `completedTaskCount` + `staffMap` đến `CampaignCard` |
| `components/dashboard/tasks-by-employee-widget.tsx` | **NEW** — KPI by user với progress bar + avatar |
| `components/dashboard/overdue-tasks-widget.tsx` | **NEW** — Danh sách tasks quá hạn với số ngày |
| `components/dashboard/campaign-progress-widget.tsx` | **NEW** — Campaign KPI: completion rate + active/completed/overdue |
| `components/dashboard/tasks-completed-week-widget.tsx` | **NEW** — Hoàn thành tuần này vs tuần trước |

### Server Components

| File | Change |
|------|--------|
| `app/(admin)/workspace/page.tsx` | Tích hợp 4 widget mới, layout 2-row grid: KPI + Tasks + Campaign + Completed |
| `app/(admin)/campaigns/page.tsx` | Load `getActiveStaff()` → build `staffMap` → pass đến `CampaignsClient` |

### API Routes

| File | Change |
|------|--------|
| `app/api/kpi/route.ts` | Thêm `campaign` KPI type → gọi `getCampaignKpi()` |

### Database

| File | Change |
|------|--------|
| `lib/workspace/db/index.ts` | `getCampaigns()`: thêm `_completed_task_count`, `_unique_assignees`, `_assignee_ids` qua LATERAL join |
| `lib/workspace/db/index.ts` | Thêm `getCampaignKpi()`: đếm total/active/completed/overdue campaigns |
| `lib/workspace/types.ts` | `Campaign` interface: thêm `_completed_task_count`, `_unique_assignees`, `_assignee_ids` |

### Validation / Schema

| File | Change |
|------|--------|
| `components/campaigns/campaign-form.tsx` | Thêm `campaign_statuses` vào `CampaignMasterData`; Status dropdown dynamic |
| `app/(admin)/campaigns/campaigns-client.tsx` | Nhận + pass `staffMap` đến `CampaignList` |

---

## 3. Chi tiết kỹ thuật

### Kanban Responsive Layout

```tsx
// Before: min-w-[260px] w-[260px] gap-4
// After:  min-w-[280px] xl:min-w-[320px] xl:w-[320px] 2xl:min-w-[360px] gap-3

// Column width scale:
Screen     | Min Width | Width
-----------|-----------|-------
default    | 280px     | 280px
xl (1280+) | 320px     | 320px
2xl (1536+)| 360px     | 360px
```

### Task Card Enrichment

```tsx
// New: Days remaining display
{dueDateMs !== null && !isOverdue && daysLeft !== null && (
  <span className="text-[10px] font-medium text-green-600 ml-0.5">
    ({daysLeft}d)
  </span>
)}
// Example: "03 Thg 6 (5d)"

// New: Overdue label
{isOverdue && (
  <span className="text-[10px] font-medium text-red-600 ml-0.5">
    (quá {Math.abs(daysLeft ?? 0)}d)
  </span>
)}

// Checklist compact indicator in meta row
{task.checklist_progress && task.checklist_progress.total > 0 && (
  <div className="flex items-center gap-1 text-slate-400">
    {task.checklist_progress.percentage === 100
      ? <CheckCircle2 className="size-3 text-green-500" />
      : <Circle className="size-3" />}
    <span>{task.checklist_progress.completed}/{task.checklist_progress.total}</span>
  </div>
)}
```

### Campaign Card — Team Members via LATERAL JOIN

```sql
-- getCampaigns() enhanced SQL
SELECT c.*,
  COALESCE(task_stats.total, 0)::int AS _task_count,
  COALESCE(task_stats.completed, 0)::int AS _completed_task_count,
  COALESCE(task_stats.unique_assignees, 0)::int AS _unique_assignees,
  task_stats.assignee_ids AS _assignee_ids
FROM pm_campaigns c
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE t.status IN ('completed', 'cancelled'))::int AS completed,
    COUNT(DISTINCT a.assignee_id) AS unique_assignees,
    ARRAY_AGG(DISTINCT a.assignee_id) FILTER (WHERE a.assignee_id IS NOT NULL) AS assignee_ids
  FROM pm_tasks t
  LEFT JOIN LATERAL unnest(t.assignee_ids) WITH ORDINALITY AS a(assignee_id, ord) ON TRUE
  WHERE t.campaign_id = c.id
) task_stats ON TRUE
```

### Dashboard KPI API — `campaign` type

```typescript
// GET /api/kpi?type=campaign
case "campaign": {
  const campaign = await getCampaignKpi();
  return NextResponse.json({ data: campaign });
}

// lib/workspace/db — getCampaignKpi()
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE status = 'active')::int AS active,
  COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
  COUNT(*) FILTER (WHERE status = 'active' AND end_date < CURRENT_DATE)::int AS overdue
FROM pm_campaigns WHERE deleted_at IS NULL
```

---

## 4. Data Flow

### Workspace Page → New Widgets

```
/workspace (Server Component)
  → getTasks()
  → getWorkspaceStats()
  → ...
    → WorkspaceStatsWidget (6 stats)
    → ContentCalendarWidget
    → NotificationAlertWidget
    → grid: TeamPerformanceWidget (API: /api/kpi?type=overview)
    → grid: ContentPipelineWidget  (API: /api/kpi?type=overview)
    → grid: CampaignProgressWidget (API: /api/kpi?type=campaign) ← NEW
    → grid: TasksByEmployeeWidget (API: /api/kpi?type=user) ← NEW
    → grid: OverdueTasksWidget    (tasks prop) ← NEW
    → grid: TasksCompletedThisWeekWidget (API: /api/kpi?type=weekly) ← NEW
    → PublishMetricsWidget + KpiCharts
    → ApprovalMetricsWidget
```

### Campaign Card → Team Members

```
getCampaigns()
  → SQL LATERAL JOIN pm_tasks
  → campaigns[0]._assignee_ids = ['uuid1', 'uuid2']
  → campaigns[0]._completed_task_count = 3
  → campaigns[0]._task_count = 5
    → CampaignList(staffMap, statusOptions, typeOptions)
      → CampaignCard(staffMap, completedTaskCount=_completed_task_count)
        → Avatar (name tooltip) + progress bar + "3/5 Hoàn thành"
```

---

## 5. Testing Checklist

### Kanban Board
- [ ] Mở /tasks trên 1920px screen → columns dùng hết chiều rộng
- [ ] Scroll ngang smooth, không whitespace thừa
- [ ] 7 columns vừa màn hình 1920px

### Task Card
- [ ] Assignee avatar có tooltip hiển thị tên + vai trò
- [ ] Due date hiển thị "(5d)" với days remaining
- [ ] Overdue task hiển thị "(quá 3d)"
- [ ] Campaign name badge hiển thị nếu task có campaign_id
- [ ] Checklist compact: "2/5" indicator trong meta row

### Campaign Card
- [ ] Campaign card hiển thị team member avatars (tooltip tên)
- [ ] Progress bar hiển thị completed/total
- [ ] Badge: "5 công việc 60%"
- [ ] Status label từ master data (không phải hardcoded)

### Dashboard Widgets
- [ ] **Tasks by Employee**: mỗi nhân viên có avatar, progress bar, số quá hạn
- [ ] **Overdue Tasks**: danh sách tasks quá hạn, click → trang task detail
- [ ] **Campaign Progress**: completion rate %, active/completed/overdue count
- [ ] **Tasks Completed This Week**: so sánh vs tuần trước, diff %

### General
- [ ] Không có 400/500 error trong console
- [ ] Build không có TypeScript error
- [ ] Tất cả widgets hiển thị đúng khi không có data (empty state)

---

## 6. Regression Risks

| Area | Risk | Mitigation |
|------|------|------------|
| `getCampaigns()` SQL change | PostgreSQL LATERAL join syntax | Tested; standard SQL |
| `campaign-card.tsx` | `staffMap` prop optional — undefined fallback | Default `{}` |
| `getCampaignKpi()` | Nếu view `v_kpi_overview` không tồn tại | Query direct counts |
| `getUserKpiList()` | Nếu chưa có dữ liệu assignment | Empty state widget |
| KPI API `campaign` type | Chưa có trong API route | Added to switch case |

---

## 7. Migration Notes

### Database (No migration needed)

Changes use existing tables:
- `pm_campaigns` — existing columns
- `pm_tasks.campaign_id` — existing foreign key
- `pm_tasks.assignee_ids` — existing array column

### KPI Database View (Optional)

If `v_kpi_overview` view doesn't exist or is incomplete, `getWorkspaceKpiOverview()` may fail. Check with:
```sql
SELECT * FROM v_kpi_overview LIMIT 1;
```
If empty, the existing widgets that depend on it (`TeamPerformanceWidget`, `ContentPipelineWidget`) will show empty data.

### Seed Data

Ensure these master data categories have entries:
```sql
-- Campaign statuses
INSERT INTO pm_master_data (category, code, name, color, bg_color, is_active)
VALUES ('campaign_status', 'active', 'Đang chạy', '#16a34a', '#dcfce7', true)
ON CONFLICT DO NOTHING;

-- Campaign types
INSERT INTO pm_master_data (category, code, name, color, is_active)
VALUES ('campaign_type', 'social_media', 'Mạng xã hội', '#3b82f6', true)
ON CONFLICT DO NOTHING;
```
