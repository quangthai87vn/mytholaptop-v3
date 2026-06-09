# Báo Cáo Xác Minh: MediaWorkflow → Task (Priority 1)

**Ngày kiểm tra:** 26/05/2026  
**Phạm vi:** Migration 007, 007b, 008 — MediaWorkflow Merge  
**Kết luận tổng quan:** ⚠️ **CHƯA SẠCH** — Migration chưa chạy, data còn nguyên, cần xử lý trước khi chuyển P2

---

## 1. Migration Scripts — Tồn Tại Nhưng CHƯA Chạy

### 1.1 Scripts đã tạo

| File | Loại | Mục đích | Trạng thái |
|------|------|----------|------------|
| `007_media_workflow_audit.sql` | Audit (chỉ SELECT) | Phân tích data trước migration | ✅ Tồn tại |
| `007b_media_workflow_post_audit.sql` | Audit (chỉ SELECT) | Xác minh sau migration | ✅ Tồn tại |
| `008_media_workflow_merge.sql` | Migration | Hợp nhất data | ✅ Tồn tại |

### 1.2 Cơ chế chạy migration hiện tại

**`run-migration.js`** — chỉ chạy 3 scripts:

```javascript
const needed = [
  "002_tasks.sql",
  "003_media_workflow.sql",
  "004_interns.sql",
];
```

→ **Không bao gồm** 007, 007b, 008.

**`POST /api/migration/init`** — chỉ tạo bảng migration (migration_runs, migration_items, migration_mappings, migration_logs, app_settings).

→ **Không chạy** migration scripts.

### 1.3 Kết luận Yêu cầu 1

> ❌ **Migration 007, 007b, 008 chưa được chạy trên database.**
>
> Scripts đã tạo đầy đủ nhưng chưa tích hợp vào pipeline chạy migration. Cần thực thi thủ công:
> ```bash
> psql -U postgres -d mytholaptop -f sql/workspace/008_media_workflow_merge.sql
> ```

---

## 2. Dữ Liệu pm_media_workflows — Còn Nguyên, Chưa Map

### 2.1 Nguồn data hiện tại

**Seed data** (`sql/workspace/seed.sql`) chèn **10 records** vào `pm_media_workflows`:

| ID | Title | content_type | status | project_id | campaign_id |
|----|-------|-------------|--------|-----------|-------------|
| d1111111-... | FB Post: Laptop Gaming giảm 30% Summer Sale | facebook_post | writing | p1111-... | aaaa1111-... |
| d2222222-... | FB Post: 5 lý do nên mua laptop mùa hè | facebook_post | idea | p1111-... | aaaa1111-... |
| d3333333-... | SEO: Top 10 laptop cho sinh viên 2026 | seo_article | review | p1111-... | aaaa2222-... |
| d4444444-... | TikTok: Mở hộp laptop gaming mới nhất | tiktok_video | filming | p1111-... | aaaa1111-... |
| d5555555-... | YouTube: Review laptop văn phòng | youtube_video | published | p1111-... | aaaa1111-... |
| d6666666-... | FB Post: Gaming laptop RA MẮT | facebook_post | idea | p4444-... | bbbb1111-... |
| d7777777-... | Kịch bản video unboxing gaming laptop | video_script | writing | p4444-... | bbbb1111-... |
| d8888888-... | Image Prompt: Mockup laptop Summer Sale | image_prompt | published | p1111-... | aaaa1111-... |
| d9999999-... | Zalo OA: Tin nhắn chăm sóc khách hàng | zalo_message | published | p3333-... | NULL |
| daaaaaaa-... | SEO: Hướng dẫn chọn laptop theo ngành học | seo_article | editing | p1111-... | aaaa2222-... |

### 2.2 Phân tích mapping

**Migration 008** (merge logic) cố gắng map theo 3 cách:

