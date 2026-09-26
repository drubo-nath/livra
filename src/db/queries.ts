import { cache } from "react";
import { asc, eq, desc, inArray, or, sql } from "drizzle-orm";
import { db, isDbConfigured, schema } from "./index";
import { productSeeds, reviewSeeds, contentSeeds } from "./seed-data";
import { normalizeFinish, type ProductDTO, type ReviewDTO } from "./types";
import { resolveImageUrl } from "@/lib/storage";
import { resolveProductShape } from "@/lib/shapes";
import { resolveProductColor, resolveProductLength } from "@/lib/filter-resolvers";

export type { ProductDTO, ReviewDTO, Finish } from "./types";
export { finishes, finishDisplayLabels, normalizeFinish } from "./types";

/* ─── DTO mapping ──────────────────────────────────────────────────── */

type ProductRow = typeof schema.products.$inferSelect;

/** Default size range when a product has no explicit sizes. */
export const DEFAULT_SIZES = ["XS", "S", "M", "L"];

function extractPropertyTag(sizes: string[] | null | undefined, prefix: string): string | null {
  const match = sizes?.find((s) => s.startsWith(`${prefix}:`));
  return match ? match.slice(prefix.length + 1) : null;
}

function cleanSizes(sizes: string[] | null | undefined): string[] {
  const filtered = (sizes ?? []).filter((s) => !s.includes(":"));
  if (filtered.includes("tool")) return ["tool"];
  return filtered.length ? filtered : DEFAULT_SIZES;
}

