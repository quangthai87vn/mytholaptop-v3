-- P8.2.10: Role Management CRUD + Intern Role
-- =============================================
-- Tables:
--   admin_roles          — stores role definitions (system + custom)
--   admin_role_permissions — maps role_code → permission (only for custom roles)
-- Seed:
--   super_admin, admin, editor, viewer (system)
--   intern (custom, starting point for custom role expansion)

BEGIN;

-- ── admin_roles ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
    code            VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT DEFAULT '',
    role_type      VARCHAR(20) NOT NULL DEFAULT 'custom' CHECK (role_type IN ('system', 'custom')),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── admin_role_permissions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_role_permissions (
    role_code       VARCHAR(50) NOT NULL REFERENCES admin_roles(code) ON DELETE CASCADE,
    permission      VARCHAR(100) NOT NULL,
    PRIMARY KEY (role_code, permission)
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_role_perms_role ON admin_role_permissions(role_code);

-- ── Seed system roles ───────────────────────────────────────────────────────
INSERT INTO admin_roles (code, name, description, role_type, is_active) VALUES
    ('super_admin', 'Super Admin',    'Toàn quyền quản trị hệ thống. Không giới hạn.',              'system', TRUE),
    ('admin',       'Quản trị viên', 'Quản lý workspace, nội dung, nhân viên. Không quản lý credentials hệ thống.', 'system', TRUE),
    ('editor',      'Biên tập viên', 'Tạo/sửa project, campaign, task, nội dung. Không xóa project/campaign. Không chỉnh settings.', 'system', TRUE),
    ('viewer',      'Người xem',     'Chỉ xem dữ liệu. Không tạo, sửa, xóa gì.',                    'system', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ── Seed intern role (custom) ───────────────────────────────────────────────
INSERT INTO admin_roles (code, name, description, role_type, is_active) VALUES
    ('intern', 'Thực tập sinh', 'Làm việc theo task được giao, tạo nội dung cơ bản, không được chỉnh cấu hình hệ thống.', 'custom', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ── Seed intern permissions ──────────────────────────────────────────────────
INSERT INTO admin_role_permissions (role_code, permission) VALUES
    ('intern', 'tasks.read'),
    ('intern', 'tasks.update'),
    ('intern', 'comments.read'),
    ('intern', 'comments.create'),
    ('intern', 'assets.read'),
    ('intern', 'assets.create'),
    ('intern', 'notifications.read'),
    ('intern', 'ai_generate')
ON CONFLICT (role_code, permission) DO NOTHING;

COMMIT;
