# Workspace Phase 3 Final QA Report

**Ngày:** 2026-05-30
**Author:** Claude Agent
**Trạng thái:** ✅ QA Hoàn thành — Sẵn sàng Phase 4

---

## 1. Tổng quan

Phase 3 foundation đã được verify và củng cố. Tất cả core content workflow đã được kiểm tra và đảm bảo hoạt động đúng.

### Các thay đổi trong QA round này

| # | File | Thay đổi |
|---|------|-----------|
| 1 | `components/tasks/task-detail-client.tsx` | Fix `handleSaveStatus` — parse API error body, hiển thị checklist gate message |
| 2 | `components/tasks/task-content-section.tsx` | Rewrite hoàn toàn để dùng Phase 3 API `/api/tasks/[id]/content` (pm_task_contents) |
| 3 | `sql/workspace/027b_sync_pm_task_contents.sql` | Migration mới: backfill pm_task_contents từ pm_tasks |

---

## 2. Backfill Migration — Kết quả

**File:** `sql/workspace/027b_sync_pm_task_contents.sql`

### Chiến lược

```
1. INSERT ... ON CONFLICT(task_id) DO NOTHING
   → Tạo rows mới cho tasks có content nhưng chưa có pm_task_contents

2. UPDATE pm_task_contents FROM pm_tasks
   → Sync existing rows với giá trị mới nhất từ pm_tasks

3. Mapping:
   pm_tasks.content_title  → pm_task_contents.content_title
   pm_tasks.content_body  → pm_task_contents.content_body
   pm_tasks.content_status → pm_task_contents.content_status
   pm_tasks.description    → pm_task_contents.notes
```

### Kết quả deploy

```
BEFORE: pm_tasks total=3
BEFORE: pm_tasks with content fields=3
BEFORE: pm_task_contents rows=3
BEFORE: Orphan tasks (need backfill)=0

INSERT 0 0          ← Không insert mới (đã có đủ)
UPDATE 3            ← Sync 3 existing rows

AFTER: pm_tasks total=3
AFTER: pm_tasks with content fields=3
AFTER: pm_task_contents rows=3
AFTER: Orphan tasks (should be 0)=0
OK: All tasks with content have pm_task_contents rows
```

### Nhận xét

- Trước khi chạy migration: 3 pm_task_contents rows (từ seed data Phase 3 trước)
- Sau khi chạy: 3 pm_task_contents rows — đảm bảo 1:1 relationship
- Migration idempotent — có thể chạy lại an toàn
- Migration đã INSERT audit log vào `pm_audit_logs`

---

## 3. Database State hiện tại

### pm_tasks (3 rows)

| ID | Title | Status | Content Status | Content Title |
|----|-------|--------|----------------|---------------|
| 333...301 | Tạo video TikTok giới thiệu Laptop Gaming | working | writing | Summer Sale 2026 - Laptop Gaming Giá Sốc! |
| 333...302 | Viết bài Facebook về Summer Sale | review | internal_review | MỪNG HÈ 2026 - GIẢM ĐẾN 5 TRIỆU... |
| 333...303 | Viết bài SEO về Laptop Gaming 2026 | idea | draft | Top 10 Laptop Gaming 2026 Giá Dưới 25 Triệu |

### pm_task_contents (3 rows — synced)

| task_id | content_title | content_body | content_status |
|---------|--------------|--------------|----------------|
| 333...301 | Summer Sale 2026... | Script TikTok 281 ký tự | writing |
| 333...302 | MỪNG HÈ 2026... | Facebook post 110 ký tự | internal_review |
| 333...303 | Top 10 Laptop... | SEO article 114 ký tự | draft |

### pm_task_checklist_items

| task_id | Total | Done | Pending |
|---------|-------|------|---------|
| 333...301 | 4 | 1 | 3 |
| 333...302 | 3 | 3 | 0 |

**Chú ý:** Task 333...301 (TikTok) không thể chuyển sang `completed` vì checklist chỉ xong 1/4. Task 333...302 (Facebook) có thể chuyển sang `completed` vì checklist đã hoàn tất.

---

## 4. QA Checklist — Manual Test Results

### 4.1 Checklist Gate — BLOCK COMPLETED

**Fix:** `handleSaveStatus` trong `task-detail-client.tsx` giờ parse `res.json()` và hiển thị error message từ API.

**Logic flow:**
```
User chọn status = "completed"
    ↓
PUT /api/tasks/[id] { status: "completed" }
    ↓
DB layer: SELECT checklist COUNT WHERE task_id
    ↓
total=4, done=1 → throw Error("Hoàn thành checklist trước (1/4)")
    ↓
API: return 400 { error: "Hoàn thành checklist trước (1/4)" }
    ↓
handleSaveStatus: const data = await res.json()
                  → toast.error("Hoàn thành checklist trước (1/4)")
```
**Status:** ✅ Fix hoàn thành

### 4.2 Content CRUD — pm_task_contents

**Rewritten:** `TaskContentSection` giờ dùng `/api/tasks/[id]/content` (Phase 3 API).

| Action | API | Status |
|--------|-----|--------|
| Load content | GET `/api/tasks/[id]/content` | ✅ |
| Save new content | PUT `/api/tasks/[id]/content` | ✅ Auto-upsert |
| Create content | POST `/api/tasks/[id]/content` | ✅ |
| Content loads on tab open | useEffect loadContent | ✅ |
| Edit via dialog | Dialog + PUT | ✅ |

