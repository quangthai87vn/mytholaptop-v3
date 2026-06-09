/**
 * Run Activity Audit Trail Migration — P6.8
 * Execute: node scripts/run-migration-019.js
 */
const { Client } = require('pg');

function parseDatabaseUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid DATABASE_URL format');
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const dbUrl = process.env.DATABASE_URL || 'postgresql://mytholaptop_user:1Passw0rdphatxitnhat@postgresql.mtl.vn:7000/mytholaptop';
const dbConfig = parseDatabaseUrl(dbUrl);

const client = new Client({
  ...dbConfig,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const sql = `
BEGIN;

-- ============================================================
-- DROP old view (cannot ALTER column names in CREATE OR REPLACE)
-- ============================================================
DROP VIEW IF EXISTS v_workspace_activities;

-- ============================================================
-- Bảng pm_notification_events
-- Log notification được gửi cho user (ngoài pm_notifications)
-- Dùng để track system notifications trong activity feed
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    actor_id UUID,
    actor_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_user_id ON pm_notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_entity ON pm_notification_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON pm_notification_events(created_at DESC);

COMMENT ON TABLE pm_notification_events IS 'Notification event log for activity feed — P6.8';

-- ============================================================
-- FUNCTION: notify_user (ghi notification + notification_events)
-- ============================================================
CREATE OR REPLACE FUNCTION notify_user(p_data JSONB)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
    v_user_id UUID;
    v_notification_type VARCHAR(50);
    v_title VARCHAR(500);
    v_message TEXT;
    v_entity_type VARCHAR(50);
    v_entity_id UUID;
    v_actor_id UUID;
    v_actor_name VARCHAR(255);
BEGIN
    -- Validate required fields
    IF p_data->>'user_id' IS NULL OR p_data->>'type' IS NULL OR p_data->>'title' IS NULL THEN
        RAISE EXCEPTION 'user_id, type, and title are required';
    END IF;

    v_user_id := (p_data->>'user_id')::UUID;
    v_notification_type := p_data->>'type';
    v_title := p_data->>'title';
    v_message := p_data->>'message';
    v_entity_type := p_data->>'entity_type';
    v_entity_id := (p_data->>'entity_id')::UUID;
    v_actor_id := (p_data->>'actor_id')::UUID;
    v_actor_name := p_data->>'actor_name';

    -- Insert notification
    INSERT INTO pm_notifications (
        user_id, type, title, message,
        entity_type, entity_id, is_read, dedup_key, metadata
    ) VALUES (
        v_user_id, v_notification_type, v_title, v_message,
        v_entity_type, v_entity_id, false,
        p_data->>'dedup_key',
        COALESCE((p_data->>'metadata')::JSONB, '{}')
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_id;

    -- Insert notification event for activity feed
    INSERT INTO pm_notification_events (
        user_id, notification_type, title, message,
        entity_type, entity_id, actor_id, actor_name, metadata
    ) VALUES (
        v_user_id, v_notification_type, v_title, v_message,
        v_entity_type, v_entity_id, v_actor_id, v_actor_name,
        COALESCE((p_data->>'metadata')::JSONB, '{}')
    );

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Nâng cấp VIEW: v_workspace_activities
-- Gom 4 nguồn log: pm_task_activities, pm_status_history,
-- pm_audit_logs, pm_notification_events
-- ============================================================
CREATE OR REPLACE VIEW v_workspace_activities AS
-- Nguồn 1: Task activities (pm_task_activities)
SELECT
    ta.id,
    'task_activity'::VARCHAR(50) AS source_table,
    ta.task_id AS entity_id,
    'task' AS entity_type,
    COALESCE(t.title, 'Không rõ') AS entity_name,
    ta.actor_id,
    ta.actor_name,
    ta.action AS action_type,
    ta.field_changed,
    ta.old_value,
    ta.new_value,
    ta.metadata,
    ta.created_at
FROM pm_task_activities ta
LEFT JOIN pm_tasks t ON ta.task_id = t.id

UNION ALL

-- Nguồn 2: Status history (pm_status_history)
SELECT
    sh.id,
    'status_history'::VARCHAR(50) AS source_table,
    sh.entity_id,
    sh.entity_type,
    COALESCE(
        t.title,
        p.name,
        c.name,
        mw.title,
        'Entity ' || sh.entity_id::text
    ) AS entity_name,
    sh.changed_by AS actor_id,
    sh.changed_by_name AS actor_name,
    'status_changed' AS action_type,
    'status' AS field_changed,
    sh.from_status AS old_value,
    sh.to_status AS new_value,
    NULL AS metadata,
    sh.created_at
FROM pm_status_history sh
LEFT JOIN pm_tasks t ON sh.entity_type = 'task' AND sh.entity_id = t.id
LEFT JOIN pm_projects p ON sh.entity_type = 'project' AND sh.entity_id = p.id
LEFT JOIN pm_campaigns c ON sh.entity_type = 'campaign' AND sh.entity_id = c.id
LEFT JOIN pm_media_workflows mw ON sh.entity_type = 'media_workflow' AND sh.entity_id = mw.id

UNION ALL

-- Nguồn 3: Audit logs (pm_audit_logs)
SELECT
    al.id,
    'audit_log'::VARCHAR(50) AS source_table,
    al.entity_id,
    al.entity_type,
    COALESCE(al.asset_type, al.entity_type) AS entity_name,
    al.actor_id,
    al.actor_name,
    al.action AS action_type,
    NULL AS field_changed,
    NULL AS old_value,
    NULL AS new_value,
    al.metadata,
    al.created_at
FROM pm_audit_logs al

UNION ALL

-- Nguồn 4: Notification events (pm_notification_events)
SELECT
    ne.id,
    'notification_event'::VARCHAR(50) AS source_table,
    ne.entity_id,
    COALESCE(ne.entity_type, 'system') AS entity_type,
    COALESCE(ne.title, 'Thông báo') AS entity_name,
    ne.actor_id,
    ne.actor_name,
    ne.notification_type AS action_type,
    NULL AS field_changed,
    NULL AS old_value,
    NULL AS new_value,
    ne.metadata,
    ne.created_at
FROM pm_notification_events ne

ORDER BY created_at DESC
LIMIT 500;

COMMENT ON VIEW v_workspace_activities IS
  'Unified activity feed: task activities + status history + audit logs + notification events. P6.8';
COMMENT ON TABLE pm_notification_events IS
  'Notification event log for activity feed — P6.8';

COMMIT;
  `.trim();

  try {
    await client.connect();
    console.log('[P6.8] Connected to database');
    await client.query(sql);
    console.log('[P6.8] Activity audit trail migration completed successfully');
  } catch (err) {
    console.error('[P6.8] Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
