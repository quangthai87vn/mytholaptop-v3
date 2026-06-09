# P6.4 Advanced Content Calendar Report

**Ngày:** 27/05/2026
**Phase:** P6.4
**Trạng thái:** Hoàn thành

---

## 1. Tổng quan

P6.4 nâng cấp Workspace Calendar từ component đơn giản (chỉ hiển thị task due_date) thành **Content Calendar** đầy đủ tính năng cho team media/content. Lịch mới hỗ trợ:

- 3 loại event: production deadline, publish schedule, campaign deadline
- 3 views: Month, Week, Agenda
- Filter đa chiều
- Stats dashboard (content tuần này, đã duyệt chưa đăng, quá hạn, lên lịch tháng này)
- Click event hiển thị chi tiết

---

## 2. Kiến trúc

### 2.1 File đã tạo

| File | Mô tả |
|---|---|
| `lib/workspace/types-calendar.ts` | Types + color config cho calendar events |
| `app/api/calendar/route.ts` | API endpoint GET /api/calendar |
| `app/(admin)/workspace/calendar/page.tsx` | Calendar page — 3 views + filters + event detail dialog |
| `components/dashboard/content-calendar-widget.tsx` | Widget cho workspace dashboard |

### 2.2 File đã sửa

| File | Thay đổi |
|---|---|
| `lib/workspace/db/index.ts` | Thêm `getCalendarEvents()` và `getCalendarStats()` |
| `app/(admin)/workspace/page.tsx` | Thêm `ContentCalendarWidget` vào dashboard |
| `lib/navigation.ts` | Đổi label "Lịch làm việc" → "Content Calendar" |

### 2.3 Data Flow

```
GET /api/calendar?year=&month=&platforms=&workflowStages=...
  → getCalendarEvents({ year, month, filters })
     → Query pm_tasks (due_date + published_at trong tháng)
     → Query pm_campaigns (end_date trong tháng)
     → Map sang CalendarEvent[]
  → getCalendarStats()
     → 4 COUNT queries: thisWeek, approvedNotPublished, overdue, scheduledThisMonth
```

---

## 3. Các loại event hỗ trợ

| Event Type | Nguồn dữ liệu | Màu | Mô tả |
|---|---|---|---|
| `production_deadline` | `pm_tasks.due_date` | Orange | Task cần hoàn thành trước deadline |
| `publish_schedule` | `pm_tasks.published_at` | Blue | Lịch đăng bài |
| `campaign_deadline` | `pm_campaigns.end_date` | Red | Deadline của chiến dịch |

### 3.1 Publish Status Mapping

| Workflow Stage | Publish Status | Màu |
|---|---|---|
| `idea`, `writing` | Draft | Gray |
| `internal_review`, `revision` | Review | Orange |
| `approved` (no publish_date) | Approved | Blue |
| `approved` (future publish_date) | Scheduled | Purple |
| `scheduled` | Scheduled | Purple |
| `published` | Published | Green |
| Past `due_date` + not approved/published | Overdue | Red |

---

## 4. Filter hỗ trợ

### 4.1 Event Type Toggle
- Production Deadline (bật/tắt)
- Publish Schedule (bật/tắt)
- Campaign Deadline (bật/tắt)

### 4.2 Platform Filter
- Facebook, Website, TikTok, Zalo, YouTube, Instagram
- Multi-select, OR logic

### 4.3 Workflow Stage Filter
- idea, writing, internal_review, revision, approved, scheduled, published
- Multi-select, OR logic

### 4.4 Filters được gửi qua query params
```
GET /api/calendar?platforms=facebook,tiktok&workflowStages=writing,internal_review&showProductionDeadline=true
```

---

## 5. Logic Overdue / Scheduled / Published

### 5.1 Overdue
```sql
SELECT COUNT(*) FROM pm_tasks
WHERE due_date < TODAY
  AND stage NOT IN ('approved', 'scheduled', 'published')
```
→ Highlight đỏ trên event card + stats widget

