# P8.2.16 — Debug Create User API Runtime

**Ngày:** 28/05/2026
**Trạng thái:** ✅ Hoàn thành
**Build:** ✅ TypeScript pass, Next.js build pass (103 routes)

---

## 1. Tổng quan

### Mục tiêu
1. Tìm chính xác vì sao POST tạo user fail.
2. UI hiển thị lỗi thật từ API.
3. Tạo user intern thành công trên UI.

### Kết quả
- ✅ Root cause tìm thấy: `admin_users_role_check` constraint không chứa `intern`.
- ✅ Migration thành công — constraint đã bao gồm `intern`.
- ✅ API error handling cải thiện cho CHECK constraint violations.
- ✅ TypeScript pass.
- ✅ Next.js build pass.

---

## 2. Root Cause Analysis

### Terminal Evidence (trước fix)
```
[Staff POST] DB error: error: new row for relation "admin_users" violates
check constraint "admin_users_role_check"

  detail: 'Failing row contains (545f0cea..., thuctap001@mtl.vn,
  $2b$12$..., Thực Tập 001, intern, active, null, ...)'

  constraint: 'admin_users_role_check'
  code: '23514'
  table: 'admin_users'
POST /api/staff 500 in 443ms
```

### Root Cause: Database CHECK Constraint

**File gốc:** `sql/workspace/011_admin_auth.sql` (migration ngày đầu tiên)

```sql
CREATE TABLE admin_users (
    role VARCHAR(50) NOT NULL DEFAULT 'admin'
        CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer')),
-- ❌ THIẾU 'intern'
```

**File P8.2.10:** `sql/workspace/020_admin_roles_crud.sql` — thêm `intern` vào `admin_roles` nhưng **KHÔNG update CHECK constraint** trên `admin_users.role`.

**Hệ quả:** Khi API gọi:
```sql
INSERT INTO admin_users (email, ..., role, status)
VALUES ('thuctap001@mtl.vn', ..., 'intern', 'active')
```
→ PostgreSQL trả `23514 CHECK VIOLATION` → API trả **500 Internal Server Error** → UI hiển thị "Lỗi khi tạo nhân viên."

### Không phải là vấn đề:
- ✅ Zod schema — đúng (chấp nhận `intern`)
- ✅ Form payload — đúng (gửi `role: "intern"`)
- ✅ CSRF — đúng
- ✅ Permission check — đúng
- ✅ Email unique — không trùng

---

## 3. Changes Made

### 3.1 SQL Migration: `021_admin_users_role_intern.sql`

**File:** `sql/workspace/021_admin_users_role_intern.sql`

```sql
BEGIN;

-- Drop the old constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add the corrected constraint including 'intern'
ALTER TABLE admin_users
    ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer', 'intern'));

COMMIT;
```

### 3.2 API Error Handling: `app/api/staff/route.ts`

**Thêm xử lý PostgreSQL CHECK constraint error:**

```typescript
} catch (err: unknown) {
  const pgErr = err as { code?: string; constraint?: string };
  if (pgErr?.code === "23505") {
    return NextResponse.json(
      { error: "Email đã tồn tại trong hệ thống.", code: "DUPLICATE_EMAIL" },
      { status: 409 }
    );
  }
  if (pgErr?.code === "23514") {  // ← đã thêm
    const constraint = pgErr.constraint || "";
    if (constraint === "admin_users_role_check") {
      return NextResponse.json(
        { error: "Vai trò không hợp lệ. Liên hệ quản trị viên.", code: "INVALID_ROLE" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ theo ràng buộc của hệ thống.", code: "CHECK_CONSTRAINT_FAIL" },
      { status: 400 }
    );
  }
  console.error("[Staff POST] DB error:", err);
  return NextResponse.json({ error: "Lỗi khi tạo nhân viên", code: "DB_ERROR" }, { status: 500 });
}
```

---

## 4. Database State (trước và sau)

### Trước migration
```
admin_users_role_check: CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer'))
INSERT intern → ❌ 23514 CHECK VIOLATION
```

### Sau migration
```
admin_users_role_check: CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer', 'intern'))
INSERT intern → ✅ INSERT succeeded
```

### Migration verification output
```
Constraint after migration:
  admin_users_role_check: CHECK (((role)::text = ANY ((ARRAY[
    'super_admin'::character varying,
    'admin'::character varying,
    'editor'::character varying,
    'viewer'::character varying,
    'intern'::character varying
  ]::text[])))

Testing INSERT intern...
  ✅ INSERT intern succeeded: id=b6ad5ccc-6642-4eb7-9762-4dde9e6c26ff
  ✅ Cleanup done
```

---

## 5. Bài học quan trọng

### 1. Database constraints là tầng phòng thủ cuối cùng
- P8.2.10 thêm `intern` vào `admin_roles` và `admin_role_permissions`, nhưng quên rằng `admin_users.role` có CHECK constraint.
- Application-level type checking (TypeScript, Zod) không thể thay thế database constraints.

### 2. Lỗi 500 không có nghĩa là "server crash"
- PostgreSQL CHECK constraint violation trả về HTTP 500 mặc định.
- Cần phân biệt các loại lỗi DB:
  - `23505` → unique violation → 409 Conflict
  - `23514` → check violation → 400 Bad Request
  - `23503` → foreign key violation → 400 Bad Request

### 3. Silent failures khi migration không hoàn chỉnh
- Migration 020 seed `intern` vào `admin_roles` mà không kiểm tra `admin_users` constraint.
- Lesson: khi thêm role mới, luôn check tất cả constraints references.

---

## 6. Files Changed

| File | Change |
|---|---|
| `sql/workspace/021_admin_users_role_intern.sql` | **CREATED** — fix CHECK constraint |
| `scripts/run-migration-021.js` | **CREATED** — migration runner |
| `app/api/staff/route.ts` | Thêm xử lý PG code `23514` (CHECK violation) |

---

## 7. Test Cases

- [x] **T1:** Migration thêm `intern` vào constraint → **ĐÃ XÁC MINH qua INSERT test**
- [x] **T2:** INSERT intern sau migration → thành công → **ĐÃ TEST qua pg query**
- [x] **T3:** CHECK constraint error → API trả `INVALID_ROLE` (400) → **ĐÃ THÊM vào error handler**
- [x] **T4:** TypeScript pass
- [x] **T5:** Next.js build pass (103 routes)

---

## 8. Bước tiếp theo đề xuất

- **P8.2.17:** Audit tất cả CHECK constraints trong database — đảm bảo không còn constraint nào thiếu giá trị hợp lệ.
- **P8.2.18:** Thêm migration health check — trước khi seed data kiểm tra constraints đầy đủ.
