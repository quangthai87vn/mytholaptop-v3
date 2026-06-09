# Workspace Refactor V1: Menu & Members Report

**Ngày:** 29/05/2026
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Chuẩn hóa menu Workspace và tạo module **Nhân sự** thay thế Team/Reports. Menu giờ gọi là "Workspace" thay vì "Quản lý Workspace", label "Media Workflow" đổi thành "Workflow", xóa Team và Reports khỏi menu, thêm Nhân sự. Route `/team` redirect sang `/workspace/members`.

---

## 1. Audit — Hiện trạng trước khi sửa

### Route structure

| Route | Type | Ghi chú |
|---|---|---|
| `/workspace` | page | Tổng quan workspace |
| `/workspace/activity` | page | Hoạt động |
| `/workspace/calendar` | page | Calendar (đặt trùng `/calendar`) |
| `/projects` | page | Dự án |
| `/campaigns` | page | Chiến dịch |
| `/tasks` | page | Công việc |
| `/content` | page | Nội dung |
| `/media-workflow` | page | Media Workflow |
| `/calendar` | page | Calendar |
| `/team` | page | **Hub page với card links** → redirect |
| `/team/interns` | page | Interns list |
| `/reports` | page | **Hub page với card links** → ẩn menu |
| `/interns` | page | Interns (redirect sang `/team/interns`) |
| `/staff` | page | Staff management (redirect sang `/settings/users`) |
| `/settings/users` | page | Users management |

### Navigation hiện tại (NAV_ITEMS)

```
Quản lý Workspace
├ Tổng quan
├ Dự án
├ Chiến dịch
├ Công việc
├ Nội dung
├ Media Workflow       ← cần đổi thành "Workflow"
├ Calendar
├ Team                 ← cần xóa
├ Hoạt động
└ Reports              ← cần xóa
```

### RBAC hiện tại

- `Team` yêu cầu `users.read`
- `Reports` yêu cầu `projects.read`
- Workspace layout yêu cầu `projects.read | campaigns.read | tasks.read | content.read | assets.read`
- Không có `workspace.members` permission

### Data source

- **Nhân sự**: dùng `admin_users` (bảng chính) + `pm_interns` (intern records)
- **Tasks**: dùng `pm_tasks` với `assignee_ids` (text[])
- Bảng `pm_interns` có `position`, `start_date`, `status`
- Không có trường `member_type` hay `job_role` → derive từ `position` và `role`

---

## 2. Thay đổi Menu

### Trước

```
Quản lý Workspace
├ Tổng quan
├ Dự án
├ Chiến dịch
├ Công việc
├ Nội dung
├ Media Workflow
├ Calendar
├ Team                 ← XÓA
├ Hoạt động
└ Reports              ← XÓA
```

### Sau

```
Workspace
├ Tổng quan
├ Dự án
├ Chiến dịch
├ Công việc
├ Nội dung
├ Workflow             ← Media Workflow → Workflow
├ Calendar
├ Nhân sự              ← MỚI
└ Hoạt động
```

---

## 3. Files đã sửa / tạo mới

### 3.1 `lib/navigation.ts`

- Đổi title "Quản lý Workspace" → "Workspace"
- Đổi "Media Workflow" → "Workflow"
- Xóa Team child item (href="/team")
- Xóa Reports child item (href="/reports")
- Thêm "Nhân sự" child item (href="/workspace/members", icon=UsersIcon, permission=workspace.members.read)
- Thêm redirect `/team` → `/workspace/members` vào `ROUTE_REDIRECTS`

### 3.2 `middleware.ts`

- Thêm redirect `/team` → `/workspace/members`
- Thêm `/workspace/members` vào `PROTECTED_PAGE_PATHS`
- Thêm `/api/workspace` vào `PROTECTED_API_PATHS`

### 3.3 `app/(admin)/workspace/layout.tsx`

- Thêm `"workspace.members.read"` vào `WORKSPACE_PERMISSIONS`
- Cập nhật comment doc để bao gồm `/workspace/members`
- Cập nhật comment để xóa `/team`

