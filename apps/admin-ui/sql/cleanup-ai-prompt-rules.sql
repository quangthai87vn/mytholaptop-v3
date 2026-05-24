-- ============================================================
-- Cleanup: ai_prompt_rules
-- Xóa toàn bộ dữ liệu & seed lại default rules
--
-- Chạy trong Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Xem số dòng trước khi xóa
SELECT 'Trước khi dọn:' as label, COUNT(*) as so_dong FROM ai_prompt_rules
UNION ALL
SELECT 'Trong đó trùng lặp:', COUNT(*) - COUNT(DISTINCT scope || COALESCE(platform,'') || rule_key)
FROM ai_prompt_rules;

-- 2. TRUNCATE bảng (xoá sạch + reset auto-increment)
TRUNCATE ai_prompt_rules RESTART IDENTITY CASCADE;

-- 3. Seed lại 5 global rules
INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
VALUES
  ('global', NULL, 'has_cta',          'Mỗi bài viết phải có Call-to-Action (CTA) rõ ràng ở cuối.',            10, true),
  ('global', NULL, 'no_spam',          'Không spam emoji liên tiếp. Tối đa 3 emoji mỗi đoạn.',                   5, true),
  ('global', NULL, 'product_focus',    'Nội dung phải tập trung vào lợi ích sản phẩm, không quảng cáo thuần túy.', 8, true),
  ('global', NULL, 'local_context',    'Nhắc nhở khách hàng đến từ Tiền Giang và khu vực lân cận.',            3, true),
  ('global', NULL, 'price_transparent','Không đưa ra giá cụ thể nếu chưa xác nhận với đội ngũ bán hàng.',       9, true);

-- 4. Seed lại 8 platform rules
INSERT INTO ai_prompt_rules (scope, platform, rule_key, rule_text, priority, is_active)
VALUES
  ('platform', 'facebook', 'hook_3lines', '3 dòng đầu phải gây tò mò, hook mạnh. Có emoji hoặc icon.', 5, true),
  ('platform', 'facebook', 'length',      'Độ dài 150-300 từ. Ngắn gọn, dễ đọc trên mobile.',            5, true),
  ('platform', 'website',  'seo_heading', 'Sử dụng heading H2/H3. Từ khóa tự nhiên, không nhồi nhét.',  5, true),
  ('platform', 'website',  'meta_desc',   'Tạo meta description 150-160 ký tự, chứa từ khóa chính.',   5, true),
  ('platform', 'video',    'hook_3s',    'Hook 3 giây đầu phải gây shock hoặc tò mò cực mạnh.',         5, true),
  ('platform', 'video',    'tempo',      'Nhịp độ nhanh, mỗi phần không quá 10 giây. Có text overlay.', 5, true),
  ('platform', 'image',    'composition', 'Mô tả rõ chủ thể, bối cảnh, ánh sáng, phong cách, màu sắc.', 5, true),
  ('platform', 'zalo',     'short',      'Tin nhắn ngắn, không quá 160 ký tự. Có emoji phù hợp.',       5, true);

-- 5. Xác nhận kết quả
SELECT 'Sau khi dọn:' as label, COUNT(*) as so_dong FROM ai_prompt_rules;

-- 6. Hiển thị toàn bộ rule sau khi seed
SELECT scope, platform, rule_key, priority, is_active FROM ai_prompt_rules ORDER BY scope, priority DESC;
