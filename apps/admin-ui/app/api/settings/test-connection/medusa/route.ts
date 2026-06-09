/**
 * Test Connection API — kiểm tra kết nối Medusa Backend
 * POST /api/settings/test-connection/medusa
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCsrf } from "@/lib/auth/csrf";
import type { AdminUser } from "@/lib/auth/session";
import { z } from "zod";

const medusaTestSchema = z.object({
  backendUrl: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  adminApiKey: z.string().optional(),
  adminEmail: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  adminPassword: z.string().optional(),
});

interface TestResult {
  connected: boolean;
  message: string;
  details?: {
    productCount?: number;
    version?: string;
    storeName?: string;
  };
}

async function testJwtToken(
  backendUrl: string,
  token: string
): Promise<TestResult> {
  const url = `${backendUrl.replace(/\/$/, "")}/admin/products?limit=1`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      connected: true,
      message: "Kết nối thành công qua JWT Token",
      details: {
        productCount: data.count ?? data.products?.length ?? 0,
        version: data.version,
      },
    };
  }

  if (res.status === 401) {
    return {
      connected: false,
      message: "Token JWT không hợp lệ hoặc đã hết hạn. Vui lòng lấy token mới.",
    };
  }

  const text = await res.text().catch(() => "");
  return {
    connected: false,
    message: `Lỗi HTTP ${res.status}: ${text.slice(0, 200)}`,
  };
}

async function testEmailPassword(
  backendUrl: string,
  email: string,
  password: string
): Promise<TestResult> {
  const authEndpoints = [
    "/admin/auth/user/emailpass",
    "/auth/user/emailpass",
    "/admin/auth",
  ];

  for (const authPath of authEndpoints) {
    try {
      const url = `${backendUrl.replace(/\/$/, "")}${authPath}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, scope: "admin" }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const token = data.access_token || data.token;
        if (token) {
          // Verify token works
          const verifyResult = await testJwtToken(backendUrl, token);
          if (verifyResult.connected) {
            return {
              connected: true,
              message: "Đăng nhập thành công (JWT).",
              details: verifyResult.details,
            };
          }
        }
        return {
          connected: true,
          message: `Đăng nhập thành công qua ${authPath}`,
        };
      }
    } catch {
      // continue to next endpoint
    }
  }

  return {
    connected: false,
    message:
      "Không thể đăng nhập. Vui lòng kiểm tra email và password.",
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
    const parsed = medusaTestSchema.safeParse(body);
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

    const { backendUrl, adminApiKey, adminEmail, adminPassword } = parsed.data;

    if (!backendUrl) {
      return NextResponse.json({
        connected: false,
        message: "Vui lòng nhập Medusa Backend URL.",
      } satisfies TestResult);
    }

    // Try JWT token first
    if (adminApiKey && adminApiKey.length > 10) {
      const result = await testJwtToken(backendUrl, adminApiKey);
      if (result.connected) {
        return NextResponse.json(result);
      }
      // If token fails, try email/password as fallback
      if (
        adminEmail &&
        adminPassword &&
        (result.message.includes("401") || result.message.includes("Token"))
      ) {
        const fallbackResult = await testEmailPassword(
          backendUrl,
          adminEmail,
          adminPassword
        );
        return NextResponse.json(fallbackResult);
      }
      return NextResponse.json(result);
    }

    // Try email/password
    if (adminEmail && adminPassword) {
      const result = await testEmailPassword(backendUrl, adminEmail, adminPassword);
      return NextResponse.json(result);
    }

    return NextResponse.json({
      connected: false,
      message:
        "Vui lòng nhập JWT Token hoặc Email/Password để kiểm tra kết nối.",
    } satisfies TestResult);
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
          "Không thể kết nối Medusa Backend. Vui lòng kiểm tra URL và đảm bảo Medusa đang chạy.",
      } satisfies TestResult);
    }

    return NextResponse.json({
      connected: false,
      message: `Lỗi: ${message}`,
    } satisfies TestResult);
  }
}
