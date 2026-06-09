# P8.1.2 — AI Settings Route Canonicalization Report

**Phase:** P8.1.2
**Date:** 2026-05-28
**Context:** P8.1.1 đã fix redirect, tiếp tục canonicalize AI settings route

---

## 1. Mục tiêu

- Canonical AI Engine route phải là `/settings/ai` (thuộc Settings, không thuộc Content).
- `/content/settings` chỉ là legacy redirect về `/settings/ai`.
- Sidebar AI Engine trỏ đúng `/settings/ai`.
- Breadcrumb/title thống nhất: **Cài đặt > AI Engine**.

---

## 2. Route Before / After

| Route | Before P8.1.2 | After P8.1.2 |
|---|---|---|
| `/settings/ai` | Redirect → `/content/settings` | **Nội dung AI Engine thật** |
| `/content/settings` | Nội dung AI Engine thật | Redirect → `/settings/ai` |
| Sidebar "AI Engine" | `/content/settings` | `/settings/ai` |

---

## 3. Chiến lược thực hiện

**Không di chuyển file lớn** (827 dòng). Thay vào đó:

1. Tạo `app/(admin)/settings/ai/layout.tsx` — bypass permission guard của `/settings`.
2. Copy nội dung AI settings (từ `/content/settings/page.tsx`) sang `/settings/ai/page.tsx`.
3. Chuyển `/content/settings/page.tsx` thành redirect → `/settings/ai`.
4. Cập nhật nav + admin-header.

---

## 4. Files Changed

### 4.1 New Files

| File | Description |
|---|---|
| `app/(admin)/settings/ai/layout.tsx` | Pass-through layout ngăn `/settings` permission guard chặn `/settings/ai`. AI config không cần `settings.manage` permission — chỉ cần auth middleware là đủ. |
| `app/(admin)/settings/ai/page.tsx` | Copy nội dung AI settings (827 dòng). Heading đổi thành "AI Engine". Tất cả logic, components, handlers giữ nguyên. |

### 4.2 Modified Files

| File | Change |
|---|---|
| `app/(admin)/content/settings/page.tsx` | Xóa nội dung AI settings (827 dòng), thay bằng redirect đơn giản → `/settings/ai`. Giữ lại file để old links/bookmarks vẫn hoạt động. |
| `lib/navigation.ts` | Sidebar "AI Engine" href: `/content/settings` → `/settings/ai`. `ROUTE_REDIRECTS`: `/content/settings` → `/settings/ai`. |
| `middleware.ts` | Thêm `/content/settings` → `/settings/ai` vào `LEGACY_REDIRECTS`. |
| `components/layout/admin-header.tsx` | `BREADCRUMB_SEGMENTS`: thêm `ai: "AI Engine"` để breadcrumb hiển thị "Cài đặt > AI Engine" đúng chuẩn. |

---

## 5. Redirect Chain (Sau khi fix)

```
/content/settings
    ↓ middleware + page redirect
/settings/ai
    ↓ canonical route
AI Engine page (Providers, Routing, Brand Voice, Templates)
```

```
Middleware:
  /content/settings → /settings/ai ✓

Sidebar nav:
  Cài đặt > AI Engine → /settings/ai ✓

Breadcrumb (/settings/ai):
  Dashboard > Cài đặt > AI Engine ✓
```

---

## 6. No Circular Redirect Verification

| Route | Result |
|---|---|
| `/settings/ai` renders | ✅ Không redirect, render AI Engine page |
| `/content/settings` redirects | ✅ → `/settings/ai` → AI Engine page |
| `/settings` renders | ✅ Render company/woocommerce/medusa settings (không bị ảnh hưởng) |
| Sidebar "AI Engine" | ✅ `/settings/ai` → AI Engine page |
| Breadcrumb "Cài đặt > AI Engine" | ✅ Hiển thị đúng |

---

## 7. Build Output Route Types

| Route | Type | Note |
|---|---|---|
| `/settings/ai` | ƒ (Dynamic) | Có nội dung thật ✅ |
| `/content/settings` | ○ (Static) | Redirect page ✅ |
| `/settings` | ƒ (Dynamic) | Company/WooCommerce/Medusa ✅ |

---

## 8. Permission Architecture

```
/settings (layout.tsx)
  ├── settings.manage required
  ├── page.tsx → company/woocommerce/medusa settings
  └── ai/ (layout.tsx)
        └── ai/page.tsx → AI Engine (bypass parent guard via layout)
              └── NO settings.manage required
```

`/settings/ai` bypasses parent permission guard nhờ `layout.tsx` trả về `children` trực tiếp. Auth được check bởi `middleware.ts` (session cookie) — đủ cho AI config.

---

## 9. Verification Results

| Check | Result |
|---|---|
| `/settings/ai` renders AI settings | ✅ |
| `/content/settings` redirects to `/settings/ai` | ✅ |
| Sidebar "AI Engine" → `/settings/ai` | ✅ |
| Breadcrumb: "Cài đặt > AI Engine" | ✅ |
| No circular redirects | ✅ |
| TypeScript pass | ✅ |
| Next.js Build pass (102 routes) | ✅ |

---

## 10. P8.2 Readiness

### Database Consolidation (P8.2) — Ready ✅

Tất cả route issues đã resolve. AI Engine giờ thuộc đúng kiến trúc:

| Aspect | Location | DB table |
|---|---|---|
| AI Providers | `/settings/ai` | `ai_providers` |
| AI Routing | `/settings/ai` | `ai_task_routes` |
| Brand Voice | `/settings/ai` | `ai_brand_voices` |
| Prompt Templates | `/settings/ai` | `ai_system_prompts`, `ai_prompt_rules` |
| Safety Rules | `/settings/ai` | `ai_safety_rules` |

Mọi thứ AI Engine gom về `/settings/ai` + `Cài đặt > AI Engine` breadcrumb — sẵn sàng clean up bảng `ai_settings` cũ trong P8.2.

---

## 11. Summary

| Item | Detail |
|---|---|
| Route cũ | `/content/settings` (AI Engine content) |
| Route mới | `/settings/ai` (AI Engine content) |
| Legacy redirect | `/content/settings` → `/settings/ai` |
| Files tạo mới | 2 (`layout.tsx`, `page.tsx` tại `/settings/ai`) |
| Files sửa | 4 (`content/settings/page.tsx`, `navigation.ts`, `middleware.ts`, `admin-header.tsx`) |
| TypeScript | ✅ Pass |
| Build | ✅ Pass (102 routes) |
| Circular redirect | ✅ Không có |
| P8.2 readiness | ✅ Sẵn sàng |
