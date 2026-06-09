# Báo cáo cải thiện UX giao việc Task (Task Assignment UX Improvement)

**Ngày:** 30/05/2026  
**Module:** Task Management  
**Files changed:** 8 files

---

## Tổng quan

Cải thiện UX trang Task để phục vụ workflow giao việc thực tế cho Admin/Manager giao việc cho nhân viên/interns. Các thay đổi bao gồm: fix modal/drawer conflict, redesign form thành 3 tabs, cải thiện hiển thị assignee, nâng cấp Kanban card, và phân quyền chỉnh sửa theo role.

---

## 1. Files đã thay đổi

| File | Thay đổi |
|------|-----------|
| `components/tasks/task-form.tsx` | Redesign 2-column → 3 tabs, role-based field locking, improved assignee selector |
| `components/tasks/tasks-client.tsx` | Close drawer on modal open, add `currentUser` prop, pass `staffRoleMap` |
| `components/tasks/task-quick-view.tsx` | Add `staffRoleMap`, show assignee role |
| `components/kanban/kanban-card.tsx` | Improved assignee tooltip, content status indicator, overdue highlight |
| `components/kanban/kanban-board.tsx` | Pass `staffRoleMap` through props |
| `lib/workspace/types.ts` | Add `submitted_at`, `submitted_by`, `completion_note` fields |
| `app/(admin)/tasks/page.tsx` | Pass `currentUser` to `TasksClient` |

---

## 2. UX Changes chi tiết

### 2.1 Modal / Drawer Conflict (Fix)

**Vấn đề:** Khi mở Task Edit Modal, Task Detail Drawer vẫn mở → stacked overlay.

**Fix:**
- Khi `onEditTask` được gọi từ KanbanBoard hoặc TaskQuickView → set `quickViewTask = null` TRƯỚC khi mở form modal
- `onOpenChange` của TaskForm khi close → reset `editingTask = null`
- Chỉ 1 overlay tại 1 thời điểm

```tsx
// tasks-client.tsx
onEditTask={(task) => {
  setQuickViewTask(null);  // ← Close drawer first
  setEditingTask(task);
  setShowForm(true);
}}

// TaskForm onOpenChange
onOpenChange={(open) => {
  if (!open) {
    setShowForm(false);
    setEditingTask(null);
  }
}}
```

### 2.2 Task Status Field (Fix)

**Vấn đề:** Status field có thể empty khi task đã có status.

**Fix:**
- Form state luôn init `status` từ `task?.status ?? defaultStatus`
- `buildOptions()` fallback với `FALLBACK_STATUSES` (7 statuses cứng)
- Status Select luôn có giá trị hiện tại — không còn empty state

### 2.3 Assignee Display (Improvement)

**Trước:** Chỉ hiển thị tên rút gọn (VD: "Nguyễn Văn A, Trần B") không có role.

**Sau:**
- Kanban card: Avatar với tooltip hiển thị **tên đầy đủ + role**
- TaskQuickView: Avatar + tên + role bên dưới
- TaskForm: Popover checkbox list với Avatar + tên + email + role

```tsx
// Tooltip on avatar
<Tooltip>
  <TooltipTrigger>
    <Avatar>...</Avatar>
  </TooltipTrigger>
  <TooltipContent>
    <div className="font-medium">{name}</div>
    <div className="text-muted-foreground text-[10px] capitalize">{role}</div>
  </TooltipContent>
</Tooltip>
```

### 2.4 TaskForm — 3 Tabs (Redesign)

**Trước:** 2-column layout, tất cả fields trộn lẫn.

**Sau:** 3 tabs rõ ràng:

**Tab 1: Thông tin giao việc**
- Tiêu đề, Mô tả, Dự án, Chiến dịch
- Người phụ trách (với avatar + role)
- Ngày bắt đầu, Hạn chót
- Loại công việc, Trạng thái
- Ghi chú

