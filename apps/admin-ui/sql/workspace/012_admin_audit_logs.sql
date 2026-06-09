-- Migration: 012_admin_audit_logs.sql
-- P5.9: RBAC Hardening & Audit Log
-- Mục đích: Ghi log khi admin thay đổi user/role/status
-- Source of truth: admin_users (P4.Auth)

-- ============================================================
-- Bảng admin_audit_logs
-- Lưu audit trail cho các thao tác quản trị admin user
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- user.created, user.role_changed, user.status_changed, user.password_reset, user.disabled
    target_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    target_user_email VARCHAR(255),
    target_user_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index cho truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Comment
COMMENT ON TABLE admin_audit_logs IS 'Audit trail cho RBAC admin — P5.9';
COMMENT ON COLUMN admin_audit_logs.action IS 'user.created|user.role_changed|user.status_changed|user.password_reset|user.disabled';
COMMENT ON COLUMN admin_audit_logs.old_value IS 'Giá trị trước khi thay đổi (JSON)';
COMMENT ON COLUMN admin_audit_logs.new_value IS 'Giá trị sau khi thay đổi (JSON)';
