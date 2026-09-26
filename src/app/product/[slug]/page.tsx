import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listProducts, getProductBySlug } from "@/db/queries";
import Swatch from "@/components/Swatch";
import BuyPanel from "@/components/product/BuyPanel";
import ProductCard from "@/components/ProductCard";

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const products = await listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.livrapressons.com";

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};

  const title = `${p.name} — Luxury ${p.finish} Press-On Nails`;
  const description = p.tagline
    ? `${p.tagline}. ${p.description.slice(0, 140)}`
    : p.description.slice(0, 155);

  const images = p.imageUrl ? [p.imageUrl] : [];

  return {
    title,
    description,
    keywords: [
      p.name.toLowerCase(),
      `${p.finish.toLowerCase()} press on nails`,
      "press on nails bangladesh",
      "handmade nails dhaka",
      "livra beauty",
    ],
    alternates: {
      canonical: `/product/${p.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/product/${p.slug}`,
      type: "article",
      images: images.map((url) => ({
        url,
        alt: `${p.name} — LIVRA Press-On Nails`,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const [product, all] = await Promise.all([
    getProductBySlug(slug),
    listProducts(),
  ]);
  if (!product) notFound();

  const related = all
    .filter((p) => p.slug !== product.slug && p.finish === product.finish)
    .concat(all.filter((p) => p.slug !== product.slug && p.finish !== product.finish))
    .slice(0, 4);

  const productUrl = `${baseUrl}/product/${product.slug}`;

  // Structured Data Schema for Google Rich Snippets (Product & Offers)
  const productJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.images.length ? product.images : [product.imageUrl || `${baseUrl}/header-image.jpg`],
    "description": product.description,
    "sku": product.slug,
    "brand": {
      "@type": "Brand",
      "name": "LIVRA",
    },
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "BDT",
      "price": product.price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "LIVRA Beauty",
      },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Shop",
        "item": `${baseUrl}/shop`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": productUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="mx-auto max-w-[1440px] px-5 pt-8 md:px-10" aria-label="Breadcrumb">
        <ol className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-taupe font-medium">
          <li>
            <Link href="/" className="link-sweep">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/shop" className="link-sweep">Shop</Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 py-10 md:grid-cols-2 md:px-10 md:py-14 lg:gap-20">
        <div className="grid gap-4">
          <Swatch
            tones={product.tones}
            imageUrl={product.imageUrl}
            variant="hero"
            className="aspect-[4/5] w-full"
          />
          {product.images.length > 1 && (
            <div
              className={`grid gap-4 ${product.images.length >= 3 ? "grid-cols-3" : product.images.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {product.images.slice(1).map((img, i) => (
                <Swatch
                  key={i}
                  tones={product.tones}
                  imageUrl={img}
                  className="aspect-square w-full"
                />
              ))}
            </div>
          )}
        </div>

        <BuyPanel product={product} />
      </section>

      {/* Related items */}
      <section className="hairline border-t bg-cream py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10">
          <h2 className="headline text-4xl md:text-5xl">
            You might also <em>adore</em>
          </h2>

          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-8">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
