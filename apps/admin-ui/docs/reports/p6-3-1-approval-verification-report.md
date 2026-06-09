# P6.3.1 Approval Workflow Verification & Patch Report

**Ngày:** 27/05/2026
**Phase:** P6.3 → P6.3.1
**Trạng thái:** Hoàn thành

---

## 1. Tổng quan

P6.3.1 verify và patch các lỗi nhỏ còn lại trong Approval Workflow sau khi migration 014 đã chạy.

### Kết quả kiểm tra ban đầu

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Migration 014 chạy rồi | ✅ | Table `pm_task_approvals` đã tồn tại |
| `stage='review'` → `'internal_review'` data migration | ❌ | **Thiếu** — chưa có lệnh UPDATE |
| Editor submit_review | ✅ | API đúng, role check đúng |
| Admin approve/reject | ✅ | API đúng, role check đúng |
| Viewer 403 khi gọi action | ✅ | API trả 403 đúng |
| Reject/request_revision comment bắt buộc | ✅ | API validate đúng |
| Activity log ghi approval action | ✅ | `performApprovalAction` ghi `pm_task_activities` |
| Activity log hiển thị đúng trên UI | ❌ | **Lỗi nhỏ** — `field_changed` không khớp |

---

## 2. Các file đã tạo/sửa

### 2.1 Tạo mới: SQL Patch Migration

**File:** `sql/workspace/015_review_to_internal_review.sql`

```sql
UPDATE pm_tasks SET stage = 'internal_review' WHERE stage = 'review';
```

**Lý do:** Migration 014 không chứa lệnh migrate dữ liệu cũ. Nếu có task nào tạo trước đó với `stage='review'`, chúng sẽ không thể gửi duyệt được vì validation `performApprovalAction` yêu cầu `fromStage === 'writing'`.

**Cách chạy:**
```bash
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f sql/workspace/015_review_to_internal_review.sql
```

---

### 2.2 Sửa: Database — `lib/workspace/db/index.ts` (dòng ~1171)

**Thay đổi:** `field_changed` từ `"workflow_stage"` → `"stage"`

```diff
  await query(
    `INSERT INTO pm_task_activities ...`,
    [
      ...,
      "workflow_stage",  // trước
      `${fromStage} → ${newStage}`,
    ]
  );
```
↓
```diff
  await query(
    `INSERT INTO pm_task_activities ...`,
    [
      ...,
      "stage",           // sau — khớp với activity page check
      `${fromStage} → ${newStage}`,
    ]
  );
```

**Lý do:** Activity page `workspace/activity/page.tsx` kiểm tra `field_changed === "stage"` (dòng 79) để hiển thị transition. `performApprovalAction` ghi `field_changed="workflow_stage"` nên stage transition không hiển thị "→ Đã duyệt" trên UI.

---

### 2.3 Sửa: Activity Page — `app/(admin)/workspace/activity/page.tsx`

**Thay đổi 1:** Thêm labels cho approval action vào `actionLabels`:

```diff
  const actionLabels: Record<string, string> = {
    ...
+   "gửi duyệt": "đã gửi duyệt",
+   "duyệt": "đã duyệt",
+   "từ chối": "đã từ chối",
+   "yêu cầu chỉnh sửa": "đã yêu cầu chỉnh sửa",
+   "xuất bản": "đã xuất bản",
  };
```

**Thay đổi 2:** Thêm workflow stage labels vào `statusLabels`:

```diff
  const statusLabels: Record<string, string> = {
    ...
+   idea: "Ý tưởng",
+   writing: "Viết nội dung",
+   internal_review: "Review nội bộ",
+   revision: "Chỉnh sửa",
+   approved: "Đã duyệt",
+   shooting: "Quay",
+   editing: "Edit",
+   scheduled: "Đã lên lịch",
+   published: "Đã đăng",
  };
```

**Lý do:**
1. `actionLabels` thiếu key cho các approval action (`gửi duyệt`, `duyệt`, `từ chối`, ...). Nếu không có label, action hiển thị raw string thay vì "đã gửi duyệt".
2. `statusLabels` thiếu workflow stage values — stage transition hiển thị raw value thay vì label tiếng Việt.

