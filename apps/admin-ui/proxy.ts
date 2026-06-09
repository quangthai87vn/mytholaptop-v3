import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { resolveRedirect } from "@/lib/navigation";

// Legacy route redirect map for client compatibility.
const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/content/ai-generator", to: "/content" },
  { from: "/content/facebook-posts", to: "/content" },
  { from: "/content/website-posts", to: "/content" },
  { from: "/content/video-scripts", to: "/content" },
  { from: "/content/image-prompts", to: "/content" },
  { from: "/content/media-prompts", to: "/media-workflow" },
  { from: "/content/templates", to: "/content" },
  { from: "/content/settings", to: "/settings/ai" },
  { from: "/interns", to: "/team/interns" },
  { from: "/staff", to: "/settings/users" },
  { from: "/staff/roles", to: "/settings/users?tab=roles" },
  { from: "/staff/permissions", to: "/settings/users?tab=permissions" },
  { from: "/settings/team", to: "/settings/users" },
  { from: "/team", to: "/workspace/members" },
];

const PROTECTED_PAGE_PATHS = [
  "/dashboard",
  "/workspace",
  "/projects",
  "/tasks",
  "/campaigns",
  "/content",
  "/media-workflow",
  "/calendar",
  "/team",
  "/reports",
  "/products",
  "/sales",
  "/customers",
  "/settings",
  "/profile",
  "/interns",
  "/staff",
  "/notifications",
  "/migration",
  "/workspace/members",
];

const PROTECTED_API_PATHS = [
  "/api/tasks",
  "/api/projects",
  "/api/campaigns",
  "/api/content",
  "/api/media-workflow",
  "/api/interns",
  "/api/admin",
  "/api/staff",
  "/api/roles",
  "/api/permissions",
  "/api/ai",
  "/api/notifications",
  "/api/profile",
  "/api/workspace",
];

function findLegacyRedirect(pathname: string): string | null {
  const exact = LEGACY_REDIRECTS.find((route) => route.from === pathname);
  if (exact) return exact.to;

  const sortedRoutes = [...LEGACY_REDIRECTS].sort(
    (left, right) => right.from.length - left.from.length
  );

  for (const route of sortedRoutes) {
    if (pathname.startsWith(`${route.from}/`)) {
      return route.to;
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const redirectTo = findLegacyRedirect(pathname);
  if (redirectTo) {
    const redirectUrl = new URL(redirectTo, request.url);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl);
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const hasSession = Boolean(sessionCookie?.value?.length);

  const isProtectedPage = PROTECTED_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isProtectedApi = PROTECTED_API_PATHS.some((path) => pathname.startsWith(path));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  if (!hasSession) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: "Chưa đăng nhập", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const redirect = resolveRedirect(pathname);
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
