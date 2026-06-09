# P7.1.2 — AI Provider Settings Refactor Report

**Ngày:** 27/05/2026
**Trạng thái:** Hoàn thành
**Tác giả:** Claude AI Assistant

---

## Tóm tắt

P7.1.2 đã hoàn thành 4 phần chính:

- **Phân tích:** Xác định 4 nguyên nhân gốc khiến "Lưu cấu hình" không hoạt động
- **Fix API:** Sửa 3 bug nghiêm trọng trong SaveButton, updateProvider, activate/deactivate
- **Routing:** Thêm `task_assistant` routing rule, cập nhật AI Assistant API dùng routing thật
- **UI:** Refactor AI Settings page — thêm Providers tab + Current AI banner + sidebar gọn hơn

---

## Phần 1 — Nguyên nhân chưa lưu được

Qua phân tích chi tiết, phát hiện **4 nguyên nhân gốc**:

### 1. `SaveButton` lookup sai `runtimeConfigs` — **NGHIÊM TRỌNG**

```typescript
// ❌ SAI: dùng type/slug làm key
const rc = runtimeConfigs[type] || runtimeConfigs[p.type] || {};

// ✅ ĐÚNG: dùng provider ID làm key
const providerKey = String(p.id);
const rc = runtimeConfigs[providerKey] || {};
```

**Hậu quả:** `runtimeConfigs` được key bằng provider ID (số nguyên) trong store, nhưng SaveButton lookup bằng `slug` hoặc `type` (string) → luôn trả `{}` → model/temperature không bao giờ được save.

**File:** `components/ai/save/SaveButton.tsx`

### 2. `updateProvider` không save `is_active` — **NGHIÊM TRỌNG**

```typescript
// ❌ CHỈ xử lý status, không xử lý is_active
if (input.status !== undefined) { ... }
if (input.is_active !== undefined) { /* KHÔNG CÓ */ }

// ✅ Cần xử lý cả hai
if (input.is_active !== undefined && schema === "new") {
  fields.push(`is_active = $${idx++}`);
  values.push(Boolean(input.is_active));
  fields.push(`status = $${idx++}`);
  values.push(input.is_active ? "active" : "inactive");
}
```

**Hậu quả:** Toggle enable/disable provider không lưu vào `is_active`, chỉ lưu `status`. Routing engine filter `is_active=true` → provider không bao giờ được coi là "active".

**File:** `lib/content/db/provider-service.ts`

### 3. `activateProvider`/`deactivateProvider` không sync `is_active` — **NGHIÊM TRỌNG**

```typescript
// ❌ activateProvider chỉ update status
await query(`UPDATE ai_providers SET status = 'active' ...`);
// is_active vẫn là false

// ✅ Cần update cả hai
await query(`UPDATE ai_providers SET status = 'active', is_active = true ...`);
```

**Hậu quả:** Bật/tắt provider qua API không cập nhật `is_active` → routing không nhận ra provider đang active.

**File:** `lib/content/db/provider-service.ts`

### 4. AI Assistant hardcoded `facebook_content` — **TRUNG BÌNH**

```typescript
// ❌ HARDCODED
taskType: task.task_type || "facebook_content",

// ✅ DÙNG ROUTING
taskType: task.task_type || "task_assistant",
// Thử task_assistant trước, fallback facebook_content
```

**Hậu quả:** AI Assistant không dùng routing riêng, phụ thuộc vào rule `facebook_content`.

---

## Phần 2 — Logic Provider mới

### Save Flow (fixed)

