# Quản lý Dự án — Hướng dẫn Nghiệp vụ

> **Module:** Quản lý Dự án & Media Workflow cho Mỹ Tho Laptop
> **Phiên bản:** 1.0.0 | **Ngày:** 2026-05-26
> **Cập nhật lần cuối:** Thêm trang Chiến dịch, sửa Calendar, sửa Interns

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Sơ đồ luồng dữ liệu](#2-sơ-đồ-luồng-dữ-liệu)
3. [Trang Workspace Dashboard](#3-trang-workspace-dashboard)
4. [Trang Dự án](#4-trang-dự-án-projects)
5. [Trang Chiến dịch](#5-trang-chiến-dịch-campaigns)
6. [Trang Công việc](#6-trang-công-việc-tasks)
7. [Trang Media Workflow](#7-trang-media-workflow)
8. [Trang Thực tập sinh](#8-trang-thực-tập-sinh-interns)
9. [Trang Lịch làm việc](#9-trang-lịch-làm-việc-calendar)
10. [Trang Hoạt động](#10-trang-hoạt-động-activity)
11. [Quy trình thao tác chi tiết](#11-quy-trình-thao-tác-chi-tiết)

---

## 1. Tổng quan hệ thống

### Mô hình quan hệ giữa các thực thể

```
Projects (Dự án)
    │
    ├── Campaigns (Chiến dịch)
    │       │
    │       └── Media Workflows (Pipeline nội dung)
    │               │
    │               ├── pm_workflow_stages (Giai đoạn: ý tưởng → viết → duyệt → quay → cắt → đăng)
    │               ├── pm_workflow_comments (Bình luận theo giai đoạn)
    │               └── pm_ai_suggestions (Gợi ý từ AI)
    │
    ├── Tasks (Công việc)
    │       │
    │       ├── pm_task_comments (Bình luận)
    │       ├── pm_task_activities (Nhật ký thay đổi)
    │       └── pm_status_history (Lịch sử trạng thái)
    │
    └── Interns (Thực tập sinh)
            │
            ├── pm_intern_kpis (KPI theo tuần/tháng)
            ├── pm_weekly_performance (Đánh giá hiệu suất)
            └── pm_intern_rankings (Bảng xếp hạng)
```

### Các bảng database

| Bảng | Chức năng | Schema |
|------|-----------|--------|
| `pm_projects` | Dự án chính | id, name, status, priority, color, budget, dates, tags |
| `pm_campaigns` | Chiến dịch marketing thuộc dự án | id, project_id, name, type, status, channels, metrics |
| `pm_tasks` | Công việc Kanban | id, project_id, campaign_id, title, status, priority, due_date, progress |
| `pm_task_comments` | Bình luận công việc (có threading) | id, task_id, parent_id, content, author, mentions |
| `pm_task_activities` | Nhật ký hành động (audit log) | id, task_id, actor, action, field, old/new value |
| `pm_media_workflows` | Pipeline sản xuất nội dung | id, title, content_type, platform, status, ai_content |
| `pm_workflow_stages` | Giai đoạn cụ thể của workflow | id, workflow_id, stage, content, approval |
| `pm_ai_suggestions` | Gợi ý AI cho workflow | id, suggestion_type, content, confidence, used |
| `pm_interns` | Hồ sơ thực tập sinh | id, full_name, position, university, mentor, status |
| `pm_intern_kpis` | KPI theo chu kỳ | id, intern_id, period, tasks_completed, deadline_accuracy |
| `pm_weekly_performance` | Đánh giá hàng tuần | id, intern_id, scores, rating, mentor_feedback |
| `pm_intern_rankings` | Bảng xếp hạng | id, intern_id, period, ranks, scores, trend |

### Các API endpoints

```
/api/projects          GET, POST     Danh sách / tạo dự án
/api/projects/[id]     GET, PUT, DELETE
/api/campaigns         GET, POST     Danh sách / tạo chiến dịch
/api/campaigns/[id]    GET, PUT, DELETE
/api/tasks             GET, POST     Danh sách / tạo công việc
/api/tasks/[id]        GET, PUT, DELETE
/api/media-workflow    GET, POST     Danh sách / tạo workflow
/api/media-workflow/[id] GET, PUT, DELETE
/api/interns           GET, POST     Danh sách / thêm thực tập sinh
/api/interns/[id]      GET, PUT, DELETE
```

---

## 2. Sơ đồ luồng dữ liệu

### Luồng tạo dự án mới

```
1. User nhấn "Tạo dự án" ở /projects
   ├── Mở ProjectForm dialog
   ├── Nhập: tên, mô tả, trạng thái, độ ưu tiên, màu, ngày, ngân sách
   └── Submit → POST /api/projects
       └── Server: INSERT pm_projects
           └── Response: { data: project }
               └── Router.refresh() → Server Component re-fetch
                   └── UI: Danh sách dự án cập nhật
```

### Luồng Kanban (kéo thả công việc)

```
1. User kéo task card từ cột "To Do" sang "In Progress"
   ├── Drag start → lưu task vào state
   ├── Drag over column → highlight column
   └── Drop → PUT /api/tasks/[id] { status: "in_progress" }
       ├── Server: UPDATE pm_tasks SET status = 'in_progress'
       ├── INSERT pm_task_activities (action: 'status_changed')
       ├── INSERT pm_status_history (from/to status)
       └── Response: { data: updated_task }
           └── Toast: "Đã chuyển sang In Progress"
```

### Luồng Media Workflow

```
1. User nhấn "Tạo workflow" ở /media-workflow
   ├── POST /api/media-workflow
   └── Workflow tạo ở stage "idea" mặc định

2. User kéo workflow card qua các cột pipeline
   └── PUT /api/media-workflow/[id] { status: "writing" }

3. Khi AI tạo nội dung:
   └── PUT /api/media-workflow/[id] {
       ai_prompt: "...", ai_generated_content: "...",
       ai_model_used: "gpt-4o", ai_generated_at: timestamp
     }

4. Khi đăng bài:
   └── PUT /api/media-workflow/[id] {
       status: "published", published_at: timestamp,
       published_url: "https://..."
     }
```

---

## 3. Trang Workspace Dashboard

**URL:** `/workspace`

### Mục đích
Trang tổng quan nhanh cho team quản lý dự án, hiển thị toàn bộ KPIs ở một nơi duy nhất.

### Thành phần

| Widget | Dữ liệu nguồn | Mô tả |
|--------|----------------|--------|
| WorkspaceStatsWidget | `getWorkspaceStats()` | 4 thẻ: Dự án đang chạy, Công việc đến hạn tuần này, Công việc quá hạn, Nội dung đăng tháng này |
| DeadlineAlertWidget | `getTasks()` | Danh sách task đến hạn / quá hạn |
| MediaStatsWidget | `getMediaWorkflows()` | Thống kê nội dung theo pipeline |
| TeamActivityWidget | `pm_task_activities` | 15 hoạt động gần nhất của team |
| Top Interns | `getInternRankings()` | 3 thực tập sinh xuất sắc nhất tuần |
| Recent Projects | `getProjects()` | 4 dự án mới nhất |

### Quy trình thao tác

1. Mở `/workspace` → xem toàn cảnh
2. Nhấn "Dự án" / "Công việc" / "Media" → chuyển nhanh sang trang tương ứng
3. Click vào task trong Deadline Alerts → chuyển đến trang task
4. Click "Xem bảng xếp hạng" → chuyển đến `/interns/ranking`

---

## 4. Trang Dự án (Projects)

**URL:** `/projects`

### Mục đích
Quản lý danh sách dự án, tạo / sửa / xóa dự án, lọc theo trạng thái và độ ưu tiên.

### Thành phần

| Thành phần | File | Chức năng |
|------------|------|-----------|
| Toolbar | `projects-client.tsx` | Search, filter status, filter priority, nút tạo |
| Stats row | `projects-client.tsx` | 4 thẻ: tổng, đang chạy, hoàn thành, quá hạn |
| Project list | `project-list.tsx` | Grid 1/2/3 cột hoặc empty state |
| Project card | `project-card.tsx` | Click → `/projects/[id]`, hover → nút sửa/xóa |
| Project form | `project-form.tsx` | Dialog tạo/sửa dự án |

### Các trường dữ liệu của Dự án

| Trường | Bắt buộc | Mô tả |
|--------|---------|--------|
| `name` | ✅ | Tên dự án |
| `description` | | Mô tả ngắn |
| `status` | ✅ | `active` (đang hoạt động), `planning` (lên kế hoạch), `completed` (hoàn thành), `on_hold` (tạm dừng), `archived` (lưu trữ) |
| `priority` | ✅ | `low`, `medium`, `high`, `urgent` |
| `color` | | Mã hex cho thanh màu bên trái card (mặc định #E60012) |
| `start_date` | | Ngày bắt đầu |
| `end_date` | | Ngày kết thúc |
| `budget` | | Ngân sách (VNĐ) |
| `tags` | | Danh sách tag |

### Quy trình tạo dự án

1. Nhấn **"Tạo dự án"** → mở dialog
2. Nhập thông tin → chọn màu (preset 8 màu)
3. Nhấn **"Tạo dự án"** → `POST /api/projects`
4. Toast: "Đã tạo dự án mới" → danh sách tự cập nhật
5. Click vào card → vào trang chi tiết `/projects/[id]`

### Chi tiết Dự án — `/projects/[id]`

| Tab | Dữ liệu | Mô tả |
|-----|---------|--------|
| Tasks | `getTasks({project_id})` | Danh sách công việc theo trạng thái Kanban |
| Campaigns | `getCampaigns({project_id})` | Danh sách chiến dịch thuộc dự án |

Tasks hiển thị grouped theo status (Backlog → To Do → In Progress → Review → Done).
Campaigns hiển thị dạng card với trạng thái và kênh.

---

## 5. Trang Chiến dịch (Campaigns)

**URL:** `/campaigns`

### Mục đích
Quản lý chiến dịch marketing — khai trương sản phẩm, theo mùa, mạng xã hội, SEO, quảng cáo.

### Thành phần

| Thành phần | File | Chức năng |
|------------|------|-----------|
| Toolbar | `campaigns-client.tsx` | Search, filter status, nút tạo |
| Stats row | `campaigns-client.tsx` | 4 thẻ: tổng, đang chạy, lên kế hoạch, hoàn thành |
| Campaign list | `campaign-list.tsx` | Grid 1/2/3 cột hoặc empty state |
| Campaign card | `campaign-card.tsx` | Hiển thị: tên, trạng thái, loại, ngày, ngân sách, kênh, tags |
| Campaign form | `campaign-form.tsx` | Dialog tạo/sửa chiến dịch |

### Các trường dữ liệu của Chiến dịch

| Trường | Bắt buộc | Mô tả |
|--------|---------|--------|
| `name` | ✅ | Tên chiến dịch |
| `description` | | Mô tả |
| `campaign_type` | | `product_launch` (khai trương), `seasonal` (theo mùa), `social_media`, `seo`, `advertising` |
| `status` | ✅ | `planning` (lên kế hoạch), `active` (đang chạy), `paused` (tạm dừng), `completed` (hoàn thành), `cancelled` (đã hủy) |
| `start_date` | | Ngày bắt đầu |
| `end_date` | | Ngày kết thúc |
| `budget` | | Ngân sách (VNĐ) |
| `channels` | | Mảng kênh: `Facebook`, `Google Ads`, `Email`, `TikTok`, `Zalo`, `YouTube` |

### Quy trình tạo chiến dịch

1. Nhấn **"Tạo chiến dịch"** → dialog
2. Chọn loại chiến dịch → xác định mục tiêu
3. Nhập ngày bắt đầu/kết thúc → lên kế hoạch timeline
4. Nhập ngân sách → theo dõi chi phí
5. Nhập kênh (phân cách bằng dấu phẩy) → xác định nền tảng triển khai
6. Submit → chiến dịch xuất hiện trong danh sách

> **Lưu ý:** Chiến dịch có thể thuộc một Dự án (`project_id`) hoặc đứng độc lập. Mỗi chiến dịch có `target_metrics` và `actual_metrics` để so sánh KPI thực tế với mục tiêu.

---

## 6. Trang Công việc (Tasks)

**URL:** `/tasks`

### Mục đích
Kanban board quản lý công việc toàn hệ thống, kéo thả chuyển trạng thái, tạo/sửa công việc.

### Thành phần

| Thành phần | File | Chức năng |
|------------|------|-----------|
| Stats row | `tasks-client.tsx` | 4 thẻ: tổng, đang làm, review, hoàn thành |
| Toolbar | `tasks-client.tsx` | Search, filter status, filter priority, toggle Kanban/Grid |
| Kanban board | `kanban-board.tsx` | 5 cột: Backlog, To Do, In Progress, Review, Done |
| Kanban card | `kanban-card.tsx` | Drag source, click → detail |
| Task form | `task-form.tsx` | Dialog tạo/sửa task |
| Overdue alert | `tasks-client.tsx` | Banner đỏ khi có công việc quá hạn |

### Trạng thái Kanban

| Status | Màu | Mô tả |
|--------|-----|--------|
| `backlog` | Xám | Chưa có trong sprint, chờ sắp xếp |
| `todo` | Xám | Đã xác nhận, chờ bắt đầu |
| `in_progress` | Xanh dương | Đang làm |
| `review` | Cam | Chờ review |
| `done` | Xanh lá | Hoàn thành |
| `cancelled` | Đỏ | Đã hủy |

### Trạng thái Media Stage (Kanban card hiển thị)

| Stage | Giai đoạn |
|-------|-----------|
| `idea` | Ý tưởng |
| `writing` | Viết nội dung |
| `review` | Duyệt nội dung |
| `filming` | Quay video |
| `editing` | Cắt/chỉnh sửa |
| `published` | Đã đăng |

### Quy trình kéo thả (Drag & Drop)

```
1. User bấm giữ task card → `onDragStart` → lưu task vào state
2. Kéo qua cột khác → highlight cột đích
3. Thả → `PUT /api/tasks/[id]` { status: newStatus }
   └── Trigger: INSERT pm_task_activities + INSERT pm_status_history
4. Toast: "Đã chuyển 'Tên task' sang [Trạng thái]"
   └── Nếu thất bại → rollback state + toast lỗi
```

### Quy trình tạo công việc

1. Nhấn **"Thêm công việc"** hoặc nhấn trong cột Backlog/To Do
2. Dialog TaskForm mở ra với:
   - Tiêu đề (bắt buộc)
   - Mô tả
   - Dự án (dropdown)
   - Chiến dịch (dropdown, phụ thuộc dự án)
   - Trạng thái mặc định: `todo` hoặc status của cột đã click
   - Độ ưu tiên: `low`, `medium`, `high`, `urgent`
   - Ngày bắt đầu / hạn chót
   - Tags
3. Submit → `POST /api/tasks`
   └── INSERT pm_task_activities (action: 'created')

---

## 7. Trang Media Workflow

**URL:** `/media-workflow`

### Mục đích
Quản lý pipeline sản xuất nội dung từ ý tưởng đến khi đăng bài. Mỗi nội dung (bài Facebook, video TikTok, bài SEO...) đi qua 6 giai đoạn.

### Pipeline 6 giai đoạn

```
[IDEA] → [WRITING] → [REVIEW] → [FILMING] → [EDITING] → [PUBLISHED]
  ↓         ↓           ↓           ↓           ↓            ↓
 Ý tưởng  Viết nội   Duyệt nội  Quay video  Cắt ghép    Đã đăng
           dung         dung                  chỉnh sửa
```

### Thành phần

| Thành phần | File | Chức năng |
|------------|------|-----------|
| Pipeline stage counts | `media-workflow-client.tsx` | 6 pill badges hiển thị số lượng mỗi stage |
| Toolbar | `media-workflow-client.tsx` | Search, filter platform, filter content type, toggle Pipeline/Grid |
| Workflow pipeline | `workflow-pipeline.tsx` | 6 cột pipeline có thể kéo thả |
| Workflow card | `workflow-card.tsx` | Platform color bar, type badge, AI badge, deadline, avatars |
| Status change | `media-workflow-client.tsx` | PUT khi chuyển cột |

### Các loại nội dung (Content Types)

| Type | Label | Ví dụ |
|------|-------|--------|
| `facebook_post` | Bài Facebook | Post khuyến mãi |
| `seo_article` | Bài SEO | Bài viết website |
| `video_script` | Kịch bản video | Script quảng cáo |
| `tiktok_video` | Video TikTok | Video ngắn xu hướng |
| `youtube_video` | Video YouTube | Review sản phẩm |
| `zalo_message` | Tin nhắn Zalo | CSKH tự động |
| `image_prompt` | Prompt hình ảnh | Prompt AI tạo ảnh |
| `product_photo` | Ảnh sản phẩm | Bộ ảnh chụp |
| `email_marketing` | Email Marketing | Newsletter |

### Các nền tảng (Platforms)

`Facebook` · `Website` · `TikTok` · `Zalo` · `YouTube` · `Instagram`

### AI Content Generation

Khi một workflow có `ai_generated_content`:
- Badge **AI** màu vàng hiển thị trên card
- Nội dung được lưu với metadata: `ai_prompt`, `ai_model_used`, `ai_generated_at`
- Có thể tạo gợi ý từ bảng `pm_ai_suggestions`

### Quy trình tạo nội dung

```
1. Nhấn tạo workflow (trong tương lai: nút "Tạo workflow")
2. Chọn dự án + chiến dịch (tùy chọn)
3. Chọn loại nội dung (content_type)
4. Chọn nền tảng (platform)
5. Nhập tiêu đề + mô tả
6. Submit → workflow tạo ở stage "idea"

7. Giai đoạn IDEA: viết/duyệt ý tưởng
8. Giai đoạn WRITING: viết nội dung (có thể dùng AI)
9. Giai đoạn REVIEW: duyệt nội dung
10. Giai đoạn FILMING: quay video/chụp ảnh
11. Giai đoạn EDITING: cắt ghép/chỉnh sửa
12. Giai đoạn PUBLISHED: nhập URL đã đăng, theo dõi engagement
```

---

## 8. Trang Thực tập sinh (Interns)

**URL:** `/interns`

### Mục đích
Quản lý hồ sơ thực tập sinh, theo dõi KPI, xếp hạng hiệu suất.

### Vị trí thực tập sinh

| Position | Label |
|----------|-------|
| `content_intern` | Content Intern |
| `video_intern` | Video Intern |
| `design_intern` | Design Intern |
| `marketing_intern` | Marketing Intern |

### Trạng thái thực tập sinh

`active` (đang hoạt động) · `inactive` (không hoạt động) · `graduated` (đã tốt nghiệp) · `resigned` (đã nghỉ)

### Trang chính (`/interns`)

| Thành phần | Mô tả |
|-----------|--------|
| Stats row | Tổng, Content, Video, Design |
| Top performers banner | 3 thực tập sinh xuất sắc nhất tuần (có emoji 🥇🥈🥉) |
| Tabs: Danh sách / Xếp hạng | Toggle grid intern cards vs bảng ranking |
| Filters | Search + lọc theo vị trí |

### Intern Card — thông tin hiển thị

- Avatar với màu theo tên
- Họ tên, trường đại học
- Vị trí (badge)
- Trạng thái
- Score circle (thang 100) với màu: xanh ≥85, vàng ≥70, đỏ <70
- Trend: Tăng ↑ / Giảm ↓ / Ổn định →
- KPI metrics: hoàn thành task, đúng hạn
- Skills (top 3)

### Trang Xếp hạng (`/interns/ranking`)

| Thành phần | Mô tả |
|-----------|--------|
| Tabs: Tuần / Tháng | Chuyển đổi kỳ xếp hạng |
| Bảng ranking | 8 cột: #, Tên, Vị trí, Hoàn thành, Đúng hạn, Chất lượng, Tổng điểm, Xu hướng |
| Stars | 5 sao chất lượng (tính bằng quality_score/20) |
| Progress bars | % hoàn thành và % đúng hạn |
| Background | Hàng top 3 có nền vàng |

### KPI Metrics

| Metric | Mô tả |
|--------|--------|
| `completion_rate` | % công việc hoàn thành |
| `deadline_accuracy` | % đúng hạn |
| `quality_score` | Điểm chất lượng 1-5 |
| `tasks_completed / tasks_assigned` | Tỷ lệ hoàn thành |
| `revision_count` | Số lần sửa lại |
| `content_created / content_published` | Nội dung đã tạo / đã đăng |
| `avg_engagement` | Engagement trung bình (like, share, comment) |

### Scoring System

```
overall_score = (productivity_score × 0.3) + (quality_score × 0.4) + (deadline_score × 0.3)

trend:
  - "up"   → điểm tăng so với kỳ trước
  - "down" → điểm giảm
  - "stable" → không đổi
```

---

## 9. Trang Lịch làm việc (Calendar)

**URL:** `/workspace/calendar`

### Mục đích
Xem toàn bộ công việc có hạn chót theo lịch tháng.

### Thành phần

| Thành phần | File | Chức năng |
|------------|------|-----------|
| Month navigator | `calendar-view.tsx` | Prev/Next month, nút "Hôm nay" |
| Calendar grid | `calendar-view.tsx` | 7 cột (CN→T7), các ngày trong tháng |
| Task pills | `calendar-view.tsx` | Task cards nhỏ màu theo priority |

### Cách hoạt động

1. Fetch tasks từ `/api/tasks` (client-side, `useEffect`)
2. Group tasks theo ngày `due_date`
3. Hiển thị task pills màu theo priority
4. Click task → `router.push(/tasks/${task.id})`
5. Ngày hôm nay có viền đỏ mờ

### Task pills màu theo priority

| Priority | Màu nền | Màu chữ |
|----------|---------|---------|
| `low` | Xanh lá nhạt | Xanh lá |
| `medium` | Cam nhạt | Cam |
| `high` | Đỏ nhạt | Đỏ |
| `urgent` | Đỏ đậm nhạt | Đỏ đậm |

---

## 10. Trang Hoạt động (Activity)

**URL:** `/workspace/activity`

### Mục đích
Nhật ký hành động của toàn bộ team — ai đã làm gì, lúc nào.

### Nguồn dữ liệu

Query trực tiếp bảng `pm_task_activities`, LIMIT 100, sắp xếp `created_at DESC`.

### Các loại action

| Action | Label hiển thị |
|--------|----------------|
| `created` | đã tạo |
| `updated` | đã cập nhật |
| `status_changed` | đã chuyển trạng thái |
| `assigned` | đã giao |
| `commented` | đã bình luận |
| `attached` | đã đính kèm |

### Hiển thị

```
[Avatar] [Tên người] [action]
           [→ new status] (nếu status_changed)
           [thời gian]
```

---

## 11. Quy trình thao tác chi tiết

### Quy trình 1: Tạo dự án Summer Sale

```
1. Vào /projects → nhấn "Tạo dự án"
2. Điền:
   - Tên: "Summer Sale 2026"
   - Mô tả: "Chiến dịch khuyến mãi mùa hè cho laptop gaming"
   - Trạng thái: "Đang hoạt động"
   - Độ ưu tiên: "Cao"
   - Màu: đỏ (#E60012)
   - Ngày: 01/06/2026 → 30/06/2026
   - Ngân sách: 50,000,000 VNĐ
   - Tags: ["summer", "laptop", "gaming"]
3. Submit → dự án xuất hiện trong danh sách
4. Click card → vào chi tiết dự án
```

### Quy trình 2: Tạo chiến dịch trong dự án

```
1. Từ trang dự án /projects/[id], tab "Chiến dịch"
2. Nhấn "Tạo chiến dịch" (tương lai: sẽ có nút trên UI)
   Hoặc: vào /campaigns trực tiếp
3. Điền:
   - Tên: "FB & TikTok Summer Sale"
   - Loại: "Khai trương sản phẩm"
   - Trạng thái: "Đang chạy"
   - Kênh: "Facebook, TikTok"
   - Ngân sách: 10,000,000 VNĐ
4. Submit → chiến dịch xuất hiện
```

### Quy trình 3: Giao việc cho thực tập sinh

```
1. Vào /tasks
2. Nhấn "Thêm công việc"
3. Điền:
   - Tiêu đề: "Viết 5 bài Facebook post Summer Sale"
   - Dự án: chọn "Summer Sale 2026"
   - Chiến dịch: chọn "FB & TikTok Summer Sale"
   - Độ ưu tiên: "Cao"
   - Hạn chót: 10/06/2026
4. Submit → task xuất hiện ở cột "To Do"
5. Kéo thả sang "In Progress" khi thực tập sinh bắt đầu
6. Kéo sang "Review" khi nộp cho lead duyệt
7. Kéo sang "Done" khi lead duyệt xong
```

### Quy trình 4: Quản lý nội dung media

```
1. Vào /media-workflow
2. Nhấn "Tạo workflow" (tương lai)
3. Điền:
   - Dự án: "Summer Sale 2026"
   - Chiến dịch: "FB & TikTok Summer Sale"
   - Loại nội dung: "Video TikTok"
   - Nền tảng: "TikTok"
   - Tiêu đề: "Mở hộp laptop gaming giảm 30%"
4. Submit → workflow ở cột "Idea"
5. Viết ý tưởng → kéo sang "Writing"
6. Viết kịch bản → kéo sang "Review"
7. Lead duyệt → kéo sang "Filming"
8. Quay xong → kéo sang "Editing"
9. Edit xong → kéo sang "Published"
10. Nhập published_url = link TikTok đã đăng
```

### Quy trình 5: Theo dõi KPI thực tập sinh

```
1. Vào /interns
2. Tab "Xếp hạng" → xem toàn bộ ranking
3. Click intern card → trang chi tiết (tương lai)
4. KPI metrics được tổng hợp từ:
   - Số công việc hoàn thành / tổng (completion_rate)
   - Số đúng hạn / tổng (deadline_accuracy)
   - Đánh giá chất lượng (quality_score 1-5)
5. Xếp hạng tự động tính theo overall_score
6. Trend hiển thị: tăng/giảm so với kỳ trước
```

---

## Các lưu ý quan trọng

1. **Task có thể thuộc Dự án + Chiến dịch** — cho phép lọc đa chiều
2. **Media Workflow độc lập với Tasks** — cùng nội dung nhưng workflow theo dõi pipeline sản xuất, task theo dõi công việc cụ thể
3. **Thực tập sinh không bắt buộc thuộc dự án** — có thể giao việc qua Tasks
4. **Auto-audit**: mọi thay đổi trạng thái task đều được ghi vào `pm_task_activities` và `pm_status_history`
5. **Kanban drag-drop**: không dùng thư viện bên ngoài, tự implement bằng HTML5 Drag & Drop API
6. **Tất cả trang đều dùng `dynamic = "force-dynamic"`** — không cache, luôn fetch fresh data

---

## Troubleshooting thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|------|------------|------------|
| `/campaigns` → 404 | Trang chưa tạo | Đã fix: tạo page + API route + components |
| Calendar crash | Server Component truyền function props | Đã fix: chuyển page thành Client Component |
| Interns crash `toFixed()` | `overall_score` từ DB là string | Đã fix: dùng `Number()` |
| Server Action 404 | Hot-reload chưa complete | Refresh trang |
| Lỗi 500 trên workspace | Lỗi cũ, đã tự fix | Refresh trang |
