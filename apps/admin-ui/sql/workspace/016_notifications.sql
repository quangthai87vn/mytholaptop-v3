CREATE OR REPLACE FUNCTION create_notification(params JSONB)
RETURNS UUID AS $$
DECLARE
  notif_id UUID;
  existing_count INTEGER;
  dedup_key TEXT;
  dedup_window INTERVAL := INTERVAL '24 hours';
BEGIN
  dedup_key := params->>'dedup_key';

  IF dedup_key IS NOT NULL AND dedup_key != '' THEN
    SELECT COUNT(*) INTO existing_count
    FROM pm_notifications
    WHERE pm_notifications.dedup_key = create_notification.dedup_key
      AND created_at > NOW() - dedup_window;

    IF existing_count > 0 THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO pm_notifications (
    user_id,
    user_name,
    type,
    title,
    message,
    entity_type,
    entity_id,
    is_read,
    dedup_key,
    metadata
  ) VALUES (
    params->>'user_id',
    params->>'user_name',
    params->>'type',
    params->>'title',
    params->>'message',
    params->>'entity_type',
    (params->>'entity_id')::UUID,
    COALESCE((params->>'is_read')::BOOLEAN, false),
    dedup_key,
    COALESCE(params->'metadata', '{}')
  )
  RETURNING id INTO notif_id;

  RETURN notif_id;
END;
$$ LANGUAGE plpgsql;