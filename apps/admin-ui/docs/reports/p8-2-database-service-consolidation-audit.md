# P8.2 — Database & Service Consolidation Audit Report

**Phase:** P8.2 (Audit only — no code changes)
**Date:** 2026-05-28
**Context:** P8.1.x completed menu/route/permission consolidation. This audit identifies duplicate tables, services, and APIs to plan safe consolidation in subsequent phases.

---

## 1. Database Architecture

### 1.1 Single Database Model

All workspace tables and Medusa schema tables coexist in the **same PostgreSQL database** (`mtl_medusa`).

```
DATABASE_URL (mtl_medusa)
├── Workspace schema (pm_* tables) — accessed via lib/db.ts query()
├── Medusa schema (products, categories, orders, ...) — accessed via Medusa HTTP API
└── Shared: admin_users, admin_sessions, app_settings
```

**Critical insight:** There is **no separate database** for Medusa. Products/categories/orders live in the Medusa backend (external HTTP API at `MEDUSA_BACKEND_URL`), accessed via `services/medusa.service.ts`. The admin-ui workspace tables (`pm_*`) are in the same PostgreSQL `mtl_medusa` DB.

**Services architecture:**
```
Admin-UI ←→ Medusa Backend (external HTTP API)
Admin-UI ←→ WooCommerce (external HTTP API)
Admin-UI ←→ PostgreSQL mtl_medusa (direct query)
```

---

## 2. All Tables

### 2.1 AI Tables (lib/content/db/)

| Table | Service | Schema Location | Status | Used By |
|---|---|---|---|---|
| `ai_providers` | `provider-service.ts` | migration-master.sql | **ACTIVE** | 17 API routes |
| `ai_provider_groups` | `provider-service.ts` | migration-master.sql | **ACTIVE** | 2 API routes |
| `ai_provider_models` | `provider-service.ts` | migration-master.sql | **ACTIVE** | 3 API routes |
| `ai_provider_runtime_configs` | `provider-service.ts` | migration-master.sql | **ACTIVE** | 2 API routes |
| `ai_brand_voices` | `brand-voices.ts` | migration-master.sql | **ACTIVE** | 4 API routes |
| `content_templates` | `templates.ts` | migration-master.sql | **ACTIVE** | 3 API routes |
| `content_items` | `content.ts` | migration-master.sql | **ACTIVE** | 6 API routes |
| `content_generation_logs` | `logs.ts` | migration-master.sql | **ACTIVE** | 4 API routes |
| `content_schedules` | `schedules.ts` | migration-master.sql | **ACTIVE** | 2 API routes |
| `media_prompts` | `prompts.ts` | migration-master.sql | **ACTIVE** | 1 API route |
| `publish_channels` | `prompts.ts` | migration-master.sql | **ACTIVE** | 1 API route |
| `ai_system_prompt_templates` | `system-prompts.ts` | migration-master.sql | **ACTIVE** | 3 API routes |
| `ai_prompt_rules` | `prompt-rules.ts` | migration-master.sql | **ACTIVE** | 2 API routes |
| `ai_safety_rules` | `safety-rules.ts` | migration-master.sql | **ACTIVE** | 2 API routes |
| `ai_task_routes` | `task-routes.ts` | migration-master.sql | **ACTIVE** | 3 API routes |
| `ai_media_settings` | `media-settings.ts` | migration-master.sql | **ACTIVE** | 1 API route |
| `ai_settings` | `settings.ts` | migration-master.sql | **ACTIVE (legacy)** | 1 API route |

### 2.2 Workspace Tables (lib/workspace/db/)

| Table | Purpose | Migration | Status |
|---|---|---|---|
| `pm_projects` | Projects (name, status, priority, budget) | 001 | **ACTIVE** |
| `pm_campaigns` | Marketing campaigns | 001 | **ACTIVE** |
| `pm_tasks` | Tasks (workflow, assignees, publish fields) | 002 | **ACTIVE** |
| `pm_task_comments` | Threaded task comments | 002 | **ACTIVE** |
| `pm_task_activities` | Task audit log | 002 | **ACTIVE** |
| `pm_status_history` | Status transitions | 002 | **ACTIVE** |
| `pm_media_workflows` | Media workflows | 003 | **DEPRECATED** |
| `pm_workflow_stages` | Workflow stages | 003 | **DEPRECATED** |
| `pm_workflow_comments` | Workflow comments | 003 | **DEPRECATED** |
| `pm_ai_suggestions` | AI suggestions | 003 | **DEPRECATED** |
| `pm_interns` | Intern profiles | 004 | **ACTIVE** |
| `pm_intern_kpis` | Weekly/monthly KPI metrics | 004 | **ACTIVE** |
| `pm_weekly_performance` | Performance reviews | 004 | **ACTIVE** |
| `pm_intern_rankings` | Computed rankings | 004 | **ACTIVE** |
| `pm_campaign_types` | Campaign type configs | 005 | **ACTIVE** |
| `pm_task_assets` | Media assets per task | 013 | **ACTIVE** |
| `pm_audit_logs` | Asset audit trail | 013 | **ACTIVE** |
| `pm_task_approvals` | Approval workflow | 014 | **ACTIVE** |
| `pm_notifications` | User notifications | 016 | **ACTIVE** |
| `admin_users` | Admin accounts | 011 | **ACTIVE** |
| `admin_sessions` | Session tokens | 011 | **ACTIVE** |
| `app_settings` | App config JSON | 011 | **ACTIVE** |
| `v_workspace_stats` | Stats view | 009 | **ACTIVE** |
| `v_campaign_stats` | Campaign stats view | 005 | **ACTIVE** |
| `v_kpi_overview` | KPI overview view | 017 | **ACTIVE** |
| `v_kpi_user_performance` | Per-user KPI view | 017 | **ACTIVE** |
| `v_workspace_activities` | Activity view | 019 | **ACTIVE** |

