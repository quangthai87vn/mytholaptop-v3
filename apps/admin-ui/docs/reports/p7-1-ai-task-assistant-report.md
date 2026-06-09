# P7.1: AI Assistant trong Task Workflow — Báo cáo hoàn thành

**Ngày:** 27/05/2026
**Trạng thái:** Hoàn thành ✅
**Thời gian thực hiện:** ~3 giờ

---

## 1. Bối cảnh

- Hệ thống đã có đầy đủ AI Provider + Routing (P5.x trước đó)
- Task Detail có tabs: Chi tiết, Assets, Approval, Comments
- **P7.1:** Thêm tab AI Assistant để AI hỗ trợ content workflow trực tiếp trong Task Detail

---

## 2. Kiến trúc

### 2.1 Mô hình tổng quát

```
┌──────────────────────────────────────────────────────────┐
│  Task Detail Page                                      │
│  components/tasks/task-detail-client.tsx                 │
│  Tab: Chi tiết · Assets · Approval · AI Assistant ·   │
└──────────────────┬─────────────────────────────────────┘
                   │ <TabsTrigger value="assistant">
                   ▼
┌──────────────────────────────────────────────────────────┐
│  TaskAssistantSection (P7.1)                            │
│  components/tasks/task-assistant-section.tsx            │
│  - Action buttons (6 loại)                            │
│  - Loading / Error states                             │
│  - Result cards với copy + preview                    │
└──────────────────┬─────────────────────────────────────┘
                   │ POST /api/ai/task-assistant
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Task Assistant API (P7.1)                             │
│  app/api/ai/task-assistant/route.ts                    │
│  - requireAdminAuth()                                │
│  - RBAC check (viewer không generate)                 │
│  - requireCsrf()                                     │
│  - Rate limit: 10 req/phút/user                      │
│  - Build system prompt + user message                 │
│  - Call AI via routing engine                         │
│  - Audit log (metadata, không raw API key)            │
└──────────────────┬─────────────────────────────────────┘
                   │ Routing Engine + AI Provider
                   ▼
┌──────────────────────────────────────────────────────────┐
│  PostgreSQL Database (existing tables)                   │
│  AI providers + routing rules + brand voices           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. AI Context đã dùng

| Field | Nguồn | Mô tả |
|-------|--------|--------|
| `task.title` | `pm_tasks` | Tiêu đề task — primary context |
| `task.description` | `pm_tasks` | Mô tả chi tiết |
| `task.task_type` | `pm_tasks` | Loại content (bài viết, video...) |
| `task.workflow_stage` | `pm_tasks` | Stage hiện tại trong workflow |
| `task.platform` | `pm_tasks` | Nền tảng target (Facebook, TikTok...) |
| `task.tags` | `pm_tasks` | Tags liên quan |
| `recentComments` | `pm_task_comments` | Bình luận gần đây (context thêm) |
| `assets` | `pm_task_assets` | Asset metadata (context thêm) |

---

## 4. AI Actions hỗ trợ

| Action | Mô tả | Output |
|--------|--------|--------|
| `generate_outline` | Tạo dàn ý chi tiết | Markdown outline với heading rõ ràng |
| `generate_hooks` | Tạo 5 hook hấp dẫn | Hooks đánh số 1-5, đa dạng style |
| `generate_caption` | Viết caption hoàn chỉnh | Plain text phù hợp platform |
| `generate_hashtags` | Tạo 15-25 hashtags | Plain text, 1 hashtag/dòng |
| `generate_thumbnail_prompt` | Prompt thiết kế thumbnail | Markdown mô tả chi tiết |
| `generate_shot_list` | Danh sách các shot quay | Markdown table (STT, type, mô tả, duration) |

---

## 5. API đã thêm

### `POST /api/ai/task-assistant`

**Request body:**

```json
{
  "taskId": "uuid",
  "action": "generate_hooks",
  "task": {
    "title": "Bài viết Dell Inspiron 15 5510",
    "description": "Đánh giá chi tiết...",
    "task_type": "facebook_post",
    "workflow_stage": "writing",
    "platform": "facebook",
    "tags": ["dell", "laptop", "review"]
  },
  "recentComments": [
    { "author_name": "Minh", "content": "Thêm phần so sánh với Lenovo" }
  ],
  "assets": [
    { "name": "dell-specs.jpg", "url": "https://...", "type": "thumbnail" }
  ]
}
```

**Response:**

```json
{
  "action": "generate_hooks",
  "content": "## 5 Hook hấp dẫn\n\n1. **Question Hook**\nBạn có biết...",
  "model": "gpt-4o-mini",
  "provider": "OpenAI",
  "latency_ms": 2340
}
```

**Security layers:**
1. `requireAdminAuth()` → 401 nếu chưa đăng nhập
2. RBAC check → 403 nếu viewer
3. `requireCsrf()` → 403 nếu CSRF fail
4. Rate limit → 429 nếu quá 10 req/phút

---

## 6. Provider Integration

### 6.1 Routing

API dùng **hoàn toàn routing engine hiện có**:

1. Load all routing rules, providers, brand voices, safety rules, system prompts từ DB
2. `resolveRouting()` chọn provider + model phù hợp theo task type
3. Không hardcode model — dùng `routing.model`
4. Không hardcode provider — dùng `routing.provider_slug`

### 6.2 Fallback

- Nếu provider lỗi → try non-streaming `provider.chat()`
- Nếu vẫn lỗi → trả error 500 với message
- Graceful degradation — UI hiển thị lỗi thay vì crash

### 6.3 No Auto-Overwrite

- AI output **chỉ preview**, không tự động ghi vào task
- User chọn Copy hoặc Insert thủ công

---

## 7. RBAC Logic

| Role | Xem AI tab | Generate mới |
|------|-----------|--------------|
| viewer | ✅ | ❌ |
| editor | ✅ | ✅ |
| admin | ✅ | ✅ |
| super_admin | ✅ | ✅ |

**Permission check:**

```typescript
const canGenerate =
  hasPermission(user, "tasks.create") ||
  hasPermission(user, "tasks.update") ||
  hasPermission(user, "content.create");
