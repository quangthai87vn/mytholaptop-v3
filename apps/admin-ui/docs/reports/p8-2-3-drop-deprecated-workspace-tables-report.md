# P8.2.3 — Drop Deprecated Workspace Tables Report

**Phase:** P8.2.3
**Date:** 2026-05-28
**Status:** ✅ COMPLETED — 2 tables dropped safely

---

## 1. Summary

| Action | Result |
|--------|--------|
| Tables dropped | 2 |
| Tables preserved | 2 |
| Backup tables created | 2 |
| TypeScript | ✅ PASS |
| Next.js Build | ✅ PASS |

---

## 2. Audit Results

### 2.1 Tables Evaluated

| Table | Rows (Pre-drop) | Code Refs | Drop Decision |
|-------|----------------|-----------|-------------|
| `pm_workflow_comments` | 0 | 0 | ✅ **DROPPED** |
| `pm_ai_suggestions` | 0 | 0 | ✅ **DROPPED** |
| `pm_workflow_stages` | 18 | 1 function (`getWorkflowStages`) | ❌ **KEPT** |
| `pm_media_workflows` | 10 | 4 active CRUD functions | ❌ **KEPT** |

### 2.2 Why `pm_workflow_stages` Was NOT Dropped

- Has **18 rows** of data
- Has **1 active code reference**: `getWorkflowStages()` in `lib/workspace/db/index.ts`
- Has **FK constraint** from `pm_media_workflows` (`pm_workflow_stages_workflow_id_fkey`)
- FK chain: `pm_media_workflows` (kept) → `pm_workflow_stages` → `pm_tasks`
- **Risk if dropped:** Broken `getWorkflowStages()` → runtime errors → broken media workflow UI

### 2.3 Why `pm_media_workflows` Was NOT Dropped

- Has **10 rows** of data (referenced by `task_id` FK)
- Has **4 active CRUD functions** in `lib/workspace/db/index.ts`:
  - `getMediaWorkflows()` — lines 549–583
  - `getMediaWorkflowById()` — lines 591–597
  - `createMediaWorkflow()` — lines 605–643
  - `updateMediaWorkflow()` — lines 643–680
- API routes return `410 Gone` but **functions remain** in `lib/workspace/db/index.ts`
- The functions are **imported** by `app/api/media-workflow/route.ts`
- **Risk if dropped:** 500 errors if any code ever calls these functions directly

**Note:** `pm_media_workflows` and `pm_workflow_stages` are effectively deprecated (API returns 410 Gone, migration 008 merged data to `pm_tasks`) but cannot be safely dropped until:
1. The CRUD functions in `lib/workspace/db/index.ts` are removed
2. All rows are confirmed migrated/exported
3. FK constraints are reviewed

---

## 3. Dropped Tables

### 3.1 `pm_workflow_comments`

- **Rows:** 0 (was empty)
- **Schema:** UUID primary key, FK to `pm_media_workflows`, author info, content
- **Code refs:** None (no imports anywhere in codebase)
- **Migration file:** `sql/workspace/003_media_workflow.sql` (line 85–98)
- **Drop SQL:** `DROP TABLE IF EXISTS pm_workflow_comments`
- **Backup table:** `_backup_pm_workflow_comments` (0 rows)

### 3.2 `pm_ai_suggestions`

- **Rows:** 0 (was empty)
- **Schema:** UUID primary key, FK to `pm_media_workflows` and `pm_tasks`, suggestion content, AI model
- **Code refs:** None (no imports anywhere in codebase)
- **Migration file:** `sql/workspace/003_media_workflow.sql` (line 102–116)
- **Drop SQL:** `DROP TABLE IF EXISTS pm_ai_suggestions`
- **Backup table:** `_backup_pm_ai_suggestions` (0 rows)

---

## 4. Files Created

| File | Purpose |
|------|---------|
| `sql/workspace/022_drop_deprecated_tables.sql` | Migration — drops 2 tables, creates backups |
| `sql/workspace/022_rollback_deprecated_tables.sql` | Rollback — restore schema + data from backups |
| `scripts/run-migration-022.js` | Node.js runner with pre/post checks |
| `scripts/check-deprecated-table-counts.js` | DB row count checker |
| `docs/reports/p8-2-3-drop-deprecated-workspace-tables-report.md` | This report |

---

## 5. Backup Strategy

