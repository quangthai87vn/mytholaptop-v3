# 06_WORKSPACE_TEST_CHECKLIST.md

## Quick Smoke Test (run before any commit)

- [ ] `/tasks` loads without console errors
- [ ] Kanban board renders all columns
- [ ] Task card action `(...)` button hidden by default, visible on hover
- [ ] Hover card → `(...)` appears → click opens dropdown with Sửa/Sao chép/Lưu trữ/Xoá
- [ ] Drag task to another column → hover still shows action button
- [ ] Task form opens and closes cleanly
- [ ] Calendar at `/workspace/calendar` opens in current month
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] No linter errors

---

## Full Test Suite

### Projects

| ID | Test | Expected | Pass |
|----|------|---------|------|
| P1 | Create project with name, description | Project appears in list | |
| P2 | Edit project name | Name updated on list | |
| P3 | Archive project | Project hidden from active list, visible in archive filter | |
| P4 | Restore archived project | Project returns to active list | |
| P5 | Project shows task count | Count matches actual task count | |

---

### Campaigns

| ID | Test | Expected | Pass |
|----|------|---------|------|
| C1 | Create campaign under a project | Campaign appears under that project | |
| C2 | Edit campaign details | Changes saved and displayed | |
| C3 | Archive campaign | Hidden from active list | |
| C4 | Campaign card shows task count | Count matches | |
| C5 | Filter campaigns by project | Only campaigns for that project shown | |

---

### Tasks — Kanban

| ID | Test | Expected | Pass |
|----|------|---------|------|
| T1 | Create task with title, type, platforms, assignees | Task appears in correct column | |
| T2 | Edit task: change title, platform, assignee | Changes saved, card updated | |
| T3 | All 7 columns show `(...)` menu on every card | Menu visible everywhere | |
| T4 | Open menu: verify Sửa/Sao chép visible | Both items shown for admin | |
| T5 | Copy task | New task in same column, same platforms, "(Copy)" suffix | |
| T6 | Archive task | Task moves to archive filter | |
| T7 | Restore task | Task returns to original column | |
| T8 | Delete task (super_admin only) | Task removed from DB | |
| T9 | Multi-platform: save with 3 platforms, refresh | All 3 platforms remain | |
| T10 | Assignee names display on card | Names visible in tooltip | |
| T11 | Due date shows in correct format | DD/MM/YYYY Vietnam format | |

---

### Tasks — Kanban Drag & Drop

| ID | Test | Expected | Pass |
|----|------|---------|------|
| D1 | Drag task from Idea → Assigned | Card moves, status saved to DB | |
| D2 | Drag task from Working → Review | Card moves, confirmation if no result | |
| D3 | Drag task from Review → Completed | Card moves, status saved | |
| D4 | After each drag: refresh page | Status persists | |
| D5 | After each drag: verify `(...)` still visible | Menu intact | |
| D6 | Drag from Completed → Working (admin) | Card moves, status saved | |
| D7 | Drag task with overdue due date | Event highlighted red on calendar | |
| D8 | Drag task → action menu stays open | Dropdown stays open after drop | |
| D9 | Drag task → drawer NOT opened | QuickView never opens during drag | |
| D10 | Drag task → after drop, status saved to PostgreSQL | API call made, local state updated | |

---

### Tasks — Kanban Action Popup (click card → Dialog)

