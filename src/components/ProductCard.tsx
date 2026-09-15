"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Check } from "lucide-react";
import type { ProductDTO } from "@/db/types";
import { useCart } from "@/components/cart/CartProvider";
import Swatch from "@/components/Swatch";
import { EASE } from "@/components/motion/Reveal";
import { cn } from "@/lib/cn";
import { getProductLifestyleImage } from "@/lib/product-media";

export default function ProductCard({ product }: { product: ProductDTO }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Subscribe to wishlist changes without cascading effect renders
  const subscribeWishlist = useCallback((callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener("wishlist_change", callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("wishlist_change", callback);
    };
  }, []);

  const wishlisted = useSyncExternalStore(
    subscribeWishlist,
    () => {
      try {
        return typeof window !== "undefined" && localStorage.getItem(`wishlist_${product.slug}`) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );

  const primaryImage = product.imageUrl || (product.images && product.images[0]) || null;
  const lifestyleImage = getProductLifestyleImage(product);
  const hasSecondary = Boolean(lifestyleImage && lifestyleImage !== primaryImage);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof window !== "undefined") {
        const key = `wishlist_${product.slug}`;
        if (localStorage.getItem(key) === "1") {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, "1");
        }
        window.dispatchEvent(new Event("wishlist_change"));
      }
    } catch {
      // ignore
    }
  };

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 36 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
      }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Product Media Container ── */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-sand/40">
        <Link
          href={`/product/${product.slug}`}
          className="block h-full w-full relative"
          aria-label={`View ${product.name}`}
        >
          {/* Primary Studio Flat Lay Image */}
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={cn(
                "object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] scale-100 group-hover:scale-105",
                hasSecondary ? "opacity-100 group-hover:opacity-0" : "opacity-100"
              )}
            />
          ) : (
            <Swatch
              tones={product.tones}
              className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] scale-100 group-hover:scale-105"
            />
          )}

          {/* Secondary Worn On Hand Image — Crossfade on Hover */}
          {hasSecondary && lifestyleImage && (
            <Image
              src={lifestyleImage}
              alt={`${product.name} worn on hand`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] scale-100 group-hover:scale-105 opacity-0 group-hover:opacity-100 pointer-events-none"
            />
          )}

          {/* 2-Segment Image Indicator Bar (Matching Versace reference) */}
          {hasSecondary && (
            <div className="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none z-10">
              <div className="flex h-[2px] w-14 overflow-hidden rounded-full bg-black/15">
                <div
                  className={cn(
                    "h-full w-1/2 bg-ink transition-transform duration-300 ease-out",
                    isHovered ? "translate-x-full" : "translate-x-0"
                  )}
                />
              </div>
            </div>
          )}
        </Link>

        {/* Wishlist Heart Icon (Top-Right) — Sibling to Link, avoids invalid DOM nesting */}
        <button
          type="button"
          onClick={toggleWishlist}
          suppressHydrationWarning
          className="absolute top-1.5 right-1.5 z-20 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center text-ink/90 hover:text-ink transition-all active:scale-90 cursor-pointer"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={cn(
              "h-5 w-5 stroke-[1.5] transition-colors",
              wishlisted
                ? "fill-clay text-clay stroke-clay"
                : "text-ink/80 hover:text-clay"
            )}
          />
        </button>

        {/* Luxury Badge (Top-Left) */}
        {product.badge && (
          <span className="font-sans uppercase font-medium pointer-events-none absolute left-2.5 top-2.5 z-10 bg-cream/90 px-1.5 py-[1.5px] sm:py-1 text-[8px] sm:text-[9px] tracking-wider text-ink backdrop-blur-sm shadow-xs">
            {product.badge}
          </span>
        )}
      </div>

      {/* ── Product Info & Action (Matching Versace reference) ── */}
      <div className="mt-3 flex items-start justify-between gap-2.5 px-0.5">
        {/* Left: Title & Price Link */}
        <Link
          href={`/product/${product.slug}`}
          className="flex-1 min-w-0 block group/title"
          aria-label={`View ${product.name}`}
        >
          <h3 className="font-serif font-semibold text-[14px] sm:text-[15px] md:text-base text-ink leading-snug line-clamp-2 group-hover/title:text-clay transition-colors duration-300">
            {product.name}
          </h3>
          <div className="mt-1 flex items-baseline gap-2 font-numeric">
            <span className="font-base text-[12px] sm:text-sm text-ink font-semibold">
              ৳ {product.price.toLocaleString("en-US")}
            </span>
            {product.compareAtPrice && (
              <span className="text-[11px] sm:text-xs text-taupe/70 line-through">
                ৳ {product.compareAtPrice.toLocaleString("en-US")}
              </span>
            )}
          </div>
        </Link>

        {/* Right: Quick Add Shopping Bag Icon Button — Sibling to Link, avoids invalid DOM nesting */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className="shrink-0 mt-0.5 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-end ml-0.5 text-ink hover:text-clay transition-all active:scale-90 cursor-pointer"
          aria-label={`Add ${product.name} to bag`}
        >
          {added ? (
            <Check className="h-5 w-5 stroke-[2] text-clay animate-scale-in" />
          ) : (
            <ShoppingBag className="h-5 w-5 stroke-[1.5]" />
          )}
        </button>
      </div>
    </motion.article>
  );
}
