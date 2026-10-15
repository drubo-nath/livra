import { asc, sql } from "drizzle-orm";
import { db, schema, isDbConfigured } from "@/db";
import { productSeeds } from "@/db/seed-data";
import { resolveProductStock } from "@/db/queries";
import { resolveImageUrl } from "@/lib/storage";
import ProductsTable, { type AdminProductRow } from "@/components/admin/ProductsTable";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  let rows: {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    finish: "Exclusive" | "Classic" | "Signature";
    badge: string | null;
    price: number;
    stock: number;
    sizes: string[] | null;
    isActive: boolean;
    imageUrl: string | null;
    imageCount: number;
  }[] = [];

  if (isDbConfigured) {
    try {
      rows = await db
        .select({
          id: schema.products.id,
          slug: schema.products.slug,
          name: schema.products.name,
          tagline: schema.products.tagline,
          finish: schema.products.finish,
          badge: schema.products.badge,
          price: schema.products.price,
          stock: schema.products.stock,
          sizes: schema.products.sizes,
          isActive: schema.products.isActive,
          imageUrl: schema.products.imageUrl,
          imageCount: sql<number>`(
            select count(*) from ${schema.productImages}
            where ${schema.productImages.productId} = ${schema.products.id}
          )`,
        })
        .from(schema.products)
        .orderBy(asc(schema.products.sortOrder), asc(schema.products.id));
    } catch (err) {
      console.error("[AdminProducts] Database query failed:", err);
    }
  }

  if (!rows.length && !isDbConfigured) {
    rows = productSeeds.map((p, idx) => ({
      id: idx + 1,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      finish: p.finish,
      badge: p.badge ?? null,
      price: p.price,
      stock: 15,
      sizes: p.sizes ?? null,
      isActive: true,
      imageUrl: p.imageUrl ?? null,
      imageCount: 1,
    }));
  }

  // Thumbnails need viewable URLs — resolve raw keys to presigned/local URLs.
  const coversList = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      url: r.imageUrl ? await resolveImageUrl(r.imageUrl) : null,
    })),
  );
  
  const coversObj: Record<number, string | null> = {};
  for (const c of coversList) {
    coversObj[c.id] = c.url;
  }

  const products: AdminProductRow[] = rows.map((r) => {
    const stockInfo = resolveProductStock(r.sizes);
    const stock = typeof (r as any).stock === "number" ? (r as any).stock : stockInfo.stock;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      finish: r.finish,
      badge: r.badge,
      price: r.price,
      stock,
      isActive: r.isActive,
      imageUrl: r.imageUrl,
      imageCount: Number(r.imageCount),
      isTool: (r.sizes ?? []).includes("tool") || (r.tagline ?? "").toLowerCase().includes("tool"),
    };
  });

  const nailProducts = products.filter((p) => !p.isTool);

  return (
    <ProductsTable
      initialProducts={nailProducts}
      covers={coversObj}
      mode="products"
      title="Press-On Nails"
      subtitle={`${nailProducts.length} nail sets · ${nailProducts.filter((p) => !p.isActive).length} hidden`}
      newHref="/admin/products/new"
      newButtonText="+ New Nail Set"
      editBaseHref="/admin/products"
    />
  );
}
