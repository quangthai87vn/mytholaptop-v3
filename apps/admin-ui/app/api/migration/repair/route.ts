/**
 * Repair Image Migration API Route (Server-side)
 *
 * Chuc nang:
 * 1. Lay danh sach san pham da migrate trong Medusa
 * 2. Voi moi san pham:
 *    - Lay wooProduct.images[] tu WooCommerce
 *    - Download/reuse anh dung (theo source_url)
 *    - Update lai: product.thumbnail, gallery images
 *    - KHONG tao lai product
 *
 * Server-side implementation (khong dung localStorage).
 */

import { NextRequest, NextResponse } from "next/server";
import type { MigrationConfig } from "@/types";
import { updateProduct } from "@/services/medusa.service";

// ============================================================
// TYPES
// ============================================================

interface RepairProgress {
  processed: number;
  total: number;
  success: number;
  failed: number;
  currentProduct: string;
  currentWooId: number;
}

interface MediaPoolEntry {
  urlHash: string;
  sourceUrl: string;
  relativePath?: string;
  status: "pending" | "downloaded" | "failed";
  updatedAt: string;
}

// In-memory pool (per server instance, reset on restart)
// This is acceptable for repair since it's a short-lived operation
const serverPool: Map<string, MediaPoolEntry> = new Map();

interface RepairState {
  running: boolean;
  aborted: boolean;
  progress: RepairProgress;
  startTime: number;
  results: Array<{ wooId: number; medusaId: string; success: boolean; error?: string }>;
}

interface MedusaProductForRepair {
  id: string;
  title: string;
  metadata?: Record<string, unknown>;
}

let _repairState: RepairState | null = null;

// ============================================================
// UTILITIES
// ============================================================

function hashUrl(url: string): string {
  const normalized = url.toLowerCase().split("?")[0].split("#")[0];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 16);
}

function getOriginalFileName(sourceUrl: string): string {
  try {
    const parts = new URL(sourceUrl).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "image");
  } catch {
    const parts = sourceUrl.split("/");
    return decodeURIComponent(parts[parts.length - 1]?.split("?")[0] || "image");
  }
}

function extractYearMonth(sourceUrl: string): { year: string; month: string } {
  const now = new Date();
  try {
    const parts = new URL(sourceUrl).pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => p === "uploads");
    if (idx !== -1 && parts.length >= idx + 3) {
      const y = parts[idx + 1];
      const m = parts[idx + 2];
      if (/^\d{4}$/.test(y) && /^\d{2}$/.test(m)) {
        return { year: y, month: m };
      }
    }
  } catch { /* ignore */ }
  return {
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, "0"),
  };
}

