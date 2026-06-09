# P5.11 Production Cleanup Report

**Ngày:** 27/05/2026
**Scope:** Settings audit logging + hardcoded secrets cleanup
**Build status:** TypeScript pass, Next.js build pass

---

## 1. Tổng quan

P5.11 giải quyết 2 cảnh báo còn lại từ P5.10 Final Security Audit:

1. **Settings credential changes chưa có audit log** → Đã thêm
2. **Hardcoded DB passwords trong script files** → Đã dọn

---

## 2. File đã sửa

### 2.1. `lib/auth/audit-log.ts`

**Thay đổi:**
- Mở rộng type `AuditAction` thêm 3 actions mới:
  - `settings.woo_updated`
  - `settings.medusa_updated`
  - `settings.company_updated`
- Thêm function `maskSettingsForAudit()` — mask credentials trước khi ghi log
- Thêm function `writeSettingsAuditLog()` — ghi audit log cho settings changes

**Masking logic:**
```
Input:  "adminPassword": "1P@ssw0rdphatxitnhat"
Output: "adminPassword": "1P@ss•••••••t"

Input:  "adminApiKey": "eyJhbGciOiJIUzI1NiIsInR5..."
Output: "adminApiKey": "eyJh•••••••olKc"

Input:  "consumerSecret": "cs_35b45e5ff1c697..."
Output: "consumerSecret": "cs_3•••••••9d8"
```

Raw secret **không bao giờ** được ghi vào bảng `admin_audit_logs`.

### 2.2. `app/api/settings/route.ts`

**Thay đổi:**
- Import thêm `writeSettingsAuditLog` và `extractIpAddress`
- Trong POST handler, trước khi save:
  1. Đọc old value từ `getAppSetting()`
  2. Save new value
  3. Gọi `writeSettingsAuditLog()` với old + new (đã mask)
- Audit log failure không break main operation (dùng `Promise.all` với try/catch trong `writeSettingsAuditLog`)

**Flow khi admin đổi WooCommerce credentials:**

```
POST /api/settings
  → requireAdminAuth ✅
  → requireCsrf ✅
  → credentials.manage check ✅
  → getAppSetting("wooCommerce") → old value
  → saveAppSetting("wooCommerce", new value)
  → writeSettingsAuditLog(
      actor: admin_user,
      action: "settings.woo_updated",
      old: mask(wooCommerce_credentials),
      new: mask(wooCommerce_credentials),
      ip: client_ip,
      userAgent: user_agent
    )
  → Response: { success: true }
```

**3 audit log entries được tạo:**

| Action | Trigger | Logged Fields |
|--------|---------|---------------|
| `settings.woo_updated` | WooCommerce section saved | `wordpressUrl`, `consumerKey` (masked), `consumerSecret` (masked) |
| `settings.medusa_updated` | Medusa section saved | `backendUrl`, `adminEmail`, `adminApiKey` (masked), `adminPassword` (masked) |
| `settings.company_updated` | Company section saved | `name`, `website`, `phone`, `logoUrl`, `address` |

### 2.3. `run-migration.js`

**Trước:**
```javascript
const client = new Client({
  host: "postgresql.mtl.vn",
  port: 7000,
  user: "mytholaptop_user",
  password: "1Passw0rdphatxitnhat",  // ← HARDCODE
  database: "mytholaptop",
});
```

**Sau:**
```javascript
const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("[run-migration] FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}
const client = new Client({ connectionString: connStr });
```

### 2.4. `scripts/verify-db.js`

**Trước:**
```javascript
const connStr = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@...';
```

**Sau:**
```javascript
const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("[verify-db] FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}
```

### 2.5. `scripts/check-db.js`

**Trước:**
```javascript
connectionString: process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@...'
```

**Sau:**
```javascript
const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("[check-db] FATAL: DATABASE_URL environment variable is not set.");
  process.exit(1);
}
const client = new Client({ connectionString: connStr });
```

---

## 3. Cách test

### 3.1. Test settings audit log

