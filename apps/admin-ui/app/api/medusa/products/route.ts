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
      url: settings.medusa?.url || "http://localhost:9000",
      token: settings.medusa?.token || "",
    };
  } catch {
    return {
      url: "http://localhost:9000",
      token: "",
    };
  }
}

async function getMedusaToken(url: string) {
  try {
    const settingsPath = path.join(process.cwd(), "data", "settings.json");
    const raw = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(raw);
    if (settings.medusa?.email && settings.medusa?.password) {
      const res = await fetch(`${url}/admin/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: settings.medusa.email,
          password: settings.medusa.password,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.token;
      }
    }
  } catch { /* ignore */ }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = searchParams.get("limit") || "20";
    const offset = searchParams.get("offset") || "0";
    const q = searchParams.get("q") || "";

    const { url, token } = await getMedusaConfig();

    // Try existing token first
    let authToken = token;

    // If no token, try to get one
    if (!authToken) {
      authToken = await getMedusaToken(url);
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "Chua cau hinh Medusa. Vui long cau hinh Medusa truoc." },
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
      next: { revalidate: 30 }, // cache 30s
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Try refreshing token
        const newToken = await getMedusaToken(url);
        if (newToken) {
          const retryRes = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${newToken}`,
              "Content-Type": "application/json",
            },
            next: { revalidate: 30 },
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
        return NextResponse.json({ error: "Het han xac thuc Medusa" }, { status: 401 });
      }
      return NextResponse.json({ error: `Loi Medusa: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      products: data.products || [],
      count: data.count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error("[Medusa Products GET]", err);
    return NextResponse.json({ error: "Loi khi lay danh sach san pham" }, { status: 500 });
  }
}