/** Attach ordered gallery URLs to a set of product rows in one query. */
async function attachImages(
  rows: ProductRow[],
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (rows.length === 0) return map;
  const imgs = await db
    .select({
      productId: schema.productImages.productId,
      url: schema.productImages.url,
      position: schema.productImages.position,
    })
    .from(schema.productImages)
    .where(
      inArray(
        schema.productImages.productId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(schema.productImages.position));

  for (const img of imgs) {
    const arr = map.get(img.productId) ?? [];
    arr.push(img.url);
    map.set(img.productId, arr);
  }

  // Pre-sign all storage keys into viewable URLs in parallel.
  for (const [productId, keys] of map.entries()) {
    const urls = await Promise.all(keys.map(resolveImageUrl));
    map.set(productId, urls);
  }
  return map;
}

function toDTO(
  r: ProductRow,
  images: string[] = [],
  imageUrlOverride?: string | null,
): ProductDTO {
  const cover = images[0] ?? imageUrlOverride ?? r.imageUrl ?? null;
  const shape = extractPropertyTag(r.sizes, "shape") || resolveProductShape(r);
  const color = extractPropertyTag(r.sizes, "color") || resolveProductColor(r);
  const length = extractPropertyTag(r.sizes, "length") || resolveProductLength({ ...r, shape });

  return {
    slug: r.slug,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    price: r.price,
    compareAtPrice: r.compareAtPrice,
    finish: normalizeFinish(r.finish) ?? "Exclusive",
    badge: r.badge,
    tones: [r.toneA, r.toneB],
    imageUrl: cover,
    shape,
    color,
    length,
    sizes: cleanSizes(r.sizes),
    images: images.length ? images : cover ? [cover] : [],
  };
}

function seedToDTO(s: (typeof productSeeds)[number]): ProductDTO {
  const shape = extractPropertyTag(s.sizes, "shape") || resolveProductShape(s);
  const color = extractPropertyTag(s.sizes, "color") || resolveProductColor(s);
  const length = extractPropertyTag(s.sizes, "length") || resolveProductLength({ ...s, shape });

  return {
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    price: s.price,
    compareAtPrice: s.compareAtPrice ?? null,
    finish: normalizeFinish(s.finish) ?? "Exclusive",
    badge: (s.badge as ProductDTO["badge"]) ?? null,
    tones: [s.toneA, s.toneB],
    imageUrl: s.imageUrl ?? null,
    shape,
    color,
    length,
    sizes: cleanSizes(s.sizes),
    images: s.imageUrl ? [s.imageUrl] : [],
  };
}

/* ─── Products ──────────────────────────────────────────────────────── */

/** Resolve the legacy cover column when a product has no gallery rows. */
async function resolveCoverFallback(
  rows: ProductRow[],
  images: Map<number, string[]>,
): Promise<Map<number, string | null>> {
  const covers = new Map<number, string | null>();
  for (const r of rows) {
    if (!(images.get(r.id)?.length) && r.imageUrl) {
      covers.set(r.id, await resolveImageUrl(r.imageUrl));
    }
  }
  return covers;
}

let dbOfflineUntil = 0;
let hasLoggedOfflineWarning = false;

function isDbOnline(): boolean {
  if (!isDbConfigured) return false;
  if (Date.now() < dbOfflineUntil) return false;
  return true;
}

function handleDbFailure(operation: string, error: unknown) {
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  // Trip circuit breaker for 60s during runtime, or 10 minutes during static build
  dbOfflineUntil = Date.now() + (isBuild ? 600_000 : 60_000);

  if (!hasLoggedOfflineWarning) {
    hasLoggedOfflineWarning = true;
    const isTimeout =
      error instanceof Error &&
      (error.message.includes("timed out") ||
        error.message.includes("CONNECT_TIMEOUT") ||
        error.message.includes("Connection terminated"));
    console.warn(
      `[db] Database connection ${isTimeout ? "timed out" : "unavailable"}. Serving fallback data.`,
    );
  }
}

async function withTimeout<T>(promise: Promise<T>, ms?: number): Promise<T> {
  const timeoutMs = ms ?? (process.env.NEXT_PHASE === "phase-production-build" ? 2500 : 5000);
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Query timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Request-memoized via React cache(); falls back to seed data pre-setup. */
export const listProducts = cache(async (): Promise<ProductDTO[]> => {
  if (!isDbOnline()) return productSeeds.map(seedToDTO);
  try {
    const rows = await withTimeout(
      db
        .select()
        .from(schema.products)
        .where(eq(schema.products.isActive, true))
        .orderBy(asc(schema.products.sortOrder)),
    );
    if (!rows || rows.length === 0) {
      return productSeeds.map(seedToDTO);
    }
    const images = await attachImages(rows);
    const covers = await resolveCoverFallback(rows, images);
    const dbDtos = rows.map((r) =>
      toDTO(r, images.get(r.id) ?? [], covers.get(r.id)),
    );

    // Merge: ensure standard seed catalog products remain accessible if DB only has a few records
    const dbSlugs = new Set(dbDtos.map((p) => p.slug.toLowerCase()));
    const extraSeeds = productSeeds
      .map(seedToDTO)
      .filter((s) => !dbSlugs.has(s.slug.toLowerCase()));

    return [...dbDtos, ...extraSeeds];
  } catch (e) {
    handleDbFailure("listProducts", e);
    return productSeeds.map(seedToDTO);
  }
});

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDTO | null> => {
    const raw = (slug ?? "").trim();
    const decoded = decodeURIComponent(raw).trim();
    const lower = decoded.toLowerCase();

    const findInSeeds = () => {
      const allSeeds = productSeeds.map(seedToDTO);
      return (
        allSeeds.find(
          (p) =>
            p.slug === raw ||
            p.slug === decoded ||
            p.slug.toLowerCase() === lower,
        ) ?? null
      );
    };

    if (!isDbOnline()) return findInSeeds();

    try {
      const rows = await withTimeout(
        db
          .select()
          .from(schema.products)
          .where(
            or(
              eq(schema.products.slug, raw),
              eq(schema.products.slug, decoded),
              sql`lower(${schema.products.slug}) = ${lower}`,
            ),
          )
          .limit(1),
      );
      if (!rows[0]) {
        // Fall back to seed catalog so known products never 404
        return findInSeeds();
      }
      const images = await attachImages(rows);
      const covers = await resolveCoverFallback(rows, images);
      return toDTO(rows[0], images.get(rows[0].id) ?? [], covers.get(rows[0].id));
    } catch (e) {
      handleDbFailure(`getProductBySlug(${slug})`, e);
      return findInSeeds();
    }
  },
);

export function isToolProduct(p: ProductDTO): boolean {
  const sizes = p.sizes ?? [];
  return (
    sizes.includes("tool") ||
    sizes.includes("tools") ||
    sizes.includes("accessory") ||
    p.tagline?.toLowerCase().includes("tool") ||
    p.tagline?.toLowerCase().includes("accessor")
  );
}

export const listTools = cache(async (): Promise<ProductDTO[]> => {
  const all = await listProducts();
  return all.filter((p) => isToolProduct(p));
});

export const listNails = cache(async (): Promise<ProductDTO[]> => {
  const all = await listProducts();
  return all.filter((p) => !isToolProduct(p));
});

export const listBestsellers = cache(async (): Promise<ProductDTO[]> => {
  const all = await listNails();
  return all.filter((p) => p.badge === "Bestseller").slice(0, 4);
});

/* ─── Reviews ───────────────────────────────────────────────────────── */

export const listBrandReviews = cache(async (): Promise<ReviewDTO[]> => {
  if (!isDbOnline())
    return reviewSeeds.map((r, i) => ({ id: i + 1, ...r }));
  try {
    const rows = await withTimeout(
      db
        .select()
        .from(schema.reviews)
        .where(eq(schema.reviews.isApproved, true))
        .orderBy(desc(schema.reviews.createdAt))
        .limit(6),
    );
    return rows.filter((r) => r.productId === null);
  } catch (e) {
    handleDbFailure("listBrandReviews", e);
    return reviewSeeds.map((r, i) => ({ id: i + 1, ...r }));
  }
});

/* ─── Site content ──────────────────────────────────────────────────── */

function contentFallback(key: string): string[] {
  const row = contentSeeds.find((c) => c.key === key);
  return Array.isArray(row?.value) ? (row.value as string[]) : [];
}

export const getContentList = cache(async (key: string): Promise<string[]> => {
  if (!isDbOnline()) return contentFallback(key);
  try {
    const rows = await withTimeout(
      db
        .select()
        .from(schema.siteContent)
        .where(eq(schema.siteContent.key, key))
        .limit(1),
    );
    const v = rows[0]?.value;
    return Array.isArray(v) ? (v as string[]) : contentFallback(key);
  } catch (e) {
    handleDbFailure(`getContentList(${key})`, e);
    return contentFallback(key);
  }
});

export const getAnnouncements = () => getContentList("announcements");
export const getMarqueeItems = () => getContentList("marquee");