### 3.4 `lib/auth/permissions.ts`

- Thêm `"workspace.members.read"` vào type `Permission`
- Thêm `"workspace" | "members"` vào type `Resource`
- Thêm `"workspace.members.read"` vào `ADMIN_OPERATIONAL_PERMISSIONS`
- Thêm `"Nhân viên"` group vào `PERMISSION_GROUPS`

### 3.5 `lib/rbac/index.ts`

- Thêm `"workspace.members.read"` vào type `Permission`
- Thêm `"workspace.members.read"` vào `ADMIN_OPERATIONAL_PERMISSIONS`
- Thêm `"workspace.members.read"` vào `WORKSPACE_ACCESS` permissions list
- Thêm `MEMBERS_ACCESS` guard: permission=`workspace.members.read`, minimumRole=`admin`

### 3.6 `lib/workspace/types.ts`

Thêm types mới:

```typescript
export type MemberType = "intern" | "employee" | "freelancer" | "collaborator";
export type JobRole = "content_writer" | "designer" | "video_editor" | "seo" | "reviewer" | "social_media" | "photographer" | "manager" | "other";

export interface WorkspaceMemberStats {
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number;
}

export interface WorkspaceMember {
  id: string;
  fullName: string;
  email: string;
  memberType: MemberType;
  jobRole: JobRole;
  systemRole: string;
  status: "active" | "inactive";
  avatarUrl?: string;
  joinedAt: string;
  stats: WorkspaceMemberStats;
}

export const MEMBER_TYPE_LABELS: Record<MemberType, string>;
export const JOB_ROLE_LABELS: Record<JobRole, string>;
```

### 3.7 `lib/workspace/db/index.ts`

Thêm function `getWorkspaceMembers(filters?)`:

- Query tất cả `admin_users` (skip `super_admin`)
- JOIN `pm_interns` qua `user_id`
- Derive `memberType`: intern record → "intern", user.role=intern → "intern", else → "employee"
- Derive `jobRole` từ `pm_interns.position` (content_intern → content_writer, video_intern → video_editor, etc.)
- Tính task stats từ `pm_tasks` bằng `COUNT(*) FILTER (WHERE $1 = ANY(assignee_ids))`
- Apply filters: memberType, jobRole, status

### 3.8 `app/api/workspace/members/route.ts` — MỚI

- GET handler với RBAC check: `hasPermission(user, "workspace.members.read")`
- Gọi `getWorkspaceMembers(filters)`
- Trả về `{ members, stats: { total, active, tasksAssigned, avgCompletion } }`

### 3.9 `app/(admin)/workspace/members/page.tsx` — MỚI

- Server component với `checkAccess()` (permission guard)
- Gọi `getWorkspaceMembers()` server-side
- Render header + pass data sang `MembersClient`

### 3.10 `app/(admin)/workspace/members/members-client.tsx` — MỚI

- KPI cards: Tổng nhân sự, Đang hoạt động, Công việc đang làm, Tỷ lệ hoàn thành
- Bộ lọc: search (tên/email), Loại nhân sự, Vai trò công việc, Trạng thái
- Table 9 cột: Nhân sự, Loại, Vai trò, System Role, Đang làm, Hoàn thành, Quá hạn, KPI (progress bar), Status
- Empty state rõ ràng khi không có kết quả

---

## 4. Route redirects

| From | To | Xử lý |
|---|---|---|
| `/team` | `/workspace/members` | Middleware redirect |
| `/team/interns` | `/team/interns` | Giữ nguyên |
| `/reports` | `/reports` | Giữ nguyên (không hiện menu) |
| `/reports/*` | `/reports/*` | Giữ nguyên |

---

## 5. RBAC

### Permission mới

| Permission | Mô tả | Ai được phép |
|---|---|---|
| `workspace.members.read` | Xem module Nhân sự | admin, editor, super_admin |

### Luồng kiểm tra

1. Middleware: redirect `/team` → `/workspace/members`
2. Workspace layout: `WORKSPACE_PERMISSIONS` bao gồm `workspace.members.read`
3. Page server component: `hasPermission(user, "workspace.members.read")` → redirect /403 nếu không có quyền
4. API route: `hasPermission(user, "workspace.members.read")` → 403 nếu không có quyền

