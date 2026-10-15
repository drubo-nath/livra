"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { ProductDTO } from "@/db/types";
import { formatBDT } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/cn";
import { EASE } from "@/components/motion/Reveal";
import SizeChartModal from "@/components/sizing/SizeChartModal";
import Link from "next/link";

const FINISH_ORDER = ["XS", "S", "M", "L"];

export default function BuyPanel({ product }: { product: ProductDTO }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(
    product.sizes.includes("M") ? "M" : (product.sizes[0] ?? "M"),
  );
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const isOutOfStock = !product.inStock || product.stock === 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    add(product, { qty, size });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
    >
      {/* Price & Stock Status Header */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <p className="font-numeric text-3xl font-semibold tracking-tight text-ink">
            {formatBDT(product.price)}
          </p>
          {product.compareAtPrice && (
            <p className="font-numeric text-sm text-taupe line-through">
              {formatBDT(product.compareAtPrice)}
            </p>
          )}
        </div>

        {/* Stock Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide",
              isOutOfStock
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isOutOfStock ? "bg-red-500" : "bg-emerald-600 animate-pulse"
              )}
            />
            {isOutOfStock ? "Out of Stock" : "In Stock"}
          </span>
        </div>
      </div>

      {/* Stock Quantity Details Banner */}
      <div className="mt-3.5 flex items-center justify-between py-2 px-3.5 rounded-md border border-line/60 bg-sand/20 text-xs">
        <span className="text-taupe font-medium">Availability</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium",
              isOutOfStock ? "text-red-700" : "text-emerald-800"
            )}
          >
            {isOutOfStock ? "Unavailable" : "Available"}
          </span>
          <span className="text-taupe font-numeric">
            · {isOutOfStock ? "0 units available" : `${product.stock} units available in Dhaka atelier`}
          </span>
        </div>
      </div>

      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-taupe">
        {product.description}
      </p>

      {/* Nail Specifications (Shape, Color, Length, Finish) */}
      {!product.sizes.includes("tool") && (
        <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-line/60">
          {product.shape && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/50 text-ink border border-line/60">
              <span className="text-taupe text-[11px] font-normal">Shape:</span>
              <span>{product.shape}</span>
            </span>
          )}
          {product.color && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/50 text-ink border border-line/60">
              <span className="text-taupe text-[11px] font-normal">Color:</span>
              <span>{product.color}</span>
            </span>
          )}
          {product.length && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/50 text-ink border border-line/60">
              <span className="text-taupe text-[11px] font-normal">Length:</span>
              <span>{product.length}</span>
            </span>
          )}
          {product.finish && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/50 text-ink border border-line/60">
              <span className="text-taupe text-[11px] font-normal">Finish:</span>
              <span>{product.finish}</span>
            </span>
          )}
        </div>
      )}

      {/* Size */}
      <div className="mt-9">
        <div className="flex items-center justify-between">
          <p className="font-serif text-sm text-ink">Size</p>
          <Link
            href="/sizing"
            type="button"
            className="link-sweep text-xs text-taupe hover:text-ink cursor-pointer"
          >
            Size guide
          </Link>
        </div>
        <div className="mt-3 flex gap-2">
          {[...product.sizes].sort(
            (a, b) => FINISH_ORDER.indexOf(a) - FINISH_ORDER.indexOf(b),
          ).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn(
                "h-11 w-11 border text-sm transition-all duration-300",
                size === s
                  ? "border-ink bg-ink text-cream"
                  : "border-line hover:border-ink",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Qty + Add */}
      <div className="mt-8 flex gap-3">
        <div className={cn("hairline flex items-center border", isOutOfStock && "opacity-40 pointer-events-none")}>
          <button
            className="px-4 py-3 transition-colors hover:bg-sand disabled:cursor-not-allowed"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={isOutOfStock || qty <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button
            className="px-4 py-3 transition-colors hover:bg-sand disabled:cursor-not-allowed"
            onClick={() => setQty((q) => Math.min(product.stock || 99, q + 1))}
            disabled={isOutOfStock || qty >= (product.stock || 99)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <motion.button
          onClick={handleAdd}
          disabled={isOutOfStock}
          whileTap={isOutOfStock ? {} : { scale: 0.98 }}
          className={cn(
            "font-serif text-xs uppercase tracking-widest flex-1 py-4 transition-colors duration-300",
            isOutOfStock
              ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
              : added
                ? "bg-clay text-cream"
                : "bg-ink text-cream hover:bg-clay-deep cursor-pointer"
          )}
        >
          {isOutOfStock
            ? "Out of Stock"
            : added
              ? "Added to Bag ✦"
              : `Add to Bag — ${formatBDT(product.price * qty)}`}
        </motion.button>
      </div>
      {isOutOfStock && (
        <p className="mt-2.5 text-xs text-taupe text-center">
          This set is currently unavailable. New handcrafted sets are in production.
        </p>
      )}

      {/* Assurances */}
      <ul className="hairline mt-10 space-y-3.5 border-t pt-8 text-sm text-taupe">
        {[
          "24 nails in 12 sizes — a custom fit for every finger",
          "Reusable up to 5 wears with gentle removal",
          "HEMA-free, cruelty-free, vegan formula",
          "Ships within 24 hours from Dhaka",
        ].map((t) => (
          <li key={t} className="flex gap-3">
            <span className="text-clay">✦</span>
            {t}
          </li>
        ))}
      </ul>

      <SizeChartModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </motion.div>
  );
}
