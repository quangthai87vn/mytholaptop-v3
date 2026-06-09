# P6.1 Business Flow Audit Report

**Ngày:** 27/05/2026
**Scope:** Project → Campaign → Task → Media Workflow → Calendar → Activity
**Build status:** TypeScript pass, Next.js build pass

---

## 1. Tổng quan

Audit toàn bộ flow nghiệp vụ content/media team từ P1–P5.11. Kết quả: **3 lỗi nhỏ đã fix**, 6 issues lớn cần theo dõi qua checklist đề xuất P6.2/P6.3. Backend (API + DB) hoạt động tốt, vấn đề tập trung ở frontend form coverage.

---

## 2. Flow Checklist

### 2.1. Project Flow

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Tạo project | ✅ PASS | API `POST /api/projects` + Zod validation + audit log |
| 2 | Edit project | ✅ PASS | API `PUT /api/projects/[id]` + Zod validation |
| 3 | Status/Priority/Date đúng | ✅ PASS | DB schema + API đúng |
| 4 | Hiện trong dashboard | ✅ PASS | `v_workspace_stats` + `getProjects()` |
| 5 | Project delete log audit | ✅ PASS | **Đã fix P6.1** — ghi `pm_status_history` trước khi xóa |
| 6 | Project không tự động update khi task/campaign thay đổi | ⚠️ WARN | Project status độc lập — team tự quản lý |

### 2.2. Campaign Flow

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Campaign thuộc project | ✅ PASS | `project_id` FK trong DB + API |
| 2 | Filter/search hoạt động | ✅ PASS | `GET /api/campaigns?project_id=&status=` |
| 3 | Deadline/end_date đúng | ✅ PASS | DB + API hỗ trợ `end_date` |
| 4 | Campaign hiện đúng trong project detail | ⚠️ WARN | Hiện danh sách campaign nhưng không có campaign detail drill-down |

### 2.3. Task Flow

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Task thuộc project/campaign | ✅ PASS | `project_id`, `campaign_id` FK |
| 2 | task_type đúng | ✅ PASS | 8 loại trong `types.ts` |
| 3 | Assignee đúng | ✅ PASS | **Đã fix P6.1** — thêm UI chọn assignee |
| 4 | due_date đúng | ✅ PASS | DB + API + Form đều hỗ trợ |
| 5 | Status và workflow_stage đúng | ✅ PASS | Kanban (status) + Media Pipeline (workflow_stage) |
| 6 | Status filter trong toolbar | ✅ PASS | Filter sidebar có `statusFilter`, `priorityFilter`, `search` |
| 7 | Kanban drag-drop cập nhật task | ✅ PASS | PUT `/api/tasks/[id]` với `{ status: newStatus }` |

### 2.4. Media Workflow

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Chỉ hiện task media/content | ✅ PASS | Client-side filter `task_type in MEDIA_TASK_TYPES` |
| 2 | Kéo stage cập nhật đúng task | ✅ PASS | `workflow-pipeline.tsx` → PUT `/api/tasks/[id]` |
| 3 | Task không bị duplicate | ✅ PASS | Migration 008 đã merge, API trả 410 Gone |
| 4 | Cancelled column trên Kanban | ✅ PASS | **Đã fix P6.1** — thêm cột Cancelled |

### 2.5. Calendar

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Hiện task theo due_date | ✅ PASS | `calendar-view.tsx` lọc `due_date` |
| 2 | Campaign deadline hiện trên calendar | ❌ FAIL | Chỉ hiện tasks, không hiện campaign `end_date` |

### 2.6. Activity

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Tạo/sửa/xóa project/campaign/task có log | ⚠️ WARN | Có `pm_task_activities` + `pm_status_history` nhưng project detail không show |
| 2 | Đổi status/stage có log | ✅ PASS | `updateTask` ghi cả `pm_task_activities` và `pm_status_history` |
| 3 | Activity page hiện đầy đủ | ⚠️ WARN | Dùng `v_workspace_activities` — nhưng Dashboard widget chỉ đọc `pm_task_activities` |

