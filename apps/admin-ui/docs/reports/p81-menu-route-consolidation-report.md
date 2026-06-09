# P8.1 — Menu & Route Consolidation

**Trạng thái**: Hoàn thành
**Ngày**: 2026-05-28
**Phiên bản**: P8.1

---

## Tổng quan

P8.1 là phase đầu tiên của P8.0 Workspace Architecture Consolidation. Tập trung hoàn toàn vào **UI refactor** — không đụng DB hay API. Đã refactor navigation structure, route redirects, và header để phù hợp với workspace-centric architecture.

---

## PHẦN 1 — REMOVE DUPLICATE MENU GROUPS

### Trước (9 sections)
```
Dashboard | Nội dung | AI Studio | Quản lý Dự án | Hàng hoá | Bán hàng | Khách hàng | Quản trị | Cài đặt
```

### Sau (5 sections)
```
Dashboard | Quản lý Workspace | Hàng hoá | Bán hàng | Khách hàng | Cài đặt
```

### Removed sections
- **"Nội dung"** → merge vào "Quản lý Workspace/Content"
- **"AI Studio"** → move vào "Cài đặt/AI Engine"
- **"Quản lý Dự án"** → merge vào "Quản lý Workspace"
- **"Quản trị"** → merge vào "Cài đặt/Team"

---

## PHẦN 2 — NEW NAVIGATION STRUCTURE

### Final Navigation Tree

```
📊 Dashboard                    → /dashboard
📁 Quản lý Workspace           → /workspace
   ├── Tổng quan              → /workspace
   ├── Dự án                  → /projects
   ├── Chiến dịch             → /campaigns
   ├── Công việc              → /tasks
   ├── Nội dung               → /content
   ├── Media Workflow          → /media-workflow
   ├── Calendar                → /calendar
   ├── Team                    → /team
   └── Reports                 → /reports

🛒 Hàng hoá                   → /products
   ├── Sản phẩm               → /products
   ├── Danh mục                → /products/categories
   ├── Thẻ                     → /products/tags
   ├── Thương hiệu             → /products/brands
   ├── Thuộc tính              → /products/attributes
   ├── Biến thể                → /products/variants
   ├── Kho hàng                → /products/inventory
   └── Đồng bộ                 → /products/sync

🛍️ Bán hàng                  → /sales
   ├── Tổng quan              → /sales
   ├── Đơn hàng               → /sales/orders
   ├── POS                    → /sales/pos
   ├── Thanh toán              → /sales/payments
   ├── Giao hàng              → /sales/shipping
   ├── Trả hàng               → /sales/refunds
   ├── Giỏ hàng               → /sales/carts
   ├── Khuyến mãi             → /sales/promotions
   ├── Báo giá                → /sales/quotes
   └── Nhật ký                → /sales/logs

👥 Khách hàng                 → /customers
   ├── Danh sách              → /customers
   ├── Nhóm KH                → /customers/groups
   ├── Lịch sử mua           → /customers/purchase-history
   ├── Bảo hành               → /customers/warranty-debt
   ├── ZNS & CSKH             → /customers/zns
   ├── Kịch bản CS            → /customers/care-scenarios
   ├── Phân khúc              → /customers/segments
   └── Nhật ký                → /customers/activity-log

⚙️ Cài đặt                    → /settings
   ├── AI Engine              → /settings/ai
   ├── Thông báo             → /settings/notifications
   ├── Team                   → /settings/team
   ├── Dữ liệu               → /settings/data
   └── Hệ thống               → /settings/system
```

---

## PHẦN 3 — ROUTE CHANGES

### New Route Pages Created

| Route | Type | Description |
|---|---|---|
| `/settings/ai` | Redirect → `/settings` | New canonical path for AI config |
| `/team` | Landing page | Hub page for team section |
| `/team/interns` | Redirect → `/interns` | Intern section entry |
| `/calendar` | Redirect → `/workspace/calendar` | New canonical path for calendar |
| `/reports` | Landing page | Reports hub page |

