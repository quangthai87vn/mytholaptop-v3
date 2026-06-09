# P8.0 — Workspace Architecture Consolidation

**Trạng thái**: Hoàn thành Audit
**Ngày**: 2026-05-28
**Phiên bản**: P8.0

---

## PHẦN 1 — FULL ARCHITECTURE AUDIT

### 1. Menu Structure hiện tại (9 sections, 59+ items)

| Section | Items | Vấn đề |
|---|---|---|
| **Dashboard** | Dashboard, Hoạt động, Thông báo | OK — entry point |
| **Nội dung** | Tạo nội dung, Thư viện, Mẫu nội dung, Media prompts, Lịch đăng bài, Thư viện nội dung | **TRÙNG LẶP**: "Thư viện" và "Thư viện nội dung" là cùng 1 thứ. "Tạo nội dung" có thể merge |
| **AI Studio** | AI Settings, AI Routing, Phong cách nội dung, Prompt Templates, Playground | **TÁCH RỜI** — AI không gắn với workflow. Navigation dùng cùng 1 href `/content/settings` cho tất cả |
| **Quản lý dự án** | Projects, Campaigns, Tasks, Kanban | **ORPHAN** — Không gắn với content workflow. Tasks tách biệt khỏi content |
| **Hàng hoá** | Products, Categories, Tags, Brands, Attributes | OK — business layer |
| **Nhân sự** | Staff, Interns, Roles, Permissions | OK |
| **Workspace** | Activity, Calendar | **TRÙNG** với Dashboard. Activity trùng với "Hoạt động" |
| **Công cụ** | AI Playground | **TRÙNG** với AI Studio → Playground |
| **Cài đặt** | Settings, Notifications, Data | OK |

### 2. Routes hiện tại (55+ pages)

#### `/app/(admin)/` routes:
```
content/
  content/generate/page.tsx          → DUPLICATE (cùng chức năng với wizard)
  content/library/page.tsx            → THƯ VIỆN
  content/templates/page.tsx         → PROMPTS
  content/calendar/page.tsx          → LỊCH
  content/media-prompts/page.tsx     → MEDIA
  content/settings/page.tsx        → AI SETTINGS

workspace/
  workspace/page.tsx                → DASHBOARD TRÙNG
  workspace/activity/page.tsx        → ACTIVITY TRÙNG
  workspace/calendar/page.tsx        → CALENDAR TRÙNG

projects/
  projects/page.tsx                  → PROJECTS
  projects/[id]/page.tsx            → PROJECT DETAIL

campaigns/
  campaigns/page.tsx                → CAMPAIGNS

tasks/
  tasks/page.tsx                   → TASKS
  tasks/[id]/page.tsx              → TASK DETAIL

notifications/
  notifications/page.tsx            → NOTIFICATIONS

staff/
  staff/page.tsx                   → STAFF LIST
  staff/roles/page.tsx              → ROLES
  staff/permissions/page.tsx       → PERMISSIONS

products/                           → MEDUSA INTEGRATION
```

### 3. API Routes (71 routes)

| Domain | Count | Trạng thái |
|---|---|---|
| **AI** | 19 | ⚠️ Cần consolidate (legacy + new) |
| **Content** | 12 | ⚠️ Có trùng lặp |
| **Tasks** | 9 | ✅ OK |
| **Projects/Campaigns** | 8 | ✅ OK |
| **Auth** | 6 | ✅ OK |
| **Staff** | 6 | ✅ OK |
| **Notifications** | 4 | ✅ OK |
| **Medusa** | 3 | ✅ OK |
| **Activity** | 4 | ✅ OK |
| **Migration** | 3 | ✅ OK |

### 4. Duplicate Logic

