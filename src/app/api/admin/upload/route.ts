import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { apiSuccess, apiError } from "@/lib/api/response";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB strictly enforced

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export async function POST(req: NextRequest) {
  try {
    // Check admin authorization with dev-mode resilience
    let authorized = false;
    try {
      const adminCheck = await requireAdmin(req, "STAFF");
      authorized = adminCheck.authorized;
    } catch {
      authorized = process.env.NODE_ENV === "development";
    }

    if (!authorized && process.env.NODE_ENV !== "development") {
      return apiError("UNAUTHORIZED", "Staff or Administrator privileges required", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "products";

    if (!file) {
      return apiError("BAD_REQUEST", "No image file provided in upload request", 400);
    }

    // 1. Strict 1 MB Size Validation
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return apiError(
        "PAYLOAD_TOO_LARGE",
        `Image size (${sizeMB} MB) exceeds maximum allowed limit of 1 MB. Please choose a smaller image.`,
        400
      );
    }

    // 2. Format Validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return apiError(
        "INVALID_FORMAT",
        `Unsupported file type (${file.type}). Only JPG, PNG, WEBP, AVIF, and GIF images are allowed.`,
        400
      );
    }

    // 3. Save buffer to public/uploads directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".jpg";
    const baseName = path
      .basename(file.name, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const uniqueFileName = `${Date.now()}_${baseName}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeFolder}/${uniqueFileName}`;

    return apiSuccess({
      url: publicUrl,
      publicId: `uploads/${safeFolder}/${uniqueFileName}`,
      name: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to process image upload";
    return apiError("INTERNAL_ERROR", msg, 500);
  }
}
