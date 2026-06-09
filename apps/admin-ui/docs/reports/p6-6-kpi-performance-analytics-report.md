# P6.6: KPI & Performance Analytics — Báo cáo hoàn thành

**Ngày:** 27/05/2026
**Phase:** P6.6
**Trạng thái:** ✅ Hoàn thành

---

## Tổng quan

P6.6 đã triển khai hệ thống KPI & Performance Analytics cho Workspace, cho phép đo lường hiệu suất của team content/media, workflow, và các chỉ số nội dung theo thời gian thực.

**Nguyên tắc thiết kế:**
- Ưu tiên SQL views/materialized views thay vì duplicate data
- KPI tính toán hoàn toàn từ database, không phụ thuộc logic phía client
- Widgets load dữ liệu từ API riêng, không blocking SSR
- Role-based access control cho từng loại KPI

---

## KPI đã hỗ trợ

### 1. Workspace KPI (tổng quan)

| KPI | Mô tả |
|-----|--------|
| `tasksInProgress` | Số task đang thực hiện (không phải published/archived) |
| `tasksPublished` | Tổng số task đã đăng |
| `tasksOverdue` | Task quá hạn (due_date < hôm nay, chưa approved/scheduled/published) |
| `tasksDueThisWeek` | Task đến hạn trong 7 ngày tới |
| `approvalsApproved30d` | Số approval đã duyệt (30 ngày) |
| `approvalsRejected30d` | Số approval bị từ chối (30 ngày) |
| `approvalsSubmitted30d` | Số approval đã gửi (30 ngày) |
| `approvedNotPublished` | Đã duyệt nhưng chưa đăng |
| `publishedThisWeek` | Số task đã đăng tuần này |
| `publishedThisMonth` | Số task đã đăng tháng này |
| `publishedFacebook/Website/Tiktok/YouTube/Zalo` | Số task đã đăng theo nền tảng |
| `activeCampaigns` | Số chiến dịch đang hoạt động |
| `overdueCampaigns` | Chiến dịch quá hạn |

### 2. User KPI (theo assignee)

| KPI | Mô tả |
|-----|--------|
| `tasksAssigned` | Tổng task được giao |
| `tasksCompleted` | Task đã hoàn thành (published) |
| `tasksInProgress` | Task đang thực hiện |
| `tasksOverdue` | Task quá hạn |
| `tasksDueThisWeek` | Task đến hạn tuần này |
| `approvalsApproved30d` | Số task đã duyệt (30 ngày) |
| `approvalsRejected30d` | Số task bị từ chối (30 ngày) |
| `published30d` | Số task đã đăng (30 ngày) |
| `avgCompletionDays` | Trung bình số ngày hoàn thành (90 ngày gần nhất) |
| `completionRate` | `tasksCompleted / tasksAssigned` (0–1) |
| `overdueRate` | `tasksOverdue / tasksAssigned` (0–1) |

### 3. Content KPI

| KPI | Mô tả |
|-----|--------|
| `totalTasks` | Tổng số task |
| `inProgress` | Đang thực hiện |
| `published` | Đã đăng |
| `overdue` | Quá hạn |
| `approvedNotPublished` | Đã duyệt chưa đăng |
| `scheduled` | Đã lên lịch |
| `byPlatform` | Số đã đăng theo từng nền tảng |
| `publishedThisWeek` | Đã đăng tuần này |
| `publishedThisMonth` | Đã đăng tháng này |

### 4. Weekly Trend

| KPI | Mô tả |
|-----|--------|
| `weekStart` | Ngày bắt đầu tuần |
| `completed` | Số task hoàn thành trong tuần |
| `approved` | Số approval đã duyệt trong tuần |
| `published` | Số task đã đăng trong tuần |

---

## SQL Views & Functions đã thêm

### `sql/workspace/017_kpi_views.sql`

**Views:**

1. **`v_kpi_overview`** — KPI tổng quan workspace
   - Tất cả task counts, approval counts, platform breakdown
   - Campaign metrics, overdue counts
   - Không có tham số, gọi `SELECT * FROM v_kpi_overview`

2. **`v_kpi_user_performance`** — KPI per user theo assignee
   - Join với `admin_users` để lấy user info
   - Count tasks where user is in `assignee_ids` array
   - Tính `completion_rate` và `overdue_rate` ở TypeScript layer

**Functions:**

