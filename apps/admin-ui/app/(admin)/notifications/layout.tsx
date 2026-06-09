/**
 * Layout guard for /notifications
 *
 * Requires notifications.read.
 * Super Admin always bypasses.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/notifications");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/notifications");

  await loadCustomPermissionsFromDB();
  if (user.role === "super_admin") return <>{children}</>;

  if (!hasPermission(user, "notifications.read")) {
    redirect("/403?message=Bạn không có quyền xem thông báo");
  }
  return <>{children}</>;
}