| # | Duplicate | Vị trí A | Vị trí B | Priority |
|---|---|---|---|---|
| 1 | AI Generation Pipeline | `lib/content/ai/generator.ts` (legacy) | `lib/ai/generation-service.ts` (new) | **HIGH** |
| 2 | AI Routing | `lib/routing-legacy.ts` | `lib/ai/routing-engine.ts` | **HIGH** |
| 3 | Routing types | `types/ai-operating.ts` TaskRoute | `lib/ai/types.ts` | **HIGH** |
| 4 | Medusa clients | `services/medusa.service.ts` (2400+ lines) | `services/medusa-api.service.ts` | **HIGH** |
| 5 | Activity pages | `workspace/page.tsx` | `workspace/activity/page.tsx` | MEDIUM |
| 6 | Calendar pages | `workspace/calendar/page.tsx` | `content/calendar/page.tsx` | MEDIUM |
| 7 | Content library | `content/library/page.tsx` | `content/items/` route | MEDIUM |
| 8 | Staff intern tracking | `staff/page.tsx` | `interns/page.tsx` | LOW |
| 9 | Content generation | `content/generate/page.tsx` | wizard | LOW |
| 10 | Settings routes | `/settings` + `/content/settings` | MEDIUM |

---

## PHẦN 2 — DATABASE AUDIT

### 2.1 Tổng quan bảng

**Tổng: ~43 tables** trong database mytholaptop

| Nhóm | Bảng | Count | Notes |
|---|---|---|---|
| **AI** | ai_providers, ai_settings, ai_task_routes, ai_brand_voices, ai_prompt_rules, ai_safety_rules, ai_system_prompt_templates, ai_media_settings, ai_provider_groups, ai_provider_models, ai_provider_runtime_configs, ai_routing_rules, ai_content_generation_logs | 13 | ⚠️ Phân mảnh, trùng schema |
| **Content** | content_templates, content_items, content_generation_logs, content_schedules, media_prompts, publish_channels, publish_jobs | 7 | ⚠️ Logs trùng với AI logs |
| **Workspace** | pm_projects, pm_campaigns, pm_tasks, pm_task_comments, pm_task_activities, pm_status_history | 6 | ✅ Tốt |
| **Media Workflow** | pm_media_workflows, pm_workflow_stages | 2 | ⚠️ Trùng concept với content_items |
| **Team** | pm_interns, pm_intern_kpis, pm_weekly_performance, pm_intern_rankings | 4 | ✅ |
| **Audit** | admin_audit_logs | 1 | ✅ |
| **Migration** | migration_runs, migration_items, migration_mappings, migration_logs | 4 | ⚠️ Có thể orphaned sau khi migrate xong |
| **System** | Medusa core tables | ~30 | ✅ Medusa managed |

### 2.2 Phát hiện Duplicate / Orphan

#### ⚠️ CRITICAL: ai_content_generation_logs TRÙNG với content_generation_logs

```
ai_content_generation_logs
  id, content_item_id, provider, model_name, request_payload, response_text,
  tokens_used, latency_ms, error_message, created_at

content_generation_logs (trong migration-master.sql)
  id, content_item_id, provider, model_name, request_payload, response_text,
  tokens_used, latency_ms, error_message, created_at
```

**Cả 2 bảng lưu cùng dữ liệu.** Một trong 2 phải được loại bỏ sau khi xác minh không còn dùng.

#### ⚠️ ai_settings — Bảng cũ, không dùng nữa

`ai_settings` lưu provider_id FK nhưng cấu hình đã chuyển sang `ai_provider_runtime_configs`. Bảng `ai_settings` không còn được dùng trong code — chỉ có seed data.

#### ⚠️ ai_routing_rules — Bảng thừa

Tạo trong migration-master.sql nhưng hệ thống dùng `ai_task_routes`. `ai_routing_rules` không có code nào references.

#### ⚠️ media_prompts — Trùng concept với pm_media_workflows

`media_prompts` (content module) lưu AI image prompts. `pm_media_workflows` (workspace) cũng có `ai_prompt` và `ai_generated_content`. Cùng dữ liệu, 2 nơi.

#### ⚠️ migration tables — Có thể orphaned

`migration_runs`, `migration_items`, `migration_mappings`, `migration_logs` là bảng tạm cho quá trình migrate từ WordPress/WooCommerce. Sau khi migrate xong, có thể archive hoặc giữ lại cho audit.

