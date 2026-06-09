-- Seed test values for task module upgrade UI verification
-- Updates 3 most recently touched tasks so UI can be tested immediately.

WITH picked AS (
  SELECT id, row_number() OVER (ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC) AS rn
  FROM pm_tasks
  LIMIT 3
)
UPDATE pm_tasks AS t
SET
  priority = CASE picked.rn
    WHEN 1 THEN 'urgent'
    WHEN 2 THEN 'high'
    ELSE 'low'
  END,
  progress = CASE picked.rn
    WHEN 1 THEN 85
    WHEN 2 THEN 55
    ELSE 20
  END,
  thumbnail_url = CASE picked.rn
    WHEN 1 THEN COALESCE(t.thumbnail_url, 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80')
    WHEN 2 THEN COALESCE(t.thumbnail_url, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80')
    ELSE COALESCE(t.thumbnail_url, 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1200&q=80')
  END
FROM picked
WHERE t.id = picked.id;

SELECT id, title, priority, progress, thumbnail_url
FROM pm_tasks
WHERE id IN (
  SELECT id FROM pm_tasks ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC LIMIT 3
)
ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC;
