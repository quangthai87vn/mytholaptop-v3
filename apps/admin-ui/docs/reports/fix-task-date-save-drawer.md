# Fix Task Date Save & Drawer State — End-to-End Report

**Ngày:** 2026-05-30  
**Người thực hiện:** Claude Agent  
**Phiên bản:** MTP v3 — Workspace Module  

---

## 1. Tóm tắt

Fix 3 bugs end-to-end trên Task edit/save flow:

| # | Bug | Root cause |
|---|-----|-----------|
| 1 | Chọn ngày 03/06, sau save hiển thị 02/06 | JS Date + `toISOString()` timezone roll-back |
| 2 | Sau khi "Lưu thay đổi", Task Detail Drawer vẫn mở | `handleUpdateTask` không reset `quickViewTask` |
| 3 | INSERT task content lỗi "more expressions than target columns" | `fields.map(f => f.split(" ")[0])` parse quoted column name sai |

---

## 2. Root Cause — Date Roll-back

### Vấn đề cốt lõi: JavaScript Date timezone shift

#### Layer 1: `DatePicker` → `handleSelect`
```tsx
// TRƯỚC (sai)
onChange?.(String(toISOStringOrNull(date)));
// date = Date object (midnight local, e.g. 2026-06-03 00:00 GMT+7)
// toISOString() → "2026-06-02T17:00:00.000Z" (UTC)
// String() → chuỗi UTC, gửi cho API
```

#### Layer 2: `task-form.tsx` → `handleSubmit`
```tsx
// TRƯỚC (sai)
const startISO = toISOStringOrNull(form.start_date);
// form.start_date = "2026-06-03" (YYYY-MM-DD string)
// new Date("2026-06-03") → "2026-06-02T17:00:00.000Z" (UTC parse)
// toISOString() → "2026-06-02T17:00:00.000Z"
// Database lưu 2026-06-02 → hiển thị 02/06
```

#### Layer 3: Display components → `new Date(dateStr)`
```tsx
// TRƯỚC (sai)
new Date("2026-06-03").toLocaleDateString("vi-VN")
// "2026-06-03" được parse as UTC midnight → 2026-06-02T17:00 UTC
// Hiển thị "02/06/2026" thay vì "03/06/2026"
```

### Giải pháp: YYYY-MM-DD everywhere

Thay vì dùng `toISOString()` (UTC) và `new Date("YYYY-MM-DD")` (UTC parse), tất cả date-only fields sử dụng **date-only string format** `YYYY-MM-DD` xuyên suốt:

| Layer | Input | Output |
|-------|-------|--------|
| `DatePicker` chọn ngày | `Date` object | `YYYY-MM-DD` |
| `task-form` gửi API | `YYYY-MM-DD` string | `YYYY-MM-DD` (passthrough) |
| Database (schema) | `DATE` column | `YYYY-MM-DD` |
| Display | `YYYY-MM-DD` | dd MMM yyyy (vi-VN) |

---

## 3. Files Changed

### `lib/workspace/date-utils.ts`
- Rewrite `toISOStringOrNull` → `toDateOnlyString`
  - `Date` object → extract local year/month/day → `YYYY-MM-DD`
  - `YYYY-MM-DD` string → validate format → return as-is
  - ISO full timestamp → parse as local date → `YYYY-MM-DD`
- Update `toInputDateString` — thêm YYYY-MM-DD fast path
- Keep `toISOStringOrNull` as deprecated alias (campaign/project forms tự động hưởng lợi)

### `components/ui/date-picker.tsx`
- `handleSelect`: dùng `toDateOnlyString(date)` thay vì `String(toISOStringOrNull(date))`
- `selectedDate`: parse YYYY-MM-DD bằng `new Date(y, m-1, d, 12,0,0)` để tránh UTC roll-back
- `displayText`: parse local date trước khi format, fallback `toInputDateString`

### `components/tasks/task-form.tsx`
- Import `toDateOnlyString` thay vì `toISOStringOrNull`
- `handleSubmit`: `toDateOnlyString(form.start_date)` → `YYYY-MM-DD` string
- Pass `YYYY-MM-DD` trực tiếp cho API (DB DATE column nhận đúng)

### `components/tasks/tasks-client.tsx`
- `handleUpdateTask`: thêm `setQuickViewTask(null)` sau `setEditingTask(null)` để đóng QuickView drawer

### `app/api/tasks/[id]/route.ts`
- Thêm `console.debug` cho date fields (dev-only, không log secrets)

### `lib/workspace/db/index.ts`
- `upsertTaskContent`: fix duplicate `values` declaration
- Separate `columnNames[]` và `fieldAssignments[]` thay vì dùng `fields.map(f => f.split(" ")[0])`

