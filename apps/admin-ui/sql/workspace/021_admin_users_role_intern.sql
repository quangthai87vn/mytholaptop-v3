-- P8.2.16: Fix admin_users_role_check to include 'intern'
-- Root cause: admin_users_role_check was created in 011_admin_auth.sql
-- and only allowed super_admin/admin/editor/viewer.
-- 020_admin_roles_crud.sql added 'intern' as a custom role but did NOT
-- update the CHECK constraint on admin_users.role column.

BEGIN;

-- Drop the old constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- Add the corrected constraint including 'intern'
ALTER TABLE admin_users
    ADD CONSTRAINT admin_users_role_check
    CHECK (role IN ('super_admin', 'admin', 'editor', 'viewer', 'intern');

-- Verify: this should now succeed
-- INSERT INTO admin_users (email, password_hash, full_name, role, status)
-- VALUES ('test@mtl.vn', 'hash', 'Test', 'intern', 'active');

COMMIT;