1. **Tìm Task có title + project_id + campaign_id trùng khớp** → Update task_type, platform, published_at, published_url, stage
2. **Không tìm thấy → Tạo Task mới** với đầy đủ thông tin media
3. **Sau đó set `pm_media_workflows.task_id = pm_tasks.id`**

**Vấn đề dự kiến:**
- Seed data cho `pm_tasks` có thể **không có** title trùng khớp với seed media workflows → Migration sẽ tạo **10 Task mới** trùng lặp
- `filming` status → map thành `shooting` stage
- `image_prompt`, `video_script`, `zalo_message` → sẽ trở thành task_type mới (không nằm trong `MEDIA_TASK_TYPES` chuẩn)

### 2.3 Kết luận Yêu cầu 2

> ❌ **Có 10 records trong pm_media_workflows chưa map sang pm_tasks.**
>
> Chưa chạy migration nên `task_id` column chưa tồn tại (hoặc NULL). Cần:
> 1. Chạy migration 008
> 2. Kiểm tra xem có task trùng lặp được tạo không
> 3. Chạy audit 007b để xác nhận 100% mapped

---

## 3. pm_ai_suggestions — workflow_id Còn, task_id Trống

### 3.1 Cấu trúc hiện tại

```sql
pm_ai_suggestions (
  id UUID PK,
  workflow_id UUID FK → pm_media_workflows (CASCADE),
  task_id UUID FK → pm_tasks (CASCADE)  -- có thể NULL
)
```

### 3.2 Migration 008, Phase 6 — Xử lý đúng

```sql
-- Phase 6: Update pm_ai_suggestions.task_id from workflow_id
UPDATE pm_ai_suggestions s SET
    task_id = mw.task_id
FROM pm_media_workflows mw
WHERE s.workflow_id = mw.id
  AND s.task_id IS NULL
  AND mw.task_id IS NOT NULL;
```

→ Logic đúng: sau khi `pm_media_workflows.task_id` được set, Phase 6 sẽ back-fill `pm_ai_suggestions.task_id`.

### 3.3 Tình trạng hiện tại

- `pm_ai_suggestions.workflow_id` → trỏ đến `pm_media_workflows.id` ✅
- `pm_ai_suggestions.task_id` → **NULL** (chưa chạy Phase 6)
- `pm_media_workflows.task_id` → **NULL** (chưa chạy Phase 2)

### 3.4 Kết luận Yêu cầu 3

> ❌ **pm_ai_suggestions có workflow_id nhưng task_id = NULL.**
>
> Cần chạy migration 008 Phase 6 sau khi Phase 2–5 hoàn tất. Logic đã đúng trong script, chỉ cần thực thi.

---

## 4. UI Media Workflow — Đã Dùng Task API ✅

### 4.1 MediaWorkflowClient

```typescript
// media-workflow-client.tsx — line 54
const handleStatusChange = async (taskId: string, newStage: WorkflowStage) => {
  const res = await fetch(`/api/tasks/${taskId}`, {  // ← Dùng /api/tasks
    method: "PUT",
    body: JSON.stringify({ workflow_stage: newStage }),
  });
};
```

### 4.2 Page server component

```typescript
// page.tsx — chỉ import Task types
import type { Task, Project, Campaign, WorkflowStage, TaskType } from "@/lib/workspace/types";
```

→ **Không có** `import MediaWorkflow` hay `import getMediaWorkflows`.

### 4.3 Data flow

```
getTasks() → filter by MEDIA_TASK_TYPES → MediaWorkflowClient
                                         → WorkflowPipeline (pipeline view)
                                         → WorkflowCard (grid view)
```

### 4.4 Kết luận Yêu cầu 4

> ✅ **UI Media Workflow đã dùng /api/tasks hoàn toàn.**
>
> Không còn gọi `/api/media-workflow` từ frontend. Tốt.

---

## 5. Code Còn Dùng Legacy MediaWorkflow Functions

### 5.1 File sử dụng legacy functions

