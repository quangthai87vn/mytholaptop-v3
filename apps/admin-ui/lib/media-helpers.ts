/**
 * Media Helper Utilities
 *
 * - sanitizeFileName: chuẩn hóa tên file an toàn cho filesystem
 * - buildRelativePath: tạo relative path theo spec
 * - normalizeUrl: chuẩn hóa URL về dạng canonical
 * - hashUrl: tạo hash từ URL để làm key deduplication
 * - extractImageUrlsFromHtml: trích xuất tất cả URLs từ HTML
 * - rewriteHtmlImages: rewrite HTML với URL mapping
 * - buildImageUploadPath: tạo full upload path từ ImageUploadConfig
 */

import type { MediaUsageType, ImageUploadConfig } from "@/types/media-mapping";

// ============================================================
// URL NORMALIZATION & HASHING
// ============================================================

/** Normalize URL về dạng canonical để so sánh deduplication */
export function normalizeUrl(url: string): string {
  if (!url) return "";

  // Bỏ query params và hash
  try {
    const parsed = new URL(url);
    // Bỏ trailing slash ở path nhưng giữ filename
    let path = parsed.pathname;
    // Loại bỏ trailing slash nếu là directory
    if (path.endsWith("/") && path.length > 1) {
      path = path.slice(0, -1);
    }
    // Lowercase domain và path
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${path}`;
  } catch {
    // Nếu không parse được, strip query params và lowercase
    const stripped = url.split("?")[0].split("#")[0];
    return stripped.toLowerCase();
  }
}

/** Tạo hash 32 ký tự từ URL để làm deduplication key */
export async function hashUrl(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ============================================================
// FILENAME UTILITIES
// ============================================================

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const MULTIPLE_DASHES = /-+/g;
const TRIM_CHARS = /-\s/g;

/**
 * Sanitize filename cho filesystem:
 * - Loại bỏ ký tự không hợp lệ: < > : " / \ | ? * và control chars
 * - Thay space bằng dash
 * - Loại bỏ nhiều dashes liên tiếp
 * - Giới hạn độ dài filename (không tính extension)
 */
export function sanitizeFileName(rawFileName: string, maxLen = 120): string {
  if (!rawFileName) return "unnamed-image";

  // Decode URL-encoded filename (VD: "Dell%20Inspiron%203593%20%281%29.jpg")
  let name: string;
  try {
    name = decodeURIComponent(rawFileName);
  } catch {
    name = rawFileName;
  }

  // Get extension
  const lastDot = name.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < name.length - 1;
  const ext = hasExt ? name.slice(lastDot).toLowerCase() : "";

  // Remove extension for processing
  let base = hasExt ? name.slice(0, lastDot) : name;

  // Remove invalid chars
  base = base.replace(INVALID_FILENAME_CHARS, "-");

  // Replace spaces and special chars with dash
  base = base.replace(/[\s_]+/g, "-");

  // Remove parentheses content like "(1)", "(2)"
  base = base.replace(/\s*\(\d*\)\s*/g, "-");

  // Replace Vietnamese/accented chars
  base = removeDiacritics(base);

  // Lowercase
  base = base.toLowerCase();

  // Remove multiple dashes
  base = base.replace(MULTIPLE_DASHES, "-").replace(TRIM_CHARS, "-");

  // Trim leading/trailing dashes
  base = base.replace(/^-+|-+$/g, "");

  // Truncate if too long (but keep extension)
  if (base.length > maxLen) {
    base = base.slice(0, maxLen);
  }

  // Final cleanup
  base = base.replace(/^-+|-+$/g, "");

  return (base || "unnamed-image") + ext;
}

/** Loại bỏ dấu tiếng Việt và ký tự có dấu */
function removeDiacritics(str: string): string {
  const DIACRITICS_MAP: Record<string, string> = {
    à: "a", á: "a", ạ: "a", ả: "a", ã: "a", â: "a", ầ: "a", ấ: "a", ậ: "a", ẩ: "a", ẫ: "a", ă: "a", ằ: "a", ắ: "a", ặ: "a", ẳ: "a", ẵ: "a",
    đ: "d",
    è: "e", é: "e", ẹ: "e", ẻ: "e", ẽ: "e", ê: "e", ề: "e", ế: "e", ệ: "e", ể: "e", ễ: "e",
    ì: "i", í: "i", ị: "i", ỉ: "i", ĩ: "i",
    ò: "o", ó: "o", ọ: "o", ỏ: "o", õ: "o", ô: "o", ồ: "o", ố: "o", ộ: "o", ổ: "o", ỗ: "o", ơ: "o", ờ: "o", ớ: "o", ợ: "o", ở: "o", ỡ: "o",
    ù: "u", ú: "u", ụ: "u", ủ: "u", ũ: "u", ư: "u", ừ: "u", ứ: "u", ự: "u", ử: "u", ữ: "u",
    ỳ: "y", ý: "y", ỵ: "y", ỷ: "y", ỹ: "y",
    À: "a", Á: "a", Ạ: "a", Ả: "a", Ã: "a", Â: "a", Ầ: "a", Ấ: "a", Ậ: "a", Ẩ: "a", Ẫ: "a", Ă: "a", Ằ: "a", Ắ: "a", Ặ: "a", Ẳ: "a", Ẵ: "a",
    Đ: "d",
    È: "e", É: "e", Ẹ: "e", Ẻ: "e", Ẽ: "e", Ê: "e", Ề: "e", Ế: "e", Ệ: "e", Ể: "e", Ễ: "e",
    Ì: "i", Í: "i", Ị: "i", Ỉ: "i", Ĩ: "i",
    Ò: "o", Ó: "o", Ọ: "o", Ỏ: "o", Õ: "o", Ô: "o", Ồ: "o", Ố: "o", Ộ: "o", Ổ: "o", Ỗ: "o", Ơ: "o", Ờ: "o", Ớ: "o", Ợ: "o", Ở: "o", Ỡ: "o",
    Ù: "u", Ú: "u", Ụ: "u", Ủ: "u", Ũ: "u", Ư: "u", Ừ: "u", Ứ: "u", Ự: "u", Ử: "u", Ữ: "u",
    Ỳ: "y", Ý: "y", Ỵ: "y", Ỷ: "y", Ỹ: "y",
  };

  return str.replace(/[^\x00-\x7F]/g, (char) => DIACRITICS_MAP[char] || char);
}

/** Infer MIME type từ extension */
export function inferMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const MIME_MAP: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    tiff: "image/tiff",
    tif: "image/tiff",
  };
  return MIME_MAP[ext] || "application/octet-stream";
}

/** Infer extension từ MIME type */
export function mimeTypeToExt(mimeType: string): string {
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
    "image/tiff": "tiff",
  };
  return MIME_TO_EXT[mimeType.toLowerCase()] || "jpg";
}

// ============================================================
// RELATIVE PATH BUILDING
// ============================================================

/**
 * Build relative path cho WordPress media structure.
 * Format: /wp-content/uploads/{year}/{month}/{filename}
 *
 * Extracts year/month from source URL if available (e.g. /wp-content/uploads/2024/07/image.jpg)
 */
export function buildRelativePath(urlHash: string, sanitizedFileName: string, sourceUrl?: string): string {
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      const uploadsIdx = parts.findIndex(p => p === "uploads");
      if (uploadsIdx !== -1 && parts.length >= uploadsIdx + 3) {
        const year = parts[uploadsIdx + 1];
        const month = parts[uploadsIdx + 2];
        if (year && month && /^\d{4}$/.test(year) && /^\d{2}$/.test(month)) {
          return `/wp-content/uploads/${year}/${month}/${sanitizedFileName}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  // Fallback: use current year/month
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `/wp-content/uploads/${year}/${month}/${sanitizedFileName}`;
}

/**
 * Build storage path (absolute) cho backend file system.
 * Format: {baseDir}/wp-content/uploads/{year}/{month}/{filename}
 */
export function buildStoragePath(
  baseDir: string,
  urlHash: string,
  sanitizedFileName: string
): string {
  const normalized = baseDir.replace(/[\\/]+$/, "");
  return `${normalized}/wp-content/uploads/${sanitizedFileName}`;
}

// ============================================================
// HTML IMAGE EXTRACTION & REWRITING
// ============================================================

interface ExtractedImage {
  url: string;
  attribute: "src" | "srcset" | "data-src" | "background-image" | "href";
  tag: string;
  fullMatch: string;
  /** For srcset: array of {url, descriptor} */
  srcsetEntries?: Array<{ url: string; descriptor: string }>;
}

/**
 * Extract all image URLs from HTML content.
 * Handles:
 * - <img src="...">
 * - <img srcset="url1 size1, url2 size2, ...">
 * - <source srcset="...">
 * - <a href="..."> where href looks like an image file
 * - style="background-image: url(...)"
 */
export function extractImageUrlsFromHtml(html: string): string[] {
  if (!html) return [];

  const urls = new Set<string>();

  // Decode HTML entities in URL values — WooCommerce HTML often has &amp; instead of &
  // This converts &amp; → &, &lt; → <, &gt; → > etc.
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");

  // <img src="..."> và <img data-src="...">
  const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(decoded)) !== null) {
    const fullMatch = match[0];
    const srcMatch = /src=["']([^"']+)["']/i.exec(fullMatch);
    const dataSrcMatch = /data-src=["']([^"']+)["']/i.exec(fullMatch);
    if (srcMatch) urls.add(srcMatch[1]);
    if (dataSrcMatch) urls.add(dataSrcMatch[1]);
  }

  // <source srcset="url1 size1, url2 size2"> và <img srcset="...">
  const srcsetRegex = /<(?:img|source)[^>]+srcset=["']([^"']+)["'][^>]*>/gi;
  while ((match = srcsetRegex.exec(decoded)) !== null) {
    const srcsetValue = match[1];
    const entries = parseSrcset(srcsetValue);
    entries.forEach((e) => urls.add(e.url));
  }

  // style="background-image: url(...)"
  const bgRegex = /style=["'][^"']*background-image\s*:\s*url\s*\(\s*['"]?([^'"()]+)['"]?\s*\)[^"']*["']/gi;
  while ((match = bgRegex.exec(decoded)) !== null) {
    if (match[1]) urls.add(match[1]);
  }

  return Array.from(urls);
}

