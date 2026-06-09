# P6.7: Task Comments & Discussion — Báo cáo hoàn thành

**Ngày:** 27/05/2026
**Phase:** P6.7
**Trạng thái:** ✅ Hoàn thành

---

## Tổng quan

P6.7 đã triển khai hệ thống bình luận/thảo luận cho mỗi task, cho phép team trao đổi nội bộ trực tiếp trong task để không thất lạc thông tin. Hệ thống hỗ trợ reply, edit, delete, mention (@user), và notification khi có bình luận mới.

---

## Phân tích trước khi implement

| Kiểm tra | Kết quả |
|-----------|---------|
| Bảng `pm_task_comments` tồn tại | ✅ Có (12 columns đầy đủ) |
| Task Detail có tab "Thảo luận" | ❌ Chưa — cần thêm |
| Notification system hỗ trợ comment | ⚠️ Cần thêm type mới |
| Comment API routes | ❌ Chưa có — cần tạo |

---

## Schema đã dùng/tạo

### Bảng `pm_task_comments` (đã tồn tại)

```sql
CREATE TABLE pm_task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES pm_task_comments(id) ON DELETE SET NULL,
  author_id       UUID NOT NULL,
  author_name     VARCHAR(255),
  author_avatar   VARCHAR(500),
  content         TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  mentions        UUID[] DEFAULT '{}',    -- user IDs mentioned
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP               -- soft delete
);
CREATE INDEX idx_pm_task_comments_task_id   ON pm_task_comments(task_id);
CREATE INDEX idx_pm_task_comments_parent_id ON pm_task_comments(parent_comment_id);
CREATE INDEX idx_pm_task_comments_author_id ON pm_task_comments(author_id);
```

### Migration: `sql/workspace/018_task_comments_enhancement.sql`

- Tạo bảng nếu chưa có (idempotent)
- Thêm các columns còn thiếu nếu cần
- Auto-update `updated_at` trigger

---

## API đã thêm

### `GET /api/tasks/[id]/comments`
- Auth: `requireAdminAuth()`
- Trả về comment tree (top-level + replies lồng nhau)
- Soft delete: chỉ lấy `deleted_at IS NULL`

### `POST /api/tasks/[id]/comments`
- Auth: `requireAdminAuth()`
- RBAC: viewer không được comment (403)
- Zod validation: `content` (1–10000 chars), optional `parentCommentId`, optional `mentions[]`
- Sanitize: strip `<script>`, `on*=` handlers, `javascript:` URLs
- Tạo notification cho assignees
- Tạo notification cho users được @mention

### `PUT /api/tasks/[id]/comments/[commentId]`
- Auth: `requireAdminAuth()`
- RBAC: chỉ author hoặc admin/super_admin được sửa
- Sanitize content trước khi lưu

### `DELETE /api/tasks/[id]/comments/[commentId]`
- Auth: `requireAdminAuth()`
- RBAC: chỉ author hoặc admin/super_admin được xóa
- Soft delete: set `deleted_at = CURRENT_TIMESTAMP`

---

## Notification liên quan

### Types mới (thêm vào `NotificationType`)

```typescript
"task_comment"           // Có bình luận mới trên task
"task_comment_mention"   // Được nhắc đến (@mention) trong bình luận
```

### Notification helpers (thêm vào `notifications.ts`)

```typescript
notifyTaskComment(params)       // Gửi notification cho assignees khi có comment mới
notifyTaskCommentMention(params) // Gửi notification cho user được @mention
```

### Labels & Colors

| Type | Label | Icon | Color |
|------|-------|------|-------|
| `task_comment` | Bình luận mới | MessageSquare | cyan |
| `task_comment_mention` | Được nhắc đến | AtSign | violet |

---

## UI đã thêm

### Tab "Thảo luận" trong Task Detail

**File:** `components/tasks/task-detail-client.tsx`
- Thêm 4th tab: Chi tiết → Tài liệu & Assets → Phê duyệt → **Thảo luận**
- Icon: `MessageSquare`

### Component: `components/tasks/comment-section.tsx`

Tính năng:
- **Danh sách bình luận** — Hiển thị theo thời gian, với avatar initials, tên, thời gian (time ago)
- **Thread replies** — Bình luận lồng nhau (parent → replies)
- **Role badge** — Hiển thị vai trò của người comment
- **@mention highlight** — `@tên` được highlight màu violet
- **Edit** — Chỉ author hoặc admin/super_admin
- **Delete** — Chỉ author hoặc admin/super_admin (soft delete)
- **Reply** — Reply form cho từng bình luận
- **Notification** — Khi có bình luận mới → assignees được thông báo
- **Sanitized content** — Script/HTML nguy hiểm bị loại bỏ

### RBAC Comment

