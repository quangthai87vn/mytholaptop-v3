/**
 * Server-side helper: lấy current user từ session cookie.
 * Dùng trong Server Components / Route Handlers.
 */
import { cookies } from "next/headers";
import { validateSession, getSessionCookieName } from "@/lib/auth/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;
  if (!sessionId) return null;
  return validateSession(sessionId);
}
