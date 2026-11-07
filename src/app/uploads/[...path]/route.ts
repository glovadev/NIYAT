import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!segments || segments.length === 0) {
      return new Response("Not Found", { status: 404 });
    }

    // Sanitize segments to prevent directory traversal
    const safeSegments = segments.map((seg) =>
      seg.replace(/[^a-zA-Z0-9._-]/g, "")
    );
    if (safeSegments.some((seg) => !seg || seg === "." || seg === "..")) {
      return new Response("Forbidden", { status: 403 });
    }

    const baseUploadDir =
      process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(baseUploadDir, ...safeSegments);

    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return new Response("Not Found", { status: 404 });
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const buffer = await fs.readFile(filePath);

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": stats.size.toString(),
          "Cache-Control": "public, max-age=2592000, immutable",
        },
      });
    } catch {
      return new Response("File Not Found", { status: 404 });
    }
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}

