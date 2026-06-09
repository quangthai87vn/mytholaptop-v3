# Workspace CRUD Fix V2: Delete UX + Archive Flow

**Ngày:** 29/05/2026
**Module:** Workspace (Project, Campaign, Task)
**Trạng thái:** Hoàn thành

---

## 1. Mục tiêu

- Thay thế tất cả `window.confirm()` bằng `ConfirmDialog` (Shadcn/ui).
- Thêm/fix chức năng Archive cho Project, Campaign, Task.
- Thêm menu 3-dot cho Task Kanban card (lưu trữ, sửa, xem chi tiết).
- Thêm nút Lưu trữ/Xóa vĩnh viễn vào Task detail page.
- Activity log tự động ghi nhận archive/delete vào `pm_status_history`.
- Hard delete chỉ dành cho Super Admin.

---

## 2. File đã tạo

| File | Mô tả |
|------|--------|
| `components/ui/confirm-dialog.tsx` | Component dialog xác nhận thay thế `window.confirm()`, hỗ trợ variant `destructive`, `default`, `warning`. Hook `useConfirm()` trả về Promise `<boolean>`. |

---

## 3. File đã sửa

### 3.1. Task Module

| File | Thay đổi |
|------|----------|
| `components/kanban/kanban-card.tsx` | Thêm dropdown menu 3-dot với: Xem chi tiết, Sửa, Lưu trữ. Props: `onEdit`, `onArchive`, `canArchive`. |
| `components/kanban/kanban-board.tsx` | Truyền `onEditTask`, `onArchiveTask`, `canArchive` xuống `KanbanCard`. |
| `components/tasks/tasks-client.tsx` | Thêm `handleArchiveTask` với `useConfirm`, gọi API DELETE với `action: "archive"`. |
| `components/tasks/task-detail-client.tsx` | Thêm nút **Lưu trữ** (editor+) và **Xóa vĩnh viễn** (super_admin only) trong header. Hai `ConfirmDialog` riêng. |
| `app/api/tasks/[id]/route.ts` | DELETE hỗ trợ `action=archive` (gọi `archiveTask`) hoặc hard delete (`?hard=true`). |
| `lib/workspace/db/index.ts` | Thêm hàm `archiveTask(id, actorName)` — UPDATE status = 'archived' + ghi vào `pm_status_history`. |

### 3.2. Campaign Module

| File | Thay đổi |
|------|----------|
| `components/campaigns/campaign-card.tsx` | Thay `window.confirm()` bằng 2 `ConfirmDialog` (archive/delete). Sửa encoding text tiếng Việt. |
| `app/api/campaigns/[id]/route.ts` | (Đã có sẵn: archive + hard delete, RBAC) |

### 3.3. Project Module

| File | Thay đổi |
|------|----------|
| `components/projects/project-card.tsx` | (Đã sửa trong session trước: ConfirmDialog) |

### 3.4. ConfirmDialog Component

| File | Thay đổi |
|------|----------|
| `components/ui/confirm-dialog.tsx` | Thêm variant `"warning"`. Hook `useConfirm()` trả Promise `<boolean>` với `resolveRef` để resolve `false` khi cancel. |

### 3.5. Sửa lỗi TypeScript (bonus)

| File | Thay đổi |
|------|----------|
| `app/(admin)/products/attributes/page.tsx` | `result.error` → `"Lỗi: Cập nhật thuộc tính thất bại"` (4 chỗ) |
| `app/(admin)/products/brands/page.tsx` | `result.error` → `"Lỗi: Cập nhật thương hiệu thất bại"` (3 chỗ) |
| `app/(admin)/products/categories/page.tsx` | `result.error` → `"Lỗi: Cập nhật danh mục thất bại"` (3 chỗ) |
| `app/(admin)/products/tags/page.tsx` | `result.error` → `"Lỗi: Cập nhật tag thất bại"` (3 chỗ) |
| `app/(admin)/products/page.tsx` | `result.error` → `"Lỗi: Xóa sản phẩm thất bại"` |
| `components/products/product-form-dialog.tsx` | `result.error` → `"Lỗi: Tạo sản phẩm thất bại"` (2 chỗ) |
| `components/products/product-edit-form.tsx` | `result.error` → `"Lỗi: Cập nhật sản phẩm thất bại"` |

---

## 4. Luồng hoạt động

### Archive (Project / Campaign / Task)
1. User nhấn nút Lưu trữ → `ConfirmDialog` hiện ra.
2. User xác nhận → gọi `DELETE /api/{entity}/{id}` với body `{ action: "archive" }`.
3. API gọi `archive{Entity}(id, actorName)`:
   - `UPDATE status = 'archived' WHERE id = $1`
   - `INSERT INTO pm_status_history (entity_type, entity_id, to_status, changed_by_name)`
4. UI cập nhật: xóa item khỏi danh sách, toast thành công.

### Hard Delete (Super Admin only)
1. User nhấn nút Xóa → `ConfirmDialog` destructive hiện ra.
2. User xác nhận → gọi `DELETE /api/{entity}/{id}?hard=true`.
3. API gọi `delete{Entity}(id, true, actorName)`:
   - `INSERT INTO pm_status_history` với `to_status = 'hard_deleted'`
   - `DELETE FROM {table} WHERE id = $1`
4. UI chuyển về trang danh sách, toast thành công.

---

## 5. RBAC

| Action | Super Admin | Admin | Editor | Intern |
|--------|-----------|-------|--------|--------|
| Archive Project | ✓ | ✓ | ✓ | — |
| Delete Project | ✓ (hard) | — | — | — |
| Archive Campaign | ✓ | ✓ | ✓ | — |
| Delete Campaign | ✓ (hard) | — | — | — |
| Archive Task | ✓ | ✓ | ✓ | — |
| Delete Task | ✓ (hard) | — | — | — |

---

## 6. Build

- **Trạng thái:** PASS
- Tất cả TypeScript errors đã được fix.
- Không còn `result.error` không tồn tại trong kiểu trả về.

---

## 7. Bước tiếp theo đề xuất

1. **Thêm filter "Đã lưu trữ"** vào danh sách Project / Campaign / Task (hiện tại archived items bị ẩn hoàn toàn).
2. **Khôi phục (unarchive)** — thêm nút/checkbox để khôi phục items đã lưu trữ.
3. **RBAC từ database** cho phép admin/archive có quyền archive (hiện tại chỉ check `super_admin/admin/editor` cứng).
4. **Kiểm thử** trên staging: archive → refresh → unarchive flow.