/**
 * Rewrite image URLs in HTML content.
 * Maps old URLs → new relative paths using urlHash as the lookup key.
 *
 * @param html Original HTML content
 * @param urlToRelativePath Map: normalizedUrl → relativePath
 * @returns HTML với URLs đã được rewrite, URLs không có mapping được giữ nguyên
 */
export function rewriteHtmlImages(
  html: string,
  urlToRelativePath: Record<string, string>,
  baseUrl: string = ""
): { rewrittenHtml: string; replacedCount: number; failedCount: number } {
  if (!html) return { rewrittenHtml: html, replacedCount: 0, failedCount: 0 };

  let replacedCount = 0;
  let failedCount = 0;

  // Build regex-safe search map
  const normalizedToPath: Record<string, string> = {};
  for (const [origUrl, newPath] of Object.entries(urlToRelativePath)) {
    normalizedToPath[normalizeUrl(origUrl)] = newPath;
  }

  function resolveUrl(rawUrl: string): string {
    if (!rawUrl) return rawUrl;
    // Decode HTML entities first (e.g. &amp; → &)
    const decoded = rawUrl
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'");
    // Relative URL starting with // → add protocol
    if (decoded.startsWith("//")) {
      return "https:" + decoded;
    }
    // For URLs starting with / (like /wp-content/uploads/...):
    // Extract the /wp-content/uploads/... path only (don't prepend baseUrl)
    if (decoded.startsWith("/")) {
      const relativeMatch = decoded.match(/\/wp-content\/uploads\/.+/);
      if (relativeMatch) return relativeMatch[0];
      return decoded;
    }
    // Full URL — extract relative path if it contains wp-content/uploads
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
      const relativeMatch = decoded.match(/\/wp-content\/uploads\/.+/);
      if (relativeMatch) return relativeMatch[0];
      return decoded;
    }
    return decoded;
  }

  function replaceUrl(rawUrl: string): string {
    if (!rawUrl) return rawUrl;
    const resolved = resolveUrl(rawUrl);
    const normalized = normalizeUrl(resolved);
    const mapped = normalizedToPath[normalized];
    if (mapped) {
      replacedCount++;
      return mapped;
    }
    failedCount++;
    return rawUrl; // Giữ nguyên URL cũ nếu không có mapping
  }

  let result = html;

  // Rewrite <img src="...">
  result = result.replace(/<img([^>]*?)src=(["'])([^"']+)\2([^>]*)>/gi, (_, before, _quote, srcUrl, after) => {
    const newSrc = replaceUrl(srcUrl);
    return `<img${before}src="${newSrc}"${after}>`;
  });

  // Rewrite <img data-src="..."> → <img src="..."> (lazy load pattern)
  result = result.replace(/<img([^>]*?)data-src=(["'])([^"']+)\2([^>]*?)>/gi, (_, before, _quote, srcUrl, after) => {
    const newSrc = replaceUrl(srcUrl);
    return `<img${before}src="${newSrc}"${after}>`;
  });

  // Rewrite <source srcset="...">
  result = result.replace(/<source([^>]*?)srcset=(["'])([^"']+)\2([^>]*)>/gi, (_, before, _quote, srcsetValue, after) => {
    const newSrcset = rewriteSrcset(srcsetValue, replaceUrl);
    return `<source${before}srcset="${newSrcset}"${after}>`;
  });

  // Rewrite <img srcset="...">
  result = result.replace(/<img([^>]*?)srcset=(["'])([^"']+)\2([^>]*)>/gi, (_, before, _quote, srcsetValue, after) => {
    const newSrcset = rewriteSrcset(srcsetValue, replaceUrl);
    return `<img${before}srcset="${newSrcset}"${after}>`;
  });

  // Rewrite style="background-image: url(...)"
  result = result.replace(
    /style=(["'])([^"']*?)background-image\s*:\s*url\s*\(\s*['"]?([^'"()]+)['"]?\s*\)([^"']*?)\1/gi,
    (_match, quote, before, bgUrl, after) => {
      const newBgUrl = replaceUrl(bgUrl);
      return `style=${quote}${before}background-image: url("${newBgUrl}")${after}${quote}`;
    }
  );

  return { rewrittenHtml: result, replacedCount, failedCount };
}

/** Parse srcset string thành array of {url, descriptor} */
function parseSrcset(srcset: string): Array<{ url: string; descriptor: string }> {
  if (!srcset) return [];
  return srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const parts = entry.split(/\s+/);
      return {
        url: parts[0] || "",
        descriptor: parts.slice(1).join(" ") || "",
      };
    })
    .filter((e) => e.url);
}

