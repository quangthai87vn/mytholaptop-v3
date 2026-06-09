# TEST_CHECKLIST.md

Manual test procedures for the Workspace module.

## Prerequisites

- Dev server running: `cd apps/admin-ui && npm run dev`
- Database connected and migrated
- Test users available:
  - `admin@test.com` — Super Admin
  - `intern@test.com` — Intern role

---

## Task Module

### T1: Create Task
1. Navigate to `/tasks`
2. Click "+ Tạo công việc" button
3. Fill in:
   - Title: "Test Task [DATE]"
   - Project: select any
   - Campaign: select any (optional)
   - Task type: select from dropdown (must show from master data)
   - Platform: select 2+ platforms (checkboxes)
   - Assignees: select 1+ users
   - Due date: pick a date in the future
4. Click "Lưu"
5. Verify: Task appears in correct Kanban column
6. Verify: Task form closes, success toast shown

**Pass:** Task saved to DB, visible in Kanban, form closes cleanly.
**Fail:** Form stays open, task missing from board, error toast.

---

### T2: Edit Task
1. Click task card "(...)" menu → "Sửa"
2. Change title, add a platform, change assignee
3. Click "Lưu"
4. Verify: Changes reflected immediately on card
5. Refresh page → Verify: Changes persisted

**Pass:** Card updates, data persists after refresh.
**Fail:** Changes lost, stale data.

---

### T3: Kanban — All Columns
For each column: Ý tưởng, Đã giao, Đang thực hiện, Chờ duyệt, Cần sửa, Hoàn thành, Hủy:
1. Verify "(...)" menu button visible on every card
2. Open menu → verify Sửa/Sao chép visible
3. For admin: verify Lưu trữ/Xóa visible

**Pass:** All 7 columns show menu consistently.
**Fail:** Some cards missing "(...)" button.

---

### T4: Drag Across Kanban Columns
For each drag scenario:
1. Drag card from Ý tưởng → Đã giao
2. Drag card from Đã giao → Đang thực hiện
3. Drag card from Đang thực hiện → Chờ duyệt
4. Drag card from Chờ duyệt → Hoàn thành (if no result → confirm dialog appears)
5. Drag card from Hoàn thành → Đang thực hiện

After each drag:
- Verify card moved to correct column
- Verify "(...)" menu still visible
- Refresh page → Verify: Status persisted

**Pass:** Card moves, status saved to DB, menu intact.
**Fail:** Card snaps back, status not saved, menu disappears.

---

### T5: Copy Task
1. Open task "(...)" menu
2. Click "Sao chép"
3. Verify: New task created in same column
4. Verify: New task has same title + "(Copy)" suffix
5. Verify: New task has same platforms, assignees
6. Verify: New task status is "Đã giao" (default for copy)

**Pass:** Duplicated task appears, has correct data.
**Fail:** No new task, or copy has wrong data.

---

### T6: Archive Task
1. Open task "(...)" menu → "Lưu trữ"
2. Verify: AlertDialog confirmation appears
3. Click "Lưu trữ" in dialog
4. Verify: Task moves to Archived filter view
5. Verify: Task no longer visible in Active view

**Pass:** Task archived, moves to archive filter.
**Fail:** Task still in active, or error shown.

---

### T7: Restore Task
1. Switch to "Lưu trữ" filter
2. Open task "(...)" menu → "Khôi phục"
3. Verify: Task returns to original column
4. Verify: Task no longer in Archive filter

**Pass:** Task restored to active view.
**Fail:** Task still archived.

---

### T8: Delete Task (Super Admin only)
1. Open task "(...)" menu → "Xóa"
2. Verify: AlertDialog confirmation appears with warning
3. Click "Xóa"
4. Verify: Task removed from board
5. Verify: Task no longer in archive

**Pass:** Task deleted from DB.
**Fail:** Task still visible, or 403 error.

---

### T9: Multi-Platform Save/Load
1. Create task with 3 platforms (e.g., Facebook, Website, TikTok)
2. Save task
3. Edit task → Verify: All 3 platforms checked
4. Remove 1 platform → Save
5. Refresh → Verify: 2 platforms remain

**Pass:** Platform IDs saved/loaded correctly.
**Fail:** Platforms lost, incorrect platforms shown.

---

### T10: Assignee Display
1. Create task with 3 assignees
2. Verify: Card shows 3 avatars/initials
3. Hover over assignees → Tooltip shows full names
4. Edit task → Verify: All 3 assignees still selected

**Pass:** Names displayed, tooltip works, data persists.
**Fail:** Names missing or incorrect.

---

### T11: Date Display (Timezone)
1. Create task with due date June 15, 2026
2. Verify: Card shows "15/06/2026" (Vietnam format)
3. Create task with published date June 20, 2026
4. Calendar view → Verify: Event shows June 20
5. Refresh → Verify: Dates unchanged

**Pass:** Dates in correct format, timezone not offset.
**Fail:** Dates off by timezone offset, wrong format.

---

## Role Permissions

