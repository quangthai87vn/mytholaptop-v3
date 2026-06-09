# P7.1.3 — AI UX Simplification & Content Flow Refactor

**Ngày hoàn thành:** Wednesday May 27, 2026  
**Trạng thái:** Hoàn thành ✅  
**TypeScript:** Pass ✅ (0 lỗi)

---

## 1. UX Problems Cũ

### 1.1 Sidebar Navigation
- Menu "Cấu hình AI" nằm trong children của "Nội dung", quá sâu và khó tìm
- "AI Playground" nằm bên trong "Cấu hình AI" — không hợp lý về IA
- Không có nhóm "AI Studio" riêng biệt cho các tool AI

### 1.2 Settings Page (AI Content Studio)
- Tiêu đề "AI Content Studio" — quá kỹ thuật, không business-friendly
- Sidebar provider cards quá lớn (verbose, nhiều thông tin dư thừa)
- Right inspector panel hiển thị fake metrics (response time placeholder, cost placeholder)
- Tab "Analytics" với UsageAnalytics chưa có real data
- Banner CurrentAI quá tải: latency ms, connected badge, provider type badge
- Tổng cộng 9 columns trong routing table

### 1.3 Routing Table
- 9 cột: Task, AI Engine, Brand Voice, System Prompt, Model, Creativity, Độ dài, Trạng thái, Actions
- Nhiều trường kỹ thuật hiển thị mặc định (temperature, top_p, priority)
- Không có advanced toggle
- Dialog title "Cấu hình AI" — không rõ context

### 1.4 Brand Voice
- Gọi "Brand Voice" — không business-friendly
- Label "Brand Presets", "Tone Adjustments" — kỹ thuật
- Grid 6 items nhưng UI đầy đủ tất cả trường

### 1.5 Prompt Templates
- Gọi "Content Templates" — nhầm lẫn với content items
- Không phải label mà team content sẽ hiểu

### 1.6 AI Generator Wizard
- Step "Cấu hình AI" — kỹ thuật, thực tập sinh không hiểu
- User phải config trước khi generate — workflow ngược

---

## 2. IA Refactor (Information Architecture)

### Sidebar Mới

```
Nội dung (content)
├── Tổng quan nội dung
├── Tạo bài viết AI
├── Bài viết Facebook
├── Bài viết Website
├── Kịch bản video
├── Prompt hình ảnh
├── Lịch đăng bài
├── Thư viện nội dung
└── Mẫu nội dung

AI Studio (mới — tách riêng)
├── AI Settings (→ /content/settings)
├── AI Routing
├── Phong cách nội dung
├── Prompt Templates
└── AI Playground (→ /content/ai-playground)
```

**Thay đổi chính:**
- AI Settings tách thành nhóm riêng "AI Studio"
- Playground không còn trong content children
- Menu rõ: workflow → config → tools

---

## 3. Sidebar Mới — `lib/navigation.ts`

| Thay đổi | Chi tiết |
|-----------|----------|
| Thêm `Route`, `Palette` icons | Dùng cho AI Studio sub-items |
| AI Settings → AI Studio nhóm mới | Nhóm con: AI Settings, AI Routing, Phong cách, Prompt Templates, AI Playground |
| Xóa "Cấu hình AI" nested trong content | Không còn chồng lấn IA |

---

## 4. Provider UX Mới — `content/settings/page.tsx`

### Thay đổi:

| Trước | Sau |
|--------|-----|
| SidebarConnectionCard với border-2, verbose info | `CompactProviderSelector` — button-based, 1 dòng |
| Latency ms badge trong card | Status badge: "Kết nối" / "Lỗi" / "Chưa test" |
| Model name hiển thị trong card | Chỉ hiện khi hover/click |
| Test button ẩn, chỉ hiện khi hover | Test button luôn visible |
| Nhiều UI state cho health | Chỉ `ProviderHealth.status` |

