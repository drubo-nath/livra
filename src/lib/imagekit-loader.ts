/**
 * ImageKit Custom Loader for Next.js Image Optimization
 *
 * Offloads 100% of image transformations to ImageKit's global CDN,
 * bypassing Vercel Image Optimization completely (0 Vercel quota used).
 *
 * Features:
 * - Dynamic responsive resizing (w-${width})
 * - Automatic format negotiation (f-auto -> WebP/AVIF based on browser)
 * - Compression quality control (q-${quality || 80})
 * - Direct passthrough for SVGs, data URIs, and already-hosted ImageKit URLs
 */

const IMAGEKIT_ENDPOINT =
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
  "https://ik.imagekit.io/livra";

export default function imageKitLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Pass through empty or non-string
  if (!src) return "";

  // Pass through vector SVGs, data URIs, and blob URIs without transformation
  if (
    src.endsWith(".svg") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  // Pass through if not hosted on ImageKit
  if (!src.includes("ik.imagekit.io")) {
    return src;
  }

  // If already has transformation parameters, avoid duplicate prefix
  if (src.includes("/tr:")) {
    return src;
  }

  const endpoint = IMAGEKIT_ENDPOINT.replace(/\/$/, "");
  const params: string[] = [`w-${width}`, `q-${quality || 80}`, "f-auto"];
  const tr = `tr:${params.join(",")}`;

  return src.replace(endpoint, `${endpoint}/${tr}`);
}