/** Rewrite srcset string */
function rewriteSrcset(
  srcset: string,
  replaceUrlFn: (url: string) => string
): string {
  const entries = parseSrcset(srcset);
  return entries
    .map((e) => {
      const newUrl = replaceUrlFn(e.url);
      return e.descriptor ? `${newUrl} ${e.descriptor}` : newUrl;
    })
    .join(", ");
}

// ============================================================
// CONTENT IMAGE EXTRACTION (description / short_description)
// ============================================================

/**
 * Extract all image URLs from WooCommerce product description fields.
 * Returns deduplicated set of unique URLs.
 */
export function extractProductDescriptionImages(
  description: string,
  shortDescription: string
): string[] {
  const urls = new Set<string>();
  if (description) {
    extractImageUrlsFromHtml(description).forEach((u) => urls.add(u));
  }
  if (shortDescription) {
    extractImageUrlsFromHtml(shortDescription).forEach((u) => urls.add(u));
  }
  return Array.from(urls);
}

// ============================================================
// VALIDATION
// ============================================================

/** Kiểm tra xem URL có phải là WordPress URL cũ không */
export function isWordPressUrl(url: string, wordpressBaseUrl: string): boolean {
  if (!url || !wordpressBaseUrl) return false;
  const normalized = normalizeUrl(url);
  const wpNormalized = normalizeUrl(wordpressBaseUrl);
  return normalized.startsWith(wpNormalized);
}

