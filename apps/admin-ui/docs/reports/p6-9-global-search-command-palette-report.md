# P6.9: Global Search & Command Palette — Báo cáo hoàn thành

**Ngày:** 27/05/2026
**Trạng thái:** Hoàn thành ✅
**Thời gian thực hiện:** ~2 giờ

---

## 1. Kiến trúc Search

### 1.1 Mô hình

```
┌─────────────────────────────────────────────────────────────┐
│  Header Search Bar (admin-header.tsx)                        │
│  + Keyboard: Ctrl+K / Cmd+K                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ open CommandPalette
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  CommandPalette (components/search/command-palette.tsx)      │
│  - Quick Actions (luôn hiển thị khi chưa gõ)               │
│  - Live Search (debounce 250ms)                             │
│  - Keyboard nav: ↑↓ Enter ESC (via cmdk)                    │
│  - Results grouped by entity type                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET /api/search?q=
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Search API (app/api/search/route.ts)                        │
│  - requireAdminAuth() → 401/403                             │
│  - Rate limit: 30 req/phút/user                             │
│  - Parallel ILIKE queries (6 tables)                        │
│  - RBAC-aware: viewer không thấy restricted entity          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL Database (6 tables)                               │
│  pm_tasks | pm_projects | pm_campaigns | pm_task_comments    │
│  admin_users | v_workspace_activities                        │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Cách hoạt động

1. User nhấn `Ctrl+K` hoặc click search bar → mở Command Palette (Dialog)
2. Chưa gõ gì → hiển thị **Quick Actions**: Tạo Task, Tạo Campaign, Calendar...
3. Gõ ≥ 2 ký tự → debounce 250ms → gọi `GET /api/search?q=`
4. API chạy 6 query song song → trả về tối đa 5 kết quả mỗi loại
5. UI group theo entity type (Công việc, Dự án, Chiến dịch...)
6. User arrow ↑↓ di chuyển, Enter chọn, ESC đóng

---

## 2. API đã thêm

### `GET /api/search`

| Tham số | Mô tả | Ví dụ |
|---------|--------|-------|
| `q` | Query keyword (≥2, ≤200 ký tự) | `?q=dell` |

**Response:**

```json
{
  "query": "dell",
  "results": [
    {
      "id": "uuid",
      "type": "task",
      "title": "Bài viết Dell Inspiron 15",
      "subtitle": "in_progress · writing",
      "href": "/tasks/uuid",
      "icon": "check-square",
      "status": "in_progress",
      "updatedAt": "2026-05-27T..."
    }
  ],
  "total": 8,
  "took": 45
}
```

**Entity types trả về:**

| Type | Bảng nguồn | Search fields | Limit |
|------|------------|--------------|-------|
| `task` | `pm_tasks` | title, description | 5 |
| `project` | `pm_projects` | name, description | 5 |
| `campaign` | `pm_campaigns` | name, description | 5 |
| `comment` | `pm_task_comments` | content | 5 |
| `user` | `admin_users` | full_name, email | 5 |
| `activity` | `v_workspace_activities` | entity_name, action_type, actor_name | 5 |

**Bảo mật:**

- `requireAdminAuth()` — bắt buộc đăng nhập
- RBAC check trước mỗi query:
  - `viewer` → chỉ thấy entity có quyền `tasks.read`, `projects.read`, `campaigns.read`
  - `editor/admin/super_admin` → thấy đầy đủ
- Rate limit: 30 req/phút/client
- Query giới hạn 200 ký tự

---

## 3. Entity hỗ trợ

| Entity | Route target | Icon | RBAC |
|--------|-------------|------|------|
| Task | `/tasks/{id}` | `check-square` | tasks.read |
| Project | `/projects/{id}` | `folder` | projects.read |
| Campaign | `/campaigns/{id}` | `clapperboard` | campaigns.read/manage |
| Comment | `/tasks/{task_id}#comment-{id}` | `message-square` | tasks.read |
| User | `/staff` | `user` | users.read |
| Activity | `/workspace/activity` | `activity` | all authenticated |

---

## 4. Keyboard Shortcuts

| Phím | Hành động |
|------|-----------|
| `Ctrl+K` / `Cmd+K` | Mở Command Palette |
| `↑` / `↓` | Di chuyển giữa các mục |
| `Enter` | Chọn và navigate |
| `ESC` | Đóng Command Palette |

