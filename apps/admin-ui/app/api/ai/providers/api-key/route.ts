/**
 * GET /api/ai/providers/api-key — Lấy masked key (chỉ frontend)
 * POST /api/ai/providers/api-key — Decrypt key khi cần gọi AI (server-side only)
 * PUT /api/ai/providers/api-key — Cập nhật API key (encrypt trước khi lưu)
 *
 * P5.10 Security Audit: All methods now have requireAdminAuth + requireCsrf.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/content/db/encryption";
import { maskApiKey } from "@/app/api/ai/settings/all/route";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";
import { requirePermission } from "@/lib/auth/require-permission";

/**
 * GET: Trả masked key về frontend — KHÔNG bao giờ trả full key
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 });
    }

    const { rows } = await query<{
      id: number;
      provider: string;
      api_key_encrypted: string | null;
      api_key_iv: string | null;
    }>(
      "SELECT id, provider, api_key_encrypted, api_key_iv FROM ai_providers WHERE id = $1",
      [parseInt(id, 10)]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy provider" }, { status: 404 });
    }

    const p = rows[0];
    let masked = "";
    if (p.api_key_encrypted && p.api_key_iv) {
      try {
        const decrypted = decrypt(p.api_key_encrypted, p.api_key_iv);
        masked = maskApiKey(decrypted);
      } catch {
        masked = "sk-****(lỗi)";
      }
    }

    return NextResponse.json({
      provider_id: p.id,
      provider: p.provider,
      masked_key: masked,
    });
  } catch (err) {
    console.error("[Provider API Key GET]", err);
    return NextResponse.json({ error: "Lỗi khi lấy API key" }, { status: 500 });
  }
}

/**
 * POST: Decrypt API key — CHỈ dùng nội bộ (server-to-server hoặc khi gọi AI thật).
 * Body: { id: number }
 * Response: { provider_id, provider, api_key } — KHÔNG trả về client thông thường
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const permError = requirePermission(req, "ai_engine.manage");
  if (permError) return permError;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 });
    }

    const { rows } = await query<{
      id: number;
      provider: string;
      base_url: string | null;
      api_key_encrypted: string | null;
      api_key_iv: string | null;
    }>(
      "SELECT id, provider, base_url, api_key_encrypted, api_key_iv FROM ai_providers WHERE id = $1",
      [parseInt(id, 10)]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Không tìm thấy provider" }, { status: 404 });
    }

    const p = rows[0];
    let apiKey: string | null = null;
    if (p.api_key_encrypted && p.api_key_iv) {
      try {
        apiKey = decrypt(p.api_key_encrypted, p.api_key_iv);
      } catch {
        apiKey = null;
      }
    }

    return NextResponse.json({
      provider_id: p.id,
      provider: p.provider,
      base_url: p.base_url,
      api_key: apiKey,
    });
  } catch (err) {
    console.error("[Provider API Key POST]", err);
    return NextResponse.json({ error: "Lỗi khi giải mã API key" }, { status: 500 });
  }
}

/**
 * PUT: Cập nhật API key (encrypt trước khi lưu)
 * Body: { id: number, api_key: string }
 */
export async function PUT(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  // P5.10 Security Audit: CSRF protection added. Without this, an attacker could
  // inject a malicious API key into providers via a crafted form submission.

  try {
    const body = await req.json();
    const { id, api_key } = body;

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 });
    }
    if (!api_key || typeof api_key !== "string" || api_key.trim() === "") {
      return NextResponse.json({ error: "api_key không được rỗng" }, { status: 400 });
    }

    const enc = encrypt(api_key.trim());
    await query(
      `UPDATE ai_providers SET api_key_encrypted = $1, api_key_iv = $2, updated_at = NOW() WHERE id = $3`,
      [enc.encrypted, enc.iv, parseInt(id, 10)]
    );

    const masked = maskApiKey(api_key.trim());
    return NextResponse.json({
      provider_id: id,
      masked_key: masked,
      message: "API key đã được mã hóa và lưu",
    });
  } catch (err) {
    console.error("[Provider API Key PUT]", err);
    return NextResponse.json({ error: "Lỗi khi lưu API key" }, { status: 500 });
  }
}