---

## 3. Duplicate Tables

### 3.1 Duplicate Table Candidates — NONE FOUND

| Candidate | Status |
|---|---|
| `brand_voices` vs `ai_brand_voices` | ❌ Only `ai_brand_voices` exists |
| `content_templates` vs `ai_system_prompt_templates` | ❌ Different purpose (user templates vs AI system prompts) |
| `content_drafts` vs `content_items` | ❌ Only `content_items` exists |
| `ai_content_generation_logs` vs `content_generation_logs` | ❌ Only `content_generation_logs` exists |
| `generation_logs` (standalone) | ❌ Only `content_generation_logs` exists |
| `ai_content_templates` vs `content_templates` | ❌ Only `content_templates` exists |

**No duplicate tables found in the database.**

---

## 4. Orphaned / No-API Tables

| Table | Status | Notes |
|---|---|---|
| `ai_settings` | **Legacy — low usage** | Only 1 API route uses it. Stores encrypted API key, brand_voice, prompt_rules. Newer AI uses `ai_providers` + `ai_provider_runtime_configs`. Kept for backward compat. |
| `pm_media_workflows` | **DEPRECATED** | Content merged to `pm_tasks`. Table kept for reference. |
| `pm_workflow_stages` | **DEPRECATED** | Workflow merged to `pm_tasks`. |
| `pm_workflow_comments` | **DEPRECATED** | No longer used. |
| `pm_ai_suggestions` | **DEPRECATED** | No longer used. |

---

## 5. Duplicate Services

### 5.1 `providers.ts` vs `provider-service.ts` ⚠️

Both files serve `ai_providers` table but with different implementations:

| Aspect | `lib/content/db/providers.ts` | `lib/content/db/provider-service.ts` |
|---|---|---|
| Schema | Old (no soft delete, no group_slug) | New (full schema: soft delete, group_slug, status, runtime_config join) |
| CRUD | Basic | Full with soft delete, group config |
| Connection status | No | Yes |
| Migration detection | No | Yes (auto-add missing columns) |
| Dependency check before delete | No | Yes |
| Encryption helpers | No | Yes |
| Used by | 4 API routes | 7 API routes |
| **Verdict** | **LEGACY — should deprecate** | **CANONICAL** |

Both imported by same routes:
- `app/api/ai/resolve-routing/route.ts`
- `app/api/ai/task-assistant/route.ts`

**Action needed:** Merge `providers.ts` into `provider-service.ts` (P8.2.1).

### 5.2 `medusa.service.ts` vs `medusa-api.service.ts` — NOT Duplicates

| Service | Lines | Purpose | Used By |
|---|---|---|---|
| `medusa.service.ts` | 2433 | Write/batch/transform + WooCommerce→Medusa migration | Proxy routes, sync, migration |
| `medusa-api.service.ts` | 907 | Read/list/admin browse operations | Product browse, dashboard stats |

**No overlap** — different methods, different use cases. Could be merged into one file for simplicity but not a critical issue.

---

## 6. API Routes — Duplicate Analysis

### 6.1 AI APIs

All AI API routes are canonical. No duplicates.

