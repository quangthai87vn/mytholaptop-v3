import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, archiveProject, deleteProject } from "@/lib/workspace/db";
import { writeWorkspaceAuditLog } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { updateProjectSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { hasPermission, type Permission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<{ allowed: true; actorId?: string; actorName: string } | { allowed: false; response: NextResponse }> {
  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return { allowed: false, response: NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 }) };
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return { allowed: false, response: NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 }) };
  }
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, permission)) {
    return { allowed: false, response: NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này.", code: "FORBIDDEN" }, { status: 403 }) };
  }
  return { allowed: true, actorId: user.id, actorName: user.full_name || user.email || "System" };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[API] GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(request, "projects.update");
  if (!perm.allowed) return perm.response;

  try {
    const { id } = await params;
    const body = await request.json();
    console.log("[API] PUT /api/projects/:id raw body:", JSON.stringify(body, null, 2));

    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      console.log("[API] PUT /api/projects/:id validation errors:", JSON.stringify(result.error.issues, null, 2));
      return buildValidationResponse(result.error.issues);
    }

    const project = await updateProject(id, result.data as Record<string, unknown>, perm.actorName);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const changes = Object.entries(result.data).map(([field, newVal]) => ({ field, old: undefined, new: newVal }));
    await writeWorkspaceAuditLog({
      actorId: perm.actorId,
      actorName: perm.actorName,
      action: "updated",
      entityType: "project",
      entityId: id,
      entityName: project.name,
      changes,
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[API] PUT /api/projects/[id] error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(req);
  if (!rateLimit.allowed) return rateLimit.response;

  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) {
    return NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 });
  }
  const user = await validateSession(sessionId);
  if (!user) {
    return NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 });
  }
  await loadCustomPermissionsFromDB();

  if (!hasPermission(user, "projects.delete")) {
    return NextResponse.json({ error: "Bạn không có quyền xóa/lưu trữ dự án.", code: "FORBIDDEN" }, { status: 403 });
  }

  const actorName = user.full_name || user.email || "System";
  const actorId = user.id;
  const hardDelete = user.role === "super_admin" && req.nextUrl.searchParams.get("hard") === "true";

  const { id } = await params;
  const existing = await getProjectById(id);
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (hardDelete) {
    await deleteProject(id, true, actorName);
    await writeWorkspaceAuditLog({
      actorId, actorName,
      action: "deleted",
      entityType: "project",
      entityId: id,
      entityName: existing.name,
    });
  } else {
    await archiveProject(id, actorName);
    await writeWorkspaceAuditLog({
      actorId, actorName,
      action: "archived",
      entityType: "project",
      entityId: id,
      entityName: existing.name,
    });
  }

  return NextResponse.json({ data: { success: true, archived: !hardDelete } });
}
