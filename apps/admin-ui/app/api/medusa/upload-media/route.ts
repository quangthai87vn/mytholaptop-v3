/**
 * Media Upload API Route
 *
 * Nhận file từ browser (FormData), download từ source URL,
 * lưu vào admin-ui public folder với cấu trúc WordPress: wp-content/uploads/{year}/{month}/{filename}
 * để giữ nguyên URL và SEO.
 */

import { NextRequest, NextResponse } from "next/server";
import * as fsSync from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate from apps/admin-ui/app/api/medusa/upload-media/ to apps/admin-ui/
const ADMIN_UI_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

// Thư mục gốc lưu media theo cấu trúc WordPress
const WP_UPLOADS_DIR = path.join(ADMIN_UI_ROOT, "public", "wp-content", "uploads");

// Log on startup for debugging
console.log("[MediaUpload] ADMIN_UI_ROOT:", ADMIN_UI_ROOT);
console.log("[MediaUpload] WP_UPLOADS_DIR:", WP_UPLOADS_DIR);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function ensureDir(dir: string): void {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
}

function sanitizeFileName(fileName: string): string {
  if (!fileName) return "image";
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "image";
}

function resolveSourceUrl(sourceUrl: string): string {
  if (!sourceUrl) return "";
  if (sourceUrl.startsWith("//")) return "https:" + sourceUrl;
  if (sourceUrl.startsWith("/")) return sourceUrl;
  return sourceUrl;
}

export async function POST(req: NextRequest) {
  try {
    console.log("[MediaUpload] Request received");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sourceUrl = formData.get("sourceUrl") as string | null;
    const jobId = formData.get("jobId") as string | null;

    console.log("[MediaUpload] sourceUrl:", sourceUrl);
    console.log("[MediaUpload] file:", file ? `${file.name} (${file.size} bytes)` : "null");

    if (!file && !sourceUrl) {
      return NextResponse.json({ error: "Missing file or sourceUrl" }, { status: 400 });
    }

    let fileBuffer: ArrayBuffer | null = null;
    let fileName = "image";
    let mimeType = "image/jpeg";
    let year = new Date().getFullYear().toString();
    let month = (new Date().getMonth() + 1).toString().padStart(2, "0");

    if (file) {
      fileBuffer = await file.arrayBuffer();
      fileName = sanitizeFileName(file.name || "image");
      mimeType = file.type || "image/jpeg";
    } else if (sourceUrl) {
      const resolvedUrl = resolveSourceUrl(sourceUrl);
      if (!resolvedUrl) {
        return NextResponse.json({ error: "Invalid sourceUrl" }, { status: 400 });
      }

      const fetchRes = await fetch(resolvedUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MediaMigrationBot/1.0)" },
        signal: AbortSignal.timeout(30000),
      });

      if (!fetchRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image: HTTP ${fetchRes.status}`, url: resolvedUrl },
          { status: fetchRes.status }
        );
      }

      mimeType = (fetchRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim().toLowerCase();
      fileBuffer = await fetchRes.arrayBuffer();

      // Extract year/month from WordPress URL path: /wp-content/uploads/2026/04/image.jpg
      try {
        const urlParsed = new URL(resolvedUrl);
        const pathParts = urlParsed.pathname.split("/").filter(Boolean);
        const urlFileName = pathParts[pathParts.length - 1] || "image";
        fileName = sanitizeFileName(decodeURIComponent(urlFileName));

        // Find uploads index and extract year/month
        const uploadsIdx = pathParts.findIndex(p => p === "uploads");
        if (uploadsIdx !== -1 && pathParts.length >= uploadsIdx + 3) {
          year = pathParts[uploadsIdx + 1] || year;
          month = pathParts[uploadsIdx + 2] || month;
        }
      } catch {
        fileName = "image";
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "No file data available" }, { status: 500 });
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: `Unsupported MIME type: ${mimeType}` }, { status: 415 });
    }

    if (fileBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB > 20MB` },
        { status: 413 }
      );
    }

    // Lưu theo cấu trúc WordPress: wp-content/uploads/{year}/{month}/{filename}
    // URL sẽ là: /wp-content/uploads/{year}/{month}/{filename}
    // Nếu file đã tồn tại → GHI ĐÈ (đảm bảo không trùng lặp)
    const wpRelativePath = `/wp-content/uploads/${year}/${month}/${fileName}`;
    const absolutePath = path.join(WP_UPLOADS_DIR, year, month, fileName);

    ensureDir(path.dirname(absolutePath));

    const buffer = Buffer.from(fileBuffer);
    fsSync.writeFileSync(absolutePath, buffer);

    console.log("[MediaUpload] File saved:", absolutePath);
    console.log("[MediaUpload] URL:", wpRelativePath);
    console.log("[MediaUpload] Overwritten:", fsSync.existsSync(absolutePath));

    return NextResponse.json({
      success: true,
      fileName: path.basename(absolutePath),
      relativePath: wpRelativePath,
      absolutePath: absolutePath,
      url: wpRelativePath,
      size: buffer.length,
      mimeType,
      jobId: jobId || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload error";
    console.error("[MediaUpload] Error:", msg);
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json({ error: "Download timeout (30s)" }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