function decodeHtmlEntities(url: string): string {
  return url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

// ============================================================
// IMAGE DOWNLOAD
// ============================================================

async function downloadImage(
  sourceUrl: string,
  adminUiBaseUrl: string
): Promise<{ relativePath?: string; status: "downloaded" | "failed"; error?: string }> {
  const decodedUrl = decodeHtmlEntities(sourceUrl);
  const originalFileName = getOriginalFileName(decodedUrl);
  const { year, month } = extractYearMonth(decodedUrl);

  try {
    const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(decodedUrl)}`;
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(30000) });

    if (!response.ok) {
      return { status: "failed", error: `HTTP ${response.status}` };
    }

    const blob = await response.blob();
    if (blob.size === 0 || blob.size > 10 * 1024 * 1024) {
      return { status: "failed", error: `Invalid file size: ${blob.size}` };
    }

    const formData = new FormData();
    formData.append("file", blob, originalFileName);
    formData.append("sourceUrl", decodedUrl);
    formData.append("jobId", `repair_${Date.now()}`);
    formData.append("customFileName", originalFileName);
    formData.append("uploadRootDir", "public/wp-content/uploads");
    formData.append("uploadPublicPath", "/wp-content/uploads");
    formData.append("imageFolderPattern", `${year}/${month}`);
    formData.append("imageConflictStrategy", "overwrite");
    formData.append("imageSaveMode", "relative_path");

    const uploadResponse = await fetch("/api/medusa/upload-media", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      return { status: "failed", error: `Upload HTTP ${uploadResponse.status}` };
    }

    const result = await uploadResponse.json();
    if (result.relativePath) {
      return { relativePath: result.relativePath, status: "downloaded" };
    }
    return { status: "failed", error: result.error || "No path returned" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ============================================================
// API ENDPOINTS
// ============================================================

export async function GET() {
  if (!_repairState) {
    return NextResponse.json({ running: false, progress: null });
  }
  return NextResponse.json({
    running: _repairState.running,
    progress: _repairState.progress,
    duration: Date.now() - _repairState.startTime,
    results: _repairState.results,
  });
}

export async function DELETE() {
  if (_repairState && _repairState.running) {
    _repairState.aborted = true;
    return NextResponse.json({ aborted: true, message: "Repair job aborted" });
  }
  return NextResponse.json({ aborted: false, message: "No running repair job" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: MigrationConfig = body.config;
    const batchSize = Math.min(Math.max(body.batchSize || 5, 1), 20);

    if (!config) {
      return NextResponse.json({ error: "Missing config" }, { status: 400 });
    }

    if (_repairState && _repairState.running) {
      return NextResponse.json(
        { error: "Repair already running", progress: _repairState.progress },
        { status: 409 }
      );
    }

    _repairState = {
      running: true,
      aborted: false,
      progress: { processed: 0, total: 0, success: 0, failed: 0, currentProduct: "", currentWooId: 0 },
      startTime: Date.now(),
      results: [],
    };

    runRepair(config, batchSize).catch(console.error);

    return NextResponse.json({
      started: true,
      message: `Repair started for batch of ${batchSize} products`,
      progress: _repairState.progress,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// REPAIR LOGIC
// ============================================================

async function runRepair(config: MigrationConfig, batchSize: number) {
  if (!_repairState) return;

  const abortCheck = setInterval(() => {
    if (_repairState?.aborted) {
      clearInterval(abortCheck);
    }
  }, 100);

  const adminUiBaseUrl = config.adminUiUrl || "";

  try {
    console.log("[Repair] Starting repair...");

    // Fetch WooCommerce products
    const wooResponse = await fetch(
      `${config.wordpressUrl}/wp-json/wc/v3/products?per_page=100&consumer_key=${config.wooConsumerKey}&consumer_secret=${config.wooConsumerSecret}`
    );
    if (!wooResponse.ok) {
      throw new Error(`WooCommerce API error: ${wooResponse.status}`);
    }
    const wooProductsRaw = await wooResponse.json();
    const wooProducts = wooProductsRaw as unknown[] as Array<{ id: number; name: string; images?: Array<{ src: string }> }>;
    console.log(`[Repair] Found ${wooProducts.length} WooCommerce products`);

    const wooProductMap = new Map<number, typeof wooProducts[0]>();
    for (const p of wooProducts) {
      wooProductMap.set(p.id, p);
    }

    // Fetch migrated Medusa products
    const medusaResponse = await fetch(
      `${config.medusaBackendUrl}/admin/products?limit=200&offset=0&fields[]=id&fields[]=title&fields[]=metadata`,
      {
        headers: {
          Authorization: `Bearer ${config.medusaAdminKey || ""}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!medusaResponse.ok) {
      throw new Error(`Medusa API error: ${medusaResponse.status}`);
    }
    const medusaDataRaw = await medusaResponse.json();
    const medusaData = medusaDataRaw as { products: MedusaProductForRepair[] };
    const medusaProducts = medusaData.products || [];

    const migratedProducts = medusaProducts.filter(
      p => p.metadata?.wordpress_original_id
    );
    console.log(`[Repair] Found ${migratedProducts.length} migrated products`);

    const toRepair = migratedProducts.slice(0, batchSize);
    _repairState.progress.total = toRepair.length;

    for (const medusaProduct of toRepair) {
      if (_repairState?.aborted) {
        console.log("[Repair] Aborted");
        break;
      }

      const wooId = parseInt(String(medusaProduct.metadata?.wordpress_original_id), 10);
      const wooProduct = wooProductMap.get(wooId);

      _repairState.progress.currentWooId = wooId;
      _repairState.progress.currentProduct = medusaProduct.title || "Unknown";

      console.log(`[Repair] Processing: ${medusaProduct.title} (WooID: ${wooId})`);

      if (!wooProduct) {
        console.warn(`[Repair] No WooCommerce product for WooID: ${wooId}`);
        _repairState.progress.failed++;
        _repairState.results.push({ wooId, medusaId: medusaProduct.id, success: false, error: "WooCommerce product not found" });
        _repairState.progress.processed++;
        continue;
      }

      const images = wooProduct.images || [];
      if (images.length === 0) {
        console.log(`[Repair] No images for ${wooProduct.name}`);
        _repairState.progress.success++;
        _repairState.results.push({ wooId, medusaId: medusaProduct.id, success: true });
        _repairState.progress.processed++;
        continue;
      }

      try {
        let thumbnail: string | undefined;
        const galleryImages: Array<{ url: string }> = [];
        let downloaded = 0;
        let reused = 0;

        // Process thumbnail
        if (images[0]?.src) {
          const srcUrl = decodeHtmlEntities(images[0].src);
          const urlHash = hashUrl(srcUrl);

          const existing = serverPool.get(urlHash);
          if (existing?.status === "downloaded" && existing.relativePath) {
            thumbnail = existing.relativePath;
            reused++;
            console.log(`[Repair] Reuse thumbnail: ${thumbnail}`);
          } else {
            const result = await downloadImage(srcUrl, adminUiBaseUrl);
            if (result.status === "downloaded" && result.relativePath) {
              thumbnail = result.relativePath;
              downloaded++;
              serverPool.set(urlHash, { urlHash, sourceUrl: srcUrl, relativePath: result.relativePath, status: "downloaded", updatedAt: new Date().toISOString() });
              console.log(`[Repair] Download thumbnail: ${result.relativePath}`);
            } else {
              console.error(`[Repair] Thumbnail failed: ${result.error}`);
            }
          }
        }

        // Process gallery
        for (let i = 1; i < images.length; i++) {
          const img = images[i];
          if (!img?.src) continue;

          const srcUrl = decodeHtmlEntities(img.src);
          const urlHash = hashUrl(srcUrl);

          const existing = serverPool.get(urlHash);
          if (existing?.status === "downloaded" && existing.relativePath) {
            galleryImages.push({ url: existing.relativePath });
            reused++;
          } else {
            const result = await downloadImage(srcUrl, adminUiBaseUrl);
            if (result.status === "downloaded" && result.relativePath) {
              galleryImages.push({ url: result.relativePath });
              downloaded++;
              serverPool.set(urlHash, { urlHash, sourceUrl: srcUrl, relativePath: result.relativePath, status: "downloaded", updatedAt: new Date().toISOString() });
            }
          }
        }

        // Update Medusa
        if (thumbnail || galleryImages.length > 0) {
          const updatePayload: Record<string, unknown> = {};
          if (thumbnail) updatePayload.thumbnail = thumbnail;
          if (galleryImages.length > 0) updatePayload.images = galleryImages;

          const updateResult = await updateProduct(
            {
              backendUrl: config.medusaBackendUrl,
              adminApiKey: config.medusaAdminKey,
              adminEmail: config.medusaAdminEmail,
              adminPassword: config.medusaAdminPassword,
            },
            medusaProduct.id,
            updatePayload as Parameters<typeof updateProduct>[2]
          );

          if (updateResult.success) {
            console.log(`[Repair] Updated: ${medusaProduct.title} (downloaded=${downloaded} reused=${reused})`);
            _repairState.progress.success++;
            _repairState.results.push({ wooId, medusaId: medusaProduct.id, success: true });
          } else {
            console.error(`[Repair] Update failed: ${updateResult.error}`);
            _repairState.progress.failed++;
            _repairState.results.push({ wooId, medusaId: medusaProduct.id, success: false, error: updateResult.error });
          }
        } else {
          _repairState.progress.success++;
          _repairState.results.push({ wooId, medusaId: medusaProduct.id, success: true });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Repair] Error: ${msg}`);
        _repairState.progress.failed++;
        _repairState.results.push({ wooId, medusaId: medusaProduct.id, success: false, error: msg });
      }

      _repairState.progress.processed++;
    }

    console.log(`[Repair] Done! Success: ${_repairState.progress.success}, Failed: ${_repairState.progress.failed}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Repair] Fatal error:", msg);
  } finally {
    clearInterval(abortCheck);
    if (_repairState) {
      _repairState.running = false;
    }
  }
}
