# P7.1.4 — AI Provider Architecture Stabilization

**Trạng thái**: Hoàn thành
**Ngày**: 2026-05-27
**Phiên bản**: P7.1.4

---

## Tổng quan

P7.1.4 đã biến AI Provider system từ hybrid (static + dynamic) thành **runtime configuration architecture** thật sự. Quá trình audit đã tìm ra 6 root causes và tất cả đã được fix.

---

## PHẦN 1 — AUDIT PROVIDER ARCHITECTURE

### Root Causes tìm thấy

#### Bug 1: Model Discovery không bao giờ hoạt động
**File**: `app/(admin)/content/settings/page.tsx` (dòng 281-284)

**Vấn đề**: `selectedProviderId` lưu DB id (string như `"1"`, `"30"`), nhưng `provider.find()` so sánh với `p.slug || p.type` (string như `"openai"`, `"9router"`). Không bao giờ match.

```typescript
// SAI — selectedProviderId là "1", p.slug là "openai"
const providerRecord = providers.find((p) => (p.slug || p.type) === selectedProviderId);

// ĐÚNG — so sánh với id
const providerRecord = providers.find((p) => String(p.id) === selectedProviderId);
```

**Fix**: Đổi sang `String(p.id) === selectedProviderId`.

#### Bug 2: `activeTab` mặc định sai
**File**: `store/ai-settings-store.ts` (dòng 204)

**Vấn đề**: Store default là `"providers"` nhưng tab đã đổi tên thành `"connections"` trong P7.1.3. Tab không hiển thị đúng.

**Fix**: `activeTab: "providers"` → `activeTab: "connections"`.

#### Bug 3: System provider không được bảo vệ khi delete
**File**: `lib/content/db/provider-service.ts` (hàm `checkProviderDelete`)

**Vấn đề**: `checkProviderDelete` luôn trả về `canDelete: true`. Backend DELETE route không block system provider.

**Fix**:
- Thêm `isSystem: boolean` và `systemCannotDelete?: boolean` vào return type
- Kiểm tra `provider.is_system` và return `canDelete: false` với message rõ ràng
- Backend route trả về HTTP 409 khi cố xóa system provider

#### Bug 4: Sidebar provider hardcoded, không group
**File**: `app/(admin)/content/settings/page.tsx` (component `CompactProviderSelector`)

**Vấn đề**: Provider list phẳng, không phân nhóm. Không hiển thị SYS badge cho system provider. Không có "Add Provider" button trong sidebar.

**Fix**: Grouped selector với 4 nhóm: Cloud APIs, AI Aggregators, Local LLMs, Inference Platforms. Custom providers vào nhóm "Custom". SYS badge hiển thị cho `is_system: true`.

#### Bug 5: Delete race condition
**File**: `app/(admin)/content/settings/page.tsx` (hàm `handleDeleteProvider`)

**Vấn đề**: `setDeleteConfirmProvider(null)` gọi trước `invalidateQueries` + `setTimeout`. Nếu user đóng dialog nhanh, state bị reset trước khi store update.

**Fix**: Move `setDeleteConfirmProvider(null)` vào `finally` block. Thêm system provider warning trong dialog.

#### Bug 6: Current AI Banner không show đầy đủ status
**File**: `components/ai/CurrentAIBanner.tsx`

**Vấn đề**: Chỉ có 2 trạng thái ("Hoạt động" / "Tắt"). Không hiển thị nguyên nhân lỗi. Không parse `last_error` để đưa ra message hữu ích.

**Fix**: Thêm `resolveConnectionStatus()` function với 6 trạng thái chi tiết + message cụ thể.

---

## PHẦN 2 — SYSTEM VS CUSTOM PROVIDER LOGIC

### Thêm `ProviderKind` enum
**File**: `lib/content/types.ts`

```typescript
export type ProviderKind = "system" | "custom";
```

### Backend Protection
**File**: `lib/content/db/provider-service.ts`

```typescript
export async function checkProviderDelete(id: number): Promise<ProviderDeleteCheck> {
  const provider = await getProviderById(id);
  if (!provider) { ... }
  if (provider.is_system) {
    return {
      canDelete: false,
      isSystem: true,
      systemCannotDelete: true,
      reason: `System provider "${provider.name}" không thể xóa. Chỉ có thể tắt/bật.`,
    };
  }
  // ...
}
```

**File**: `app/api/ai/providers/[id]/route.ts`

```typescript
const check = await checkProviderDelete(providerId);
if (!check.canDelete) {
  return NextResponse.json({ error: check.reason, isSystem: check.isSystem, canDelete: false }, { status: 409 });
}
```

### Frontend Delete Dialog
**File**: `app/(admin)/content/settings/page.tsx`

```tsx
{deleteConfirmProvider?.is_system && (
  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 ...">
    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
    <span><strong>System provider</strong> không thể xóa. Chỉ có thể tắt/bật.</span>
  </div>
)}
// Button disabled cho system provider
<Button variant="destructive" disabled={deleteConfirmProvider?.is_system}>
```