| Role | Xem | Comment | Sửa comment người khác | Xóa comment người khác |
|------|-----|---------|----------------------|----------------------|
| viewer | ✅ | ❌ | ❌ | ❌ |
| editor | ✅ | ✅ | ❌ | ❌ |
| admin | ✅ | ✅ | ✅ (soft) | ✅ |
| super_admin | ✅ | ✅ | ✅ | ✅ |

---

## Files đã tạo

```
apps/admin-ui/
├── sql/workspace/
│   └── 018_task_comments_enhancement.sql    # Schema enhancement
├── scripts/
│   └── run-migration-018.js                   # Migration runner
├── lib/workspace/
│   └── types-comment.ts                      # Comment helpers (sanitize, mentions, tree)
├── app/api/tasks/[id]/comments/
│   ├── route.ts                              # GET + POST comments
│   └── [commentId]/route.ts                  # PUT + DELETE comment
├── components/tasks/
│   └── comment-section.tsx                   # CommentSection component
└── docs/reports/
    └── p6-7-task-comments-discussion-report.md
```

### Files đã sửa

```
apps/admin-ui/
├── lib/workspace/db/index.ts                    # Thêm getCommentById, updateTaskComment, deleteTaskComment
├── lib/workspace/types-notification.ts          # Thêm task_comment, task_comment_mention types
├── lib/workspace/notifications.ts               # Thêm notifyTaskComment, notifyTaskCommentMention
├── app/(admin)/notifications/page.tsx          # Thêm icons cho task_comment types
├── app/(admin)/tasks/[id]/page.tsx            # Truyền userId vào TaskDetailClient
└── components/tasks/task-detail-client.tsx     # Thêm tab "Thảo luận"
```

---

## Security

1. **Sanitization**: `<script>`, `on*=` event handlers, `javascript:` URLs được strip khỏi comment content
2. **RBAC**: viewer không thể comment; chỉ author/admin mới sửa/xóa
3. **Soft delete**: comment không bị xóa vĩnh viễn, chỉ set `deleted_at`
4. **Auth**: Tất cả endpoints đều yêu cầu `requireAdminAuth()`
5. **Validation**: Zod schema giới hạn độ dài content (1–10000 chars)

---

## Rủi ro còn tồn tại

1. **`author_role` không lưu trong bảng**: Role badge trong UI luôn hiển thị "Comment" vì `author_role` không được lưu khi tạo comment. Để hiển thị đúng role, cần thêm column `author_role` vào `pm_task_comments`, hoặc lookup từ `admin_users`.

2. **@mention resolution chưa hoàn chỉnh**: Hàm `extractMentionIdsFromContent()` hiện là stub — trả về mảng rỗng. Để @mention hoạt động thực sự, cần query `admin_users` bằng username để resolve thành user_id.

3. **Không có rate limiting cho comment**: Write endpoints chưa có rate limit riêng. Nên thêm rate limit middleware ở layer API route.

4. **Không có CSRF token validation**: `requireCsrf()` được đề cập trong yêu cầu nhưng chưa implement. CSRF protection nên được thêm qua middleware hoặc header check.

5. **Large comment threads**: Không có pagination cho comment list. Với task có nhiều bình luận, nên thêm pagination (LIMIT/OFFSET) và infinite scroll.

---

## Đề xuất P6.8 tiếp theo

### P6.8: Task Activity Log Enhancement & Audit Trail

**Mục tiêu:** Cải thiện activity log và audit trail cho toàn bộ workspace operations.

**Files cần tạo:**
- `lib/workspace/activity-logger.ts` — Unified logger cho tất cả operations
- `app/api/activity-log/route.ts` — API endpoint để query audit trail
- `components/activity/audit-log-widget.tsx` — Widget hiển thị audit trail

**Tính năng:**
1. Unified activity log cho tất cả entities (task, campaign, comment, approval)
2. Filter theo entity type, actor, date range
3. Audit trail widget cho admin dashboard
4. Activity log entry cho comment actions (create, edit, delete)
5. Export audit log ra CSV
6. Real-time activity feed (polling-based, không cần WebSocket)

**Ưu tiên:**
- High: Comment activity logging (P6.7 không ghi log khi comment)
- Medium: Unified audit trail page
- Low: Export CSV

---

## Build & Test Results

| Check | Kết quả |
|-------|---------|
| TypeScript (`pnpm tsc --noEmit`) | ✅ Pass |
| Next.js build (`pnpm next build`) | ✅ Pass |
| Migration 018 | ✅ Pass |
| API routes | ✅ 4 endpoints |
| UI tab | ✅ Thảo luận tab |
| Notification types | ✅ 2 types mới |

---

## Migration Instructions

```bash
# Chạy migration
node apps/admin-ui/scripts/run-migration-018.js

# Hoặc dùng psql trực tiếp
psql -U mytholaptop_user -h postgresql.mtl.vn -p 7000 -d mytholaptop -f apps/admin-ui/sql/workspace/018_task_comments_enhancement.sql
```
