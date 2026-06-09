import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { resolveRedirect } from "@/lib/navigation";

  // ── Legacy route redirect map (client-side compatibility)
  // Used by middleware to redirect old routes to new ones.
  // Keys: old paths; Values: new paths
  const LEGACY_REDIRECTS: Array<{ from: string; to: string }> = [
    // Content section consolidation → content
    { from: "/content/ai-generator", to: "/content" },
    { from: "/content/facebook-posts", to: "/content" },
    { from: "/content/website-posts", to: "/content" },
    { from: "/content/video-scripts", to: "/content" },
    { from: "/content/image-prompts", to: "/content" },
    { from: "/content/media-prompts", to: "/media-workflow" },
    { from: "/content/templates", to: "/content" },
    // Legacy AI settings location → canonical /settings/ai
    { from: "/content/settings", to: "/settings/ai" },
    // Interns → Team
    { from: "/interns", to: "/team/interns" },
    // Legacy staff routes → consolidated /settings/users
    { from: "/staff", to: "/settings/users" },
    { from: "/staff/roles", to: "/settings/users?tab=roles" },
    { from: "/staff/permissions", to: "/settings/users?tab=permissions" },
    // Legacy /settings/team → /settings/users
    { from: "/settings/team", to: "/settings/users" },
    // Legacy /team → /workspace/members
    { from: "/team", to: "/workspace/members" },
  ];

// ── Protected page paths (all routes requiring auth)
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

// ── Protected API paths
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
  // Exact match first
  const exact = LEGACY_REDIRECTS.find((r) => r.from === pathname);
  if (exact) return exact.to;
  // Prefix match (longest first)
  const sorted = [...LEGACY_REDIRECTS].sort((a, b) => b.from.length - a.from.length);
  for (const r of sorted) {
    if (pathname.startsWith(r.from + "/")) return r.to;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── 1. Legacy route redirects ──────────────────────────────────────────────
  const redirectTo = findLegacyRedirect(pathname);
  if (redirectTo) {
    // Preserve query params
    const url = new URL(redirectTo, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // ── 2. Auth check ──────────────────────────────────────────────────────────
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const hasSession = sessionCookie && sessionCookie.value && sessionCookie.value.length > 0;

  const isProtectedPage = PROTECTED_PAGE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isProtectedApi = PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
