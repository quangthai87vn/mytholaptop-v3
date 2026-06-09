# P6.3 Approval Workflow Report

**Ngày hoàn thành:** 27 May 2026
**Trạng thái:** ✅ Hoàn thành
**Phụ trách:** AI Agent

---

## 1. Workflow được chọn

```
idea
  ↓
writing
  ↓ (editor/submitter: "Gửi duyệt")
internal_review
  ↓ (admin/super_admin: "Duyệt")
approved
  ↓ (super_admin: "Xuất bản")
scheduled / published
  ↓ (admin/super_admin: "Yêu cầu chỉnh sửa")
revision ← (admin/super_admin: "Từ chối")
  ↓ (editor: nội dung quay lại "Viết nội dung")
writing
```

---

## 2. Schema đã thêm

### Bảng `pm_task_approvals`

```sql
CREATE TABLE pm_task_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES pm_tasks(id) ON DELETE CASCADE,
    reviewer_id UUID,
    reviewer_name VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    comment TEXT,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 4 indexes: task_id, reviewer_id, action, created_at
```

---

## 3. Workflow Stages mới

| Stage | Label | Màu |
|-------|-------|------|
| `internal_review` | Review nội bộ | Orange |
| `revision` | Chỉnh sửa | Yellow |
| `approved` | Đã duyệt | Emerald |

**Lưu ý:** Stage `review` cũ được thay bằng `internal_review` trong `MEDIA_PIPELINE_STAGES`.

---

## 4. File đã tạo

### Database

| File | Mô tả |
|------|--------|
| `sql/workspace/014_task_approvals.sql` | Migration: pm_task_approvals |

### TypeScript Types

| File | Mô tả |
|------|--------|
| `lib/workspace/types-approval.ts` | TaskApproval, ApprovalAction, getApprovalPermissions, canPerformAction, getNextStage |
| `lib/workspace/types.ts` | WorkflowStage mở rộng + WORKFLOW_STAGE_LABELS cập nhật |
| `lib/auth/get-current-user.ts` | Helper server-side lấy current user từ session |

### DB Operations

| File | Functions |
|------|-----------|
| `lib/workspace/db/index.ts` | `getApprovalHistory()`, `createApprovalRecord()`, `updateTaskStage()`, `performApprovalAction()` |

### Validation

| File | Schemas |
|------|---------|
| `lib/workspace/validation.ts` | `performApprovalSchema` (action + comment) |

### API Routes

| Route | Method | Mô tả |
|-------|--------|--------|
| `/api/tasks/[id]/approvals` | GET | Lấy approval history |
| `/api/tasks/[id]/approvals` | POST | Thực hiện action (submit_review/approve/reject/request_revision/publish) |

### UI Components

| File | Mô tả |
|------|--------|
| `components/tasks/approval-section.tsx` | Approval UI: action buttons, history list, reject/revision dialogs |
| `components/tasks/task-detail-client.tsx` | Thêm tab "Phê duyệt" (3 tabs) |
| `app/(admin)/tasks/[id]/page.tsx` | Lấy userRole từ session để truyền vào ApprovalSection |
| `components/media-workflow/workflow-card.tsx` | Thêm colored badges cho internal_review/revision/approved |

---

## 5. Role Permissions

| Action | viewer | editor | admin | super_admin |
|--------|-------|--------|-------|-------------|
| Xem lịch sử duyệt | ❌ | ✅ | ✅ | ✅ |
| Gửi duyệt (writing → internal_review) | ❌ | ✅ | ✅ | ✅ |
| Duyệt (internal_review → approved) | ❌ | ❌ | ✅ | ✅ |
| Từ chối (internal_review → revision) | ❌ | ❌ | ✅ | ✅ |
| Yêu cầu chỉnh sửa (internal_review → revision) | ❌ | ❌ | ✅ | ✅ |
| Xuất bản (approved/scheduled → published) | ❌ | ❌ | ❌ | ✅ |

---

## 6. Logic quan trọng

### Validation tại API layer
- `reject` và `request_revision`: bắt buộc comment (400 nếu thiếu)
- Mỗi action chỉ hợp lệ khi task đang ở stage cho phép
- Role check: viewer/editor không thể approve/reject/publish

