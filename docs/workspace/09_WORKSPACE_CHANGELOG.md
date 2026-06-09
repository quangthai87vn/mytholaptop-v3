## 2026-06-03 — Product Data Source Refactor

### Root Cause
- Products page always called Medusa API regardless of configuration
- No mechanism to switch between Medusa and WooCommerce as product data source
- WooCommerce proxy (`/api/woo`) read credentials without decryption

### Added
- **Product data source setting:** `product_data_source` stored in `app_settings` table (`woocommerce` default)
- **3-tab Settings layout:** Thông tin công ty, Nguồn dữ liệu sản phẩm, Kiểm tra & đồng bộ
- **WooCommerce products hook:** `useWooCommerceProducts()`, `useWooCommerceConfigured()` in `hooks/use-medusa.ts`
- **`adaptWooProduct()`:** Unified adapter converting WooCommerce REST products to `AdaptedProduct` shape
- **Source routing in Products page:** Reads `product_data_source` → routes to Medusa or WooCommerce
- **Source-specific banners:** Different not-configured messages per source
- **Source-specific error states:** Different error messages per source
- **Documentation:** `docs/product/PRODUCT_DATA_SOURCE_RULES.md`, `PRODUCT_SETTINGS_FLOW.md`, `PRODUCT_TEST_CHECKLIST.md`

### Fixed
- **WooCommerce proxy decryption:** `loadWooCommerceCredentials()` now decrypts `consumerKey`/`consumerSecret` before using (AES-256 encrypted at rest)

### Changed
- **Settings page** refactored: removed Medusa/WooCommerce tabs, replaced with Company/ProductSource/Sync tabs
- **Products page**: reads data source setting, renders Medusa or WooCommerce products based on active source
- **`AdaptedProduct.rawProduct`**: changed from required to optional to support WooCommerce products
- **"Thêm sản phẩm" button**: hidden in WooCommerce direct mode

### Files Changed
- `app/api/settings/route.ts`
- `app/(admin)/settings/app/page.tsx`
- `app/api/woo/[...slug]/route.ts`
- `hooks/use-medusa.ts`
- `lib/products/product-filters.ts`
- `app/(admin)/products/page.tsx`

---

## 2026-06-03 — Assignee Persistence Fixes

### Fixed
- **Junction table INSERT fix:** Placeholder indices corrected to include `$1` (task_id) in every row. Was causing `INSERT has more target columns than expressions` error.
- **DB triggers recreated:** `trg_sync_insert` and `trg_sync_delete` on `pm_task_assignees` were not attached. Verified working with live test.
- **Zod default override fix:** `assignee_ids` default `[]` was being sent to DB even when not in request body, causing silent assignee wipes on partial updates. Track original body keys to detect absent fields.
- **`updateTask` early return removed:** Fresh SELECT now always runs after junction sync to return true server state.
- **`createTask` / `duplicateTask` junction sync:** Both now populate `pm_task_assignees` junction table in addition to setting `assignee_ids` column.
- **UI merge state fix:** `mergeTaskState` now preserves `assignee_ids` from current task when server response doesn't include it, preventing menu button disappearance after drag.

### Files Changed
- `lib/workspace/db/index.ts`
- `app/api/tasks/[id]/route.ts`
- `components/tasks/tasks-client.tsx`

---

## 2026-06-02 — Full Workspace Audit Fix (Tasks, Calendar, Campaigns, Projects, Dashboard)

### HIGH Severity Fixed
- **Checklist routes unsafe `!` assertions**: `api/tasks/[id]/checklist/route.ts` và `[itemId]/route.ts` — `_authUser` được cast với `!` có thể crash server. Đã sửa thành optional chaining `rawUser?.id ?? "system"`.
- **GET `/api/tasks/[id]` missing auth**: Endpoint không kiểm tra authentication, ai cũng đọc được task. Đã thêm kiểm tra `_authUser`.
- **`assignee_id` vs `ANY(assignee_ids)` trong `getActivities`**: Filter intern dùng `WHERE assignee_id = $X` nhưng column là `assignee_ids UUID[]`. Đã sửa thành `$X = ANY(assignee_ids)`.
- **`getOverdueCampaigns()` crash on missing procedure**: Gọi `get_overdue_campaigns()` không có try/catch — crash dashboard. Đã bọc try/catch trả về `[]`.
- **`mapTaskRow` passthrough cast**: `row as unknown as Task` không transform gì — `attachments`/`dependencies` có thể là `null` gây crash. Đã thêm explicit field mapping với `Array.isArray()` guards.

