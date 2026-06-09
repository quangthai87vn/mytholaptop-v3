/**
 * Layout guard for /calendar/*
 *
 * Requires tasks.read OR campaigns.read.
 * Super Admin always bypasses.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/calendar");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/calendar");

  await loadCustomPermissionsFromDB();
  if (user.role === "super_admin") return <>{children}</>;

  const canAccess =
    hasPermission(user, "tasks.read") ||
    hasPermission(user, "campaigns.read");
  if (!canAccess) {
    redirect("/403?message=Bạn không có quyền truy cập Lịch");
  }
  return <>{children}</>;
}
