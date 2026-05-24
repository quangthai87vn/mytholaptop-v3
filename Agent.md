# Agent.md

## Vai trò của Cursor
Bạn là AI coding assistant cho dự án này. Luôn trả lời bằng tiếng Việt, code theo hướng production-ready, dễ bảo trì, không tự ý phá cấu trúc hiện có.

## Bối cảnh dự án
Dự án xây dựng hệ thống bán hàng và quản trị cho Mỹ Tho Laptop.

Stack chính:
- Next.js / React / TypeScript
- PostgreSQL
- MedusaJS backend
- TailwindCSS / shadcn UI
- AI Automation cho marketing và content

Cấu trúc chính:
- apps/backend-ui: Medusa backend
- apps/admin-ui: giao diện quản trị nội bộ
- apps/website-ui: website bán hàng
- plans: tài liệu kế hoạch phát triển

## Nguyên tắc làm việc
1. Trước khi sửa code, phải đọc cấu trúc project.
2. Không sửa lan man ngoài phạm vi yêu cầu.
3. Mỗi tính năng nên làm theo từng bước nhỏ.
4. Sau khi sửa, phải giải thích đã sửa file nào và vì sao.
5. Ưu tiên tái sử dụng component có sẵn.
6. Không hard-code dữ liệu nếu có thể lấy từ API hoặc database.
7. UI phải responsive, hiện đại, ưu tiên mobile.
8. Tông màu thương hiệu: đỏ tươi, trắng, đen.
9. Không làm mất dữ liệu migration cũ.
10. Nếu chưa chắc schema/database, phải kiểm tra trước khi sửa.

## Quy trình mỗi task
1. Hiểu yêu cầu.
2. Tìm file liên quan.
3. Đề xuất hướng sửa ngắn gọn.
4. Sửa code.
5. Kiểm tra lỗi TypeScript/lint/build nếu có thể.
6. Báo cáo kết quả.

## Quy tắc Git
- Không code trực tiếp trên main nếu là tính năng lớn.
- Tạo branch dạng:
  - feature/ten-tinh-nang
  - fix/ten-loi
  - refactor/ten-khu-vuc
- Commit message rõ ràng:
  - feat: add product edit page
  - fix: repair ai provider routing
  - refactor: improve migration image logic

## Ưu tiên phát triển
1. Medusa backend ổn định
2. Admin UI quản trị sản phẩm, danh mục, đơn hàng
3. Migration từ WordPress/WooCommerce sang PostgreSQL/Medusa
4. Website UI bán hàng
5. AI Content Studio
6. AI Automation / Marketing / ML

## Quy tắc UI
- Dùng shadcn UI nếu project đã cài.
- Component rõ ràng, dễ tái sử dụng.
- Không để layout vỡ trên mobile.
- Form phải có loading, error, success state.
- Bảng dữ liệu phải có search, filter, sort, pagination nếu cần.

## Quy tắc AI Content Studio

### Tổng quan kiến trúc

Hệ thống AI gồm 3 phần chính:
1. **AI Provider** (`/content/settings` → tab AI Connections) — kết nối AI Engine (OpenAI, Gemini, Ollama...)
2. **AI Routing** (`/content/settings` → tab AI Task Routing) — gán task type với provider + system prompt
3. **AI Writing** (`/content/ai-generator`) — trang tạo nội dung, tự động đọc routing config

### Luồng dữ liệu (Data Flow)

```
┌─────────────────────────────────────────────────────────────┐
│  1. DB: ai_task_routes                                       │
│     primary_provider_id, system_prompt_id, brand_preset      │
│     temperature_override, max_tokens_override                │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET /api/ai/settings/all
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  2. useAISettingsQuery()  [libs/hooks/use-ai-settings.ts]  │
│     queryKey: ["ai-settings-all"]                            │
│     Returns: providers, taskRoutes, systemPrompts,           │
│              brandVoices, safetyRules                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         ▼                                      ▼
┌─────────────────────┐          ┌────────────────────────────┐
│ StrategySelector.tsx │          │ OutputWorkspace.tsx        │
│ useResolvedConfig() │          │ AIConfigPreviewPanel()     │
│ Hiển thị AI sẽ dùng│          │ Hiển thị AI sẽ dùng      │
│ + System Prompt     │          │ + System Prompt           │
└─────────────────────┘          └────────────────────────────┘
         │
         │ User click "AI Viết Ngay"
         │ POST /api/ai/generate/stream
         ▼
┌──────────────────────────────────────────────────────────────┐
│  3. API /api/ai/generate/stream [app/api/ai/generate/stream/]│
│     - getAllRoutingRules() → taskRoutes                      │
│     - resolveRouting(task, taskRoutes, providers)             │
│     - resolveSystemPrompt(routing.system_prompt_id, ...)     │
│     - buildChatMessages() → prompt-engine.ts                │
│     - buildSystemPrompt()                                   │
│       Priority: 1. systemPrompt.prompt_text (từ DB)         │
│                  2. Build từ brand voice + strategy         │
└──────────────────────────────────────────────────────────────┘
```

