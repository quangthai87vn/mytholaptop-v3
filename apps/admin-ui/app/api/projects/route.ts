import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/workspace/db";
import { writeWorkspaceAuditLog } from "@/lib/workspace/db";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { createProjectSchema, buildValidationResponse } from "@/lib/workspace/validation";
import { checkWorkspaceRateLimit } from "@/lib/workspace/rate-limit";
import { hasPermission, type Permission } from "@/lib/rbac";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

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

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };
    const projects = await getProjects(filters);
    return NextResponse.json({ data: projects });
  } catch (error) {
    console.error("[API] GET /api/projects error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  const rateLimit = await checkWorkspaceRateLimit(request);
  if (!rateLimit.allowed) return rateLimit.response;

  const perm = await requirePermission(request, "projects.create");
  if (!perm.allowed) return perm.response;

  try {
    const body = await request.json();

    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return buildValidationResponse(result.error.issues);
    }
    const d = result.data;

    const project = await createProject({
      name: d.name,
      description: d.description,
      status: "active",
      color: d.color,
      start_date: d.start_date || undefined,
      end_date: d.end_date || undefined,
      budget: d.budget,
      owner_id: d.owner_id || undefined,
      team_ids: d.team_ids,
      tags: d.tags,
      metadata: d.metadata,
    }, perm.actorName);

    await writeWorkspaceAuditLog({
      actorId: perm.actorId,
      actorName: perm.actorName,
      action: "created",
      entityType: "project",
      entityId: project.id,
      entityName: project.name,
    });

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 400 });
  }
}
