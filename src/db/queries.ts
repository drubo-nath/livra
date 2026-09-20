import { cache } from "react";
import { asc, eq, desc, inArray } from "drizzle-orm";
import { db, isDbConfigured, schema } from "./index";
import { productSeeds, reviewSeeds, contentSeeds } from "./seed-data";
import { normalizeFinish, type ProductDTO, type ReviewDTO } from "./types";
import { resolveImageUrl } from "@/lib/storage";
import { resolveProductShape } from "@/lib/shapes";

export type { ProductDTO, ReviewDTO, Finish } from "./types";
export { finishes, finishDisplayLabels, normalizeFinish } from "./types";

/* ─── DTO mapping ──────────────────────────────────────────────────── */

type ProductRow = typeof schema.products.$inferSelect;

/** Default size range when a product has no explicit sizes. */
export const DEFAULT_SIZES = ["XS", "S", "M", "L"];

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
    const list = map.get(img.productId) ?? [];
    // Presigned (or local) URL resolved per row at read time.
    list.push(await resolveImageUrl(img.url));
    map.set(img.productId, list);
  }
  return map;
}

function toDTO(
  r: ProductRow,
  images: string[] = [],
  imageUrlOverride?: string | null,
): ProductDTO {
  const cover = images[0] ?? imageUrlOverride ?? r.imageUrl ?? null;
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
    shape: resolveProductShape(r),
    sizes: r.sizes?.length ? r.sizes : DEFAULT_SIZES,
    images: images.length ? images : cover ? [cover] : [],
  };
}

function seedToDTO(s: (typeof productSeeds)[number]): ProductDTO {
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
    shape: resolveProductShape(s),
    sizes: s.sizes?.length ? s.sizes : DEFAULT_SIZES,
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

async function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Request-memoized via React cache(); falls back to seed data pre-setup. */
export const listProducts = cache(async (): Promise<ProductDTO[]> => {
  if (!isDbConfigured) return productSeeds.map(seedToDTO);
  try {
    const rows = await withTimeout(
      db
        .select()
        .from(schema.products)
        .where(eq(schema.products.isActive, true))
        .orderBy(asc(schema.products.sortOrder)),
    );
    const images = await attachImages(rows);
    const covers = await resolveCoverFallback(rows, images);
    return rows.map((r) => toDTO(r, images.get(r.id) ?? [], covers.get(r.id)));
  } catch (e) {
    console.error("[db] listProducts failed, using fallback:", e);
    return productSeeds.map(seedToDTO);
  }
});

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDTO | null> => {
    if (!isDbConfigured)
      return productSeeds.map(seedToDTO).find((p) => p.slug === slug) ?? null;
    try {
      const rows = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.slug, slug))
        .limit(1);
      if (!rows[0]) return null;
      const images = await attachImages(rows);
      const covers = await resolveCoverFallback(rows, images);
      return toDTO(rows[0], images.get(rows[0].id) ?? [], covers.get(rows[0].id));
    } catch (e) {
      console.error("[db] getProductBySlug failed:", e);
      return productSeeds.map(seedToDTO).find((p) => p.slug === slug) ?? null;
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
  if (!isDbConfigured)
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
    console.error("[db] listBrandReviews failed:", e);
    return reviewSeeds.map((r, i) => ({ id: i + 1, ...r }));
  }
});

/* ─── Site content ──────────────────────────────────────────────────── */

function contentFallback(key: string): string[] {
  const row = contentSeeds.find((c) => c.key === key);
  return Array.isArray(row?.value) ? (row.value as string[]) : [];
}

export const getContentList = cache(async (key: string): Promise<string[]> => {
  if (!isDbConfigured) return contentFallback(key);
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
    console.error(`[db] getContentList(${key}) failed:`, e);
    return contentFallback(key);
  }
});

export const getAnnouncements = () => getContentList("announcements");
export const getMarqueeItems = () => getContentList("marquee");