### 5.1 Backup Method

Each dropped table was backed up as a `_backup_<table_name>` table in the same database before dropping. Both dropped tables had 0 rows, so the backups contain zero records.

### 5.2 Backup Location

All backups live in the same database (`mytholaptop`) as `_backup_*` prefixed tables:
- `_backup_pm_workflow_comments` — empty (0 rows)
- `_backup_pm_ai_suggestions` — empty (0 rows)

### 5.3 Additional Backup

For safety, a full DB dump is recommended before running drop in production:
```bash
pg_dump -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop \
  --format=custom \
  --file=backups/mytholaptop_2026-05-28_before_p8-2-3.sql
```

---

## 6. Rollback Plan

### 6.1 When to Rollback

- Any unexpected behavior in workspace/Tasks/Media Workflow after migration
- Data discovered in dropped tables (unlikely since both were 0 rows)
- Business requirement to restore `pm_workflow_comments` or `pm_ai_suggestions`

### 6.2 How to Rollback

```bash
psql -h postgresql.mtl.vn -p 7000 -U mytholaptop_user -d mytholaptop \
  -f sql/workspace/022_rollback_deprecated_tables.sql
```

Or via Node.js (no runner script needed — just run the SQL directly).

### 6.3 Rollback Verification

After rollback, verify:
```sql
SELECT COUNT(*) FROM pm_workflow_comments;  -- should be 0
SELECT COUNT(*) FROM pm_ai_suggestions;      -- should be 0
SELECT COUNT(*) FROM _backup_pm_workflow_comments;  -- should be 0
SELECT COUNT(*) FROM _backup_pm_ai_suggestions;    -- should be 0
```

---

## 7. Test Results

| Test | Result |
|------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Next.js Build | ✅ PASS |
| Workspace routes (`/workspace`, `/projects`, `/tasks`) | ✅ Unaffected (no refs to dropped tables) |
| Media Workflow UI (`/media-workflow`) | ✅ Unaffected (uses `pm_media_workflows` which was kept) |
| Tasks (`/tasks`) | ✅ Unaffected |
| Migration script pre-flight check | ✅ PASS |
| Migration execution | ✅ PASS |
| Post-migration verification | ✅ 6/6 checks pass |

---

## 8. Remaining Deprecated Tables (Not Dropped)

These tables are confirmed deprecated but cannot be safely dropped yet:

| Table | Rows | Reason to Keep |
|-------|------|---------------|
| `pm_media_workflows` | 10 | Active CRUD functions in `lib/workspace/db/index.ts`. API returns 410 Gone but functions remain. Remove functions first, then drop. |
| `pm_workflow_stages` | 18 | Active code (`getWorkflowStages`). FK from `pm_media_workflows`. Remove `getWorkflowStages` and verify all media workflows migrated, then drop. |

**Recommended next steps for these tables:**
1. Remove `getMediaWorkflows`, `getMediaWorkflowById`, `createMediaWorkflow`, `updateMediaWorkflow` from `lib/workspace/db/index.ts`
2. Remove `getWorkflowStages` from `lib/workspace/db/index.ts`
3. Verify all 10 rows in `pm_media_workflows` have been migrated to `pm_tasks`
4. Drop `pm_workflow_stages` (after dropping FK constraint)
5. Drop `pm_media_workflows` (last — no FK dependencies remain)

---

## 9. Risks

| Risk | Level | Mitigation |
|------|-------|-----------|
| `pm_workflow_stages` / `pm_media_workflows` accidentally dropped | LOW | Not touched — confirmed active code for both |
| FK cascade deletes breaking `pm_tasks` | NONE | FK uses `ON DELETE CASCADE` but dropped tables had no rows; remaining FKs checked |
| Someone adds code using dropped tables later | LOW | Both tables confirmed 0 code refs; if re-created they should be named differently |
| Rollback fails if schema changed | LOW | Schema restored exactly from migration 003; no custom data to lose |

---

## 10. Conclusion

**P8.2.3 completed successfully.** Two confirmed-empty, zero-code-reference tables (`pm_workflow_comments`, `pm_ai_suggestions`) were dropped with backups created. Two remaining deprecated tables (`pm_workflow_stages`, `pm_media_workflows`) were preserved because they have active database code or FK dependencies. The system is stable, TypeScript and Next.js Build both pass, and no workspace functionality is affected.
