/**
 * Layout guard for /migration/*
 *
 * Requires migration.manage — Super Admin bypasses.
 * Admin is blocked from this by ADMIN_EXPLICITLY_BLOCKED_PERMISSIONS.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function MigrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/migration");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/migration");

  await loadCustomPermissionsFromDB();
  if (user.role === "super_admin") return <>{children}</>;

  if (!hasPermission(user, "migration.manage")) {
    redirect("/403?message=Bạn không có quyền truy cập Di chuyển dữ liệu");
  }
  return <>{children}</>;
}