### Quy tắc quan trọng

1. **AI Provider là nơi cấu hình provider/model.**
2. **AI Routing là nơi map task với provider + System Prompt.**
3. **Trang tạo bài viết AI phải dùng lại cấu hình từ AI Routing** — không hard-code, không hỏi lại user.
4. **System Prompt từ Routing được ưu tiên cao nhất** — nếu routing có `system_prompt_id`, dùng `prompt_text` từ `ai_system_prompt_templates`.
5. **Không bắt user chọn lại model** nếu task đã có provider mặc định trong routing.
6. **Luồng viết bài nên có trạng thái:**
   - Phân tích sản phẩm
   - Xây dựng prompt
   - Viết nội dung chính
   - Viết hooks
   - Viết CTA
   - Viết SEO
   - Viết hashtags
   - Hoàn tất

### File quan trọng

| File | Vai trò |
|---|---|
| `app/api/ai/settings/all/route.ts` | Unified API — GET/PUT toàn bộ AI config |
| `app/api/ai/generate/stream/route.ts` | Streaming generation — resolve routing → generate |
| `lib/ai/routing-engine.ts` | resolveRouting() — tìm rule theo task_type |
| `lib/ai/prompt-engine.ts` | buildSystemPrompt() — ưu tiên DB prompt_text |
| `lib/ai/generation-resolvers.ts` | resolveSystemPrompt() — tìm template theo ID |
| `services/ai/generation-resolver.ts` | Frontend: resolveGenerationConfig() cho UI preview |
| `components/ai/studio/StrategySelector.tsx` | UI chọn content type + hiển thị AI sẽ dùng |
| `components/ai/studio/OutputWorkspace.tsx` | Preview panel + System Prompt display |
| `components/ai/TaskRouting.tsx` | Bảng cấu hình task → provider + system prompt |

### Task type mapping

```typescript
const CONTENT_TYPE_TO_TASK = {
  facebook_post: "facebook_content",
  seo_article: "seo_article",
  video_script: "video_script",
  image_prompt: "image_prompt",
  zalo_message: "zalo_message",
  product_description: "product_description",
  email_marketing: "email_marketing",
};
```

### System Prompt Resolution Priority

```
1. Routing rule có system_prompt_id → dùng ai_system_prompt_templates.prompt_text
2. Không có → buildSystemPrompt() tạo từ brand voice + strategy + safety rules
```

### Khi nào cần sửa gì

- **Thêm loại nội dung mới**: thêm vào CONTENT_TYPES (StrategySelector.tsx) + CONTENT_TYPE_TO_TASK (generation-resolver.ts)
- **Thêm System Prompt template mới**: tạo row trong `ai_system_prompt_templates` hoặc qua System Prompt tab
- **Gán System Prompt cho task**: chọn trong Task Routing dialog (System Prompt dropdown)
- **Sửa System Prompt**: trong System Prompt tab của Cấu hình AI

## Quy tắc Migration
- Không tạo trùng sản phẩm nếu đã sync.
- Cần mapping rõ WordPress ID → Medusa ID.
- Ảnh phải được tải về local/public storage.
- Lưu đường dẫn tương đối.
- Giữ ảnh đại diện, gallery, ảnh trong mô tả.
- Có log từng bước migration.
- Có preview trước khi sync.
- Có thể resume nếu đang sync bị lỗi.

## Khi không chắc
Không đoán bừa. Hãy đọc code/schema trước, sau đó mới đề xuất.