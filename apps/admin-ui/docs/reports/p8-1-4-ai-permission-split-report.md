# P8.1.4 — AI Usage Permission Split Report

**Phase:** P8.1.4
**Date:** 2026-05-28
**Context:** P8.1.3 added `ai_engine.manage` for AI Engine management. This phase splits AI permissions into two groups: management (`ai_engine.manage`) vs. usage (`ai_generate`).

---

## 1. Mục tiêu

Tách quyền AI thành 2 nhóm:

| Permission | Ai làm gì | Ai được phép |
|---|---|---|
| `ai_engine.manage` | Quản trị Provider, Routing, API Key, System Prompt | Chỉ super_admin |
| `ai_generate` | Generate content, AI Assistant, Playground | super_admin + admin + editor |

---

## 2. Permission System Changes

### 2.1 `lib/auth/permissions.ts`

**Thêm permission mới:**
```ts
export type Permission =
  | "ai_engine.manage"   // đã có từ P8.1.3
  | "ai_generate"         // MỚI
```

**Thêm vào Resource type:**
```ts
export type Resource = "ai_engine" | "ai_generate" | ...
```

### 2.2 Role Permission Matrix (sau P8.1.4)

| Permission | super_admin | admin | editor | viewer |
|---|---|---|---|---|
| `ai_engine.manage` | ✅ | ❌ | ❌ | ❌ |
| `ai_generate` | ✅ | ✅ | ✅ | ❌ |

---

## 3. API Routes — Permission Assignment

### 3.1 AI Engine Management (`ai_engine.manage`)

| API Route | Methods | Permission |
|---|---|---|
| `/api/ai/providers` | POST | `ai_engine.manage` |
| `/api/ai/providers/[id]` | PUT, DELETE, POST | `ai_engine.manage` |
| `/api/ai/providers/[id]/runtime-config` | PUT | `ai_engine.manage` |
| `/api/ai/providers/[id]/models` | POST, DELETE | `ai_engine.manage` |
| `/api/ai/providers/api-key` | POST, PUT | `ai_engine.manage` |
| `/api/ai/brand-voices` | POST, DELETE | `ai_engine.manage` |
| `/api/ai/brand-voices/activate` | POST | `ai_engine.manage` |
| `/api/ai/task-routes` | PUT, POST, DELETE | `ai_engine.manage` |
| `/api/ai/system-prompts` | POST, PUT, DELETE | `ai_engine.manage` |
| `/api/ai/prompt-rules` | POST, DELETE, PATCH | `ai_engine.manage` |
| `/api/ai/safety-rules` | POST, DELETE, PATCH | `ai_engine.manage` |
| `/api/ai/settings` | PUT | `ai_engine.manage` |
| `/api/ai/settings/all` | PUT | `ai_engine.manage` |
| `/api/ai/settings/test` | POST | `ai_engine.manage` |

### 3.2 AI Usage (`ai_generate`)

| API Route | Methods | Permission |
|---|---|---|
| `/api/ai/task-assistant` | POST | `ai_generate` |
| `/api/ai/generate/stream` | POST | `ai_generate` |
| `/api/ai/playground/chat` | POST | `ai_generate` |
| `/api/content/generate` | POST | `ai_generate` |

### 3.3 Read-only (chỉ `requireAdminAuth`)

| API Route | Methods | Permission |
|---|---|---|
| `/api/ai/providers` | GET | `requireAdminAuth` |
| `/api/ai/providers/[id]` | GET | `requireAdminAuth` |
| `/api/ai/resolve-routing` | GET/POST | `requireAdminAuth` |
| `/api/ai/providers/catalog` | GET | Public static |

---

## 4. UI Sidebar — Role-Based Visibility

### 4.1 Sidebar filter logic

Thêm `requiredPermission` vào NavItem interface và filter trong sidebar:

```ts
// navigation.ts
export interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  badge?: string;
  requiredPermission?: string;  // MỚI
}
```

AI Engine nav item:
```ts
{
  title: "AI Engine",
  href: "/settings/ai",
  icon: Brain,
  requiredPermission: "ai_engine.manage",  // Chỉ super_admin thấy
}
```

Sidebar filter (client-side, dùng `useAuthStore`):
- super_admin: thấy tất cả menu (bao gồm AI Engine)
- admin/editor/viewer: không thấy AI Engine trong sidebar
- filter áp dụng cho cả desktop sidebar và mobile sidebar

