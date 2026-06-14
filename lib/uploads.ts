import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";

/* ------------------------------------------------------------------ *
 * User-uploaded images (AI photo capture, manual photos). Stored on the
 * data volume and served via the /img route, never inlined in the DB.
 * ------------------------------------------------------------------ */

const DATA_DIR = dirname(process.env.DB_PATH ?? "./data/pantry.sqlite");
const USER_DIR = join(DATA_DIR, "images", "user");

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Persist a base64 data URL image to the volume. Returns the relative path
 * under the images dir (e.g. `user/<uuid>.jpg`) for `items.photo`, or null
 * if the payload isn't a supported image.
 */
export async function saveDataUrlImage(dataUrl: string): Promise<string | null> {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;

  const [, mime, b64] = match;
  const ext = EXT_BY_MIME[mime!];
  if (!ext) return null;

  const buf = Buffer.from(b64!, "base64");
  /* Guard against absurd payloads (~10 MB cap). */
  if (buf.byteLength === 0 || buf.byteLength > 10 * 1024 * 1024) return null;

  const filename = `${randomUUID()}.${ext}`;
  await mkdir(USER_DIR, { recursive: true });
  await writeFile(join(USER_DIR, filename), buf);
  return `user/${filename}`;
}