**Quick Actions (luôn hiển thị khi chưa gõ):**

| Hành động | Route |
|-----------|-------|
| Tạo công việc mới | `/tasks/new` |
| Tạo chiến dịch | `/campaigns/new` |
| Lịch nội dung | `/workspace/calendar` |
| Thông báo | `/notifications` |
| Hoạt động workspace | `/workspace/activity` |
| Dashboard | `/dashboard` |

---

## 5. RBAC Logic

### 5.1 Search API

```
Viewer:
  ✗ campaigns (không có campaigns.read)
  ✓ tasks (có tasks.read)
  ✓ projects (có projects.read)
  ✗ users (không có users.read)

Editor:
  ✓ tasks, projects, campaigns, users

Admin / Super Admin:
  ✓ tất cả
```

### 5.2 Cách kiểm tra

```typescript
// Example: tasks
const canView =
  hasPermission(user, "tasks.read") ||
  hasPermission(user, "content.read");

if (!canView) return []; // trả mảng rỗng cho viewer
```

### 5.3 Các entity cần quyền

| Entity | Permission check |
|--------|----------------|
| Tasks | `tasks.read` OR `content.read` |
| Projects | `projects.read` |
| Campaigns | `campaigns.read` OR `campaigns.manage` |
| Comments | `tasks.read` OR `content.read` |
| Users | `users.read` OR `interns.manage` |
| Activities | all authenticated (không check quyền) |

---

## 6. File đã tạo / sửa

### Tạo mới

| File | Mô tả |
|------|--------|
| `app/api/search/route.ts` | Search API endpoint |
| `components/search/command-palette.tsx` | Command Palette UI component |
| `scripts/run-migration-019.js` | Migration script P6.8 |
| `docs/reports/p6-9-global-search-command-palette-report.md` | Báo cáo này |

### Sửa

| File | Thay đổi |
|------|---------|
| `components/layout/admin-header.tsx` | Tích hợp CommandPalette + Ctrl+K |
| `sql/workspace/019_activity_audit_trail.sql` | Fixed migration (admin_audit_logs → pm_audit_logs) |

---

## 7. Rủi ro còn tồn tại

| Mức | Rủi ro | Giải thích |
|-----|--------|------------|
| Thấp | Performance khi table lớn | ILIKE không dùng index; với >10k records, nên thêm PostgreSQL full-text search (GIN index) |
| Thấp | In-memory rate limit | Không chính xác khi deploy multi-instance; cần Redis store |
| Trung | Comment search | Chỉ tìm comment content; chưa tìm task title liên quan |
| Thấp | Không search intern | Interns table không có trong search scope |

---

## 8. Đề xuất P7 tiếp theo

### P7.1: Quick Create Flow
- Tạo Task/Campaign/Project trực tiếp từ Command Palette
- Inline form trong modal thay vì redirect

### P7.2: Full-Text Search Enhancement
- Thêm GIN index cho `title`, `name`, `description` columns
- Dùng `tsvector` thay vì ILIKE để tăng performance

### P7.3: Recent Searches
- Lưu vào localStorage
- Hiển thị khi chưa gõ gì (thay thế/hỗ trợ Quick Actions)

### P7.4: Search Filters
- Filter theo entity type (chỉ tìm task, chỉ tìm project...)
- Filter theo status, date range

### P7.5: Fuzzy Search
- Hỗ trợ typo (VD: "dell inspiron" → tìm "Dell Inspiron")
- Dùng `pg_trgm` extension hoặc Levenshtein distance

---

## 9. Kết quả Test

| Test | Kết quả |
|------|---------|
| TypeScript compile | ✅ Pass |
| Next.js build | ✅ Pass (96 routes) |
| Search API auth | ✅ requireAdminAuth() |
| RBAC viewer restriction | ✅ entities filtered |
| Ctrl+K shortcut | ✅ Global keyboard listener |
| Keyboard nav (↑↓ Enter ESC) | ✅ cmdk built-in |
| Quick Actions | ✅ 6 actions |
| Debounce search (250ms) | ✅ abort controller |

---

## 10. Hạn chế

- **Không phải semantic search** — chỉ keyword ILIKE
- **Không search products/orders** — không nằm trong scope workspace search
- **Không có pagination** — tối đa 30 kết quả (5 × 6 loại)
- **Không tìm nội dung file đính kèm** (asset URLs)