### T12: Intern — Own Tasks Only
1. Login as `intern@test.com`
2. Navigate to `/tasks`
3. Verify: Only see tasks assigned to intern OR created by intern
4. Verify: Cannot see tasks assigned to other users
5. Verify: Cannot see admin-only tasks

**Pass:** Task list filtered to intern's tasks.
**Fail:** All tasks visible to intern.

---

### T13: Intern — Cannot Delete/Archive
1. Login as `intern@test.com`
2. Open task "(...)" menu
3. Verify: "Xóa" is NOT visible
4. Verify: "Lưu trữ" is NOT visible
5. Verify: "Sửa" IS visible (for own non-completed tasks)

**Pass:** Delete/Archive hidden, Edit visible.
**Fail:** Delete/Archive visible or accessible.

---

### T14: Intern — Cannot Edit Completed Tasks
1. Login as `intern@test.com`
2. Find a task with status "Hoàn thành" assigned to intern
3. Open "(...)" menu
4. Verify: "Sửa" is NOT visible (task locked)

**Pass:** Edit hidden for completed tasks.
**Fail:** Edit accessible for completed tasks.

---

### T15: Admin — Full Access
1. Login as admin/Super Admin
2. Verify: "(...)" menu shows Sửa, Sao chép, Lưu trữ, Xóa
3. Verify: Can archive any task
4. Verify: Can edit any task including completed ones

**Pass:** Full action menu visible and functional.
**Fail:** Some actions missing or blocked.

---

## Calendar

### T16: Calendar — Default Current Month
1. Navigate to `/workspace/calendar`
2. Verify: Page opens showing current month (June 2026)
3. Check URL: No `?month=` or `?year=` param needed

**Pass:** Opens in current month automatically.
**Fail:** Opens in wrong month (e.g., May).

---

### T17: Calendar — Next/Previous Navigation
1. Click → Next month → Verify: Shows next month
2. Click ← Previous month → Verify: Shows previous month
3. Click "Hôm nay" → Verify: Returns to current month
4. Navigate to Week view → Click → Verify: Shows next week
5. Click "Hôm nay" → Verify: Returns to current week

**Pass:** Navigation works correctly for month, week, and today button.
**Fail:** Navigation offset, today button wrong.

---

### T18: Calendar — Task Events
1. Create a task with due date in current month
2. Navigate to calendar in current month
3. Verify: Task appears on correct day cell
4. Click event card → Verify: TaskDetailDialog opens
5. Verify: Dialog shows task title, link to `/tasks/[id]`

**Pass:** Events show with correct data and links.
**Fail:** Events missing, wrong day, broken link.

---

### T19: Calendar — Overdue Highlighting
1. Create task with due date in the past (e.g., yesterday)
2. Navigate to calendar
3. Verify: Event card has red background/border
4. Verify: "Quá hạn" badge visible on card

**Pass:** Overdue events visually distinct (red).
**Fail:** Overdue not highlighted.

---

### T20: Calendar — Filters
1. Toggle "Deadline" filter off → Verify: Deadline events hidden
2. Toggle "Deadline" on → Verify: Events reappear
3. Toggle platform filter → Verify: Events filter correctly
4. Toggle status filter → Verify: Events filter correctly
5. Click "Xóa lọc" → Verify: All filters cleared

**Pass:** Filters correctly show/hide events.
**Fail:** Filter state wrong, events not filtered.

---

### T21: Calendar — Stats Cards
1. Navigate to `/workspace/calendar`
2. Note the 4 stat numbers:
   - Công việc tuần này
   - Chờ duyệt
   - Quá hạn
   - Lên lịch tháng này
3. Create a task with due date this week
4. Refresh → Verify: "Công việc tuần này" increased by 1

**Pass:** Stats reflect real DB counts.
**Fail:** Stats stale or incorrect.

---

## Media Workflow

### T22: Workflow Generation
1. Create task with type "Article" (configured createWorkflow=true)
2. Verify: Workflow created in `pm_workflows` table
3. Create task with type "Idea" (configured createWorkflow=false)
4. Verify: No workflow created for Idea task

**Pass:** Workflows created only for configured task types.
**Fail:** Workflow created for all tasks, or missing for Article.

---

### T23: Workflow Sync
1. Change task status from "Đang thực hiện" → "Hoàn thành"
2. Verify: `pm_workflows.status` also updated
3. Archive task → Verify: Workflow archived
4. Delete task → Verify: Workflow deleted

**Pass:** Workflow status synced with task status.
**Fail:** Workflow status stale, orphan workflows.

---

### T24: Media Workflow Kanban Board
1. Navigate to `/media-workflow`
2. Verify: Shows workflow cards (not task cards)
3. Verify: Each card links to parent task
4. Filter by platform → Verify: Correct filtering

**Pass:** Workflow board shows correct data, links work.
**Fail:** Shows task data instead, broken links.

---

## Regression Tests

After any change, run these to ensure nothing broke:

- [ ] `/tasks` loads without error
- [ ] Kanban board renders all columns
- [ ] Task form opens and closes cleanly
- [ ] No console errors in DevTools
- [ ] Responsive on mobile (test at 375px width)
- [ ] No broken images or missing icons
- [ ] Login/logout works correctly
