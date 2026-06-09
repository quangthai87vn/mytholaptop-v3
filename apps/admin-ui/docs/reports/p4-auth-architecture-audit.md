# P4.Auth — Architecture Audit: Hệ Thống User/Auth Trong Project

**Ngày:** 2026-05-26
**Trạng thái:** Audit — Không sửa code
**Phạm vi:** `apps/admin-ui`

---

## Tổng Quan

Sau khi triển khai P4.Auth, project có **3 hệ thống user/auth hoàn toàn tách biệt**. Báo cáo này phân tích toàn bộ để xác định nguy cơ lệch kiến trúc và đề xuất hướng đi.

---

## 1. Phát Hiện: 3 Hệ Thống User/Auth Song Song

### Hệ thống 1: P4.Auth (Mới — Local Admin)

| Thuộc tính | Chi tiết |
|---|---|
| **Bảng** | `admin_users` + `admin_sessions` (PostgreSQL nội bộ) |
| **Auth** | httpOnly session cookie (`admin_session`), 7 ngày |
| **Hash** | bcrypt (cost 12) |
| **Login page** | `/login` → `POST /api/auth/login` |
| **Session storage** | DB: `admin_sessions` (session_id → user_id, expires_at) |
| **Roles** | `super_admin`, `admin`, `editor`, `viewer` |
| **Middleware** | Edge runtime, check cookie tồn tại |
| **Route handlers** | Node.js runtime, validate session từ DB |
| **Dùng cho** | Tất cả workspace pages: `/workspace`, `/projects`, `/tasks`, `/campaigns`, `/interns` |
| **File chính** | `lib/auth/session.ts`, `lib/auth/require-admin.ts`, `middleware.ts` |

### Hệ thống 2: Medusa Users (Có sẵn)

| Thuộc tính | Chi tiết |
|---|---|
| **Nguồn** | Medusa Backend API (`/admin/users`) |
| **Auth Medusa** | JWT Bearer token, lưu trong `app_settings` table |
| **Token storage** | DB: `app_settings` key=`medusa` → JSON `{ backendUrl, adminApiKey }` |
| **Roles Medusa** | `admin`, `member`, `developer` |
| **Proxy** | `/api/medusa/[...slug]` → Medusa backend |
| **Dùng cho** | Staff page (`/staff`), migration, content sync |
| **File chính** | `app/api/medusa/[...slug]/route.ts`, `services/medusa-api.service.ts` |
| **Có sẵn từ** | Trước P4.Auth (Phase 1) |

### Hệ thống 3: Mock Staff/Roles (Có sẵn — Không hoạt động)

| Thuộc tính | Chi tiết |
|---|---|
| **Nguồn** | `lib/mock-data.ts` (in-memory, React state) |
| **Persistence** | Không có — mất khi reload trang |
| **Roles** | `super_admin`, `admin`, `manager`, `sales`, `warehouse`, `marketing`, `accountant`, `viewer` |
| **Dùng cho** | Roles page (`/staff/roles`), Permissions page (`/staff/permissions`) |
| **Tình trạng** | **Không sử dụng được** — chỉ mock UI |

---

## 2. Chi Tiết Từng Hệ Thống

### 2.1. P4.Auth (Hệ thống mới)

**Login flow:**
1. User vào `/login` → nhập email/password
2. `POST /api/auth/login` → query `admin_users` table
3. bcrypt-verify password
4. Tạo `admin_sessions` record → trả `admin_session` cookie
5. Redirect vào `/workspace`

**Protected routes:**
- Pages: `/dashboard`, `/workspace`, `/projects`, `/tasks`, `/campaigns`, `/interns`, `/media-workflow`
- APIs: `/api/tasks`, `/api/projects`, `/api/campaigns`, `/api/interns`

