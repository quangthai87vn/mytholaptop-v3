# Workspace CRUD Fix V3: Delete UX + Archive Flow + Auth Flicker Fix

**Ngày:** 29/05/2026
**Module:** Workspace (Project, Campaign, Task) + Auth
**Trạng thái:** HOÀN THÀNH

---

## 1. Tóm tắt trước/sau

### window.confirm trước/sau

| Module | File | Trước | Sau |
|--------|------|--------|-----|
| projects | `app/(admin)/projects/projects-client.tsx` | 2 x `confirm()` | 0 (ConfirmDialog) |
| campaigns | `app/(admin)/campaigns/campaigns-client.tsx` | 2 x `confirm()` | 0 (ConfirmDialog) |
| campaigns | `components/campaigns/campaign-detail-client.tsx` | 1 x `confirm()` | 0 (ConfirmDialog) |
| tasks | `components/tasks/checklist-section.tsx` | 1 x `confirm()` | 0 (ConfirmDialog) |
| tasks | `components/tasks/comment-section.tsx` | 1 x `confirm()` | 0 (ConfirmDialog) |
| tasks | `components/tasks/task-assets-section.tsx` | 1 x `confirm()` | 0 (ConfirmDialog) |
| **Tổng workspace** | | **8 confirm()** | **0** |

### Module KHÔNG thuộc workspace (không sửa theo yêu cầu)

- `components/products/*` — products module
- `components/ai/*` — AI module
- `app/(admin)/content/*` — content module
- `app/(admin)/products/*` — products page
- `libs/hooks/use-unsaved-changes.ts` — navigation guard

---

## 2. Root Cause Analysis

### 2.1 Double Popup (Root Cause)

**Vấn đề:** `projects-client.tsx` và `campaigns-client.tsx` có cấu trúc:

```
onClick={setShowArchiveDialog(true)}
  ↓
ConfirmDialog onConfirm={handleArchive}
  ↓
handleArchive() gọi window.confirm()
```

→ 2 popup cùng lúc: 1 shadcn Dialog + 1 browser confirm.

**Fix:** Loại bỏ `window.confirm()` hoàn toàn. Dialog chỉ gọi API trong `onConfirm`.

### 2.2 Xóa/Lưu trữ không chạy (Root Cause)

**Vấn đề:** `project-card.tsx` — `ConfirmDialog onConfirm={handleArchive}` gọi `handleArchive` trong card. `handleArchive` set `showArchiveDialog(false)` rồi gọi `onArchive?.(project.id)`. Nhưng trong `projects-client.tsx`, `onArchive` handler vẫn gọi `window.confirm()` BÊN TRONG dialog confirm → nếu user nhấn OK ở dialog, browser confirm thứ 2 xuất hiện. Nếu user cancel browser confirm, dialog đã đóng rồi, action không chạy.

**Fix:** Viết lại hoàn toàn `projects-client.tsx` và `campaigns-client.tsx`:
- Dialog state ở client component cha
- `onConfirm` gọi API trực tiếp
- KHÔNG gọi `window.confirm()` ở bất kỳ đâu

### 2.3 Auth Flicker (Root Cause)

**Vấn đề:** `admin-layout.tsx` có guard:

```javascript
useEffect(() => {
  if (mounted && user === null) {
    router.push("/login?redirect=...");
  }
}, [mounted, user, router]);
```

Khi `checkSession()` chạy trong `useEffect`, nó gọi `GET /api/auth/me`. Trong khoảng thời gian chờ response (network delay), `user` vẫn là `null` (giá trị khởi tạo). React re-render → guard thấy `mounted=true, user=null` → redirect login → 1 frame trắng nhấp nháy.

**Fix:**
1. Thêm state `authChecked` — chỉ redirect SAU KHI session check hoàn tất
2. `checkSession()` chỉ clear user khi 401/403 — giữ user khi network error (tránh flicker)

### 2.4 CSRF Expiry (Root Cause Auth Flicker phụ)

CSRF token có `maxAge: 7 ngày`. Khi hết hạn, API trả 403 → browser có thể redirect.

**Fix:**
1. Tạo endpoint `GET /api/auth/csrf-refresh` — refresh CSRF token
2. `adminFetch` tự động retry 1 lần khi 403 CSRF

---

## 3. File đã sửa

### Delete/Archive UX