#### ⚠️ ai_settings FK đến ai_providers

```sql
ai_settings.provider_id → ai_providers(id)
```
Đây là legacy. `ai_settings` nên được soft-deprecate và không dùng trong code.

### 2.3 Inconsistent Naming

| Vấn đề | Chi tiết |
|---|---|
| `ai_task_routes` | Dùng `provider_type` (string slug) + `primary_provider_id` (FK). Nên chỉ dùng FK |
| `pm_*` prefix | Một số bảng dùng `pm_` prefix (workspace), một số không (ai_*, content_*) |
| `is_active` vs `status` | `ai_providers` có cả 2; `pm_projects` chỉ có `status` |
| `publish_channels` | Bảng content nhưng channel codes trùng với `pm_campaigns.channels TEXT[]` |

---

## PHẦN 3 — TARGET ARCHITECTURE

### 3.1 Vision

```
Workspace-Centric Architecture
├── User → Workspace Dashboard (single entry)
├── Projects → Campaigns → Tasks (pipeline)
├── Content → Generated from Tasks → Approved → Published
├── AI → Embedded Assistant (not a standalone module)
└── Media → Part of Content Workflow
```

### 3.2 Data Flow mới

```
Task được tạo
    ↓
Content Intern nhận task
    ↓
Nút "AI Assist" ở trong task detail
    ↓
AI Generate nội dung (caption, hook, SEO title...)
    ↓
Nội dung được chèn vào task (comment hoặc asset)
    ↓
Task được review → approved
    ↓
Publish lên channel (Facebook, Zalo, TikTok...)
```

### 3.3 AI là Embedded Assistant

AI không còn module riêng trên menu. Thay vào đó:

| Vị trí | AI Feature |
|---|---|
| Task Detail → AI Assist tab | Generate caption, hook, SEO title, rewrite |
| Content Item → AI toolbar | Regenerate, translate, shorten, expand |
| Media Workflow → AI Generate | Image prompt generation |
| Campaign → AI Brief | Generate campaign brief, ideas |
| Intern KPI → AI Summary | Auto-summarize weekly performance |

### 3.4 Workspace Dashboard (Single Entry)

Thay vì 3 entry points (Dashboard, Workspace, Activity), chỉ cần 1:

```
┌─ Quick Stats ──────┐  ┌─ My Tasks ───────────────┐
│ Tasks: 12          │  │ ▢ Viết bài FB (due today)│
│ Pending: 5        │  │ ▢ Review video (overdue)  │
│ Published: 23      │  │ ▢ Edit banner (in progress)│
└───────────────────┘  └────────────────────────────┘
┌─ Recent Activity ───────────────────────────────┐
│ 🟢 An completed "Bài viết Summer Sale"         │
│ 🟡 Minh submitted "Video review" for review     │
│ 🔴 Task "SEO gaming" is overdue 2 days          │
└────────────────────────────────────────────────┘
```

---

## PHẦN 4 — ROUTE & API MAPPING

### 4.1 Route Consolidation Map

| Current Route | Target Route | Action |
|---|---|---|
| `/workspace` | `/dashboard` | Redirect |
| `/workspace/activity` | `/dashboard?tab=activity` | Merge |
| `/workspace/calendar` | `/dashboard?tab=calendar` | Merge |
| `/content/generate` | `/tasks/[id]/generate` | Move vào task |
| `/content/library` | `/content` | Rename |
| `/content/calendar` | `/workspace/calendar` | Move vào workspace |
| `/content/settings` | `/workspace/ai-config` hoặc `/settings/ai` | Move ra khỏi content |
| `/content/templates` | `/workspace/templates` | Move vào workspace |
| `/content/media-prompts` | `/workspace/media` | Move vào workspace |
| `/staff/interns` | `/team/interns` | Move vào Team |
| `/tasks/kanban` | `/tasks?view=kanban` | Merge |

### 4.2 API Consolidation Map