### 4.2 Navigation Item Visibility

| Nav Item | super_admin | admin | editor | viewer |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Quản lý Workspace | ✅ | ✅ | ✅ | ✅ |
| Hàng hoá | ✅ | ✅ | ✅ | ✅ |
| Bán hàng | ✅ | ✅ | ✅ | ✅ |
| Cài đặt | ✅ | ✅ | ✅ | ✅ |
| — AI Engine | ✅ | ❌ | ❌ | ❌ |
| — Notifications | ✅ | ✅ | ✅ | ✅ |
| — Team | ✅ | ✅ | ✅ | ✅ |
| — Data | ✅ | ✅ | ✅ | ✅ |
| — System | ✅ | ✅ | ✅ | ✅ |

---

## 5. Kiến trúc Permission Guard

```
UI Layer:
  Sidebar filter (client-side, role check) → super_admin thấy AI Engine
  /settings/ai/layout.tsx → server-side ai_engine.manage check → super_admin allowed

API Layer (write):
  requireAdminAuth() → requirePermission("ai_engine.manage" | "ai_generate")
```

---

## 6. Files Changed

### 6.1 Permission System

| File | Change |
|---|---|
| `lib/auth/permissions.ts` | Thêm `ai_generate` vào Permission/Resource types; thêm vào ROLE_PERMISSIONS cho super_admin/admin/editor; thêm vào PERMISSION_GROUPS; cập nhật canRead helper |

### 6.2 Navigation

| File | Change |
|---|---|
| `lib/navigation.ts` | Thêm `requiredPermission: "ai_engine.manage"` vào AI Engine nav item |

### 6.3 Sidebar Components

| File | Change |
|---|---|
| `components/layout/admin-sidebar.tsx` | Thêm `useAuthStore`, `useMemo`, `filterNavItems()` để lọc nav items dựa trên role; sử dụng `filteredNavItems` thay vì `NAV_ITEMS` |
| `components/layout/admin-mobile-sidebar.tsx` | Tương tự — thêm `useAuthStore`, `useMemo`, `filterNavItems()` để lọc trên mobile |

### 6.4 API Routes

| File | Change |
|---|---|
| `app/api/ai/task-assistant/route.ts` | Thay inline permission check bằng `requirePermission("ai_generate")` |
| `app/api/ai/generate/stream/route.ts` | Đổi từ `ai_engine.manage` → `ai_generate` |
| `app/api/ai/playground/chat/route.ts` | Đổi từ `ai_engine.manage` → `ai_generate` |
| `app/api/content/generate/route.ts` | Thêm `requirePermission("ai_generate")` |

---

## 7. Verification Results

| Check | Result |
|---|---|
| TypeScript pass | ✅ |
| Next.js Build pass (102 routes) | ✅ |
| super_admin → `/settings/ai` | ✅ |
| admin → `/settings/ai` | ✅ (redirect /403) |
| editor → `/settings/ai` | ✅ (redirect /403) |
| viewer → `/settings/ai` | ✅ (redirect /403) |
| admin/editor → AI generate API | ✅ (ai_generate: allowed) |
| viewer → AI generate API | ✅ (ai_generate: 403) |
| super_admin → AI generate API | ✅ |
| super_admin → save provider | ✅ (ai_engine.manage) |
| admin/editor → save provider | ✅ (ai_engine.manage: 403) |

---

## 8. P8.2 Readiness

### Database Consolidation (P8.2) — Ready ✅

Permission system hoàn chỉnh cho AI. P8.2 có thể tiếp tục:

1. **Gom AI tables** vào workspace schema mà không lo về permission
2. **AI Engine UI** hoạt động cho super_admin, ẩn với admin/editor/viewer
3. **AI Generate** hoạt động cho admin/editor, chặn viewer

---

## 9. Summary

| Item | Detail |
|---|---|
| Permission mới | `ai_generate` |
| ai_engine.manage | super_admin (quản trị) |
| ai_generate | super_admin + admin + editor (dùng AI) |
| viewer | Không AI nào |
| API protected (management) | 14 routes × write methods |
| API protected (usage) | 4 routes |
| Sidebar filter | client-side, role-based |
| TypeScript | ✅ Pass |
| Build | ✅ Pass (102 routes) |
| P8.2 readiness | ✅ Sẵn sàng |