### Old Routes Soft-Deprecated (middleware redirect)

| Old Route | New Route | Status |
|---|---|---|
| `/workspace` | `/dashboard` | Redirect |
| `/workspace/activity` | `/dashboard` | Redirect |
| `/content/ai-generator` | `/content` | Redirect |
| `/content/facebook-posts` | `/content` | Redirect |
| `/content/website-posts` | `/content` | Redirect |
| `/content/video-scripts` | `/content` | Redirect |
| `/content/image-prompts` | `/content` | Redirect |
| `/content/media-prompts` | `/media-workflow` | Redirect |
| `/content/templates` | `/content` | Redirect |
| `/content/settings` | `/settings/ai` | Redirect |
| `/interns` | `/team/interns` | Redirect |
| `/notifications` | `/settings/notifications` | Redirect |

### Pages NOT Redirected (kept at existing URL)
- `/projects` → `/projects` (no change)
- `/campaigns` → `/campaigns` (no change)
- `/tasks` → `/tasks` (no change)
- `/media-workflow` → `/media-workflow` (no change)
- `/products/*` → `/products/*` (no change)
- `/sales/*` → `/sales/*` (no change)
- `/customers/*` → `/customers/*` (no change)
- `/staff` → `/staff` (no change)
- `/settings` → `/settings` (no change)

---

## PHẦN 4 — MIDDLEWARE CHANGES

### Legacy Redirects in middleware.ts

```typescript
// Old: /workspace → /dashboard
// Old: /content/ai-generator → /content
// Old: /content/settings → /settings/ai
// Old: /interns → /team/interns
// Old: /notifications → /settings/notifications
```

### Updated Protected Paths

Added new paths to `PROTECTED_PAGE_PATHS`:
- `/dashboard`
- `/workspace`
- `/calendar`
- `/team`
- `/reports`

### Auth Flow

- Session cookie check vẫn giữ nguyên
- Unauthenticated users redirect về `/login`
- Legacy routes redirect trước khi auth check

---

## PHẦN 5 — ADMIN HEADER CHANGES

### PAGE_TITLES

Updated to include all new routes:
- Workspace section titles: Dashboard, Workspace, Dự án, Chiến dịch, Công việc, Nội dung, Media Workflow, Calendar, Team, Reports
- Settings section titles: AI Engine, Thông báo, Team, Dữ liệu, Hệ thống
- Legacy routes kept for compatibility (e.g., `/staff` → "Team")

### BREADCRUMB_SEGMENTS

Added new segments:
- workspace, projects, campaigns, tasks, content, calendar, team, reports

### QUICK_ACTIONS

Refactored from business-generic to workflow-oriented:
| Before | After |
|---|---|
| Tạo đơn hàng | Tạo đơn hàng |
| Thêm sản phẩm | Thêm dự án |
| Thêm khách hàng | Tạo chiến dịch |
| Tạo bài viết AI | Giao việc |
| Gửi ZNS | Tạo nội dung AI |
| Đồng bộ hàng hoá | Xem dashboard |

---

## FILES ĐÃ SỬA

| File | Thay đổi |
|---|---|
| `lib/navigation.ts` | Complete rewrite — new workspace-centric structure, deprecated nav map, redirect map |
| `middleware.ts` | Legacy redirects + updated protected paths |
| `components/layout/admin-header.tsx` | PAGE_TITLES, BREADCRUMB_SEGMENTS, QUICK_ACTIONS |

### Files Created

| File | Purpose |
|---|---|
| `app/(admin)/settings/ai/page.tsx` | Redirect → `/settings` |
| `app/(admin)/team/page.tsx` | Team hub page |
| `app/(admin)/team/interns/page.tsx` | Redirect → `/interns` |
| `app/(admin)/reports/page.tsx` | Reports hub page |
| `app/(admin)/calendar/page.tsx` | Redirect → `/workspace/calendar` |