| Current API | Target API | Action |
|---|---|---|
| `/api/content/generate` | `/api/tasks/[id]/generate` | Move vào task |
| `/api/content/items` | `/api/content` | Rename |
| `/api/content/templates` | `/api/workspace/templates` | Move |
| `/api/ai/generate/stream` | `/api/ai/generate` (keep streaming) | Consolidate |
| `/api/ai/resolve-routing` | Internal function | Remove endpoint, inline |
| `/api/workspace/activity` | `/api/activity` | Rename |

---

## PHẦN 5 — AI REPOSITION STRATEGY

### 5.1 Từ Module sang Assistant

**TRƯỚC**:
```
AI Studio (navigation section)
├── AI Settings
├── AI Routing  
├── Phong cách nội dung
├── Prompt Templates
└── Playground
```

**SAU**:
```
AI embedded trong workflow
├── Task Detail → AI Assist panel
├── Content Item → AI toolbar
├── Campaign → AI Brief button
└── Settings → AI Configuration (ở cuối cùng)
```

### 5.2 AI Configuration

Giữ `/settings/ai` hoặc `/workspace/ai` cho:
- Provider management (AI Connections)
- Routing configuration
- Prompt Templates (nếu cần)
- Brand Voice

Nhưng **KHÔNG** hiển thị trên main navigation. User truy cập khi cần.

### 5.3 AI Features Embedding Points

| Workflow Step | AI Feature | Implementation |
|---|---|---|
| Task created | AI suggest content type | Inline button |
| Task in progress | Generate caption | AI Assist tab |
| Task needs review | Auto-tag, SEO check | Inline |
| Content approved | Generate thumbnail prompt | AI Assist tab |
| Publishing | Cross-post to channels | AI toolbar |
| Campaign planning | AI generate campaign brief | Campaign page button |

---

## PHẦN 6 — NEW MENU DESIGN

### 6.1 Target Menu Structure

```
📊 Dashboard          → /dashboard          (entry point)
├─ Today's Tasks      → /dashboard?tab=tasks
├─ Activity Feed      → /dashboard?tab=activity
└─ Quick Stats        → /dashboard?tab=stats

📁 Projects          → /projects
├─ [Project Name]     → /projects/[id]
│  ├─ Campaigns       → /projects/[id]/campaigns
│  ├─ Tasks           → /projects/[id]/tasks
│  ├─ Content         → /projects/[id]/content
│  └─ Reports         → /projects/[id]/reports
└─ [+ New Project]

📋 Campaigns         → /campaigns
├─ [Campaign Name]    → /campaigns/[id]
│  ├─ Tasks           → /campaigns/[id]/tasks
│  └─ Analytics      → /campaigns/[id]/analytics
└─ [+ New Campaign]

📝 Tasks              → /tasks
├─ Kanban View        → /tasks?view=kanban
├─ List View          → /tasks?view=list
└─ Calendar View      → /tasks?view=calendar

📄 Content            → /content
├─ [Content Item]     → /content/[id]
└─ Media Library       → /content/media

📅 Calendar           → /calendar
📊 Reports            → /reports

─────────────────────────────────────────
👥 Team               → /team
├─ Members            → /team/members
├─ Interns            → /team/interns
├─ Roles & Permissions → /team/roles
└─ KPIs               → /team/kpis

🛒 Hàng hóa          → /products
├─ Sản phẩm          → /products
├─ Danh mục           → /products/categories
├─ Thương hiệu        → /products/brands
└─ Thuộc tính         → /products/attributes

⚙️ Settings
├─ AI Configuration   → /settings/ai
├─ Publish Channels   → /settings/channels
├─ Notifications      → /settings/notifications
└─ System            → /settings/system
```

### 6.2 So sánh Before/After

| Metric | Before | After |
|---|---|---|
| Main nav sections | 9 | 8 |
| Total nav items | 59+ | ~35 |
| Entry points cho content | 3 (Content, AI Studio, Workspace) | 1 (Content) |
| Entry points cho workspace | 3 (Workspace, Dashboard, Projects) | 1 (Dashboard) |
| AI visible on nav | Yes (5 items) | No (embedded) |
| Duplicate routes | 10+ | 0 |
| Orphan pages | 4+ | 0 |