**Data flow verification:**
```
Task TikTok (333...301):
  pm_tasks.content_title  = "Summer Sale 2026 - Laptop Gaming Giá Sốc!"
  pm_task_contents.content_title = "Summer Sale 2026 - Laptop Gaming Giá Sốc!" ✅ synced
```

### 4.3 RBAC — Intern/Leader/Admin

**Verified:** `types-approval.ts` getApprovalPermissions()

| Role | canSubmitReview | canApprove | canReject | canPublish |
|------|----------------|-----------|---------|-----------|
| intern | ✅ | ❌ | ❌ | ❌ |
| leader | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ |
| super_admin | ✅ | ✅ | ✅ | ✅ |

**Intern UI behavior:**
- ✅ Thấy "Chi tiết nội dung" tab (read)
- ✅ Có thể chỉnh sửa nội dung task được giao
- ✅ Không thấy nút "Duyệt" / "Xuất bản" trong Approval tab
- ✅ Checklist gate vẫn áp dụng

### 4.4 Content Workflow Status

**Phase 3 workflow stages:**

| Stage | Label | Transitions |
|-------|-------|-------------|
| idea | Ý tưởng | → assigned |
| assigned | Đã giao | → working |
| working | Đang thực hiện | → review |
| review | Chờ duyệt | → rework, completed |
| rework | Cần sửa lại | → working |
| completed | Hoàn thành | — |
| cancelled | Hủy | — |

**Content status** (trong pm_task_contents):

| Status | Label | RBAC |
|--------|-------|------|
| draft | Bản nháp | intern |
| writing | Đang viết | intern |
| internal_review | Chờ duyệt nội bộ | leader+ |
| revision | Cần chỉnh sửa | leader+ |
| approved | Đã duyệt | leader+ |
| published | Đã đăng | leader+ |

---

## 5. Files Changed

### Fix Applied

**`components/tasks/task-detail-client.tsx`**
```typescript
// Before: if (!res.ok) throw new Error();
// After:
const data = await res.json();
if (!res.ok) {
  const msg = data?.error || "Không thể cập nhật trạng thái";
  toast.error(msg);
  setNewStatus(task.status);
  return;
}
```

**`components/tasks/task-content-section.tsx`**
- Rewrite hoàn toàn từ `pm_content_items` → `pm_task_contents`
- Sử dụng `/api/tasks/[id]/content` API
- CRUD operations: read, edit dialog, save
- Status badge với màu sắc theo content_status
- Empty state khi chưa có content

**`sql/workspace/027b_sync_pm_task_contents.sql`** — Mới tạo
- Backfill logic với `INSERT ... ON CONFLICT DO NOTHING`
- Sync existing rows với `UPDATE ... FROM`
- RAISE NOTICE cho before/after counts
- Audit log entry

---

## 6. Remaining Blockers

### None — Phase 3 Core Foundation Complete

| Blocker | Resolution |
|---------|-----------|
| pm_task_contents sync không tự động | ✅ Migration 027b + `updateTask` sync |
| Checklist gate không hiển thị toast | ✅ Fix `handleSaveStatus` error parsing |
| Task content section dùng sai bảng | ✅ Rewrite sang `pm_task_contents` API |
| Old tasks không có pm_task_contents | ✅ Backfill migration deployed |

### Pre-Phase 4 Items (Not Blockers)

| Item | Ghi chú |
|------|---------|
| Rich text editor (textarea → Tiptap) | Optional enhancement |
| pm_content_items → pm_task_contents migration | Tương lai: migrate old content data |
| Kanban drag-drop persistence | Kanban board đã hoạt động |

---

## 7. Phase 4 Deliverables/File Upload — Readiness

### ✅ Sẵn sàng bắt đầu Phase 4

**Điều kiện đã đạt:**
1. ✅ pm_task_contents CRUD hoạt động đúng
2. ✅ pm_task_assets table đã tồn tại (từ Phase 3)
3. ✅ Checklist blocking hoạt động đúng
4. ✅ RBAC approve/publish đã đúng
5. ✅ Backfill migration đã deploy
6. ✅ Task detail content load từ pm_task_contents

**Phase 4 suggested scope:**
1. Xây dựng Task Assets UI (upload/delete/view)
2. Kết nối `pm_task_assets` với Task detail page
3. Hỗ trợ: Images, Videos, Documents, Canva links, CapCut links, Published URLs
4. File upload integration (S3/Cloudinary hoặc local storage)
5. Asset preview/download

---

## 8. TypeScript & Build

```
✅ TypeScript check: PASS (pnpm exec tsc --noEmit)
✅ No new errors introduced
```

---

## 9. Conclusion

**Workspace Phase 3 Final QA — Kết luận:**

1. ✅ **Checklist gate toast** — Fix hoàn thành, error message hiển thị đúng
2. ✅ **pm_task_contents sync** — Backfill deployed, 3/3 tasks synced
3. ✅ **Content section rewrite** — Dùng đúng Phase 3 API
4. ✅ **RBAC intern/leader/admin** — Đúng theo spec
5. ✅ **Database state** — 3 tasks + 3 content rows + checklist data

**Phase 4 có thể bắt đầu ngay.**

---

## 10. References

- Phase 3 initial QA: `docs/reports/workspace-phase-3-qa-content-api.md`
- Phase 1-2 QA: `docs/reports/workspace-phase-1-2-qa-result.md`
- Migration: `sql/workspace/027b_sync_pm_task_contents.sql`
