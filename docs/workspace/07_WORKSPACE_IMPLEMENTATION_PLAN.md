# 07_WORKSPACE_IMPLEMENTATION_PLAN.md

## Implementation Order

```
Phase 1: Stabilize Workspace Kanban and unify task/workflow UI
Phase 2: Consolidate CRUD, drawer, edit modal, and permissions
Phase 3: Remove duplicate workflow-only UI path
Phase 4: Final cleanup, deprecation, and docs sync
```

---

## Phase 1: Workspace UI Consolidation — Analysis Result

**Status:** In progress — `/tasks` is being standardized on the stable workflow-style Kanban layout.

### Current Architecture Findings

| Area | Current State | Risk |
|------|---------------|------|
| `/tasks` | Canonical CRUD Kanban board with modal dialogs and action menu | Main surface, must stay stable |
| `/media-workflow` | Deprecated redirect toward `/tasks` | Should not be treated as the primary page |
| Data source | Both pages read from `pm_tasks` + `pm_master_data` | Same source, duplicate UI layer only |
| Action menu | Stable `(...)` menu inside task card | Must stay visible when permissions allow |
| Drawer | Removed from the main task flow | Prevents drawer/menu conflict |
| Workflow UI | Workflow card/board styling remains the stable visual reference | Use as layout inspiration only |

### Recommended Direction

1. Keep **one primary Workspace page** as the canonical task surface.
2. Reuse the **stable Kanban/pipeline rendering pattern** from `/media-workflow`.
3. Reattach CRUD/action capabilities from `/tasks` into the consolidated board.
4. Keep workflow as a deprecated redirect path, not a competing product surface.

---

## Phase 2: Functional Merge Scope

### Must Keep
- Task CRUD actions: create, edit, copy, archive, restore, delete
- Permission gates by role
- Master-data driven columns and filters
- Drag/drop status updates
- Full task detail page `/tasks/[id]`

### Must Replace or Simplify
- QuickView drawer is removed from the main flow
- Duplicate workflow-only pipeline no longer acts as a separate top-level UX surface
- Separate card implementations are normalized to one board card system

---

## Phase 3: Deprecation Plan

### Candidates for Deprecation
- Dedicated `/media-workflow` page as an independent route
- Workflow-only card/pipeline duplication if the same visual result can be produced by the task board
- Any redundant interaction state that duplicates edit/modal logic

### Retain as View/Filter Only
- Workflow-oriented filtering by task type
- Workflow stage/status-specific pipeline presentation

---

## Phase 4: Required Validation

- Verify `/tasks` remains the only official task entry point
- Verify role-based actions remain correct for `super_admin`, `admin`, `editor`, `intern`, `viewer`
- Verify archive/restore/delete paths still hit PostgreSQL correctly
- Verify no data loss in `pm_tasks`, `pm_workflows`, or linked task content tables

---

## Deliverables for Implementation Phase

1. Single canonical Workspace entry surface
2. Stable Kanban card/menu behavior (hover-action, no drawer auto-open, role-based actions)
3. Unified edit flow
4. No duplicate UI source of truth
5. Documentation sync with deprecation notes

---

## P10: Task Platform Link Fields + YouTube Thumbnail + Calendar Enhancement

**Status:** Completed 2026-06-04

### Database
- `pm_tasks` has 4 new columns: `website_url`, `youtube_url`, `tiktok_url`, `facebook_url`
- Migration: `040_task_link_fields.sql` — adds columns + indexes
- Seed: `041_seed_task_links.sql` — adds YouTube/social links to sample tasks

### API
- `POST /api/tasks` — accepts and saves 4 new URL fields
- `PUT /api/tasks/[id]` — updates 4 new URL fields
- `GET /api/tasks` — returns 4 new URL fields (via mapTaskRow)

### UI
- TaskForm: "Link nền tảng" section with 4 inputs (Website, YouTube, TikTok, Fanpage)
- KanbanCardBase: YouTube thumbnail at top of card if youtube_url is set
- Calendar month: compact chips showing type + title + assignee + platform
- Excel export: 21 columns (17 core + 4 link fields)

---

## P11: Task Edit Popup Redesign + Deadline Fix + Calendar Assignee Fix

**Status:** Completed 2026-06-04

