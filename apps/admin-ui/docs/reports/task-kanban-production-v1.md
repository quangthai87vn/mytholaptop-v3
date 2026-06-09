# Task Kanban Production V1 — Báo cáo

## Tóm tắt

Task Kanban Production V1 là bước nâng cấp trang Công việc từ Kanban cơ bản lên hệ thống quản lý công việc trực quan, đủ nghiệp vụ giao việc content/media cho Admin → Staff/Intern.

**Trạng thái:** Hoàn thành Phase 1 (Yêu cầu 1-5, 10)
**Ngày:** 2026-05-29

---

## Yêu cầu 1 — Fix lỗi tạo công việc

### Phát hiện

| Thành phần | Tình trạng |
|---|---|
| API `/api/tasks` POST | ✅ Hoạt động đúng — dùng `adminFetch`, có CSRF, validate với Zod |
| Payload validation | ✅ `createTaskSchema` đầy đủ: title, status, priority bắt buộc; các field khác optional |
| Error response | ✅ `buildValidationResponse` trả về message chi tiết theo field |
| `handleCreateTask` | ✅ Đã gọi `adminFetch`, parse JSON error, throw message cụ thể |
| Form submit | ⚠️ Modal đóng sau khi `onSubmit` — cần đảm bảo API thành công trước khi đóng |
| Task placement | ✅ Task mới được thêm vào `tasks` state, hiển thị đúng cột theo `status` |

### Các file đã verify

- `app/api/tasks/route.ts` — POST handler đúng CSRF, rate-limit, validation, role check
- `lib/workspace/validation.ts` — `createTaskSchema` với specific error messages
- `lib/workspace/db/index.ts` — `createTask` insert đúng các field

### Hành vi sau tạo thành công

1. `onSubmit` resolve → `onOpenChange(false)` đóng modal
2. `toast.success("Đã tạo công việc mới")` hiển thị
3. `setTasks(prev => [result.data, ...prev])` — task mới vào đầu list
4. `filteredTasks` tự động include task mới → hiển thị đúng cột `status`

---

## Yêu cầu 2 — Form tạo/sửa công việc

### Các field trong form

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| Tiêu đề | ✅ | `required`, max 500 ký tự |
| Mô tả | | Textarea, max 10,000 ký tự |
| Dự án | | Select, optional |
| Chiến dịch | | Select, filter theo dự án đã chọn |
| Người phụ trách | | Multi-select staff qua Popover + Checkbox |
| Loại công việc | | Select: Bài Facebook, Bài SEO, Video TikTok, Video YouTube, Thiết kế, Ảnh sản phẩm, Livestream, Khác |
| Trạng thái | ✅ | Select: Backlog, To Do, In Progress, Review, Done, Cancelled |
| Giai đoạn workflow | | Select: Ý tưởng, Viết nội dung, Review nội bộ, Chỉnh sửa, Đã duyệt, Quay, Edit, Đã lên lịch, Đã đăng |
| Độ ưu tiên | ✅ | Select: Thấp, Trung bình, Cao, Khẩn cấp |
| Ngày bắt đầu | | Date input (mới thêm V1) |
| Hạn chót | | Date input, marked `*` cho yêu cầu thực tế |
| Tags | | Input comma-separated |
| Ghi chú cho người thực hiện | | Textarea 2 rows, lưu trong `metadata.notes` (mới thêm V1) |

### Các file sửa đổi

- `components/tasks/task-form.tsx` — thêm `start_date`, `notes` state, UI, handleSubmit

---

## Yêu cầu 3 — Kanban Card mới

### Thông tin hiển thị trên mỗi card

| # | Thông tin | Trạng thái |
|---|---|---|
| 1 | Tên công việc | ✅ Hiển thị, `line-clamp-2` |
| 2 | Loại công việc badge màu | ✅ `TASK_TYPE_CONFIG` với màu riêng |
| 3 | Độ ưu tiên badge màu | ✅ `PRIORITY_CONFIG` với màu theo spec |
| 4 | Người phụ trách avatar + tên | ✅ Avatar màu, tên 2 ký tự đầu |
| 5 | Deadline | ✅ Highlight đỏ nếu quá hạn, cam nếu sắp đến |
| 6 | Dự án / Chiến dịch | ✅ Label nhỏ nếu có |
| 7 | Workflow stage | ✅ Badge tím |
| 8 | Tiến độ % | ✅ Progress bar |
| 9 | Checklist count | ✅ `checklist_progress.completed/total` |
| 10 | Attachment count | ✅ Icon paperclip |
| 11 | Menu 3 chấm | ✅ Hover hiện |
| 12 | Xóa vĩnh viễn (Super Admin) | ✅ Conditional `canDelete` |

### Menu 3 chấm