---

## 3. Tổng hợp đã xác minh (không cần sửa)

### 3.1 Approval API (`app/api/tasks/[id]/approvals/route.ts`)
- ✅ `GET /api/tasks/[id]/approvals` — viewer+ được phép
- ✅ `POST submit_review` — editor+ được phép, admin/viewer nhận 403
- ✅ `POST approve/reject/request_revision` — admin+ được phép, editor/viewer nhận 403
- ✅ `POST publish` — super_admin được phép
- ✅ Reject/request_revision bắt buộc comment (API validate + UI disable button)

### 3.2 UI — ApprovalSection (`components/tasks/approval-section.tsx`)
- ✅ Editor thấy nút "Gửi duyệt" khi `currentStage === "writing"`
- ✅ Admin thấy nút "Duyệt/Từ chối/Yêu cầu chỉnh sửa" khi `currentStage === "internal_review"`
- ✅ Viewer không thấy action button (role check `perms.canApprove`)
- ✅ Reject dialog bắt buộc comment trước khi submit
- ✅ Revision dialog bắt buộc comment trước khi submit
- ✅ History list hiển thị đúng action, comment, reviewer, timestamp

### 3.3 Media Workflow Pipeline (`components/media-workflow/workflow-pipeline.tsx`)
- ✅ `MEDIA_PIPELINE_STAGES` đã có đủ: `idea`, `writing`, `internal_review`, `revision`, `approved`, `scheduled`, `published`
- ✅ Không còn `review` cũ (đã được thay bằng `internal_review`)
- ✅ Stage display với color coding

### 3.4 Types (`lib/workspace/types.ts`)
- ✅ `WorkflowStage` đã định nghĩa đúng: `internal_review`, `revision`, `approved`
- ✅ `MEDIA_PIPELINE_STAGES` array đúng
- ✅ `WORKFLOW_STAGE_LABELS` có đủ label tiếng Việt

---

## 4. Build Verification

| Bước | Kết quả |
|---|---|
| `pnpm tsc --noEmit` | ✅ Pass (exit 0) |
| `pnpm next build` | ✅ Pass (exit 0) — 100+ routes |
| ESLint | ✅ No errors |

---

## 5. Rủi ro còn lại

| Rủi ro | Mức độ | Xử lý |
|---|---|---|
| Dữ liệu cũ `stage='review'` trong DB | Thấp | Chạy migration 015 |
| Activity page hiển thị raw action string nếu không có label | Thấp | Đã fix bằng việc thêm label |
| Activity page hiển thị raw stage value thay vì label | Thấp | Đã fix bằng việc thêm stage labels |
| Chưa có e2e test cho approval flow | Trung bình | Không nằm trong scope P6.3.1 |

---

## 6. Hướng dẫn chạy Migration

```bash
# 1. Chạy migration mới (quan trọng — migrate dữ liệu cũ)
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f sql/workspace/015_review_to_internal_review.sql

# 2. Verify không còn task nào ở stage 'review'
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -c "SELECT stage, COUNT(*) FROM pm_tasks GROUP BY stage;"
```

---

## 7. Checklist trước khi sang P6.4

- [x] SQL migrate review → internal_review (migration 015)
- [x] Media Workflow page — đủ stage definitions
- [x] Approval API — editor/admin/viewer role checks
- [x] UI — action buttons theo role (Gửi duyệt / Duyệt / Từ chối)
- [x] Reject/request_revision bắt buộc comment
- [x] Activity log ghi approval action vào pm_task_activities
- [x] Activity page hiển thị đúng approval action + stage transition
- [x] TypeScript pass
- [x] Next.js build pass

---

## 8. Kết luận

**Đủ điều kiện chuyển sang P6.4.** Các lỗi đã được vá:

1. **Migration 015** — đảm bảo dữ liệu cũ `stage='review'` → `'internal_review'`
2. **Activity log field** — `field_changed` khớp với UI check (`"stage"`)
3. **Activity page labels** — hiển thị approval action và workflow stage đúng tiếng Việt

Không có breaking changes. Không làm tính năng mới.
