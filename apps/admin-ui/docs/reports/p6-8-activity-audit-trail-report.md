# P6.8 — Activity Log Enhancement & Audit Trail

**Ngày:** 2026-05-27
**Trạng thái:** Hoàn thành
**Phụ trách:** AI Agent

---

## 1. Bối cảnh

P1–P5.11 đã hoàn thành. Hệ thống đã có task, approval, asset, comment, notification, KPI. Activity log hiện có (trong `v_workspace_activities`) cần nâng cấp để phục vụ quản lý và truy vết tốt hơn.

---

## 2. Nguồn log đã gom

### 2.1. Nguồn có sẵn (đã tồn tại trước P6.8)

| Nguồn | Bảng | Ghi log khi nào |
|---|---|---|
| Task Activity | `pm_task_activities` | Task được tạo, đổi status/stage, bình luận |
| Status History | `pm_status_history` | Task/Project/Campaign đổi trạng thái |
| Admin Audit | `admin_audit_logs` | Admin đổi role/status user, reset password |

### 2.2. Nguồn mới thêm (P6.8)

| Nguồn | Bảng | Ghi log khi nào |
|---|---|---|
| Notification Event | `pm_notification_events` | Thông báo được gửi đến user |

**Không gom:** `pm_notifications` (đây là bảng lưu notification của user, không phải log hoạt động).

---

## 3. SQL Migration đã tạo

**File:** `sql/workspace/019_activity_audit_trail.sql`

### 3.1. Bảng `pm_notification_events`

Lưu notification event để hiển thị trong activity feed. Gồm các cột: `id`, `user_id`, `user_name`, `notification_type`, `title`, `message`, `entity_type`, `entity_id`, `actor_id`, `actor_name`, `metadata`, `created_at`. Có index trên `user_id`, `entity`, `created_at`.

### 3.2. Function `notify_user` (nâng cấp)

Nâng cấp từ function gốc: đồng thời ghi vào `pm_notifications` và `pm_notification_events`. Không thay đổi interface, chỉ thêm side-effect.

### 3.3. View `v_workspace_activities` (nâng cấp)

Gom 4 nguồn trong 1 view:

```sql
-- Nguồn 1: Task activities (pm_task_activities)
SELECT ... FROM pm_task_activities

UNION ALL

-- Nguồn 2: Status history (pm_status_history)
SELECT ... FROM pm_status_history

UNION ALL

-- Nguồn 3: Admin audit logs (admin_audit_logs)
SELECT ... FROM admin_audit_logs

UNION ALL

-- Nguồn 4: Notification events (pm_notification_events)
SELECT ... FROM pm_notification_events
```

View trả về 11 columns chuẩn: `id`, `source_table`, `entity_id`, `entity_type`, `entity_name`, `actor_id`, `actor_name`, `action_type`, `field_changed`, `old_value`, `new_value`, `metadata`, `created_at`.

**Limit 500 rows** để tránh query quá nặng.

---

## 4. API đã tạo / sửa

### 4.1. `GET /api/activity`

Lấy danh sách activity với bộ lọc.

**Query params:**

| Param | Mô tả | Ví dụ |
|---|---|---|
| `entityType` | Entity type (phân cách bằng `,`) | `task,campaign` |
| `actionType` | Action type (phân cách bằng `,`) | `created,status_changed` |
| `actorId` | Lọc theo actor ID | UUID |
| `actorName` | Tìm actor theo tên (ILIKE) | `Nguyễn` |
| `search` | Tìm trong entity_name hoặc action | `facebook` |
| `dateFrom` | Từ ngày (ISO) | `2026-05-01` |
| `dateTo` | Đến ngày (ISO) | `2026-05-27` |
| `page` | Trang (default 1) | `1` |
| `pageSize` | Số dòng/trang (max 100, default 20) | `20` |

**Response:**

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

**Auth:** Yêu cầu đăng nhập (viewer có quyền đọc).

### 4.2. `GET /api/activity/export`

Export CSV với bộ lọc tương tự `/api/activity`.

**Auth:** Chỉ `admin` và `super_admin` được export. `viewer` và `editor` nhận 403.

**CSV columns:** `ID`, `Nguồn`, `Entity Type`, `Entity Name`, `Actor Name`, `Action`, `Field Changed`, `Old Value`, `New Value`, `Created At`.

**Bảo mật:**
- Không export `metadata` (có thể chứa sensitive data)
- Không export `ip_address`, `user_agent` (từ admin_audit_logs.metadata)
- Chỉ export fields hiển thị an toàn

---

## 5. Page Activity (nâng cấp)

**File:** `app/(admin)/workspace/activity/page.tsx`

### 5.1. Kiến trúc

