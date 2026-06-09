# P6.7.1: Task Comments Security & Mention Patch — Báo cáo hoàn thành

**Ngày:** 27/05/2026
**Phase:** P6.7.1
**Trạng thái:** ✅ Hoàn thành

---

## Tổng quan

P6.7.1 fix toàn bộ rủi ro còn lại từ P6.7:
- CSRF protection cho tất cả comment write APIs
- Rate limit riêng cho comment (30 req/phút/user)
- @mention resolution thực sự hoạt động
- Role badge hiển thị đúng từ database
- Activity log cho comment actions

---

## CSRF Protection

### Routes đã áp dụng

| Method | Endpoint | requireCsrf() |
|--------|----------|--------------|
| POST | `/api/tasks/[id]/comments` | ✅ |
| PUT | `/api/tasks/[id]/comments/[commentId]` | ✅ |
| DELETE | `/api/tasks/[id]/comments/[commentId]` | ✅ |

### Mechanism
- `requireCsrf()` sử dụng Double-Submit Cookie Pattern
- Browser tự động gửi `X-CSRF-Token` header qua `adminFetch` cho POST/PUT/PATCH/DELETE
- Server validate: header token phải khớp với `csrf_token` cookie
- Timing-safe comparison ngăn timing attacks
- Return 403 nếu fail

### Client fix
- `CommentSection` component đổi từ `fetch` sang `adminFetch` để đảm bảo CSRF token được gửi

---

## Rate Limit

### Config riêng cho Comment

```typescript
const COMMENT_RATE_LIMIT = {
  maxAttempts: 30,        // 30 requests
  windowMs: 60 * 1000,    // mỗi phút
  lockDurationMs: 60 * 1000, // khóa 1 phút khi vượt limit
};
```

### Routes bị giới hạn

| Method | Endpoint | Rate Limit |
|--------|----------|-----------|
| POST | `/api/tasks/[id]/comments` | 30/min/user |
| PUT | `/api/tasks/[id]/comments/[commentId]` | 30/min/user |
| DELETE | `/api/tasks/[id]/comments/[commentId]` | 30/min/user |

### Response khi vượt limit
```json
HTTP 429
{
  "error": "Quá nhiều yêu cầu",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.",
  "retryAfterMs": 60000
}
```

---

## @Mention Resolution

### Cách hoạt động

**Supported formats:**
- `@Nguyen Van A` — quoted full name: `@"Nguyen Van A"`
- `@user@example.com` — email format
- `@username` — simple username (case-insensitive match via LIKE)

**Algorithm (`resolveMentions`):**
1. Extract `@"full name"` patterns → add to name search terms
2. Extract `@email@domain.com` patterns → exact email match
3. Run single SQL query against `admin_users` table
4. Filter: loại bỏ chính người comment (không tự notify mình)
5. Deduplicate

```sql
-- Example: resolve @Nguyen Van A and @user@example.com
SELECT id FROM admin_users
WHERE status = 'active'
  AND (LOWER(full_name) LIKE '%nguyen van a%'
    OR LOWER(email) = 'user@example.com')
```

### Notification flow
1. Author tạo comment với `@user@example.com`
2. Server resolve email → user_id
3. `notifyTaskCommentMention()` gửi notification đến user đó
4. Deduplication key: `task_comment_mention:{taskId}:{authorId}`

---

## Author Role Display

### Before (P6.7)
- Role badge luôn hiển thị "Comment" vì `author_role` không có trong DB row

### After (P6.7.1)
- `getTaskCommentsWithRoles()` JOIN với `admin_users` để lấy role
- UI hiển thị đúng: Admin / Quản trị / Editor / Viewer

### SQL
```sql
SELECT c.*, COALESCE(u.role, 'viewer') AS author_role
FROM pm_task_comments c
LEFT JOIN admin_users u ON c.author_id = u.id
WHERE c.task_id = $1 AND c.deleted_at IS NULL
ORDER BY c.created_at ASC
```

---

## Activity Log

### Actions ghi log

