/**
 * Layout guard for /content/*
 *
 * Requires content.read permission.
 * Super Admin always bypasses.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) redirect("/login?redirect=/content");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/content");

  await loadCustomPermissionsFromDB();
  if (user.role === "super_admin") return <>{children}</>;

  if (!hasPermission(user, "content.read")) {
    redirect("/403?message=Bạn không có quyền truy cập Nội dung");
  }
  return <>{children}</>;
}
