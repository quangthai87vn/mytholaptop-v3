import { NextRequest, NextResponse } from "next/server";
import * as fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  let normalized = url.replace(/\/$/, "");

  // Handle Docker internal hostnames when running outside Docker
  const dockerHostnames = ["backend", "medusa-backend", "medusa", "postgres", "redis"];
  for (const hostname of dockerHostnames) {
    if (
      normalized.startsWith(`http://${hostname}:`) ||
      normalized.startsWith(`https://${hostname}:`)
    ) {
      // Replace with localhost for local development
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
 * Load Medusa credentials from server-side settings.json.
 * Returns JWT token if available (preferred), or email/password for fallback auth.
 */
async function loadServerCredentials(): Promise<{
  jwtToken?: string;
  email?: string;
  password?: string;
  backendUrl?: string;
} | null> {
  // Try multiple paths to find settings.json
  const routeFileDir = path.dirname(fileURLToPath(import.meta.url));
  const possiblePaths = [
    path.join(routeFileDir, "..", "..", "..", "..", "data", "settings.json"),
    path.join(process.cwd(), "data", "settings.json"),
  ];
  let settingsPath = "";
  for (const p of possiblePaths) {
    if (fsSync.existsSync(p)) { settingsPath = p; break; }
  }
  if (!settingsPath) {
    console.warn("[MedusaProxy] settings.json not found in any path:", possiblePaths);
    return null;
  }
  try {
    const content = fsSync.readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(content);
    if (!settings.medusa) return null;
    return {
      backendUrl: settings.medusa.backendUrl,
      jwtToken: settings.medusa.adminApiKey?.startsWith("eyJ") ? settings.medusa.adminApiKey : undefined,
      email: settings.medusa.adminEmail,
      password: settings.medusa.adminPassword,
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
  const { slug } = await params;
  const endpoint = "/" + slug.join("/");

  return proxyRequest(endpoint, req);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const endpoint = "/" + slug.join("/");

  return proxyRequest(endpoint, req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const endpoint = "/" + slug.join("/");

  return proxyRequest(endpoint, req);
}

async function proxyRequest(
  endpoint: string,
  req: NextRequest,
  method?: string
) {
  const backendUrlParam = req.nextUrl.searchParams.get("backendUrl");
  const adminApiKeyParam = req.nextUrl.searchParams.get("adminApiKey");
  const adminEmailParam = req.nextUrl.searchParams.get("adminEmail");
  const adminPasswordParam = req.nextUrl.searchParams.get("adminPassword");

  if (!backendUrlParam) {
    return NextResponse.json(
      { error: "Missing required parameter: backendUrl" },
      { status: 400 }
    );
  }

  // Priority 1: Load JWT token from server-side settings.json (always works)
  // Priority 2: Use JWT token passed as adminApiKey (if eyJ... format)
  // Priority 3: Authenticate with email/password (fallback)
  let authToken = "";
  let actualBackendUrl = normalizeBackendUrl(backendUrlParam);

  // Load server-side credentials
  const serverCreds = await loadServerCredentials();

  if (serverCreds?.jwtToken) {
    // Use JWT token from settings.json
    authToken = serverCreds.jwtToken;
    if (serverCreds.backendUrl) {
      actualBackendUrl = serverCreds.backendUrl;
    }
  } else if (adminApiKeyParam?.startsWith("eyJ")) {
    // Use JWT token passed as adminApiKey
    authToken = adminApiKeyParam;
  } else if (adminEmailParam && adminPasswordParam) {
    // Fallback: authenticate with email/password
    try {
      authToken = await authenticateWithMedusa(
        actualBackendUrl,
        adminEmailParam,
        adminPasswordParam
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: `JWT Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
          code: "AUTH_FAILED",
          hint: "Kiểm tra email và password Medusa Admin trong Cài đặt.",
        },
        { status: 401 }
      );
    }
  } else {
    return NextResponse.json(
      {
        error: "Missing authentication. JWT token in settings.json or adminApiKey (JWT format) or adminEmail+adminPassword required.",
        code: "AUTH_MISSING",
        hint: "Vui lòng nhập Medusa Admin API Key (JWT) hoặc Email/Password trong Cài đặt Migration.",
      },
      { status: 400 }
    );
  }

  try {
    // Build URL: strip proxy credentials from query params, forward the rest to Medusa
    const urlObj = new URL(req.nextUrl.toString());
    const actualPath = urlObj.pathname.replace(/^\/api\/medusa/, "");

    // Build query string WITHOUT auth params
    const actualQuery = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (key !== "backendUrl" && key !== "adminApiKey" && key !== "adminEmail" && key !== "adminPassword") {
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

    // Handle authentication errors with clear messages
    if (response.status === 401 || response.status === 403) {
      const errorBody = await response.text();
      let errorDetail = "";
      try {
        const parsed = JSON.parse(errorBody);
        errorDetail = parsed.message || parsed.error || errorBody;
      } catch {
        errorDetail = errorBody;
      }

      // Clear cached token if rejected
      if (adminEmailParam && adminPasswordParam) {
        const cacheKey = getCacheKey(actualBackendUrl, adminEmailParam);
        tokenCache.delete(cacheKey);
      }

      // If we used server JWT and it was rejected, clear server cache
      if (serverCreds?.jwtToken) {
        console.warn("[MedusaProxy] Server JWT rejected, clearing cache");
        tokenCache.clear();
      }

      const isJwtFormat = authToken && authToken.split(".").length === 3;
      return NextResponse.json(
        {
          error: "Lỗi xác thực Medusa (HTTP ${response.status}): ${errorDetail}",
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
      // Log lỗi chi tiết để debug
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
          error: `Không thể kết nối Medusa backend. Vui lòng kiểm tra Medusa backend đang chạy tại ${backendUrlParam}.`,
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
