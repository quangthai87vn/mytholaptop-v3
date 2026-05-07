/**
 * Image Migration Service v2
 *
 * Thiết kế lại hoàn toàn từ đầu, giải quyết các bug nghiêm trọng:
 * - Chỉ tải 1 ảnh: do reuse state sai scope → fix bằng product-scoped processing
 * - Update sai thumbnail: do race condition giữa 2 luồng → fix bằng 1 luồng duy nhất
 * - Mapping sai giữa các product: do không có deduplication → fix bằng source_url key
 * - Logic download rối: do 2 bản sao song song → fix bằng 1 service duy nhất
 *
 * Luồng chuẩn:
 * for each wooProduct:
 *   images = wooProduct.images
 *   for each image:
 *     normalize URL → check pool → download/reuse → save path
 *   update thumbnail (image[0])
 *   attach gallery (image[1..n])
 *   + description images: extract → download → rewrite HTML → update
 *   update Medusa với đúng product.id
 *
 * Nguyên tắc:
 * - Product-scoped: mỗi product xử lý trong scope riêng, không reuse state ngoài
 * - Deduplicate theo source_url: nếu URL đã tồn tại trong pool → reuse
 * - 1 update Medusa per product: update đúng product.id
 * - KHÔNG rename file: dùng original filename từ URL
 * - Cấu trúc: /wp-content/uploads/YYYY/MM/filename.ext
 * - Description images: extract → download → rewrite HTML → update Medusa
 */

import type { WooProduct, WooCategory, MedusaProduct } from "@/types";
import { mediaStorage } from "@/types/media-mapping";
import { rewriteHtmlImages, extractImageUrlsFromHtml } from "@/lib/media-helpers";
import type {
  MediaMappingEntry,
  MediaMigrationOptions,
  ImageUploadConfig,
} from "@/types/media-mapping";
import { DEFAULT_IMAGE_UPLOAD_CONFIG } from "@/types/media-mapping";

// ============================================================
// TYPES
// ============================================================

export interface ImageMigrationContext {
  wordpressBaseUrl: string;
  medusaBackendUrl: string;
  adminUiBaseUrl: string;
  jobId: string;
  onLog?: (message: string, type: "info" | "warn" | "error" | "success", detail?: Record<string, unknown>) => void;
  /** Cấu hình upload ảnh — từ popup settings */
  imageConfig?: ImageUploadConfig;
}

export interface ImageResult {
  urlHash: string;
  sourceUrl: string;
  relativePath?: string;
  status: "downloaded" | "reused" | "failed";
  error?: string;
}

export interface ProductImageResult {
  wooId: number;
  medusaId: string;
  thumbnail?: string;
  images: Array<{ url: string }>;
  downloads: ImageResult[];
  /** Số ảnh tải thành công */
  downloaded: number;
  /** Số ảnh reuse (đã có trong pool) */
  reused: number;
  /** Số ảnh thất bại */
  failed: number;
  /** HTML description đã được rewrite với relative paths */
  rewrittenDescription?: string;
  /** HTML short_description đã được rewrite với relative paths */
  rewrittenShortDescription?: string;
}

export interface ImageMigrationStats {
  totalProducts: number;
  processedProducts: number;
  totalImages: number;
  downloaded: number;
  reused: number;
  failed: number;
  updatedProducts: number;
  failedProducts: number;
}

// ============================================================
// LOGGING UTILITY
// ============================================================

function log(
  ctx: ImageMigrationContext,
  message: string,
  type: "info" | "warn" | "error" | "success",
  detail?: Record<string, unknown>
) {
  if (ctx.onLog) {
    ctx.onLog(message, type, detail);
  }
}

// ============================================================
// URL NORMALIZATION
// ============================================================

/**
 * Decode HTML entities từ WooCommerce URL.
 * WooCommerce thường encode & thành &amp;
 */
function decodeHtmlEntities(url: string): string {
  return url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Normalize URL về dạng canonical để so sánh.
 * Dùng làm key cho deduplication.
 */
function normalizeUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    if (path.endsWith("/") && path.length > 1) {
      path = path.slice(0, -1);
    }
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
  } catch {
    const stripped = url.split("?")[0].split("#")[0];
    return stripped.toLowerCase();
  }
}

/**
 * Tạo hash SHA-256 (hex 64 ký tự) từ URL cho deduplication key.
 * Dùng SHA-256 thay vì base64 để tránh hash collision.
 */