3. **`get_weekly_completion_trend(weeks_count INTEGER)`** — Trend tuần
   - Dùng `generate_series()` để tạo các tuần liên tục
   - Trả về `completed`, `approved`, `published` cho mỗi tuần
   - Mặc định 8 tuần, tối đa 12 tuần

---

## Files đã tạo

```
apps/admin-ui/
├── sql/workspace/
│   └── 017_kpi_views.sql                          # SQL views + functions
├── scripts/
│   └── run-migration-017.js                       # Migration runner
├── lib/workspace/
│   └── types-kpi.ts                               # KPI TypeScript types
├── app/api/kpi/
│   └── route.ts                                   # KPI API endpoint
└── components/dashboard/
    ├── team-performance-widget.tsx                # Team KPI widget
    ├── content-pipeline-widget.tsx                # Content pipeline widget
    ├── approval-metrics-widget.tsx                # Approval metrics widget
    ├── publish-metrics-widget.tsx                 # Publish metrics widget
    └── kpi-charts.tsx                             # Weekly trend chart (pure CSS/SVG)
```

### Files đã sửa

```
apps/admin-ui/
├── lib/workspace/db/index.ts                      # Thêm KPI functions
├── app/(admin)/workspace/page.tsx                 # Thêm KPI widgets vào dashboard
└── app/api/kpi/route.ts                          # KPI API
```

---

## Dashboard Widgets mới

### 1. Team Performance Widget (`team-performance-widget.tsx`)
- Hiển thị: Đã đăng tháng này, Gửi duyệt (30d), Đã duyệt (30d), Bị từ chối (30d), Quá hạn, Đến hạn tuần này
- Summary row: Tổng đã đăng, Tổng đã duyệt, Tỷ lệ đăng
- Mini bar chart theo nền tảng (Facebook, Website, TikTok, YouTube, Zalo)
- Load từ `/api/kpi?type=overview`

### 2. Content Pipeline Widget (`content-pipeline-widget.tsx`)
- Hiển thị: Đang thực hiện, Chờ đăng, Đã đăng tháng này, Quá hạn
- Progress bar tỷ lệ đăng tháng
- Load từ `/api/kpi?type=overview`

### 3. Approval Metrics Widget (`approval-metrics-widget.tsx`)
- Hiển thị funnel: Gửi duyệt → Đã duyệt / Bị từ chối
- Tỷ lệ duyệt (approve rate) và tỷ lệ từ chối (reject rate)
- Số yêu cầu đang chờ
- Load từ `/api/kpi?type=overview`

### 4. Publish Metrics Widget (`publish-metrics-widget.tsx`)
- Tuần này / Tháng này
- Breakdown theo nền tảng với horizontal bar chart
- Số chờ đăng (approved not published)
- Load từ `/api/kpi?type=content`

### 5. KPI Charts (`kpi-charts.tsx`)
- Stacked bar chart 8 tuần gần nhất
- Ba metrics: Hoàn thành (xanh dương), Duyệt (xanh lá), Đăng (tím)
- Tooltip khi hover
- Summary row bên dưới
- Load từ `/api/kpi?type=weekly`

---

## API Endpoints

### `GET /api/kpi`

| Parameter | Giá trị | Mô tả |
|-----------|---------|--------|
| `type=overview` | — | KPI tổng quan workspace |
| `type=user` | — | KPI tất cả users (admin+) |
| `type=myself` | — | KPI cá nhân (theo session) |
| `type=weekly` | `weeks=8` | Trend tuần (1–12 tuần) |
| `type=content` | — | Content KPI chi tiết |

**Auth:** Session cookie (requireAdminAuth)

**RBAC:**
- `viewer` → chỉ xem overview
- `editor` → overview + myself
- `admin/super_admin` → overview + myself + user (team)

---

## Logic KPI

### completion_rate
```
tasksCompleted / tasksAssigned
```
Tính ở TypeScript layer từ `v_kpi_user_performance`.

### overdue_rate
```
tasksOverdue / tasksAssigned
```
Logic overdue: `due_date < CURRENT_DATE AND stage NOT IN ('approved', 'scheduled', 'published')`

### publish metrics
```
publishedThisWeek: DATE_TRUNC('week', published_at) = tuần hiện tại
publishedThisMonth: DATE_TRUNC('month', published_at) = tháng hiện tại
```

