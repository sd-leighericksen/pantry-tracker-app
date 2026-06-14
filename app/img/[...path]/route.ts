import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { dirname, join, normalize, sep, extname } from "node:path";

import { getCurrentUser } from "@/lib/auth";

/* ------------------------------------------------------------------ *
 * Serve cached product images from the data volume. The app never
 * hotlinks Open Food Facts images at render — they're downloaded by
 * lib/off-client.ts and served from here. Auth-checked in the handler
 * (the middleware matcher skips image extensions), with a path-traversal
 * guard so only files under {data}/images are reachable.
 * ------------------------------------------------------------------ */

const DATA_DIR = dirname(process.env.DB_PATH ?? "./data/pantry.sqlite");
const IMAGES_ROOT = normalize(join(DATA_DIR, "images"));

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorised", { status: 401 });

  const { path } = await params;
  const target = normalize(join(IMAGES_ROOT, ...path));

  /* Reject anything that escapes the images root (path traversal). */
  if (target !== IMAGES_ROOT && !target.startsWith(IMAGES_ROOT + sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  const contentType = CONTENT_TYPES[extname(target).toLowerCase()];
  if (!contentType) return new Response("Unsupported", { status: 415 });

  try {
    const info = await stat(target);
    if (!info.isFile()) return new Response("Not found", { status: 404 });

    const webStream = Readable.toWeb(
      createReadStream(target),
    ) as ReadableStream<Uint8Array>;
    return new Response(webStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        /* Cached files are immutable per barcode; safe to cache hard. */
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