### 5.2 Scheduled
```sql
SELECT COUNT(*) FROM pm_tasks
WHERE published_at IS NOT NULL
  AND published_at >= TODAY
  AND published_at <= END_OF_MONTH
  AND stage IN ('approved', 'scheduled', 'published')
```

### 5.3 Approved but not published
```sql
SELECT COUNT(*) FROM pm_tasks
WHERE stage = 'approved'
  AND (published_at IS NULL OR published_at > TODAY)
```

---

## 6. UI Components

### 6.1 Stats Bar
4 thẻ stats: Content tuần này / Đã duyệt chưa đăng / Quá hạn / Lên lịch tháng này

### 6.2 Filter Bar
Toggle buttons cho event type + platform badges + stage badges + "Xóa lọc"

### 6.3 Month View
- Grid 7 cột × N tuần
- Today highlight đỏ
- Past days muted
- Event dots max 3/ngày + "+N more"
- Click event → TaskDetailDialog

### 6.4 Week View
- 7 cột tương ứng T2–CN
- Today column highlight đỏ
- Full event cards (không compact)
- Min-height 300px

### 6.5 Agenda View
- Group by date (date header + divider)
- Production deadline hiển thị trước publish schedule
- Today highlight đỏ
- Date badge format: weekday + day number

### 6.6 Task Detail Dialog
- Type badge (Deadline/Đăng bài/Campaign deadline)
- Status badge
- Platform badge
- Due date / Publish date / Workflow stage
- Project / Campaign
- Priority
- Link "Mở task" → `/tasks/[id]`

---

## 7. Dashboard Widget

`ContentCalendarWidget` hiển thị trên `/workspace`:

```
┌─────────────────────────────────────────────────┐
│ 📅 Content Calendar                    Mở calendar → │
├──────────┬──────────┬──────────┬──────────┐    │
│ Tuần này │ Đã duyệt│ Quá hạn  │ Lên lịch │    │
│    7     │    2     │    0     │    5     │    │
└──────────┴──────────┴──────────┴──────────┘    │
```

Client-side fetch → `/api/calendar` → stats

---

## 8. Build Verification

| Bước | Kết quả |
|---|---|
| `pnpm tsc --noEmit` | ✅ Pass |
| `pnpm next build` | ✅ Pass (100+ routes) |

---

## 9. Rủi ro còn lại

| Rủi ro | Mức | Xử lý |
|---|---|---|
| Chưa có assignee filter (cần API staff list) | Thấp | Có thể thêm sau nếu cần |
| Chưa có project/campaign filter trên UI | Thấp | Data layer đã support, UI cần thêm |
| Publish date từ `published_at` column — cần verify column tồn tại | Trung bình | Đã kiểm tra migration 002 có column |
| Chưa có e2e test cho calendar views | Thấp | Ngoài scope P6.4 |

---

## 10. Đề xuất P6.5

### 10.1 Nội dung đề xuất

**Publishing & Scheduling Automation** — tích hợp đăng bài thực tế:

1. **Auto-publish**: Khi task đến `publish_date`, tự động post lên platform
2. **Social media connectors**: Facebook API, Zalo OA, TikTok API
3. **Scheduling queue**: Hàng đợi publish với thời gian chính xác
4. **Publish status tracking**: Cập nhật `published_at`, `published_url` sau khi đăng
5. **Engagement metrics sync**: Pull likes/views từ các platform về

### 10.2 Phụ thuộc
- P6.4 Content Calendar (đã xong)
- Facebook App credentials
- Zalo OA credentials
- TikTok Business API access

### 10.3 Ưu tiên
Nếu không làm auto-publish, P6.5 có thể tập trung vào:
- **Reporting & Analytics**: Thống kê content performance
- **Content Brief Generator**: AI tạo brief từ campaign brief
