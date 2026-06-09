/**
 * Media Upload API Route
 *
 * Chiến lược:
 * 1. Nhận blob + customFilename từ browser
 * 2. customFilename có format: {slug}__{wooId}__{index}__{hash}.{ext}
 *    Ví dụ: dell-inspiron-3593__10028__0__a8f31c.webp
 * 3. Lưu vào public/wp-content/uploads/{year}/{month}/{customFilename}
 * 4. Overwrite nếu file đã tồn tại (đảm bảo đúng file được update)
 * 5. Trả về relative path cho database
 *
 * Cấu hình mặc định (theo yêu cầu):
 * - uploadRootDir: public/wp-content/uploads
 * - uploadPublicPath: /wp-content/uploads
 * - folderPattern: {year}/{month}
 * - conflictStrategy: overwrite (mặc định)
 * - saveMode: relative_path
 */

import { NextRequest, NextResponse } from "next/server";
import * as fsSync from "fs";
import * as path from "path";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";

const ADMIN_UI_ROOT = process.cwd().replace(/\\/g, "/");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function ensureDir(dir: string): void {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sanitize a string to be safe for use in filenames.
 * Removes/replaces characters that are invalid in Windows and Unix filenames.
 */
function sanitizeForFileName(str: string): string {
  if (!str) return "image";
  return str
    .toLowerCase()
    // Remove characters invalid in filenames on both Windows and Unix
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    // Replace spaces and underscores with dashes
    .replace(/[\s_]+/g, "-")
    // Replace multiple dashes with single dash
    .replace(/-+/g, "-")
    // Remove parentheses and their content (e.g., "(1)", "(copy)")
    .replace(/\s*\(\d*\)\s*/g, "-")
    .replace(/\s*\(copy\)\s*/gi, "-")
    .replace(/\s*\(backup\)\s*/gi, "-")
    // Trim leading/trailing dashes
    .replace(/^-+|-+$/g, "")
    // Limit length
    .slice(0, 80);
}

/**
 * Extract extension from filename or MIME type.
 * Priority: filename extension > MIME type
 */
function getExtensionFromFileName(fileName: string, mimeType: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot > 0 && lastDot < fileName.length - 1) {
    const ext = fileName.slice(lastDot).toLowerCase();
    const validExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"];
    if (validExts.includes(ext)) return ext;
  }
  // Fallback: infer from MIME type
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
  };
  return MIME_TO_EXT[mimeType.toLowerCase()] || ".jpg";
}

/**
 * Extract year/month from source URL path (e.g. /wp-content/uploads/2026/05/image.jpg)
 */