### MEDIUM Severity Fixed
- **`sessionUser!.id` non-null assertion**: KPI `myself` case và notifications GET có thể crash. Đã thêm guard check.
- **Silent `catch(() => {})`**: Widgets `ContentCalendarWidget` và `CalendarClient` nuốt lỗi không feedback. Đã thay bằng `catch((err) => console.warn(...))`.
- **N+1 queries in `getWorkspaceMembers`**: 1 query user + N×2 queries intern/task-stats. Đã refactor thành 3 queries bulk + Map lookup.
- **`getProjects` discards `status`/`priority` filters**: API truyền filter nhưng function bỏ qua. Đã thêm filter logic vào SQL.
- **`handleDelete` no `deleteConfirm` reset**: Xóa project thành công không reset dialog state. Đã thêm `setDeleteConfirm(false)`.
- **`window.location.reload()` in `ApprovalSection`**: Full page reload thay vì Next.js router refresh. Đã thay bằng `router.refresh()`.
- **`getWorkspaceStats` crash on missing view**: Query `v_workspace_stats` không có error handling — crash dashboard. Đã bọc try/catch.
- **Activity API missing rate limit**: `/api/activity` không có `checkWorkspaceRateLimit`. Đã thêm.
- **Workspace page queries wrong table**: Dùng `pm_task_activities` thay vì `v_workspace_activities`. Đã sửa.
- **Notifications `limit=0` division by zero**: `totalPages = Infinity`. Đã thêm `Math.max(1, limit)`.
- **`window.location.href` in `DeadlineAlertWidget`**: Full page reload thay vì `useRouter`. Đã sửa.
- **Duplicate icon imports in `NotificationAlertWidget`**: `AlertTriangle`, `Clock`, `CheckCircle2` import 2 lần. Đã gộp.

### Files Changed
- `apps/admin-ui/app/api/tasks/[id]/checklist/route.ts`
- `apps/admin-ui/app/api/tasks/[id]/checklist/[itemId]/route.ts`
- `apps/admin-ui/app/api/tasks/[id]/route.ts`
- `apps/admin-ui/lib/workspace/db/index.ts` (3 functions)
- `apps/admin-ui/app/api/kpi/route.ts`
- `apps/admin-ui/app/api/notifications/route.ts`
- `apps/admin-ui/app/api/activity/route.ts`
- `apps/admin-ui/components/dashboard/content-calendar-widget.tsx`
- `apps/admin-ui/components/dashboard/notification-alert-widget.tsx`
- `apps/admin-ui/components/dashboard/deadline-alert-widget.tsx`
- `apps/admin-ui/components/tasks/approval-section.tsx`
- `apps/admin-ui/components/projects/project-detail-client.tsx`
- `apps/admin-ui/app/(admin)/workspace/page.tsx`

### Runtime Status
- DB function `create_notification` đã cập nhật trên PostgreSQL runtime.
- Không còn lỗi `dedup_key ambiguous` trong log.
- 4 file đã nạp: `016_notifications.sql` (source SQL), DB function (runtime), `changelog.md`, `bug_tracking.md`.

---

## 2026-06-02 — Workspace Task Notification Dedup Fix

### Fixed
- Corrected the PostgreSQL `create_notification(jsonb)` function so `dedup_key` is referenced unambiguously inside the notification deduplication query.
- Prevented `task_assigned` notification failures when editing a task and assigning users.

### Notes
- The source SQL has been updated in `apps/admin-ui/sql/workspace/016_notifications.sql`.
- The running database must reload the function for the fix to take effect in runtime.


### Changed
- Standardized `/tasks` as the canonical Workspace task board.
- Reused the stable workflow-style Kanban layout to remove the fragile drawer-driven interaction path.
- Kept task CRUD, drag/drop, permission gates, and activity-aware flows on the unified board.
- Deprecated `/media-workflow` so it no longer competes with `/tasks` as the main task surface.

### Notes
- The board now emphasizes modal/dialog interactions for create, edit, copy, archive, and delete.
- PostgreSQL task data remains intact; this change is UI and route consolidation only.
- Master data continues to drive statuses, task types, and platform options.

## 2026-06-02 — Workspace Consolidation Analysis

### Added
- Analysis of `/tasks` and `/media-workflow` duplication in Workspace.
- Proposed a single canonical Workspace board with workflow as a view/filter mode.
- Documented route, component, API, DB, and permission dependencies for consolidation.

### Notes
- The current `/tasks` interaction stack is more complex and fragile than the workflow pipeline UI.
