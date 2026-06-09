import * as fsSync from "fs";
import * as path from "path";

const ADMIN_UI_ROOT = process.cwd().replace(/\\/g, "/");

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
]);

export const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;

export function ensureUploadDir(dir: string): void {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
}

export function resolveUploadRootDir(uploadRootDir: string): string {
  if (path.isAbsolute(uploadRootDir)) {
    return uploadRootDir;
  }

  const normalizedRoot = uploadRootDir.replace(/^\.\//, "").replace(/^\//, "");
  return `${ADMIN_UI_ROOT}/${normalizedRoot}`.replace(/\/+/g, "/");
}

export function joinUploadPath(...segments: string[]): string {
  return path.join(...segments);
}

export function uploadFileExists(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}

export function writeUploadFile(filePath: string, buffer: Buffer): void {
  fsSync.writeFileSync(filePath, buffer);
}
