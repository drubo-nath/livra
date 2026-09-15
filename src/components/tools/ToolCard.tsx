"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/lib/hooks/useWishlist";
import type { ProductDTO } from "@/db/types";

export default function ToolCard({
  product,
  priority = false,
}: {
  product: ProductDTO;
  priority?: boolean;
}) {
  const { add, openCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.slug);

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const imageUrl = product.imageUrl || product.images?.[0] || null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, { qty: 1, size: "Standard" });
    openCart();
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.slug);
  };

  return (
    <div className="group relative flex flex-col font-sans select-none">
      {/* ── Product Image Container ── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#fbf7f6] p-3 sm:p-4 flex items-center justify-center transition-all duration-300 group-hover:shadow-sm">
        {/* Discount Badge (Top Left) */}
        {discountPercent && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded bg-[#be343c] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-xs tracking-wide uppercase">
            {discountPercent}% OFF
          </span>
        )}

        {/* Product Badge (e.g. Bestseller or New) */}
        {product.badge && !discountPercent && (
          <span className="absolute top-2.5 left-2.5 z-10 rounded bg-ink px-2 py-0.5 text-[10px] font-semibold text-cream tracking-wide uppercase">
            {product.badge}
          </span>
        )}

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 backdrop-blur-xs text-taupe transition-colors hover:text-ink cursor-pointer hover:bg-white"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              wishlisted
                ? "fill-[#be343c] text-[#be343c]"
                : "text-taupe hover:text-ink"
            )}
          />
        </button>

        {/* Product Image */}
        <Link href={`/product/${product.slug}`} className="relative h-full w-full block">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className="h-full w-full rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${product.tones[0]}, ${product.tones[1]})`,
              }}
            />
          )}
        </Link>

        {/* Quick Add To Bag Hover Pill */}
        <div className="absolute inset-x-3 bottom-3 z-10 hidden sm:flex justify-center opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex items-center gap-1.5 rounded-full bg-ink/90 px-4 py-2 text-[11px] font-medium tracking-wider uppercase text-white backdrop-blur-xs transition-all hover:bg-ink cursor-pointer shadow-md hover:scale-105 active:scale-95"
          >
            <ShoppingBag className="h-3 w-3" />
            Add to Bag
          </button>
        </div>
      </div>

      {/* ── Product Metadata ── */}
      <div className="mt-3 flex flex-col items-center text-center">
        {/* Product Title */}
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 text-xs sm:text-sm font-medium text-ink tracking-tight line-clamp-1 group-hover:text-clay transition-colors"
        >
          {product.name}
        </Link>

        {/* Price Row */}
        <div className="mt-0.5 flex items-center justify-center gap-2 font-numeric">
          <span className="text-xs sm:text-sm font-semibold text-ink">
            {product.compareAtPrice ? "From " : ""}৳ {product.price.toLocaleString()}
          </span>
          {product.compareAtPrice && (
            <span className="text-[11px] sm:text-xs text-taupe line-through">
              ৳ {product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Mobile Quick Add Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-2.5 flex sm:hidden w-full items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[11px] font-medium tracking-wide uppercase text-ink transition-colors hover:bg-ink hover:text-white cursor-pointer active:scale-98"
        >
          <ShoppingBag className="h-3 w-3" />
          Add to Bag
        </button>
      </div>
    </div>
  );
}
