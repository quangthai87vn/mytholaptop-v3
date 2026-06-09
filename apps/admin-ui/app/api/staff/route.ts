/**
 * GET /api/staff — List admin_users
 * POST /api/staff — Create admin user
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { hasPermission, canAssignRole, canManageRole, getRoleLevel, type Role } from "@/lib/auth/permissions";
import type { AdminUser } from "@/lib/auth/session";
import { requireCsrf } from "@/lib/auth/csrf";
import { writeAuditLog, buildAuditEntry } from "@/lib/auth/audit-log";
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
}

// ─── GET /api/staff ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "users.read")) {
    return NextResponse.json(
      { error: "Không có quyền xem danh sách nhân viên.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = (page - 1) * limit;

  let sql = "SELECT id, email, full_name, role, status, last_login_at, created_at, updated_at FROM admin_users WHERE 1=1";
  const params: unknown[] = [];
  let paramIdx = 0;

  if (search) {
    paramIdx++;
    sql += ` AND (email ILIKE $${paramIdx} OR full_name ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
  }
  if (role) {
    paramIdx++;
    sql += ` AND role = $${paramIdx}`;
    params.push(role);
  }
  if (status) {
    paramIdx++;
    sql += ` AND status = $${paramIdx}`;
    params.push(status);
  }

  const countSql = sql.replace(
    "SELECT id, email, full_name, role, status, last_login_at, created_at, updated_at",
    "SELECT COUNT(*)"
  );
  const countResult = await query<{ count: string }>(countSql, params);
  const total = parseInt(countResult.rows[0]?.count || "0", 10);

  paramIdx++;
  sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
  params.push(limit);
  paramIdx++;
  sql += ` OFFSET $${paramIdx}`;
  params.push(offset);

  const result = await query<StaffRow>(sql, params);
  const staff: StaffResponse[] = result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role as Role,
    status: row.status as "active" | "inactive",
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return NextResponse.json({ data: staff, total, page, limit, pages: Math.ceil(total / limit) });
}

// ─── POST /api/staff ──────────────────────────────────────────────────────────

const CreateStaffSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  full_name: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự").max(255),
  role: z.enum(["super_admin", "admin", "editor", "viewer", "intern"]),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").max(128),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  if (!hasPermission(authUser, "users.create")) {
    return NextResponse.json(
      { error: "Không có quyền tạo nhân viên.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body không hợp lệ", code: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = CreateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ", details: parsed.error.flatten(), code: "VALIDATION_ERROR" },
      { status: 422 }
    );
  }

  const { email, full_name, role, password, status } = parsed.data;

  // Hierarchy check: actor must be able to assign this role
  if (!canAssignRole(authUser.role, role)) {
    return NextResponse.json(
      { error: `Bạn không có quyền tạo tài khoản với vai trò "${role}".`, code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // Super admin cannot be created by non-super_admin
  if (role === "super_admin" && authUser.role !== "super_admin") {
    return NextResponse.json(
      { error: "Chỉ super_admin mới có quyền tạo tài khoản super_admin.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const bcrypt = await import("bcryptjs");
  const password_hash = bcrypt.hashSync(password, 12);

  try {
    const result = await query<StaffRow>(
      `INSERT INTO admin_users (email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, status, last_login_at, created_at, updated_at`,
      [email, password_hash, full_name, role, status]
    );

    const row = result.rows[0];
    const staff: StaffResponse = {
      id: row.id, email: row.email, full_name: row.full_name,
      role: row.role as Role, status: row.status as "active" | "inactive",
      last_login_at: row.last_login_at, created_at: row.created_at, updated_at: row.updated_at,
    };

    await writeAuditLog(buildAuditEntry(
      authUser, "user.created", row.id, row.email, row.full_name,
      null, { role: row.role, status: row.status }
    ));

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string; constraint?: string };
    if (pgErr?.code === "23505") {
      return NextResponse.json(
        { error: "Email đã tồn tại trong hệ thống.", code: "DUPLICATE_EMAIL" },
        { status: 409 }
      );
    }
    if (pgErr?.code === "23514") {
      const constraint = pgErr.constraint || "";
      if (constraint === "admin_users_role_check") {
        return NextResponse.json(
          { error: "Vai trò không hợp lệ. Liên hệ quản trị viên.", code: "INVALID_ROLE" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ theo ràng buộc của hệ thống.", code: "CHECK_CONSTRAINT_FAIL" },
        { status: 400 }
      );
    }
    console.error("[Staff POST] DB error:", err);
    return NextResponse.json({ error: "Lỗi khi tạo nhân viên", code: "DB_ERROR" }, { status: 500 });
  }
}
