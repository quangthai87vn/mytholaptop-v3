import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { getAppSetting } from "@/lib/content/db/app-settings";

/**
 * GET /api/medusa/status
 *
 * Server-side status check — reads directly from DB, no masking.
 * Returns configured status + connection test + product count.
 */

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const medusa = await getAppSetting("medusa");
    const m = medusa as Record<string, unknown> | null;

    const backendUrl = (m?.backendUrl as string) || "";
    const adminApiKey = (m?.adminApiKey as string) || "";
    const adminPassword = (m?.adminPassword as string) || "";

    // A real JWT token has 3 base64url segments separated by dots (e.g. "eyJ...")
    const isJwtFormat = (key: string) => key.startsWith("eyJ") && key.split(".").length === 3;
    // Configured = backendUrl present + (JWT token stored OR email+password stored)
    const configured = !!(
      backendUrl &&
      ((adminApiKey && adminApiKey !== "__ENCRYPTED__") || (adminPassword && isJwtFormat(adminPassword)))
    );

    if (!configured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        productCount: 0,
        error: backendUrl
          ? "Medusa chưa có JWT token. Vui lòng vào Cài đặt → Medusa để lấy token."
          : "Medusa chưa được cấu hình. Vui lòng vào Cài đặt → Medusa.",
      });
    }

    // Determine the actual token to use for the connection test
    // Priority: adminApiKey (if real JWT) > adminPassword (if real JWT)
    const actualToken = (adminApiKey && adminApiKey !== "__ENCRYPTED__" && isJwtFormat(adminApiKey))
      ? adminApiKey
      : (adminPassword && isJwtFormat(adminPassword) ? adminPassword : "");

    // Test connection to Medusa
    const normalizedUrl = backendUrl.replace(/\/$/, "");
    let connected = false;
    let productCount = 0;
    let error = "";

    if (!actualToken) {
      return NextResponse.json({
        configured: true,
        connected: false,
        productCount: 0,
        error: "Medusa chưa có JWT token. Vui lòng lấy token từ Medusa Admin.",
      });
    }

    try {
      const response = await fetch(`${normalizedUrl}/admin/products?limit=0`, {
        headers: {
          Authorization: `Bearer ${actualToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        connected = true;
        const data = await response.json() as { count?: number };
        productCount = data.count ?? 0;
      } else if (response.status === 401 || response.status === 403) {
        error = "Token Medusa hết hạn hoặc không hợp lệ. Vui lòng vào Cài đặt → Medusa để lấy lại token.";
      } else {
        const body = await response.text().catch(() => "");
        try {
          const parsed = JSON.parse(body);
          error = (parsed.message as string) || (parsed.error as string) || `HTTP ${response.status}`;
        } catch {
          error = `HTTP ${response.status}`;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
        error = `Không thể kết nối Medusa tại ${normalizedUrl}. Kiểm tra Medusa backend đang chạy.`;
      } else {
        error = msg;
      }
    }

    return NextResponse.json({
      configured: true,
      connected,
      productCount,
      error: error || undefined,
    });
  } catch (err) {
    console.error("[MedusaStatus]", err);
    return NextResponse.json(
      { error: "Lỗi khi kiểm tra trạng thái Medusa." },
      { status: 500 }
    );
  }
}