```
User bấm "Lưu cấu hình"
  ↓
SaveButton gọi useSaveAISettings.mutate()
  ↓
PUT /api/ai/settings/all
  body.providers = [
    {
      id: 1,
      type: "openai",
      slug: "openai",
      name: "OpenAI",
      is_active: true,        ← Now saved!
      status: "active",
      model_name: "gpt-4o-mini",
      api_key: undefined,     ← Only if user typed new key
    }
  ]
  ↓
Server: updateProvider(id=1, {is_active:true, status:"active", model_name:"gpt-4o-mini"})
  ↓
DB: ai_providers SET is_active=true, status='active' WHERE id=1
  ↓
Server: saveRuntimeConfig({provider_id:1, selected_model:"gpt-4o-mini", ...})
  ↓
DB: ai_provider_runtime_configs upsert (ON CONFLICT DO UPDATE)
  ↓
Response: {success:true, masked_key: "sk-****xxxx"}
  ↓
React Query invalidate → store sync → UI update
```

### Activate/Deactivate Flow (fixed)

```
User toggle switch in ProviderFormDialog
  ↓
POST /api/ai/providers/{id} {action:"activate"}
  ↓
Server: activateProvider(id)
  ↓
DB: UPDATE ai_providers SET status='active', is_active=true WHERE id=$1
  ↓
Both status AND is_active are now updated ✓
  ↓
Routing engine: providers.find(p => p.is_active || p.status === "active")
  → Provider now recognized as active ✓
```

### Routing Resolution (AI Assistant)

```
AI Assistant call: POST /api/ai/task-assistant
  ↓
1. Try resolveRouting(taskType="task_assistant", providers)
   → Find rule task_type="task_assistant"
   → Find provider with is_active=true by primary_provider_id
   → If no active provider → try fallback "facebook_content"
  ↓
2. Create provider with decrypted API key
  ↓
3. Call AI API
  ↓
4. Audit log + response
```

---

## Phần 3 — Routing mới

### Task Routes trong DB

| id | task_type | provider_type | primary_provider_id | is_active |
|----|-----------|-------------|-------------------|-----------|
| 1 | facebook_content | openai | null | true |
| 2 | seo_article | gemini | null | true |
| 3 | image_prompt | gemini | null | true |
| 4 | zalo_message | gemini | null | true |
| 5 | email_marketing | gemini | null | true |
| 6 | video_script | openai | null | true |
| 7 | product_description | openai | null | true |
| **10** | **task_assistant** | openai | **null** | **true** ← NEW |

### Routing Priority

1. `task_assistant` rule → nếu có provider active
2. `facebook_content` rule → fallback
3. Default provider → last resort

---

## Phần 4 — UI đã sửa

### AI Settings Page (`/content/settings`)

**Tabs mới:**

| Tab | Icon | Mô tả |
|-----|------|-------|
| Providers | Wifi | Cấu hình provider đang chọn |
| AI Routing | Route | Routing rules cho từng task type |
| Brand Voice | Palette | Brand voice presets |
| Content Templates | Sparkles | System prompts + safety rules |
| Analytics | BarChart3 | Usage analytics |

**Current AI Banner:**

```
┌────────────────────────────────────────────────────────────────┐
│ 🟢 OpenAI · Hoạt động · Connected · gpt-4o-mini   [AI] │
│ Routing: AI Task Assistant                               │
└────────────────────────────────────────────────────────────────┘
```

Nếu chưa có provider active:
```
┌────────────────────────────────────────────────────────────────┐
│ ⚠️ Chưa có AI Provider nào hoạt động            [Cấu hình AI]│
│ Bật ít nhất 1 provider...                                  │
└────────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation (đã gom nhóm)

```
Nội dung
  - Tổng quan nội dung
  - Tạo bài viết AI
  - Bài viết Facebook
  - Bài viết Website
  - Kịch bản video
  - Prompt hình ảnh
  - Lịch đăng bài
  - Thư viện nội dung
  - Mẫu nội dung
  ▼ Cấu hình AI          ← THAY ĐỔI: giờ là expandable
    - AI Settings
    - AI Playground