| Action | Khi nào |
|--------|----------|
| `comment_created` | Tạo bình luận mới |
| `comment_updated` | Sửa bình luận |
| `comment_deleted` | Xóa bình luận |

### Ghi vào bảng
`pm_task_activities` với `field_changed = 'comment'`

### Trường `new_value`
- `comment_created`: preview nội dung (max 200 ký tự)
- `comment_updated`: preview nội dung mới
- `comment_deleted`: `"comment deleted"`

---

## Files đã sửa

```
apps/admin-ui/
├── app/api/tasks/[id]/comments/
│   ├── route.ts                     # Thêm CSRF, rate limit, resolveMentions, activity log, getTaskCommentsWithRoles
│   └── [commentId]/route.ts        # Thêm CSRF, rate limit, activity log
├── components/tasks/
│   └── comment-section.tsx         # Đổi fetch → adminFetch, fix role badge
├── lib/workspace/
│   ├── db/index.ts                  # Thêm resolveMentions, getTaskCommentsWithRoles, logCommentActivity
│   └── types.ts                    # Thêm author_role vào TaskComment
```

---

## Test Cases đã cover

| # | Test | Expected |
|---|------|----------|
| 1 | POST comment không CSRF token | 403 Forbidden |
| 2 | POST comment > 30 lần trong 1 phút | 429 Too Many Requests |
| 3 | @mention email → notification đúng user | User nhận notification |
| 4 | @mention chính mình → không tự notify | Không notification |
| 5 | Role badge hiển thị đúng role | Admin → "Quản trị", Editor → "Editor" |
| 6 | Tạo comment → activity log `comment_created` | Có trong pm_task_activities |
| 7 | Sửa comment → activity log `comment_updated` | Có trong pm_task_activities |
| 8 | Xóa comment → activity log `comment_deleted` | Có trong pm_task_activities |
| 9 | TypeScript | ✅ Pass |
| 10 | Next.js build | ✅ Pass |

---

## Rủi ro còn lại

1. **@mention simple username**: Format `@username` (không có quotes) dùng LIKE match, có thể match nhầm users có tên gần giống. Acceptable trade-off cho MVP.

2. **Rate limit không per-IP fallback khi không có session**: Nếu user chưa đăng nhập gửi request, rate limit dùng IP. Nếu nhiều users share same IP, có thể affect lẫn nhau. Acceptable cho internal tool.

3. **Activity log không ghi cho reply comment**: Hiện tại activity log ghi cho tất cả comments (kể cả reply). Có thể muốn chỉ ghi top-level comments. Chưa làm vì mục đích audit trail vẫn cần.

4. **CSRF cookie không có HttpOnly**: Đây là design đúng của Double-Submit Cookie Pattern — CSRF cookie phải readable by JS để đọc và gửi qua header. Security đến từ việc attacker không thể đọc cookie do SOP + httpOnly session cookie.

---

## Điều kiện chuyển sang P6.8

| Tiêu chí | Trạng thái | Ghi chú |
|----------|-----------|---------|
| CSRF protection | ✅ Pass | requireCsrf() ở tất cả write endpoints |
| Rate limit | ✅ Pass | 30/min/user riêng cho comments |
| @mention hoạt động | ✅ Pass | Email + quoted name + username |
| Notification mention | ✅ Pass | notifyTaskCommentMention gửi đúng user |
| Role badge đúng | ✅ Pass | JOIN admin_users.role |
| Activity log comment | ✅ Pass | created/updated/deleted |
| TypeScript pass | ✅ Pass | 0 errors |
| Next.js build pass | ✅ Pass | Compiled |
| Không có external social analytics | ✅ N/A | Không thuộc phạm vi P6.8 |
| Không có realtime chat | ✅ N/A | Không thuộc phạm vi P6.8 |

**Đủ điều kiện chuyển sang P6.8** ✅

---

## Đề xuất P6.8

**P6.8: Task Activity Log Enhancement & Audit Trail**
- Unified activity log cho tất cả entities
- Audit trail page với filters
- Export CSV
- Real-time activity feed (polling-based)
