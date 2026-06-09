import { NextResponse } from "next/server";

/**
 * DEPRECATED — P4.2 Security Cleanup
 *
 * Endpoint này từng trả về admin_api_key cho frontend.
 * KHÔNG còn cần thiết vì Workspace API dùng session cookie (requireAdminAuth).
 * Medusa proxy credentials được xử lý server-side trong /api/medusa.
 *
 * Xóa endpoint này để tránh lộ admin_api_key qua HTTP response.
 * Sử dụng /api/auth/me (session-based) thay thế.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint đã bị vô hiệu hóa",
      message:
        "Endpoint /api/admin/me không còn được hỗ trợ. Sử dụng /api/auth/me để lấy thông tin user đã đăng nhập.",
      code: "ENDPOINT_DISABLED",
      removed_in: "P4.2",
    },
    { status: 410 }
  );
}
