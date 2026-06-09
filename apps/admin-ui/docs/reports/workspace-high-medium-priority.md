# Báo cáo: Workspace High & Medium Priority Sprint

**Ngày:** 29/05/2026
**Module:** Workspace — Kanban Production V1 (High/Medium Priority)
**Author:** AI Agent

---

## Tổng quan

Hoàn thành 6 task ưu tiên cao và trung bình:

| ID | Task | Ưu tiên | Trạng thái |
|----|------|---------|-------------|
| H4 | Task slide-over quick view panel | Cao | ✅ Hoàn thành |
| H5 | Validation cross-check start_date < end_date | Cao | ✅ Hoàn thành |
| H6 | Pagination cho projects/campaigns/tasks | Cao | ✅ Hoàn thành |
| M1 | Activity log integration in all CRUD | Trung bình | ✅ Hoàn thành |
| M2 | Campaign cards progress bar + stats | Trung bình | ✅ Hoàn thành |
| M3 | Global search sidebar dropdown UI | Trung bình | ✅ Hoàn thành |

---

## H4: Task Slide-over Quick View Panel

### Mô tả
Khi click vào card Kanban, hiển thị panel trượt bên phải với chi tiết task thay vì chuyển trang.

### Files tạo mới
- `components/tasks/task-quick-view.tsx` — Component slide-over chi tiết task

### Files sửa đổi
- `components/kanban/kanban-card.tsx` — Thêm prop `onView?: (task: Task) => void`, khi có prop thì gọi `onView(task)` thay vì `window.location.href`
- `components/kanban/kanban-board.tsx` — Truyền `onView` prop xuống `KanbanCard`
- `components/tasks/tasks-client.tsx` — Quản lý state `quickViewTask` + `TaskQuickView` component

### Tính năng Quick View
- Hiển thị tiêu đề, mô tả, loại, độ ưu tiên, trạng thái
- Countdown ngày đến hạn (quá hạn / sắp hết hạn / còn N ngày)
- Thanh progress (task progress + checklist progress)
- Danh sách assignees với avatar
- Liên kết project/campaign
- Tags, attachments count, comments count
- Nút hành động: Sửa, Lưu trữ, Xóa, Xem chi tiết

---

## H5: Validation Cross-check start_date < end_date

### Mô tả
Thêm Zod `superRefine` kiểm tra ngày bắt đầu phải trước ngày kết thúc.

### Files sửa đổi
- `lib/workspace/validation.ts`

### Logic
```typescript
.superRefine((data, ctx) => {
  if (data.start_date && data.end_date) {
    const s = new Date(data.start_date);
    const e = new Date(data.end_date);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
        path: ["start_date"],
      });
    }
  }
});
```

Áp dụng cho:
- `createCampaignSchema` và `updateCampaignSchema`
- `createProjectSchema` và `updateProjectSchema`

---

## H6: Pagination

### Files tạo mới
- `components/ui/pagination.tsx` — Component phân trang reusable

### Files sửa đổi
- `app/(admin)/projects/projects-client.tsx`
- `app/(admin)/campaigns/campaigns-client.tsx`
- `components/tasks/tasks-client.tsx`

### Tính năng
- Page navigation: Trang đầu, trước, số trang (với ellipsis), sau, trang cuối
- Page size selector: 10, 20, 30, 50
- Hiển thị "1–20 / 150"
- Tự reset về trang 1 khi thay đổi filter hoặc search
- Grid view (campaigns, tasks) và list view đều có pagination

---

## M1: Activity Log Integration

### Mô tả
Ghi log hoạt động CRUD vào `pm_audit_logs` cho tất cả Project, Campaign, Task.

### Files sửa đổi
- `lib/workspace/db/index.ts` — Thêm `writeWorkspaceAuditLog()` helper
- `app/api/projects/route.ts` — POST: log `created`
- `app/api/projects/[id]/route.ts` — PUT: log `updated`, DELETE: log `archived`/`deleted`
- `app/api/campaigns/route.ts` — POST: log `created`
- `app/api/campaigns/[id]/route.ts` — PUT: log `updated`/`status_changed`, DELETE: log `archived`/`deleted`
- `app/api/tasks/route.ts` — POST: log `created`
- `app/api/tasks/[id]/route.ts` — PUT: log `updated`, DELETE: log `archived`/`deleted`

### Log entry
```typescript
await writeWorkspaceAuditLog({
  actorId,       // UUID người thực hiện
  actorName,     // Tên người thực hiện
  action,        // "created" | "updated" | "deleted" | "archived" | "status_changed"
  entityType,    // "project" | "campaign" | "task"
  entityId,      // UUID entity
  entityName,    // Tên entity
  changes,       // [{ field, old, new }]
});
```

### RBAC Integration
`requirePermission` helper trả về `{ allowed, actorId, actorName }` — actorId dùng để ghi log chính xác.

---

## M2: Campaign Cards Enhancement

### Files sửa đổi
- `components/campaigns/campaign-card.tsx`

### Tính năng mới

#### 1. Quick Stats Bar (header)
- Tổng mục tiêu (target_metrics)
- Tổng thực tế (actual_metrics)
- Ngân sách (nếu có)

#### 2. Progress Bar
- Tính % từ totalActual / totalTarget
- Màu sắc động: ≥80% → xanh, >100% → cam
- Hiển thị text `%`

#### 3. Date Indicators
- Quá hạn (overdue): chữ đỏ + badge "(Quá hạn)"
- Sắp kết thúc (≤7 ngày): chữ cam + badge "(Sắp kết thúc)"
- Tính cho campaign `active` có `end_date`

---

## M3: Global Search Sidebar

### Files sửa đổi
- `components/layout/admin-sidebar.tsx`

### Tính năng

#### Normal mode (sidebar expanded)
- Input search trong nav area, debounce 300ms
- Gọi `/api/search?q=...` với keyword ≥ 2 ký tự
- Dropdown hiển thị tối đa 8 kết quả
- Icon động theo entity type (task, project, campaign, comment, user, activity)
- Click result → navigate + close dropdown
- Escape key → close dropdown

#### Collapsed mode
- Icon search button trong nav
- Tooltip "Tìm kiếm"

#### Loading state
- Spinner khi đang tìm kiếm
- Text "N đang tìm..." khi loading

---

## Validation Summary

| Schema | Date Range Check | ISO 8601 Flexible |
|--------|-----------------|-------------------|
| `createProjectSchema` | ✅ | ✅ |
| `updateProjectSchema` | ✅ | ✅ |
| `createCampaignSchema` | ✅ | ✅ |
| `updateCampaignSchema` | ✅ | ✅ |

---

## TypeScript
Tất cả files đã pass `pnpm tsc --noEmit` không lỗi.

---

## Bước tiếp theo đề xuất

1. **H1-H3**: Drag & drop Kanban (HTML5 native đã ready, cần enhance visual feedback)
2. **Checklist progress bar on Kanban card**: Hiển thị checklist % trên card
3. **Assignee avatar + due date countdown on Kanban card**: Avatar + countdown badge
4. **Task form validation**: Assignee required nếu status ≠ Backlog
5. **Workspace Activity page**: Trang chi tiết xem log hoạt động
6. **Reports/Analytics dashboard**: KPI widgets cho workspace