| File | Functions sử dụng | Loại | Mục đích |
|------|------------------|------|----------|
| `lib/workspace/db/index.ts` | `getMediaWorkflows`, `getMediaWorkflowById`, `createMediaWorkflow`, `updateMediaWorkflow`, `getWorkflowStages` | ✅ DB functions | Backend implementation |
| `app/api/media-workflow/route.ts` | `getMediaWorkflows`, `createMediaWorkflow` | ⚠️ API routes | API endpoints (deprecated) |
| `app/api/media-workflow/[id]/route.ts` | `getMediaWorkflowById`, `updateMediaWorkflow` | ⚠️ API routes | API endpoints (deprecated) |

### 5.2 Không còn file nào khác dùng legacy

```
grep results: Tìm thấy legacy usage CHỈ trong 3 file trên.
```

### 5.3 Các file KHÔNG dùng legacy (chỉ đọc tham khảo trong docs)

| File | Dùng legacy? | Mục đích |
|------|-------------|----------|
| `docs/workspace/architecture-report.md` | ❌ Chỉ mô tả | Tài liệu |
| `docs/workspace/business-guide.md` | ❌ Chỉ mô tả | Tài liệu |
| `docs/workspace/summary.md` | ❌ Chỉ mô tả | Tài liệu |
| `docs/design/workspace-design-spec.md` | ❌ Chỉ mô tả | Spec cũ |
| `run-migration.js` | ❌ Chỉ đếm rows | Migration runner |
| `sql/workspace/seed.sql` | ❌ Tạo seed | Seed data |

### 5.4 Kết luận Yêu cầu 5

> ⚠️ **Code còn 3 file dùng legacy functions:**
>
> 1. `lib/workspace/db/index.ts` — 5 functions: `getMediaWorkflows`, `getMediaWorkflowById`, `createMediaWorkflow`, `updateMediaWorkflow`, `getWorkflowStages` — **Cần xóa sau khi migration hoàn tất**
> 2. `app/api/media-workflow/route.ts` — **Cần deprecate/return 410**
> 3. `app/api/media-workflow/[id]/route.ts` — **Cần deprecate/return 410**

---

## 6. Tổng Hợp Báo Cáo

### 6.1 Đã sạch chưa?

| Tiêu chí | Trạng thái | Chi tiết |
|----------|-----------|----------|
| Migration 007, 007b, 008 đã chạy? | ❌ **CHƯA** | Scripts tồn tại nhưng không có trong pipeline |
| pm_media_workflows records đã map sang pm_tasks? | ❌ **CHƯA** | 10 records seed chưa migrate |
| pm_ai_suggestions.task_id đã set? | ❌ **CHƯA** | NULL, chờ Phase 6 |
| UI dùng /api/media-workflow? | ✅ **SẠCH** | UI đã dùng /api/tasks |
| Code còn dùng legacy functions? | ⚠️ **PARTIAL** | 3 file backend còn, frontend sạch |

### 6.2 Còn file nào dùng legacy?

| File | Cần xử lý |
|------|-----------|
| `lib/workspace/db/index.ts` | Xóa 5 functions sau khi migration xong |
| `app/api/media-workflow/route.ts` | Trả 410 Gone hoặc redirect đến /api/tasks |
| `app/api/media-workflow/[id]/route.ts` | Trả 410 Gone |
| `sql/workspace/seed.sql` | Xóa INSERT pm_media_workflows sau khi migration xong |

### 6.3 Có thể deprecate API media-workflow chưa?

> ❌ **CHƯA.** API `/api/media-workflow` vẫn hoạt động và ghi vào `pm_media_workflows`. Nếu deprecate ngay:
> - Seed data không được sync sang `pm_tasks`
> - Data rời rạc
> - Không có duy nhất nguồn truth

### 6.4 An toàn chuyển sang P2 chưa?

> ❌ **CHƯA AN TOÀN.**

**Lý do:**
1. **Data không sạch** — 10 records trong pm_media_workflows chưa map
2. **Migration chưa chạy** — nếu chạy P2 trước, `getWorkspaceStats()` có thể đếm sai vì:
   - `published_this_month` đếm từ `pm_tasks` (đúng sau migration)
   - Nhưng seed tasks chưa có task_type → có thể không được filter đúng