function extractYearMonthFromUrl(sourceUrl: string): { year: string; month: string } | null {
  try {
    const urlParsed = new URL(sourceUrl);
    const pathParts = urlParsed.pathname.split("/").filter(Boolean);
    const uploadsIdx = pathParts.findIndex(p => p === "uploads");
    if (uploadsIdx !== -1 && pathParts.length >= uploadsIdx + 3) {
      const year = pathParts[uploadsIdx + 1] || "";
      const month = pathParts[uploadsIdx + 2] || "";
      if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month)) {
        return { year, month };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Build subdirectory path from pattern (e.g. "{year}/{month}" → "2026/05")
 */
function buildSubDir(folderPattern: string, sourceUrl?: string): string {
  let year: string;
  let month: string;
  const day = "01";

  if (sourceUrl) {
    const yearMonth = extractYearMonthFromUrl(sourceUrl);
    if (yearMonth) {
      year = yearMonth.year;
      month = yearMonth.month;
    } else {
      const now = new Date();
      year = now.getFullYear().toString();
      month = (now.getMonth() + 1).toString().padStart(2, "0");
    }
  } else {
    const now = new Date();
    year = now.getFullYear().toString();
    month = (now.getMonth() + 1).toString().padStart(2, "0");
  }

  return folderPattern
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, month)
    .replace(/\{day\}/g, day);
}

/**
 * Resolve physical root directory from uploadRootDir config.
 * Handles both relative (to admin-ui root) and absolute paths.
 */
function resolveRootDir(uploadRootDir: string): string {
  if (path.isAbsolute(uploadRootDir)) {
    return uploadRootDir;
  }

  const normalizedRoot = uploadRootDir.replace(/^\.\//, "").replace(/^\//, "");
  return `${ADMIN_UI_ROOT}/${normalizedRoot}`.replace(/\/+/g, "/");
}

/**
 * Extract extension from MIME type
 */
function mimeTypeToExt(mimeType: string): string {
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
  };
  return MIME_TO_EXT[mimeType.toLowerCase()] || ".jpg";
}

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  const startTime = Date.now();

  try {
    console.log("[MediaUpload] === Request received ===");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sourceUrl = (formData.get("sourceUrl") as string | null) || "";
    const jobId = (formData.get("jobId") as string | null) || "";

    // CRITICAL: customFilename is the ORIGINAL filename from WordPress URL (NOT renamed)
    // KHÔNG rename — giữ nguyên original filename để nhiều product có thể dùng chung ảnh
    const customFileName = (formData.get("customFileName") as string | null) || "";

    // Image upload config - with sensible defaults for migration
    const uploadRootDir = (formData.get("uploadRootDir") as string | null)
      || "public/wp-content/uploads";
    const uploadPublicPath = (formData.get("uploadPublicPath") as string | null)
      || "/wp-content/uploads";
    const imageFolderPattern = (formData.get("imageFolderPattern") as string | null)
      || "{year}/{month}";
    // Always use overwrite by default for migration
    const imageConflictStrategy = (formData.get("imageConflictStrategy") as string | null)
      || "overwrite";
    const imageSaveMode = (formData.get("imageSaveMode") as string | null)
      || "relative_path";

    // WooCommerce metadata for logging
    const wooProductId = (formData.get("wooProductId") as string | null) || "";
    const imageIndex = (formData.get("imageIndex") as string | null) || "";

    console.log("[MediaUpload] Metadata:", {
      customFileName,
      sourceUrl: sourceUrl ? sourceUrl.slice(0, 80) : "(none)",
      uploadRootDir,
      uploadPublicPath,
      imageFolderPattern,
      imageConflictStrategy,
      imageSaveMode,
      wooProductId,
      imageIndex,
    });

    if (!file) {
      return NextResponse.json({ error: "Missing file in FormData" }, { status: 400 });
    }

    // Read file data
    const fileBuffer = await file.arrayBuffer();
    const fileSize = fileBuffer.byteLength;
    let mimeType = (file.type || "image/jpeg").toLowerCase().split(";")[0].trim();

    console.log("[MediaUpload] File received:", {
      name: file.name,
      size: fileSize,
      type: mimeType,
    });

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      console.error("[MediaUpload] Invalid MIME type:", mimeType);
      return NextResponse.json({ error: `Unsupported MIME type: ${mimeType}` }, { status: 415 });
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB > 50MB` },
        { status: 413 }
      );
    }

    // === Build the final filename ===
    // Priority: customFileName (from migration service) > file.name from FormData > extracted from URL
    let finalFileName: string;
    let finalExtension: string;

    if (customFileName && customFileName.trim()) {
      // customFileName already includes extension
      finalFileName = customFileName.trim();
      finalExtension = getExtensionFromFileName(finalFileName, mimeType);
    } else {
      // Fallback: extract from blob name or URL
      let extractedName = file.name && file.name !== "blob" ? file.name : "";
      if (!extractedName || extractedName === "blob") {
        // Try to extract from sourceUrl
        if (sourceUrl) {
          try {
            const urlParsed = new URL(sourceUrl);
            const pathParts = urlParsed.pathname.split("/").filter(Boolean);
            extractedName = pathParts[pathParts.length - 1] || "image";
          } catch {
            extractedName = "image";
          }
        } else {
          extractedName = "image";
        }
      }
      finalExtension = getExtensionFromFileName(extractedName, mimeType);
      // Strip existing extension to avoid double extensions
      const baseName = extractedName.replace(/\.[^.]+$/, "");
      finalFileName = `${sanitizeForFileName(baseName)}_${Date.now()}${finalExtension}`;
    }

    // Ensure extension is correct based on MIME type
    const extFromMime = mimeTypeToExt(mimeType);
    if (!finalFileName.toLowerCase().endsWith(extFromMime)) {
      // Replace extension if MIME type doesn't match filename
      finalFileName = finalFileName.replace(/\.[^.]+$/, "") + extFromMime;
    }

    // Build subdirectory from URL metadata (year/month from WooCommerce path)
    const subDir = buildSubDir(imageFolderPattern, sourceUrl);

    // Resolve physical path
    const physicalRoot = resolveRootDir(uploadRootDir);
    const absoluteSubDir = path.join(physicalRoot, subDir);
    ensureDir(absoluteSubDir);

    const absoluteFilePath = path.join(absoluteSubDir, finalFileName);

    // Handle file existence
    const buffer = Buffer.from(fileBuffer);
    let action: "saved" | "overwritten" | "exists" = "saved";

    if (fsSync.existsSync(absoluteFilePath)) {
      if (imageConflictStrategy === "overwrite") {
        action = "overwritten";
      } else {
        action = "exists";
      }
    }

    // Always write the file (overwrite if exists)
    fsSync.writeFileSync(absoluteFilePath, buffer);

    const elapsed = Date.now() - startTime;
    console.log(`[MediaUpload] ${action.toUpperCase()}: ${absoluteFilePath} (${(fileSize / 1024).toFixed(1)}KB, ${elapsed}ms)`);

    // Build public relative path for database
    // Format: /wp-content/uploads/2026/05/dell-inspiron-3593__10028__0__a8f31c.webp
    // IMPORTANT: Always store as RELATIVE path (starting with /), never as full URL.
    // If uploadPublicPath is accidentally set to a full URL (e.g. http://localhost:3000/wp-content/uploads),
    // extract only the pathname part to avoid storing http://localhost:3000/... in the database.
    let publicRelativePath: string;
    const rawPublicPath = `${uploadPublicPath.replace(/\/$/, "")}/${subDir}/${finalFileName}`;
    if (rawPublicPath.startsWith("/")) {
      // Already relative — use as-is
      publicRelativePath = rawPublicPath;
    } else {
      // Full URL passed in config — extract pathname only
      try {
        publicRelativePath = new URL(rawPublicPath).pathname;
      } catch {
        publicRelativePath = rawPublicPath;
      }
    }

    console.log("[MediaUpload] Public path:", publicRelativePath);

    return NextResponse.json({
      success: true,
      fileName: finalFileName,
      relativePath: publicRelativePath,
      absolutePath: absoluteFilePath,
      url: publicRelativePath,
      size: fileSize,
      mimeType,
      jobId: jobId || null,
      imageSaveMode,
      action,
      wooProductId,
      imageIndex,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload error";
    console.error("[MediaUpload] ERROR:", msg, err instanceof Error ? err.stack : "");
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json({ error: "Download timeout (30s)" }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