async function hashUrlAsync(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hash URL for pool key.
 */
export function hashUrl(url: string): string {
  const normalized = normalizeUrl(url);
  // Use djb2 hash - fast and low collision
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16);
  // Pad to ensure minimum length
  return hex.padStart(8, "0").repeat(4).slice(0, 32);
}

/**
 * Lấy original filename từ URL (KHÔNG rename).
 */
function getOriginalFileName(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const parts = parsed.pathname.split("/");
    const fileName = parts[parts.length - 1] || "image";
    return decodeURIComponent(fileName);
  } catch {
    const parts = sourceUrl.split("/");
    const fileName = parts[parts.length - 1]?.split("?")[0] || "image";
    return decodeURIComponent(fileName);
  }
}

/**
 * Trích xuất year/month từ WordPress URL path.
 * Ví dụ: /wp-content/uploads/2026/05/image.webp → { year: "2026", month: "05" }
 */
function extractYearMonth(sourceUrl: string): { year: string; month: string } {
  const now = new Date();
  const defaultYear = now.getFullYear().toString();
  const defaultMonth = (now.getMonth() + 1).toString().padStart(2, "0");

  try {
    const parsed = new URL(sourceUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadsIdx = parts.findIndex(p => p === "uploads");
    if (uploadsIdx !== -1 && parts.length >= uploadsIdx + 3) {
      const year = parts[uploadsIdx + 1];
      const month = parts[uploadsIdx + 2];
      if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month)) {
        return { year, month };
      }
    }
  } catch { /* ignore */ }

  return { year: defaultYear, month: defaultMonth };
}

// ============================================================
// IMAGE DOWNLOAD
// ============================================================

/**
 * Tải 1 ảnh từ source URL và upload lên admin-ui server.
 * KHÔNG rename file — dùng original filename từ URL.
 */