**Yêu cầu:**
- Đã login với tài khoản admin
- Token CSRF hợp lệ
- Có quyền `settings.manage` hoặc `credentials.manage`

**Cách test:**

```bash
# 1. Login để lấy session cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mtl.vn","password":"..."}'

# 2. Lưu cookie từ response

# 3. Đổi WooCommerce credentials
curl -X POST http://localhost:3000/api/settings \
  -H "Cookie: admin_session=<cookie>" \
  -H "X-CSRF-Token: <csrf_token>" \
  -H "Content-Type: application/json" \
  -d '{"wooCommerce":{"wordpressUrl":"https://mytholaptop.vn","consumerKey":"ck_new","consumerSecret":"cs_new"}}'

# 4. Kiểm tra audit log trong database
psql $DATABASE_URL -c "
SELECT action, actor_email, old_value, new_value, created_at
FROM admin_audit_logs
WHERE action LIKE 'settings.%'
ORDER BY created_at DESC
LIMIT 5;
"

# 5. Verify raw secret không có trong log
# old_value/new_value phải có dạng "ck_ne••••w" hoặc "cs_ne••••w"
# KHÔNG bao giờ là giá trị thật
```

**Expected result:**
```json
{
  "action": "settings.woo_updated",
  "actor_email": "admin@mtl.vn",
  "old_value": {"wordpressUrl":"https://mytholaptop.vn","consumerKey":"ck_dc••••e91","consumerSecret":"cs_35••••d8"},
  "new_value": {"wordpressUrl":"https://mytholaptop.vn","consumerKey":"ck_ne••••w","consumerSecret":"cs_ne••••w"}
}
```

### 3.2. Test script migration với DATABASE_URL

```bash
# Đúng — có DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:port/db" node run-migration.js

# Sai — thiếu DATABASE_URL → phải báo lỗi rõ ràng
node run-migration.js
# Expected output:
# [run-migration] FATAL: DATABASE_URL environment variable is not set.
# [run-migration] Example: postgresql://user:password@host:port/database

# Tương tự cho scripts
DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/verify-db.js
DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/check-db.js
```

### 3.3. Build verification

```bash
cd apps/admin-ui
pnpm tsc --noEmit    # TypeScript pass
pnpm next build       # Next.js build pass
```

---

## 4. Bảo mật

### 4.1. Audit log không chứa raw secret

`maskSettingsForAudit()` đảm bảo:
- Credentials dài > 8 ký tự: `ck_ab••••cd`
- Credentials ngắn: `••••••••`
- Empty/null: `""`
- Non-secret fields (URL, email, name): **không bị mask** — để giữ thông tin hữu ích cho audit

### 4.2. Script exit với lỗi rõ ràng

Khi thiếu `DATABASE_URL`, script exit code = 1 và message rõ ràng:
```
[run-migration] FATAL: DATABASE_URL environment variable is not set.
[run-migration] Example: postgresql://user:password@host:port/database
```

Không có fallback sang hardcoded password. Không có silent failure.

---

## 5. Có đủ điều kiện sang P6 chưa?

**CÓ.**

| Check từ P5.10 | Trạng thái | Ghi chú |
|---|---|---|
| Settings credential changes có audit log | ✅ Đã fix | 3 actions mới: woo/medusa/company updated |
| Script không có hardcoded secrets | ✅ Đã fix | 3 script files đã dọn |
| TypeScript pass | ✅ Pass | `pnpm tsc --noEmit` exit 0 |
| Next.js build pass | ✅ Pass | Build exit 0 |

**Tất cả điều kiện P5 đã hoàn thành.** Hệ thống sẵn sàng chuyển sang phát triển P6 nghiệp vụ.

---

**Audit by:** Claude Code (P5.11)
**Files changed:** 5
- `lib/auth/audit-log.ts` — thêm settings audit actions + mask helpers
- `app/api/settings/route.ts` — thêm audit log calls
- `run-migration.js` — bỏ hardcoded DB credentials
- `scripts/verify-db.js` — bỏ hardcoded DB credentials
- `scripts/check-db.js` — bỏ hardcoded DB credentials
