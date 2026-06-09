# Fix Campaign Module — End-to-End Report

**Ngày:** 2026-05-30  
**Người thực hiện:** Claude Agent  
**Phiên bản:** MTP v3 — Workspace Campaign Module  

---

## 1. Tóm tắt Bugs đã Fix

| # | Bug | Root Cause |
|---|-----|-----------|
| 1 | Campaign Status dropdown hardcoded | `CampaignForm` thiếu `campaign_statuses` trong `CampaignMasterData` |
| 2 | Campaign Type label hardcoded | `campaign-card.tsx` dùng `TYPE_LABEL` static thay vì từ master data |
| 3 | Campaign Status label hardcoded | `campaign-card.tsx` dùng `STATUS_LABEL`/`STATUS_COLOR` static thay vì từ master data |
| 4 | Task count không hiển thị | `pm_campaigns` không join với `pm_tasks` |
| 5 | Date hiển thị sai timezone | `campaign-card.tsx` dùng `new Date()` cho `YYYY-MM-DD` string |

---

## 2. Root Causes chi tiết

### Bug 1 & 2 & 3 — Hardcoded Campaign Status/Type

**Trước:**  
- `CampaignForm` chỉ nhận `campaign_types` và `channels`, KHÔNG nhận `campaign_statuses`
- Status dropdown hardcoded 5 giá trị: `planning`, `active`, `paused`, `completed`, `cancelled`
- `campaign-card.tsx` dùng `STATUS_LABEL[campaign.status]` và `TYPE_LABEL[campaign.campaign_type]`

**Sau:**  
- `CampaignMasterData` (trong cả form và list) bao gồm `campaign_statuses: MasterDataItem[]`
- `CampaignList` nhận `statusOptions` và `typeOptions` từ page server component
- `CampaignCard` nhận `statusConfig` và `typeConfig` đã resolve, fallback sang hardcoded nếu không có

### Bug 4 — Task Count

**Trước:** `getCampaigns()` chỉ SELECT * từ `pm_campaigns`, không có join với tasks.

**Sau:** `getCampaigns()` SELECT với subquery:
```sql
SELECT c.*, (
  SELECT COUNT(*) FROM pm_tasks t
  WHERE t.campaign_id = c.id
)::int AS _task_count
FROM pm_campaigns c ...
```

`_task_count` được inject vào `Campaign` type, pass xuống `CampaignCard` hiển thị badge.

### Bug 5 — Date Display

**Trước:** `campaign-card.tsx` dùng `new Date(campaign.start_date).toLocaleDateString("vi-VN")` → "2026-06-03" parse as UTC → hiển thị **02/06**.

**Sau:** Safe parse `YYYY-MM-DD`:
```tsx
const fmt = (ds: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("vi-VN", ...);
  }
  return new Date(ds).toLocaleDateString("vi-VN", ...);
};
```

---

## 3. Files Changed

### `components/campaigns/campaign-form.tsx`
- Thêm `campaign_statuses: MasterDataItem[]` vào `CampaignMasterData`
- Status Select: thay hardcoded `<SelectItem>` bằng dynamic map từ `masterData.campaign_statuses`

### `components/campaigns/campaign-card.tsx`
- Thêm `statusConfig`, `typeConfig`, `taskCount` vào props
- Xóa hardcoded `STATUS_COLOR`, `STATUS_LABEL`, `TYPE_LABEL`
- Thêm fallback maps cho unknown codes
- Thêm `<Badge>` hiển thị task count
- Fix date parsing cho `YYYY-MM-DD`

### `components/campaigns/campaign-list.tsx`
- Nhận `statusOptions` và `typeOptions` (MasterDataItem arrays)
- Resolve thành `statusMap` và `typeMap` (Record<string, MasterDataItem>)
- Pass `statusConfig`, `typeConfig`, `taskCount` xuống `CampaignCard`

### `lib/workspace/db/index.ts`
- `getCampaigns()`: thêm `_task_count` subquery

### `lib/workspace/types.ts`
- `Campaign` interface: thêm `_task_count?: number`

### `app/(admin)/campaigns/campaigns-client.tsx`
- Pass `statusOptions` và `typeOptions` xuống `CampaignList`