| Route | Purpose | Canonical |
|---|---|---|
| `GET/POST /api/ai/providers` | List/create providers | ✅ |
| `GET/PUT/DELETE/POST /api/ai/providers/[id]` | Provider CRUD + actions | ✅ |
| `GET/PUT /api/ai/providers/[id]/runtime-config` | Runtime config | ✅ |
| `GET/POST/DELETE /api/ai/providers/[id]/models` | Provider models | ✅ |
| `GET/POST/PUT /api/ai/providers/api-key` | API key management | ✅ |
| `GET/POST/DELETE /api/ai/brand-voices` | Brand voices | ✅ |
| `POST /api/ai/brand-voices/activate` | Activate voice | ✅ |
| `GET/PUT/POST/DELETE /api/ai/task-routes` | AI routing rules | ✅ |
| `GET/POST/PUT/DELETE /api/ai/system-prompts` | System prompt templates | ✅ |
| `GET/POST/DELETE/PATCH /api/ai/prompt-rules` | Prompt rules | ✅ |
| `GET/POST/DELETE/PATCH /api/ai/safety-rules` | Safety rules | ✅ |
| `GET/PUT /api/ai/settings` | AI settings | ✅ |
| `GET/PUT /api/ai/settings/all` | Unified AI config | ✅ |
| `POST /api/ai/settings/test` | Connection test | ✅ |
| `POST /api/ai/generate/stream` | Streaming generation | ✅ |
| `POST /api/ai/playground/chat` | Playground chat | ✅ |
| `POST /api/ai/task-assistant` | Task AI assistant | ✅ |
| `GET/POST /api/ai/resolve-routing` | Routing resolver | ✅ |
| `POST /api/ai/models/discover` | Model discovery | ✅ |
| `GET /api/ai/providers/catalog` | Provider catalog (static) | ✅ |

### 6.2 Legacy Files Not Used by Any API

| File | Status | Notes |
|---|---|---|
| `lib/routing-legacy.ts` | **Not used** | Kept for reference only |
| `lib/content/ai/generator.ts` | **Not used** | Old generator, replaced by `lib/ai/generation-service.ts` |

---

## 7. Canonical Service Mapping

### 7.1 AI Services (lib/content/db/)

| Canonical Service | Table(s) | Deprecate |
|---|---|---|
| `provider-service.ts` | `ai_providers`, `ai_provider_groups`, `ai_provider_models`, `ai_provider_runtime_configs` | `providers.ts` |
| `brand-voices.ts` | `ai_brand_voices` | — |
| `templates.ts` | `content_templates` | — |
| `content.ts` | `content_items` | — |
| `logs.ts` | `content_generation_logs` | — |
| `schedules.ts` | `content_schedules` | — |
| `prompts.ts` | `media_prompts`, `publish_channels` | — |
| `system-prompts.ts` | `ai_system_prompt_templates` | — |
| `prompt-rules.ts` | `ai_prompt_rules` | — |
| `safety-rules.ts` | `ai_safety_rules` | — |
| `task-routes.ts` | `ai_task_routes` | — |
| `media-settings.ts` | `ai_media_settings` | — |
| `settings.ts` | `ai_settings` | ✅ (legacy) |

### 7.2 AI Core Services (lib/ai/)

| Service | File | Canonical |
|---|---|---|
| Routing resolver | `lib/ai/routing-engine.ts` | ✅ |
| Generation pipeline | `lib/ai/generation-service.ts` | ✅ |
| Resolvers (brand/safety/prompt/system) | `lib/ai/generation-resolvers.ts` | ✅ |
| Provider factory | `lib/ai/provider-service.ts` | ✅ |

### 7.3 Medusa Services (services/)

| Service | Purpose | Merge? |
|---|---|---|
| `medusa.service.ts` (2433 lines) | Write/batch/transform + migration | Keep separate |
| `medusa-api.service.ts` (907 lines) | Read/list/admin browse | Merge into above |
| `woocommerce.service.ts` | WooCommerce fetch/validate | Keep separate |

---

## 8. Deprecated Tables — Safe to Delete Candidates

### 8.1 Safe to Delete (confirmed deprecated, no API dependencies)

| Table | Migration | Last Used | Notes |
|---|---|---|---|
| `pm_media_workflows` | 003 | Migration 008 confirmed merged | Verify zero records before delete |
| `pm_workflow_stages` | 003 | Migration 008 confirmed merged | Verify zero records before delete |
| `pm_workflow_comments` | 003 | Migration 008 confirmed merged | Verify zero records before delete |
| `pm_ai_suggestions` | 003 | Never used in P8.x | Verify zero records before delete |

### 8.2 Delete After Migration Verification

```sql
-- Run these before deleting:
SELECT COUNT(*) FROM pm_media_workflows;  -- Should be 0
SELECT COUNT(*) FROM pm_workflow_stages;   -- Should be 0
SELECT COUNT(*) FROM pm_workflow_comments;  -- Should be 0
SELECT COUNT(*) FROM pm_ai_suggestions;  -- Should be 0
```

---

## 9. Dangerous Delete Candidates

### 9.1 Do NOT Delete — Active Dependencies

