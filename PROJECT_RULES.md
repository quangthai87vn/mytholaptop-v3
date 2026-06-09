# PROJECT_RULES.md — Development Rules

## Data Sources

### No Hardcoded Values
- **Task status** — Load from `pm_master_data` where `category = 'task_status'`
- **Task type** — Load from `pm_master_data` where `category = 'task_type'`
- **Platform/channel** — Load from `pm_master_data` where `category = 'channel'`
- **Campaign type** — Load from `pm_master_data` where `category = 'campaign_type'`
- **Campaign status** — Load from `pm_master_data` where `category = 'campaign_status'`
- **Workflow stage** — Load from `pm_master_data` where `category = 'workflow_stage'`

All combobox, select, and filter data must come from `getMasterDataItems(category)` in `lib/workspace/db/index.ts`. Never create parallel static arrays for dropdown options.

### Database Operations
- All create/edit/delete/archive operations must persist to PostgreSQL.
- Use the functions in `lib/workspace/db/index.ts` for data access.
- Do not write raw SQL in API routes — use the DB layer functions.
- Do not modify the `apps/backend-ui` directory.

## UI Components

### Shadcn/UI
- Use shadcn/ui components from `@/components/ui/*`.
- Import from the component registry, not from Radix directly.
- When adding new shadcn components, run `npx shadcn@latest add <component>`.

### Dialogs and Confirmations
- **Do not use** `window.confirm()` or `window.alert()`.
- Use shadcn `AlertDialog` for destructive actions (delete, archive).
- Use shadcn `Dialog` for create/edit forms.
- Use shadcn `Sheet` (drawer) for side panels.

## Permissions

### Role Hierarchy
| Role | Access |
|------|--------|
| `super_admin` | Full control — all modules |
| `admin` | Full operational control — workspace, projects, campaigns, tasks, AI, reports |
| `editor` | Content/workspace management — no system config |
| `intern` | View/edit assigned tasks or self-created tasks only |
| `viewer` | Read-only access |

### Intern Restrictions
- Can only view tasks where `assignee_ids` includes their user ID or `created_by` is themselves.
- Can edit assigned tasks — cannot edit approved/completed tasks.
- Cannot delete any tasks.
- Cannot access admin-only pages (settings, staff management).
- Intern role check: `user.role === 'intern'` in server components.

### Approved/Completed Task Locking
- Tasks with status `completed` or `approved` must be locked for editing by non-admin users.
- Admin/Super Admin can still unlock and edit.
- Locking is enforced on both API and UI — hide edit controls, reject API writes.

## Code Architecture

### File Boundaries
- All frontend UI work happens in `apps/admin-ui/`.
- Server components for data fetching (`page.tsx`).
- Client components for interactivity (`*-client.tsx` or `use client`).
- DB functions in `lib/workspace/db/index.ts`.
- Shared types in `lib/workspace/types*.ts`.

### Import Conventions
- Use `@/` path alias for imports from `apps/admin-ui/`.
- DB functions are server-only — never import in client components directly.
- API routes handle the client-to-DB bridge.

### State Management
- Use React `useState`/`useCallback` for local component state.
- Use URL search params for shareable filter state.
- API calls go through `adminFetch()` utility.
- Avoid prop-drilling — use context for widely shared state.

## Kanban Board

- Single `KanbanCard` component used in all columns.
- Action menu always renders inside `KanbanCard` — never conditionally hide the button.
- Use `DropdownMenu` from shadcn with `DropdownMenuPrimitive.Portal`.
- Menu z-index must be higher than card `overflow:hidden` context.
- Drag/drop uses HTML5 native DnD — `setTasks` must merge with full task object, never replace.

## Calendar

- Default date is `new Date()` (current system date) — never hardcode.
- Load master data from server component, pass to client component.
- Events come from `getCalendarEvents()` in `lib/workspace/db/index.ts`.
- Week view must center on the current `currentDate` state, not month start.
- Stats counts come from `getCalendarStats()`.

## Naming Conventions

- Server pages: `app/(admin)/module/page.tsx`
- Client components: `app/(admin)/module/*-client.tsx`
- Shared UI: `components/module/*.tsx`
- DB functions: `lib/workspace/db/index.ts`
- Types: `lib/workspace/types*.ts`
