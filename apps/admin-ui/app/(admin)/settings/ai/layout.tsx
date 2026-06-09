/**
 * Settings > AI layout — permission guard
 *
 * Purpose:
 * - Blocks non-super_admin users without ai_engine.manage from accessing AI Engine.
 * - super_admin always bypasses all checks.
 * - Uses hasPermission() which now handles super_admin bypass internally.
 */
import { redirect } from "next/navigation";
import { getSessionCookieName } from "@/lib/auth/session";
import { validateSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export default async function SettingsAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) {
    redirect("/login?redirect=/settings/ai");
  }

  const user = await validateSession(sessionId);

  if (!user) {
    redirect("/login?redirect=/settings/ai");
  }

  // Super Admin bypasses automatically via hasPermission()
  const canAccessAIEngine = hasPermission(user, "ai_engine.manage");

  if (!canAccessAIEngine) {
    redirect("/403?message=Không có quyền truy cập AI Engine");
  }

  return children;
}
