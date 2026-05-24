/**
 * Medusa Products Proxy (read-only)
 * GET /api/medusa/products
 *     ?limit=20&offset=0&q=search_term
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

async function getMedusaConfig() {
  try {
    const settingsPath = path.join(process.cwd(), "data", "settings.json");
    const raw = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(raw);
    return {
      url: settings.medusa?.backendUrl || settings.medusa?.url || "http://localhost:9000",
      jwtToken: settings.medusa?.adminApiKey?.startsWith("eyJ")
        ? settings.medusa.adminApiKey
        : undefined,
      email: settings.medusa?.adminEmail || "",
      password: settings.medusa?.adminPassword || "",
    };
  } catch (err) {
    console.error("[Medusa Products] Cannot read settings.json:", err);
    return {
      url: "http://localhost:9000",
      jwtToken: undefined,
      email: "",
      password: "",
    };
  }
}

async function authenticateWithMedusa(url: string, email: string, password: string) {
  const authEndpoints = [
    "/admin/auth/user/emailpass",
    "/auth/user/emailpass",
    "/admin/auth",
  ];

  for (const authPath of authEndpoints) {
    try {
      const fullUrl = `${url.replace(/\/$/, "")}${authPath}`;
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, scope: "admin" }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json() as {
          access_token?: string;
          token?: string;
          expires_at?: number;
        };
        const token = data.access_token || data.token || "";
        if (token) {
          console.log(`[Medusa Products] Authenticated via ${authPath}`);
          return token;
        }
      }
    } catch (err) {
      console.warn(`[Medusa Products] Auth attempt ${authPath} failed:`, err);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";
    const q = searchParams.get("q") || "";

    const { url, jwtToken, email, password } = await getMedusaConfig();
    console.log(`[Medusa Products] Config loaded — url=${url}, hasJwt=${!!jwtToken}, hasCreds=${!!(email && password)}`);

    let authToken = jwtToken;

    if (!authToken && email && password) {
      authToken = await authenticateWithMedusa(url, email, password);
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "Chưa cấu hình Medusa. Vui lòng cấu hình Medusa trước." },
        { status: 401 }
      );
    }

    let endpoint = `${url}/admin/products?limit=${limit}&offset=${offset}`;
    if (q) {
      endpoint += `&q=${encodeURIComponent(q)}`;
    }

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("[Medusa Products] Token expired, re-authenticating...");
        const newToken = await authenticateWithMedusa(url, email, password);
        if (newToken) {
          const retryRes = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${newToken}`,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(10000),
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            return NextResponse.json({
              products: data.products || [],
              count: data.count || 0,
              limit: parseInt(limit),
              offset: parseInt(offset),
            });
          }
        }
        return NextResponse.json(
          { error: "Hết hạn xác thực Medusa. Vui lòng cấu hình lại trong Settings." },
          { status: 401 }
        );
      }
      const errData = await res.json().catch(() => ({}));
      console.error(`[Medusa Products] API error ${res.status}:`, errData);
      return NextResponse.json(
        { error: errData.message || errData.error || `Lỗi Medusa: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      products: data.products || [],
      count: data.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error("[Medusa Products GET] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Lỗi khi lấy danh sách sản phẩm";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