| Table | Danger | Why |
|---|---|---|
| `ai_settings` | **HIGH** | Legacy but `app/api/ai/settings/route.ts` still reads from it. Check if `ai_providers` + `ai_provider_runtime_configs` fully covers this. |
| `providers.ts` | **MEDIUM** | Imported by 4 routes. Must migrate to `provider-service.ts` first. |
| `content/ai/generator.ts` | **LOW** | File not used but kept for reference. Safe to delete after confirming no imports. |

### 9.2 Check Before Deleting

```sql
-- ai_settings: check if all data is migrated to ai_providers
SELECT COUNT(*) FROM ai_settings WHERE key = 'api_key';
-- If > 0: migrate to ai_providers.api_key first

-- providers.ts: grep for any remaining imports before deleting
-- "from '@/lib/content/db/providers'"
```

---

## 10. Recommended P8.2 Execution Order

### P8.2.1 — Deprecate providers.ts
**Goal:** Remove legacy `providers.ts` duplication.

**Steps:**
1. Read `providers.ts` — note all functions and their signatures
2. Check if each function is already in `provider-service.ts`
3. If missing in `provider-service.ts`, add it
4. Update all import sites:
   - `app/api/ai/generate/stream/route.ts`
   - `app/api/ai/brand-voices/route.ts`
   - `app/api/content/generate/route.ts`
   - `lib/ai/generation-service.ts`
5. Run TypeScript + Build
6. Delete `providers.ts`
7. Run migration verification tests

**Risk:** MEDIUM — wrong import = broken AI generation

---

### P8.2.2 — Merge Medusa Services (Optional)
**Goal:** Combine `medusa.service.ts` and `medusa-api.service.ts` into one canonical file.

**Steps:**
1. Read both files
2. Merge into `services/medusa.service.ts`
3. Update import sites
4. TypeScript + Build

**Risk:** LOW — both already used correctly

**Alternative:** Keep as-is. Not critical for P8.2.

---

### P8.2.3 — Drop Deprecated Workspace Tables
**Goal:** Clean up deprecated tables after verifying no data.

**Steps:**
```sql
-- Verify no data first
SELECT COUNT(*) FROM pm_media_workflows;  -- Must be 0
SELECT COUNT(*) FROM pm_workflow_stages;   -- Must be 0
SELECT COUNT(*) FROM pm_workflow_comments; -- Must be 0
SELECT COUNT(*) FROM pm_ai_suggestions;  -- Must be 0

-- After verification, drop:
DROP TABLE pm_media_workflows;
DROP TABLE pm_workflow_stages;
DROP TABLE pm_workflow_comments;
DROP TABLE pm_ai_suggestions;
```

**Risk:** LOW — confirmed deprecated by migration 008

---

### P8.2.4 — Consolidate ai_settings (Optional)
**Goal:** Assess if `ai_settings` table can be deprecated.

**Steps:**
1. Check what `ai_settings` currently stores
2. Verify `ai_providers` + `ai_provider_runtime_configs` covers all settings
3. Migrate any remaining `ai_settings` data to new tables
4. Update `app/api/ai/settings/route.ts` to read from new tables
5. Drop `ai_settings` table

**Risk:** MEDIUM — affects AI settings API

---

### P8.2.5 — Clean Up Legacy Unused Files
**Goal:** Remove files not imported anywhere.

**Steps:**
1. Delete `lib/routing-legacy.ts` — confirmed not imported by any route
2. Delete `lib/content/ai/generator.ts` — confirmed not imported
3. Verify TypeScript + Build still pass

**Risk:** LOW — confirmed unused

---

## 11. Summary Table

| Category | Count | Action |
|---|---|---|
| AI tables (canonical) | 17 | Keep |
| Workspace tables (canonical) | 24 | Keep |
| Workspace deprecated tables | 4 | **Safe to delete** after verification |
| AI legacy tables | 1 (`ai_settings`) | Assess in P8.2.4 |
| Duplicate services | 1 (`providers.ts`) | **Deprecate in P8.2.1** |
| Duplicate Medusa services | 1 (potential merge) | Optional P8.2.2 |
| Duplicate tables | 0 | None found ✅ |
| Duplicate APIs | 0 | None found ✅ |
| Unused legacy files | 2 | Delete in P8.2.5 |
| Migration actions needed | 2 | P8.2.1 (providers.ts), P8.2.3 (drop deprecated tables) |

---

## 12. P8.2 Phase Readiness

| Phase | Risk | Effort | Priority |
|---|---|---|---|
| P8.2.1 Deprecate providers.ts | MEDIUM | Medium | HIGH |
| P8.2.2 Merge Medusa services | LOW | Low | OPTIONAL |
| P8.2.3 Drop deprecated workspace tables | LOW | Low | MEDIUM |
| P8.2.4 Consolidate ai_settings | MEDIUM | Medium | MEDIUM |
| P8.2.5 Clean up unused legacy files | LOW | Low | LOW |
