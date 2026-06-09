/**
 * Test Connection API — kiểm tra kết nối WooCommerce API
 * POST /api/settings/test-connection/woocommerce
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCsrf } from "@/lib/auth/csrf";
import type { AdminUser } from "@/lib/auth/session";
import { z } from "zod";

const wooTestSchema = z.object({
  wordpressUrl: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  consumerKey: z.string().optional(),
  consumerSecret: z.string().optional(),
});

interface TestResult {
  connected: boolean;
  message: string;
  details?: {
    version?: string;
    productCount?: number;
    storeName?: string;
  };
}

async function testWooCommerce(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<TestResult> {
  // Normalize URL
  const apiUrl = baseUrl.replace(/\/$/, "") + "/wp-json/wc/v3";

  // WooCommerce REST API uses Basic Auth with consumer key/secret
  const authHeader =
    "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  // Try to fetch system status (good indicator of valid credentials)
  const urls = [
    `${apiUrl}/system_status`,
    `${apiUrl}/products?per_page=1`,
    `${apiUrl}/`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      });

        if (res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        let version: string | undefined;
        let productCount: number | undefined;
        let storeName: string | undefined;

        if (url.includes("system_status")) {
          version = data.version as string | undefined;
          const env = data.environment as Record<string, unknown> | undefined;
          storeName = env?.site_url as string | undefined;
        } else if (url.includes("products")) {
          productCount = parseInt(res.headers.get("X-WP-Total") || "0", 10) || undefined;
        } else if (url.includes("/")) {
          const namespaces = data.namespaces as string[] | undefined;
          version = namespaces?.[0] as string | undefined;
        }

        return {
          connected: true,
          message: "Kết nối WooCommerce thành công.",
          details: { version, productCount, storeName },
        };
      }

      if (res.status === 401) {
        return {
          connected: false,
          message: "Consumer Key hoặc Consumer Secret không đúng. Vui lòng kiểm tra lại.",
        };
      }

      if (res.status === 403) {
        return {
          connected: false,
          message: "Quyền truy cập bị từ chối. Đảm bảo Consumer Key có quyền đọc.",
        };
      }
    } catch {
      // try next endpoint
    }
  }

  return {
    connected: false,
    message: "Không thể kết nối WooCommerce API.",
  };
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  // CSRF check for write operations
  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;
  if (
    !hasPermission(authUser, "settings.manage") &&
    authUser.role !== "super_admin"
  ) {
    return NextResponse.json(
      { error: "Không có quyền kiểm tra kết nối.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = wooTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          connected: false,
          message: "Dữ liệu không hợp lệ",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { wordpressUrl, consumerKey, consumerSecret } = parsed.data;

    if (!wordpressUrl) {
      return NextResponse.json({
        connected: false,
        message: "Vui lòng nhập WordPress URL.",
      } satisfies TestResult);
    }

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json({
        connected: false,
        message: "Vui lòng nhập Consumer Key và Consumer Secret.",
      } satisfies TestResult);
    }

    const result = await testWooCommerce(wordpressUrl, consumerKey, consumerSecret);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    const isNetworkError =
      message.includes("fetch") ||
      message.includes("ENOTFOUND") ||
      message.includes("ECONNREFUSED") ||
      message.includes("net::");

    if (isNetworkError) {
      return NextResponse.json({
        connected: false,
        message:
          "Không thể kết nối WordPress/WooCommerce. Vui lòng kiểm tra URL và đảm bảo site đang hoạt động.",
      } satisfies TestResult);
    }

    return NextResponse.json({
      connected: false,
      message: `Lỗi: ${message}`,
    } satisfies TestResult);
  }
}