### 2.7. RBAC trên business flow

| # | Check | Status | Chi tiết |
|---|-------|--------|---------|
| 1 | Viewer chỉ xem | ✅ PASS | `requireAdminAuth` block write cho viewer |
| 2 | Editor không vào settings/credentials | ✅ PASS | `settings.manage`, `credentials.manage` check |
| 3 | Admin quản lý user | ✅ PASS | `users.read/create/update/delete` permission check |
| 4 | Viewer không thấy admin pages | ✅ PASS | Navigation check trong `lib/navigation.ts` |

---

## 3. Lỗi đã sửa trong P6.1

### 3.1. `assignee_ids` không có UI trong TaskForm

**Mức độ:** HIGH
**File:** `components/tasks/task-form.tsx`
**Vấn đề:** Form luôn gửi `assignee_ids: []`, không có UI để chọn người phụ trách.
**Đã fix:**
- Thêm prop `staff` vào `TaskFormProps` — danh sách staff từ DB
- Thêm `assignee_ids` vào form state (trước đây absent)
- Thêm Popover + Checkbox multi-select để chọn nhiều assignee
- Thêm `getActiveStaff()` vào `lib/workspace/db/index.ts`
- Cập nhật `app/(admin)/tasks/page.tsx` load staff list
- Cập nhật `TasksClient` truyền staff xuống TaskForm

### 3.2. `deleteProject` không ghi audit log

**Mức độ:** MEDIUM
**File:** `lib/workspace/db/index.ts`
**Vấn đề:** Xóa project không tạo entry trong `pm_status_history`, nên activity feed không thấy ai xóa project.
**Đã fix:** Thêm `INSERT INTO pm_status_history` trước `DELETE`:
```typescript
await query(
  `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)
   VALUES ('project', $1, 'deleted', 'System')`,
  [id]
);
```

### 3.3. `cancelled` status không hiện trên Kanban

**Mức độ:** MEDIUM
**File:** `components/kanban/kanban-board.tsx`
**Vấn đề:** Task bị `cancelled` biến mất khỏi Kanban vì không có column.
**Đã fix:** Thêm column config:
```typescript
{ id: "cancelled", title: "Cancelled", color: "hsl(0 70% 55%)" }
```

---

## 4. Lỗi còn tồn tại (Checklist đề xuất P6.2/P6.3)

### 4.1. Issues cần fix trong P6.2

#### [ ] Calendar không hiện campaign deadline

**Mức độ:** HIGH
**File:** `app/(admin)/workspace/calendar/page.tsx`
**Vấn đề:** Chỉ load `getTasks()` — không load campaign deadlines (`end_date`).
**Đề xuất:** Thêm `getCampaigns()` vào page, render campaign deadline như một loại calendar item riêng biệt (màu khác, icon khác).

#### [ ] Dashboard TeamActivityWidget không hiện project/campaign activities

**Mức độ:** HIGH
**File:** `app/(admin)/workspace/page.tsx` (lines 34-45)
**Vấn đề:** Dashboard query trực tiếp `pm_task_activities` — bỏ qua `v_workspace_activities` (có cả project/campaign status changes).
**Đề xuất:** Tạo function `getWorkspaceActivities(limit)` trong `db/index.ts` dùng `v_workspace_activities` view.

#### [ ] Project detail không có Activity tab

**Mức độ:** HIGH
**File:** `components/projects/project-detail-client.tsx`
**Vấn đề:** Không có feed activity riêng cho project. Không thể xem lịch sử thay đổi của project.
**Đề xuất:** Thêm tab Activity trong project detail, query `pm_status_history WHERE entity_type='project' AND entity_id=X` và `pm_task_activities JOIN pm_tasks WHERE project_id=X`.

### 4.2. Issues cần fix trong P6.3

#### [ ] `media_ready` stat luôn = 0

