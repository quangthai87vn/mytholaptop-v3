import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { backendUrl, email, password } = body;

    if (!backendUrl || !email || !password) {
      return NextResponse.json(
        { error: "Thiếu backendUrl, email hoặc password" },
        { status: 400 }
      );
    }

    const url = `${backendUrl.replace(/\/$/, "")}/auth/user/emailpass`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, scope: "admin" }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      return NextResponse.json({ token: data.token });
    }

    if (response.status === 401 || response.status === 400) {
      return NextResponse.json(
        {
          error: data.message || "Email hoặc password không đúng. Vui lòng kiểm tra lại.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { error: data.message || `Lỗi không xác định (HTTP ${response.status})` },
      { status: response.status }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Lỗi kết nối";
    const isNetworkError =
      errorMessage.includes("fetch") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("net::");

    if (isNetworkError) {
      return NextResponse.json(
        {
          error: "Không kết nối được Medusa Backend. Vui lòng kiểm tra URL và đảm bảo Medusa đang chạy.",
          code: "NETWORK_ERROR",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Lỗi: ${errorMessage}` },
      { status: 500 }
    );
  }
}
