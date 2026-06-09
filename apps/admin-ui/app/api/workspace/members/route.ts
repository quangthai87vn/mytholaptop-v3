/**
 * GET /api/workspace/members
 *
 * Returns workspace members (admin_users + pm_interns) with task stats.
 * Requires workspace.members.read permission.
 */
import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { getWorkspaceMembers } from "@/lib/workspace/db";

async function authAndCheck(req: NextRequest): Promise<{ authorized: boolean; response?: NextResponse }> {
  const sessionId = req.cookies.get(getSessionCookieName())?.value;
  if (!sessionId) return { authorized: false, response: NextResponse.json({ error: "Chưa đăng nhập.", code: "NOT_AUTHENTICATED" }, { status: 401 }) };
  const user = await validateSession(sessionId);
  if (!user) return { authorized: false, response: NextResponse.json({ error: "Phiên đăng nhập hết hạn.", code: "SESSION_INVALID" }, { status: 401 }) };
  await loadCustomPermissionsFromDB();
  if (!hasPermission(user, "workspace.members.read")) {
    return { authorized: false, response: NextResponse.json({ error: "Bạn không có quyền xem Nhân sự.", code: "FORBIDDEN" }, { status: 403 }) };
  }
  return { authorized: true };
}

export async function GET(req: NextRequest) {
  const check = await authAndCheck(req);
  if (!check.authorized && check.response) return check.response;

  try {
    const { searchParams } = req.nextUrl;
    const memberType = searchParams.get("memberType") || undefined;
    const jobRole = searchParams.get("jobRole") || undefined;
    const status = searchParams.get("status") || undefined;

    const members = await getWorkspaceMembers({ memberType, jobRole, status });

    // Summary stats for KPI cards
    const total = members.length;
    const active = members.filter((m) => m.status === "active").length;
    const totalAssigned = members.reduce((sum, m) => sum + m.stats.tasksAssigned, 0);
    const totalCompleted = members.reduce((sum, m) => sum + m.stats.tasksCompleted, 0);
    const avgCompletion = total > 0 ? Math.round((totalCompleted / totalAssigned) * 100) || 0 : 0;

    return NextResponse.json({
      members,
      stats: {
        total,
        active,
        tasksAssigned: totalAssigned,
        avgCompletion,
      },
    });
  } catch (err) {
    console.error("[WorkspaceMembers GET]", err);
    return NextResponse.json(
      { error: "Lỗi khi lấy danh sách nhân sự." },
      { status: 500 }
    );
  }
}