---

## PHẦN 7 — MIGRATION ROADMAP

### Phase A: Soft Deprecate Old Navigation (Safe — Frontend only)

1. Thêm redirect từ `/workspace` → `/dashboard`
2. Thêm redirect từ `/workspace/activity` → `/dashboard?tab=activity`
3. Thêm redirect từ `/workspace/calendar` → `/calendar`
4. Thêm redirect từ `/content/generate` → `/tasks`
5. Hide old menu items bằng feature flag hoặc xóa khỏi `navigation.ts`

**Tác động**: Không ảnh hưởng DB, không ảnh hưởng API.

### Phase B: Merge Routes (Safe — Code refactor)

1. Merge `workspace/page.tsx` vào `dashboard/page.tsx`
2. Merge `workspace/activity/page.tsx` vào `dashboard/page.tsx` (tab)
3. Merge `workspace/calendar/page.tsx` vào `/calendar`
4. Rename `content/library` → `content`
5. Move `content/settings` → `/settings/ai`
6. Move `content/templates` → `/workspace/templates`
7. Move `content/media-prompts` → `/workspace/media-prompts`
8. Move `staff/interns` → `/team/interns`

**Tác động**: URL changes cần redirect 301.

### Phase C: Merge Services (Medium risk)

1. Merge Medusa clients:
   - Identify overlapping methods
   - Keep `services/medusa-api.service.ts` (cleaner)
   - Deprecate methods in `services/medusa.service.ts`
2. Merge AI routing:
   - Keep `lib/ai/routing-engine.ts` (P7.1.4 stable)
   - Deprecate `lib/routing-legacy.ts`
   - Update all references
   - Remove legacy file
3. Merge AI generation:
   - Keep `lib/ai/generation-service.ts`
   - Deprecate `lib/content/ai/generator.ts`
   - Update all references

**Tác động**: Cần test kỹ tất cả AI generation flows.

### Phase D: Remove Old APIs (After verify no usage)

1. Verify no client references to old APIs
2. Remove legacy endpoint wrappers
3. Remove unused API routes (sau khi verify)
4. Update API documentation

**Tác động**: Không ảnh hưởng nếu đã verify kỹ.

### Phase E: Database Cleanup (After Phase D)

1. Backup database trước
2. Verify `ai_content_generation_logs` không còn dùng
3. Archive hoặc drop `ai_content_generation_logs` table
4. Verify `ai_routing_rules` không còn dùng
5. Archive hoặc drop `ai_routing_rules` table
6. Verify `ai_settings` không còn references
7. Mark `ai_settings` as deprecated (giữ lại data, không dùng)
8. Archive migration tables nếu không cần

**Tác động**: DB write — CẦN BACKUP TRƯỚC.

---

## PHẦN 8 — SAFETY VERIFICATION CHECKLIST

### KHÔNG ĐƯỢC LÀM

| Action | Lý do |替代方案 |
|---|---|---|
| Xóa `ai_providers` table | System data, routing references | Giữ lại |
| Xóa `ai_task_routes` table | Active routing config | Giữ lại |
| Xóa `content_items` table | Production content data | Giữ lại |
| Xóa `pm_tasks` table | Active task data | Giữ lại |
| Xóa Medusa tables | E-commerce core | Không đụng đến |
| Xóa `migration_*` tables | Có thể cần audit | Giữ lại |
| Sửa API route handler signature | Có thể break clients | Deprecate + redirect |

### CÓ THỂ AN TOÀN

| Action | Điều kiện | Notes |
|---|---|---|
| Drop `ai_content_generation_logs` | Verify không có INSERT/SELECT từ code | Cần 2 reviewer approve |
| Drop `ai_routing_rules` | Verify không có code references | Cần grep toàn bộ codebase |
| Drop `ai_settings` FK references | Verify không dùng trong API | Safe — đã orphaned |
| Rename navigation items | Frontend only, URL redirect | Safe |
| Move pages giữa route groups | URL redirect 301 | Safe |
| Merge Zustand stores | Keep same state shape | Test kỹ |