### TaskForm (Edit/Create Modal)
- Fullscreen Dialog with 2 large Tabs: "Yêu cầu" and "Kết quả"
- Tab "Yêu cầu" split into 2 columns: left = content requirements, right = content scenario/editor
- Removed fields (not shown in form): content_title, content_hook, content_goal, related_product, call_to_action, reference_links
- Tab "Kết quả" contains: website_url, youtube_url, tiktok_url, facebook_url, output_links, completion_note
- No content preview in Tab "Kết quả"

### Deadline Logic Fix
- New helper `getTaskDeadlineLabel(dueDate, taskStatus, today)` in `lib/workspace/date-utils.ts`
- Never returns negative values
- Completed/cancelled tasks: no deadline shown
- Overdue (not completed): "quá X ngày"
- Due today: "hôm nay"
- Due tomorrow: "ngày mai"
- Due ≤3 days: "còn X ngày"
- Due >3 days: "còn X ngày"

### Calendar Month View
- EventCard compact mode now shows up to 2 assignee names
- Format: "Name1, Name2 +N" when more than 2
- Uses `min-w-0` to prevent text overflow

### Bug Fixes
- mapTaskRow: fixed null/undefined type mismatches
- TeamActivityWidget: fixed action_type → action mapping
- API routes: fixed contentBody type mismatch

---

## P13: Task Edit Layout 2-Column + Tiptap Rich Text Editor

**Status:** Completed 2026-06-05

### Layout Redesign
- Chuyển từ 3-column grid (info + script + sidebar) sang **2-column**: trái 40% (thông tin) + phải 60% (rich text editor)
- Container mới rộng `max-w-[1600px]` thay vì `max-w-7xl` — tận dụng chiều ngang
- Sidebar "Trạng thái nhanh" gộp vào cột trái trong card "Thông tin"
- Bỏ cột thứ 3 riêng biệt
- Card "Thông tin" gồm: tiêu đề, mô tả, dự án, chiến dịch, người phụ trách, ngày, loại, nền tảng, trạng thái, ghi chú, + card thông tin (ngày tạo/cập nhật)
- Card "Kịch bản" chiếm toàn bộ cột phải với editor cao tối thiểu 320px

### Tiptap Rich Text Editor
- Thêm package: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`
- Thêm package: `@tailwindcss/typography` (dev)
- Toolbar đầy đủ: Undo/Redo, H1/H2/H3, Bold, Italic, Underline, Strikethrough, Align Left/Center/Right, Bullet/Ordered list, Blockquote, Code block, Link, Color picker
- Lưu nội dung dưới dạng **HTML** vào field `content_body`
- Placeholder động theo loại task (video/image/article)
- Sync external value changes qua `useEffect`
- Thêm CSS cho `.ProseMirror` trong `globals.css`

### Backward Compatibility
- `content_body` field đã tồn tại trong DB — không cần migrate
- Text/plain cũ vẫn hiển thị đúng (Tiptap render plain text thành `<p>`)
- Payload save bao gồm `content_body` — API xử lý như string thường

### Files Changed
- `components/tasks/task-edit-client.tsx` — rewrite 2-column layout + Tiptap
- `app/globals.css` — `@plugin "@tailwindcss/typography"` + `.ProseMirror` styles
- `package.json` — added 9 Tiptap packages + 1 Tailwind plugin

---

## P14: Task Edit Save Flow + Kanban Thumbnail

**Status:** Completed 2026-06-05

### Bug Fix: Save không redirect sang trang detail
- **Trước:** Sau khi bấm "Lưu thay đổi" → `router.push(/tasks/${id})` → nhảy sang trang detail
- **Sau:** Toast thành công → `router.refresh()` → stay tại trang edit
- **Nút "Quay lại":** Đổi từ `/tasks/${id}` → `/tasks` (về Kanban)
- File: `components/tasks/task-edit-client.tsx`

### Bug Fix: Loại công việc lưu đúng và hiển thị Kanban
- Trace: `task_type` field (frontend Select → API PUT → Zod validation → DB update → Kanban re-fetch)
- Field `task_type` đã nằm trong `fieldKeys` của `updateTask()` → lưu đúng
- `router.refresh()` sau save → Next.js revalidate `/tasks` → Kanban board reload với dữ liệu mới
- Kanban card `KanbanCard` dùng `taskTypeColorMap` từ master data → hiển thị badge đúng loại

### Enhancement: YouTube Thumbnail trên Kanban Card
- Thêm `extractYouTubeId()` helper parse YouTube URL → video ID
- Thumbnail 16:9 với `aspect-ratio: 16/9` → không crop
- `Image` component với `fill` + `object-cover` → ảnh đầy đủ
- Play button overlay → click mở video YouTube (không trigger card click)
- Title nằm dưới thumbnail, không overlay
- Card height tự grow (bỏ `max-h-[200px]` constraint)
- Không có thumbnail → layout không thay đổi (không khoảng trống thừa)

### Files Changed
- `components/tasks/task-edit-client.tsx` — bỏ redirect, thêm router.refresh(), đổi nút Quay lại
- `components/kanban/kanban-card.tsx` — add YouTube thumbnail, remove max-h constraint
- `components/tasks/task-action-popup.tsx` — full redesign, red header white title
- `components/kanban/kanban-card.tsx` — "Chưa phân loại" badge fallback

---

## P15: Task Edit Fullscreen + Popup Redesign

**Status:** Completed 2026-06-05

### Layout: Tab Yêu cầu + Kết quả cùng trang
- Container dùng `w-full px-4 sm:px-6 lg:px-8` — không giới hạn max-width
- Tab navigation ngang với border-bottom style
- Cả 2 tab luôn render, dùng `className="hidden"` để toggle
- Tab Yêu cầu: 2 cột — trái 40% (Thông tin + Quick info) + phải 60% (Rich text editor)
- Tab Kết quả: 3 cột — Links + Assets + Completion note
- Không còn conditional rendering `{activeTab === "..." && (...)}` nữa

### TaskActionPopup Redesign
- Header nền đỏ `#E60012`, title trắng, bold, font-size 16px
- Badge loại công việc màu trắng nhạt trên nền đỏ
- Thông tin đầy đủ: Trạng thái, Deadline, Dự án, Chiến dịch, Phụ trách, Nền tảng, Checklist
- Nút hành động grid 2 cột: Sửa (đỏ), Sao chép (xám), Lưu trữ (cam), Khôi phục (xanh dương), Xóa (đỏ full-width)
- Icon rõ ràng trên mỗi nút

