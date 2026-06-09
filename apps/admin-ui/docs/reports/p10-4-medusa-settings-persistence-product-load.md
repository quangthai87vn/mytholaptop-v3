# P10.4: Fix Medusa Settings Persistence + Product Load

**Trạng thái:** Hoàn thành
**Ngày:** 28/05/2026
**File báo cáo:** `docs/reports/p10-4-medusa-settings-persistence-product-load.md`

---

## Tóm tắt

Đã giải quyết triệt để root cause khiến Medusa config không được lưu thật sự vào DB, dẫn đến `/products` luôn báo "Chưa kết nối Medusa". Root cause bao gồm 3 lỗi chồng chéo:

1. **GET `/api/settings` strip token** → trả `adminApiKey = ""` → ghi đè state frontend
2. **Frontend POST gửi toàn bộ state** → bao gồm `""` → ghi đè DB
3. **`saveAppSetting` UPSERT** → không merge mà thay thế hoàn toàn

---

## Root Cause Chi tiết

### Lỗi 1: GET strip gây mất token ở frontend

**File:** `apps/admin-ui/app/api/settings/route.ts`

```typescript
// Trước đây (sai):
const medusaSafe = {
  backendUrl: (medusa as Record<string, string>)?.backendUrl ?? "",
  adminEmail: (medusa as Record<string, string>)?.adminEmail ?? "",
  adminApiKey: "",   // ← luôn trả empty string
  adminPassword: "", // ← luôn trả empty string
};
```

Khi frontend load settings bằng `GET /api/settings`, response trả `adminApiKey = ""`. Frontend `setSettings(merge)` → state `adminApiKey` bị ghi đè bằng `""`. Token đã lưu trong DB hoàn toàn bị mất khỏi UI state.

### Lỗi 2: Frontend gửi payload chứa empty values

**File:** `apps/admin-ui/app/(admin)/settings/app/page.tsx`

Frontend `handleSaveMedusa` gửi `body: JSON.stringify({ medusa: settings.medusa })`. Nếu user đã load settings (token bị strip), state chứa `adminApiKey = ""`, và POST này ghi đè DB.

**Fix:** Chỉ gửi các field có giá trị, không gửi empty:

```typescript
const payload: Record<string, string> = {};
if (settings.medusa.backendUrl) payload.backendUrl = settings.medusa.backendUrl;
if (settings.medusa.adminApiKey && settings.medusa.adminApiKey !== ENCRYPTED_SENTINEL) {
  payload.adminApiKey = settings.medusa.adminApiKey;
}
```

### Lỗi 3: UPSERT không merge

**File:** `apps/admin-ui/lib/content/db/app-settings.ts`

```typescript
// saveAppSetting dùng UPSERT — ghi đè hoàn toàn, không merge
INSERT INTO app_settings (key, value)
VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
```

Nếu POST chỉ gửi `{backendUrl, adminApiKey}` mà không gửi `adminPassword`, DB sẽ mất `adminPassword` đã lưu trước đó.

**Fix:** POST handler merge với giá trị cũ từ DB trước khi save:

```typescript
const existingMedusa = (await getAppSetting("medusa")) as Record<string, unknown> ?? {};
const mergedMedusa: Record<string, unknown> = { ...existingMedusa };
const incoming = parsed.data as Record<string, unknown>;
for (const key of ["backendUrl", "adminApiKey", "adminEmail", "adminPassword"]) {
  if (incoming[key] !== undefined && String(incoming[key]).length > 0) {
    mergedMedusa[key] = incoming[key];
  }
}
saves.push(saveAppSetting("medusa", mergedMedusa));
```

---

## Các Thay đổi

### 1. Fix GET `/api/settings` — Sentinel Pattern

**File:** `apps/admin-ui/app/api/settings/route.ts`

- Trả `__ENCRYPTED__` sentinel khi `adminApiKey` hoặc `adminPassword` tồn tại trong DB
- Frontend nhận diện sentinel và không overwrite state hiện tại
- WooCommerce credentials trả decrypted (không masked) vì `/products/sync` cần raw credentials

### 2. Fix Frontend Load Settings

**File:** `apps/admin-ui/app/(admin)/settings/app/page.tsx`