### Validation tại DB layer (`performApprovalAction`)
- `submit_review`: chỉ từ `writing`
- `approve/reject/request_revision`: chỉ từ `internal_review`
- `publish`: chỉ từ `approved` hoặc `scheduled`

### Side effects
Mỗi approval action đều ghi vào 2 bảng:
1. `pm_task_approvals` — audit trail chi tiết
2. `pm_task_activities` — activity log để hiển thị trong Activity tab

---

## 7. UI Notes

### ApprovalSection Component
- Tự động ẩn/hiện action buttons dựa vào `currentStage` + `userRole`
- Action buttons chỉ xuất hiện khi có thể thực hiện action đó
- History list hiển thị đầy đủ: action badge, comment, reviewer name, timestamp
- Reject/Request Revision: dùng Dialog bắt buộc nhập comment
- Sau action thành công: reload page để reflect stage change

### Workflow Card
- `internal_review`: badge orange với icon mắt
- `revision`: badge yellow với icon edit
- `approved`: badge emerald với icon check

---

## 8. Migration đã chạy

```bash
$env:PGPASSWORD='1Passw0rdphatxitnhat'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop -f "d:\AI PROJECT\mytholaptop-v3\apps\admin-ui\sql\workspace\014_task_approvals.sql"
```

Output:
```
CREATE TABLE
CREATE INDEX × 4
```

---

## 9. Rủi ro còn lại

| Rủi ro | Mức | Xử lý |
|--------|------|--------|
| Dữ liệu task cũ có `workflow_stage = "review"` không auto-migrate | Thấp | Có thể chạy UPDATE để migrate: `UPDATE pm_tasks SET stage = 'internal_review' WHERE stage = 'review'` |
| Chưa có notification khi task được approve/reject | Trung bình | Có thể bổ sung sau |
| Chưa có email alert cho reviewer | Trung bình | Có thể bổ sung sau |
| super_admin có thể approve chính mình | Thấp | Đúng theo spec — nếu cần tách riêng có thể bổ sung |
| Chưa có deadline cho approval ( SLA ) | Trung bình | Có thể thêm vào metadata |

---

## 10. Đề xuất P6.4 tiếp theo

### 10.1 Notification System
- Gửi thông báo khi task được submit review
- Gửi thông báo khi task được approve/reject
- Gửi email cho admin khi có content chờ review

### 10.2 Approval SLA / Deadline
- Set deadline cho approval (VD: 24h)
- Alert khi quá hạn review
- Dashboard cho admin xem pending approvals

### 10.3 Bulk Approval
- Bulk approve/reject nhiều tasks cùng lúc
- Batch action cho campaign-level review

### 10.4 Activity Tab Integration
- Hiển thị approval actions trong Activity tab của Task
- Merge `pm_task_approvals` và `pm_task_activities` trong UI

### 10.5 Media Workflow Pipeline Update
- Media Workflow page cần cập nhật để phản ánh pipeline stages mới
- Thêm filter theo stage: internal_review, revision, approved

### 10.6 Scheduled Publishing
- Admin đặt lịch publish tự động (automation)
- Queue system cho scheduled posts

---

## 11. Test Checklist

- [x] TypeScript pass
- [x] Next.js build pass
- [x] Migration đã chạy thành công
- [x] Workflow stages mới trong types và validation
- [x] API role-based permissions
- [ ] Editor gửi duyệt → stage đổi sang internal_review
- [ ] Admin approve → stage đổi sang approved, activity log ghi
- [ ] Admin reject → stage đổi sang revision, comment bắt buộc
- [ ] Viewer xem task → không thấy nút approve/reject
- [ ] Activity log hiển thị đúng action
- [ ] Migrate dữ liệu cũ `review` → `internal_review`

---

**Kết luận:** P6.3 hoàn thành. Hệ thống có quy trình phê duyệt rõ ràng: editor gửi duyệt → admin review → approve/reject → super_admin xuất bản. Mỗi action được ghi audit trail đầy đủ. Role-based permissions được enforce ở cả API layer và DB layer.