### Provider Status System:
- **Connected** → hiển thị badge xanh
- **Error** → hiển thị badge đỏ  
- **Unknown** → "Chưa test"

### Removed:
- Fake latency display
- Border-2 styling
- `SidebarConnectionCard` — thay bằng inline `CompactProviderSelector`
- Multiple health state rendering
- Model name trong card header

---

## 5. Routing UX Mới — `components/ai/TaskRouting.tsx`

### Table mới — 5 columns thay vì 9:

| Column | Mô tả |
|--------|--------|
| Loại nội dung | Task label + hint |
| AI Engine | Provider name badge |
| Model | Font-mono, muted |
| Phong cách | Brand preset badge |
| Trạng thái | Toggle switch |

### Đã xóa khỏi table:
- ~~Brand Voice~~ → gộp vào cột "Phong cách"
- ~~System Prompt~~ → ẩn trong dialog
- ~~Creativity (slider)~~ → ẩn trong dialog
- ~~Content Length~~ → ẩn trong dialog

### Advanced Settings Toggle:
- Click "Cài đặt nâng cao" → expand
- Temperature, Max Tokens, Top P, Priority
- Warning: "Dành cho admin kỹ thuật"

### Đổi tên:
- "AI Task Routing" → **"AI cho từng loại nội dung"**
- "Brand Voice" → **"Phong cách"**
- Dialog: "Cấu hình AI" → **"AI cho từng loại nội dung: [label]"**

### Xóa:
- Delete button khỏi table row (chỉ cần edit)
- Slug display trong task label
- Multiple warning badges

---

## 6. Settings Page Mới — `content/settings/page.tsx`

### Header:
- **Trước:** "AI Content Studio" + SaveButton + Inspector toggle
- **Sau:** "AI Settings" + SaveButton

### Tabs Mới:

| Tab | Icon | Mục đích |
|-----|------|----------|
| AI Connections | Wifi | Quản lý AI providers |
| AI Routing | Route | AI cho từng loại nội dung |
| Phong cách | Palette | Phong cách nội dung |
| Prompt Templates | Sparkles | System prompts & rules |

**Đã xóa:**
- ~~Tab Analytics~~ — UsageAnalytics chưa có real data, gây confusion

### Banner CurrentAIBanner:
- **Đã tối giản:** Bỏ latency ms, connected badge, provider type badge
- Chỉ hiển thị: name, status, model, URL, routing link

### Xóa hoàn toàn:
- Right Inspector panel (`RuntimeInspector`)
- Unused state: `lastTokens`, `lastLatency`, `totalRequestCount`, `totalEstimatedCost`, `isStreaming`
- Unused imports: `Cpu`, `BarChart3`, `RuntimeInspector`, `SafetyRule`, `LocalRuntime`, `ModelFamily`, `DEFAULT_VI_SYSTEM_PROMPT`, `PROVIDER_GROUP_MAP`

---

## 7. Brand Voice Refactor — `components/ai/BrandVoiceEditor.tsx`

| Thay đổi | Chi tiết |
|-----------|----------|
| "Brand Presets" → "Phong cách nội dung" | Business-friendly |
| "Tone Adjustments" → "Tinh chỉnh giọng điệu" | Vietnamese label |
| Grid layout giữ nguyên | 2x3 preset cards vẫn OK |
| All logic giữ nguyên | Chỉ relabel, không đổi UX flow |

---

## 8. Prompt Templates Refactor — `components/ai/ContentTemplatesEditor.tsx`

| Thay đổi | Chi tiết |
|-----------|----------|
| "Content Templates" → "Prompt Templates" | Rõ ràng hơn |
| Section heading "Prompt Templates" | Thay vì "Content Templates" |

**Logic giữ nguyên:**
- 3 Tabs: System Prompts / Prompt Rules / Safety Rules
- All CRUD operations
- All dialogs

---

## 9. Create Content Flow — `components/ai/studio/wizard/WizardPage.tsx`

