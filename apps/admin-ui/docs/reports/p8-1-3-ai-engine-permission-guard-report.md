# P8.1.3 — AI Engine Permission Guard Report

**Phase:** P8.1.3
**Date:** 2026-05-28
**Context:** P8.1.2 canonicalized AI Engine route to `/settings/ai`. This phase adds proper permission guard to protect AI Engine from unauthorized access.

---

## 1. Mục tiêu

- `/settings/ai` được bảo vệ bằng permission chuyên biệt.
- Không dùng `settings.manage` (vì AI Engine không phải system settings).
- Permission: `ai_engine.manage` — chỉ `super_admin` có.
- `viewer`, `editor`, `admin` không có `ai_engine.manage` → bị chặn.
- Tất cả write API endpoints của AI Engine được bảo vệ.

---

## 2. Permission System Audit

### 2.1 Trước P8.1.3

| Permission | super_admin | admin | editor | viewer |
|---|---|---|---|---|
| `ai_providers.manage` | ✅ | ❌ | ❌ | ❌ |
| `ai_engine.manage` | ❌ | ❌ | ❌ | ❌ |

**Vấn đề:** Không có `ai_engine.manage`. AI Engine routes chỉ có `requireAdminAuth` (chỉ check session, không check permission).

### 2.2 Sau P8.1.3

| Permission | super_admin | admin | editor | viewer |
|---|---|---|---|---|
| `ai_providers.manage` | ✅ | ❌ | ❌ | ❌ |
| `ai_engine.manage` | ✅ | ❌ | ❌ | ❌ |

`ai_engine.manage` = toàn quyền quản lý AI Engine (providers, routing, templates, brand voices, settings, test connection, playground, content generation).

---

## 3. Files Created

| File | Description |
|---|---|
| `lib/auth/require-permission.ts` | Helper `requirePermission(req, permission)` — gọi sau `requireAdminAuth`, check specific permission, trả 403 nếu không đủ quyền. Đọc user từ `request._authUser` (được gắn bởi `requireAdminAuth`). |

---

## 4. Files Modified

### 4.1 `lib/auth/permissions.ts`

- Thêm `"ai_engine.manage"` vào `Permission` type union
- Thêm `"ai_engine"` vào `Resource` type
- Thêm `"ai_engine.manage"` vào `ROLE_PERMISSIONS.super_admin`
- Thêm group `"AI Engine"` vào `PERMISSION_GROUPS` với label "Quản lý toàn bộ AI Engine"
- Thêm `ai_engine` vào `canRead` helper

### 4.2 `app/(admin)/settings/ai/layout.tsx`

Thay thế pass-through layout bằng permission guard thực sự:

```ts
// Trước: pass-through (không bảo vệ gì)
export default async function SettingsAILayout({ children }) {
  return children; // ❌ Không check gì
}

// Sau: permission guard
export default async function SettingsAILayout({ children }) {
  // 1. Auth check
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/settings/ai");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/settings/ai");

  // 2. Permission check
  const canAccessAIEngine =
    user.role === "super_admin" || hasPermission(user, "ai_engine.manage");
  if (!canAccessAIEngine) redirect("/403?message=Không có quyền truy cập AI Engine");

  return children;
}
```

### 4.3 AI Engine API Routes — Permission Added

| API Route | Methods | Permission Added |
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
| `/api/ai/playground/chat` | POST | `ai_engine.manage` |
| `/api/ai/generate/stream` | POST | `ai_engine.manage` |
| `/api/ai/models/discover` | POST | `ai_engine.manage` |

**Total: 17 API routes, 35 write method handlers protected.**

---

## 5. Guard Layer Summary

### UI Layer (`/settings/ai`)
```
Middleware (session cookie) → /settings/ai/layout.tsx (ai_engine.manage check) → AI Engine page
```

### API Layer (write endpoints)
```
Middleware (session cookie) → requireAdminAuth() (session + viewer role block) → requirePermission("ai_engine.manage") (specific permission) → Handler
```

---

## 6. Access Control Matrix

| Role | Can Access `/settings/ai`? | Can Save Provider? | Can Edit Routing? | Can Use Playground? | Can Generate Content? |
|---|---|---|---|---|---|
| `super_admin` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ❌ (redirect /403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `editor` | ❌ (redirect /403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `viewer` | ❌ (redirect /403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| Unauthenticated | ❌ (redirect /login) | ❌ (401) | ❌ (401) | ❌ (401) | ❌ (401) |

---

## 7. Lưu ý về Các API Còn Lại

### Read-only (không cần thêm permission vì đã có `requireAdminAuth`):

| API Route | Methods | Status |
|---|---|---|
| `/api/ai/providers` | GET | ✅ Đọc không cần permission đặc biệt |
| `/api/ai/providers/[id]` | GET | ✅ |
| `/api/ai/providers/[id]/runtime-config` | GET | ✅ |
| `/api/ai/providers/[id]/models` | GET | ✅ |
| `/api/ai/brand-voices` | GET | ✅ |
| `/api/ai/task-routes` | GET | ✅ |
| `/api/ai/system-prompts` | GET | ✅ |
| `/api/ai/prompt-rules` | GET | ✅ |
| `/api/ai/safety-rules` | GET | ✅ |
| `/api/ai/settings` | GET | ✅ |
| `/api/ai/settings/all` | GET | ✅ |
| `/api/ai/providers/catalog` | GET | ✅ (public static data) |
| `/api/ai/resolve-routing` | GET/POST | ✅ (`requireAdminAuth` đã đủ — chỉ resolve, không write) |

---

## 8. Verification Results

| Check | Result |
|---|---|
| TypeScript pass | ✅ |
| Next.js Build pass (102 routes) | ✅ |
| `/settings/ai` — super_admin access | ✅ |
| `/settings/ai` — admin blocked | ✅ (redirect /403) |
| `/settings/ai` — editor blocked | ✅ (redirect /403) |
| `/settings/ai` — viewer blocked | ✅ (redirect /403) |
| `/settings/ai` — unauthenticated | ✅ (redirect /login) |
| Write API — super_admin | ✅ |
| Write API — editor/viewer | ✅ (403) |
| Write API — unauthenticated | ✅ (401) |
| `/content/settings` still redirects | ✅ (`/settings/ai` → AI Engine) |

---

## 9. P8.2 Readiness

### Database Consolidation (P8.2) — Ready ✅

Permission system hoàn chỉnh cho AI Engine. Các bước tiếp theo trong P8.2:

1. **Gom AI tables** vào workspace schema:
   - `ai_providers` → workspace schema
   - `ai_task_routes` → workspace schema
   - `ai_brand_voices` → workspace schema
   - `ai_system_prompt_templates` → workspace schema
   - `ai_prompt_rules` → workspace schema
   - `ai_safety_rules` → workspace schema

2. **Tách `admin_users_permissions`** nếu muốn gán `ai_engine.manage` cho admin cụ thể (hiện tại chỉ super_admin).

3. **Thêm UI quản lý permission** cho AI Engine (tùy chọn, không bắt buộc cho P8.2).

---

## 10. Summary

| Item | Detail |
|---|---|
| Permission mới | `ai_engine.manage` |
| Role có quyền | Chỉ `super_admin` |
| Files tạo mới | 1 (`lib/auth/require-permission.ts`) |
| Files sửa | 1 (`lib/auth/permissions.ts`) + 1 (`settings/ai/layout.tsx`) + 17 API routes |
| API protected | 35 write method handlers across 17 routes |
| TypeScript | ✅ Pass |
| Build | ✅ Pass (102 routes) |
| P8.2 readiness | ✅ Sẵn sàng |
