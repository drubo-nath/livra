import type { Metadata } from "next";
import { Suspense } from "react";
import { listNails } from "@/db/queries";
import ShopClient from "@/components/shop/ShopClient";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.livrapressons.com";

export const metadata: Metadata = {
  title: "Shop All Shades — Luxury Press-On Nails in Bangladesh",
  description:
    "Explore the full LIVRA collection of luxury press-on nails in Dhaka, BD. Choose from Exclusive, Classic (single colours), and Signature collections. Reusable, damage-free, and delivered nationwide.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    title: "Shop All Shades — LIVRA Luxury Press-On Nails",
    description:
      "Explore the full LIVRA collection of luxury press-on nails in Dhaka. Exclusive, Classic, and Signature collections delivered across Bangladesh.",
    url: "/shop",
    type: "website",
    images: [{ url: "/header-image.jpg", width: 1200, height: 630, alt: "LIVRA Shop Collection" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop All Shades — LIVRA Luxury Press-On Nails",
    description:
      "Explore the full LIVRA collection of luxury press-on nails in Dhaka. Reusable, damage-free, delivered nationwide.",
    images: ["/header-image.jpg"],
  },
};

export default async function ShopPage() {
  const products = await listNails();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "LIVRA Press-On Nail Collection",
    "numberOfItems": products.length,
    "itemListElement": products.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": p.name,
      "url": `${baseUrl}/product/${p.slug}`,
    })),
  };

  return (
    <Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ShopClient products={products} />
    </Suspense>
  );
}
