import { NextRequest, NextResponse } from "next/server";
import {
  destroySession,
  getSessionCookieName,
  getClearSessionCookieOptions,
} from "@/lib/auth/session";
import { getClearCsrfCookieOptions } from "@/lib/auth/csrf";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(getSessionCookieName())?.value;
  await destroySession(sessionId);

  const response = NextResponse.json({ success: true });

  // Clear session cookie
  const clearOptions = getClearSessionCookieOptions();
  response.cookies.set(
    clearOptions.name as string,
    clearOptions.value as string,
    {
      httpOnly: clearOptions.httpOnly as boolean,
      secure: clearOptions.secure as boolean,
      sameSite: clearOptions.sameSite as "lax",
      maxAge: clearOptions.maxAge as number,
      path: clearOptions.path as string,
    }
  );

  // Clear CSRF cookie
  const clearCsrf = getClearCsrfCookieOptions();
  response.cookies.set(
    clearCsrf.name as string,
    clearCsrf.value as string,
    {
      httpOnly: false,
      secure: clearCsrf.secure as boolean,
      sameSite: "strict" as const,
      maxAge: clearCsrf.maxAge as number,
      path: clearCsrf.path as string,
    }
  );

  return response;
}
