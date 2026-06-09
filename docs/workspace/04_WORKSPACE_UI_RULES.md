# 04_WORKSPACE_UI_RULES.md

## Component Architecture

### Rule: Server vs Client Components

```
page.tsx         → Server component (data fetching, auth check)
*-client.tsx     → Client component (useState, event handlers)
components/     → Reusable UI components (both server/client as needed)
```

### Data Fetching Pattern

```tsx
// app/(admin)/workspace/calendar/page.tsx (Server)
export default async function CalendarPage() {
  const masterData = await getMasterDataItems("task_status");
  return <CalendarClient masterData={masterData} />;
}

// app/(admin)/workspace/calendar/calendar-client.tsx (Client)
"use client";
export function CalendarClient({ masterData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  // ...
}
```

## UI Component Library

**Use shadcn/ui components from `@/components/ui/`:**
- `Button`, `Badge`, `Avatar` — universal
- `Dialog`, `Sheet` — for forms and drawers
- `AlertDialog` — for destructive confirmations (delete, archive)
- `DropdownMenu` — for card menus
- `Select`, `Combobox` — for filters and forms
- `Calendar` — from shadcn (date picker only, NOT for calendar board)
- `ScrollArea` — for scrollable card lists
- `Tabs` — for master data category switching
- `Toast` / `sonner` — for notifications

**Do NOT use:** `window.alert`, `window.confirm`, `window.prompt`

## Workspace Board Rules

### Current Direction
- Prefer a **single canonical Workspace board** for tasks and workflow-related work.
- `/tasks` is the main board; `/media-workflow` is deprecated and should not compete as the primary entry point.
- Reuse the most stable Kanban implementation pattern available in the Workspace area.

### KanbanCard
- One component used in ALL columns — no per-column variants
- Action menu `(...)` always rendered inside the card for actionable cards
- Menu z-index: `z-50`, card container: `relative`
- Card body must NOT have `overflow:hidden` — it clips the menu dropdown
- `DropdownMenuContent` must have `z-[100]` or higher
- Menu button: `onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}`
- Use a base card + action-enabled card composition for task board behavior

### KanbanColumn
- Receives `tasks: Task[]` — renders one Kanban card per task
- ScrollArea wraps the task list
- Empty state: "Chưa có công việc" with optional "+ Thêm" button

### Drag and Drop
- Use HTML5 native drag-and-drop (no external DnD library)
- `onDragStart`: store dragged task in state, set dataTransfer
- `onDrop`: call `performTaskMove` API, update local state by **merging** with full task object
- **Never replace** the task object with a partial `{ id, status }` — always `{ ...existingTask, status: newStatus }`
- When dragging: close any open dropdown, do not open QuickView drawer

### Task / Workflow Interaction Model
- Avoid separate top-level interaction systems for the same underlying task entity.
- Quick view, edit modal, copy/archive/delete, and workflow pipeline should be coordinated under one board architecture.
- If a workflow view exists, it should share the same data source and permission model as tasks.

## Calendar Rules

### Date Defaults
```tsx
// CORRECT — uses current system date
const [currentDate, setCurrentDate] = useState(new Date());

// WRONG — hardcoded date
const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 27));
```

### Calendar Views
- Month view: 6-row × 7-column CSS grid
- Week view: 7-column grid centered on `currentDate` (not month start)
- Agenda view: chronological grouped list

### Calendar Events
- Load from `getCalendarEvents()` — `pm_tasks` + `pm_campaigns`
- Resolve assignee names via `admin_users` JOIN
- Show `due_date` as deadline event, `published_at` as publish event

### Calendar Filters
- Status filter: from `getMasterDataItems('task_status')` — NOT hardcoded
- Platform filter: from `getMasterDataItems('channel')` — NOT hardcoded
- Load master data in server component, pass to client component

## Task Form Rules

### Fields
- Title (required)
- Description (optional)
- Project (optional, select from `getProjects()`)
- Campaign (optional, filtered by selected project)
- Task type (required, from master data)
- Status (required, from master data)
- Due date (optional)
- Publish date (optional)
- Assignees (multi-select from `getActiveStaff()`)
- Platforms (multi-select, stored in `metadata.platform_ids`)
- Tags (optional, stored in `metadata.tags`)

### Saving
- POST to `/api/tasks` for create
- PUT to `/api/tasks/[id]` for update
- Both must return the full updated task object

## Task Detail Page

**Path:** `app/(admin)/tasks/[id]/page.tsx`

Sections (in order):
1. Header: task title, status badge, action buttons
2. Info panel: dates, assignees, project/campaign
3. Checklist section (Phase 9)
4. Content section (Phase 3)
5. Comments section
6. Approvals section (Phase 3)
7. Activity timeline

## Responsive Layout

- Mobile-first: Kanban scrolls horizontally on mobile
- Calendar: Week view has `min-w-[700px]` with horizontal scroll
- Task form: Sheet on mobile, Dialog on desktop
- Sidebar: Collapsible on mobile (admin-mobile-sidebar)

## Color Scheme

Primary brand: **MTL Red** (`#DC2626` / `bg-primary`)
- Success: Green (`bg-green-500`)
- Warning: Orange (`bg-orange-500`)
- Danger: Red (`bg-red-500`)
- Info: Blue (`bg-blue-500`)

Task status colors: from master data `color` field, with fallback to predefined palette
