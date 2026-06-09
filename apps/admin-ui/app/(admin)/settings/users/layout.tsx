/**
 * Layout cho /settings/users
 *
 * Kiểm tra quyền users.read (hoặc super_admin bypass) để truy cập.
 * Sau đó render page.tsx thông qua children.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function SettingsUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) {
    redirect("/login?redirect=/settings/users");
  }

  const user = await validateSession(sessionId);

  if (!user) {
    redirect("/login?redirect=/settings/users");
  }

  // hasPermission() handles super_admin bypass internally
  if (!hasPermission(user, "users.read")) {
    redirect("/403?message=Không có quyền truy cập trang Người dùng");
  }

  return <>{children}</>;
}
