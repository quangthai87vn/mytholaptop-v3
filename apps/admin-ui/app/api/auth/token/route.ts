import { NextRequest, NextResponse } from "next/server";
import { requireCsrf } from "@/lib/auth/csrf";

function normalizeBackendUrl(url: string): string {
  let normalized = url.replace(/\/$/, "");

  // Handle Docker internal hostnames when running outside Docker
  // These hostnames only work inside Docker containers
  const dockerHostnames = ["backend", "medusa-backend", "medusa"];
  for (const hostname of dockerHostnames) {
    if (
      normalized.startsWith(`http://${hostname}:`) ||
      normalized.startsWith(`https://${hostname}:`)
    ) {
      // Replace with localhost for local development
      normalized = normalized.replace(
        `://${hostname}:`,
        `://localhost:`
      );
      break;
    }
  }

  return normalized;
}

export async function POST(req: NextRequest) {
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const body = await req.json();
    const { backendUrl, email, password } = body;

    if (!backendUrl || !email || !password) {
      return NextResponse.json(
        { error: "Thiếu backendUrl, email hoặc password" },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeBackendUrl(backendUrl).replace(/\/$/, "");

    // Try multiple auth endpoints for Medusa v1/v2 compatibility
    const authEndpoints = [
      "/admin/auth/user/emailpass",
      "/auth/user/emailpass",
      "/admin/auth",
    ];

    let lastError = "";

    for (const authPath of authEndpoints) {
      try {
        const url = `${normalizedUrl}${authPath}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, scope: "admin" }),
          signal: AbortSignal.timeout(10000),
        });

        const data = await response.json();

        if (response.ok && (data.token || data.access_token)) {
          return NextResponse.json({ token: data.token || data.access_token });
        }

        if (response.status === 401 || response.status === 400) {
          lastError = data.message || "Email hoặc password không đúng";
          continue;
        }

        lastError = data.message || `Lỗi (HTTP ${response.status})`;
      } catch {
        lastError = "Không kết nối được Medusa Backend";
      }
    }

    const isNetwork = lastError.includes("Không kết nối");
    return NextResponse.json(
      { error: lastError },
      { status: isNetwork ? 503 : 401 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi kết nối";
    const isNetworkError =
      errorMessage.includes("fetch") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("net::");

    if (isNetworkError) {
      return NextResponse.json(
        {
          error: "Không kết nối được Medusa Backend. Vui lòng kiểm tra URL và đảm bảo Medusa đang chạy.",
          code: "NETWORK_ERROR",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Lỗi: ${errorMessage}` },
      { status: 500 }
    );
  }
}
