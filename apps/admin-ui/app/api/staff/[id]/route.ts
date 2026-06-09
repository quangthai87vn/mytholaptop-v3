/**
 * GET /api/staff/[id] — Lấy thông tin 1 nhân viên
 * PUT /api/staff/[id] — Cập nhật nhân viên (role/status/name/password)
 * DELETE /api/staff/[id] — Soft-delete nhân viên
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import {
  hasPermission,
  canAssignRole,
  canManageRole,
  canManageUser,
  isLastSuperAdmin,
  getRoleLevel,
  type Role,
} from "@/lib/auth/permissions";
import type { AdminUser } from "@/lib/auth/session";
import { requireCsrf } from "@/lib/auth/csrf";
import { writeAuditLog, buildAuditEntry, extractIpAddress } from "@/lib/auth/audit-log";
import { z } from "zod";

interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields (migration 027)
  avatar_url: string | null;
  phone: string | null;
  citizen_id: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  emergency_contact: string | null;
  employee_type: string | null;
  job_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  employment_status: string | null;
  manager_id: string | null;
  notes: string | null;
  disabled_at: string | null;
  disabled_by: string | null;
}

interface StaffResponse {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields
  avatar_url: string | null;
  phone: string | null;
  citizen_id: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  emergency_contact: string | null;
  employee_type: string | null;
  job_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  employment_status: string | null;
  manager_id: string | null;
  notes: string | null;
  disabled_at: string | null;
  disabled_by: string | null;
}

function rowToStaff(row: StaffRow): StaffResponse {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role as Role,
    status: row.status as "active" | "inactive",
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    avatar_url: row.avatar_url,
    phone: row.phone,
    citizen_id: row.citizen_id,
    address: row.address,
    birth_date: row.birth_date,
    gender: row.gender,
    emergency_contact: row.emergency_contact,
    employee_type: row.employee_type,
    job_title: row.job_title,
    department: row.department,
    start_date: row.start_date,
    end_date: row.end_date,
    employment_status: row.employment_status,
    manager_id: row.manager_id,
    notes: row.notes,
    disabled_at: row.disabled_at,
    disabled_by: row.disabled_by,
  };
}

// ─── GET /api/staff/[id] ───────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "users.read")) {
    return NextResponse.json(
      { error: "Không có quyền xem nhân viên.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const result = await query<StaffRow>(
    `SELECT id, email, full_name, role, status, last_login_at, created_at, updated_at,
            avatar_url, phone, citizen_id, address, birth_date, gender,
            emergency_contact, employee_type, job_title, department,
            start_date, end_date, employment_status, manager_id, notes,
            disabled_at, disabled_by
     FROM admin_users WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhân viên.", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ data: rowToStaff(result.rows[0]) });
}

// ─── PUT /api/staff/[id] ─────────────────────────────────────────────────────

const UpdateStaffSchema = z.object({
  // Account info (role/admin only)
  full_name: z.string().min(2).max(255).optional(),
  role: z.enum(["super_admin", "admin", "editor", "viewer", "intern"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  password: z.string().min(8).max(128).optional(),
  // Extended fields (basic info + employment)
  avatar_url: z.string().url().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  citizen_id: z.string().max(20).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  emergency_contact: z.string().optional().or(z.literal("")),
  employee_type: z.enum(["intern", "employee", "freelancer", "collaborator"]).optional().or(z.literal("")),
  job_title: z.string().max(255).optional().or(z.literal("")),
  department: z.string().max(255).optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  employment_status: z.enum(["working", "on_leave", "suspended", "terminated"]).optional().or(z.literal("")),
  manager_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "users.update")) {
    return NextResponse.json(
      { error: "Không có quyền cập nhật nhân viên.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body không hợp lệ", code: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = UpdateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten(), code: "VALIDATION_ERROR" },
      { status: 422 }
    );
  }

  const {
    full_name, role, status, password,
    avatar_url, phone, citizen_id, address,
    birth_date, gender, emergency_contact,
    employee_type, job_title, department,
    start_date, end_date, employment_status, manager_id, notes,
  } = parsed.data;

  const currentResult = await query<StaffRow>(
    `SELECT id, email, full_name, role, status, last_login_at, created_at, updated_at,
            avatar_url, phone, citizen_id, address, birth_date, gender,
            emergency_contact, employee_type, job_title, department,
            start_date, end_date, employment_status, manager_id, notes,
            disabled_at, disabled_by
     FROM admin_users WHERE id = $1`,
    [id]
  );
  if (currentResult.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhân viên.", code: "NOT_FOUND" }, { status: 404 });
  }
  const current = currentResult.rows[0];

  // ── Hierarchy: actor must be able to manage this target user for any edit ──
  if (!canManageUser(authUser.role, authUser.id, id, current.role, "edit")) {
    return NextResponse.json(
      { error: "Bạn không có quyền chỉnh sửa tài khoản này.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // ── Hierarchy: role change ──────────────────────────────────────────────────
  if (role !== undefined && role !== current.role) {
    // Only super_admin can change roles
    if (authUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Chỉ super_admin mới có quyền thay đổi vai trò.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }
    // Hierarchy: cannot assign role higher than or equal to own level
    if (!canAssignRole(authUser.role, role)) {
      return NextResponse.json(
        { error: `Bạn không có quyền gán vai trò "${role}" cho người dùng này.`, code: "FORBIDDEN" },
        { status: 403 }
      );
    }
  }

  // ── Hierarchy: prevent self-deactivation ────────────────────────────────────
  if (id === authUser.id && status === "inactive") {
    return NextResponse.json(
      { error: "Bạn không thể tự vô hiệu hóa tài khoản của chính mình.", code: "SELF_DEACTIVATE" },
      { status: 403 }
    );
  }

  // ── Last super admin protection ──────────────────────────────────────────────
  if ((role !== undefined && role !== "super_admin") || status === "inactive") {
    if (current.role === "super_admin") {
      const countResult = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM admin_users WHERE role = 'super_admin' AND status = 'active'"
      );
      const superAdminCount = parseInt(countResult.rows[0]?.count ?? "0", 10);
      if (isLastSuperAdmin(id, superAdminCount)) {
        return NextResponse.json(
          { error: "Không thể thay đổi vai trò của super_admin cuối cùng.", code: "LAST_SUPER_ADMIN" },
          { status: 403 }
        );
      }
    }
  }

  // ── Build update ──────────────────────────────────────────────────────────────
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 0;

  if (full_name !== undefined) {
    idx++; updates.push(`full_name = $${idx}`); values.push(full_name);
  }
  if (role !== undefined) {
    idx++; updates.push(`role = $${idx}`); values.push(role);
  }
  if (status !== undefined) {
    idx++; updates.push(`status = $${idx}`); values.push(status);
  }
  if (password !== undefined) {
    idx++;
    updates.push(`password_hash = $${idx}`);
    const bcrypt = await import("bcryptjs");
    values.push(bcrypt.hashSync(password, 12));
  }

  // Extended fields
  if (avatar_url !== undefined) {
    idx++; updates.push(`avatar_url = $${idx}`); values.push(avatar_url || null);
  }
  if (phone !== undefined) {
    idx++; updates.push(`phone = $${idx}`); values.push(phone || null);
  }
  if (citizen_id !== undefined) {
    idx++; updates.push(`citizen_id = $${idx}`); values.push(citizen_id || null);
  }
  if (address !== undefined) {
    idx++; updates.push(`address = $${idx}`); values.push(address || null);
  }
  if (birth_date !== undefined) {
    idx++; updates.push(`birth_date = $${idx}`); values.push(birth_date || null);
  }
  if (gender !== undefined) {
    idx++; updates.push(`gender = $${idx}`); values.push(gender || null);
  }
  if (emergency_contact !== undefined) {
    idx++; updates.push(`emergency_contact = $${idx}`); values.push(emergency_contact || null);
  }
  if (employee_type !== undefined) {
    idx++; updates.push(`employee_type = $${idx}`); values.push(employee_type || null);
  }
  if (job_title !== undefined) {
    idx++; updates.push(`job_title = $${idx}`); values.push(job_title || null);
  }
  if (department !== undefined) {
    idx++; updates.push(`department = $${idx}`); values.push(department || null);
  }
  if (start_date !== undefined) {
    idx++; updates.push(`start_date = $${idx}`); values.push(start_date || null);
  }
  if (end_date !== undefined) {
    idx++; updates.push(`end_date = $${idx}`); values.push(end_date || null);
  }
  if (employment_status !== undefined) {
    idx++; updates.push(`employment_status = $${idx}`); values.push(employment_status || null);
  }
  if (manager_id !== undefined) {
    idx++; updates.push(`manager_id = $${idx}`); values.push(manager_id || null);
  }
  if (notes !== undefined) {
    idx++; updates.push(`notes = $${idx}`); values.push(notes || null);
  }

  if (updates.length === 0) {
    return NextResponse.json({ data: rowToStaff(current) });
  }

  idx++;
  values.push(id);

  const result = await query<StaffRow>(
    `UPDATE admin_users SET ${updates.join(", ")} WHERE id = $${idx}
     RETURNING id, email, full_name, role, status, last_login_at, created_at, updated_at,
                avatar_url, phone, citizen_id, address, birth_date, gender,
                emergency_contact, employee_type, job_title, department,
                start_date, end_date, employment_status, manager_id, notes,
                disabled_at, disabled_by`,
    values
  );

  // ── Audit log ────────────────────────────────────────────────────────────────
  const ip = extractIpAddress(req as unknown as Request);
  const ua = req.headers.get("user-agent") ?? undefined;

  if (role !== undefined && role !== current.role) {
    await writeAuditLog(buildAuditEntry(
      authUser, "user.role_changed", current.id, current.email, current.full_name,
      { role: current.role }, { role },
      { ip, userAgent: ua }
    ));
  }
  if (status !== undefined && status !== current.status) {
    await writeAuditLog(buildAuditEntry(
      authUser, "user.status_changed", current.id, current.email, current.full_name,
      { status: current.status }, { status },
      { ip, userAgent: ua }
    ));
  }
  if (password !== undefined) {
    await writeAuditLog(buildAuditEntry(
      authUser, "user.password_reset", current.id, current.email, current.full_name,
      null, null, { ip, userAgent: ua }
    ));
  }

  return NextResponse.json({ data: rowToStaff(result.rows[0]) });
}

// ─── DELETE /api/staff/[id] ──────────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "users.delete")) {
    return NextResponse.json(
      { error: "Không có quyền xóa nhân viên.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const currentResult = await query<StaffRow>(
    "SELECT id, email, full_name, role FROM admin_users WHERE id = $1",
    [id]
  );
  if (currentResult.rows.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy nhân viên.", code: "NOT_FOUND" }, { status: 404 });
  }
  const current = currentResult.rows[0];

  // Hierarchy check (covers self-delete + role level check)
  if (!canManageUser(authUser.role, authUser.id, id, current.role, "delete")) {
    return NextResponse.json(
      { error: "Bạn không có quyền vô hiệu hóa người dùng có vai trò này.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // Cannot delete last super_admin
  if (current.role === "super_admin") {
    const countResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM admin_users WHERE role = 'super_admin' AND status = 'active'"
    );
    if (isLastSuperAdmin(id, parseInt(countResult.rows[0]?.count ?? "0", 10))) {
      return NextResponse.json(
        { error: "Không thể vô hiệu hóa super_admin cuối cùng.", code: "LAST_SUPER_ADMIN" },
        { status: 403 }
      );
    }
  }

  // Soft delete — set status, disabled_at, disabled_by
  await query(
    `UPDATE admin_users
     SET status = 'inactive',
         disabled_at = CURRENT_TIMESTAMP,
         disabled_by = $2
     WHERE id = $1`,
    [id, authUser.id]
  );
  await query("DELETE FROM admin_sessions WHERE user_id = $1", [id]);

  const ip = extractIpAddress(req as unknown as Request);
  const ua = req.headers.get("user-agent") ?? undefined;
  await writeAuditLog(buildAuditEntry(
    authUser, "user.disabled", current.id, current.email, current.full_name,
    { status: "active" }, { status: "inactive" },
    { ip, userAgent: ua }
  ));

  return NextResponse.json({ message: "Đã vô hiệu hóa nhân viên thành công." });
}