async function downloadImage(
  sourceUrl: string,
  ctx: ImageMigrationContext,
  opts: MediaMigrationOptions,
  wooId: number,
  imageIndex: string,
  imageType: string
): Promise<ImageResult> {
  const maxRetries = opts.maxRetries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const maxFileSizeBytes = opts.maxFileSizeBytes ?? 10 * 1024 * 1024;
  const decodedUrl = decodeHtmlEntities(sourceUrl);
  const urlHash = hashUrl(decodedUrl);

  log(ctx, `[DOWNLOAD_START] wooId=${wooId} idx=${imageIndex} type=${imageType} URL=${decodedUrl}`, "info", { urlHash });

  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      // Fetch qua proxy để tránh CORS
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(decodedUrl)}`;
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        log(ctx, `[DOWNLOAD_RETRY] ${decodedUrl} - ${lastError} (attempt ${attempt}/${maxRetries})`, "warn", { urlHash });
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }
        continue;
      }

      const contentType = response.headers.get("content-type") || "";
      const mimeType = contentType.split(";")[0].trim().toLowerCase();
      const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/bmp"];
      if (!validMimes.includes(mimeType)) {
        lastError = `Invalid MIME type: ${mimeType}`;
        log(ctx, `[DOWNLOAD_SKIP] Invalid MIME: ${mimeType}`, "warn", { urlHash });
        continue;
      }

      const blob = await response.blob();
      if (blob.size === 0 || blob.size > maxFileSizeBytes) {
        lastError = `Invalid file size: ${blob.size} bytes`;
        log(ctx, `[DOWNLOAD_SKIP] File size invalid: ${(blob.size / 1024).toFixed(1)}KB`, "warn", { urlHash });
        continue;
      }

      const originalFileName = getOriginalFileName(decodedUrl);
      const { year, month } = extractYearMonth(decodedUrl);

      log(ctx, `[DOWNLOAD_FETCH] OK ${(blob.size / 1024).toFixed(1)}KB → ${originalFileName}`, "info", { urlHash });

      // Lấy config từ context (popup settings), fallback về default
      const imgConfig = ctx.imageConfig || DEFAULT_IMAGE_UPLOAD_CONFIG;

      // Xây dựng folder path từ pattern
      const folderPattern = imgConfig.imageFolderPattern || "{year}/{month}";
      const folderPath = folderPattern
        .replace(/\{year\}/g, year)
        .replace(/\{month\}/g, month)
        .replace(/\{day\}/g, "01");

      // Xây dựng final filename dựa trên imageFileNameMode
      let finalFileName: string;
      if (imgConfig.imageFileNameMode === "keep-original-name") {
        finalFileName = originalFileName;
      } else if (imgConfig.imageFileNameMode === "source-hash") {
        const hash = hashUrl(decodedUrl);
        const ext = originalFileName.includes(".") ? "." + originalFileName.split(".").pop() : ".jpg";
        finalFileName = `${hash}${ext}`;
      } else {
        finalFileName = originalFileName;
      }

      // Upload
      const formData = new FormData();
      formData.append("file", blob, finalFileName);
      formData.append("sourceUrl", decodedUrl);
      formData.append("jobId", `${ctx.jobId}_${wooId}_${imageIndex}`);
      formData.append("customFileName", finalFileName);
      formData.append("uploadRootDir", imgConfig.uploadRootDir || "public/wp-content/uploads");
      formData.append("uploadPublicPath", imgConfig.uploadPublicPath || "/wp-content/uploads");
      formData.append("imageFolderPattern", folderPath);
      formData.append("imageConflictStrategy", imgConfig.imageConflictStrategy || "overwrite");
      formData.append("imageSaveMode", imgConfig.imageSaveMode || "relative_path");

      const uploadResponse = await fetch("/api/medusa/upload-media", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        lastError = `Upload failed: HTTP ${uploadResponse.status} - ${errorText.slice(0, 200)}`;
        log(ctx, `[DOWNLOAD_RETRY] Upload failed: ${lastError}`, "warn", { urlHash });
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }
        continue;
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success && uploadResult.relativePath === undefined) {
        lastError = uploadResult.error || "Upload returned no path";
        log(ctx, `[DOWNLOAD_RETRY] Upload error: ${lastError}`, "warn", { urlHash });
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
        }
        continue;
      }

      const relativePath = uploadResult.relativePath || "";

      log(ctx, `[DOWNLOAD_SUCCESS] ${originalFileName} → ${relativePath} [${uploadResult.action || "uploaded"}]`, "success", {
        urlHash,
        relativePath,
        originalFileName,
        wooId,
        imageIndex,
        imageType,
      });

      return { urlHash, sourceUrl: decodedUrl, relativePath, status: "downloaded" };

    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      if (err instanceof Error && err.name === "AbortError") {
        lastError = "Timeout";
      }
      log(ctx, `[DOWNLOAD_RETRY] Error: ${lastError} (attempt ${attempt}/${maxRetries})`, "warn", { urlHash });
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  log(ctx, `[DOWNLOAD_FAILED] ${decodedUrl} - ${lastError}`, "error", { urlHash });
  return { urlHash, sourceUrl: decodedUrl, status: "failed", error: lastError };
}

/**
 * Kiểm tra file có tồn tại trên server không.
 */
async function checkFileExists(relativePath: string, adminUiBaseUrl: string): Promise<boolean> {
  try {
    const fileUrl = `${adminUiBaseUrl}${relativePath}`;
    const response = await fetch(fileUrl, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================
// POOL OPERATIONS
// ============================================================

/**
 * Get hoặc tạo entry trong deduplication pool.
 * Key = normalized source URL hash.
 */
function getPoolEntry(
  pool: Record<string, MediaMappingEntry>,
  sourceUrl: string
): { entry: MediaMappingEntry; isNew: boolean } {
  const urlHash = hashUrl(sourceUrl);
  const existing = pool[urlHash];

  if (existing) {
    return { entry: existing, isNew: false };
  }

  const newEntry: MediaMappingEntry = {
    urlHash,
    sourceUrl,
    mimeType: "image/jpeg",
    fileSize: 0,
    fileName: getOriginalFileName(sourceUrl),
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retryCount: 0,
  };

  pool[urlHash] = newEntry;
  return { entry: newEntry, isNew: true };
}

// ============================================================
// PRODUCT IMAGE PROCESSING
// ============================================================

/**
 * Xử lý tất cả ảnh cho 1 product.
 * ĐÂY LÀ HÀM CHÍNH — product-scoped, không reuse state ngoài.
 *
 * Flow:
 * 1. Collect all image URLs (thumbnail + gallery) từ wooProduct
 * 2. For each URL: check pool → download if needed → reuse if exists
 * 3. Build thumbnail + gallery arrays
 * 4. Return kết quả
 *
 * KHÔNG update Medusa ở đây — chỉ trả về paths.
 */
async function processProductImages(
  wooProduct: WooProduct,
  existingPool: Record<string, MediaMappingEntry>,
  ctx: ImageMigrationContext,
  opts: MediaMigrationOptions
): Promise<{
  thumbnail?: string;
  images: Array<{ url: string }>;
  downloads: ImageResult[];
  manifest: { total: number; downloaded: number; reused: number; failed: number };
  rewrittenDescription?: string;
  rewrittenShortDescription?: string;
}> {
  const wooId = wooProduct.id;
  const productName = wooProduct.name || `Product #${wooId}`;
  const downloads: ImageResult[] = [];
  const urlHashToPath: Record<string, string> = {};

  // Collect image URLs
  const thumbnailUrl = opts.downloadThumbnails ? (wooProduct.images?.[0]?.src || "") : "";
  const galleryUrls = opts.downloadGallery
    ? (wooProduct.images?.slice(1).map(img => img.src) || [])
    : [];

  const allUrls: Array<{ url: string; type: "thumbnail" | "gallery"; index: number }> = [];

  if (thumbnailUrl) {
    allUrls.push({ url: thumbnailUrl, type: "thumbnail", index: 0 });
  }
  galleryUrls.forEach((url, i) => {
    if (url) allUrls.push({ url, type: "gallery", index: i + 1 });
  });

  log(ctx, `[PRODUCT_START] wooId=${wooId} "${productName}" totalImages=${allUrls.length}`, "info", { wooId });
  console.log(`[ImageMigV2] PRODUCT_START wooId=${wooId} name="${productName}" images=${JSON.stringify(allUrls.map(i => ({ type: i.type, url: i.url.slice(0, 80) })))}`);

  // Domain filter
  let filteredUrls = allUrls;
  if (opts.onlyFromWordpressDomain && ctx.wordpressBaseUrl) {
    const wpOrigin = ctx.wordpressBaseUrl.replace(/\/$/, "");
    filteredUrls = allUrls.filter(item => {
      try {
        const itemUrl = new URL(item.url);
        return itemUrl.origin === wpOrigin;
      } catch {
        return false;
      }
    });
    const skipped = allUrls.length - filteredUrls.length;
    if (skipped > 0) {
      log(ctx, `[PRODUCT_FILTER] Skipped ${skipped} external URLs for wooId=${wooId}`, "info", { wooId });
    }

    log(ctx, `[IMAGE_CANDIDATES_FOUND] wooId=${wooId} thumbnailCandidates=1 galleryCandidates=${galleryUrls.length} filteredTotal=${filteredUrls.length}`, "info", { wooId });
  }

  // Process each image
  for (const item of filteredUrls) {
    const { url, type, index } = item;
    const decodedUrl = decodeHtmlEntities(url);
    const urlHash = hashUrl(decodedUrl);
    const imageType = type === "thumbnail" ? "product_thumbnail" : "product_gallery";
    const imageIndex = type === "thumbnail" ? "0" : String(index);

    // Check pool
    const { entry: poolEntry, isNew } = getPoolEntry(existingPool, decodedUrl);

    // Reuse nếu đã downloaded và file còn tồn tại
    if (poolEntry.status === "downloaded" && poolEntry.relativePath) {
      const exists = await checkFileExists(poolEntry.relativePath, ctx.adminUiBaseUrl);
      if (exists) {
        log(ctx, `[IMAGE_REUSE] ${poolEntry.relativePath} (already downloaded)`, "info", { urlHash });
        urlHashToPath[urlHash] = poolEntry.relativePath;
        downloads.push({
          urlHash,
          sourceUrl: decodedUrl,
          relativePath: poolEntry.relativePath,
          status: "reused",
        });
        continue;
      } else {
        // File không còn → reset để download lại
        log(ctx, `[IMAGE_REDOWNLOAD] File not found on disk: ${poolEntry.relativePath}`, "warn", { urlHash });
        poolEntry.status = "pending";
        poolEntry.relativePath = undefined;
      }
    }

    // Skip failed nếu không muốn retry
    if (poolEntry.status === "failed" && !opts.reuseExistingMedia) {
      log(ctx, `[IMAGE_SKIP] Previously failed: ${decodedUrl}`, "warn", { urlHash });
      downloads.push({
        urlHash,
        sourceUrl: decodedUrl,
        status: "failed",
        error: poolEntry.errorMessage || "Previously failed",
      });
      continue;
    }

    // Download
    const result = await downloadImage(
      decodedUrl,
      ctx,
      opts,
      wooId,
      imageIndex,
      imageType
    );

    downloads.push(result);

    if (result.status === "downloaded" && result.relativePath) {
      // Update pool entry
      existingPool[urlHash] = {
        ...poolEntry,
        relativePath: result.relativePath,
        status: "downloaded",
        fileName: getOriginalFileName(decodedUrl),
        updatedAt: new Date().toISOString(),
      };
      urlHashToPath[urlHash] = result.relativePath;
    } else if (result.status === "failed") {
      existingPool[urlHash] = {
        ...poolEntry,
        status: "failed",
        errorMessage: result.error,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // ============================================================
  // DESCRIPTION IMAGES PROCESSING
  // ============================================================
  let rewrittenDescription: string | undefined;
  let rewrittenShortDescription: string | undefined;

  if (opts.downloadDescriptionImages || opts.downloadShortDescImages || opts.rewriteHtmlDescriptions) {
    const description = wooProduct.description || "";
    const shortDescription = wooProduct.short_description || "";

    // Collect all description image URLs
    const descriptionUrls = description ? extractImageUrlsFromHtml(description) : [];
    const shortDescUrls = shortDescription ? extractImageUrlsFromHtml(shortDescription) : [];

    const allDescUrls = [
      ...descriptionUrls.map((url) => ({ url, field: "description" as const })),
      ...shortDescUrls.map((url) => ({ url, field: "short_description" as const })),
    ];

    // Deduplicate by normalized URL
    const seenUrls = new Set<string>();
    const uniqueDescUrls = allDescUrls.filter((item) => {
      const normalized = normalizeUrl(decodeHtmlEntities(item.url));
      if (seenUrls.has(normalized)) return false;
      seenUrls.add(normalized);
      return true;
    });

    if (uniqueDescUrls.length > 0) {
      log(ctx, `[DESC_IMAGES] wooId=${wooId} found ${uniqueDescUrls.length} description images`, "info", { wooId });
    }

    // Process each unique description image
    for (const item of uniqueDescUrls) {
      const decodedUrl = decodeHtmlEntities(item.url);
      const urlHash = hashUrl(decodedUrl);

      // Skip if already processed (check pool first)
      const { entry: poolEntry } = getPoolEntry(existingPool, decodedUrl);

      // Reuse nếu đã downloaded và file còn tồn tại
      if (poolEntry.status === "downloaded" && poolEntry.relativePath) {
        const exists = await checkFileExists(poolEntry.relativePath, ctx.adminUiBaseUrl);
        if (exists) {
          log(ctx, `[DESC_REUSE] ${poolEntry.relativePath}`, "info", { urlHash });
          urlHashToPath[urlHash] = poolEntry.relativePath;
          downloads.push({
            urlHash,
            sourceUrl: decodedUrl,
            relativePath: poolEntry.relativePath,
            status: "reused",
          });
          continue;
        } else {
          poolEntry.status = "pending";
          poolEntry.relativePath = undefined;
        }
      }

      // Download description image
      const result = await downloadImage(
        decodedUrl,
        ctx,
        opts,
        wooId,
        "desc",
        "product_description"
      );

      downloads.push(result);

      if (result.status === "downloaded" && result.relativePath) {
        existingPool[urlHash] = {
          ...poolEntry,
          relativePath: result.relativePath,
          status: "downloaded",
          fileName: getOriginalFileName(decodedUrl),
          updatedAt: new Date().toISOString(),
        };
        urlHashToPath[urlHash] = result.relativePath;
      } else if (result.status === "failed") {
        existingPool[urlHash] = {
          ...poolEntry,
          status: "failed",
          errorMessage: result.error,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // Rewrite HTML descriptions if enabled
    if (opts.rewriteHtmlDescriptions) {
      // Build URL → relative path mapping for rewrite
      const urlToRelativePath: Record<string, string> = {};
      for (const item of uniqueDescUrls) {
        const decodedUrl = decodeHtmlEntities(item.url);
        const normalized = normalizeUrl(decodedUrl);
        const h = hashUrl(decodedUrl);
        const relativePath = urlHashToPath[h];
        if (relativePath) {
          urlToRelativePath[normalized] = relativePath;
        }
      }

      // Rewrite description
      if (description && Object.keys(urlToRelativePath).length > 0) {
        const result = rewriteHtmlImages(description, urlToRelativePath, ctx.adminUiBaseUrl);
        rewrittenDescription = result.rewrittenHtml;
        if (result.replacedCount > 0) {
          log(ctx, `[DESC_REWRITE] wooId=${wooId} description: replaced ${result.replacedCount}/${uniqueDescUrls.length} URLs`, "success", { wooId });
        }
      } else {
        rewrittenDescription = description;
      }

      // Rewrite short_description
      if (shortDescription && Object.keys(urlToRelativePath).length > 0) {
        const result = rewriteHtmlImages(shortDescription, urlToRelativePath, ctx.adminUiBaseUrl);
        rewrittenShortDescription = result.rewrittenHtml;
        if (result.replacedCount > 0) {
          log(ctx, `[DESC_REWRITE] wooId=${wooId} short_description: replaced ${result.replacedCount} URLs`, "success", { wooId });
        }
      } else {
        rewrittenShortDescription = shortDescription;
      }
    }
  }

  // Build result arrays
  const thumbnailHash = thumbnailUrl ? hashUrl(decodeHtmlEntities(thumbnailUrl)) : "";
  const thumbnail = thumbnailHash ? urlHashToPath[thumbnailHash] : undefined;

  const galleryImages = galleryUrls
    .map((url, i) => {
      if (!url) return undefined;
      const h = hashUrl(decodeHtmlEntities(url));
      const path = urlHashToPath[h];
      return path ? { url: path } : undefined;
    })
    .filter((img): img is { url: string } => img !== undefined);

  const manifest = {
    total: downloads.length,
    downloaded: downloads.filter(d => d.status === "downloaded").length,
    reused: downloads.filter(d => d.status === "reused").length,
    failed: downloads.filter(d => d.status === "failed").length,
  };

  log(ctx, `[PRODUCT_DONE] wooId=${wooId} "${productName}" downloaded=${manifest.downloaded} reused=${manifest.reused} failed=${manifest.failed}`, "info", { wooId });
  console.log(`[ImageMigV2] PRODUCT_DONE wooId=${wooId} thumbnail=${thumbnail || "none"} gallery=${galleryImages.length} galleryUrls=${galleryUrls.length}`, JSON.stringify(galleryUrls.slice(0, 3).map(u => u?.slice(0, 80))));

  return { thumbnail, images: galleryImages, downloads, manifest, rewrittenDescription, rewrittenShortDescription };
}

// ============================================================
// CATEGORY IMAGE PROCESSING
// ============================================================

/**
 * Xử lý ảnh cho 1 category.
 */
async function processCategoryImage(
  wooCategory: WooCategory,
  existingPool: Record<string, MediaMappingEntry>,
  ctx: ImageMigrationContext,
  opts: MediaMigrationOptions
): Promise<{
  metadata?: Record<string, string>;
  download?: ImageResult;
}> {
  const wooId = wooCategory.id;
  const imageUrl = wooCategory.image?.src || "";

  if (!imageUrl || !opts.downloadCategoryImages) {
    return {};
  }

  const decodedUrl = decodeHtmlEntities(imageUrl);
  const urlHash = hashUrl(decodedUrl);

  log(ctx, `[CATEGORY_START] wooCategoryId=${wooId} "${wooCategory.name}"`, "info", { wooId });

  const { entry: poolEntry, isNew } = getPoolEntry(existingPool, decodedUrl);

  // Reuse
  if (poolEntry.status === "downloaded" && poolEntry.relativePath) {
    const exists = await checkFileExists(poolEntry.relativePath, ctx.adminUiBaseUrl);
    if (exists) {
      log(ctx, `[CATEGORY_REUSE] ${poolEntry.relativePath}`, "info", { urlHash });
      return {
        metadata: {
          wordpress_migrated_category_image: poolEntry.relativePath,
          wordpress_original_category_image: decodedUrl,
        },
        download: { urlHash, sourceUrl: decodedUrl, relativePath: poolEntry.relativePath, status: "reused" },
      };
    }
    poolEntry.status = "pending";
    poolEntry.relativePath = undefined;
  }

  // Download
  const result = await downloadImage(
    decodedUrl,
    ctx,
    opts,
    wooId,
    "0",
    "category_image"
  );

  if (result.status === "downloaded" && result.relativePath) {
    existingPool[urlHash] = {
      ...poolEntry,
      relativePath: result.relativePath,
      status: "downloaded",
      fileName: getOriginalFileName(decodedUrl),
      updatedAt: new Date().toISOString(),
    };
    return {
      metadata: {
        wordpress_migrated_category_image: result.relativePath,
        wordpress_original_category_image: decodedUrl,
      },
      download: result,
    };
  }

  return { download: result };
}

// ============================================================
// MAIN SERVICE
// ============================================================

export const imageMigrationServiceV2 = {
  /**
   * Xử lý image migration cho tất cả products.
   * Gọi callback updateCallback cho mỗi product sau khi xử lý ảnh xong.
   *
   * Luồng:
   * for each wooProduct:
   *   1. processProductImages (download/reuse, product-scoped)
   *   2. updateCallback(medusaId, { thumbnail, images }) → update Medusa
   *   3. savePool
   *
   * KHÔNG batch update — mỗi product update riêng, đúng medusaId.
   */
  async migrateProducts(
    wooProducts: WooProduct[],
    existingProductIds: Record<number, string>,
    existingPool: Record<string, MediaMappingEntry>,
    ctx: ImageMigrationContext,
    opts: MediaMigrationOptions,
    updateCallback: (
      medusaProductId: string,
      wooId: number,
      updates: {
        thumbnail?: string;
        images: Array<{ url: string }>;
        description?: string;
        shortDescription?: string;
      }
    ) => Promise<{ success: boolean; error?: string }>
  ): Promise<ImageMigrationStats> {
    const stats: ImageMigrationStats = {
      totalProducts: wooProducts.length,
      processedProducts: 0,
      totalImages: 0,
      downloaded: 0,
      reused: 0,
      failed: 0,
      updatedProducts: 0,
      failedProducts: 0,
    };

    console.log(`[ImageMigV2] migrateProducts START totalProducts=${wooProducts.length} existingProductIds=${Object.keys(existingProductIds).length}`);
    console.log(`[ImageMigV2] migrateProducts first 3 wooIds:`, Object.keys(existingProductIds).slice(0, 3));

    for (const wooProduct of wooProducts) {
      const wooId = wooProduct.id;
      const medusaId = existingProductIds[wooId];

      if (!medusaId) {
        log(ctx, `[PRODUCT_SKIP] No Medusa ID for wooId=${wooId}`, "warn", { wooId });
        continue;
      }

      try {
        // Process images — PRODUCT SCOPED, không reuse thumbnailPath ngoài scope
        const result = await processProductImages(wooProduct, existingPool, ctx, opts);

        if (!result) {
          log(ctx, `[PRODUCT_ERROR] processProductImages returned null for wooId=${wooId}`, "error", { wooId });
          stats.failedProducts++;
          continue;
        }

        stats.totalImages += result.manifest.total;
        stats.downloaded += result.manifest.downloaded;
        stats.reused += result.manifest.reused;
        stats.failed += result.manifest.failed;

        // Update Medusa với đúng product
        // Chỉ gọi update nếu có thumbnail HOẶC gallery HOẶC rewritten descriptions
        const hasContent = result.thumbnail || result.images.length > 0 || result.rewrittenDescription || result.rewrittenShortDescription;
        if (hasContent) {
          const updateResult = await updateCallback(medusaId, wooId, {
            thumbnail: result.thumbnail,
            images: result.images || [],
            description: result.rewrittenDescription,
            shortDescription: result.rewrittenShortDescription,
          });

          if (updateResult.success) {
            stats.updatedProducts++;
            log(ctx, `[MEDUSA_UPDATE_OK] medusaId=${medusaId} wooId=${wooId} thumbnail=${result.thumbnail || "none"} gallery=${result.images.length}${result.rewrittenDescription ? " +description" : ""}${result.rewrittenShortDescription ? " +shortDesc" : ""}`, "success", { medusaId, wooId });
          } else {
            stats.failedProducts++;
            log(ctx, `[MEDUSA_UPDATE_FAIL] medusaId=${medusaId} - ${updateResult.error}`, "error", { medusaId, wooId });
          }
        } else {
          // Không có ảnh nào → không cần update
          stats.updatedProducts++;
          log(ctx, `[PRODUCT_NO_IMAGES] wooId=${wooId}`, "info", { wooId });
        }

        stats.processedProducts++;

        // Save pool sau mỗi product để resume được
        mediaStorage.savePool(existingPool);

      } catch (err) {
        stats.failedProducts++;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        log(ctx, `[PRODUCT_ERROR] wooId=${wooId} - ${errMsg}`, "error", { wooId });
      }
    }

    return stats;
  },

  /**
   * Xử lý image migration cho tất cả categories.
   */
  async migrateCategories(
    wooCategories: WooCategory[],
    existingCategoryIds: Record<number, string>,
    existingPool: Record<string, MediaMappingEntry>,
    ctx: ImageMigrationContext,
    opts: MediaMigrationOptions,
    updateCallback: (
      medusaCategoryId: string,
      wooId: number,
      metadata: Record<string, string>
    ) => Promise<{ success: boolean; error?: string }>
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const wooCategory of wooCategories) {
      const wooId = wooCategory.id;
      const medusaId = existingCategoryIds[wooId];

      if (!medusaId || !wooCategory.image?.src) continue;

      try {
        const result = await processCategoryImage(wooCategory, existingPool, ctx, opts);

        if (result.metadata) {
          const updateResult = await updateCallback(medusaId, wooId, result.metadata);
          if (updateResult.success) {
            updated++;
          } else {
            failed++;
          }
        }
      } catch {
        failed++;
      }
    }

    mediaStorage.savePool(existingPool);
    return { updated, failed };
  },

  // ============================================================
  // REPAIR TOOL
  // ============================================================

  /**
   * Sửa ảnh bị sai cho các products đã migrate.
   * Chỉ sửa: thumbnail, images.url, gallery.
   * KHÔNG tạo lại product.
   */
  async repairProductImages(
    wooProducts: WooProduct[],
    existingProductIds: Record<number, string>,
    existingPool: Record<string, MediaMappingEntry>,
    ctx: ImageMigrationContext,
    opts: MediaMigrationOptions,
    updateCallback: (
      medusaProductId: string,
      wooId: number,
      updates: {
        thumbnail?: string;
        images: Array<{ url: string }>;
        description?: string;
        shortDescription?: string;
      }
    ) => Promise<{ success: boolean; error?: string }>
  ): Promise<{
    repaired: number;
    failed: number;
    details: Array<{ wooId: number; medusaId: string; oldThumbnail?: string; newThumbnail?: string; galleryCount: number }>;
  }> {
    const details: Array<{
      wooId: number;
      medusaId: string;
      oldThumbnail?: string;
      newThumbnail?: string;
      galleryCount: number;
    }> = [];
    let repaired = 0;
    let failed = 0;

    for (const wooProduct of wooProducts) {
      const wooId = wooProduct.id;
      const medusaId = existingProductIds[wooId];

      if (!medusaId) continue;

      try {
        const result = await processProductImages(wooProduct, existingPool, ctx, opts);

        if (!result) {
          log(ctx, `[REPAIR_ERROR] processProductImages returned null for wooId=${wooId}`, "error", { wooId });
          failed++;
          continue;
        }

        const hasContent = result.thumbnail || (result.images?.length ?? 0) > 0 || result.rewrittenDescription || result.rewrittenShortDescription;
        if (hasContent) {
          const updateResult = await updateCallback(medusaId, wooId, {
            thumbnail: result.thumbnail,
            images: result.images || [],
            description: result.rewrittenDescription,
            shortDescription: result.rewrittenShortDescription,
          });

          if (updateResult.success) {
            repaired++;
            details.push({
              wooId,
              medusaId,
              newThumbnail: result.thumbnail,
              galleryCount: result.images?.length ?? 0,
            });
            log(ctx, `[REPAIR_OK] wooId=${wooId} medusaId=${medusaId}`, "success", { wooId });
          } else {
            failed++;
            log(ctx, `[REPAIR_FAIL] wooId=${wooId} - ${updateResult.error}`, "error", { wooId });
          }
        }
      } catch (err) {
        failed++;
        log(ctx, `[REPAIR_ERROR] wooId=${wooId} - ${err instanceof Error ? err.message : "Unknown"}`, "error", { wooId });
      }

      mediaStorage.savePool(existingPool);
    }

    return { repaired, failed, details };
  },

  // ============================================================
  // UTILITIES
  // ============================================================

  loadPool(): Record<string, MediaMappingEntry> {
    return mediaStorage.loadPool();
  },

  savePool(pool: Record<string, MediaMappingEntry>): void {
    mediaStorage.savePool(pool);
  },

  clearPool(): void {
    mediaStorage.clearPool();
  },

  getPoolStats(): { total: number; downloaded: number; pending: number; failed: number } {
    const pool = this.loadPool();
    const entries = Object.values(pool);
    return {
      total: entries.length,
      downloaded: entries.filter(e => e.status === "downloaded").length,
      pending: entries.filter(e => e.status === "pending").length,
      failed: entries.filter(e => e.status === "failed").length,
    };
  },
};
