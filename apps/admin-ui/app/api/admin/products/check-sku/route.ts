/**
 * API route to check for duplicate SKU and get products by SKU
 * GET /api/admin/products/check-sku?sku=xxx&excludeId=yyy
 * - sku: SKU to check
 * - excludeId: Product ID to exclude (for update validation)
 *
 * P4.2: Reads credentials directly from database, not via /api/settings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/content/db/app-settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sku = searchParams.get("sku")?.trim();
  const excludeId = searchParams.get("excludeId");

  if (!sku) {
    return NextResponse.json({ error: "SKU is required" }, { status: 400 });
  }

  try {
    // P4.2: Read credentials directly from DB — no frontend exposure
    const medusaRaw = await getAppSetting("medusa");
    if (!medusaRaw) {
      return NextResponse.json({ error: "Medusa not configured" }, { status: 500 });
    }
    const m = medusaRaw as Record<string, string>;
    const backendUrl = (m.backendUrl || "http://localhost:9000").replace(/\/$/, "");
    const apiKey = m.adminApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Medusa API key not configured" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${backendUrl}/admin/products?sku=${encodeURIComponent(sku)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Medusa API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const products = data.products || [];

    const duplicates = products.filter((p: { id: string; variants: Array<{ sku: string }> }) => {
      const hasSku = p.variants?.some((v) => v.sku === sku);
      return hasSku && p.id !== excludeId;
    });

    return NextResponse.json({
      sku,
      exists: duplicates.length > 0,
      duplicates: duplicates.map((p: { id: string; title: string }) => ({
        id: p.id,
        title: p.title,
      })),
    });
  } catch (error) {
    console.error("[check-sku] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
