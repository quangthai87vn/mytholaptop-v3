# P5.2 — Báo cáo Zod Validation cho Workspace API

**Ngày hoàn thành:** 26/05/2026
**Trạng thái:** Hoàn thành ✅

---

## 1. File đã tạo

### `lib/workspace/validation.ts`
Schema validation dùng chung cho toàn bộ Workspace API. Sử dụng **Zod v4**.

**Schema đã thêm:**

| Schema | Mô tả | Enum/Field validated |
|--------|--------|---------------------|
| `createTaskSchema` | Tạo task mới | title, status, priority, workflow_stage, task_type, platform, project_id, campaign_id, assignee_ids, start_date, due_date, progress (0-100), tags, attachments, dependencies, metadata |
| `updateTaskSchema` | Cập nhật task | Tất cả fields trên đều optional |
| `createCampaignSchema` | Tạo chiến dịch | name, status, campaign_type, project_id, start_date, end_date, budget, channels, tags |
| `updateCampaignSchema` | Cập nhật chiến dịch | Tất cả fields trên đều optional |
| `createProjectSchema` | Tạo dự án | name, status, priority, color (hex), project_id, owner_id, team_ids, budget, tags |
| `updateProjectSchema` | Cập nhật dự án | Tất cả fields trên đều optional |
| `createInternSchema` | Tạo intern | full_name, position, start_date, email, phone, year_of_study, status, skills |
| `updateInternSchema` | Cập nhật intern | Tất cả fields trên đều optional |

**Validation rules áp dụng:**
- `title/name`: non-empty string, max 255-500 ký tự
- `status`: chỉ enum hợp lệ
- `priority`: chỉ enum hợp lệ
- `workflow_stage/task_type/platform`: chỉ enum hợp lệ
- `due_date/start_date/end_date`: ISO 8601 datetime format
- `progress`: 0-100
- `assignee_ids/team_ids/dependencies`: mảng UUID
- `project_id/campaign_id/parent_task_id/reporter_id/owner_id/mentor_id`: UUID hoặc empty
- `budget/estimated_hours/actual_hours`: số không âm, giới hạn max
- `attachments`: mảng object với name, url, size, type
- `tags/skills/channels`: mảng string
- `metadata/target_metrics/actual_metrics`: Record<string, unknown/number>

---

## 2. File đã sửa

### API Routes — POST handlers (thêm validation)

| File | Route | Method |
|------|-------|--------|
| `app/api/tasks/route.ts` | `/api/tasks` | POST |
| `app/api/tasks/[id]/route.ts` | `/api/tasks/[id]` | PUT |
| `app/api/campaigns/route.ts` | `/api/campaigns` | POST |
| `app/api/campaigns/[id]/route.ts` | `/api/campaigns/[id]` | PUT |
| `app/api/projects/route.ts` | `/api/projects` | POST |
| `app/api/projects/[id]/route.ts` | `/api/projects/[id]` | PUT |
| `app/api/interns/route.ts` | `/api/interns` | POST |

### Package mới
- Đã cài `zod@^4.4.3` vào `apps/admin-ui`

---

## 3. API đã validate

### Đã thêm Zod validation:
- ✅ `POST /api/tasks` — Tạo task mới
- ✅ `PUT /api/tasks/[id]` — Cập nhật task
- ✅ `POST /api/campaigns` — Tạo chiến dịch
- ✅ `PUT /api/campaigns/[id]` — Cập nhật chiến dịch
- ✅ `POST /api/projects` — Tạo dự án
- ✅ `PUT /api/projects/[id]` — Cập nhật dự án
- ✅ `POST /api/interns` — Tạo intern

### Giữ nguyên (không validate — chỉ đọc):
- `GET /api/tasks`
- `GET /api/tasks/[id]`
- `DELETE /api/tasks/[id]`
- `GET /api/campaigns`
- `GET /api/campaigns/[id]`
- `DELETE /api/campaigns/[id]`
- `GET /api/projects`
- `GET /api/projects/[id]`
- `DELETE /api/projects/[id]`
- `GET /api/interns`
- `GET /api/interns/[id]`
- `GET /api/campaign-types`

---

## 4. Response khi Validation Fail

Khi request body không hợp lệ, API trả về **HTTP 400** với format:

```json
{
  "error": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "message": "Có 2 lỗi validation",
  "details": [
    { "field": "title", "message": "Tiêu đề không được để trống" },
    { "field": "progress", "message": "Progress không được lớn hơn 100" }
  ]
}
```

---

## 5. Ví dụ Request

### Request hợp lệ — Tạo Task

```http
POST /api/tasks
Content-Type: application/json
Cookie: admin_session=...

{
  "title": "Viết bài Facebook cho sản phẩm laptop gaming",
  "description": "Bài viết giới thiệu dòng laptop MSI Gaming",
  "status": "todo",
  "priority": "high",
  "task_type": "facebook_post",
  "platform": "facebook",
  "assignee_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "due_date": "2026-06-01T00:00:00.000Z",
  "progress": 0,
  "tags": ["laptop", "gaming", "facebook"]
}
```
→ **HTTP 201** — Task được tạo thành công

### Request không hợp lệ — Thiếu title

