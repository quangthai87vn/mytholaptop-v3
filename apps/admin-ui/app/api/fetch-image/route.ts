/**
 * Proxy route to fetch images from external URLs (WordPress)
 * to avoid CORS issues when running in browser.
 *
 * Improvements:
 * - Retries with different User-Agent on failure
 * - Handles WordPress hotlink protection
 * - Strips redirects and returns proper error for blocked images
 *
 * Usage: GET /api/fetch-image?url={encodedUrl}
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TIMEOUT_MS = 30000;

// Different User-Agent strings to try (some sites block the first one)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mediaphone/1.0 (+https://mytholaptop.vn/bot)",
];

interface FetchAttempt {
  ok: boolean;
  status: number;
  statusText: string;
  contentType: string;
  buffer?: ArrayBuffer;
  error?: string;
  redirectUrl?: string;
  bytesReceived: number;
}

async function tryFetch(url: string, userAgentIndex: number): Promise<FetchAttempt> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALLOWED_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENTS[userAgentIndex % USER_AGENTS.length],
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        // Try to bypass hotlink protection by spoofing Referer
        "Referer": "https://mytholaptop.vn/",
        "Origin": "https://mytholaptop.vn",
      },
    });

    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();
    const bytesReceived = buffer.byteLength;

    // Check if response is actually an image (not HTML error page)
    const isImage = /^(image\/|application\/octet-stream)/.test(contentType)
      && bytesReceived > 1000  // at least 1KB of data
      && !contentType.includes("text/html");

    if (!isImage && bytesReceived > 0) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        contentType,
        buffer,
        bytesReceived,
        error: `Non-image response: ${contentType} (${bytesReceived} bytes) — possibly blocked`,
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType,
      buffer,
      bytesReceived,
    };
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, status: 0, statusText: "Timeout", contentType: "", error: "Timeout", bytesReceived: 0 };
    }
    return { ok: false, status: 0, statusText: "Error", contentType: "", error: msg, bytesReceived: 0 };
  }
}

export async function GET(req: NextRequest) {
  let url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Handle relative URLs: prepend WP_PUBLIC_BASE_URL env variable
  if (url.startsWith("/")) {
    const wpBaseUrl = process.env.WP_PUBLIC_BASE_URL || "https://mytholaptop.vn";
    url = wpBaseUrl.replace(/\/$/, "") + url;
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

  // Try each User-Agent until we get a valid image response
  const errors: string[] = [];
  for (let attempt = 0; attempt < USER_AGENTS.length; attempt++) {
    const result = await tryFetch(url, attempt);

    if (result.ok && result.buffer && result.bytesReceived > 0) {
      // Success! Return the image
      return new NextResponse(result.buffer, {
        status: 200,
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "public, max-age=86400",
          "Content-Length": result.buffer.byteLength.toString(),
          "X-Fetch-Attempt": String(attempt + 1),
        },
      });
    }

    // Log this attempt's error
    if (result.error) {
      errors.push(`Attempt ${attempt + 1}: ${result.error}`);
    } else if (result.status !== 200) {
      errors.push(`Attempt ${attempt + 1}: HTTP ${result.status} ${result.statusText}`);
    }

    // If this attempt got a non-image HTML response (hotlink blocked), don't retry
    if (result.contentType.includes("text/html") || result.contentType.includes("text/plain")) {
      console.error(`[fetch-image] Site blocked (HTML response) for: ${url}`);
      return NextResponse.json(
        {
          error: `Image blocked by site: HTTP ${result.status}`,
          url,
          attempt: attempt + 1,
        },
        { status: 403 }
      );
    }
  }

  // All attempts failed
  console.error(`[fetch-image] All attempts failed for: ${url}`, errors);
  return NextResponse.json(
    {
      error: `Failed after ${USER_AGENTS.length} attempts`,
      url,
      errors,
    },
    { status: 502 }
  );
}