**Tab 2: Nội dung yêu cầu**
- Trạng thái nội dung
- Tiêu đề nội dung, Hook, Mục tiêu
- Nền tảng, Sản phẩm liên quan
- Nội dung / Kịch bản
- Call to Action, Link tham khảo
- Xem trước nội dung

**Tab 3: Kết quả nộp nhân viên**
- Link đã xuất bản
- File/Asset đã nộp
- Ghi chú hoàn thành
- Hiển thị thông tin đã nộp trước đó

### 2.5 Kanban Card Improvement

**Trước:** Avatar với tên rút gọn, không có content status indicator.

**Sau:**
- Task type badge (hiển thị màu theo loại: Bài Facebook → xanh, TikTok → tím...)
- Content status indicator: "Có kịch bản" / "Chưa có nội dung" / "Đã xuất bản"
- Avatar tooltip với name + role
- Due date với overdue highlight (đỏ) và due-soon highlight (cam)
- Progress bar và checklist progress

---

## 3. Role Behavior

### Admin / Super Admin
- ✅ Tạo mới task
- ✅ Sửa tất cả thông tin task
- ✅ Gán / đổi assignee
- ✅ Đổi project, campaign
- ✅ Sửa nội dung yêu cầu
- ✅ Duyệt / từ chối kết quả
- ✅ Xóa task (super_admin only)

### Employee (Editor, Viewer)
- ✅ Xem task và nội dung yêu cầu (Tab 2 disabled)
- ✅ Cập nhật kết quả nộp (Tab 3)
- ✅ Cập nhật trạng thái task
- ❌ Không thể đổi assignee
- ❌ Không thể đổi project, campaign
- ❌ Không thể xóa task

**Implementation:**
```tsx
const isAdmin =
  currentUser?.role === "super_admin" ||
  currentUser?.role === "admin";

// Fields disabled for non-admin when editing existing task
disabled={!isAdmin && !!task}
```

---

## 4. Type Changes

Thêm 3 field mới vào `Task` interface:

```typescript
// Employee submission result
submitted_at?: string;       // Thời gian nộp
submitted_by?: string;      // Người nộp
completion_note?: string;    // Ghi chú hoàn thành
```

---

## 5. Test Cases

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1 | Mở task từ Kanban card → click Sửa | Drawer đóng, modal mở | ✅ |
| 2 | Mở task từ Quick View → click Sửa | Drawer đóng, modal mở | ✅ |
| 3 | Click Edit từ menu trên card | Modal mở | ✅ |
| 4 | Submit form → loading → success | Toast hiện, modal đóng | ✅ |
| 5 | Avatar hover trên Kanban card | Tooltip hiện: tên + role | ✅ |
| 6 | Content status indicator | Hiển thị đúng theo task content_status | ✅ |
| 7 | Overdue task | Due date highlight đỏ | ✅ |
| 8 | Employee login → mở task edit | Tab 1/2 disabled, Tab 3 editable | ✅ |
| 9 | Employee → đổi assignee | Field disabled, không cho edit | ✅ |
| 10 | Switch tab trong form | Content giữ nguyên khi chuyển tab | ✅ |

---

## 6. Backward Compatibility

- Task status Select luôn load với FALLBACK_STATUSES (7 giá trị) — không break nếu master_data chưa có
- `staffRoleMap` optional, defaults `{}` — Kanban card vẫn hoạt động nếu không truyền
- `currentUser` optional, defaults `null` — form hoạt động trong fallback mode (all fields editable)
- `published_url` đã tồn tại trong Task type, không cần migration

---

## 7. Bước tiếp theo đề xuất

1. **Database migration:** Thêm `submitted_at`, `submitted_by`, `completion_note` columns vào bảng `pm_tasks`
2. **API update:** PUT `/api/tasks/[id]` cần hỗ trợ cập nhật `submitted_at`, `submitted_by` khi nhân viên nộp kết quả
3. **Notification:** Gửi notification cho admin khi nhân viên nộp kết quả
4. **Kanban filter:** Thêm filter theo assignee, content status
5. **Bulk assignment:** Cho phép giao việc hàng loạt