/** Kiểm tra xem path có phải là relative path không */
export function isRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** Kiểm tra xem image URL có phải là WordPress/WooCommerce domain không */
export function isWooCommerceImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes("woocommerce") ||
      host.includes("woo-commerce") ||
      host.includes("wp-content") ||
      host.includes("wp-upload")
    );
  } catch {
    return false;
  }
}

// ============================================================
// MIME TYPE VALIDATION
// ============================================================

const VALID_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
]);

/** Validate MIME type là image hợp lệ */
export function isValidImageMimeType(mimeType: string): boolean {
  return VALID_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

/** Validate file size không vượt quá giới hạn */
export function isValidFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

// ============================================================
// URL BUILDING FOR MEDUSA
// ============================================================

/**
 * Build public URL cho ảnh trong Medusa.
 * Dùng để hiển thị ảnh trên giao diện.
 *
 * IMPORTANT: Luôn trả về RELATIVE PATH (bắt đầu bằng /),
 * KHÔNG trả về full URL.
 */
export function buildMediaUrl(
  relativePath: string,
  medusaBackendUrl: string
): string {
  if (!relativePath) return "";
  // Already absolute URL — extract relative path
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    const relativeMatch = relativePath.match(/\/wp-content\/uploads\/.+/);
    if (relativeMatch) return relativeMatch[0];
    try {
      return new URL(relativePath).pathname;
    } catch {
      return relativePath;
    }
  }
  // Relative path starting with / — use as-is
  if (relativePath.startsWith("/")) {
    // Fix double-slash
    const cleaned = relativePath.replace(/\/+/g, "/");
    return cleaned;
  }
  // Plain path — add leading slash
  return `/${relativePath}`;
}

