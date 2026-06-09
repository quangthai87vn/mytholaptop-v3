/**
 * Admin group layout — session-only guard.
 *
 * This is the single entry point for all /admin routes.
 * It validates the session and loads custom permissions into the server cache.
 * Individual section layouts only need to check permissions (session is guaranteed here).
 */
import AdminLayout from "@/components/layout/admin-layout";
import { redirect } from "next/navigation";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import { loadCustomPermissionsFromDB } from "@/lib/auth/permissions.server";

export default async function AdminGroupLayout({
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

  // Pre-load custom role permissions into server cache (idempotent, cached 60s)
  await loadCustomPermissionsFromDB();

  return <AdminLayout>{children}</AdminLayout>;
}