### approved_not_published
```
WHERE stage = 'approved' (chưa chuyển sang scheduled/published)
```

---

## Workspace Dashboard (sau P6.6)

```
Workspace
├── WorkspaceStatsWidget          (6 stat cards: projects, due_this_week, overdue_tasks, overdue_campaigns, published, interns)
├── ContentCalendarWidget         (P6.4: tuần này, approved not published, overdue, tháng này)
├── NotificationAlertWidget       (P6.5: overdue, pending approval, due soon)
├── TeamPerformanceWidget         (P6.6: new) ← 6 KPI metrics + platform bars
├── ContentPipelineWidget         (P6.6: new) ← pipeline counts + publish rate
├── ApprovalMetricsWidget         (P6.6: new) ← funnel + rates
├── PublishMetricsWidget          (P6.6: new) ← week/month + platform breakdown
├── KpiCharts                     (P6.6: new) ← 8-week stacked bar chart
├── DeadlineAlertWidget
├── CampaignAlertWidget
├── MediaStatsWidget
├── TeamActivityWidget
├── TopInterns
└── RecentProjects
```

---

## Rủi ro còn tồn tại

1. **NULL assignee_ids array**: Nếu task có `assignee_ids = NULL` hoặc empty array, user KPI sẽ không đếm. Chấp nhận rủi ro này vì đây là data quality issue.

2. **`avg_completion_days`**: Nếu không có task nào completed trong 90 ngày, hàm trả về 0 thay vì null. Có thể cần điều chỉnh.

3. **Weekly trend gaps**: Nếu một tuần không có data, `generate_series` vẫn tạo row với count = 0. Đây là hành vi đúng để hiển thị chart liên tục.

4. **Chưa có materialized view**: `v_kpi_overview` và `v_kpi_user_performance` là regular views, recalculate mỗi query. Với lượng data lớn (10k+ tasks), nên consider materialized view với `REFRESH MATERIALIZED VIEW`.

5. **Platform column**: Nếu `platform` column trong `pm_tasks` là nullable và có giá trị NULL, các task không có platform sẽ không được đếm trong breakdown theo nền tảng.

6. **Overdue logic cho scheduled tasks**: Task ở stage `scheduled` được exclude khỏi overdue count. Nếu một scheduled task đã qua `publish_date` nhưng chưa chuyển sang `published`, nó không bị tính là overdue. Có thể cần bổ sung logic `publish_date < CURRENT_DATE` để cover case này.

---

## Đề xuất P6.7 tiếp theo

### P6.7: KPI Detail Pages & Export Reports

**Mục tiêu:** Cung cấp trang chi tiết KPI và khả năng export báo cáo.

**Files cần tạo:**
- `app/(admin)/workspace/kpi/page.tsx` — KPI detail page với filters
- `app/api/kpi/export/route.ts` — Export CSV/PDF
- `components/kpi/kpi-filter-bar.tsx` — Date range, user filter, campaign filter
- `components/kpi/kpi-table.tsx` — User performance table với sortable columns
- `lib/workspace/kpi-calc.ts` — KPI calculation helpers

**Tính năng:**
1. KPI detail page với date range picker (tuần, tháng, quý, tùy chỉnh)
2. User filter để xem KPI từng cá nhân
3. Campaign filter để xem KPI theo campaign
4. Export CSV cho báo cáo
5. So sánh với period trước (WoW, MoM growth)
6. Top performers leaderboard
7. Drill-down từ overview → user → task list

**Ưu tiên:**
- Low: Export PDF với chart rendering
- Medium: WoW/MoM comparison
- High: Date range filter + user filter trên detail page

---

## Migration Instructions

```bash
# Chạy migration
node apps/admin-ui/scripts/run-migration-017.js

# Hoặc dùng psql trực tiếp
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f apps/admin-ui/sql/workspace/017_kpi_views.sql
```

---

## Build & Test Results

| Check | Kết quả |
|-------|---------|
| TypeScript (`pnpm tsc --noEmit`) | ✅ Pass |
| Next.js build (`pnpm next build`) | ✅ Pass |
| API route | ✅ `/api/kpi?type=overview\|user\|weekly\|content` |
| Widgets rendered | ✅ 5 widgets + 1 chart |
| SQL views | ✅ 2 views + 1 function |
| RBAC | ✅ Viewer/Editor/Admin/Super_admin |
