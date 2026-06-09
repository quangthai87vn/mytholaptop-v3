import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/content/db/app-settings";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { decrypt } from "@/lib/content/db/encryption";

/**
 * Load WooCommerce credentials from database (app_settings table).
 * Credentials are encrypted at rest — decrypt before use.
 * Never accept credentials from query params.
 */
async function loadWooCommerceCredentials(): Promise<{
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
} | null> {
  try {
    const woo = await getAppSetting("wooCommerce");
    if (!woo) return null;
    const w = woo as Record<string, unknown>;

    const rawUrl = w.wordpressUrl as string | undefined;
    const rawKey = w.consumerKey as string | undefined;
    const rawSecret = w.consumerSecret as string | undefined;
    const keyIv = w._consumerKey_iv as string | undefined;
    const secretIv = w._consumerSecret_iv as string | undefined;

    const baseUrl = rawUrl || "";

    let consumerKey = "";
    let consumerSecret = "";

    if (rawKey && keyIv) {
      try { consumerKey = decrypt(rawKey, keyIv); } catch { consumerKey = rawKey; }
    } else if (rawKey) {
      consumerKey = rawKey;
    }

    if (rawSecret && secretIv) {
      try { consumerSecret = decrypt(rawSecret, secretIv); } catch { consumerSecret = rawSecret; }
    } else if (rawSecret) {
      consumerSecret = rawSecret;
    }

    if (!baseUrl || !consumerKey || !consumerSecret) return null;
    return { baseUrl, consumerKey, consumerSecret };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { slug } = await params;
  const endpoint = slug.join("/");
  const searchParams = req.nextUrl.searchParams.toString();
  const url = searchParams ? `/wp-json/wc/v3/${endpoint}?${searchParams}` : `/wp-json/wc/v3/${endpoint}`;

  return proxyRequest(url, req);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { slug } = await params;
  const endpoint = slug.join("/");
  const url = `/wp-json/wc/v3/${endpoint}`;

  return proxyRequest(url, req);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const { slug } = await params;
  const endpoint = slug.join("/");
  const url = `/wp-json/wc/v3/${endpoint}`;

  return proxyRequest(url, req);
}

async function proxyRequest(targetPath: string, req: NextRequest) {
  try {
    // P5.4 Security: credentials come from DB only, NOT from query params
    const creds = await loadWooCommerceCredentials();

    if (!creds) {
      return NextResponse.json(
        { error: "Chưa cấu hình WooCommerce. Vui lòng cấu hình Consumer Key/Secret trong Settings." },
        { status: 400 }
      );
    }

    const url = new URL(targetPath, creds.baseUrl);
    // Inject credentials server-side — never expose in URL
    url.searchParams.set("consumer_key", creds.consumerKey);
    url.searchParams.set("consumer_secret", creds.consumerSecret);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let body: string | undefined;
    if (req.method === "POST" || req.method === "PUT") {
      body = await req.text();
    }

    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    const data = await response.text();

    // Check for WooCommerce API errors
    if (!response.ok) {
      let errorDetail = "";
      let errorCode = `HTTP_${response.status}`;
      try {
        const parsed = JSON.parse(data);
        errorDetail = parsed.message || parsed.error || parsed.code || data;
        if (parsed.code) errorCode = parsed.code;
      } catch {
        errorDetail = data.length > 200 ? data.slice(0, 200) + "..." : data;
      }
      return new NextResponse(
        JSON.stringify({ error: errorDetail, code: errorCode }),
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
    console.error("WooCommerce proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy error", code: "PROXY_ERROR" },
      { status: 500 }
    );
  }
}
