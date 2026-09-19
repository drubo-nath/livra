import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { resolveImageUrl } from "@/lib/storage";
import { normalizeFinish } from "@/db/types";
import ProductForm, {
  type ProductFormValues,
} from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  let row: (typeof schema.products.$inferSelect) | null = null;
  let imageRows: { id: number; url: string }[] = [];

  const { isDbConfigured } = await import("@/db");
  const { productSeeds } = await import("@/db/seed-data");

  if (isDbConfigured) {
    try {
      const [dbRow] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId))
        .limit(1);
      row = dbRow ?? null;

      if (row) {
        imageRows = await db
          .select({ id: schema.productImages.id, url: schema.productImages.url })
          .from(schema.productImages)
          .where(eq(schema.productImages.productId, productId))
          .orderBy(asc(schema.productImages.position));
      }
    } catch (err) {
      console.warn("[EditToolPage] Database query failed, using seeds fallback:", err);
    }
  }

  if (!row) {
    const seed = productSeeds[productId - 1];
    if (seed) {
      row = {
        id: productId,
        name: seed.name,
        slug: seed.slug,
        tagline: seed.tagline,
        description: seed.description,
        price: seed.price,
        compareAtPrice: seed.compareAtPrice ?? null,
        finish: seed.finish,
        badge: seed.badge ?? null,
        sizes: seed.sizes ?? null,
        toneA: seed.toneA,
        toneB: seed.toneB,
        isActive: true,
        sortOrder: seed.sortOrder ?? productId,
        imageUrl: seed.imageUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  if (!row) notFound();

  // Admin previews need viewable URLs, not raw keys — presign server-side.
  const images = await Promise.all(
    imageRows.map(async (img) => ({
      id: img.id,
      url: await resolveImageUrl(img.url),
    })),
  );

  const initial: ProductFormValues = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline || "Tools & Accessories",
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    finish: normalizeFinish(row.finish) ?? "Classic",
    badge: row.badge ?? "",
    sizes: row.sizes ?? ["tool"],
    toneA: row.toneA,
    toneB: row.toneB,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    isTool: true,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit Tool or Accessory</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {row.name} · /product/{row.slug}
      </p>
      <div className="mt-8">
        <ProductForm initial={initial} images={images} backUrl="/admin/tools" />
      </div>
    </div>
  );
}