| File | Thay đổi |
|------|----------|
| `app/(admin)/projects/projects-client.tsx` | Viết lại hoàn toàn — 2 ConfirmDialog (archive/delete), state ở client, API call trong `onConfirm`, `isSuperAdmin` prop |
| `app/(admin)/projects/page.tsx` | Truyền `isSuperAdmin`, `userId` từ `getCurrentUser()` |
| `components/projects/project-list.tsx` | Thêm prop `canDelete`, truyền xuống `ProjectCard` |
| `components/projects/project-card.tsx` | Sửa encoding, `canDelete=false` mặc định, `onDelete` chỉ khi `canDelete=true` |
| `app/(admin)/campaigns/campaigns-client.tsx` | Viết lại — 2 ConfirmDialog, state ở client, `isSuperAdmin` prop |
| `app/(admin)/campaigns/page.tsx` | Truyền `isSuperAdmin`, `userId` từ `getCurrentUser()` |
| `components/campaigns/campaign-list.tsx` | Thêm prop `canDelete` |
| `components/campaigns/campaign-card.tsx` | Sửa encoding (lần 2), `canDelete=false` mặc định |
| `components/campaigns/campaign-detail-client.tsx` | Thêm ConfirmDialog, bỏ `confirm()` thuần |
| `components/tasks/checklist-section.tsx` | Thêm ConfirmDialog, bỏ `confirm()` |
| `components/tasks/comment-section.tsx` | Thêm ConfirmDialog, bỏ `confirm()` |
| `components/tasks/task-assets-section.tsx` | Thêm ConfirmDialog, bỏ `confirm()` |

### Auth Flicker

| File | Thay đổi |
|------|----------|
| `lib/api/admin-fetch.ts` | Thêm CSRF retry logic — tự động refresh token + retry 1 lần khi 403 |
| `app/api/auth/csrf-refresh/route.ts` | **FILE MỚI** — endpoint refresh CSRF token |
| `lib/auth/store.ts` | `checkSession()` chỉ clear user khi 401/403; giữ user khi 5xx/network error |
| `components/layout/admin-layout.tsx` | Thêm `authChecked` state — chỉ redirect sau khi session check hoàn tất |

### UI Task Detail

| File | Thay đổi |
|------|----------|
| `components/tasks/task-detail-client.tsx` | Đã có Lưu trữ (editor+) và Xóa (super_admin only) từ V2 |

---

## 4. API đã test/cấu trúc

### Archive (Soft Delete)
```
DELETE /api/projects/[id]       → archiveProject()
DELETE /api/campaigns/[id]    → archiveCampaign()
DELETE /api/tasks/[id]         → body: { action: "archive" } → archiveTask()
```

### Hard Delete (Super Admin only)
```
DELETE /api/projects/[id]?hard=true
DELETE /api/campaigns/[id]?hard=true
DELETE /api/tasks/[id]?hard=true
```

### CSRF Refresh
```
GET /api/auth/csrf-refresh   → set cookie csrf_token mới
```

---

## 5. RBAC

| Action | Super Admin | Admin | Editor | Intern |
|--------|-----------|-------|--------|--------|
| Archive Project | ✓ | ✓ | ✓ | — |
| Hard Delete Project | ✓ | — | — | — |
| Archive Campaign | ✓ | ✓ | ✓ | — |
| Hard Delete Campaign | ✓ | — | — | — |
| Archive Task | ✓ | ✓ | ✓ | — |
| Hard Delete Task | ✓ | — | — | — |

---

## 6. Kết quả test

| # | Test case | Kết quả |
|---|-----------|---------|
| 1 | Project archive — chỉ 1 shadcn dialog | ✓ |
| 2 | Project archive thành công | ✓ |
| 3 | Campaign archive — chỉ 1 shadcn dialog | ✓ |
| 4 | Campaign archive thành công | ✓ |
| 5 | Task archive thành công | ✓ |
| 6 | Super Admin thấy hard delete | ✓ |
| 7 | Admin không thấy hard delete | ✓ |
| 8 | Không còn lỗi font tiếng Việt | ✓ |
| 9 | Thao tác không chớp về login | ✓ |
| 10 | TypeScript pass | ✓ |
| 11 | Next build pass | ✓ |

---

## 7. Bước tiếp theo đề xuất

1. **Module khác** — products, AI, content vẫn còn `confirm()` (theo scope không sửa)
2. **Unarchive** — thêm chức năng khôi phục items đã lưu trữ
3. **RBAC từ database** — thay role cứng bằng permission từ DB
4. **Test end-to-end** trên staging
