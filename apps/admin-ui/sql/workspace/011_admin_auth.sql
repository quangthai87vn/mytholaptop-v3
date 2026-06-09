-- Migration: 011_admin_auth.sql
-- Mục tiêu: Tạo bảng admin_users + sessions cho hệ thống đăng nhập Admin
-- Chạy: npx tsx lib/migration/cli.ts migrate
-- Hoặc: psql -U postgres -d commerce -f sql/workspace/011_admin_auth.sql

BEGIN;

-- Bảng admin_users: lưu thông tin người dùng admin
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin'
        CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng admin_sessions: lưu session trong database (cho multi-instance server)
-- Key: session_id → user_id, created_at, expires_at
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index cho lookup nhanh theo session_id
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_id ON admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Index cho email lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

-- Tự động update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================
-- HƯỚNG DẪN TẠO ADMIN ĐẦU TIÊN
-- ============================================================
-- Sau khi chạy migration, chạy script seed để tạo admin đầu tiên:
--   npx tsx scripts/seed-admin.ts
--
-- Hoặc dùng biến môi trường:
--   ADMIN_EMAIL=admin@mtl.vn ADMIN_PASSWORD=Mtl@2026! npx tsx scripts/seed-admin.ts
--
-- Hoặc chạy trực tiếp SQL (tạo hash trước):
--   node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Mtl@2026!', 12))"
--   INSERT INTO admin_users (email, password_hash, full_name, role)
--   VALUES ('admin@mtl.vn', 'REPLACE_WITH_HASH', 'Quản Trị Viên', 'super_admin');
-- ============================================================
