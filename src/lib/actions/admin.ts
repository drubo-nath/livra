"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, isDbConfigured, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { productSchema, type ProductInput, type ProductFormResult } from "@/lib/actions/product-schema";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  deleteObject,
  imageKey,
  putObject,
  resolveImageUrl,
} from "@/lib/storage";
import { sendSMS, orderStatusUpdateMessage } from "@/lib/sms";

async function requireAdmin() {
  const session = await getSessionUser();
  if (session?.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function updateOrderStatus(
  orderId: number,
  status: "pending" | "confirmed" | "fulfilled" | "cancelled",
) {
  await requireAdmin();
  const [updated] = await db
    .update(schema.orders)
    .set({ status })
    .where(eq(schema.orders.id, orderId))
    .returning({ phone: schema.orders.phone, orderNumber: schema.orders.orderNumber });

  if (updated?.phone) {
    sendSMS(updated.phone, orderStatusUpdateMessage(updated.orderNumber, status)).catch(
      (err) => {
        console.error("[admin] Order status update SMS notification failed:", err);
      },
    );
  }
}

export async function updateProductPrice(productId: number, price: number) {
  await requireAdmin();
  const parsed = z.number().int().min(100).max(100000).safeParse(price);
  if (!parsed.success) throw new Error("Invalid price");
  await db
    .update(schema.products)
    .set({ price, updatedAt: new Date() })
    .where(eq(schema.products.id, productId));
}

export async function toggleProductActive(productId: number, isActive: boolean) {
  await requireAdmin();
  await db
    .update(schema.products)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(schema.products.id, productId));
  revalidatePath("/admin/products");
  revalidatePath("/admin/tools");
  revalidatePath("/tools-accessories");
  revalidatePath("/shop");
  revalidatePath("/");
}

/* ─── Product create / update / delete ─────────────────────────────── */

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let candidate = base || "product";
  for (let i = 0; i < 50; i++) {
    const rows = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, candidate))
      .limit(1);
    if (!rows[0] || rows[0].id === excludeId) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  throw new Error("Could not generate a unique slug");
}

export async function createProduct(
  input: ProductInput,
): Promise<ProductFormResult> {
  await requireAdmin();
  if (!isDbConfigured) return { ok: false, error: "Database is not configured." };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }
  const d = parsed.data;

  const slug = await uniqueSlug(d.slug || slugify(d.name));

  const [row] = await db
    .insert(schema.products)
    .values({
      slug,
      name: d.name,
      tagline: d.tagline || "",
      description: d.description,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      finish: d.finish,
      badge: d.badge && d.badge !== "none" ? d.badge : null,
      sizes: d.sizes?.length ? d.sizes : null,
      toneA: d.toneA ?? "#e8cfc4",
      toneB: d.toneB ?? "#a6715c",
      isActive: d.isActive ?? true,
      sortOrder: d.sortOrder ?? 0,
    })
    .returning({ id: schema.products.id, slug: schema.products.slug });

  revalidatePath("/admin/products");
  revalidatePath("/admin/tools");
  revalidatePath("/tools-accessories");
  revalidatePath("/shop");
  revalidatePath("/");
  return { ok: true, productId: row.id, slug: row.slug };
}

export async function updateProduct(
  productId: number,
  input: ProductInput,
): Promise<ProductFormResult> {
  await requireAdmin();
  if (!isDbConfigured) return { ok: false, error: "Database is not configured." };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }
  const d = parsed.data;

  const slug = await uniqueSlug(d.slug || slugify(d.name), productId);

  await db
    .update(schema.products)
    .set({
      slug,
      name: d.name,
      tagline: d.tagline || "",
      description: d.description,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      finish: d.finish,
      badge: d.badge && d.badge !== "none" ? d.badge : null,
      sizes: d.sizes?.length ? d.sizes : null,
      toneA: d.toneA ?? "#e8cfc4",
      toneB: d.toneB ?? "#a6715c",
      isActive: d.isActive ?? true,
      sortOrder: d.sortOrder ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(schema.products.id, productId));

  revalidatePath("/admin/products");
  revalidatePath("/admin/tools");
  revalidatePath("/tools-accessories");
  revalidatePath("/shop");
  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
  return { ok: true, productId, slug };
}

export async function deleteProduct(productId: number) {
  await requireAdmin();
  await db.delete(schema.products).where(eq(schema.products.id, productId));
  revalidatePath("/admin/products");
  revalidatePath("/admin/tools");
  revalidatePath("/tools-accessories");
  revalidatePath("/shop");
  revalidatePath("/");
}