| ID | Test | Expected | Pass |
|----|------|---------|------|
| AM0 | Click card in any column → popup opens | TaskActionPopup Dialog centered | |
| AM1 | Popup shows task title | Title matches card | |
| AM2 | Popup shows task type badge | Correct color + label | |
| AM3 | Popup shows current status badge | STATUS_CONFIG label | |
| AM4 | Popup shows assignees with avatars | Names + initials | |
| AM5 | Click "Sửa" → edit form opens | TaskForm dialog | |
| AM6 | Click "Sao chép" → copy dialog opens | CopyTaskDialog | |
| AM7 | Click "Lưu trữ" → archive confirmation | ArchiveConfirmDialog | |
| AM8 | Click "Khôi phục" → restore confirmation | ArchiveConfirmDialog (restore) | |
| AM9 | Click "Xóa" → delete confirmation | DeleteTaskDialog | |
| AM10 | Click outside popup → popup closes | Dialog closes | |
| AM11 | Popup action → popup closes then action fires | Smooth UX flow | |
| AM12 | After archive: task removed from board | Optimistic update | |
| AM13 | After delete: task removed from board | Optimistic update | |
| AM14 | After copy: new task appears at top | New task visible | |
| AM15 | Intern: "Sửa" visible for own task | Sửa in popup | |
| AM16 | Intern: "Xóa" hidden | No Xóa button | |
| AM17 | Intern: "Lưu trữ" hidden | No Lưu trữ button | |
| AM18 | Super Admin: all 5 buttons visible | Sửa/Sao chép/Khôi phục/Lưu trữ/Xóa | |

### Tasks — Kanban Card Display (no action buttons inside card)

| ID | Test | Expected | Pass |
|----|------|---------|------|
| H1 | Card in "Ý tưởng" column | Type badge, title, info visible, no action button | |
| H2 | Card in "Đã giao" column | Same as above | |
| H3 | Card in "Đang thực hiện" column | Same as above | |
| H4 | Card in "Chờ duyệt" column | Same as above | |
| H5 | Card in "Cần sửa" column | Same as above | |
| H6 | Card in "Hoàn thành" column | Same as above | |
| H7 | Card in "Huỷ" column | Same as above | |
| H8 | Drag card to another column | Card moves, new column count updates | |
| H9 | After drag: click card | Popup still opens correctly | |
| H10 | Card with long title (4+ lines) | Title truncated at 2 lines (line-clamp-2) | |
| H11 | Card with multiple assignees | Avatars + names shown | |
| H12 | Card with multiple platforms | Platform badges shown | |
| H13 | Card with 3+ assignees + 3+ platforms + long title | All info visible, no overflow issues | |
| H14 | Zoom 90%: click card | Popup centered, readable | |
| H15 | Zoom 100%: click card | Popup centered, readable | |
| H16 | Zoom 125%: click card | Popup centered, readable | |
| H17 | Mobile: click card | Popup centered, full-width at small screens | |

---

### Tasks — Permissions

| ID | Test | Expected | Pass |
|----|------|---------|------|
| R1 | Intern login: see only own assigned tasks | Filtered list | |
| R2 | Intern: delete button hidden in popup | No Xóa button in popup | |
| R3 | Intern: archive button hidden in popup | No Lưu trữ button in popup | |
| R4 | Intern: edit visible for own task in popup | Sửa visible in popup | |
| R5 | Intern: edit hidden for completed task in popup | Sửa NOT visible in popup | |
| R6 | Admin: full menu in popup | Sửa/Sao chép/Lưu trữ/Xóa visible | |
| R7 | Admin: can edit completed task | Changes saved | |
| R8 | Intern tries API direct delete → 403 | Rejected | |

---

### Calendar