- Server Component: lấy initial data + current user
- Client Component (`components/activity/activity-client.tsx`): filter, pagination, export UI

### 5.2. Tính năng

| Tính năng | Mô tả |
|---|---|
| Search | Tìm kiếm theo entity name hoặc action |
| Filter panel | Entity type, Action type, Date range |
| Active filters | Hiển thị badge các filter đang áp dụng |
| Pagination | Server-side pagination, max 7 buttons |
| Export CSV | Chỉ admin/super_admin thấy nút Export |
| Empty state | Hiển thị thông báo + nút xóa filter |

### 5.3. Action labels tiếng Việt

Hỗ trợ đầy đủ: `created`, `updated`, `status_changed`, `stage_changed`, `comment_created`, `comment_updated`, `comment_deleted`, `gửi duyệt`, `duyệt`, `từ chối`, `yêu cầu chỉnh sửa`, `xuất bản`, `user.role_changed`, `user.status_changed`, `user.password_reset`, `user.disabled`, `task_assigned`, ...

### 5.4. Entity labels tiếng Việt

`task` → "công việc", `project` → "dự án", `campaign` → "chiến dịch", `admin_user` → "tài khoản admin", `system` → "hệ thống".

---

## 6. DB Functions đã thêm

**File:** `lib/workspace/db/index.ts`

### `getActivities(options)`

Hàm chính với đầy đủ filter + pagination. Dùng parameterized queries tránh SQL injection.

### `getActivitiesForExport(options)`

Export tối đa 5000 rows cho CSV. Cùng filter với `getActivities`.

---

## 7. Types đã thêm

**File:** `lib/workspace/types.ts`

```typescript
export type ActivitySourceTable =
  | "task_activity"
  | "status_history"
  | "admin_audit"
  | "notification_event";

export type ActivityEntityType =
  | "task" | "project" | "campaign"
  | "media_workflow" | "admin_user" | "system";

export interface ActivityLog { ... }
export interface ActivityFilters { ... }
```

---

## 8. Rủi ro còn lại

| # | Rủi ro | Mức độ | Xử lý |
|---|---|---|---|
| 1 | `admin_audit_logs.metadata` có thể chứa IP/user-agent — đã lọc khi export nhưng vẫn lưu trong DB | Trung bình | Không export metadata, chỉ admin truy cập DB nếu cần |
| 2 | View `v_workspace_activities` dùng `LIMIT 500` — activity cũ có thể bị cắt | Thấp | Có thể tăng limit hoặc thêm filter date mặc định |
| 3 | Chưa có index riêng cho `v_workspace_activities` — query filter có thể chậm khi bảng lớn | Trung bình | Nên thêm index trên `created_at DESC, entity_type, action_type` |
| 4 | Comment activity (P6.7.1) ghi vào `pm_task_activities` — đã tự động nằm trong view | Không | — |
| 5 | Notification events cần trigger khi notification được gửi — hiện tại `notify_user()` đã ghi song song | Không | — |

---

## 9. Đề xuất P6.9 tiếp theo

Các hướng ưu tiên tiếp theo:

1. **Enhanced Notifications** — Real-time notification badge, push notification, notification preferences per user.
2. **Dashboard Widget: Recent Activity** — Mini activity feed trên dashboard chính.
3. **Performance Optimization** — Indexes cho activity queries, materialized view cho activity summary.
4. **Search Enhancement** — Full-text search trong activity content (comment content, metadata).
5. **Audit Trail Granularity** — Log thêm khi asset được upload/download, khi KPI được tạo/cập nhật.

**Đề xuất P6.9:** Enhanced Notifications (real-time badge + notification preferences).

---

## 10. Lệnh chạy migration

```bash
# Chạy migration 019
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop \
  -f sql/workspace/019_activity_audit_trail.sql

# Verify view
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop \
  -c "SELECT COUNT(*) FROM v_workspace_activities;"
```

---

## 11. Tóm tắt file đã tạo / sửa

| File | Hành động |
|---|---|
| `sql/workspace/019_activity_audit_trail.sql` | Tạo mới |
| `lib/workspace/types.ts` | Thêm ActivityLog, ActivityFilters types |
| `lib/workspace/db/index.ts` | Thêm getActivities(), getActivitiesForExport() |
| `app/api/activity/route.ts` | Tạo mới |
| `app/api/activity/export/route.ts` | Tạo mới |
| `app/(admin)/workspace/activity/page.tsx` | Viết lại (Server Component) |
| `components/activity/activity-client.tsx` | Tạo mới |
| `docs/reports/p6-8-activity-audit-trail-report.md` | Tạo mới |

**Kiểm tra:**
- TypeScript: ✅ Pass
- Next.js Build: ✅ Pass (`/workspace/activity` route được generate)
