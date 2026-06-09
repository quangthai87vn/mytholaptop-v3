# P8.2.1 — Deprecate Legacy providers.ts Report

**Phase:** P8.2.1
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## 1. Import Sites Found

### 1.1 From `@/lib/content/db/providers`

| File | Functions Used | Notes |
|---|---|---|
| `app/api/ai/generate/stream/route.ts` | `getAllProviderCards`, `getDecryptedApiKey` | AI streaming generation |
| `app/api/ai/task-assistant/route.ts` | `getAllProviderCards`, `getDecryptedApiKey` | AI task assistant |
| `app/api/ai/brand-voices/route.ts` | *(imported but NOT used)* | Dead import |
| `app/api/content/generate/route.ts` | `getAllProviderCards` | Content generation |
| `lib/ai/generation-service.ts` | `getAllProviderCards`, `getDecryptedApiKey` | Generation pipeline |

**Total: 4 active import sites + 1 dead import**

### 1.2 Note: `createAIProvider` vs database CRUD

`lib/content/ai/providers.ts` exports `createAIProvider` (runtime factory for AI instances). This is **different** from `lib/content/db/providers.ts` (database CRUD). The runtime factory is not affected by this deprecation.

---

## 2. Function Comparison

### `providers.ts` (legacy) vs `provider-service.ts` (canonical)

| Function | providers.ts | provider-service.ts | Status |
|---|---|---|---|
| `getAllProviders()` | ✅ Simple query, no schema detection | ✅ Full schema detection, filters, join runtime_config | **Replaced** |
| `getAllProviderCards()` | ✅ Maps to ProviderCard shape | ❌ **Missing** — added as `getAllProviderCardsLegacy()` | **Added** |
| `getProviderById()` | ✅ Basic | ✅ With runtime_config join | **Replaced** |
| `getProviderByType()` | ✅ By `provider` column | ✅ By `provider` column | **Replaced** |
| `createProvider()` | ✅ Old schema | ✅ Schema-aware (old/new) | **Replaced** |
| `updateProvider()` | ✅ Basic | ✅ Schema-aware + API key update | **Replaced** |
| `setActiveProvider()` | ✅ | ✅ (as `activateProvider`/`deactivateProvider`) | **Replaced** |
| `getDecryptedApiKey(id)` | ✅ | ✅ By ID | **Replaced** |
| `getDecryptedApiKey(id, type)` | ✅ Supports fallback by type | ❌ Only by ID — added as `getDecryptedApiKeyLegacy()` | **Added** |

### Functions Added to `provider-service.ts`

| Function | Purpose |
|---|---|
| `getAllProviderCardsLegacy()` | Bridge: maps `AIProvider[]` → `ProviderCard[]` for legacy callers. Uses cache. |
| `getDecryptedApiKeyLegacy(id?, type?)` | Bridge: accepts `(id)` or `(undefined, type)` for backward compat. |
| `getDecryptedApiKeyByType(type)` | Decrypt API key by provider type string. |
| `getProviderByType(type)` | Get provider by `provider` column. Re-exported for callers. |

---

## 3. Files Modified

| File | Change |
|---|---|
| `lib/content/db/provider-service.ts` | Added 4 bridge functions + `getCacheOrFetch` import |
| `lib/content/db/providers.ts` | **DELETED** |
| `app/api/ai/generate/stream/route.ts` | Import updated; usages updated |
| `app/api/ai/task-assistant/route.ts` | Import updated; usages updated |
| `app/api/content/generate/route.ts` | Import updated; usages updated |
| `lib/ai/generation-service.ts` | Import updated; usages updated |

---

## 4. providers.ts Deletion

**Status: DELETED** ✅

File `lib/content/db/providers.ts` (177 lines) has been deleted. Confirmed no remaining imports:

```
grep "@/lib/content/db/providers"     → 0 matches
grep "./providers" (relative)          → 0 matches (lib/content/ai/generator.ts imports from ./providers.ts which is a DIFFERENT file)
```

Note: `lib/content/ai/generator.ts` imports `createAIProvider` from `./providers` which is `lib/content/ai/providers.ts` (runtime factory), not the deleted database CRUD file.

---

## 5. Build Verification

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Pass (exit code 0) |
| Next.js Build (`pnpm run build`) | ✅ Pass (exit code 0) |
| 102 routes compiled | ✅ All routes present |
| API routes intact | ✅ All 68 API routes listed |