### KanbanCard Enhancements
- "Chưa phân loại" badge khi không có task_type
- YouTube thumbnail 16:9 với play button overlay
- Bỏ `max-h-[200px]` constraint — card tự grow

### Files Changed
- `components/tasks/task-edit-client.tsx` — rewrite full layout, 2 tabs same page
- `components/tasks/task-action-popup.tsx` — full redesign
- `components/kanban/kanban-card.tsx` — "Chưa phân loại" fallback

---

## P12: Fullscreen Task Edit + Link Fields Fix

**Status:** Completed 2026-06-05

### Fullscreen Edit Page
- Tạo route `/tasks/[id]/edit` — full-page layout giống product edit
- Tạo `TaskEditClient` component với sticky header (breadcrumb + nút hành động), tab navigation ngang, 3-column grid
- `handleEditTask` trong `TasksClient` navigate đến `/tasks/${id}/edit`
- TaskForm gốc vẫn giữ nguyên cho tạo task mới (Dialog)

### Link Fields Fix
- Simplify `result` state initialization: dùng `task?.facebook_url ?? ""` thay vì `(task as unknown as Record<...>)?.facebook_url`
- Payload lưu đủ 4 fields: `website_url`, `youtube_url`, `tiktok_url`, `facebook_url`
- API route tự động xử lý `undefined` → convert `""` → `null` → DB

### Post-Save Flow
- Toast thành công → `router.push(/tasks/${id})` → `router.refresh()` (Next.js revalidate → server re-fetch → Kanban reload)

### UI Fixes
- Fix `TabsContent outside Tabs` bằng `<Tabs className="contents">` wrapping header + body
- Fix Dialog `aria-describedby` warnings trong 4 Dialog components

### Files Changed
- `app/(admin)/tasks/[id]/edit/page.tsx` — NEW
- `components/tasks/task-edit-client.tsx` — NEW
- `components/tasks/tasks-client.tsx` — navigate to fullscreen
- `components/tasks/task-form.tsx` — simplify link field init, fix Tabs hierarchy, fix aria
- `components/tasks/task-action-popup.tsx` — aria-describedby
- `components/products/woo-product-edit-dialog.tsx` — aria-describedby
- `components/products/woo-product-edit-page-form.tsx` — aria-describedby (2 Dialog)
