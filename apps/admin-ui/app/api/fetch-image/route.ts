/**
 * Proxy route to fetch images from external URLs (WordPress)
 * to avoid CORS issues when running in browser.
 * 
 * Usage: GET /api/fetch-image?url={encodedUrl}
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TIMEOUT_MS = 30000;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only http/https allowed" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ALLOWED_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageProxy/1.0)",
        "Accept": "image/*,*/*",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