**Unprotected routes:**
- `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- `/api/medusa/**` (Medusa proxy)
- `/api/admin/me` (internal endpoint — returns API key)

**Session validation flow:**
- Middleware (Edge): check cookie `admin_session` có tồn tại không
- Route handlers (Node.js): gọi `validateSession()` — JOIN `admin_sessions` + `admin_users`, check expiry + status

### 2.2. Medusa Users (Hệ thống cũ)

**Staff page (`/staff`):**
- Gọi `useUsers()` → proxy qua `/api/medusa/admin/users`
- Hiển thị user list từ Medusa: id, email, role, name, created_at
- Có invite dialog → `useInviteUser()` → Medusa `/admin/invites`
- Dropdown actions: View, Edit (UI có nhưng không hoạt động — chỉ mock)

**Medusa auth flow (`/api/auth/token`):**
1. Nhận `backendUrl` + `email` + `password`
2. Proxied sang Medusa endpoint: `/admin/auth/user/emailpass`
3. Trả JWT về → lưu vào `app_settings`
4. Medusa proxy dùng JWT này cho tất cả Medusa API calls

**Token caching:**
- In-memory `Map` trong `app/api/medusa/[...slug]/route.ts`
- Cache key: `backendUrl::email`
- TTL: Medusa token expiry - 5 phút safety margin

### 2.3. Mock Staff/Roles (Không hoạt động)

**Roles page (`/staff/roles`):**
- Initial data từ `mock-data.ts` → `useState`
- Create/Edit/Delete chỉ thay đổi React state
- Save button: chỉ `toast.success()`, không call API
- **Không persist được**

**Permissions page (`/staff/permissions`):**
- 14 modules × 8 actions permission matrix
- Default permissions hardcoded trong `DEFAULT_PERMISSIONS` object
- Copy permissions, reset to default — chỉ trong memory
- Save button: `toast.success()`, không persist

**StaffFilters component:**
- Dùng cho việc filter staff list
- Role options từ `STAFF_ROLES` constant

---

## 3. Ma Trận So Sánh

| Tiêu chí | P4.Auth | Medusa Users | Mock Staff/Roles |
|---|---|---|---|
| **Lưu trữ** | PostgreSQL (admin_users) | Medusa PostgreSQL | React state only |
| **Persistence** | ✅ Full CRUD | ✅ Full CRUD | ❌ Không |
| **Roles** | 4 levels (super_admin → viewer) | 3 levels (admin → developer) | 8 levels (local) |
| **Auth mechanism** | Session cookie | JWT Bearer token | Không có |
| **Dùng cho workspace** | ✅ | ❌ | ❌ |
| **Dùng cho commerce** | ❌ | ✅ | ❌ |
| **Đã hoạt động** | ✅ Mới tạo | ✅ Có sẵn | ❌ Chỉ UI mock |
| **Cần Medusa backend** | ❌ | ✅ | ❌ |
| **Sync user giữa các hệ** | ❌ | ❌ | ❌ |

---

## 4. Rủi Ro Lệch Kiến Trúc

### 4.1. Hai nhóm user không liên quan

- **Medusa users**: super admin, nhân viên bán hàng, marketing — những người cần quản lý đơn hàng, sản phẩm
- **admin_users**: workspace admin — người quản lý dự án, chiến dịch, thực tập sinh

**Vấn đề:** Một người có tài khoản Medusa (bán hàng) nhưng chưa chắc có tài khoản workspace (và ngược lại). Hai nhóm user pool tách biệt.

### 4.2. Roles không đồng nhất

| Hệ thống | Role names |
|---|---|
| P4.Auth | `super_admin`, `admin`, `editor`, `viewer` |
| Medusa | `admin`, `member`, `developer` |
| Mock roles | `super_admin`, `admin`, `manager`, `sales`, `warehouse`, `marketing`, `accountant`, `viewer` |

Không có mapping giữa 3 hệ. Một `admin` trong Medusa ≠ `admin` trong admin_users.

### 4.3. Mock Roles/Permissions không có backend

Trang `/staff/roles` và `/staff/permissions` chỉ là UI mock. Đã không hoạt động TRƯỚC P4.Auth và vẫn không hoạt động SAU P4.Auth. Đây là debt có từ trước, không phải do P4.Auth gây ra.

### 4.4. Không có unified permission model

- Workspace pages dùng P4.Auth session
- Commerce pages (products, orders, customers) dùng Medusa JWT
- Staff page dùng Medusa user list
- Roles page dùng mock data

**Không có cơ chế nào kiểm tra "user X có quyền làm Y trên Z không" một cách thống nhất.**

### 4.5. admin_api_key cũ chưa xóa

`/api/admin/me` endpoint cũ vẫn trả `admin_api_key` từ `app_settings`. Endpoint này không còn được dùng bởi frontend (đã xóa `useAdminKeyStore` khỏi client components), nhưng endpoint vẫn tồn tại.

---

## 5. Phân Tích 3 Phương Án

### Phương án A: Medusa Auth Làm Nguồn Chính

**Mô tả:** Dùng Medusa user system làm single source of truth cho toàn bộ admin-ui. P4.Auth được refactor để login qua Medusa endpoint thay vì `admin_users` table.

**Cách implement:**
1. `POST /api/auth/login` → proxy sang Medusa `/admin/auth/user/emailpass`
2. Lưu Medusa JWT vào `admin_sessions` thay vì `admin_users`
3. Giữ `middleware.ts` và session cookie như cũ
4. `admin_users` table trở thành optional cache/extension

**Ưu điểm:**
- Single source of truth — 1 user pool cho toàn bộ admin-ui
- Staff page (`/staff`) dùng chung auth với workspace
- Không cần quản lý 2 nhóm user
- Medusa đã có sẵn user management (invite, role assignment)
- Cán bộ thay đổi Medusa password → tự động mất quyền workspace

**Nhược điểm:**
- Workspace phụ thuộc Medusa backend — Medusa down → không login được
- Medusa roles (admin/member/developer) không match với workspace needs (editor/viewer cần hạn chế quyền ghi)
- Cần thêm cơ chế map Medusa role → workspace permissions
- P4.Auth code hiện tại phải refactor lớn — `admin_users` không còn được dùng
- JWT token Medusa có expiry ngắn hơn (thường 24h) → cần refresh mechanism

**Rủi ro:**
- Medusa user không có `editor`/`viewer` → phải custom thêm
- Medusa invite flow gửi email → cần email service
- Workspace cần thêm fields (full_name, avatar) không có trong Medusa user

**Có nên dùng cho project này không?**
- **Không khuyến khích** — vì MTL Commerce có thể muốn workspace admin riêng (không cần Medusa access), và Medusa roles không đủ granular cho workspace use case.

---

### Phương án B: admin_users Nội Bộ Làm Nguồn Chính (Giữ nguyên P4.Auth)

**Mô tả:** Giữ nguyên P4.Auth như đã implement. `admin_users` là source of truth. Medusa users chỉ dùng cho commerce operations (không liên quan workspace auth).

**Cách implement:**
- Giữ nguyên `admin_users` + `admin_sessions`
- Staff page vẫn dùng Medusa (đọc user list cho commerce staff)
- Mock Roles/Permissions pages giữ nguyên (không cần backend ngay)

**Ưu điểm:**
- Workspace độc lập với Medusa backend
- Phù hợp với use case: workspace admin có thể không cần Medusa access
- P4.Auth code hiện tại giữ nguyên — ít thay đổi nhất
- Session management mạnh (7 ngày, DB storage, role-based)
- Medusa down → workspace vẫn hoạt động

**Nhược điểm:**
- 2 user pools không sync — 1 người có 2 tài khoản
- Staff page đọc Medusa users → không liên quan workspace auth
- Mock roles/permissions pages không có persistence
- Cần thêm staff management UI cho `admin_users` (CRUD user, đổi role, deactivate)

**Rủi ro:**
- Admin có thể bị confuse khi thấy 2 hệ user
- User management cho workspace (`admin_users`) chưa có UI CRUD
- Roles không đồng nhất (admin_users dùng 1 set, Medusa dùng 1 set, mock dùng 1 set)

**Có nên dùng cho project này không?**
- **Có — khuyến nghị** — vì workspace và commerce là 2 domain tách biệt. Workspace admin không nhất thiết cần Medusa access. Đây là mô hình clean nhất cho kiến trúc hiện tại.

---

### Phương án C: Hybrid — Medusa Cho Commerce, admin_users Cho Workspace

**Mô tả:** Medusa user system cho commerce pages (`/products`, `/orders`, `/customers`). `admin_users` cho workspace (`/workspace`, `/projects`, `/tasks`). 2 hệ dùng chung session cookie nhưng validate khác nhau.

**Cách implement:**
- Middleware check `admin_session` cookie
- Nếu path là commerce → validate Medusa JWT trong cookie/DB
- Nếu path là workspace → validate `admin_sessions` table
- Staff page dùng Medusa (giữ nguyên)
- Workspace login dùng `admin_users` (giữ nguyên P4.Auth)

**Ưu điểm:**
- Mỗi domain dùng auth phù hợp nhất
- Commerce pages leverage Medusa's existing user management
- Workspace pages độc lập, không phụ thuộc Medusa
- Staff page tự nhiên dùng Medusa users

**Nhược điểm:**
- Phức tạp nhất — 2 hệ auth trong cùng app
- Cookie name phải khác nhau hoặc dùng JWT decode trong middleware
- User không có unified profile
- Cần 2 login flows riêng biệt
- Medusa JWT có expiry ngắn → cần refresh

**Rủi ro:**
- Quá phức tạp cho quy mô project này
- Cookie conflict nếu dùng chung session
- Rủi ro bảo mật khi middleware phải decode 2 loại JWT
- Khó debug — 2 hệ không liên quan

**Có nên dùng cho project này không?**
- **Không** — quá phức tạp, không có lợi ích rõ ràng so với Phương án B.

---

## 6. Đề Xuất Phương Án Tốt Nhất: Phương Án B

**Khuyến nghị: Giữ nguyên P4.Auth (admin_users làm nguồn chính).**

### Lý do:

1. **Domain separation**: Workspace (dự án, chiến dịch, thực tập sinh) và Commerce (sản phẩm, đơn hàng, khách hàng) là 2 domain khác nhau. Auth nên tách biệt.

2. **Không phụ thuộc**: Workspace hoạt động ngay cả khi Medusa backend gặp sự cố.

3. **Use case phù hợp**: MTL Commerce cần workspace admin cho người quản lý dự án — không cần Medusa access. Medusa users dành cho nhân viên bán hàng — không cần workspace access.

4. **Medusa users là "commerce staff"**, `admin_users` là "workspace admin" — 2 nhóm người dùng khác nhau với nhu cầu khác nhau.

5. **Đã implement**: P4.Auth hoạt động đúng. Staff page Medusa hoạt động đúng. Không cần thay đổi lớn.

---

## 7. Refactor P4.Auth Nếu Chọn Phương Án A

*(Tham khảo — không khuyến nghị cho project này)*

Nếu sau này muốn dùng Medusa làm nguồn chính:

1. **Thay đổi `POST /api/auth/login`:**
   - Proxy sang Medusa `/admin/auth/user/emailpass`
   - Lưu Medusa JWT vào `admin_sessions` thay vì tạo user mới
   - Thêm field `medusa_user_id` vào `admin_users` (optional, để link 2 hệ)

2. **Cập nhật `requireAdminAuth()`:**
   - Sau khi validate session, call Medusa `/admin/users/:id` để lấy role
   - Dùng Medusa role thay vì `admin_users.role`

3. **Thêm workspace-specific fields:**
   - `admin_users` giữ lại để lưu workspace-specific data (full_name, avatar_url, preferences)

4. **Cập nhật staff page:**
   - Chuyển từ Medusa API call sang dùng chung auth session

---

## 8. Đồng Bộ Với Staff/Roles Pages Hiện Có (Nếu Chọn Phương Án B)

### 8.1. Staff page (`/staff`)

**Hiện tại:** Đọc user list từ Medusa `/admin/users`. Dùng Medusa roles (`admin`, `member`, `developer`).

**Cần làm:**
- **Không thay đổi** — Staff page dành cho commerce staff, nên dùng Medusa users.
- Tuy nhiên: cân nhắc thêm column "Workspace Access" cho biết user có tài khoản workspace không (bằng cách check `admin_users` table theo email).

### 8.2. Roles page (`/staff/roles`)

**Hiện tại:** Mock data, không persist.

**Cần làm (tương lai):**
- Tạo bảng `workspace_roles` trong PostgreSQL nội bộ
- CRUD API routes cho roles
- Kết nối với `admin_users.role` — khi role thay đổi → user permissions thay đổi

**Tạm thời:** Giữ nguyên mock. Ghi chú trong docs là chưa implement.

### 8.3. Permissions page (`/staff/permissions`)

**Hiện tại:** Mock data, không persist.

**Cần làm (tương lai):**
- Tạo bảng `workspace_role_permissions` (role_id, module, action)
- Cập nhật `requireAdminAuth()` để check permission matrix
- **Hiện tại**: chỉ có role check (viewer blocked from write). Permission matrix đầy đủ 14 modules × 8 actions cần implement riêng.

---

## 9. Kết Luận Kiến Trúc

### Auth Source of Truth

**Cho workspace (dự án, chiến dịch, thực tập sinh):** `admin_users` table — P4.Auth

**Cho commerce (sản phẩm, đơn hàng, khách hàng, staff):** Medusa Backend — JWT Bearer token

**Cho roles/permissions (hiện tại):** Mock data — không dùng được

### Có Nên Giữ admin_users/admin_sessions Không?

**Có** — vì:
- Workspace cần auth riêng, độc lập với Medusa
- P4.Auth đã implement đúng cách
- Giúp workspace hoạt động khi Medusa down
- Session management mạnh (7 ngày, DB storage, role-based)

### Có Nên Xóa /api/admin/me Cũ Không?

**Có** — vì:
- Endpoint trả `admin_api_key` từ `app_settings` — không còn cần thiết
- Frontend đã không dùng nữa (đã xóa `useAdminKeyStore` khỏi components)
- Giữ lại chỉ gây confuse và potential security risk

**Tuy nhiên:** Cần đảm bảo workspace write operations hoạt động hoàn toàn qua P4.Auth session trước khi xóa.

### Có Nên Dùng Medusa User/Role Không?

**Không cho workspace auth** — vì:
- Medusa user pool (bán hàng) khác với workspace admin pool (quản lý dự án)
- Roles không match (Medusa: admin/member/developer, workspace: super_admin/admin/editor/viewer)
- Phụ thuộc Medusa backend — workspace down nếu Medusa down

**Có cho commerce** — vì:
- Staff page đã dùng Medusa users
- Commerce staff (bán hàng) cần Medusa access
- Medusa đã có complete user management (invite, role)

### Trạng thái Mock Staff/Roles Pages

**Đây là pre-existing debt, không phải do P4.Auth gây ra.**

- Roles page: **Cần implement backend** trước khi dùng được
- Permissions page: **Cần implement backend** trước khi dùng được
- Tạm thời: ghi chú "coming soon" hoặc disable save button

---

## 10. Bước Tiếp Theo Đề Xuất

### Ngay lập tức (P4.Auth hoàn thiện):

1. **Xóa `/api/admin/me` endpoint cũ** — không còn cần thiết, chỉ gây confuse
2. **Tạo user management UI cho admin_users** — CRUD users, đổi role, deactivate (trang mới hoặc mở rộng Settings)
3. **Chạy migration 011** — tạo bảng `admin_users` + `admin_sessions`
4. **Seed admin đầu tiên** — `npx tsx scripts/seed-admin.ts`
5. **Test end-to-end** — login, logout, protected routes, API auth

### Tương lai (sau khi P4.2 xong):

6. **Implement persistent Roles system:**
   - Tạo bảng `workspace_roles`
   - CRUD API routes
   - Kết nối với `admin_users.role`

7. **Implement persistent Permissions system:**
   - Tạo bảng `workspace_role_permissions`
   - Cập nhật `requireAdminAuth()` để check permissions
   - Thay thế mock `DEFAULT_PERMISSIONS`

8. **Thêm "Workspace Access" column vào Staff page:**
   - Query `admin_users` by email
   - Hiển thị badge "Workspace Admin" / "Workspace Viewer" cho user có tài khoản

---

## 11. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MTL Commerce Admin UI                            │
├──────────────────────┬──────────────────────────────────────────────┤
│   WORKSPACE DOMAIN    │           COMMERCE DOMAIN                    │
│   (P4.Auth — Local)  │         (Medusa — External)                 │
├──────────────────────┼──────────────────────────────────────────────┤
│                      │                                              │
│  /workspace          │  /products    /orders    /customers          │
│  /projects           │  /sales       /content   /customers          │
│  /tasks              │  /staff      /settings                     │
│  /campaigns          │                                              │
│  /interns            │                                              │
│  /media-workflow     │                                              │
│                      │                                              │
│  ┌──────────────┐   │  ┌──────────────┐   ┌──────────────────┐     │
│  │ admin_users  │   │  │ Medusa API   │   │ Medusa Users     │     │
│  │ PostgreSQL   │   │  │ /admin/users  │   │ (Medusa Postgres)│     │
│  │             │   │  │ JWT Bearer    │   │                  │     │
│  │ Roles:      │   │  │              │   │ Roles:           │     │
│  │ super_admin │   │  │ Token stored  │   │ admin/member/     │     │
│  │ admin       │   │  │ in app_      │   │ developer         │     │
│  │ editor      │   │  │ settings     │   │                  │     │
│  │ viewer      │   │  │              │   │                  │     │
│  └──────┬───────┘   │  └──────┬───────┘   └────────┬─────────┘     │
│         │           │         │                     │               │
│  ┌──────┴───────┐   │  ┌──────┴───────┐            │               │
│  │admin_sessions│   │  │ Medusa Proxy │◄────────────┘               │
│  │ (DB session) │   │  │ /api/medusa/ │                            │
│  └──────┬───────┘   │  └──────────────┘                            │
│         │           │                                              │
│  ┌──────┴───────┐   │                                              │
│  │ middleware.ts │   │                                              │
│  │ (Edge guard) │   │                                              │
│  └───────────────┘   │                                              │
│                      │                                              │
│  ┌──────────────┐   │                                              │
│  │ POST /login  │   │                                              │
│  │ bcrypt verify│   │                                              │
│  └──────────────┘   │                                              │
│                      │                                              │
│  ┌──────────────────┴──────────────────────────────────────┐     │
│  │              Shared Infrastructure                         │     │
│  │  - PostgreSQL (workspace DB)                               │     │
│  │  - Next.js App Router                                      │     │
│  │  - Cookie-based session for /workspace paths               │     │
│  │  - JWT-based session for /api/medusa/* paths              │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘

Mock-only (no backend):
  - /staff/roles    → lib/mock-data.ts (in-memory)
  - /staff/permissions → DEFAULT_PERMISSIONS (in-memory)
```

---

## 12. Checklist Kiến Trúc

- [x] Phân tích P4.Auth system (admin_users, admin_sessions)
- [x] Phân tích Medusa users system (Staff page, Medusa proxy)
- [x] Phân tích Mock Staff/Roles pages
- [x] Xác định 3 hệ song song
- [x] Xác định Staff page đọc Medusa (không phải admin_users)
- [x] Xác định Roles/Permissions pages là mock (không persist)
- [x] Phân tích 3 phương án
- [x] Đề xuất Phương án B (giữ P4.Auth)
- [x] Kết luận source of truth
- [x] Đề xuất bước tiếp theo
- [x] Tạo báo cáo
