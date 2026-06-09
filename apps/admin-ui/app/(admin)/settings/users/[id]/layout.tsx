/**
 * Layout cho /settings/users/[id]
 *
 * Kiểm tra users.read permission (hoặc super_admin bypass) để truy cập.
 * Cũng kiểm tra user có quyền xem user này dựa trên role hierarchy.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function EmployeeDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) {
    redirect("/login");
  }

  const user = await validateSession(sessionId);

  if (!user) {
    redirect("/login");
  }

  // hasPermission() handles super_admin bypass internally
  if (!hasPermission(user, "users.read")) {
    redirect("/403?message=Không có quyền truy cập trang Người dùng");
  }

  return <>{children}</>;
}