3. **P1 phải hoàn thành trước** vì P2 (tối ưu `getWorkspaceStats()`) phụ thuộc vào schema mới từ 008

---

## 7. Hành Động Cần Thực Hiện (Trước Khi Chuyển P2)

### Bước 1: Chạy Migration (Ngay lập tức)

```bash
# 1. Chạy migration 008
psql -U mytholaptop_user -d mytholaptop -h postgresql.mtl.vn -p 7000 \
  -f sql/workspace/008_media_workflow_merge.sql

# 2. Chạy audit post-migration
psql -U mytholaptop_user -d mytholaptop -h postgresql.mtl.vn -p 7000 \
  -f sql/workspace/007b_media_workflow_post_audit.sql

# 3. Kiểm tra kết quả:
#    - migrated_tasks = ?
#    - linked_media_workflows = 10
#    - orphaned = 0 (pm_ai_suggestions)
```

### Bước 2: Xác minh Sau Migration

Sau khi migration hoàn thành, chạy manual queries:

```sql
-- Kiểm tra data
SELECT COUNT(*) FROM pm_tasks WHERE task_type IS NOT NULL;
-- Kỳ vọng: >= 10 (tất cả media workflows đã migrate)

SELECT COUNT(*) FROM pm_media_workflows WHERE task_id IS NOT NULL;
-- Kỳ vọng: 10 (tất cả)

SELECT
    SUM(CASE WHEN workflow_id IS NOT NULL AND task_id IS NULL THEN 1 ELSE 0 END) AS orphaned
FROM pm_ai_suggestions;
-- Kỳ vọng: 0 (tất cả đã map)

-- Kiểm tra trùng lặp (tasks có cùng title/project/campaign)
SELECT title, project_id, campaign_id, COUNT(*)
FROM pm_tasks
WHERE title IN (SELECT title FROM pm_media_workflows)
GROUP BY title, project_id, campaign_id
HAVING COUNT(*) > 1;
-- Kỳ vọng: 0 rows (không trùng)
```

### Bước 3: Dọn Code Backend

Sau khi migration xác nhận sạch:

```typescript
// 1. Xóa legacy functions trong lib/workspace/db/index.ts
//    - getMediaWorkflows
//    - getMediaWorkflowById
//    - createMediaWorkflow
//    - updateMediaWorkflow
//    - getWorkflowStages

// 2. Chuyển /api/media-workflow → trả 410 Gone
//    export async function GET() {
//      return NextResponse.json(
//        { error: "MediaWorkflow API deprecated. Use /api/tasks instead." },
//        { status: 410 }
//      );
//    }
```

### Bước 4: Cập Nhật Seed Data

```sql
-- Xóa INSERT pm_media_workflows trong seed.sql sau khi xác nhận data migrate tốt
-- Chỉ giữ lại INSERT vào pm_tasks với task_type
```

### Bước 5: Mới Chuyển P2

Sau khi Bước 1–4 hoàn tất và xác nhận sạch.

---

## 8. Kết Luận Cuối Cùng

| | Trạng thái |
|-|-----------|
| Migration scripts | ✅ Đã tạo, ❌ chưa chạy |
| Data mapped | ❌ Chưa, 10 records còn nguyên |
| pm_ai_suggestions | ❌ task_id chưa set |
| UI | ✅ Đã dùng Task API |
| Backend code | ⚠️ Còn 3 file cần xử lý |
| Có thể deprecate API? | ❌ Chưa — data rời rạc |
| An toàn chuyển P2? | ❌ Chưa — P1 chưa hoàn tất |

> **Verdict: P1 CHƯA HOÀN TẤT. Cần chạy migration 008 và verify trước khi làm bất cứ điều gì khác.**

---

*Báo cáo được tạo bởi AI agent — 26/05/2026*