---

## 4. Data Flow — Before / After

### Create Campaign Flow
```
User chọn Status → CampaignForm
  → masterData.campaign_statuses (từ server page)
  → Submit POST /api/campaigns
    → createCampaignSchema.validate
      → campaign_status valid enum ✅ (hoặc accept "")
    → createCampaign(db)
      → INSERT pm_campaigns ✅
    → router.refresh() → server re-fetches ✅
```

### Campaign Card Display
```
getCampaigns()
  → SELECT c.*, (SELECT COUNT(*) FROM pm_tasks WHERE campaign_id = c.id) AS _task_count
  → campaigns.map(c => ({ ...c, _task_count }))
    → CampaignList(statusOptions, typeOptions)
      → CampaignCard(statusConfig, typeConfig, taskCount)
        → Badge: "3 công việc" ✅
        → STATUS_LABEL từ master data ✅
```

---

## 5. Manual Test Checklist

### Test 1: Campaign Status từ Danh mục
- [ ] Vào /workspace/master-data → thêm 1 campaign_status mới (VD: "Đang test")
- [ ] Vào /campaigns → Tạo chiến dịch mới → dropdown Status có thêm "Đang test"
- [ ] Vào /campaigns → click Sửa → dropdown Status có "Đang test"

### Test 2: Campaign Type từ Danh mục
- [ ] Vào /workspace/master-data → thêm 1 campaign_type mới (VD: "khuyen-mai")
- [ ] Vào /campaigns → Tạo chiến dịch mới → Type dropdown hiển thị type mới
- [ ] Campaign card hiển thị đúng label từ master data

### Test 3: Create Campaign
- [ ] Tạo chiến dịch mới → điền đầy đủ → "Tạo chiến dịch"
- [ ] Toast: "Đã tạo chiến dịch mới" hiển thị
- [ ] Danh sách tự refresh, chiến dịch mới xuất hiện

### Test 4: Edit Campaign
- [ ] Click Sửa → sửa tên → "Lưu thay đổi"
- [ ] Toast: "Đã cập nhật chiến dịch" hiển thị
- [ ] Chiến dịch cập nhật trong danh sách

### Test 5: Delete Campaign
- [ ] Click Xóa → xác nhận
- [ ] Toast: "Đã xóa chiến dịch" hiển thị
- [ ] Chiến dịch biến mất khỏi danh sách

### Test 6: Task Count
- [ ] Tạo 3 tasks gắn vào 1 campaign
- [ ] Vào /campaigns → Campaign card hiển thị "3 công việc" badge
- [ ] Xóa 1 task → refresh → badge hiển thị "2 công việc"

### Test 7: Date Display
- [ ] Tạo campaign với start=2026-06-03, end=2026-06-10
- [ ] Card hiển thị đúng ngày: "03 thg 6, 2026 – 10 thg 6, 2026" (không phải 02/06)
- [ ] Sửa campaign → date vẫn đúng

### Test 8: Console Errors
- [ ] Mở DevTools Console
- [ ] Create/Edit/Delete → không có 400/500 error
- [ ] Không có TypeError, undefined access

---

## 6. Regression Risks

| Area | Risk | Mitigation |
|------|------|-----------|
| `campaign-form.tsx` Status fallback | Nếu `campaign_statuses` rỗng, fallback hiển thị 5 hardcoded options | Đảm bảo seed data có campaign_status trong master data |
| `campaign-card.tsx` unknown status code | Nếu DB có status không có trong master data, fallback dùng `FALLBACK_STATUS` | Không crash, chỉ hiển thị code gốc |
| `toISOStringOrNull` → `toDateOnlyString` | Campaign form date send `YYYY-MM-DD` thay vì ISO timestamp | Backend schema nhận string → PostgreSQL DATE column nhận đúng |

---

## 7. Date Flow (Đã fix ở task module trước)

Campaign form date handling được fix đồng thời với task date fix:
- `toISOStringOrNull` → `toDateOnlyString` trong `date-utils.ts`
- Frontend gửi `YYYY-MM-DD` string (date-only)
- Backend schema validate string → PostgreSQL DATE nhận đúng
