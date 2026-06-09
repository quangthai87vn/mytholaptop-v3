/**
 * Layout guard for /reports/*
 *
 * Requires projects.read permission.
 * Super Admin always bypasses.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/reports");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/reports");

  await loadCustomPermissionsFromDB();
  if (user.role === "super_admin") return <>{children}</>;

  if (!hasPermission(user, "projects.read")) {
    redirect("/403?message=Bạn không có quyền truy cập Báo cáo");
  }
  return <>{children}</>;
}