---

## PHẦN 3 — SIDEBAR REFACTOR

**File**: `app/(admin)/content/settings/page.tsx` (component `CompactProviderSelector`)

### Architecture mới

```
┌─ Cloud APIs ─────────────┐
│ ● OpenAI         ● Gemini│
│ ● OpenRouter              │
├─ Local LLMs ─────────────┤
│ ● Ollama         ● LM Studio│
├─ AI Aggregators ──────────┤
│ ● Groq                   │
├─ Inference Platforms ─────┤
│ (empty or custom)         │
├─ Custom ─────────────────┤
│ ● 9Router        ● Internal│
├─ + Thêm Provider ────────┤
└───────────────────────────┘
```

### Key features
- **Group labels** viết HOA, tracking-wider, text-muted-foreground
- **SYS badge** (8px, muted background) cho `is_system: true`
- **"Thêm Provider"** button ở cuối sidebar
- **No delete** option trong menu cho system providers
- Compact size (11px text, h-4 buttons)

---

## PHẦN 4 — MENU ITEMS RENAME

**File**: `lib/navigation.ts`

| Trước | Sau |
|---|---|
| AI Settings | Providers |
| AI Routing | Routing |
| Phong cách nội dung | Phong cách |
| AI Playground | Playground |

---

## PHẦN 5 — PROVIDER STATUS ENGINE

**File**: `components/ai/CurrentAIBanner.tsx`

### 6 Trạng thái chi tiết

| Status | Label | Màu | Chi tiết |
|---|---|---|---|
| `connected` | Hoạt động | Xanh lá | Model đang dùng |
| `disabled` | Tắt | Xám | Đang bị tắt |
| `missing_api_key` | Chưa cấu hình | Vàng | Thiếu Base URL |
| `offline` | Offline | Đỏ | Không kết nối được |
| `timeout` | Timeout | Cam | Server không phản hồi |
| `invalid_config` | Lỗi cấu hình | Đỏ | API Key/Cấu hình sai |

### Error Parsing Logic

```typescript
if (lastError.toLowerCase().includes("timeout")) return { label: "Timeout", detail: lastError };
if (lastError.includes("401") || includes("unauthorized")) return { label: "API Key lỗi" };
if (lastError.includes("connection refused")) return { label: "Offline", detail: "..." };
if (lastError.includes("localhost")) return { label: "Offline", detail: "..." };
```

---

## PHẦN 6 — CURRENT AI RESOLUTION

**File**: `components/ai/CurrentAIBanner.tsx`

Current AI resolve từ:
1. `activeProvider` (provider có `is_default: true` từ DB)
2. `taskRoute` (route cho `task_assistant`)
3. `connection_status` + `last_error` (từ health check gần nhất)

Nếu provider không active → Banner màu vàng với "Chưa có AI Provider nào hoạt động".

---

## PHẦN 7 — CONFIG SAVE STABILIZATION

### Race condition fix
- `setDeleteConfirmProvider(null)` move vào `finally`
- `queryClient.invalidateQueries` await trước khi set state

### Stale state fix
- Model discovery: correct ID lookup
- `activeTab` default: `"connections"` (đúng tab)

---

## FILES ĐÃ SỬA

| File | Thay đổi |
|---|---|
| `lib/content/types.ts` | Thêm `ProviderKind = "system" \| "custom"` |
| `lib/content/db/provider-service.ts` | `checkProviderDelete` bảo vệ system provider |
| `app/api/ai/providers/[id]/route.ts` | Block delete system provider (HTTP 409) |
| `store/ai-settings-store.ts` | `activeTab` default → `"connections"` |
| `app/(admin)/content/settings/page.tsx` | Model discovery fix, grouped sidebar, delete dialog, tab nav |
| `components/ai/CurrentAIBanner.tsx` | 6 status engine, error parsing, clear messages |
| `lib/navigation.ts` | Rename menu items |

---

## DEPRECATED/REMOVED LOGIC

- ~~System provider có thể bị xóa~~ → Block bởi backend + frontend
- ~~Tab mặc định "providers"~~ → Đổi thành "connections"
- ~~Flat provider list~~ → Grouped by `group_slug`
- ~~Binary status (Hoạt động/Tắt)~~ → 6 trạng thái chi tiết
- ~~Sidebar hardcoded provider UI~~ → Dynamic render từ DB list
- ~~Delete race condition~~ → Fixed với finally block

---

## BUILD & LINT

```
TypeScript: ✅ PASS (pnpm --filter admin-ui exec tsc --noEmit)
Lint: ✅ No linter errors
```

---

## READINESS CHO P7.2

**Đã ổn định**: ✅

AI Provider architecture bây giờ là runtime configuration thật sự:
- System/Custom phân biệt rõ ràng
- Sidebar dynamic từ DB
- Status messages có nguyên nhân cụ thể
- Delete protected ở cả backend và frontend
- Tab navigation đúng
- Model discovery hoạt động

**Sẵn sàng cho P7.2 — AI Content Generation Flow Refactor**