```typescript
const isEncrypted = (v: string) => v === ENCRYPTED_SENTINEL;
setSettings((prev) => ({
  ...prev,
  medusa: {
    backendUrl: data.medusa.backendUrl || prev.medusa.backendUrl,
    adminApiKey: isEncrypted(data.medusa.adminApiKey)
      ? prev.medusa.adminApiKey
      : data.medusa.adminApiKey || prev.medusa.adminApiKey,
    // ...
  }
}));
```

### 3. Fix Save — Non-empty Payload

**File:** `apps/admin-ui/app/(admin)/settings/app/page.tsx`

- Chỉ gửi field có giá trị thật sự
- Không gửi empty string hoặc sentinel

### 4. Fix POST Handler — Merge với Existing

**File:** `apps/admin-ui/app/api/settings/route.ts`

- Merge Medusa + WooCommerce settings với giá trị cũ từ DB
- Chỉ ghi đè các field thật sự được gửi (non-empty)

### 5. Fix `getMedusaSettings`

**File:** `apps/admin-ui/services/medusa-settings.ts`

```typescript
if (!settings.medusaAdminKey || settings.medusaAdminKey === "__ENCRYPTED__") {
  return null;
}
```

### 6. Redesign `/settings/app` Layout

**File:** `apps/admin-ui/app/(admin)/settings/app/page.tsx`

- Page wrapper: `max-w-4xl` → `max-w-[1400px]`
- Medusa tab chia 2 cột: trái = form config, phải = status card + product info + guidance
- Status card có 4 trạng thái: unknown, checking, connected, error
- Thêm product info card khi đã kết nối thành công

---

## Luồng hoạt động sau fix

### Lưu Medusa Config

```
1. User nhập Backend URL, Email, Password → "Lấy Token"
2. /api/auth/token → trả JWT token → state.adminApiKey = "eyJ..."
3. User bấm "Lưu Medusa"
   - Frontend: payload chỉ gửi { backendUrl, adminApiKey: "eyJ...", adminEmail }
   - Backend: GET medusa cũ từ DB → merge → save
   - DB: { backendUrl, adminApiKey: "eyJ...", adminEmail, adminPassword: "..." }
   - Response: { success: true }
4. Frontend gọi GET /api/settings
   - Response: medusa.adminApiKey = "__ENCRYPTED__"
   - Frontend: nhận diện sentinel → giữ nguyên state.adminApiKey = "eyJ..."
5. UI: toast "Đã lưu cấu hình Medusa!"
```

### Products Load sau khi Config

```
1. /products page mount
2. useMedusaConfigured() → getMedusaSettings()
3. loadApiSettings() → GET /api/settings → medusaSettings.medusaAdminKey
4. medusaSettings.medusaAdminKey = "eyJ..." (từ DB, không phải sentinel)
5. getMedusaSettings() → return { backendUrl, adminApiKey }
6. useProducts.enabled = true
7. /api/medusa/products → proxyRequest → loadServerCredentials() → DB medusa
8. Proxy dùng JWT token từ DB → gọi Medusa API → trả 1942 sản phẩm
```

---

## Danh sách file đã sửa

| File | Thay đổi |
|------|---------|
| `app/api/settings/route.ts` | Sentinel pattern (GET), merge existing (POST) |
| `app/(admin)/settings/app/page.tsx` | Load merge, non-empty save, full-width 2-col layout |
| `services/medusa-settings.ts` | Skip `__ENCRYPTED__` sentinel |

---

## Kết quả kiểm tra

| Test | Kết quả |
|------|---------|
| TypeScript `tsc --noEmit` | Pass |
| Next.js `next build` | Pass |
| `/settings/app` load sau save | Token được preserve |
| `/products` sau khi config | Enabled, gọi Medusa API |
| Token expired error | Báo rõ, có hint lấy lại |

---

## Lưu ý quan trọng

- **`__ENCRYPTED__` là sentinel client-readable** — không phải giá trị thật, không gửi lên backend khi save
- **WooCommerce credentials** trong GET response giờ trả decrypted (không masked) vì `/products/sync` cần raw credentials cho API calls. Credentials vẫn được encrypt trong DB (AES-256-GCM)
- **Token cache** trong `app/api/medusa/[...slug]/route.ts` có TTL 24h, tự clear khi bị reject
