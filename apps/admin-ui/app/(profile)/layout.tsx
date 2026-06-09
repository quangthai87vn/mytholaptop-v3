/**
 * P8.2.18: Profile layout — wraps all /profile/* routes
 *
 * Responsibilities:
 * 1. Server-side auth guard: redirect to /login if not authenticated
 * 2. Children render inside AdminLayout (client component) for consistent sidebar/header
 *
 * Profile pages (profile/page.tsx, profile/password/page.tsx, profile/settings/page.tsx)
 * are "use client" components that render inside this layout, which wraps them in
 * AdminLayout for the full admin UI shell.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";
import ProfileShell from "./profile-shell";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  const user = await validateSession(sessionId);
  if (!user) {
    redirect("/login?redirect=/profile");
  }

  return <ProfileShell>{children}</ProfileShell>;
}
