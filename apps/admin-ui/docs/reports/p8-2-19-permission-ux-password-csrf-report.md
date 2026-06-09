# P8.2.19 — Permission UX Simplification + Fix Change Password CSRF

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (108 routes)

---

## 1. Tổng quan

### Mục tiêu
1. Sửa lỗi CSRF khi đổi mật khẩu
2. Đơn giản hóa trang phân quyền từ matrix kỹ thuật sang nhóm chức năng
3. Cho phép cấu hình quyền theo nhóm menu dễ hiểu

### Kết quả
- ✅ CSRF fix — `raw fetch` → `adminFetch` trong tất cả profile pages
- ✅ Permissions page hoàn toàn rewrite với group-based UI
- ✅ API permissions trả thêm `rolePermissions` map cho new UI
- ✅ TypeScript pass
- ✅ Next.js build pass (108 routes)

---

## 2. Phần A — Fix CSRF Change Password

### Root Cause
Profile pages dùng `raw fetch()` thay vì `adminFetch()`:

```typescript
// ❌ SAI — không gửi CSRF token
const res = await fetch("/api/profile/change-password", { method: "POST" });

// ✅ ĐÚNG — adminFetch tự gắn X-CSRF-Token cho POST/PUT/PATCH/DELETE
const res = await adminFetch("/api/profile/change-password", { method: "POST" });
```

`adminFetch` (trong `lib/api/admin-fetch.ts`) tự động:
1. Đọc `csrf_token` cookie từ `document.cookie`
2. Gắn header `X-CSRF-Token` cho POST/PUT/PATCH/DELETE
3. Gửi `credentials: "include"` để browser gửi session cookie

### Files đã fix

| File | Change |
|---|---|
| `app/(profile)/profile/password/page.tsx` | `fetch()` → `adminFetch()` |
| `app/(profile)/profile/settings/page.tsx` | `fetch()` → `adminFetch()` (GET + PUT) |
| `app/(profile)/profile/page.tsx` | `fetch()` → `adminFetch()` (GET) |

---

## 3. Phần B — Permission UX Redesign

### Trước: Matrix (rối, kỹ thuật)
- Hàng = permission, Cột = role
- Toggle trên từng cell nhỏ
- Không rõ permission thuộc nhóm nào
- Mỗi role hiển thị tất cả 30+ permissions cùng lúc

### Sau: Group-based Cards (dễ hiểu, theo chức năng)

```
┌─────────────────────────────────────────────────────┐
│ [Icon] Quản lý Workspace            3/16 ↕     │
│  [Xem] Xem dự án   projects.read     ○ ●         │
│  [Tạo] Tạo dự án   projects.create  ○ ○         │
│  [Sửa]  Sửa dự án   projects.update ○ ●         │
│  ...                                            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ [Icon] AI Content                    1/2 ↕       │
│  [Tạo] Generate nội dung AI  ai_generate   ○ ●  │
│  [Sửa] Cấu hình AI Engine   ai_engine   ○ ○    │
└─────────────────────────────────────────────────┘
```

### Nhóm quyền mới

| Nhóm | Icon | Permissions |
|---|---|---|
| Quản lý Workspace | Package | projects, campaigns, tasks, content CRUD |
| AI Content | Sparkles | ai_generate, ai_engine.manage |
| Bình luận & Tài sản | Eye | comments, assets, notifications |
| Cài đặt hệ thống | Settings2 | users, roles, permissions, settings, migration |

### Các cấp độ quyền

| Level | Badge | Màu |
|---|---|---|
| read | Xem | Gray |
| create | Tạo | Blue |
| update | Sửa | Amber |
| delete | Xóa | Red |

### Role Selector
Thay vì show tất cả roles trên 1 bảng, chỉ chọn 1 role để xem/sửa quyền.

### System Role Warning
```
⚠️ Vai trò hệ thống: Quyền của "Quản trị viên" được cấu hình cố định.
Không thể chỉnh sửa trực tiếp.
```

### Advanced Toggle
"Nâng cao" button để xem raw permission keys thô (e.g. `projects.create`).

---

## 4. Phần C — API Changes

### `/api/permissions` Response — thêm `rolePermissions`

```typescript
{
  roles: [...],
  matrix: [...],           // legacy format
  groups: [...],          // legacy format
  rolePermissions: {       // ✅ NEW — cho new group-based UI
    "intern": ["tasks.read", "tasks.update", "comments.read", ...],
    "editor": [...],
    ...
  }
}
```

### Permissions page component changes

| Thay đổi | Chi tiết |
|---|---|
| Role selector | Button pills thay vì table columns |
| Permission display | Grouped cards thay vì full matrix |
| Toggle behavior | Click card row thay vì tiny table cell |
| Save mechanism | 1 button "Lưu phân quyền" thay vì per-role buttons |
| System role | Warning banner + read-only thay vì toggle disabled |

---

## 5. Phần D — Intern Permissions Model

Intern default permissions (từ `INTERN_DEFAULT_PERMISSIONS`):

```
Quản lý Workspace:
  ✅ tasks.read         — Xem công việc được giao
  ✅ tasks.update       — Cập nhật công việc được giao
  ✅ comments.read      — Xem bình luận
  ✅ comments.create    — Viết bình luận
  ✅ assets.read       — Xem tài sản
  ✅ assets.create     — Upload tài sản
  ✅ ai_generate       — Generate nội dung AI
  ✅ roles.read        — Xem vai trò
  ✅ permissions.read — Xem phân quyền
  ✅ notifications.read — Xem thông báo

Không có quyền:
  ❌ Hàng hóa, Bán hàng, Khách hàng
  ❌ AI Engine settings
  ❌ Cài đặt hệ thống
  ❌ users.*, roles.manage, permissions.*
```

→ Intern chỉ thấy **Dashboard + Quản lý Workspace** trong sidebar.

---

## 6. Files Changed

| File | Action |
|---|---|
| `app/(profile)/profile/password/page.tsx` | **MODIFIED** — fetch → adminFetch |
| `app/(profile)/profile/settings/page.tsx` | **MODIFIED** — fetch → adminFetch (GET + PUT) |
| `app/(profile)/profile/page.tsx` | **MODIFIED** — fetch → adminFetch (GET) |
| `app/(admin)/staff/permissions/page.tsx` | **REWRITTEN** — group-based UI redesign |
| `app/api/permissions/route.ts` | **MODIFIED** — thêm rolePermissions map |

---

## 7. Rủi ro còn lại

| Risk | Severity | Mitigation |
|---|---|---|
| `savePermissions` re-fetches full data after save | Low | Refreshes permissions from DB for consistency |
| "Hàng hóa", "Bán hàng", "Khách hàng" groups show 0 permissions | Low | Groups with empty permissions list are hidden via `permissions.length === 0` |
| System role permissions still editable in API (PUT `/api/roles/intern/permissions`) | Medium | API PUT chấp nhận custom role permissions; intern permissions managed via DB. System roles use `SYSTEM_PERMISSIONS_MAP` constant. |

---

## 8. Test Cases

- [x] Đổi mật khẩu thành công (CSRF fix verified via `adminFetch`) ✅
- [x] Intern chỉ thấy Dashboard + Workspace menu ✅
- [x] Toggle AI generate permission cho intern → hiện trên permissions page ✅
- [x] System role hiển thị warning, không toggle được ✅
- [x] Advanced toggle hiện raw permission keys ✅
- [x] TypeScript pass ✅
- [x] Next.js build pass (108 routes) ✅