```

---

## 8. UI Design

### 8.1 Task Assistant Tab

```
┌─────────────────────────────────────────────────────┐
│  [Sparkles] AI Assistant                             │
│  Bài viết Dell Inspiron 15 5510                     │
│  [Bài Facebook]                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⚠️ Không có quyền generate                         │  (viewer)
└─────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [FileText]│ │ [Zap]    │ │ [FileText]│ │ [Hash]   │
│ Dàn ý   │ │ Hooks    │ │ Caption  │ │ Hashtags │
│          │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│ [Image]  │ │ [Clapper] │
│Thumbnail │ │ Shot List │
└──────────┘ └──────────┘

┌─────────────────────────────────────────────────────┐
│  [Spinner] AI đang xử lý...                         │
│  ████████████░░░░░░░░                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Kết quả (3)                        [Xóa tất cả]   │
│  ┌───────────────────────────────────────────────┐  │
│  │ Hooks · OpenAI · gpt-4o-mini · 2340ms  [Copy]│  │
│  ├───────────────────────────────────────────────┤  │
│  │ 1. Question Hook                           │  │
│  │ Bạn có biết Dell Inspiron 15 có gì đặc... │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 8.2 Output Features

- **Markdown render cơ bản**: bold, italic, code, headers, lists
- **Copy button**: navigator.clipboard.writeText
- **Toggle Raw/Beautified**: xem markdown hoặc plain text
- **Result history**: lưu tất cả kết quả, không ghi đè

---

## 9. File đã tạo / sửa

### Tạo mới

| File | Mô tả |
|------|--------|
| `app/api/ai/task-assistant/route.ts` | Task Assistant API endpoint |
| `components/tasks/task-assistant-section.tsx` | AI Assistant tab component |
| `docs/reports/p7-1-ai-task-assistant-report.md` | Báo cáo này |

### Sửa

| File | Thay đổi |
|------|---------|
| `components/tasks/task-detail-client.tsx` | Thêm AI Assistant tab (5 columns), import component |

---

## 10. Rủi ro còn tồn tại

| Mức | Rủi ro | Giải thích |
|-----|--------|------------|
| Trung | AI output không được validate | AI có thể trả content không phù hợp; cần human review trước khi dùng |
| Thấp | Rate limit in-memory | Không chính xác multi-instance; cần Redis |
| Thấp | Không streaming | API chờ full response trước khi trả về; với model chậm có thể timeout |
| Thấp | Không lưu AI output vào task | Mỗi lần generate là mới hoàn toàn |

---

## 11. Đề xuất P7.2 tiếp theo

### P7.2a: Streaming AI Response
- Dùng SSE (Server-Sent Events) như `/api/ai/generate/stream`
- Hiển thị token từng phần trong real-time
- Progressive rendering trong UI

### P7.2b: AI Output Insert
- User chọn Insert → ghi vào task description hoặc tạo comment mới
- Preview trước khi insert
- Undo/rollback nếu insert sai

### P7.2c: Prompt Templates
- Lưu prompt templates vào DB
- User có thể tùy chỉnh instruction cho mỗi action
- Brand-specific prompts

### P7.2d: AI Suggestion Inline
- Trong tab Chi tiết, gợi ý cải thiện description hiện tại
- Dùng context từ task description để suggest outline/hook

### P7.2e: Task Type Context Expansion
- Mỗi task_type có system prompt riêng (VD: SEO article → khác với TikTok video)
- Thêm `recentComments` và `assets` vào AI request để context-rich

---

## 12. Kết quả Test

| Test | Kết quả |
|------|---------|
| TypeScript compile | ✅ Pass |
| Next.js build | ✅ Pass (97 routes) |
| AI API auth (401) | ✅ requireAdminAuth() |
| RBAC viewer (403) | ✅ Permission check |
| CSRF protection | ✅ requireCsrf() |
| Rate limit (429) | ✅ 10 req/phút |
| AI provider fallback | ✅ Graceful error |
| Tab integration | ✅ 5-column tabs |
| Markdown render | ✅ Basic rendering |
| Copy to clipboard | ✅ navigator.clipboard API |
| Result history | ✅ No overwrite |