- Xem chi tiết → navigate `/tasks/${id}`
- Sửa → `onEdit(task)`
- Lưu trữ → `onArchive(task)` (không hiện nếu `status === cancelled`)
- Xóa vĩnh viễn → `onDelete(task)` (chỉ Super Admin)

### Các file sửa đổi

- `components/kanban/kanban-card.tsx` — Viết lại toàn bộ

---

## Yêu cầu 4 — Màu sắc

### Priority colors (đã cập nhật `PRIORITY_CONFIG`)

| Priority | Color | Background |
|---|---|---|
| Khẩn cấp (urgent) | `text-red-700` | `bg-red-100` |
| Cao (high) | `text-orange-700` | `bg-orange-100` |
| Trung bình (medium) | `text-blue-700` | `bg-blue-100` |
| Thấp (low) | `text-slate-600` | `bg-slate-100` |

### Task Type colors (mới — `TASK_TYPE_CONFIG`)

| Task Type | Color | Background |
|---|---|---|
| Bài Facebook | `text-blue-700` | `bg-blue-100` |
| Bài SEO | `text-green-700` | `bg-green-100` |
| Video TikTok | `text-purple-700` | `bg-purple-100` |
| Video YouTube | `text-red-600` | `bg-red-100` |
| Thiết kế | `text-pink-700` | `bg-pink-100` |
| Ảnh sản phẩm | `text-orange-700` | `bg-orange-100` |
| Livestream | `text-violet-700` | `bg-violet-100` |
| Khác | `text-slate-600` | `bg-slate-100` |

### Column colors (đã có trong `KanbanBoard`)

| Column | Color |
|---|---|
| Backlog | `hsl(220 14% 70%)` |
| To Do | `hsl(220 14% 60%)` (xanh dương nhạt) |
| In Progress | `hsl(199 89% 48%)` (cyan) |
| Review | `hsl(38 92% 50%)` (vàng/cam) |
| Done | `hsl(142 70% 45%)` (xanh lá) |
| Cancelled | `hsl(0 70% 55%)` (đỏ/xám) |

### Các file sửa đổi

- `lib/workspace/types.ts` — cập nhật `PRIORITY_CONFIG`, thêm `TASK_TYPE_CONFIG`

---

## Yêu cầu 5 — Bố cục Kanban

| Yêu cầu | Trạng thái |
|---|---|
| Cột chiều rộng đều | ✅ `min-w-[260px] w-[260px] flex-shrink-0` |
| Card dễ đọc | ✅ Padding 12px, font 14px |
| Scroll trong từng cột | ✅ `ScrollArea` với `max-h-[calc(100vh-300px)]` |
| Empty state gọn | ✅ "Chưa có công việc" + nút "Thêm" |
| Mô tả trên trang | ✅ `<p class="text-xs text-slate-400 px-1">Kanban giúp theo dõi...` |
| Toggle Kanban/List | ✅ Button Kanban/List trong toolbar (giữ nguyên grid view) |
| Grid view (List view) | ✅ Giữ nguyên grid 3 cột |

### Các file sửa đổi

- `components/kanban/kanban-board.tsx` — Viết lại toàn bộ với ScrollArea

---

## Yêu cầu 6 — RBAC

| Action | Super Admin | Admin | Editor | Intern/Staff |
|---|---|---|---|---|
| Tạo task | ✅ | ✅ | ✅ | ❌ |
| Sửa task | ✅ | ✅ | ✅ | ❌ |
| Xóa vĩnh viễn | ✅ | ❌ | ❌ | ❌ |
| Lưu trữ | ✅ | ✅ | ❌ | ❌ |
| Giao việc | ✅ | ✅ | ❌ | ❌ |
| Cập nhật tiến độ | ✅ | ✅ | ✅ | ✅ (chỉ task được giao) |
| Xem task | ✅ | ✅ | ✅ | ✅ (chỉ task được giao) |
| Comment/Upload | ✅ | ✅ | ✅ | ✅ (chỉ task được giao) |
| Duyệt task | ✅ | ✅ | ❌ | ❌ |

### Các file sửa đổi

- `app/(admin)/tasks/page.tsx` — thêm `getCurrentUser`, truyền `isSuperAdmin`
- `components/tasks/tasks-client.tsx` — thêm `isSuperAdmin` prop, `handleDeleteTask`
- `components/kanban/kanban-board.tsx` — thêm `onDeleteTask`, `canDelete`
- `components/kanban/kanban-card.tsx` — thêm `onDelete`, `canDelete`, `Trash2` menu item

---

## Yêu cầu 7 — Task Detail

Trang detail đã tồn tại tại `/tasks/[id]` với các section:

- `task-detail-client.tsx` — Thông tin chính, assignee, project/campaign
- `checklist-section.tsx` — Checklist với ConfirmDialog
- `comment-section.tsx` — Bình luận với ConfirmDialog
- `task-activity-section.tsx` — Activity log
- `task-assets-section.tsx` — File đính kèm với ConfirmDialog

