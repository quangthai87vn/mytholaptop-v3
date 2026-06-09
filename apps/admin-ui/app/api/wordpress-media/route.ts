import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/content/db/app-settings";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { decrypt } from "@/lib/content/db/encryption";

// ─────────────────────────────────────────────────────────────────
// Credential loader (same pattern as woo proxy)
// ─────────────────────────────────────────────────────────────────

async function loadWpCredentials(): Promise<{
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

// ─────────────────────────────────────────────────────────────────
// GET /api/wordpress-media — list media items
// Query params: per_page, page, search, media_type
// ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const creds = await loadWpCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Chưa cấu hình WooCommerce/WordPress. Vui lòng cấu hình trong Settings." },
      { status: 400 }
    );
  }

  const { searchParams } = req.nextUrl;
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "60";
  const search = searchParams.get("search") || "";

  const query = new URLSearchParams({
    page,
    per_page: perPage,
    media_type: "image",
  });
  if (search) query.set("search", search);

  const url = new URL(`/wp-json/wp/v2/media?${query.toString()}`, creds.baseUrl);
  url.searchParams.set("consumer_key", creds.consumerKey);
  url.searchParams.set("consumer_secret", creds.consumerSecret);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.text();
    const items = JSON.parse(data);

    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({
          error: items.message || items.error || "WordPress Media API error",
          code: items.code || `HTTP_${response.status}`,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1", 10);
    const totalItems = parseInt(response.headers.get("X-WP-Total") || "0", 10);

    return new NextResponse(
      JSON.stringify({ items, totalPages, totalItems }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-WP-TotalPages": String(totalPages),
          "X-WP-Total": String(totalItems),
        },
      }
    );
  } catch (error) {
    console.error("WordPress media GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WordPress Media API error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/wordpress-media — upload media
// Body: FormData with file (Blob) and title (optional)
// ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const creds = await loadWpCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Chưa cấu hình WooCommerce/WordPress. Vui lòng cấu hình trong Settings." },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const title = (formData.get("title") as string) || "";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Thiếu tệp tin (file). Vui lòng gửi FormData với trường 'file'." },
        { status: 400 }
      );
    }

    const filename =
      (file as File).name ||
      `image-${Date.now()}.${(file as File).type?.split("/")[1] || "jpg"}`;

    // WordPress REST API upload
    const uploadUrl = new URL("/wp-json/wp/v2/media", creds.baseUrl);
    uploadUrl.searchParams.set("consumer_key", creds.consumerKey);
    uploadUrl.searchParams.set("consumer_secret", creds.consumerSecret);

    const uploadForm = new FormData();
    uploadForm.append("file", file, filename);
    if (title) uploadForm.append("title", title);

    const response = await fetch(uploadUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": (file as File).type || "image/jpeg",
      },
      body: uploadForm,
    });

    const data = await response.text();
    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(data);
    } catch {
      return new NextResponse(
        JSON.stringify({ error: `WordPress returned non-JSON: ${data.slice(0, 200)}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({
          error: (parsed as { message?: string }).message || "Upload failed",
          code: (parsed as { code?: string }).code || `HTTP_${response.status}`,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return the media item
    const media = parsed as {
      id: number;
      source_url: string;
      title: { rendered: string };
      alt_text: string;
      mime_type: string;
    };

    return new NextResponse(
      JSON.stringify({
        id: media.id,
        source_url: media.source_url,
        title: media.title?.rendered || "",
        alt: media.alt_text || "",
        mime_type: media.mime_type,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WordPress media POST (upload) error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload error" },
      { status: 500 }
    );
  }
}