```

---

## Phần 5 — File đã tạo / sửa

### Tạo mới

| File | Mô tả |
|------|--------|
| `components/ai/CurrentAIBanner.tsx` | Banner hiển thị AI provider đang hoạt động |
| `components/ai/ProvidersConfigPanel.tsx` | Panel cấu hình provider (chưa dùng — thay bằng APIConfigPanel) |
| `scripts/add-task-assistant-route.js` | Script tạo task_assistant routing rule |
| `docs/reports/p7-1-2-ai-provider-settings-refactor-report.md` | Báo cáo này |

### Sửa

| File | Thay đổi |
|------|---------|
| `components/ai/save/SaveButton.tsx` | Fix runtimeConfigs lookup: type → id |
| `lib/content/db/provider-service.ts` | +is_active save in updateProvider; +is_active sync in activate/deactivate |
| `lib/content/types.ts` | +is_active field in AIProviderInput |
| `app/api/ai/task-assistant/route.ts` | Dùng routing task_assistant, fallback facebook_content |
| `app/(admin)/content/settings/page.tsx` | Thêm Providers tab, CurrentAIBanner, fix handleConfigChange |
| `components/ai/TaskRouting.tsx` | +task_assistant in TASK_LABELS, dbTaskType, PRESET_TASK_TYPES |
| `types/ai-operating.ts` | +task_assistant in AITaskType, TASK_ROUTE_LABELS |
| `lib/navigation.ts` | Gom AI Playground vào Cấu hình AI |
| `components/ai/CurrentAIBanner.tsx` | Initial implementation |

### Scripts chạy

```bash
# Tạo task_assistant routing rule
node scripts/add-task-assistant-route.js
# Output: Created task_assistant route with provider_type='openai', model='gpt-4o-mini' (placeholder)
```

---

## Phần 6 — Cách test cấu hình provider

### Bước 1: Bật provider

1. Vào **Nội dung → Cấu hình AI → AI Settings**
2. Chọn provider (ví dụ: OpenAI)
3. Trong form: nhập **Base URL** (đã có sẵn), nhập **Default Model** (`gpt-4o-mini`)
4. Toggle **Kích hoạt** → ON
5. Toggle **Mặc định** → ON (nếu muốn)
6. **Save cấu hình**
7. Toast "Đã lưu cấu hình thành công!"

### Bước 2: Nhập API Key

1. Trong form: nhập **API Key** (`sk-...`)
2. **Save cấu hình**
3. Reload trang → API Key hiển thị masked `sk-****xxxx` (không phải key thật)

### Bước 3: Test connection

1. Bấm **Test kết nối**
2. Nếu API Key đúng → "Connected · {latency}ms"
3. Nếu API Key sai → "Lỗi: Invalid API key"

### Bước 4: AI Assistant

1. Mở **Task bất kỳ** → tab **AI Assistant**
2. Bấm **Generate Hooks**
3. Nếu provider active + API Key đúng → AI trả kết quả
4. Nếu chưa bật provider → "Chưa cấu hình AI Provider" (503)
5. Nếu API Key sai → "API Key không hợp lệ" (500)
6. Nếu timeout → "AI Provider không phản hồi (timeout)" (500)

---

## Điều kiện sang P7.2

| Điều kiện | Trạng thái |
|-----------|-----------|
| CSRF fix (P7.1.1) | ✅ Hoàn thành |
| AI error handling (P7.1.1) | ✅ Hoàn thành |
| Save provider hoạt động | ✅ Đã fix |
| Bật/tắt provider hoạt động | ✅ Đã fix |
| AI Assistant dùng routing thật | ✅ Đã fix |
| TypeScript pass | ✅ Pass |
| Build pass | ✅ Pass (97 routes) |
| Có active provider + API Key | ⏳ Chờ admin cấu hình |

**P7.2 có thể bắt đầu ngay** từ góc độ code. Tuy nhiên để test đầy đủ P7.2 (AI agent features), cần ít nhất 1 AI provider active với API key hợp lệ.
