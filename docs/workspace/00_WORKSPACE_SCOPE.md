# 00_WORKSPACE_SCOPE.md

## Scope Definition

This documentation covers only the **Workspace module** of `apps/admin-ui`.

### In Scope — Workspace Module

All development within these areas is documented and governed by this folder:

| Module | Path Pattern |
|--------|-------------|
| Projects | `app/(admin)/projects/**`, `components/projects/**` |
| Campaigns | `app/(admin)/campaigns/**`, `components/campaigns/**` |
| Tasks | `app/(admin)/tasks/**`, `components/tasks/**`, `components/kanban/**` |
| Calendar | `app/(admin)/workspace/calendar/**`, `app/(admin)/calendar/**` |
| Master Data | `app/(admin)/workspace/master-data/**` |
| Activity Log | `app/api/activity/**`, `components/activity/**` |
| User Assignment | Via task/project/campaign forms |
| Approval Flow | Via task status transitions + `pm_task_approvals` |
| Workspace Dashboard | `app/(admin)/workspace/**` |

### Out of Scope

**Do not develop these modules unless explicitly requested:**

| Module | Why Excluded |
|--------|-------------|
| Sales | Separate commerce module |
| Products | Separate product/PIM module |
| Customers | Separate CRM module |
| AI Settings | Separate AI engine module |
| POS | Point of sale module |
| Inventory | Separate stock module |

### Rule

When the user asks for a new feature, check the module first. If it belongs to an out-of-scope module, say so and ask for confirmation before proceeding.

If the user says "implement X" without specifying a module, assume Workspace module unless stated otherwise.

### File Boundaries

```
apps/admin-ui/
├── app/(admin)/
│   ├── projects/          ← Workspace: Projects
│   ├── campaigns/        ← Workspace: Campaigns
│   ├── tasks/            ← Workspace: Tasks + Kanban
│   ├── workspace/
│   │   ├── calendar/     ← Workspace: Calendar
│   │   ├── master-data/  ← Workspace: Master Data
│   │   └── activity/     ← Workspace: Activity Log
│   ├── content/          ← Workspace: Content (content management)
│   ├── media-workflow/   ← Workspace: Media Workflow (synced with Tasks)
│   └── settings/         ← Mixed: includes users/settings
├── components/
│   ├── projects/         ← Workspace
│   ├── campaigns/        ← Workspace
│   ├── tasks/            ← Workspace
│   ├── kanban/           ← Workspace
│   └── workspace/        ← Workspace misc
└── lib/
    └── workspace/
        ├── db/index.ts   ← Workspace DB functions (ONLY)
        └── types*.ts     ← Workspace shared types
```

### Exception: Shared Code

Files in `lib/` that are used by Workspace ARE workspace code:

- `lib/workspace/db/index.ts` — DB layer (workspace only)
- `lib/workspace/types*.ts` — Type definitions (workspace only)
- `lib/auth/` — Auth (used by all modules, do not modify)
- `lib/rbac/index.ts` — RBAC engine (used by all, modify carefully)
- `components/ui/` — Shadcn UI components (shared, add new ones only if workspace needs them)