| ID | Test | Expected | Pass |
|----|------|---------|------|
| K1 | Open `/workspace/calendar` → current month shown | System date (not hardcoded) | |
| K2 | Click "Hôm nay" → returns to current month | Correct month | |
| K3 | Next month → next month shown | Correct month | |
| K4 | Previous month → previous month shown | Correct month | |
| K5 | Create task with due date in current month | Event appears on correct day | |
| K6 | Click event → dialog opens | TaskQuickViewDialog shown | |
| K7 | Click "Xem chi tiết" → navigates to `/tasks/[id]` | Correct page | |
| K8 | Overdue event: red highlight | Red border/background visible | |
| K9 | Click "Bộ lọc" → filter panel opens | Popover panel appears | |
| K10 | Filter by Nhân viên → check items → chip appears | Active chip shown | |
| K11 | Filter by Dự án → chip click removes filter | Chip disappears, filter removed | |
| K12 | Date range filter → events filtered | Only events in range | |
| K13 | Quick filter "Quá hạn" → only overdue shown | Correct events | |
| K14 | "Xoá tất cả" → all filters cleared | All chips removed | |
| K15 | Stats: "Quá hạn" count matches DB | Correct number | |
| K16 | Week view: next → correct next week | Centered on next week | |
| K17 | Week view: click "Hôm nay" → current week | Correct week | |
| K18 | Agenda view: events grouped by date | Sorted chronologically | |
| K19 | Day with 4+ events: "+N thêm" shown | Overflow indicator visible | |
| K20 | "+N thêm" click: shows all events | Full list shown | |
| K21 | Click view "Grid" → GridView renders | Cards with group-by selector | |
| K22 | GridView: change group-by to "Loại công việc" | Sections by type | |
| K23 | GridView: change group-by to "Nền tảng" | Sections by platform | |
| K24 | GridView: change group-by to "Nhân viên" | Sections by assignee | |
| K25 | GridView: change group-by to "Trạng thái" | Sections by status | |
| K26 | GridView: task card click → popup opens | TaskQuickViewDialog | |
| K27 | Click "Xuất Excel" → file downloads | Valid XLSX file | |
| K28 | Excel file name format | workspace-calendar-tasks-YYYY-MM-DD.xlsx | |
| K29 | Excel columns: STT, Tiêu đề, Trạng thái, Dự án... | All 21 columns present (17 core + 4 link fields) | |
| K30 | Excel: 4 link columns present | Website, YouTube, TikTok, Fanpage/Facebook | |
| K31 | Calendar month chip: shows type + title + assignee + platform | Compact and readable | |
| K32 | Calendar month: max 3 chips per day, "+N thêm" overflow | Correct overflow handling | |

### Tasks — P10 Platform Link Fields

| ID | Test | Expected | Pass |
|----|------|---------|------|
| L1 | Create task → fill all 4 link fields → save | All links saved to DB | |
| L2 | Edit task with existing links → links still present | Data persists after reload | |
| L3 | Kanban card with YouTube link → thumbnail visible | YouTube thumbnail at top of card | |
| L4 | Kanban card without YouTube link → no thumbnail | Regular card layout, no broken image | |
| L5 | YouTube link formats: youtube.com/watch, youtu.be, shorts | All formats show thumbnail | |
| L6 | Invalid YouTube URL → thumbnail fails → graceful fallback | Card renders without thumbnail | |

---

### Master Data

| ID | Test | Expected | Pass |
|----|------|---------|------|
| M1 | Add new task status | Appears in Kanban column config | |
| M2 | Change status color | Color updates on Kanban badges | |
| M3 | Soft-delete master data item | Item hidden from dropdowns | |
| M4 | Restore master data item | Item reappears in dropdowns | |
| M5 | System items: cannot delete | Delete button disabled | |

---

### Activity Log

| ID | Test | Expected | Pass |
|----|------|---------|------|
| A1 | Create task → activity logged | Entry appears in log | |
| A2 | Update task → activity logged | Entry shows new values | |
| A3 | Status change → activity logged | Old → New status shown | |
| A4 | Filter by date range | Only entries in range | |
| A5 | Filter by action type | Only matching entries | |
| A6 | Export CSV | Valid CSV downloaded | |

---

### Media Workflow

| ID | Test | Expected | Pass |
|----|------|---------|------|
| W1 | Create Article task (createWorkflow=true) | Workflow auto-created in `pm_workflows` | |
| W2 | Create Idea task (createWorkflow=false) | No workflow created | |
| W3 | Change task status → workflow status synced | Workflow status matches task status | |
| W4 | Archive task → workflow archived | Workflow hidden | |
| W5 | Workflow board at `/media-workflow` | Shows workflows (not tasks) | |
| W6 | Workflow card: link to parent task | Correct `/tasks/[id]` link | |

---

## Regression Checklist

After ANY change, run these:

- [ ] `npm run build` succeeds
- [ ] `/tasks` renders without crash
- [ ] `/workspace/calendar` renders without crash
- [ ] No `[ERROR]` in dev server console
- [ ] Kanban action menu works on all cards
- [ ] Task CRUD operations work via API (test with Postman or browser Network tab)
