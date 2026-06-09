/**
 * POST /api/tasks/assets/upload
 * Upload file cho task assets.
 * Dùng chung logic với Medusa upload proxy (/api/medusa/upload-media).
 * Auth: requireAdminAuth() + requireCsrf()
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/require-admin";
import { requireCsrf } from "@/lib/auth/csrf";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  const authError = await requireAdminAuth(req);
  if (authError) return authError;

  const csrfError = requireCsrf(req);
  if (csrfError) return csrfError;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const mimeType = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 415 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB > 100MB` },
        { status: 413 }
      );
    }

    // Forward đến Medusa upload proxy để reuse logic upload
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("customFileName", `${Date.now()}_${file.name}`);
    uploadFormData.append("uploadRootDir", "public/uploads/tasks");
    uploadFormData.append("uploadPublicPath", "/uploads/tasks");
    uploadFormData.append("imageFolderPattern", "{year}/{month}");
    uploadFormData.append("imageConflictStrategy", "overwrite");
    uploadFormData.append("imageSaveMode", "relative_path");

    const uploadRes = await fetch(
      new URL("/api/medusa/upload-media", req.url).toString(),
      {
        method: "POST",
        headers: {
          // Forward cookies for auth
          cookie: req.headers.get("cookie") || "",
        },
        body: uploadFormData,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return NextResponse.json(
        { error: `Upload failed: ${errBody}` },
        { status: uploadRes.status }
      );
    }

    const uploadData = await uploadRes.json();
    return NextResponse.json({
      success: true,
      file_name: file.name,
      file_url: uploadData.relativePath || uploadData.url,
      mime_type: mimeType,
      file_size: file.size,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload error";
    console.error("[TaskAssetUpload] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
