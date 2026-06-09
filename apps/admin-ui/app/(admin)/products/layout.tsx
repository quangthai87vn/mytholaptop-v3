/**
 * Layout guard for /products/*
 *
 * Requires products.read permission.
 * Super Admin always bypasses.
 */
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) redirect("/login?redirect=/products");
  const user = await validateSession(sessionId);
  if (!user) redirect("/login?redirect=/products");

  await loadCustomPermissionsFromDB();

  // Super Admin always bypasses
  if (user.role === "super_admin") return <>{children}</>;

  if (!hasPermission(user, "products.read")) {
    redirect("/403?message=Bạn không có quyền truy cập Hàng hóa");
  }

  return <>{children}</>;
}