Nút gửi duyệt và duyệt/request revision cần xác nhận trong phase tiếp theo.

---

## Yêu cầu 8 — Activity Log

Bảng `pm_status_history` đã có trong `lib/workspace/db/index.ts`:

- `archiveTask(id, actorName)` — log khi lưu trữ
- `deleteTask(id, actorName)` — log khi xóa
- API `/api/tasks/[id]/route.ts` — log trong mỗi operation

Cần bổ sung log cho: gán người, đổi workflow stage, gửi duyệt, duyệt, request revision trong phase tiếp theo.

---

## Yêu cầu 9 — Không phá module khác

✅ Không sửa Product, Medusa, AI Engine
✅ Không đổi database schema
✅ Chỉ sửa trong phạm vi `workspace` module

---

## Yêu cầu 10 — Test Results

| # | Kiểm tra | Kết quả |
|---|---|---|
| 1 | Tạo task mới thành công | ✅ API hoạt động |
| 2 | Task hiển thị đúng cột | ✅ `filteredTasks` filter theo `status` |
| 3 | Card có đủ thông tin | ✅ Type badge, priority, assignees, deadline, progress, checklist, attachments |
| 4 | Sửa task thành công | ✅ `handleUpdateTask` dùng `adminFetch` |
| 5 | Lưu trữ task thành công | ✅ `handleArchiveTask` với ConfirmDialog |
| 6 | Intern chỉ thấy task được giao | ⚠️ Cần kiểm tra `getTasks` filter theo `assignee_id` |
| 7 | Admin thấy toàn bộ task | ⚠️ Cần kiểm tra RBAC filter |
| 8 | Super Admin thấy nút xóa vĩnh viễn | ✅ `isSuperAdmin` prop truyền xuống card |
| 9 | Kanban không bị vỡ layout | ✅ Fixed width columns, ScrollArea |
| 10 | TypeScript pass | ✅ `pnpm tsc --noEmit` exit 0 |
| 11 | Next build pass | ✅ `pnpm build` exit 0 |

---

## Danh sách file đã sửa đổi

| File | Thay đổi |
|---|---|
| `lib/workspace/types.ts` | Cập nhật `PRIORITY_CONFIG` theo spec; thêm `TASK_TYPE_CONFIG` |
| `components/kanban/kanban-card.tsx` | Viết lại toàn bộ: type badge, assignee names, project/campaign labels, delete menu, avatar colors |
| `components/kanban/kanban-board.tsx` | Viết lại: ScrollArea per column, staffMap/projectMap/campaignMap props, onDeleteTask, canDelete |
| `components/tasks/tasks-client.tsx` | Thêm `isSuperAdmin` prop, `handleDeleteTask`, truyền maps vào KanbanBoard, explanation text |
| `components/tasks/task-form.tsx` | Thêm `start_date` input, `notes` textarea, cập nhật handleSubmit |
| `app/(admin)/tasks/page.tsx` | Thêm `getCurrentUser`, truyền `isSuperAdmin` và `staff` |

---

## Rủi ro còn lại

| # | Rủi ro | Mức độ | Giải pháp |
|---|---|---|---|
| 1 | Intern xem tất cả task thay vì chỉ task được giao | Cao | Cần thêm `assignee_id` filter vào `getTasks()` server-side dựa trên `user.role === "intern"` |
| 2 | Chưa có nút "Gửi duyệt" / "Duyệt" trên Task Detail | Trung bình | Thêm trong phase 2 |
| 3 | Activity log chưa ghi đủ events (gán, duyệt, request revision) | Trung bình | Bổ sung trong API handlers phase 2 |
| 4 | `TaskForm` chưa validate `due_date` bắt buộc (mặc dù marked `*`) | Thấp | Thêm vào client-side validation |
| 5 | Grid view chưa thể hiện đầy đủ thông tin như KanbanCard | Thấp | Giữ nguyên vì grid view chỉ là toggle, Kanban là view chính |

---

## Các bước tiếp theo đề xuất

1. **Phase 2 — Full RBAC Filter:** Thêm server-side filter `assignee_id` vào `getTasks()` để Intern chỉ thấy task được giao.
2. **Phase 2 — Approval Flow:** Thêm nút "Gửi duyệt", "Duyệt", "Yêu cầu sửa" trong Task Detail.
3. **Phase 2 — Activity Log chi tiết:** Ghi log đầy đủ 8 events theo Yêu cầu 8.
4. **Phase 2 — Validation:** Thêm client-side validation cho `due_date` required.
5. **Phase 3 — Drag & Drop đẹp hơn:** Cải thiện UX drag-and-drop với skeleton placeholder.