/* ─── Image upload / delete / reorder ──────────────────────────────── */

async function nextImagePosition(productId: number): Promise<number> {
  const rows = await db
    .select({ max: sql<number>`coalesce(max(${schema.productImages.position}), -1)` })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, productId));
  return (rows[0]?.max ?? -1) + 1;
}

export async function uploadProductImage(
  productId: number,
  file: File,
): Promise<{ ok: true; imageId: number; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!isDbConfigured) return { ok: false, error: "Database is not configured." };

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file received." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Use JPG, PNG, WebP or AVIF." };
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const key = imageKey(productId, `${crypto.randomUUID().slice(0, 8)}.${ext}`);
  const stored = await putObject(
    key,
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );
  if (!stored.ok) return { ok: false, error: stored.error };
  const url = stored.url;

  const [row] = await db
    .insert(schema.productImages)
    .values({ productId, url, position: await nextImagePosition(productId) })
    .returning({ id: schema.productImages.id });

  // First image becomes the legacy cover (storefront + cart snapshots).
  const cover = await db
    .select({ id: schema.productImages.id })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, productId))
    .orderBy(asc(schema.productImages.position))
    .limit(1);
  if (cover[0]?.id === row.id) {
    await db
      .update(schema.products)
      .set({ imageUrl: url, updatedAt: new Date() })
      .where(eq(schema.products.id, productId));
    revalidatePath("/");
    revalidatePath("/shop");
  }

  revalidatePath(`/admin/products/${productId}`);
  // The DB stores the raw key; hand the client a viewable (presigned) URL.
  return { ok: true, imageId: row.id, url: await resolveImageUrl(url) };
}

export async function deleteProductImage(imageId: number) {
  await requireAdmin();

  const rows = await db
    .select()
    .from(schema.productImages)
    .where(eq(schema.productImages.id, imageId))
    .limit(1);
  const img = rows[0];
  if (!img) return;

  await db.delete(schema.productImages).where(eq(schema.productImages.id, imageId));

  // Remove the stored object (rows hold keys or local /uploads paths), close
  // position gaps, and re-point the cover if needed.
  if (img.url.startsWith("/")) {
    await deleteObject(img.url.replace(/^\//, ""));
  } else {
    await deleteObject(img.url);
  }

  const rest = await db
    .select()
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, img.productId))
    .orderBy(asc(schema.productImages.position));

  for (let i = 0; i < rest.length; i++) {
    if (rest[i].position !== i) {
      await db
        .update(schema.productImages)
        .set({ position: i })
        .where(eq(schema.productImages.id, rest[i].id));
    }
  }

  if (img.position === 0 || rest.length === 0) {
    await db
      .update(schema.products)
      .set({ imageUrl: rest[0]?.url ?? null, updatedAt: new Date() })
      .where(eq(schema.products.id, img.productId));
    revalidatePath("/");
    revalidatePath("/shop");
  }

  revalidatePath(`/admin/products/${img.productId}`);
}

export async function reorderProductImages(
  productId: number,
  imageIds: number[],
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!imageIds.length) return { ok: true };

  const owned = await db
    .select({ id: schema.productImages.id, url: schema.productImages.url })
    .from(schema.productImages)
    .where(
      and(
        eq(schema.productImages.productId, productId),
        inArray(schema.productImages.id, imageIds),
      ),
    );
  if (owned.length !== imageIds.length) {
    return { ok: false, error: "Some images do not belong to this product." };
  }

  await db.transaction(async (tx) => {
    // Two-phase update avoids a transient unique/index conflict on position.
    await tx
      .update(schema.productImages)
      .set({ position: sql`${schema.productImages.position} + 1000` })
      .where(eq(schema.productImages.productId, productId));
    for (let i = 0; i < imageIds.length; i++) {
      await tx
        .update(schema.productImages)
        .set({ position: i })
        .where(eq(schema.productImages.id, imageIds[i]));
    }
  });

  const [cover] = await db
    .select({ url: schema.productImages.url })
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, productId))
    .orderBy(asc(schema.productImages.position))
    .limit(1);

  await db
    .update(schema.products)
    .set({ imageUrl: cover?.url ?? null, updatedAt: new Date() })
    .where(eq(schema.products.id, productId));

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  revalidatePath("/");
  return { ok: true };
}
