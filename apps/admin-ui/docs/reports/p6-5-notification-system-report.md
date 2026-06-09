# P6.5 Notification System Report

**Ngày:** 27/05/2026
**Phase:** P6.5
**Trạng thái:** Hoàn thành

---

## 1. Tổng quan

P6.5 xây dựng hệ thống notification nội bộ cho Workspace/Content Operations. Thay thế mock notification trong header bằng hệ thống thực tế, kết nối với các event từ approval workflow.

---

## 2. Kiến trúc

### 2.1 File đã tạo

| File | Mô tả |
|---|---|
| `sql/workspace/016_notifications.sql` | Migration: table + function `create_notification` với deduplication |
| `lib/workspace/types-notification.ts` | Types + color/icon config cho notification |
| `lib/workspace/notifications.ts` | Notification service với typed helpers |
| `app/api/notifications/route.ts` | API: GET list, POST mark read |
| `app/(admin)/notifications/page.tsx` | Notification page với filter + mark read |
| `components/dashboard/notification-alert-widget.tsx` | Dashboard widget: Quá hạn / Chờ duyệt / Sắp đến hạn |
| `components/layout/admin-header.tsx` | Viết lại notification bell dùng real API |
| `scripts/run-migration-016.js` | Script chạy migration |

### 2.2 File đã sửa

| File | Thay đổi |
|---|---|
| `lib/workspace/db/index.ts` | Thêm 6 functions: getNotifications, getNotificationCount, markNotificationsRead, markAllNotificationsRead, createNotification, getAdmins |
| `app/api/tasks/[id]/approvals/route.ts` | Hook notification: approve → assignee, reject → assignee, submit_review → admin |
| `app/(admin)/workspace/page.tsx` | Thêm NotificationAlertWidget |

### 2.3 Database Schema

```sql
CREATE TABLE pm_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  dedup_key VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION create_notification(params JSONB)
  RETURNS UUID AS $$
  -- Chỉ tạo notification nếu chưa có cùng dedup_key trong 24h
  $$ LANGUAGE plpgsql;
```

---

## 3. Các event hỗ trợ

| Type | Mô tả | Được gửi khi |
|---|---|---|
| `task_assigned` | Được giao việc | Task assigned cho user |
| `task_submit_review` | Cần duyệt nội dung | Editor gửi duyệt → admin |
| `task_approved` | Đã được duyệt | Admin approve → assignee |
| `task_rejected` | Yêu cầu chỉnh sửa | Admin reject/request_revision → assignee |
| `task_due_soon` | Sắp đến hạn | Cron job (chưa implement — cần cron service) |
| `task_overdue` | Quá hạn | Cron job (chưa implement) |
| `publish_scheduled` | Đã lên lịch đăng bài | Admin schedule publish → assignee |
| `campaign_deadline` | Deadline chiến dịch | Cron job (chưa implement) |
| `system` | Thông báo hệ thống | Manual/system |

---

## 4. Logic chống spam duplicate

**Deduplication key format:** `type:entity_id[:sub]`

Ví dụ:
- `task_approved:uuid-xxx` — chỉ 1 notification approve cho mỗi task
- `task_rejected:uuid-xxx` — chỉ 1 notification reject cho mỗi task
- `task_overdue:uuid-xxx` — chỉ 1 notification overdue/ngày cho mỗi task
- `task_assigned:uuid-xxx:user-yyy` — unique cho mỗi assignee

**Window:** 24 giờ — nếu đã có notification với cùng `dedup_key` trong 24h, không tạo mới.

---

## 5. API Endpoints

### GET /api/notifications
- Auth: `requireAdminAuth()` — viewer+
- Query params: `types`, `isRead`, `limit`, `page`
- Returns: `{ data, total, unread, page, pageSize, totalPages }`

### POST /api/notifications
- Auth: `requireAdminAuth()` — editor+
- Rate limit: `checkWorkspaceRateLimit()`
- Body: `{ action: "mark_read", notificationIds: [...] }` hoặc `{ action: "mark_all_read" }`

---

## 6. UI

### 6.1 Header Bell
- Icon Bell trên topbar với badge unread count
- Dropdown hiển thị 10 notification gần nhất
- Click notification → mark as read + navigate
- "Đánh dấu tất cả đã đọc" button
- Auto-refresh mỗi 30 giây
- Màu sắc theo type (task_overdue = đỏ, task_approved = xanh, ...)

### 6.2 Notification Page (/notifications)
- Tabs: "Tất cả" / "Chưa đọc" (với badge count)
- Danh sách notifications với icon + màu theo type
- Mark individual notification đã đọc
- "Đánh dấu tất cả đã đọc"
- Click "Mở" → navigate đến task/campaign liên quan
- Time ago format: "5 phút trước", "2 giờ trước", ...

### 6.3 Dashboard Widget
- 3 alerts: Quá hạn / Chờ duyệt / Sắp đến hạn
- Mỗi alert hiển thị số lượng từ notification count API
- Empty state: "Mọi thứ đều ổn"

---

## 7. Build Verification

| Bước | Kết quả |
|---|---|
| Migration 016 chạy | ✅ 0 rows (table empty, chưa có trigger) |
| `pnpm tsc --noEmit` | ✅ Pass |
| `pnpm next build` | ✅ Pass (100+ routes, có `/notifications`) |

---

## 8. Rủi ro còn lại

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Overdue/due_soon notification cần cron job | Cao | Cần cron/scheduled task runner (P6.6?) |
| Task assign notification chưa hook vào task API | Cao | Cần hook vào task creation/update |
| Permission check trong notification page chưa filter theo entity | Trung bình | Hiện tại viewer+ thấy tất cả notification của họ |
| Chưa test notification page thực tế | Thấp | Cần login + trigger approval action |

---

## 9. Đề xuất P6.6

### 9.1 Cron Job cho Overdue/Due Soon Notifications

Cần một service chạy định kỳ (mỗi giờ) để:
1. Scan `pm_tasks` cho overdue tasks → tạo `task_overdue` notification
2. Scan cho tasks sắp đến hạn (3 ngày) → tạo `task_due_soon` notification

**Options:**
- Next.js API route với external cron (Vercel cron, GitHub Actions, ...)
- Standalone Node.js script chạy qua cron
- Tích hợp vào existing healthcheck/rate-limit system

### 9.2 Nội dung đề xuất khác

**Real-time Notification (P6.6b):**
- WebSocket/SSE cho notification real-time
- Không cần refresh 30s

**Task Assignment Notification (P6.6c):**
- Hook `notifyTaskAssigned()` vào task creation/update API
- Khi `assignee_ids` thay đổi → tạo notification cho assignee mới

**Permission Filter (P6.6d):**
- Viewer chỉ thấy notification liên quan đến task/campaign họ được phép truy cập
- Admin thấy tất cả notification của workspace