### So sánh Team cũ vs Nhân sự mới

| Tiêu chí | Team (cũ) | Nhân sự (mới) |
|---|---|---|
| Permission | `users.read` | `workspace.members.read` |
| Ai thấy | Admin + super_admin | Admin + super_admin |
| Data source | admin_users | admin_users + pm_interns + pm_tasks |
| KPI stats | Không có | Có (task stats per member) |
| Filter | Không có | Có (loại, vai trò, trạng thái) |
| Table | Card links | Full table với KPI bars |

---

## 6. Team / Reports xử lý thế nào

### Team (`/team`)

- **Route file**: `app/(admin)/team/page.tsx` — giữ nguyên, không xóa
- **Menu**: đã xóa khỏi `NAV_ITEMS`
- **Middleware**: redirect `/team` → `/workspace/members`
- User truy cập `/team` sẽ tự động chuyển sang `/workspace/members`

### Reports (`/reports`)

- **Route file**: `app/(admin)/reports/page.tsx` — giữ nguyên, không xóa
- **Layout**: `reports/layout.tsx` — giữ nguyên
- **Menu**: đã xóa khỏi `NAV_ITEMS`
- Không có middleware redirect — `/reports` vẫn hoạt động nhưng không hiện trong sidebar

---

## 7. Test checklist

- [ ] Menu sidebar hiển thị "Workspace" thay vì "Quản lý Workspace"
- [ ] Menu con "Workflow" thay vì "Media Workflow"
- [ ] Menu không còn "Team" trong Workspace
- [ ] Menu không còn "Reports" trong Workspace
- [ ] Menu có "Nhân sự" với icon Users
- [ ] Thứ tự menu đúng: Tổng quan, Dự án, Chiến dịch, Công việc, Nội dung, Workflow, Calendar, Nhân sự, Hoạt động
- [ ] `/workspace/members` hoạt động và hiển thị KPI cards
- [ ] `/workspace/members` hiển thị table với filter
- [ ] `/team` redirect sang `/workspace/members`
- [ ] `/reports` không hiện trong sidebar nhưng URL vẫn hoạt động
- [ ] Super Admin thấy Nhân sự
- [ ] Admin thấy Nhân sự (vì `workspace.members.read` trong admin preset)
- [ ] User không có quyền truy cập `/workspace/members` → redirect /403
- [ ] TypeScript: 0 error trong các file đã sửa/tạo
- [ ] Next build pass

---

## 8. Rủi ro còn lại

1. **`/workspace/calendar`** và `/calendar` cùng trỏ đến calendar. Đây là duplicate route tiềm ẩn confusion — cần cleanup trong phase tiếp theo.
2. **`/team/interns`** vẫn hoạt động nhưng không hiện trong sidebar. Redirect `/interns` → `/team/interns` cũng vậy. Chúng dùng bảng `pm_interns` riêng, khác với `/workspace/members` (dùng `admin_users`).
3. **Intern permissions**: Intern role mặc định KHÔNG có `workspace.members.read`. Nếu cần intern thấy Nhân sự, cần thêm explicit grant trong DB.
4. **`pm_interns.position`** mapping cố định → nếu thêm vị trí mới (VD: "copywriter") cần update mapping trong `getWorkspaceMembers()`.
5. **`members-client.tsx`**: hiện tại dùng `initialMembers` (server-side load), chưa có client-side refetch khi filter thay đổi. Đây là MVP — có thể improve sau bằng React Query.

---

## 9. Các file đã tạo mới

```
app/api/workspace/members/route.ts
app/(admin)/workspace/members/page.tsx
app/(admin)/workspace/members/members-client.tsx
```

## 10. Các file đã sửa

```
lib/navigation.ts
middleware.ts
lib/auth/permissions.ts
lib/rbac/index.ts
lib/workspace/types.ts
lib/workspace/db/index.ts
app/(admin)/workspace/layout.tsx
```