| Thay đổi | Chi tiết |
|-----------|----------|
| "Cấu hình AI" → "AI đang được chọn tự động" | Step 2 = routing được auto-resolve |
| "Xem trước prompt" → "Xem trước nội dung" | Rõ ràng hơn |

---

## 10. Cleanup — Removed/Deprecated

### Files/Components xóa khỏi UI:
- `RuntimeInspector` — không còn render trong settings page
- `UsageAnalytics` — tab đã xóa (component giữ lại cho P7.2 khi có real data)

### Dead State Removed:
```typescript
// Removed from settings page state:
const [lastTokens, setLastTokens] = useState<number | null>(null);
const [lastLatency, setLastLatency] = useState<number | null>(null);
const [totalRequestCount, setTotalRequestCount] = useState(0);
const [totalEstimatedCost, setTotalEstimatedCost] = useState(0);
const [isStreaming, setIsStreaming] = useState(false);
const [inspectorOpen, setInspectorOpen] = useState(true); // → set to false
```

### Dead Code Removed:
- Debug console.log in `handleRoutesChange`
- `SidebarConnectionCard` component (replaced by `CompactProviderSelector`)
- Multiple health state rendering branches

---

## 11. Files Đã Sửa

| File | Thay đổi |
|------|----------|
| `lib/navigation.ts` | Sidebar IA refactor, thêm AI Studio group |
| `app/(admin)/content/settings/page.tsx` | Simplified header, tabs, compact provider, xóa inspector |
| `components/ai/TaskRouting.tsx` | Simplified table (5 cols), advanced toggle, rename |
| `components/ai/BrandVoiceEditor.tsx` | Relabel to "Phong cách nội dung" |
| `components/ai/ContentTemplatesEditor.tsx` | Relabel to "Prompt Templates" |
| `components/ai/CurrentAIBanner.tsx` | Simplified, bỏ fake metrics |
| `components/ai/studio/wizard/WizardPage.tsx` | Clearer step labels |

---

## 12. Trước vs Sau

### Sidebar Navigation

**Trước:**
```
Nội dung
└── Cấu hình AI
    ├── AI Settings
    └── AI Playground
```

**Sau:**
```
Nội dung (content workflow)
AI Studio (AI config & tools)
└── AI Settings
├── AI Routing
├── Phong cách nội dung
├── Prompt Templates
└── AI Playground
```

### AI Settings Page

**Trước:**
- Header: "AI Content Studio"
- Tabs: Providers | AI Routing | Brand Voice | Content Templates | Analytics
- Sidebar: verbose provider cards với latency ms
- Right panel: Runtime Inspector với fake cost
- Routing table: 9 columns

**Sau:**
- Header: "AI Settings"
- Tabs: AI Connections | AI Routing | Phong cách | Prompt Templates
- Sidebar: compact provider buttons với status
- No right panel
- Routing table: 5 columns + Advanced toggle

---

## 13. P7.2 Readiness

### Đã sẵn sàng:
- Sidebar navigation IA đúng
- Provider save/load hoạt động
- Routing hoạt động  
- Brand Voice store hoạt động
- Prompt Templates hoạt động
- TypeScript pass

### Chưa làm (thuộc P7.2):
- AI Playground standalone page
- AI Assistant auto-resolve routing
- Real usage analytics data
- Content calendar integration
- Team/intern workflow specific UX

---

## 14. Verification Checklist

- [x] TypeScript pass (0 errors)
- [x] Sidebar navigation refactored  
- [x] AI Studio group tách riêng
- [x] AI Playground có nhóm riêng
- [x] Compact provider selector
- [x] No fake metrics panel
- [x] Routing table simplified (5 cols)
- [x] Advanced Settings toggle in routing dialog
- [x] "AI cho từng loại nội dung" label
- [x] "Phong cách nội dung" label
- [x] "Prompt Templates" label
- [x] Banner simplified
- [x] Removed Analytics tab
- [x] Removed Runtime Inspector panel
- [x] Wizard step labels clarified
- [x] Debug logs removed