```http
POST /api/tasks
Content-Type: application/json

{
  "status": "todo",
  "priority": "high"
}
```
→ **HTTP 400**
```json
{
  "error": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "message": "Tiêu đề không được để trống",
  "details": [{ "field": "title", "message": "Tiêu đề không được để trống" }]
}
```

### Request không hợp lệ — Progress > 100

```http
PUT /api/tasks/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "progress": 150
}
```
→ **HTTP 400**
```json
{
  "error": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "message": "Progress không được lớn hơn 100",
  "details": [{ "field": "progress", "message": "Progress không được lớn hơn 100" }]
}
```

### Request không hợp lệ — Status sai enum

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "Test task",
  "status": "invalid_status",
  "priority": "medium"
}
```
→ **HTTP 400**
```json
{
  "error": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "message": "Status không hợp lệ",
  "details": [{ "field": "status", "message": "Status không hợp lệ" }]
}
```

### Request không hợp lệ — Campaign thiếu name

```http
POST /api/campaigns
Content-Type: application/json

{
  "status": "active"
}
```
→ **HTTP 400**
```json
{
  "error": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "message": "Tên chiến dịch không được để trống",
  "details": [{ "field": "name", "message": "Tên chiến dịch không được để trống" }]
}
```

### Request hợp lệ — Tạo Campaign

```http
POST /api/campaigns
Content-Type: application/json

{
  "name": "Chiến dịch Summer Sale 2026",
  "status": "planning",
  "campaign_type": "seasonal",
  "start_date": "2026-06-01T00:00:00.000Z",
  "end_date": "2026-08-31T00:00:00.000Z",
  "budget": 50000000,
  "channels": ["facebook", "tiktok"]
}
```
→ **HTTP 201**

---

## 6. Cách Test

### Test bằng cURL

```bash
# Test tạo task hợp lệ
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<token>" \
  -d '{"title":"Test","status":"todo","priority":"medium"}'

# Test thiếu title
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<token>" \
  -d '{"status":"todo","priority":"medium"}'

# Test progress > 100
curl -X PUT http://localhost:3000/api/tasks/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<token>" \
  -d '{"progress":150}'

# Test status sai enum
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<token>" \
  -d '{"title":"Test","status":"invalid","priority":"medium"}'
```

### Test bằng browser DevTools

1. Mở DevTools → Network tab
2. Đăng nhập admin
3. Thực hiện các thao tác tạo/sửa task, campaign, project
4. Kiểm tra request body và response:
   - ✅ Hợp lệ → HTTP 201/200, không có lỗi validation
   - ❌ Không hợp lệ → HTTP 400, có `code: "VALIDATION_ERROR"`

### Test bằng script

```bash
node -e "
const tests = [
  // Hợp lệ
  { title: 'Valid task', status: 'todo', priority: 'medium' },
  // Thiếu title
  { status: 'todo', priority: 'medium' },
  // Progress > 100
  { title: 'Test', status: 'todo', priority: 'medium', progress: 150 },
  // Status sai enum
  { title: 'Test', status: 'invalid_status', priority: 'medium' },
];

for (const body of tests) {
  fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()).then(d => console.log(d.code || d.error, '->', d.message));
}
"
```

---

## 7. Rủi ro còn lại

1. **`/api/interns/[id]`** không có PUT handler — intern update chưa được implement. Nếu cần, thêm `updateIntern` vào `lib/workspace/db` và tạo route handler với `updateInternSchema`.

2. **DELETE handlers** không validate ID parameter (UUID format) — nếu client gửi ID không hợp lệ, database sẽ báo lỗi tự nhiên. Có thể thêm UUID validation cho `id` param nếu cần.

3. **Foreign key validation** — validation không kiểm tra `project_id`, `campaign_id`, `assignee_ids` có tồn tại trong database hay không. Có thể thêm bước verify tồn tại nếu cần strict integrity.

4. **Data cũ** — validation chỉ áp dụng cho POST/PUT mới, không affect dữ liệu đang có trong database.

5. **Zod v4** — sử dụng Zod v4 mới nhất (breaking changes so với v3). Nếu có vấn đề với type inference, kiểm tra lại Zod docs.

---

## 8. Build Test

```bash
pnpm --filter admin-ui exec tsc --noEmit
```
→ **Pass** ✅ (TypeScript compile không có lỗi)

---

## 9. Điều kiện sang P5.3

### Checklist:
- [x] File schema validation tập trung tại `lib/workspace/validation.ts`
- [x] Tất cả POST routes đã validate
- [x] Tất cả PUT routes đã validate
- [x] HTTP 400 với message tiếng Việt khi fail
- [x] Danh sách field lỗi trong response
- [x] GET/DELETE giữ nguyên (không over-validate)
- [x] TypeScript pass
- [x] Báo cáo đã tạo

### Khuyến nghị cho P5.3:
- Thêm input sanitization (strip HTML tags khỏi text fields)
- Thêm rate limit cho workspace API (các route ghi dữ liệu)
- Validate foreign keys (project_id, campaign_id tồn tại)
- Implement `PUT /api/interns/[id]` nếu cần update intern
- Xử lý WooCommerce credentials (còn exposed trong URL query params)

**Có đủ điều kiện để chuyển sang P5.3** ✅
