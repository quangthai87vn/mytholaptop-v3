/**
 * Layout guard for /workspace/*
 *
 * Requires at least one workspace-related permission.
 * Super Admin bypasses all permission checks.
 *
 * Protected routes:
 *   /workspace, /workspace/activity, /workspace/calendar, /workspace/members
 *   /projects, /projects/[id]
 *   /campaigns, /campaigns/[id]
 *   /tasks, /tasks/[id]
 *   /content
 *   /media-workflow
 *   /calendar
 *
 * Rules:
 *   - projects.read         → access projects section
 *   - campaigns.read        → access campaigns section
 *   - tasks.read            → access tasks section
 *   - content.read          → access content section
 *   - assets.read           → access media-workflow
 *   - workspace.members.read → access /workspace/members (Nhân sự)
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

const WORKSPACE_PERMISSIONS = [
  "projects.read",
  "campaigns.read",
  "tasks.read",
  "content.read",
  "assets.read",
  "workspace.members.read",
] as const;

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) redirect("/login?redirect=/workspace");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/workspace");

  await loadCustomPermissionsFromDB();

  // Super Admin always bypasses permission checks
  if (user.role === "super_admin") return <>{children}</>;

  const canAccess = WORKSPACE_PERMISSIONS.some((perm) =>
    hasPermission(user, perm)
  );

  if (!canAccess) {
    redirect("/403?message=Bạn không có quyền truy cập Workspace");
  }

  return <>{children}</>;
}
