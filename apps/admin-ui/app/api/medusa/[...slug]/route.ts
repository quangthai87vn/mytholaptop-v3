import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/content/db/app-settings";
import { requireAdminAuth } from "@/lib/auth/require-admin";

/**
 * JWT token cache cho mỗi backend + user combination.
 * Cache trong Map với TTL.
 */
interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Normalize backend URL - handle Docker hostnames when running outside Docker.
 * Docker uses internal hostnames like "backend", "medusa" that don't resolve locally.
 */
function normalizeBackendUrl(url: string): string {
  if (!url) return "";
  let normalized = url.replace(/\/$/, "");

  const dockerHostnames = ["backend", "medusa-backend", "medusa", "postgres", "redis"];
  for (const hostname of dockerHostnames) {
    if (
      normalized.startsWith(`http://${hostname}:`) ||
      normalized.startsWith(`https://${hostname}:`)
    ) {
      normalized = normalized.replace(`://${hostname}:`, `://localhost:`);
      break;
    }
  }

  return normalized;
}

function getCacheKey(backendUrl: string, email: string): string {
  return `${backendUrl}::${email}`;
}

function isTokenValid(cached: CachedToken): boolean {
  return Date.now() < cached.expiresAt - 5 * 60 * 1000;
}

/**
 * Load Medusa credentials from database (app_settings table).
 * Returns JWT token if available (preferred), or email/password for fallback auth.
 */
async function loadServerCredentials(): Promise<{
  jwtToken?: string;
  email?: string;
  password?: string;
  backendUrl?: string;
} | null> {
  try {
    const medusa = await getAppSetting("medusa");
    if (!medusa) return null;
    const m = medusa as Record<string, string>;
    const isJwt = (key: string) => key.startsWith("eyJ") && key.split(".").length === 3;
    // JWT token can be stored in adminApiKey or adminPassword
    const storedJwt = (m.adminApiKey && isJwt(m.adminApiKey))
      ? m.adminApiKey
      : (m.adminPassword && isJwt(m.adminPassword) ? m.adminPassword : undefined);
    return {
      backendUrl: m.backendUrl,
      jwtToken: storedJwt,
      email: m.adminEmail,
      password: m.adminPassword,
    };
  } catch {
    return null;
  }
}

/**
 * Authenticate với Medusa backend và lấy JWT token.
 * Tries multiple auth endpoints for compatibility.
 */
