/**
 * Object storage for product images.
 *
 * Production: S3-compatible bucket (Tigris, AWS S3, R2, MinIO...) over the
 * standard S3 API. The bucket stays fully PRIVATE - HTML references the
 * stable /api/media route, which signs a short-lived URL per request.
 *
 * Env (in .env.local):
 *   AWS_ENDPOINT_URL_S3    e.g. https://t3.storage.dev
 *   AWS_REGION             e.g. auto
 *   AWS_BUCKET_NAME_IMAGE   bucket name
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *
 * Dev fallback: when unconfigured, files are written to public/uploads
 * (gitignored) and served locally.
 *
 * DB stores the bare object KEY ("products/<id>/<file>"; local mode stores
 * "/uploads/<key>"). resolveImageUrl() derives servable URLs at read time.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { promises as fsp } from "node:fs";
import path from "node:path";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** Only objects under this prefix are ever managed or proxied. */
const KEY_ROOT = "products";
/** KEY_ROOT/<id>/<file> - a STRING, so it can safely seed RegExp. */
const KEY_PATTERN = `${KEY_ROOT}/[^/?#]+/[^/?#]+`;

export function imageKey(productId: number, fileName: string) {
  return `${KEY_ROOT}/${productId}/${fileName}`;
}

/* ─── Config ────────────────────────────────────────────────────────── */

export function bucketName(): string | undefined {
  return (
    process.env.AWS_BUCKET_NAME_IMAGE ||
    process.env.AWS_BUCKET_NAME ||
    process.env.S3_BUCKET ||
    process.env.BUCKET_NAME
  );
}

export function storageConfigured(): boolean {
  return Boolean(
    bucketName() &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function client(): S3Client {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint: endpoint || undefined,
    // Custom endpoints (Tigris/R2/MinIO) serve objects path-style.
    forcePathStyle: Boolean(endpoint),
    // Strict S3 clones reject the checksum params the SDK adds by default.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/* ─── Key ⇄ URL mapping ─────────────────────────────────────────────── */

/**
 * Extract the object key from any stored form:
 *   "products/1/a.jpg"                          -> "products/1/a.jpg"
 *   "/uploads/products/1/a.jpg" (dev)           -> "products/1/a.jpg"
 *   "/api/media/products/1/a.jpg"               -> "products/1/a.jpg"
 *   "https://t3.storage.dev/liora/products/…"   -> "products/1/a.jpg"
 *   anything else (foreign CDN URLs)            -> null
 */
export function keyFromStoredUrl(url: string): string | null {
  if (!url) return null;
  const u = url.trim();

  const direct = u.match(new RegExp(`^(${KEY_PATTERN})$`));
  if (direct) return direct[1];

  for (const prefix of ["/uploads", "/api/media", "/"]) {
    if (u.startsWith(prefix + "/")) {
      const m = u.slice(prefix.length + 1).match(new RegExp(`^(${KEY_PATTERN})$`));
      if (m) return m[1];
    }
  }

  // S3 / Tigris URLs (endpoint path-style or any domain containing products/<id>/<file>)
  const m = u.match(new RegExp(KEY_PATTERN));
  if (m) return m[0];

  return null;
}

/**
 * Turn a stored value into a URL the browser can load:
 *  - key / bucket URL -> /api/media/<key> (bucket) or /uploads/<key> (dev)
 *  - foreign URLs and anything else -> passed through untouched
 */
export async function resolveImageUrl(stored: string): Promise<string> {
  if (!stored) return stored;
  const u = stored.trim();

  if (u.startsWith("/api/media/") || u.startsWith("/uploads/")) return u;

  const key = keyFromStoredUrl(u);
  if (key) {
    return storageConfigured() ? `/api/media/${key}` : `/uploads/${key}`;
  }
  return u;
}

/** Short-lived signed GET URL for a private bucket object. */
export async function presignedUrl(
  key: string,
  expiresIn: number = 300,
): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    { expiresIn },
  );
}

/* ─── Object IO ─────────────────────────────────────────────────────── */

export type StorageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Store an object. Returns what the DB stores: the bare KEY in S3 mode,
 * or "/uploads/<key>" in local dev mode.
 */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<StorageResult> {
  if (!storageConfigured()) {
    const dest = path.join(process.cwd(), "public", "uploads", key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, body);
    return { ok: true, url: `/uploads/${key}` };
  }

  try {
    await client().send(
      new PutObjectCommand({
        Bucket: bucketName(),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { ok: true, url: key };
  } catch (e) {
    console.error("[storage] putObject failed:", e);
    return { ok: false, error: "Upload to object storage failed." };
  }
}

/**
 * Delete a stored object. Accepts a bare key (S3 mode) or the local forms
 * "uploads/<key>" / "/uploads/<key>".
 */
export async function deleteObject(key: string): Promise<void> {
  if (!storageConfigured()) {
    const cleaned = key
      .replace(/^\/+/, "")
      .replace(/^uploads\//, "");
    await fsp.rm(path.join(process.cwd(), "public", "uploads", cleaned), {
      force: true,
    });
    return;
  }
  try {
    await client().send(
      new DeleteObjectCommand({ Bucket: bucketName(), Key: key }),
    );
  } catch (e) {
    // Orphaned object is harmless; the DB row is already gone.
    console.error("[storage] deleteObject failed:", e);
  }
}