### Routes verified:
- `/api/ai/generate/stream` ✅
- `/api/ai/task-assistant` ✅
- `/api/ai/brand-voices` ✅
- `/api/content/generate` ✅
- `/api/ai/providers/[id]` ✅
- `/api/ai/providers` ✅
- `/api/ai/resolve-routing` ✅
- `/api/ai/settings/test` ✅

---

## 6. API Behavior Verification

| API | Behavior | Status |
|---|---|---|
| `GET /api/ai/providers` | Uses `provider-service.ts` `getAllProviders` | ✅ |
| `GET /api/ai/providers/[id]` | Uses `provider-service.ts` `getProviderById` | ✅ |
| `POST /api/ai/generate/stream` | Uses `getAllProviderCardsLegacy` + `getDecryptedApiKeyLegacy` | ✅ |
| `POST /api/ai/task-assistant` | Uses `getAllProviderCardsLegacy` + `getDecryptedApiKeyLegacy` | ✅ |
| `POST /api/content/generate` | Uses `getAllProviderCardsLegacy` | ✅ |
| `lib/ai/generation-service.ts` | Uses `getAllProviderCardsLegacy` + `getDecryptedApiKeyLegacy` | ✅ |
| `GET /api/ai/settings/test` | Uses `getDecryptedApiKey` from `provider-service.ts` | ✅ |

---

## 7. Architecture Summary After P8.2.1

```
lib/content/db/
├── provider-service.ts   ← CANONICAL (all AI Provider CRUD)
│   ├── getAllProviders, getProviderById, getProviderBySlug
│   ├── getActiveProviders, getProvidersByGroup, getDefaultProvider
│   ├── createProvider, updateProvider, deleteProvider
│   ├── activateProvider, deactivateProvider, setDefaultProvider
│   ├── toggleProviderStatus
│   ├── updateConnectionStatus
│   ├── getModelsByProvider, createModel, deleteModel
│   ├── getRuntimeConfig, saveRuntimeConfig
│   ├── getDecryptedApiKey (by id)
│   ├── getDecryptedApiKeyLegacy (by id OR type)
│   ├── getAllProviderCardsLegacy (→ ProviderCard[])
│   ├── checkProviderDelete, isProviderInUse
│   ├── getAllProviderGroups
│   └── getProviderWithDecryptedKey
├── brand-voices.ts       ← Canonical (brand voice CRUD)
├── templates.ts          ← Canonical (template CRUD)
├── content.ts            ← Canonical (content items)
├── logs.ts               ← Canonical (generation logs)
├── schedules.ts          ← Canonical (schedules)
├── prompts.ts            ← Canonical (media prompts)
├── system-prompts.ts     ← Canonical (system prompts)
├── prompt-rules.ts       ← Canonical (prompt rules)
├── safety-rules.ts       ← Canonical (safety rules)
├── task-routes.ts        ← Canonical (routing rules)
├── media-settings.ts     ← Canonical (media settings)
└── cache.ts              ← Shared cache utilities
```

---

## 8. P8.2 Next Steps Readiness

| Phase | Readiness | Notes |
|---|---|---|
| **P8.2.1** (providers.ts deprecation) | ✅ COMPLETE | providers.ts deleted, all callers migrated |
| **P8.2.2** (Medusa service merge) | ⏸️ SKIP this phase | Not critical — both services serve different purposes |
| **P8.2.3** (Drop deprecated workspace tables) | ✅ READY | Safe to proceed |
| **P8.2.4** (Consolidate ai_settings) | ⏸️ LOW PRIORITY | Only 1 API route uses it; not blocking |
| **P8.2.5** (Clean up unused legacy files) | ✅ READY | `lib/routing-legacy.ts`, `lib/content/ai/generator.ts` confirmed unused |

### Recommended next step: P8.2.5 (Clean up unused legacy files)

Files confirmed unused:
- `lib/routing-legacy.ts` — not imported anywhere
- `lib/content/ai/generator.ts` — not imported anywhere (has relative import of `createAIProvider` from `./providers` which is `lib/content/ai/providers.ts` — different file)

Risk: LOW — both confirmed orphaned.

### After P8.2.5: P8.2.3 (Drop deprecated workspace tables)

Tables ready to drop (after verifying 0 rows):
- `pm_media_workflows`
- `pm_workflow_stages`
- `pm_workflow_comments`
- `pm_ai_suggestions`

SQL to verify before drop:
```sql
SELECT COUNT(*) FROM pm_media_workflows;
SELECT COUNT(*) FROM pm_workflow_stages;
SELECT COUNT(*) FROM pm_workflow_comments;
SELECT COUNT(*) FROM pm_ai_suggestions;
-- All must return 0 before dropping
```