async function authenticateWithMedusa(
  backendUrl: string,
  email: string,
  password: string
): Promise<string> {
  const cacheKey = getCacheKey(backendUrl, email);

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && isTokenValid(cached)) {
    return cached.token;
  }

  // Normalize URL - handle Docker hostnames in dev mode
  const normalizedUrl = normalizeBackendUrl(backendUrl);

  // Try multiple auth endpoints (Medusa v2 uses different paths)
  const authEndpoints = [
    "/admin/auth/user/emailpass",
    "/auth/user/emailpass",
    "/admin/auth",
  ];

  for (const authPath of authEndpoints) {
    try {
      const url = `${normalizedUrl}${authPath}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, scope: "admin" }),
      });

      if (response.ok) {
        const data = await response.json() as {
          user?: { email: string };
          access_token?: string;
          token?: string;
          expires_at?: number;
        };
        const token = data.access_token || data.token || "";
        if (token) {
          const expiresAt = data.expires_at
            ? data.expires_at * 1000
            : Date.now() + 23 * 60 * 60 * 1000;
          tokenCache.set(cacheKey, { token, expiresAt });
          console.log(`[MedusaProxy] Authenticated as ${email} (via ${authPath})`);
          return token;
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  throw new Error(
    "Authentication failed. Tried endpoints: " + authEndpoints.join(", ")
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  const endpoint = "/" + slug.join("/");
  return proxyRequest(endpoint, req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  const endpoint = "/" + slug.join("/");
  return proxyRequest(endpoint, req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;
  const { slug } = await params;
  const endpoint = "/" + slug.join("/");
  return proxyRequest(endpoint, req);
}

async function proxyRequest(
  endpoint: string,
  req: NextRequest,
  method?: string
) {
  const serverCreds = await loadServerCredentials();
  if (!serverCreds) {
    return NextResponse.json(
      {
        error: "Chưa lưu Medusa configuration. Vui lòng vào Cấu hình ứng dụng.",
        code: "missing_config",
        hint: "Truy cập /settings/app → tab Medusa → nhập Backend URL và lưu.",
      },
      { status: 400 }
    );
  }

  let authToken = "";
  let actualBackendUrl = serverCreds.backendUrl
    ? normalizeBackendUrl(serverCreds.backendUrl)
    : normalizeBackendUrl(req.nextUrl.searchParams.get("backendUrl") || "");

  if (serverCreds?.jwtToken) {
    authToken = serverCreds.jwtToken;
    if (serverCreds.backendUrl) {
      actualBackendUrl = serverCreds.backendUrl;
    }
  } else if (serverCreds?.email && serverCreds?.password) {
    try {
      authToken = await authenticateWithMedusa(
        actualBackendUrl,
        serverCreds.email,
        serverCreds.password
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: `Lỗi xác thực Medusa: ${error instanceof Error ? error.message : String(error)}`,
          code: "AUTH_FAILED",
          hint: "Kiểm tra email và password Medusa Admin trong Cài đặt.",
        },
        { status: 401 }
      );
    }
  } else {
    return NextResponse.json(
      {
        error: "Chưa lưu Medusa credentials (JWT Token hoặc Email/Password). Vui lòng vào Cấu hình ứng dụng.",
        code: "missing_token",
        hint: "Truy cập /settings/app → tab Medusa → nhập JWT Token hoặc Email/Password rồi lưu.",
      },
      { status: 400 }
    );
  }

  try {
    const urlObj = new URL(req.nextUrl.toString());
    const actualPath = urlObj.pathname.replace(/^\/api\/medusa/, "");

    const actualQuery = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (key !== "backendUrl") {
        actualQuery.set(key, value);
      }
    }
    const actualQueryStr = actualQuery.toString();
    const actualPathWithQuery = `${actualPath}${actualQueryStr ? "?" + actualQueryStr : ""}`;
    const url = `${actualBackendUrl.replace(/\/$/, "")}${actualPathWithQuery}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };

    let body: string | undefined;
    if (method === "POST" || req.method === "POST") {
      body = await req.text();
    }

    const response = await fetch(url, {
      method: method === "DELETE" ? "DELETE" : req.method,
      headers,
      body,
    });

    if (response.status === 401 || response.status === 403) {
      const errorBody = await response.text();
      let errorDetail = "";
      try {
        const parsed = JSON.parse(errorBody);
        errorDetail = parsed.message || parsed.error || errorBody;
      } catch {
        errorDetail = errorBody;
      }

      if (serverCreds?.email && serverCreds?.password) {
        const cacheKey = getCacheKey(actualBackendUrl, serverCreds.email);
        tokenCache.delete(cacheKey);
      }
      if (serverCreds?.jwtToken) {
        console.warn("[MedusaProxy] Server JWT rejected, clearing cache");
        tokenCache.clear();
      }

      const isJwtFormat = authToken && authToken.split(".").length === 3;
      return NextResponse.json(
        {
          error: `Lỗi xác thực Medusa (HTTP ${response.status}): ${errorDetail}`,
          code: "AUTH_FAILED",
          hint: isJwtFormat
            ? "Token JWT hợp lệ nhưng bị từ chối. Kiểm tra Medusa backend đang chạy và API key còn hiệu lực."
            : "Token không đúng định dạng JWT.",
        },
        { status: response.status }
      );
    }

    const data = await response.text();

    if (!response.ok) {
      let errorDetail = "";
      let errorCode = `HTTP_${response.status}`;
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(data);
        if (parsed && parsed.message) {
          errorDetail = parsed.message as string;
        } else if (parsed && parsed.error) {
          errorDetail = parsed.error as string;
        } else if (parsed && parsed.code) {
          errorDetail = parsed.code as string;
        } else if (parsed && parsed.errors && Array.isArray(parsed.errors)) {
          errorDetail = parsed.errors
            .map((e: Record<string, unknown>) => e.message || e.code || JSON.stringify(e))
            .join("; ");
        } else {
          errorDetail = data.length > 200 ? data.slice(0, 200) + "..." : data;
        }
        if (parsed && parsed.code) errorCode = String(parsed.code);
      } catch {
        errorDetail = data.length > 200 ? data.slice(0, 200) + "..." : data;
      }
      console.error(`[MedusaProxy] ${req.method} ${endpoint} → ${response.status}`, parsed || data.slice(0, 300));
      return new NextResponse(
        JSON.stringify({
          error: errorDetail,
          code: errorCode,
          httpStatus: response.status,
          originalResponse: data,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Medusa proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Proxy error";
    const isNetworkError =
      errorMessage.includes("fetch") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("net::");

    if (isNetworkError) {
      return NextResponse.json(
        {
          error: `Không thể kết nối Medusa backend. Vui lòng kiểm tra Medusa backend đang chạy tại ${actualBackendUrl}.`,
          code: "NETWORK_ERROR",
          hint: "Medusa backend phải đang chạy (thường ở cổng 9000).",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: errorMessage, code: "PROXY_ERROR" },
      { status: 500 }
    );
  }
}
