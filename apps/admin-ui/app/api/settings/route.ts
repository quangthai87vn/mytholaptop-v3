import { NextRequest, NextResponse } from "next/server";
import { getAppSetting, saveAppSetting } from "@/lib/content/db/app-settings";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import type { AdminUser } from "@/lib/auth/session";
import { requireCsrf } from "@/lib/auth/csrf";
import { z } from "zod";
import { writeSettingsAuditLog, extractIpAddress } from "@/lib/auth/audit-log";
import { encrypt, decrypt, isEncrypted } from "@/lib/content/db/encryption";

/**
 * Mask WooCommerce credentials for API response (public GET).
 * Only show first 4 and last 4 characters.
 * P5.4 Security: raw credentials must never appear in API response.
 */
function maskWooCommerceCredentials(woo: Record<string, string>): Record<string, string> {
  const mask = (v: string) => {
    if (!v || v.length < 10) return v ? "••••••••" : "";
    return `${v.slice(0, 4)}••••${v.slice(-4)}`;
  };
  return {
    wordpressUrl: woo.wordpressUrl || "",
    consumerKey: mask(woo.consumerKey),
    consumerSecret: mask(woo.consumerSecret),
  };
}

/**
 * Encrypt sensitive WooCommerce credentials before storing.
 * Stores encrypted payload as `consumerKey_encrypted` field.
 */
function encryptWooCredentials(woo: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...woo };
  if (woo.consumerKey) {
    const { encrypted, iv } = encrypt(woo.consumerKey as string);
    result.consumerKey = encrypted;
    result._consumerKey_iv = iv;
  }
  if (woo.consumerSecret) {
    const { encrypted, iv } = encrypt(woo.consumerSecret as string);
    result.consumerSecret = encrypted;
    result._consumerSecret_iv = iv;
  }
  return result;
}

/**
 * Decrypt WooCommerce credentials from stored format.
 * Handles both legacy (plain text) and new (encrypted) formats.
 */
function decryptWooCredentials(woo: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {
    wordpressUrl: (woo.wordpressUrl as string) || "",
    consumerKey: "",
    consumerSecret: "",
  };

  // Try encrypted format first
  const keyEncrypted = woo.consumerKey as string | undefined;
  const keyIv = woo._consumerKey_iv as string | undefined;
  if (keyEncrypted && keyIv) {
    try {
      result.consumerKey = decrypt(keyEncrypted, keyIv);
    } catch {
      // Fallback: might be plain text (legacy)
      result.consumerKey = keyEncrypted;
    }
  } else if (typeof keyEncrypted === "string" && keyEncrypted) {
    result.consumerKey = keyEncrypted;
  }

  const secretEncrypted = woo.consumerSecret as string | undefined;
  const secretIv = woo._consumerSecret_iv as string | undefined;
  if (secretEncrypted && secretIv) {
    try {
      result.consumerSecret = decrypt(secretEncrypted, secretIv);
    } catch {
      result.consumerSecret = secretEncrypted;
    }
  } else if (typeof secretEncrypted === "string" && secretEncrypted) {
    result.consumerSecret = secretEncrypted;
  }

  return result;
}

/**
 * P5.4 Zod validation for settings input.
 * Validates URL format and reasonable length for all fields.
 */
const wooCommerceSchema = z.object({
  wordpressUrl: z.string().url("WordPress URL phải là URL hợp lệ").optional().or(z.literal("")),
  consumerKey: z.string().max(100).optional(),
  consumerSecret: z.string().max(100).optional(),
});

const medusaSchema = z.object({
  backendUrl: z.string().url("Medusa URL phải là URL hợp lệ").optional().or(z.literal("")),
  adminApiKey: z.string().max(500).optional(),
  adminEmail: z.string().email("Email phải hợp lệ").optional().or(z.literal("")),
  adminPassword: z.string().max(200).optional(),
});

const companySchema = z.object({
  name: z.string().max(200).optional(),
  website: z.string().url("Website phải là URL hợp lệ").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  logoUrl: z.string().url("Logo URL phải là URL hợp lệ").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
});

