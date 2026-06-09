-- Migration: 042_task_priority_thumbnail
-- Date: 2026-06-08
-- Author: Task Module Upgrade
-- Description:
--   1. Thêm cột priority vào pm_tasks (low/normal/high/urgent)
--   2. Thêm cột thumbnail_url cho fallback thumbnail (khi không có youtube_url)
--   3. Tạo index cho priority
--   4. Ghi chú: priority từng tồn tại ở migration 006 (đã bị xóa)
--      Bây giờ recreate với giá trị mới: low, normal, high, urgent

BEGIN;

-- ── 1. Thêm cột priority ──────────────────────────────────────────────
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20)
  DEFAULT 'normal'
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Ghi chú: CHECK constraint yêu cầu giá trị phải là một trong 4 mức
-- low      → Thấp (🟢)
-- normal   → Bình thường (🔵)
-- high     → Cao (🟠)
-- urgent   → Khẩn cấp (🔴)

-- ── 2. Thêm cột thumbnail_url ────────────────────────────────────────────
ALTER TABLE pm_tasks
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- ── 3. Tạo index cho priority ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pm_tasks_priority ON pm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_thumbnail_url ON pm_tasks(thumbnail_url)
  WHERE thumbnail_url IS NOT NULL;

-- ── 4. Đảm bảo trigger updated_at tồn tại ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pm_tasks_updated_at' AND tgrelid = 'pm_tasks'::regclass) THEN
    CREATE TRIGGER update_pm_tasks_updated_at
      BEFORE UPDATE ON pm_tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

COMMIT;

-- Verification: kiểm tra columns đã được thêm
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'pm_tasks' AND column_name IN ('priority', 'thumbnail_url');
