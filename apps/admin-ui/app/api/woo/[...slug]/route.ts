import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const endpoint = slug.join("/");
  const searchParams = req.nextUrl.searchParams.toString();
  const url = searchParams ? `/wp-json/wc/v3/${endpoint}?${searchParams}` : `/wp-json/wc/v3/${endpoint}`;

  return proxyRequest(url, req);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const endpoint = slug.join("/");
  const url = `/wp-json/wc/v3/${endpoint}`;

  return proxyRequest(url, req);
}

async function proxyRequest(targetPath: string, req: NextRequest) {
  try {
    const baseUrl = req.nextUrl.searchParams.get("baseUrl");
    const consumerKey = req.nextUrl.searchParams.get("consumerKey");
    const consumerSecret = req.nextUrl.searchParams.get("consumerSecret");

    if (!baseUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: "Missing required parameters: baseUrl, consumerKey, consumerSecret" },
        { status: 400 }
      );
    }

    const url = new URL(targetPath, baseUrl);
    url.searchParams.set("consumer_key", consumerKey);
    url.searchParams.set("consumer_secret", consumerSecret);

    // Remove our custom params
    url.searchParams.delete("baseUrl");
    url.searchParams.delete("consumerKey");
    url.searchParams.delete("consumerSecret");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let body: string | undefined;
    if (req.method === "POST") {
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