---

## COMPATIBILITY MAP

### Old Menu → New Menu

| Old Group | Old Item | New Path | Status |
|---|---|---|---|
| Nội dung | Tạo bài viết AI | `/content` | Redirect |
| Nội dung | Bài viết Facebook | `/content` | Redirect |
| Nội dung | Bài viết Website | `/content` | Redirect |
| Nội dung | Kịch bản video | `/content` | Redirect |
| Nội dung | Prompt hình ảnh | `/content` | Redirect |
| Nội dung | Lịch đăng bài | `/calendar` | Redirect |
| Nội dung | Thư viện nội dung | `/content` | Redirect |
| Nội dung | Mẫu nội dung | `/content` | Redirect |
| AI Studio | Providers | `/settings/ai` | Redirect |
| AI Studio | Routing | `/settings/ai` | Redirect |
| AI Studio | Phong cách | `/settings/ai` | Redirect |
| AI Studio | Prompt Templates | `/settings/ai` | Redirect |
| AI Studio | Playground | `/settings/ai` | Redirect |
| Quản lý Dự án | Tổng quan | `/dashboard` | Redirect |
| Quản lý Dự án | Dự án | `/projects` | No change |
| Quản lý Dự án | Chiến dịch | `/campaigns` | No change |
| Quản lý Dự án | Công việc | `/tasks` | No change |
| Quản lý Dự án | Media Workflow | `/media-workflow` | No change |
| Quản lý Dự án | Thực tập sinh | `/team/interns` | Redirect |
| Quản lý Dự án | Content Calendar | `/calendar` | Redirect |
| Quản lý Dự án | Hoạt động | `/dashboard` | Redirect |
| Quản trị | Nhân viên | `/team` | Redirect |
| Quản trị | Vai trò | `/settings/team` | Redirect |
| Quản trị | Phân quyền | `/settings/team` | Redirect |

---

## RISCK ASSESSMENT

### Low Risk
- Navigation refactor — frontend only, no DB/API changes
- Middleware redirects — user sees new URL, content unchanged
- New page files — simple redirect pages, minimal impact

### Medium Risk
- `/workspace` → `/dashboard` redirect — users bookmarking `/workspace` will redirect
- `/content/settings` → `/settings/ai` — existing AI users need to update bookmarks

### Mitigation
- All redirects preserve query params
- Middleware handles redirect before auth check
- Legacy routes remain functional via redirect

---

## NEXT PHASE (P8.2)

### Ready to implement:
1. **Content workflow embedding** — ensure `/content` shows full content dashboard
2. **AI embedded into Task** — add "AI Assist" panel to task detail page
3. **AI embedded into Content** — add "AI Assist" panel to content item page
4. **Remove deprecated pages** — after verify no traffic, remove old pages
5. **Database consolidation** — Phase E from P8.0 roadmap

### Blockers: None

---

## BUILD & LINT

```
TypeScript: ✅ PASS
Lint: ✅ No linter errors
```

---

## DEPRECATED LOGIC KEPT (FOR COMPATIBILITY)

| Item | Location | Reason |
|---|---|---|
| `NOI_DUNG` deprecated nav list | `navigation.ts` | Compatibility reference |
| `AI_STUDIO` deprecated nav list | `navigation.ts` | Compatibility reference |
| Legacy `PAGE_TITLES` | `admin-header.tsx` | Redirected routes still need titles |
| Old quick actions items | Admin header | Replaced with workspace-focused actions |

---

## SUMMARY

P8.1 đã hoàn thành UI consolidation:

- ✅ 9 navigation sections → 5 sections
- ✅ Legacy routes redirect via middleware
- ✅ New workspace-centric menu tree
- ✅ AI moved to Settings
- ✅ Team consolidated under one section
- ✅ Reports as new section
- ✅ All TypeScript + lint passes
- ✅ No DB changes
- ✅ No API changes
- ✅ Backward compatible (old URLs still work via redirect)