**Mức độ:** MEDIUM
**File:** `sql/workspace/009_workspace_stats_view.sql` (line 27)
**Vấn đề:** View hardcoded `0` — không compute thực.
**Đề xuất:** Thay bằng query count tasks với `workflow_stage = 'scheduled' OR workflow_stage = 'published'`.

#### [ ] TaskForm thiếu nhiều fields

**Mức độ:** MEDIUM
**File:** `components/tasks/task-form.tsx`
**Vấn đề:** Form còn thiếu: `task_type`, `platform`, `workflow_stage`, `reporter_id`, `start_date`, `estimated_hours`, `actual_hours`, `progress`, `published_url`, `parent_task_id`.
**Đề xuất:** Thêm collapsible "Advanced" section hoặc tab trong TaskForm.

#### [ ] CampaignForm thiếu fields

**Mức độ:** MEDIUM
**File:** `components/campaigns/campaign-form.tsx`
**Vấn đề:** Form thiếu: `tags`, `target_metrics`, `actual_metrics`.
**Đề xuất:** Thêm fields vào form, dùng JSON input cho metrics.

#### [ ] ProjectForm thiếu fields

**Mức độ:** LOW
**File:** `components/projects/project-form.tsx`
**Vấn đề:** Form thiếu: `owner_id`, `team_ids`, `metadata`.
**Đề xuất:** Thêm team selection (Popover + Checkbox) cho `team_ids`.

### 4.3. Issues tốt để có nhưng không bắt buộc

#### [ ] No automatic project status derivation

**Mức độ:** LOW
**Ghi chú:** Khi tất cả task trong project done → project không tự động `completed`. Team phải tự cập nhật. Có thể hữu ích nhưng là tùy chọn.

#### [ ] Không có Kanban transition rules

**Mức độ:** LOW
**Ghi chú:** Drag từ `done` → `todo` được phép. Không có enforced workflow. Có thể OK cho team linh hoạt.

#### [ ] `TaskActivity.actor_id` typed `string` vs DB `UUID`

**Mức độ:** LOW
**Ghi chú:** Type mismatch không ảnh hưởng runtime nhưng nên fix thành `string` (UUID serializes to string in JSON).

---

## 5. File đã sửa

| File | Thay đổi |
|------|---------|
| `lib/workspace/db/index.ts` | Thêm `getActiveStaff()`, fix `deleteProject` ghi audit log |
| `lib/workspace/db/index.ts` | Export `StaffMember` interface |
| `components/tasks/task-form.tsx` | Thêm `assignee_ids` state + Popover multi-select UI |
| `components/tasks/tasks-client.tsx` | Nhận prop `staff`, truyền xuống TaskForm |
| `app/(admin)/tasks/page.tsx` | Load `getActiveStaff()` và truyền xuống TasksClient |
| `components/kanban/kanban-board.tsx` | Thêm column `cancelled` |

---

## 6. Có đủ điều kiện xây tính năng vận hành thật chưa?

**GẦN ĐỦ — cần P6.2 trước khi vận hành thật.**

| Tiêu chí | Trạng thái |
|----------|-----------|
| Tạo/sửa/xóa Project | ✅ Sẵn sàng |
| Tạo/sửa Campaign | ✅ Sẵn sàng |
| Tạo/sửa Task với assignee | ✅ **Mới fix** — sẵn sàng |
| Media Workflow pipeline | ✅ Sẵn sàng |
| Calendar hiện task deadline | ✅ Sẵn sàng |
| Calendar hiện campaign deadline | ❌ Chưa — cần P6.2 |
| Activity feed đầy đủ | ⚠️ Gần đủ — cần P6.2 |
| Dashboard activity widget | ⚠️ Chỉ hiện task activity — cần P6.2 |
| Project detail activity tab | ❌ Chưa có — cần P6.2 |

**Khuyến nghị:**
- P6.2: Focus vào Calendar + Activity + Dashboard fixes
- P6.3: Focus vào form field expansion
- P6.4: Có thể bắt đầu tính năng nghiệp vụ thực tế (intern KPI, media stats, reports)

---

**Audit by:** Claude Code (P6.1)
**Files changed:** 5