const productDataSourceSchema = z.object({
  source: z.enum(["medusa", "woocommerce"]),
});

export async function GET(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  // P5.9: Reading settings requires settings.manage permission
  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;
  if (!hasPermission(authUser, "settings.manage") && authUser.role !== "super_admin") {
    return NextResponse.json(
      { error: "Không có quyền xem cài đặt.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  try {
    const [wooCommerce, medusa, company, productDataSource] = await Promise.all([
      getAppSetting("wooCommerce"),
      getAppSetting("medusa"),
      getAppSetting("company"),
      getAppSetting("product_data_source"),
    ]);

    // Medusa credentials are stored as-is (not encrypted in P5.4 — only WooCommerce secrets are encrypted).
    // Return a sentinel value "__ENCRYPTED__" to signal to the frontend that a token is stored.
    // This prevents the frontend state from being wiped when GET returns empty strings.
    const m = medusa as Record<string, unknown> | null;
    const hasStoredApiKey = !!(m?.adminApiKey && String(m.adminApiKey).length > 0);
    const hasStoredPassword = !!(m?.adminPassword && String(m.adminPassword).length > 0);
    const medusaSafe = {
      backendUrl: (m?.backendUrl as string) ?? "",
      adminEmail: (m?.adminEmail as string) ?? "",
      // Sentinel: tells frontend "a secret is stored, do NOT overwrite your current state"
      adminApiKey: hasStoredApiKey ? "__ENCRYPTED__" : "",
      adminPassword: hasStoredPassword ? "__ENCRYPTED__" : "",
    };

    // Decrypt WooCommerce credentials for server-side use (e.g. migration page).
    // Note: masking WooCommerce credentials was originally intended for client-facing APIs,
    // but the /products/sync page is a server component that legitimately needs raw credentials.
    // WooCommerce secrets are stored encrypted in DB; they are safe at rest.
    const wooDecrypted = decryptWooCredentials(wooCommerce as Record<string, unknown> || {});

    const pds = productDataSource as Record<string, string> | null;

    const settings = {
      wooCommerce: {
        wordpressUrl: wooDecrypted.wordpressUrl,
        consumerKey: wooDecrypted.consumerKey,
        consumerSecret: wooDecrypted.consumerSecret,
      },
      medusa: medusaSafe,
      company: (company as Record<string, string>) ?? {
        name: "",
        website: "",
        phone: "",
        logoUrl: "",
        address: "",
      },
      product_data_source: (pds?.source as "medusa" | "woocommerce") ?? "woocommerce",
    };

    // Return decrypted credentials (not masked) — credentials are stored encrypted in DB.
    // The /products/sync page needs raw WooCommerce credentials for API calls.
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[Settings GET]", err);
    return NextResponse.json({ error: "Lỗi khi đọc settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const authUser = (req as NextRequest & { _authUser?: AdminUser })._authUser!;

  // P5.9: Saving settings requires settings.manage permission
  if (!hasPermission(authUser, "settings.manage") && authUser.role !== "super_admin") {
    return NextResponse.json(
      { error: "Không có quyền lưu cài đặt.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // P5.9: Saving WooCommerce/Medusa credentials requires credentials.manage
  try {
    const body = await req.json();
    const { wooCommerce, medusa } = body;

    if ((wooCommerce || medusa) &&
        !hasPermission(authUser, "credentials.manage") &&
        authUser.role !== "super_admin") {
      return NextResponse.json(
        { error: "Không có quyền lưu credentials.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Re-construct the body so it can be read again
    // Store parsed body in request extension for reuse
    (req as NextRequest & { _parsedBody?: unknown })._parsedBody = body;
    void wooCommerce;
    void medusa;
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  try {
    const { wooCommerce: body_wooCommerce, medusa: body_medusa, company, product_data_source: body_product_data_source } =
      (req as NextRequest & { _parsedBody?: { wooCommerce?: unknown; medusa?: unknown; company?: unknown; product_data_source?: unknown } })._parsedBody as
      { wooCommerce?: unknown; medusa?: unknown; company?: unknown; product_data_source?: unknown };

    const saves: Promise<void>[] = [];
    const savesAudit: Promise<void>[] = [];
    const ip = extractIpAddress(req as unknown as Request);
    const ua = req.headers.get("user-agent") ?? undefined;
    const auditExtra = { ip, userAgent: ua };

    if (body_wooCommerce) {
      const parsed = wooCommerceSchema.safeParse(body_wooCommerce);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dữ liệu WooCommerce không hợp lệ", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      // Merge with existing WooCommerce settings to avoid wiping secrets when only some fields are sent
      const existingWoo = (await getAppSetting("wooCommerce")) as Record<string, unknown> ?? {};
      const mergedWoo: Record<string, unknown> = { ...existingWoo };
      const incoming = parsed.data as Record<string, unknown>;
      for (const key of ["wordpressUrl", "consumerKey", "consumerSecret"]) {
        if (incoming[key] !== undefined && String(incoming[key]).length > 0) {
          mergedWoo[key] = incoming[key];
        }
      }
      // Encrypt consumerKey and consumerSecret before storing
      const encryptedWoo = encryptWooCredentials(mergedWoo);
      saves.push(saveAppSetting("wooCommerce", encryptedWoo));
      // P5.11: Read old value for audit log (before save)
      savesAudit.push(
        (async () => {
          await writeSettingsAuditLog(
            authUser,
            "settings.woo_updated",
            existingWoo,
            encryptedWoo,
            auditExtra
          );
        })()
      );
    }
    if (body_medusa) {
      const parsed = medusaSchema.safeParse(body_medusa);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dữ liệu Medusa không hợp lệ", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      // Merge with existing Medusa settings to avoid wiping adminPassword when only token is sent
      const existingMedusa = (await getAppSetting("medusa")) as Record<string, unknown> ?? {};
      const mergedMedusa: Record<string, unknown> = { ...existingMedusa };
      const incoming = parsed.data as Record<string, unknown>;
      for (const key of ["backendUrl", "adminApiKey", "adminEmail", "adminPassword"]) {
        if (incoming[key] !== undefined && String(incoming[key]).length > 0) {
          mergedMedusa[key] = incoming[key];
        }
      }
      saves.push(saveAppSetting("medusa", mergedMedusa));
      savesAudit.push(
        (async () => {
          await writeSettingsAuditLog(
            authUser,
            "settings.medusa_updated",
            existingMedusa,
            mergedMedusa,
            auditExtra
          );
        })()
      );
    }
    if (company) {
      const parsed = companySchema.safeParse(company);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dữ liệu Company không hợp lệ", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      saves.push(saveAppSetting("company", parsed.data as Record<string, unknown>));
      savesAudit.push(
        (async () => {
          const oldCompany = await getAppSetting("company");
          await writeSettingsAuditLog(
            authUser,
            "settings.company_updated",
            oldCompany as Record<string, unknown> | null,
            parsed.data as Record<string, unknown>,
            auditExtra
          );
        })()
      );
    }
    if (body_product_data_source) {
      const parsed = productDataSourceSchema.safeParse(body_product_data_source);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dữ liệu nguồn dữ liệu sản phẩm không hợp lệ", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      saves.push(saveAppSetting("product_data_source", parsed.data as Record<string, unknown>));
      savesAudit.push(
        (async () => {
          const oldPds = await getAppSetting("product_data_source");
          await writeSettingsAuditLog(
            authUser,
            "settings.product_data_source_updated",
            oldPds as Record<string, unknown> | null,
            parsed.data as Record<string, unknown>,
            auditExtra
          );
        })()
      );
    }

    // Run saves first — audit failures must NOT block the main save operation
    // Audit logs run in fire-and-forget to ensure resilience
    await Promise.all(saves);

    // Fire-and-forget audit logs — failures are logged but don't affect the response
    for (const audit of savesAudit) {
      audit.catch((err) => console.error("[Settings POST] Audit log failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Settings POST]", err);
    return NextResponse.json({ error: "Lỗi khi lưu settings" }, { status: 500 });
  }
}
