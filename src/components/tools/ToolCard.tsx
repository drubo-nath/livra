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

  const isOutOfStock = !product.inStock || product.stock === 0;

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : null;

  const imageUrl = product.imageUrl || product.images?.[0] || null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
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
        {/* Out of Stock Badge (Top Left) */}
        {isOutOfStock ? (
          <span className="absolute top-2.5 left-2.5 z-10 rounded bg-neutral-900/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs tracking-wide uppercase">
            Sold Out
          </span>
        ) : discountPercent ? (
          <span className="absolute top-2.5 left-2.5 z-10 rounded bg-[#be343c] px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-white shadow-xs tracking-wide uppercase">
            {discountPercent}% OFF
          </span>
        ) : product.badge ? (
          <span className="absolute top-2.5 left-2.5 z-10 rounded bg-ink px-2 py-0.5 text-[10px] font-semibold text-cream tracking-wide uppercase">
            {product.badge}
          </span>
        ) : null}

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
        <Link href={`/product/${product.slug}`} prefetch={true} className="relative h-full w-full block transition-transform duration-200 active:scale-[0.98]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-contain transition-transform duration-500 ease-out group-hover:scale-105",
                isOutOfStock && "opacity-80 grayscale-[20%]"
              )}
            />
          ) : (
            <div
              className="h-full w-full rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${product.tones[0]}, ${product.tones[1]})`,
              }}
            />
          )}

          {/* Out of Stock Image Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[1px] pointer-events-none p-2 text-center rounded-lg">
              <span className="bg-white/95 text-ink text-[10px] sm:text-[11px] font-semibold tracking-widest uppercase px-3 py-1 shadow-sm border border-line">
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* Quick Add To Bag Hover Pill */}
        <div className="absolute inset-x-3 bottom-3 z-10 hidden sm:flex justify-center opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-medium tracking-wider uppercase backdrop-blur-xs transition-all shadow-md",
              isOutOfStock
                ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                : "bg-ink/90 text-white hover:bg-ink cursor-pointer hover:scale-105 active:scale-95"
            )}
          >
            <ShoppingBag className="h-3 w-3" />
            {isOutOfStock ? "Out of Stock" : "Add to Bag"}
          </button>
        </div>
      </div>

      {/* ── Product Metadata ── */}
      <div className="mt-3 flex flex-col items-center text-center">
        {/* Product Title */}
        <Link
          href={`/product/${product.slug}`}
          prefetch={true}
          className="mt-1 text-xs sm:text-sm font-medium text-ink tracking-tight line-clamp-1 group-hover:text-clay transition-colors active:opacity-75"
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

        {/* Stock Status Indicator */}
        <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px]">
          <span
            className={cn(
              "font-medium",
              isOutOfStock ? "text-red-600" : "text-emerald-700"
            )}
          >
            {isOutOfStock ? "Out of Stock (Unavailable)" : `In Stock (${product.stock} available)`}
          </span>
        </div>

        {/* Mobile Quick Add Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cn(
            "mt-2.5 flex sm:hidden w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-medium tracking-wide uppercase transition-colors",
            isOutOfStock
              ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
              : "border-line text-ink hover:bg-ink hover:text-white cursor-pointer active:scale-98"
          )}
        >
          <ShoppingBag className="h-3 w-3" />
          {isOutOfStock ? "Out of Stock" : "Add to Bag"}
        </button>
      </div>
    </div>
  );
}