### `components/tasks/task-quick-view.tsx`
- `formatDate`: handle `YYYY-MM-DD` safe parse
- `getDaysLeft`: handle `YYYY-MM-DD` safe parse

### `components/kanban/kanban-card.tsx`
- `displayShortDate`: handle `YYYY-MM-DD` safe parse
- `isOverdue`/`isDueSoon`: use safe date comparison với `dueDateMs`

### `components/media-workflow/workflow-card.tsx`
- `displayShortDate`: handle `YYYY-MM-DD` safe parse
- `isOverdue`: safe date comparison

---

## 4. API Payload — Before / After

### Trước (sai)
```json
{
  "title": "Viết bài Facebook",
  "start_date": "2026-06-02T17:00:00.000Z",
  "due_date": "2026-06-02T17:00:00.000Z"
}
```
→ Database lưu `2026-06-02` (sai 1 ngày)

### Sau (đúng)
```json
{
  "title": "Viết bài Facebook",
  "start_date": "2026-06-03",
  "due_date": "2026-06-03"
}
```
→ Database lưu `2026-06-03` (đúng)

---

## 5. Database Field Type

```sql
-- pm_tasks schema (002_tasks.sql)
CREATE TABLE pm_tasks (
    ...
    start_date DATE,
    due_date DATE,
    ...
);
```
- `start_date` và `due_date` là `DATE` column (không phải `TIMESTAMP`)
- PostgreSQL DATE nhận `YYYY-MM-DD` string → lưu đúng ngày
- Không có timezone component → không bị shift khi so sánh

---

## 6. Drawer / Modal State Fix

### Trước (bug)
```
User click "Sửa" → Mở TaskForm + QuickView vẫn mở phía sau
User save → TaskForm đóng, QuickView vẫn mở → 2 overlay cùng lúc
```

### Sau (đúng)
```tsx
// tasks-client.tsx — handleUpdateTask
const result = await res.json();
setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? result.data : t)));
setEditingTask(null);
setQuickViewTask(null);  // ← Fix: đóng cả QuickView drawer
```

---

## 7. Manual Test Checklist

### Test 1: Date Save
- [ ] Tạo task mới → chọn "Ngày bắt đầu" = **03/06/2026** → "Hạn chót" = **03/06/2026** → Save
- [ ] Reload trang → kiểm tra hiển thị vẫn là **03/06/2026** (không phải 02/06)
- [ ] Check terminal: `console.debug` log `{ start_date: "2026-06-03", due_date: "2026-06-03" }`
- [ ] Check PostgreSQL: `SELECT start_date, due_date FROM pm_tasks WHERE title = '...'` → `2026-06-03`

### Test 2: Drawer State
- [ ] Mở task bằng QuickView (click card)
- [ ] Click "Sửa" trong QuickView → TaskForm mở, QuickView đóng
- [ ] Thay đổi tiêu đề → "Lưu thay đổi"
- [ ] Kiểm tra: TaskForm đóng, QuickView đóng, chỉ Kanban board visible

### Test 3: Date Display Across Views
- [ ] Kanban card: ngày hiển thị đúng (không roll-back)
- [ ] QuickView drawer: ngày hiển thị đúng, "số ngày còn lại" đúng
- [ ] Task Detail page: ngày hiển thị đúng
- [ ] Workflow card: ngày hiển thị đúng

### Test 4: Overdue Detection
- [ ] Tạo task với due_date = hôm qua → Kanban card hiển thị màu đỏ (overdue)
- [ ] Tạo task với due_date = 3 ngày tới → Kanban card hiển thị màu cam (due soon)
- [ ] QuickView: "X ngày quá hạn" / "Hôm nay" / "Ngày mai" / "X ngày nữa" đúng

### Test 5: Empty Date
- [ ] Tạo task không chọn ngày → save thành công
- [ ] Sửa task không ngày, thêm ngày → save thành công
- [ ] Sửa task có ngày, xóa ngày → save thành công

### Test 6: Project & Campaign (bonus)
- [ ] Tạo project với start/end date → save đúng ngày
- [ ] Tạo campaign với start/end date → save đúng ngày

---

## 8. Regression Risks

| Area | Risk | Mitigation |
|------|------|-----------|
| Campaign/Project forms | `toISOStringOrNull` → `toDateOnlyString` alias | Backward compat kept; campaign-form & project-form benefit automatically |
| `submitted_at` / `created_at` / `updated_at` | Vẫn là TIMESTAMP, dùng `new Date(ts).toLocaleString()` | Đây là timestamp thực (có giờ), không phải date-only — không cần fix |
| `kanban-card` overdue calculation | Dùng `dueDateMs` thay vì `new Date()` | So sánh timestamp chính xác |
| `upsertTaskContent` | Fix duplicate `values` | Test INSERT task content |