// ============================================================
// IMAGE UPLOAD PATH BUILDER (ImageUploadConfig support)
// ============================================================

interface ImageUploadPath {
  /** Relative path for database (e.g. /uploads/medusa/products/2026/05/abc.webp) */
  relativePath: string;
  /** Subdirectory (e.g. 2026/05) */
  subDir: string;
  /** Final filename */
  fileName: string;
  /** Full physical absolute path */
  absolutePath: string;
}

/**
 * Extract year/month from WordPress source URL path.
 * E.g. /wp-content/uploads/2026/05/image.jpg → { year: "2026", month: "05" }
 */
export function extractYearMonthFromUrl(sourceUrl: string): { year: string; month: string } | null {
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
 * Build subdirectory from folder pattern, optionally using URL metadata.
 */
export function buildSubDirFromPattern(
  folderPattern: string,
  sourceUrl?: string
): string {
  let year: string;
  let month: string;
  let day = "01";

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
 * Apply filename mode to generate final filename.
 */
export function applyImageFileNameMode(
  mode: ImageUploadConfig["imageFileNameMode"],
  originalFileName: string,
  sourceUrl: string,
  productSlug?: string,
  productSku?: string
): string {
  const { name, ext } = (() => {
    const lastDot = originalFileName.lastIndexOf(".");
    if (lastDot > 0 && lastDot < originalFileName.length - 1) {
      return { name: originalFileName.slice(0, lastDot), ext: originalFileName.slice(lastDot).toLowerCase() };
    }
    return { name: originalFileName, ext: "" };
  })();

  switch (mode) {
    case "keep-original-name":
      return sanitizeFileName(originalFileName);

    case "product-slug":
      return sanitizeFileName(productSlug || name) + ext;

    case "product-sku":
      return sanitizeFileName(productSku || name) + ext;

    case "source-hash":
    default: {
      // Generate short hash from source URL for uniqueness
      let hash = 0;
      const normalized = sourceUrl.toLowerCase();
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const hexHash = Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
      return `${hexHash}_${sanitizeFileName(name)}${ext}`.slice(0, 120);
    }
  }
}

/**
 * Build complete image upload path from ImageUploadConfig.
 * Used by media-migration service to prepare upload formData.
 *
 * Returns the components needed to build the upload request.
 */
export function buildImageUploadPath(
  config: ImageUploadConfig,
  sourceUrl: string,
  originalFileName: string,
  productSlug?: string,
  productSku?: string
): ImageUploadPath {
  const subDir = buildSubDirFromPattern(config.imageFolderPattern, sourceUrl);
  const fileName = applyImageFileNameMode(
    config.imageFileNameMode,
    originalFileName,
    sourceUrl,
    productSlug,
    productSku
  );

  const relativePath = `${config.uploadPublicPath.replace(/\/$/, "")}/${subDir}/${fileName}`;

  return {
    relativePath,
    subDir,
    fileName,
    absolutePath: "", // Set by the server-side route
  };
}

/**
 * Check if a path looks like a relative path (starts with /, not //)
 */
export function isRelativePublicPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}
