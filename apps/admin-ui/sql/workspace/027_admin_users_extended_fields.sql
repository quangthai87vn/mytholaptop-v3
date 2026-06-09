-- ============================================================
-- Migration: 027_admin_users_extended_fields.sql
-- Phase: Employee Management - extended admin_users fields
-- Date: 2026-05-30
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────
-- ADD COLUMNS TO admin_users
-- ──────────────────────────────────────────────────────────

-- Avatar & contact
DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN avatar_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN phone VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN citizen_id VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN address TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Personal info
DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN birth_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN gender VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN emergency_contact TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Employment info
DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN employee_type VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN job_title VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN department VARCHAR(255);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN start_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN end_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN employment_status VARCHAR(50);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Notes & audit
DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN disabled_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE admin_users ADD COLUMN disabled_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add CHECK constraints
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_gender_check'
    ) INTO constraint_exists;
    IF NOT constraint_exists THEN
        ALTER TABLE admin_users
            ADD CONSTRAINT admin_users_gender_check
            CHECK (gender IN ('male', 'female', 'other'));
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_employee_type_check'
    ) INTO constraint_exists;
    IF NOT constraint_exists THEN
        ALTER TABLE admin_users
            ADD CONSTRAINT admin_users_employee_type_check
            CHECK (employee_type IN ('intern', 'employee', 'freelancer', 'collaborator'));
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_employment_status_check'
    ) INTO constraint_exists;
    IF NOT constraint_exists THEN
        ALTER TABLE admin_users
            ADD CONSTRAINT admin_users_employment_status_check
            CHECK (employment_status IN ('working', 'on_leave', 'suspended', 'terminated'));
    END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_phone ON admin_users(phone);
CREATE INDEX IF NOT EXISTS idx_admin_users_manager_id ON admin_users(manager_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_employee_type ON admin_users(employee_type);
CREATE INDEX IF NOT EXISTS idx_admin_users_employment_status ON admin_users(employment_status);
CREATE INDEX IF NOT EXISTS idx_admin_users_disabled_at ON admin_users(disabled_at);

-- ──────────────────────────────────────────────────────────
-- VERIFICATION
-- ──────────────────────────────────────────────────────────

DO $$
DECLARE
    v_has_phone BOOLEAN;
    v_has_avatar BOOLEAN;
    v_has_citizen_id BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_users' AND column_name = 'phone'
    ) INTO v_has_phone;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_users' AND column_name = 'avatar_url'
    ) INTO v_has_avatar;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin_users' AND column_name = 'citizen_id'
    ) INTO v_has_citizen_id;

    IF v_has_phone AND v_has_avatar AND v_has_citizen_id THEN
        RAISE NOTICE 'OK: admin_users extended fields added successfully';
    ELSE
        RAISE EXCEPTION 'FAIL: Some columns not added. phone=%, avatar=%, citizen_id=%', v_has_phone, v_has_avatar, v_has_citizen_id;
    END IF;
END $$;

-- Log
INSERT INTO pm_audit_logs (actor_name, action, entity_type, entity_id, metadata)
VALUES (
    'System',
    'migration',
    'system',
    NULL,
    '{"migration": "027_admin_users_extended_fields", "description": "Add extended fields to admin_users: avatar_url, phone, citizen_id, address, birth_date, gender, emergency_contact, employee_type, job_title, department, start_date, end_date, employment_status, manager_id, notes, disabled_at, disabled_by"}'
);

COMMIT;
