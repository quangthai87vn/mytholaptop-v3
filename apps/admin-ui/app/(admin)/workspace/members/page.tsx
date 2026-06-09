/**
 * /workspace/members — Nhân sự page
 *
 * Shows all workspace members (admin_users + pm_interns) with KPI stats.
 * Protected by workspace.members.read permission + minimumRole: admin.
 */
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getWorkspaceMembers } from "@/lib/workspace/db";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";
import { MembersClient } from "./members-client";

export const dynamic = "force-dynamic";

async function checkAccess(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) return false;
  const user = await validateSession(sessionId);
  if (!user) return false;
  await loadCustomPermissionsFromDB();
  return hasPermission(user, "workspace.members.read");
}

export default async function WorkspaceMembersPage() {
  const hasAccess = await checkAccess();
  if (!hasAccess) {
    redirect("/403?message=Bạn không có quyền xem Nhân sự");
  }

  const members = await getWorkspaceMembers();

  const total = members.length;
  const active = members.filter((m) => m.status === "active").length;
  const totalAssigned = members.reduce((sum, m) => sum + m.stats.tasksAssigned, 0);
  const totalCompleted = members.reduce((sum, m) => sum + m.stats.tasksCompleted, 0);
  const avgCompletion = total > 0 ? Math.round((totalCompleted / totalAssigned) * 100) || 0 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhân sự</h1>
          <p className="text-sm text-slate-500">
            Quản lý thông tin nhân sự, KPI và công việc
          </p>
        </div>
      </div>

      <MembersClient
        initialMembers={members}
        initialStats={{
          total,
          active,
          tasksAssigned: totalAssigned,
          avgCompletion,
        }}
      />
    </div>
  );
}