### Verify Commands

```bash
# Check if ai_content_generation_logs is used anywhere
rg "ai_content_generation_logs" apps/admin-ui/
rg "ai_routing_rules" apps/admin-ui/
rg "ai_settings" apps/admin-ui/

# Check if old routes are referenced
rg "/workspace" apps/admin-ui/app/
rg "/content/generate" apps/admin-ui/app/

# Check Medusa service overlap
rg "medusa\.service\.ts" apps/admin-ui/
rg "medusa-api\.service\.ts" apps/admin-ui/
```

---

## PHẦN 9 — FINAL FINDINGS SUMMARY

### A. Thứ đang dùng thật
- `pm_tasks`, `pm_projects`, `pm_campaigns` — core workspace
- `ai_providers`, `ai_task_routes`, `ai_brand_voices`, `ai_prompt_rules` — AI config
- `content_items`, `content_templates`, `content_schedules` — content pipeline
- `pm_media_workflows` — media workflow
- `pm_interns`, `pm_intern_kpis` — team management
- Zustand stores, React Query hooks
- API routes dưới `/api/tasks/`, `/api/projects/`, `/api/campaigns/`

### B. Thứ duplicate
- `ai_content_generation_logs` vs `content_generation_logs` — cùng schema
- `media_prompts` vs `pm_media_workflows.ai_prompt` — cùng dữ liệu
- `workspace/page.tsx` vs `dashboard/page.tsx` — cùng dữ liệu
- `lib/ai/routing-engine.ts` vs `lib/routing-legacy.ts` — cùng chức năng
- `services/medusa.service.ts` vs `services/medusa-api.service.ts` — client trùng

### C. Thứ deprecated (cần remove sau khi verify)
- `ai_content_generation_logs` table
- `ai_routing_rules` table
- `ai_settings` table (giữ data, bỏ code references)
- `lib/routing-legacy.ts`
- `lib/content/ai/generator.ts`

### D. Thứ orphan (cần investigate)
- `migration_*` tables — cần hay không?
- `pm_status_history` — có dùng không?
- `publish_channels` — có trùng với campaign channels không?

### E. Thứ có thể merge
- Dashboard + Workspace Activity → Single Dashboard
- Medusa clients → Single client
- AI routing engines → Single routing engine
- Content generate page → AI Assist tab in Task Detail
- `ai_settings` → inline vào `ai_providers`

### F. Thứ phải giữ
- `ai_providers`, `ai_task_routes`, `ai_brand_voices`, `ai_prompt_rules`, `ai_safety_rules`
- `content_items`, `content_templates`, `content_schedules`
- `pm_projects`, `pm_campaigns`, `pm_tasks`, `pm_media_workflows`
- `pm_interns`, `pm_intern_kpis`, `pm_weekly_performance`
- `admin_audit_logs`
- All Medusa tables

---

## RECOMMENDED EXECUTION ORDER

1. **P8.1** — Soft deprecate old navigation (Phase A)
2. **P8.2** — Merge routes + URL redirects (Phase B)
3. **P8.3** — Merge AI routing services (Phase C)
4. **P8.4** — Merge Medusa clients (Phase C)
5. **P8.5** — Embed AI into task workflow (Phase E foundation)
6. **P8.6** — Remove deprecated APIs (Phase D)
7. **P8.7** — Database cleanup (Phase E)
8. **P8.8** — Full integration test

---

## READINESS

**Có thể bắt đầu P8.1**: ✅ YES

Phase A (Soft Deprecate) là frontend-only, không ảnh hưởng DB hoặc API. An toàn nhất để bắt đầu.

**Điều kiện tiên quyết cho Phase C+**:
- Grep toàn bộ codebase để verify không còn references
- Backup database trước mỗi phase DB write
- Test đầy đủ sau mỗi phase
