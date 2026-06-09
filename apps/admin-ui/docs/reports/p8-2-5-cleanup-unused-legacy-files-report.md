# P8.2.5 — Clean Up Unused Legacy Files Report

**Phase:** P8.2.5
**Date:** 2026-05-28
**Status:** ✅ COMPLETED

---

## 1. Files Audited

### 1.1 `lib/routing-legacy.ts`

| Check | Result |
|---|---|
| Direct imports | ❌ 0 import sites |
| Re-exported by `lib/ai-routing.ts` | ✅ Yes |
| Re-exported by `lib/ai/routing-engine.ts` | ✅ Yes (lines 477-485) |
| Barrel exports (index.ts) | ❌ No barrel index.ts |
| Active usage | ❌ None — only re-exported |

**Action:** Deleted after removing re-export block from `routing-engine.ts`

### 1.2 `lib/ai-routing.ts`

| Check | Result |
|---|---|
| Direct imports | ❌ 0 import sites |
| Is itself a barrel/index file | ✅ Yes (re-exports routing-engine + routing-legacy) |
| Active usage | ❌ None — dead barrel |

**Action:** Deleted (it was only a barrel re-export with no consumers)

### 1.3 `lib/content/ai/generator.ts`

| Check | Result |
|---|---|
| Direct imports | ❌ 0 import sites |
| Re-exported by barrel | ❌ No |
| `generateContent` function references | Only in `lib/ai/generation-service.ts` and `app/api/content/generate/route.ts` — these use `generateContentWithRouting` from `generation-service.ts`, NOT `generateContent` from `generator.ts` |
| Active usage | ❌ None |

**Action:** Deleted

---

## 2. Import Scan Result

| Pattern | Matches |
|---|---|
| `from "@/lib/routing-legacy"` | 0 (only itself + re-exporters) |
| `from "@/lib/ai-routing"` | 0 |
| `from "@/lib/content/ai/generator"` | 0 (only in doc reports) |
| `from "@/lib/ai/generateContent"` | 0 (only `generateContentWithRouting`) |

**Barrel exports checked:**
- `lib/ai/index.ts` — does not exist
- `lib/content/ai/index.ts` — does not exist
- `lib/content/index.ts` — does not exist

**No barrel exports reference any of the 3 deleted files.**

---

## 3. Files Deleted

| File | Size | Reason |
|---|---|---|
| `lib/routing-legacy.ts` | 9,977 bytes | Not imported; only re-exported by dead barrel files |
| `lib/ai-routing.ts` | 630 bytes | Dead barrel; not imported anywhere |
| `lib/content/ai/generator.ts` | 13,514 bytes | `generateContent` function not called by any active route |

**Total: 24,121 bytes removed**

**Additional file modified:**
- `lib/ai/routing-engine.ts` — removed re-export block (lines 476-485) that referenced `routing-legacy.ts`

---

## 4. Build Verification

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ Pass (exit code 0) |
| Next.js Build (`pnpm run build`) | ✅ Pass (exit code 0) |
| 102 routes compiled | ✅ All routes present |

### Routes verified intact:

**AI Engine:**
- `/api/ai/providers` ✅
- `/api/ai/providers/[id]` ✅
- `/api/ai/generate/stream` ✅
- `/api/ai/task-assistant` ✅
- `/api/ai/resolve-routing` ✅
- `/api/ai/settings/test` ✅
- `/api/ai/brand-voices` ✅

**Content:**
- `/api/content/generate` ✅
- `/api/content/templates` ✅
- `/api/content/items` ✅

**All 68 API routes listed in build output ✅**

---

## 5. Remaining Risk

### 5.1 `lib/content/ai/generator.ts` — `getSettings` dependency

`generator.ts` imported `getSettings` from `lib/content/db/settings.ts`. This import was removed with the file. `settings.ts` is still used by `app/api/ai/settings/route.ts`, so this is **not a risk**.

### 5.2 `lib/routing-legacy.ts` — Types referenced elsewhere

`routing-legacy.ts` exported types:
- `RoutingContext`
- `RoutingDecision`
- `AIGeneratedStrategy`

These were re-exported via `ai-routing.ts` and `routing-engine.ts`. Both re-exporters are now deleted, so no consumers remain. Any future code that needs these types should use types from `lib/ai/routing-engine.ts` (`ResolvedRouting`, `AIRoutingStrategy`, `AIGeneratorTask`) instead.

### 5.3 `lib/routing-legacy.ts` — Functions referenced elsewhere

`routing-legacy.ts` exported functions:
- `routeToModel` — replaced by `getEffectiveModel` in routing-engine
- `getModelLabel` — replaced by `getEffectiveModelLabel` in routing-engine
- `getProviderLabel` — replaced by `getProviderDisplayName` in routing-engine

All callers were migrated during P7.1.x phases. The new canonical functions are in `lib/ai/routing-engine.ts`.

---

## 6. P8.2 Readiness After P8.2.5

| Phase | Status | Notes |
|---|---|---|
| **P8.2.1** (providers.ts deprecation) | ✅ COMPLETED | providers.ts deleted |
| **P8.2.5** (unused legacy files) | ✅ COMPLETED THIS | 3 files deleted |
| **P8.2.2** (Medusa service merge) | ⏸️ SKIP | Not critical |
| **P8.2.3** (Drop deprecated workspace tables) | ✅ READY | Tables verified empty-ready |
| **P8.2.4** (Consolidate ai_settings) | ⏸️ LOW PRIORITY | 1 API route; not blocking |

### Recommended next step: P8.2.3 (Drop Deprecated Workspace Tables)

Tables ready to drop (after verifying 0 rows in production DB):

```sql
SELECT COUNT(*) FROM pm_media_workflows;  -- Must be 0
SELECT COUNT(*) FROM pm_workflow_stages;   -- Must be 0
SELECT COUNT(*) FROM pm_workflow_comments; -- Must be 0
SELECT COUNT(*) FROM pm_ai_suggestions;  -- Must be 0
```

If all return 0:
```sql
DROP TABLE pm_media_workflows;
DROP TABLE pm_workflow_stages;
DROP TABLE pm_workflow_comments;
DROP TABLE pm_ai_suggestions;
```

Risk: **LOW** — confirmed deprecated by migration 008.

---

## 7. Summary

| Metric | Value |
|---|---|
| Files audited | 3 |
| Files deleted | 3 |
| Re-export blocks removed | 1 (`routing-engine.ts`) |
| TypeScript errors | 0 |
| Build warnings (new) | 0 |
| Routes broken | 0 |
| Bytes removed | ~24 KB |
